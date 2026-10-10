import tr from './tr.json';
import en from './en.json';
import useStore from '../store/useStore';

const translations = { tr, en };

export function t(key, lang = 'tr') {
  return translations[lang]?.[key] || translations['tr']?.[key] || key;
}

export function useTranslation() {
  const language = useStore((state) => state.settings.language);
  return {
    t: (key) => t(key, language || 'tr'),
    lang: language || 'tr',
  };
}

export default { t, useTranslation };
