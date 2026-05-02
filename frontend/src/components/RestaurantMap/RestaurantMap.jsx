import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './RestaurantMap.module.css';

const MINSK_CENTER = [53.9023, 27.5619];
const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';
const MAP_CONTAINER_ID = 'restaurants-yandex-map';

const getYandexMapsSrc = () => {
  const params = new URLSearchParams({ lang: 'ru_RU' });
  if (YANDEX_MAPS_API_KEY) {
    params.set('apikey', YANDEX_MAPS_API_KEY);
  }
  return `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
};

const loadYandexMapsScript = () =>
  new Promise((resolve, reject) => {
    if (window.ymaps) {
      resolve(window.ymaps);
      return;
    }

    const existing = document.querySelector(`script[data-yandex-maps="${MAP_CONTAINER_ID}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.ymaps), { once: true });
      existing.addEventListener('error', () => reject(new Error('Не удалось загрузить скрипт Яндекс Карт')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = getYandexMapsSrc();
    script.async = true;
    script.dataset.yandexMaps = MAP_CONTAINER_ID;
    script.onload = () => resolve(window.ymaps);
    script.onerror = () => reject(new Error('Не удалось загрузить скрипт Яндекс Карт'));
    document.head.appendChild(script);
  });

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const RestaurantMap = ({ restaurants, variant = 'default' }) => {
  const [mapLoadError, setMapLoadError] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef(null);

  const withCoords = useMemo(
    () =>
      restaurants
        .map((r) => ({
          ...r,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
        }))
        .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude)),
    [restaurants]
  );

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      setMapLoadError('');
      setIsMapReady(false);

      try {
        const ymaps = await loadYandexMapsScript();
        await new Promise((resolve) => ymaps.ready(resolve));
        if (cancelled) return;

        if (!document.getElementById(MAP_CONTAINER_ID)) {
          throw new Error('Контейнер карты не найден в DOM');
        }

        if (mapRef.current) {
          mapRef.current.destroy();
          mapRef.current = null;
        }

        const center = withCoords.length > 0 ? [withCoords[0].latitude, withCoords[0].longitude] : MINSK_CENTER;
        const zoom = withCoords.length > 0 ? 13 : 11;

        const map = new ymaps.Map(
          MAP_CONTAINER_ID,
          {
            center,
            zoom,
            controls: ['zoomControl', 'geolocationControl'],
          },
          {
            suppressMapOpenBlock: true,
          }
        );

        withCoords.forEach((restaurant) => {
          const placemark = new ymaps.Placemark(
            [restaurant.latitude, restaurant.longitude],
            {
              hintContent: escapeHtml(restaurant.name),
              balloonContentHeader: `<strong>${escapeHtml(restaurant.name)}</strong>`,
              balloonContentBody: `${escapeHtml(restaurant.cuisine || 'Кухня не указана')}<br/>${escapeHtml(
                restaurant.address || 'Адрес не указан'
              )}`,
              balloonContentFooter: `<a href="/restaurants/${restaurant.id}">Подробнее</a>`,
            },
            { preset: 'islands#redIcon' }
          );
          map.geoObjects.add(placemark);
        });

        mapRef.current = map;
        setIsMapReady(true);
      } catch (error) {
        if (cancelled) return;
        setMapLoadError(error?.message || 'Ошибка инициализации карты');
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [withCoords]);

  return (
    <section className={`${styles.mapSection} ${variant === 'fullscreen' ? styles.fullscreen : ''}`}>
      {variant !== 'fullscreen' && (
        <div className={styles.mapHeader}>
          <h2>Карта ресторанов</h2>
          <p>Рестораны отображаются по геопозиции в Яндекс Картах.</p>
        </div>
      )}

      <div className={styles.mapShell}>
        <div id={MAP_CONTAINER_ID} className={styles.map} />
      </div>

      {mapLoadError && (
        <p className={styles.error}>
          Карта Яндекс не загрузилась: {mapLoadError}. Проверьте ключ и разрешённые домены (localhost/127.0.0.1).
        </p>
      )}
      {!mapLoadError && !isMapReady && (
        <p className={styles.notice}>Загружаем карту...</p>
      )}

      {withCoords.length === 0 && (
        <p className={styles.notice}>
          Для отображения на карте добавьте координаты ресторанам.
        </p>
      )}
    </section>
  );
};

export default RestaurantMap;
