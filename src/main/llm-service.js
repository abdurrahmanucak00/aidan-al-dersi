const OpenAI = require('openai');

// Provider configurations with their base URLs
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    modelsEndpoint: true,
  },
  gemini: {
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modelsEndpoint: true,
  },
  groq: {
    name: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    modelsEndpoint: true,
  },
  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    modelsEndpoint: true,
  },
  anthropic: {
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    modelsEndpoint: true,
  },
  custom: {
    name: 'Custom (OpenAI Compatible)',
    baseURL: '',
    modelsEndpoint: true,
  },
};

/**
 * Utility: Sleep for ms milliseconds
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sanitize model name (e.g. remove 'models/' prefix if provider is gemini in openai-compat mode)
 */
function sanitizeModel(provider, model) {
  if (!model) return model;
  if (provider === 'gemini' && model.startsWith('models/')) {
    return model.replace('models/', '');
  }
  return model;
}

/**
 * Creates an OpenAI client for the specified provider
 */
function createClient(provider, apiKey, customBaseURL) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);
  
  const baseURL = provider === 'custom' ? customBaseURL : config.baseURL;
  if (!baseURL) throw new Error('Base URL is required for custom provider');

  const clientOptions = {
    apiKey,
    baseURL,
    maxRetries: 3, // Enable built-in SDK retries
    timeout: 90000,
    defaultHeaders: {},
  };

  // OpenRouter needs extra headers
  if (provider === 'openrouter') {
    clientOptions.defaultHeaders['HTTP-Referer'] = 'https://learntracker.app';
    clientOptions.defaultHeaders['X-Title'] = 'LearnTracker';
  }

  return new OpenAI(clientOptions);
}

/**
 * Fetch available models from provider
 */
async function getModels(provider, apiKey, customBaseURL) {
  try {
    const client = createClient(provider, apiKey, customBaseURL);
    const response = await client.models.list();
    
    let models = [];
    if (Array.isArray(response.data)) {
      models = response.data;
    } else if (response.data) {
      models = response.data;
    } else {
      for await (const model of response) {
        models.push(model);
      }
    }
    
    return models
      .map(m => {
        const cleanId = sanitizeModel(provider, m.id);
        return { id: cleanId, name: cleanId, owned_by: m.owned_by || provider };
      })
      .filter((m, idx, self) => idx === self.findIndex(t => t.id === m.id))
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Failed to fetch models:', error.message);
    throw new Error(`Model listesi alınamadı: ${error.message}`);
  }
}

/**
 * Send a chat completion request with custom Exponential Backoff Retry
 */
async function chatCompletion(provider, apiKey, model, messages, customBaseURL, maxAttempts = 4) {
  const client = createClient(provider, apiKey, customBaseURL);
  const cleanModel = sanitizeModel(provider, model);

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: cleanModel,
        messages,
        temperature: 0.7,
        max_tokens: 16384,
      });

      const content = response.choices?.[0]?.message?.content;
      if (content) {
        return content;
      }
      throw new Error('LLM boş yanıt döndürdü.');
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.statusCode || 0;
      const msg = error?.message || '';
      console.warn(`[chatCompletion] Attempt ${attempt}/${maxAttempts} failed (Status: ${status}): ${msg}`);

      if (attempt < maxAttempts && (status === 503 || status === 429 || status >= 500 || msg.includes('ECONNRESET') || msg.includes('fetch failed'))) {
        const waitTime = attempt * 2000;
        console.log(`[chatCompletion] Waiting ${waitTime}ms before retry...`);
        await sleep(waitTime);
        continue;
      }
      break;
    }
  }

  if (lastError?.status === 503 || lastError?.message?.includes('503')) {
    throw new Error('Yapay zeka sunucusu şu an aşırı yoğun (503 Service Unavailable). Lütfen birkaç saniye sonra tekrar deneyin veya Ayarlar\'dan farklı bir model seçin.');
  }
  if (lastError?.status === 429 || lastError?.message?.includes('429')) {
    throw new Error('API istek kotası / hız sınırı aşıldı (429 Rate Limit). Lütfen biraz bekleyip tekrar deneyin.');
  }
  throw new Error(lastError?.message || 'LLM yanıt verirken bir hata oluştu.');
}

/**
 * Send a streaming chat completion request
 * Returns an async iterable of content chunks
 */
async function* chatCompletionStream(provider, apiKey, model, messages, customBaseURL) {
  const client = createClient(provider, apiKey, customBaseURL);
  const cleanModel = sanitizeModel(provider, model);

  const stream = await client.chat.completions.create({
    model: cleanModel,
    messages,
    temperature: 0.7,
    max_tokens: 8192,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

module.exports = {
  PROVIDERS,
  createClient,
  getModels,
  chatCompletion,
  chatCompletionStream,
  sanitizeModel,
};
