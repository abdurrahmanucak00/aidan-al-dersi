import { create } from 'zustand';

const useStore = create((set, get) => ({
  // --- State ---
  courses: [],
  activeCourse: null,
  topics: [],
  activeTopic: null,
  messages: [],
  settings: {
    provider: 'gemini',
    apiKey: '',
    model: '',
    language: 'tr',
    customBaseURL: '',
  },
  models: [],
  isGeneratingPrompt: false,
  promptIterations: [],
  isGeneratingRoadmap: false,
  isStreaming: false,
  streamingContent: '',
  sidebarOpen: true,

  // --- Actions: Courses ---
  fetchCourses: async () => {
    const result = await window.api.getCourses();
    if (result.success && result.data) {
      set({ courses: result.data });
    }
  },

  createCourse: async (data) => {
    const result = await window.api.createCourse(data);
    if (result.success) {
      await get().fetchCourses();
      return result.data;
    }
    throw new Error(result.error);
  },

  deleteCourse: async (id) => {
    const result = await window.api.deleteCourse(id);
    if (result.success) {
      await get().fetchCourses();
      if (get().activeCourse?.id === id) {
        set({ activeCourse: null, topics: [], activeTopic: null, messages: [] });
      }
    }
  },

  setActiveCourse: async (course) => {
    set({ activeCourse: course, activeTopic: null, messages: [] });
    if (course) {
      const result = await window.api.getTopics(course.id);
      if (result.success) {
        set({ topics: result.data });
      }
    } else {
      set({ topics: [] });
    }
  },

  // --- Actions: Topics ---
  fetchTopics: async (courseId) => {
    const result = await window.api.getTopics(courseId);
    if (result.success) set({ topics: result.data });
  },

  setActiveTopic: async (topic) => {
    if (!topic) {
      set({ activeTopic: null, messages: [], streamingContent: '' });
      return;
    }
    
    const dbId = topic.dbId || topic.id;
    const normalizedTopic = { ...topic, dbId };
    
    const result = await window.api.getMessages(dbId);
    const msgs = result.success ? result.data : [];
    
    set({ 
      activeTopic: normalizedTopic, 
      messages: msgs, 
      streamingContent: '' 
    });

    if (topic.status === 'not_started') {
      await window.api.updateTopicStatus(dbId, 'in_progress');
      const course = get().activeCourse;
      if (course) await get().fetchTopics(course.id);
    }
  },

  updateTopicStatus: async (topicId, status) => {
    await window.api.updateTopicStatus(topicId, status);
    const course = get().activeCourse;
    if (course) {
      await get().fetchTopics(course.id);
      await get().fetchCourses();
      if (get().activeTopic?.dbId === topicId) {
        set((state) => ({ activeTopic: { ...state.activeTopic, status } }));
      }
    }
  },

  // --- Actions: Messages ---
  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  sendMessage: async (content) => {
    const topic = get().activeTopic;
    const course = get().activeCourse;
    if (!topic || !course) return;

    const topicDbId = topic.dbId || topic.id;

    const userMsgResult = await window.api.saveMessage(topicDbId, 'user', content);
    if (userMsgResult.success) {
      get().addMessage(userMsgResult.data);
    }

    set({ isStreaming: true, streamingContent: '' });

    const currentMessages = get().messages;
    const allMessagesForPrompt = currentMessages.map(m => ({ role: m.role, content: m.content }));

    const stepInstruction = `\n\n[KATI PEDAGOJİK TALİMAT]: Şu anda işlenen mikro-başlık: "${topic.id ? topic.id + ' ' : ''}${topic.title}".
- ASLA konunun tamamını veya tüm maddelerini tek bir yanıtta dökme.
- Bu konuyu kendi içinde 3 veya 4 küçük adıma (Adım 1, Adım 2, Adım 3...) böl.
- Anlattığın adımı TAM ve EKSİKSİZ şekilde bitir. Asla bir başlık veya cümle yazıp cevabı yarım bırakma.
- İlk anlatımda SADECE 1. ADIMI derinlemesine ve örneklerle anlat, ardından: "👉 Adım 1'i tamamladık. Bu adımla ilgili sormak istediğin bir soru var mı? Eğer her şey netse 'devam' de, Adım 2'ye geçelim!" diyerek dur.
- Kullanıcıdan açık bir onay ("devam", "geçelim", "evet" vb.) alana kadar kesinlikle sıradaki adıma geçme.
- MİKRO-KONU SINIRI: Sen YALNIZCA şu anki mikro-konuyu (${topic.id || ''} ${topic.title}) öğretiyorsun. Sıradaki mikro-konunun içeriğini asla önceden açıklama veya geçişini önerme. Kullanıcı ilerideki bir konuyu sorarsa: "Bu soruyu harika sordun! O konuyu ilerleyen bölümde işleyeceğiz, şimdi bu konuyu tamamlayalım." de.
- Tüm adımlar tamamlandığında SADECE şunu söyle: "✅ ${topic.id || ''} ${topic.title} konusunu tamamladık! Bu konuyla ilgili aklında takılan başka bir soru var mı?" Sıradaki mikro-konuya GEÇİŞİ KESİNLİKLE ÖNERME.`;


    const fullSystemPrompt = (course.system_prompt || 'Sen uzman bir eğitmensin.') + stepInstruction;

    await window.api.chatStream({
      messages: allMessagesForPrompt,
      systemPrompt: fullSystemPrompt,
    });
  },

  appendStreamingContent: (chunk) => {
    set((state) => ({ streamingContent: state.streamingContent + chunk }));
  },

  finishStreaming: async () => {
    const content = get().streamingContent;
    const topic = get().activeTopic;
    if (topic && content && content.trim().length > 0) {
      const topicDbId = topic.dbId || topic.id;
      const result = await window.api.saveMessage(topicDbId, 'assistant', content);
      if (result.success) {
        get().addMessage(result.data);
      }
    }
    set({ isStreaming: false, streamingContent: '' });
  },

  handleChatError: async (errorPayload) => {
    const topic = get().activeTopic;

    // Parse structured error from backend (JSON string) or fallback to plain string
    let errorData = { type: 'unknown', message: errorPayload, retryAfter: null };
    try {
      if (typeof errorPayload === 'string' && errorPayload.startsWith('{')) {
        errorData = JSON.parse(errorPayload);
      }
    } catch (_) {}

    // Build a human-friendly message
    let displayText = `⚠️ **Yanıt durdu — ${errorData.message}**`;

    if (errorData.type === 'rate_limit') {
      if (errorData.retryAfter && errorData.retryAfter > 0) {
        const mins = Math.ceil(errorData.retryAfter / 60);
        displayText = mins > 1
          ? `⏱️ **API hız sınırı aşıldı.** Yaklaşık **${mins} dakika** sonra tekrar yazabilirsiniz.`
          : `⏱️ **API hız sınırı aşıldı.** Yaklaşık **${errorData.retryAfter} saniye** sonra tekrar yazabilirsiniz.`;
      } else {
        displayText = `⏱️ **API hız sınırı aşıldı (429).** Lütfen biraz bekleyip mesajınızı tekrar gönderin.`;
      }
    } else if (errorData.type === 'auth') {
      displayText = `🔑 **API anahtarı hatası.** Ayarlar sayfasından API anahtarınızı kontrol edin.`;
    } else if (errorData.type === 'overloaded') {
      displayText = `🌐 **API sunucusu aşırı yoğun (503).** Birkaç dakika bekleyip tekrar deneyin.`;
    } else if (errorData.type === 'timeout') {
      displayText = `⌛ **Bağlantı zaman aşımına uğradı.** İnternet bağlantınızı kontrol edip tekrar deneyin.`;
    }

    if (topic) {
      const topicDbId = topic.dbId || topic.id;
      const result = await window.api.saveMessage(topicDbId, 'assistant', displayText);
      if (result.success) {
        get().addMessage(result.data);
      }
    }
    set({ isStreaming: false, streamingContent: '' });
  },

  // --- Actions: Prompt Generation ---
  setGeneratingPrompt: (val) => set({ isGeneratingPrompt: val }),
  addPromptIteration: (data) => {
    set((state) => ({ promptIterations: [...state.promptIterations, data] }));
  },
  clearPromptIterations: () => set({ promptIterations: [] }),
  setGeneratingRoadmap: (val) => set({ isGeneratingRoadmap: val }),

  // --- Actions: Settings ---
  fetchSettings: async () => {
    const result = await window.api.getAllSettings();
    if (result.success) {
      set({ settings: { ...get().settings, ...result.data } });
    }
  },

  updateSetting: async (key, value) => {
    await window.api.setSetting(key, value);
    set((state) => ({ settings: { ...state.settings, [key]: value } }));
  },

  fetchModels: async (provider, apiKey, customBaseURL) => {
    try {
      const result = await window.api.getModels(provider, apiKey, customBaseURL);
      if (result.success) {
        set({ models: result.data });
        return result.data;
      }
      throw new Error(result.error);
    } catch (error) {
      set({ models: [] });
      throw error;
    }
  },

  // --- UI ---
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

export default useStore;
