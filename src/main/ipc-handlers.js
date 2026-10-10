const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const llmService = require('./llm-service');
const promptEngine = require('./prompt-engine');

let mainWindow = null;

function registerIpcHandlers(win) {
  mainWindow = win;

  // ==================== Database: Courses ====================
  ipcMain.handle('db:create-course', async (_event, data) => {
    try {
      return { success: true, data: db.createCourse(data) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:get-courses', async () => {
    try {
      return { success: true, data: db.getCourses() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:get-course', async (_event, id) => {
    try {
      return { success: true, data: db.getCourse(id) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:delete-course', async (_event, id) => {
    try {
      db.deleteCourse(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:update-course', async (_event, id, data) => {
    try {
      return { success: true, data: db.updateCourse(id, data) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== Database: Topics ====================
  ipcMain.handle('db:get-topics', async (_event, courseId) => {
    try {
      return { success: true, data: db.getTopics(courseId) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:save-topics', async (_event, courseId, phases) => {
    try {
      return { success: true, data: db.saveTopics(courseId, phases) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:update-topic-status', async (_event, topicId, status) => {
    try {
      db.updateTopicStatus(topicId, status);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== Database: Messages ====================
  ipcMain.handle('db:get-messages', async (_event, topicId) => {
    try {
      return { success: true, data: db.getMessages(topicId) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:save-message', async (_event, topicId, role, content) => {
    try {
      return { success: true, data: db.saveMessage(topicId, role, content) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== LLM: Prompt Generation ====================
  ipcMain.handle('llm:generate-prompt', async (_event, { title, description, language }) => {
    try {
      const settings = db.getAllSettings();
      const provider = settings.provider || 'gemini';
      const apiKey = settings.apiKey || '';
      const model = settings.model || '';
      const customBaseURL = settings.customBaseURL || '';

      if (!apiKey) {
        return { success: false, error: 'API key ayarlanmamış. Lütfen Ayarlar sayfasından API key girin.' };
      }
      if (!model) {
        return { success: false, error: 'Model seçilmemiş. Lütfen Ayarlar sayfasından bir model seçin.' };
      }

      const finalPrompt = await promptEngine.generateTeachingPrompt({
        title, description, language,
        provider, apiKey, model, customBaseURL,
        onIteration: (data) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('llm:prompt-iteration', data);
          }
        },
      });

      return { success: true, data: finalPrompt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== LLM: Roadmap Generation ====================
  ipcMain.handle('llm:generate-roadmap', async (_event, { title, description, language }) => {
    try {
      const settings = db.getAllSettings();
      const provider = settings.provider || 'gemini';
      const apiKey = settings.apiKey || '';
      const model = settings.model || '';
      const customBaseURL = settings.customBaseURL || '';

      const roadmap = await promptEngine.generateRoadmap({
        title, description, language,
        provider, apiKey, model, customBaseURL,
        onWait: ({ attempt, waitSeconds }) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            // Re-use prompt-iteration event to show wait status on frontend
            mainWindow.webContents.send('llm:prompt-iteration', {
              iteration: 3, 
              prompt: '', 
              label: `Müfredat - Rate limit — ${waitSeconds}s bekleniyor (Deneme ${attempt}/3)...`
            });
          }
        }
      });

      return { success: true, data: roadmap };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== LLM: Chat Streaming ====================
  ipcMain.handle('llm:chat-stream-start', async (_event, { messages, systemPrompt }) => {
    try {
      const settings = db.getAllSettings();
      const provider = settings.provider || 'gemini';
      const apiKey = settings.apiKey || '';
      const model = settings.model || '';
      const customBaseURL = settings.customBaseURL || '';

      if (!apiKey || !model) {
        mainWindow.webContents.send('llm:chat-stream-error', JSON.stringify({
          type: 'config',
          message: 'API key veya model ayarlanmamış.',
          retryAfter: null,
        }));
        return { success: false, error: 'API key veya model ayarlanmamış.' };
      }

      const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ];

      // Start streaming — no auto-retry, instead send structured error info to frontend
      (async () => {
        try {
          const stream = llmService.chatCompletionStream(
            provider, apiKey, model, fullMessages, customBaseURL
          );

          for await (const chunk of stream) {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('llm:chat-stream-chunk', chunk);
            }
          }

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('llm:chat-stream-end');
          }
        } catch (error) {
          if (!mainWindow || mainWindow.isDestroyed()) return;

          // Try to extract Retry-After from API response headers
          const retryAfterRaw =
            error?.headers?.['retry-after'] ||
            error?.headers?.['x-ratelimit-reset-requests'] ||
            error?.response?.headers?.['retry-after'] ||
            null;

          // Convert to seconds if it's a date string, otherwise treat as seconds
          let retryAfterSeconds = null;
          if (retryAfterRaw) {
            const parsed = parseInt(retryAfterRaw, 10);
            if (!isNaN(parsed)) {
              retryAfterSeconds = parsed;
            } else {
              // It might be an HTTP-date
              const date = new Date(retryAfterRaw);
              if (!isNaN(date.getTime())) {
                retryAfterSeconds = Math.ceil((date.getTime() - Date.now()) / 1000);
              }
            }
          }

          const status = error?.status || error?.statusCode || 0;
          const msg = error?.message || 'Bilinmeyen bir hata oluştu.';

          let type = 'unknown';
          let friendlyMessage = msg;

          if (status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('quota')) {
            type = 'rate_limit';
            friendlyMessage = 'API hız sınırı aşıldı (429 Rate Limit).';
          } else if (status === 401 || status === 403) {
            type = 'auth';
            friendlyMessage = 'API anahtarınız geçersiz veya yetkisiz (401/403).';
          } else if (status === 503 || msg.includes('503')) {
            type = 'overloaded';
            friendlyMessage = 'API sunucusu şu an aşırı yoğun (503). Lütfen biraz bekleyin.';
          } else if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('econnreset')) {
            type = 'timeout';
            friendlyMessage = 'Bağlantı zaman aşımına uğradı.';
          }

          console.warn(`[chat-stream] Error (${status}):`, msg);

          mainWindow.webContents.send('llm:chat-stream-error', JSON.stringify({
            type,
            message: friendlyMessage,
            retryAfter: retryAfterSeconds,
            raw: msg,
          }));
        }
      })();

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== Settings ====================
  ipcMain.handle('settings:get', async (_event, key) => {
    try {
      return { success: true, data: db.getSetting(key) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:set', async (_event, key, value) => {
    try {
      db.setSetting(key, value);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:get-all', async () => {
    try {
      return { success: true, data: db.getAllSettings() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:get-models', async (_event, provider, apiKey, customBaseURL) => {
    try {
      const models = await llmService.getModels(provider, apiKey, customBaseURL);
      return { success: true, data: models };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== Export ====================
  ipcMain.handle('export:markdown', async (_event, topicId) => {
    try {
      const messages = db.getMessages(topicId);
      if (!messages.length) {
        return { success: false, error: 'Bu konuda henüz mesaj yok.' };
      }

      let markdown = '# Ders Notları\n\n';
      for (const msg of messages) {
        const role = msg.role === 'user' ? '👤 Kullanıcı' : '🤖 Öğretmen';
        markdown += `## ${role}\n\n${msg.content}\n\n---\n\n`;
      }

      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Markdown Olarak Kaydet',
        defaultPath: `ders-notlari-${topicId}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });

      if (filePath) {
        fs.writeFileSync(filePath, markdown, 'utf-8');
        return { success: true, data: filePath };
      }
      return { success: false, error: 'Kayıt iptal edildi.' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('export:pdf', async (_event, topicId) => {
    try {
      const messages = db.getMessages(topicId);
      if (!messages.length) {
        return { success: false, error: 'Bu konuda henüz mesaj yok.' };
      }

      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'PDF Olarak Kaydet',
        defaultPath: `ders-notlari-${topicId}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      if (filePath) {
        const pdfData = await mainWindow.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
        });
        fs.writeFileSync(filePath, pdfData);
        return { success: true, data: filePath };
      }
      return { success: false, error: 'Kayıt iptal edildi.' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  // ==================== Session Recap ====================
  ipcMain.handle('session:get-recap', async (_event, topicId) => {
    try {
      const settings = db.getAllSettings();
      const provider = settings.provider || 'gemini';
      const apiKey = settings.apiKey || '';
      const model = settings.model || '';
      const customBaseURL = settings.customBaseURL || '';

      if (!apiKey || !model) {
        return { success: false, error: 'API key veya model ayarlanmamış.' };
      }

      const messages = db.getMessages(topicId);
      // Only generate recap if there's meaningful history (at least 4 messages = 2 exchanges)
      if (!messages || messages.length < 4) {
        return { success: true, data: null };
      }

      // YZ: Eğer son mesajın üzerinden 2 saatten az zaman geçmişse, özet çıkarma (kullanıcı muhtemelen yeni çıkıp girmiştir)
      const lastMessage = messages[messages.length - 1];
      // SQLite CURRENT_TIMESTAMP is in UTC "YYYY-MM-DD HH:MM:SS"
      const lastMessageDate = new Date(lastMessage.created_at.replace(' ', 'T') + 'Z');
      const now = new Date();
      const diffHours = (now - lastMessageDate) / (1000 * 60 * 60);

      if (diffHours < 8) {
        return { success: true, data: null }; // sessizce geç, özet isteme (8 saatten az geçmişse)
      }

      // Take the last 20 messages to keep context focused and token usage low
      const recentMessages = messages.slice(-20);
      const formattedHistory = recentMessages
        .map(m => `[${m.role === 'user' ? 'ÖĞRENCİ' : 'ÖZEL HOCA'}]: ${m.content}`)
        .join('\n\n');

      const recapPrompt = `Sen ileri düzey bir pedagoji uzmanısın ve öğrencinin kaldığı yeri analiz edip güçlü bir "Kaldığın Yer Raporu" hazırlıyorsun.

Aşağıda öğrencinin bir AI özel ders uygulamasındaki son sohbet geçmişi var. Bu sohbeti çok dikkatli oku:

---
${formattedHistory}
---

Şimdi bu sohbeti derin bir pedagojik bakışla analiz et ve aşağıdaki formatta Türkçe bir rapor oluştur:

## 📍 Tam Olarak Nerede Kaldın?
Öğrencinin hangi konuya giriş yaptığını, kaçıncı adımda olduğunu ve sohbet tam olarak nerede yarıda kaldıysa onu net bir şekilde yaz. "Attention mekanizmasının 2. adımındaydın, scaled dot-product hesabını anlattık, softmax'a henüz geçmemiştin" gibi spesifik olmalı.

## 🧠 Ne Kavradın, Ne Öğrenmiştin?
Öğrencinin gerçekten anladığı kavramları sırala. Yüzeysel "X konusunu gördün" değil; "Transformer'ın encoder bloğunun Q, K, V matrislerini neden ürettiğini ve bunların matematiksel anlamını kavradın" gibi içgörü odaklı yaz. Öğrenci bunu okuyunca "Evet, bunu gerçekten anlamıştım" demeli.

## ❓ Kafana Takılan veya Tekrar Sorduğun Yerler
Öğrencinin aynı konuyu birden fazla sorduğu, "anlamadım", "tekrar açıklar mısın", "neden" gibi ifadeler kullandığı veya konunun üzerine ısrarla gittiği yerleri tespit et. Bu noktalar onun hâlâ tam özümseyemediği yerlerdir. Her birini kısa ama güçlü bir ipucuyla hatırlat — "Pozisyonel kodlamada sinus/cosinus'un neden kullanıldığını sormustun; kısaca: modelin kelime sırasını bilmesi için frekans bazlı işaret eklenir, bunun dışında başka bir yolu yoktur" gibi.

## 🚀 Bir Sonraki Adım
Sohbetin tam olarak nerede kesildiğini analiz ederek sırada ne yapılması gerektiğini yaz. "Softmax katmanının nasıl normalize ettiğini anlatacaktık, oradan devam edebiliriz" gibi bağlantılı ve akıcı olsun.

Raporu Türkçe yaz. Akademik ama sıcak ve motive edici bir ton kullan. Her bölüm gerçekten faydalı olmalı, dolgu cümleleri kullanma.`;

      const recap = await llmService.chatCompletion(
        provider, apiKey, model,
        [{ role: 'user', content: recapPrompt }],
        customBaseURL
      );

      return { success: true, data: recap };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerIpcHandlers };
