import React, { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff } from 'lucide-react';
import useStore from '../store/useStore';
import { useTranslation } from '../i18n';

export default function Settings() {
  const { t } = useTranslation();
  const { settings, fetchModels, models, updateSetting } = useStore();
  
  const [provider, setProvider] = useState(settings.provider || 'gemini');
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [model, setModel] = useState(settings.model || '');
  const [language, setLanguage] = useState(settings.language || 'tr');
  const [customBaseURL, setCustomBaseURL] = useState(settings.customBaseURL || '');
  
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Update local state if settings change from store
  useEffect(() => {
    setProvider(settings.provider || 'gemini');
    setApiKey(settings.apiKey || '');
    setModel(settings.model || '');
    setLanguage(settings.language || 'tr');
    setCustomBaseURL(settings.customBaseURL || '');
  }, [settings]);

  const handleFetchModels = async () => {
    if (!apiKey && provider !== 'custom') { // Assuming custom might not always need a key or you handle it there
      alert(t('no_api_key'));
      return;
    }
    
    setIsFetchingModels(true);
    try {
      await fetchModels(provider, apiKey, customBaseURL);
    } catch (error) {
      alert(t('error') + ': ' + error.message);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSetting('provider', provider);
      await updateSetting('apiKey', apiKey);
      await updateSetting('model', model);
      await updateSetting('language', language);
      await updateSetting('customBaseURL', customBaseURL);
      
      setToastMessage(t('settings_saved'));
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
      alert(t('error') + ': ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-surface-950">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">{t('settings')}</h1>
        
        <form onSubmit={handleSave} className="space-y-8 bg-surface-900 p-8 rounded-xl border border-surface-800 shadow-sm">
          
          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('api_provider')}</label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setModel(''); // Reset model when provider changes
              }}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="groq">Groq</option>
              <option value="openrouter">OpenRouter</option>
              <option value="custom">Custom (OpenAI Compatible)</option>
            </select>
          </div>

          {/* Custom Base URL (Conditional) */}
          {provider === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('custom_base_url')}</label>
              <input
                type="text"
                value={customBaseURL}
                onChange={(e) => setCustomBaseURL(e.target.value)}
                placeholder={t('custom_base_url_placeholder')}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          )}

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('api_key')}</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('api_key_placeholder')}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-primary-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1"
              >
                {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Fetch Models & Model Selection */}
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={handleFetchModels}
              disabled={isFetchingModels || (!apiKey && provider !== 'custom')}
              className="w-full md:w-auto self-start px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isFetchingModels ? <Loader2 size={18} className="animate-spin" /> : null}
              {t('fetch_models')}
            </button>

            {models.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('select_model')}</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 transition-colors"
                >
                  <option value="" disabled>Seçiniz...</option>
                  {models.map((m) => (
                    <option key={m.id || m} value={m.id || m}>
                      {m.name || m.id || m}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Language Selection */}
          <div className="border-t border-surface-800 pt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('language')}</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-8"
          >
            {isSaving ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            {t('save_settings')}
          </button>
        </form>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-8 right-8 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
            <Save size={18} />
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
