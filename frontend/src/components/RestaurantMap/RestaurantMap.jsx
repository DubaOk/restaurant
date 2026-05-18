import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './RestaurantMap.module.css';

const MINSK_CENTER = [53.9023, 27.5619];
import { getYandexMapsApiKey } from '../../utils/yandexMapsKey';

const MAP_CONTAINER_ID = 'restaurants-yandex-map';

const MAP_PIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f2d09a"/><stop offset="1" stop-color="#8a6230"/></linearGradient>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.45"/></filter>
    </defs>
    <path filter="url(#s)" fill="url(#g)" stroke="#1e1810" stroke-width="1.2"
      d="M22 3C13.8 3 7 9.4 7 17.2 7 29 22 49 22 49s15-20 15-31.8C37 9.4 30.2 3 22 3z"/>
    <circle cx="22" cy="17.5" r="5.2" fill="#141210" stroke="rgba(242,208,154,0.5)" stroke-width="0.9"/>
    <path fill="none" stroke="rgba(242,208,154,0.85)" stroke-width="1.2" stroke-linecap="round"
      d="M22 11v4M19 13h6"/>
  </svg>`
);
const MAP_PIN_HREF = `data:image/svg+xml;charset=UTF-8,${MAP_PIN_SVG}`;

const getYandexMapsSrc = () => {
  const params = new URLSearchParams({ lang: 'ru_RU' });
  const apiKey = getYandexMapsApiKey();
  if (apiKey) {
    params.set('apikey', apiKey);
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

const RestaurantMap = ({ restaurants, variant = 'default' }) => {
  const [mapLoadError, setMapLoadError] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  const [popup, setPopup] = useState(null);
  const mapInstanceRef = useRef(null);
  const shellRef = useRef(null);

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

  const closePopup = useCallback(() => setPopup(null), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closePopup();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePopup]);

  useEffect(() => {
    let cancelled = false;
    setPopup(null);

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

        if (mapInstanceRef.current) {
          mapInstanceRef.current.destroy();
          mapInstanceRef.current = null;
        }

        const center = withCoords.length > 0 ? [withCoords[0].latitude, withCoords[0].longitude] : MINSK_CENTER;
        const zoom = withCoords.length > 1 ? 12 : withCoords.length === 1 ? 14 : 11;

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

        map.events.add('click', (e) => {
          if (e.get('target') === map) {
            setPopup(null);
          }
        });

        withCoords.forEach((restaurant) => {
          const placemark = new ymaps.Placemark(
            [restaurant.latitude, restaurant.longitude],
            {},
            {
              iconLayout: 'default#image',
              iconImageHref: MAP_PIN_HREF,
              iconImageSize: [44, 56],
              iconImageOffset: [-22, -56],
              hasBalloon: false,
              hasHint: true,
              hintContent: restaurant.name,
            }
          );
          placemark.events.add('click', (e) => {
            e.stopPropagation();
            setPopup(restaurant);
          });
          map.geoObjects.add(placemark);
        });

        if (withCoords.length > 1) {
          try {
            map.setBounds(
              map.geoObjects.getBounds(),
              { checkZoomRange: true, zoomMargin: 48 }
            );
          } catch {
            /* ignore */
          }
        }

        mapInstanceRef.current = map;
        setIsMapReady(true);
      } catch (error) {
        if (cancelled) return;
        setMapLoadError(error?.message || 'Ошибка инициализации карты');
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [withCoords]);

  const cover = popup?.coverImage || popup?.imageUrl || popup?.images?.[0]?.url;

  return (
    <section className={`${styles.mapSection} ${variant === 'fullscreen' ? styles.fullscreen : ''}`}>
      {variant !== 'fullscreen' && (
        <div className={styles.mapHeader}>
          <h2>Карта заведений</h2>
          <p>Кастомные метки: нажмите на маркер, чтобы открыть карточку заведения.</p>
        </div>
      )}

      <div ref={shellRef} className={styles.mapShell}>
        <div id={MAP_CONTAINER_ID} className={styles.map} />

        {popup && (
          <div className={styles.popupBackdrop} role="presentation" onClick={closePopup}>
            <article
              className={styles.popupCard}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label={popup.name}
            >
              <button type="button" className={styles.popupClose} onClick={closePopup} aria-label="Закрыть">
                ×
              </button>
              <div className={styles.popupVisual} style={cover ? { backgroundImage: `url(${cover})` } : undefined}>
                {!cover && <div className={styles.popupVisualFallback}>🍽</div>}
                <div className={styles.popupVisualGrad} />
                <div className={styles.popupHeroText}>
                  <span className={styles.popupKicker}>{popup.cuisine || 'Заведение'}</span>
                  <h3 className={styles.popupTitle}>{popup.name}</h3>
                  <p className={styles.popupMeta}>
                    {[popup.city, popup.address].filter(Boolean).join(' · ') || 'Адрес уточняется'}
                  </p>
                </div>
              </div>
              <div className={styles.popupBody}>
                {popup.avgRating != null && (
                  <p className={styles.popupRating}>
                    <span>★</span> {Number(popup.avgRating).toFixed(1)} — оценка гостей
                  </p>
                )}
                <p className={styles.popupHint}>Перейдите на страницу заведения, чтобы забронировать столик.</p>
                <Link to={`/restaurants/${popup.id}`} className={styles.popupCta} onClick={closePopup}>
                  Открыть карточку
                </Link>
              </div>
            </article>
          </div>
        )}
      </div>

      {mapLoadError && (
        <p className={styles.error}>
          Карта Яндекс не загрузилась: {mapLoadError}. Проверьте ключ и разрешённые домены (localhost/127.0.0.1).
        </p>
      )}
      {!mapLoadError && !isMapReady && <p className={styles.notice}>Загружаем карту...</p>}

      {withCoords.length === 0 && (
        <p className={styles.notice}>Для отображения на карте добавьте координаты заведениям.</p>
      )}
    </section>
  );
};

export default RestaurantMap;
