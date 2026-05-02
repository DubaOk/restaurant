const { yandexMapsApiKey } = require('../config');

const parseCoordinates = (response) => {
  const members = response?.response?.GeoObjectCollection?.featureMember || [];
  const point = members[0]?.GeoObject?.Point?.pos;
  if (!point) return null;

  const [longitude, latitude] = point.split(' ').map(Number);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
};

const geocodeAddress = async (address) => {
  if (!address || !address.trim()) return null;
  if (!yandexMapsApiKey) return null;

  const params = new URLSearchParams({
    apikey: yandexMapsApiKey,
    geocode: address,
    format: 'json',
    results: '1',
    lang: 'ru_RU',
  });

  const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?${params.toString()}`);
  if (!response.ok) return null;

  const json = await response.json();
  return parseCoordinates(json);
};

module.exports = { geocodeAddress };
