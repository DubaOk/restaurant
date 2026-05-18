export const getYandexMapsApiKey = () => {
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.VITE_YANDEX_MAPS_API_KEY) {
    return window.__RUNTIME_CONFIG__.VITE_YANDEX_MAPS_API_KEY;
  }
  return import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';
};
