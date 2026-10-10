const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Database - Courses
  createCourse: (data) => ipcRenderer.invoke('db:create-course', data),
  getCourses: () => ipcRenderer.invoke('db:get-courses'),
  getCourse: (id) => ipcRenderer.invoke('db:get-course', id),
  deleteCourse: (id) => ipcRenderer.invoke('db:delete-course', id),
  updateCourse: (id, data) => ipcRenderer.invoke('db:update-course', id, data),

  // Database - Topics
  getTopics: (courseId) => ipcRenderer.invoke('db:get-topics', courseId),
  saveTopics: (courseId, phases) => ipcRenderer.invoke('db:save-topics', courseId, phases),
  updateTopicStatus: (topicId, status) => ipcRenderer.invoke('db:update-topic-status', topicId, status),

  // Database - Messages
  getMessages: (topicId) => ipcRenderer.invoke('db:get-messages', topicId),
  saveMessage: (topicId, role, content) => ipcRenderer.invoke('db:save-message', topicId, role, content),

  // LLM
  generatePrompt: (data) => ipcRenderer.invoke('llm:generate-prompt', data),
  generateRoadmap: (data) => ipcRenderer.invoke('llm:generate-roadmap', data),
  chatStream: (data) => ipcRenderer.invoke('llm:chat-stream-start', data),
  onChatChunk: (callback) => {
    const handler = (_event, chunk) => callback(chunk);
    ipcRenderer.on('llm:chat-stream-chunk', handler);
    return () => ipcRenderer.removeListener('llm:chat-stream-chunk', handler);
  },
  onChatEnd: (callback) => {
    const handler = (_event) => callback();
    ipcRenderer.on('llm:chat-stream-end', handler);
    return () => ipcRenderer.removeListener('llm:chat-stream-end', handler);
  },
  onChatError: (callback) => {
    const handler = (_event, error) => callback(error);
    ipcRenderer.on('llm:chat-stream-error', handler);
    return () => ipcRenderer.removeListener('llm:chat-stream-error', handler);
  },

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:get-all'),
  getModels: (provider, apiKey) => ipcRenderer.invoke('settings:get-models', provider, apiKey),

  // Export
  exportMarkdown: (topicId) => ipcRenderer.invoke('export:markdown', topicId),
  exportPdf: (topicId) => ipcRenderer.invoke('export:pdf', topicId),

  // Session Recap
  getSessionRecap: (topicId) => ipcRenderer.invoke('session:get-recap', topicId),
  
  // Prompt iterations event
  onPromptIteration: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('llm:prompt-iteration', handler);
    return () => ipcRenderer.removeListener('llm:prompt-iteration', handler);
  },
});
