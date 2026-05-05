const { yandexMapsApiKey, yandexGeosuggestApiKey } = require('../../config');

/** Ключ для Suggest: отдельный сервис Яндекса; иначе пробуем общий ключ геокодера (старые .env) */
const suggestApiKey = () => (yandexGeosuggestApiKey || yandexMapsApiKey || '').trim();

const SUGGEST_URL = 'https://suggest-maps.yandex.ru/v1/suggest';
const GEOCODE_URL = 'https://geocode-maps.yandex.ru/1.x/';

const parseGeocodeFeature = (json) => {
  const m = json?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
  if (!m) return null;
  const pos = m.Point?.pos?.split(' ')?.map(Number);
  if (!pos || pos.length < 2 || !Number.isFinite(pos[0]) || !Number.isFinite(pos[1])) return null;
  const [longitude, latitude] = pos;
  const addressLine =
    m.metaDataProperty?.GeocoderMetaData?.text ||
    m.metaDataProperty?.GeocoderMetaData?.Address?.formatted ||
    m.name ||
    '';
  return { latitude, longitude, addressLine: String(addressLine).trim() };
};

/**
 * Подсказки адресов (как в Яндекс.Картах)
 * @param {string} text — фрагмент адреса
 * @param {string} city — город из справочника
 * @param {{ lon: number, lat: number } | null} bias — смещение поиска к центру города
 */
const suggest = async (text, city, bias = null) => {
  const sKey = suggestApiKey();
  if (!sKey || !text || !String(text).trim()) return [];
  const q = [city, 'Беларусь', String(text).trim()].filter(Boolean).join(', ');
  const params = new URLSearchParams({
    apikey: sKey,
    text: q,
    lang: 'ru_RU',
    results: '10',
    types: 'geo,address',
  });
  if (bias && Number.isFinite(bias.lon) && Number.isFinite(bias.lat)) {
    params.set('ll', `${bias.lon},${bias.lat}`);
  }

  const response = await fetch(`${SUGGEST_URL}?${params.toString()}`);
  if (!response.ok) return [];
  const json = await response.json();
  const results = Array.isArray(json.results) ? json.results : [];

  const mapped = results
    .map((item) => {
      const title = item.title?.text || '';
      const sub = item.subtitle?.text || '';
      const displayName = [title, sub].filter(Boolean).join(', ');
      return {
        displayName,
        /** Строка для прямого геокодирования */
        geocodeQuery: displayName || title,
      };
    })
    .filter((x) => x.displayName && x.geocodeQuery);

  if (mapped.length > 0) return mapped;

  /* Fallback: геокодер как подсказка */
  const geo = await geocodeForward(q);
  if (!geo?.addressLine) return [];
  return [{ displayName: geo.addressLine, geocodeQuery: geo.addressLine }];
};

const geocodeForward = async (address) => {
  if (!yandexMapsApiKey || !address || !String(address).trim()) return null;
  const params = new URLSearchParams({
    apikey: yandexMapsApiKey,
    geocode: String(address).trim(),
    format: 'json',
    results: '1',
    lang: 'ru_RU',
  });
  const response = await fetch(`${GEOCODE_URL}?${params.toString()}`);
  if (!response.ok) return null;
  const json = await response.json();
  return parseGeocodeFeature(json);
};

const reverseGeocode = async (latitude, longitude) => {
  if (!yandexMapsApiKey) return null;
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const params = new URLSearchParams({
    apikey: yandexMapsApiKey,
    geocode: `${lon},${lat}`,
    format: 'json',
    results: '1',
    lang: 'ru_RU',
  });
  const response = await fetch(`${GEOCODE_URL}?${params.toString()}`);
  if (!response.ok) return null;
  const json = await response.json();
  const parsed = parseGeocodeFeature(json);
  if (!parsed) return null;
  return {
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    addressLine: parsed.addressLine,
  };
};

module.exports = { suggest, geocodeForward, reverseGeocode };
