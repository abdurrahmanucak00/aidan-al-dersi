const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let db = null;
let dbFilePath = '';

async function initDatabase() {
  const isAppPackaged = app ? app.isPackaged : false;
  
  // Locate wasm file cleanly in both dev and packaged production
  const SQL = await initSqlJs({
    locateFile: (file) => {
      if (isAppPackaged) {
        return path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', file);
      }
      return path.join(__dirname, '../../node_modules/sql.js/dist', file);
    }
  }).catch(async () => {
    return await initSqlJs();
  });

  const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '../../data');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  dbFilePath = path.join(userDataPath, 'learntracker.sqlite');

  // Automatic Migration: If current app has no DB yet, check old LearnTracker location
  if (!fs.existsSync(dbFilePath) && app) {
    const appDataRoot = path.dirname(userDataPath);
    const potentialOldPaths = [
      path.join(appDataRoot, 'LearnTracker', 'learntracker.sqlite'),
      path.join(appDataRoot, 'learn-tracker', 'learntracker.sqlite'),
    ];

    for (const oldPath of potentialOldPaths) {
      if (fs.existsSync(oldPath)) {
        try {
          fs.copyFileSync(oldPath, dbFilePath);
          console.log(`[Database Migration] Successfully migrated existing courses from ${oldPath}`);
          break;
        } catch (err) {
          console.warn('[Database Migration] Failed copying old database:', err.message);
        }
      }
    }
  }

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  saveDb();
  return db;
}

function saveDb() {
  if (db && dbFilePath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  }
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      system_prompt TEXT,
      language TEXT DEFAULT 'tr',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      phase_title TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'not_started',
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// Helper: query list of objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: query single object
function queryGet(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

// --- Course CRUD ---
function createCourse({ title, description, language = 'tr' }) {
  db.run('INSERT INTO courses (title, description, language) VALUES (?, ?, ?)', [title, description, language]);
  const lastId = queryGet('SELECT last_insert_rowid() as id').id;
  saveDb();
  return getCourse(lastId);
}

function getCourses() {
  const courses = queryAll('SELECT * FROM courses ORDER BY updated_at DESC');
  return courses.map(c => {
    const totalRow = queryGet('SELECT COUNT(*) as cnt FROM topics WHERE course_id = ?', [c.id]);
    const completedRow = queryGet("SELECT COUNT(*) as cnt FROM topics WHERE course_id = ? AND status = 'completed'", [c.id]);
    return {
      ...c,
      total_topics: totalRow ? totalRow.cnt : 0,
      completed_topics: completedRow ? completedRow.cnt : 0,
    };
  });
}

function getCourse(id) {
  const course = queryGet('SELECT * FROM courses WHERE id = ?', [id]);
  if (!course) return null;
  const totalRow = queryGet('SELECT COUNT(*) as cnt FROM topics WHERE course_id = ?', [id]);
  const completedRow = queryGet("SELECT COUNT(*) as cnt FROM topics WHERE course_id = ? AND status = 'completed'", [id]);
  return {
    ...course,
    total_topics: totalRow ? totalRow.cnt : 0,
    completed_topics: completedRow ? completedRow.cnt : 0,
  };
}

function updateCourse(id, data) {
  const keys = Object.keys(data);
  if (keys.length === 0) return getCourse(id);
  
  const setClauses = keys.map(k => `${k} = ?`).join(', ');
  const values = Object.values(data);
  db.run(`UPDATE courses SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
  saveDb();
  return getCourse(id);
}

function deleteCourse(id) {
  db.run('DELETE FROM messages WHERE topic_id IN (SELECT id FROM topics WHERE course_id = ?)', [id]);
  db.run('DELETE FROM topics WHERE course_id = ?', [id]);
  db.run('DELETE FROM courses WHERE id = ?', [id]);
  saveDb();
}

// --- Topics ---
function saveTopics(courseId, phases) {
  db.run('DELETE FROM topics WHERE course_id = ?', [courseId]);
  
  let orderIndex = 0;
  for (const phase of phases) {
    for (const subtopic of phase.subtopics) {
      db.run(
        'INSERT INTO topics (course_id, phase_title, topic_id, title, status, order_index) VALUES (?, ?, ?, ?, ?, ?)',
        [courseId, phase.title, subtopic.id, subtopic.title, subtopic.status || 'not_started', orderIndex++]
      );
    }
  }
  saveDb();
  return getTopics(courseId);
}

function getTopics(courseId) {
  const rows = queryAll('SELECT * FROM topics WHERE course_id = ? ORDER BY order_index ASC', [courseId]);
  const phases = [];
  const phaseMap = new Map();

  for (const row of rows) {
    if (!phaseMap.has(row.phase_title)) {
      const phase = { title: row.phase_title, subtopics: [] };
      phaseMap.set(row.phase_title, phase);
      phases.push(phase);
    }
    phaseMap.get(row.phase_title).subtopics.push({
      id: row.topic_id,
      dbId: row.id,
      title: row.title,
      status: row.status,
    });
  }
  return phases;
}

function updateTopicStatus(topicId, status) {
  db.run('UPDATE topics SET status = ? WHERE id = ?', [status, topicId]);
  const topic = queryGet('SELECT course_id FROM topics WHERE id = ?', [topicId]);
  if (topic) {
    db.run('UPDATE courses SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [topic.course_id]);
  }
  saveDb();
}

// --- Messages ---
function getMessages(topicId) {
  return queryAll('SELECT * FROM messages WHERE topic_id = ? ORDER BY created_at ASC', [topicId]);
}

function saveMessage(topicId, role, content) {
  db.run('INSERT INTO messages (topic_id, role, content) VALUES (?, ?, ?)', [topicId, role, content]);
  const lastId = queryGet('SELECT last_insert_rowid() as id').id;
  saveDb();
  return queryGet('SELECT * FROM messages WHERE id = ?', [lastId]);
}

// --- Settings ---
function getSetting(key) {
  const row = queryGet('SELECT value FROM settings WHERE key = ?', [key]);
  if (!row || !row.value) return null;
  try {
    return JSON.parse(row.value);
  } catch (e) {
    return row.value;
  }
}

function setSetting(key, value) {
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
  saveDb();
}

function getAllSettings() {
  const rows = queryAll('SELECT * FROM settings');
  const settings = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch (e) {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

module.exports = {
  initDatabase,
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  saveTopics,
  getTopics,
  updateTopicStatus,
  getMessages,
  saveMessage,
  getSetting,
  setSetting,
  getAllSettings,
};
