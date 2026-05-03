/** Крупные города РБ: название и центр карты для геолокации по умолчанию */
export const BELARUS_CITY_CENTERS = [
  { name: 'Минск', lat: 53.9023, lng: 27.5619 },
  { name: 'Брест', lat: 52.0976, lng: 23.7341 },
  { name: 'Витебск', lat: 55.1904, lng: 30.2049 },
  { name: 'Гомель', lat: 52.4345, lng: 30.9754 },
  { name: 'Гродно', lat: 53.6688, lng: 23.8313 },
  { name: 'Могилёв', lat: 53.9168, lng: 30.3449 },
  { name: 'Бобруйск', lat: 53.1384, lng: 29.2214 },
  { name: 'Барановичи', lat: 53.1323, lng: 26.0135 },
  { name: 'Пинск', lat: 52.1229, lng: 26.0951 },
  { name: 'Орша', lat: 54.5092, lng: 30.4256 },
  { name: 'Мозырь', lat: 52.0495, lng: 29.2676 },
  { name: 'Солигорск', lat: 52.7876, lng: 27.5415 },
  { name: 'Новополоцк', lat: 55.5318, lng: 28.5986 },
  { name: 'Лида', lat: 53.8833, lng: 25.2997 },
  { name: 'Полоцк', lat: 55.4853, lng: 28.5984 },
  { name: 'Молодечно', lat: 54.3139, lng: 26.8511 },
];

export const BELARUS_CITY_NAMES = BELARUS_CITY_CENTERS.map((c) => c.name);

export const getCityMapCenter = (cityName) => {
  const found = BELARUS_CITY_CENTERS.find((c) => c.name === cityName);
  if (found) return [found.lat, found.lng];
  return [53.9023, 27.5619];
};
