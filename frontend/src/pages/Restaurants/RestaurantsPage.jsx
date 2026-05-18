import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { restaurantsApi } from '../../api/restaurants.api';
import RestaurantMap from '../../components/RestaurantMap/RestaurantMap';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import Navbar from '../../components/Navbar/Navbar';
import { BELARUS_CITY_NAMES } from '../../constants/belarusCities';
import { APP_NAME, APP_TAGLINE } from '../../constants/brand';
import styles from './RestaurantsPage.module.css';

const VIEW_MODES = [
  { id: 'gallery', label: 'Витрина', icon: '◧' },
  { id: 'grid', label: 'Сетка', icon: '◰' },
  { id: 'map', label: 'Карта', icon: '◎' },
  { id: 'filters', label: 'Подбор', icon: '◌' },
];

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('gallery');
  const [filters, setFilters] = useState({ city: '', search: '', cuisine: '', sortBy: '', sortOrder: 'asc' });
  const galleryShellRef = useRef(null);
  const galleryRef = useRef(null);
  const galleryProgressFillRef = useRef(null);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.city) params.city = filters.city;
      const { data } = await restaurantsApi.getAll(params);
      setRestaurants(data.data);
    } catch {
      setError('Не удалось загрузить заведения');
    } finally {
      setLoading(false);
    }
  }, [filters.city]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const cuisines = useMemo(
    () => [...new Set(restaurants.map((r) => r.cuisine).filter(Boolean))],
    [restaurants]
  );

  const cityOptions = useMemo(
    () => [
      { value: '', label: 'Вся Беларусь' },
      ...BELARUS_CITY_NAMES.map((city) => ({ value: city, label: city })),
    ],
    [],
  );

  const cuisineOptions = useMemo(
    () => [
      { value: '', label: 'Все кухни' },
      ...cuisines.map((c) => ({ value: c, label: c })),
    ],
    [cuisines],
  );

  const sortByOptions = useMemo(
    () => [
      { value: '', label: 'По умолчанию' },
      { value: 'name', label: 'По названию' },
      { value: 'avgRating', label: 'По рейтингу' },
      { value: 'cuisine', label: 'По кухне' },
    ],
    [],
  );

  const sortOrderOptions = useMemo(
    () => [
      { value: 'asc', label: 'По возрастанию' },
      { value: 'desc', label: 'По убыванию' },
    ],
    [],
  );

  const filteredRestaurants = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const list = restaurants.filter((r) => {
      const matchesSearch = search
        ? r.name?.toLowerCase().includes(search) ||
          r.address?.toLowerCase().includes(search) ||
          (r.city && r.city.toLowerCase().includes(search))
        : true;
      const matchesCuisine = filters.cuisine ? r.cuisine === filters.cuisine : true;
      return matchesSearch && matchesCuisine;
    });

    if (filters.sortBy) {
      list.sort((a, b) => {
        let valA = a[filters.sortBy];
        let valB = b[filters.sortBy];
        if (valA == null) valA = filters.sortOrder === 'asc' ? Infinity : -Infinity;
        if (valB == null) valB = filters.sortOrder === 'asc' ? Infinity : -Infinity;
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return filters.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return filters.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [restaurants, filters]);

  const galleryDeckKey = useMemo(
    () => filteredRestaurants.map((r) => r.id).join(','),
    [filteredRestaurants]
  );

  const scrollGalleryByStep = useCallback((direction) => {
    const track = galleryRef.current;
    if (!track) return false;
    const cards = track.querySelectorAll('[data-gallery-card]');
    if (!cards.length) return false;

    let idx = 0;
    let best = Infinity;
    const anchor = track.scrollLeft;
    for (let i = 0; i < cards.length; i++) {
      const d = Math.abs(cards[i].offsetLeft - anchor);
      if (d < best) {
        best = d;
        idx = i;
      }
    }
    const next = Math.min(cards.length - 1, Math.max(0, idx + direction));
    if (next === idx) return false;
    track.scrollTo({ left: cards[next].offsetLeft, behavior: 'smooth' });
    return true;
  }, []);

  useEffect(() => {
    const shell = galleryShellRef.current;
    const track = galleryRef.current;
    const fill = galleryProgressFillRef.current;
    if (!shell || !track || view !== 'gallery') return undefined;

    const cardsSel = () => track.querySelectorAll('[data-gallery-card]');

    let rafId = null;
    let lastActiveIdx = -1;
    let wheelLocked = false;
    let wheelUnlockTimer = null;

    const syncProgress = () => {
      if (!fill || !track) return;
      const maxScroll = track.scrollWidth - track.clientWidth;
      const pct = maxScroll <= 0 ? 0 : (track.scrollLeft / maxScroll) * 100;
      fill.style.width = `${pct}%`;
    };

    const syncActiveCard = () => {
      const cards = cardsSel();
      if (!cards.length) {
        lastActiveIdx = -1;
        return;
      }
      if (lastActiveIdx >= cards.length) lastActiveIdx = -1;

      let bestIdx = 0;
      let bestDist = Infinity;
      const anchor = track.scrollLeft;
      cards.forEach((el, i) => {
        const d = Math.abs(el.offsetLeft - anchor);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });

      if (bestIdx === lastActiveIdx) return;

      if (lastActiveIdx >= 0 && cards[lastActiveIdx]) {
        cards[lastActiveIdx].classList.remove(styles.galleryCardActive);
      }
      cards[bestIdx]?.classList.add(styles.galleryCardActive);
      lastActiveIdx = bestIdx;
    };

    const onScroll = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncProgress();
        syncActiveCard();
      });
    };

    const getWheelDelta = (e) => {
      let dy = e.deltaY;
      let dx = e.deltaX;
      if (e.deltaMode === 1) {
        dy *= 16;
        dx *= 16;
      } else if (e.deltaMode === 2) {
        dy *= track.clientHeight || 1;
        dx *= track.clientWidth || 1;
      }
      if (e.shiftKey) return dy;
      if (Math.abs(dx) > Math.abs(dy)) return dx;
      return dy;
    };

    const onWheel = (e) => {
      if (e.ctrlKey) return;
      if (e.target.closest?.('[data-gallery-chrome]')) return;

      const raw = getWheelDelta(e);
      if (raw === 0) return;

      const dir = raw > 0 ? 1 : -1;

      if (wheelLocked) {
        e.preventDefault();
        return;
      }

      const moved = scrollGalleryByStep(dir);
      if (!moved) return;

      e.preventDefault();
      wheelLocked = true;
      if (wheelUnlockTimer) clearTimeout(wheelUnlockTimer);
      wheelUnlockTimer = window.setTimeout(() => {
        wheelLocked = false;
        wheelUnlockTimer = null;
      }, 380);
    };

    syncProgress();
    syncActiveCard();

    const wheelOpts = { passive: false };
    shell.addEventListener('wheel', onWheel, wheelOpts);
    track.addEventListener('wheel', onWheel, wheelOpts);
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      shell.removeEventListener('wheel', onWheel, wheelOpts);
      track.removeEventListener('wheel', onWheel, wheelOpts);
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
      if (wheelUnlockTimer) clearTimeout(wheelUnlockTimer);
    };
  }, [view, galleryDeckKey, scrollGalleryByStep]);

  const scrollGallery = (direction) => {
    scrollGalleryByStep(direction);
  };

  const renderRestaurantCard = (restaurant, { gallery = false, large = false } = {}) => {
    const inner = (
      <>
        {restaurant.imageUrl || restaurant.coverImage || restaurant.images?.[0]?.url ? (
          <img
            src={restaurant.coverImage || restaurant.images?.[0]?.url || restaurant.imageUrl}
            alt={restaurant.name}
            className={styles.cardImage}
          />
        ) : (
          <div className={styles.cardImageFallback}>
            <div className={styles.shimmer} />
          </div>
        )}
        <div className={styles.cardOverlay}>
          <p className={styles.cardCuisine}>{restaurant.cuisine || 'Ресторан'}</p>
          <h3>{restaurant.name}</h3>
          <p>
            {[restaurant.city, restaurant.address].filter(Boolean).join(' · ') || 'Город и адрес уточняются'}
          </p>
        </div>
      </>
    );

    return (
      <Link
        key={restaurant.id}
        to={`/restaurants/${restaurant.id}`}
        className={`${styles.card} ${gallery ? styles.galleryCard : ''} ${!gallery && large ? styles.cardLarge : ''}`}
        {...(gallery ? { 'data-gallery-card': '1' } : {})}
      >
        {gallery ? <span className={styles.galleryCardSurface}>{inner}</span> : inner}
      </Link>
    );
  };

  return (
    <>
      <Navbar />
      <main className={styles.pageWrap}>
        <aside className={styles.sidebar}>
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`${styles.sideBtn} ${view === mode.id ? styles.sideBtnActive : ''}`}
              onClick={() => setView(mode.id)}
              title={mode.label}
              aria-label={mode.label}
            >
              <span>{mode.icon}</span>
            </button>
          ))}
        </aside>

        <section className={styles.page}>
          <header className={`${styles.hero} ${styles.staged}`} style={{ animationDelay: '40ms' }}>
            <p className={styles.kicker}>{APP_NAME.toUpperCase()} · ПО ВСЕЙ БЕЛАРУСИ</p>
            <h1>РЕСТОРАНЫ И ЗАВЕДЕНИЯ</h1>
            <p className={styles.subtitle}>{APP_TAGLINE}</p>
            <div className={styles.heroCityRow}>
              <label className={styles.heroCityLabel} htmlFor="hero-city-select">
                Город
                <CustomSelect
                  id="hero-city-select"
                  value={filters.city}
                  onChange={(city) => setFilters((prev) => ({ ...prev, city }))}
                  options={cityOptions}
                  placeholder="Вся Беларусь"
                  aria-label="Город"
                />
              </label>
            </div>
            <div className={styles.heroMeta}>
              <span>{filteredRestaurants.length} заведений в подборке</span>
              <span>{filters.city || 'Все города'}</span>
              <span>Бронирование столиков онлайн</span>
            </div>
          </header>

          {error && (
            <p className={`${styles.error} ${styles.staged}`} style={{ animationDelay: '120ms' }}>
              {error}
            </p>
          )}
          {loading && (
            <p className={`${styles.loading} ${styles.staged}`} style={{ animationDelay: '120ms' }}>
              Загрузка...
            </p>
          )}

          {!loading && (
            <div className={styles.viewStage}>
              {view === 'gallery' && (
                <section
                  ref={galleryShellRef}
                  className={`${styles.galleryView} ${styles.staged}`}
                  style={{ animationDelay: '150ms' }}
                >
                  <div ref={galleryRef} className={styles.galleryTrack}>
                    {filteredRestaurants.map((restaurant) => renderRestaurantCard(restaurant, { gallery: true }))}
                  </div>
                  <div className={styles.galleryFooter} data-gallery-chrome>
                    <div className={styles.progress}>
                      <div ref={galleryProgressFillRef} className={styles.progressFill} />
                    </div>
                    <div className={styles.arrows}>
                      <button type="button" onClick={() => scrollGallery(-1)} aria-label="Назад">
                        ←
                      </button>
                      <button type="button" onClick={() => scrollGallery(1)} aria-label="Вперед">
                        →
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {view === 'grid' && (
                <section className={`${styles.gridView} ${styles.staged}`} style={{ animationDelay: '150ms' }}>
                  <div className={styles.masonry}>
                    {filteredRestaurants.map((restaurant) => renderRestaurantCard(restaurant))}
                  </div>
                </section>
              )}

              {view === 'map' && (
                <section className={`${styles.mapView} ${styles.staged}`} style={{ animationDelay: '150ms' }}>
                  <RestaurantMap restaurants={filteredRestaurants} variant="fullscreen" />
                </section>
              )}

              {view === 'filters' && (
                <section className={`${styles.filtersView} ${styles.staged}`} style={{ animationDelay: '150ms' }}>
                  <div className={styles.filtersPanel}>
                    <h2>Подбор заведения</h2>
                    <label>
                      Город
                      <CustomSelect
                        value={filters.city}
                        onChange={(city) => setFilters((prev) => ({ ...prev, city }))}
                        options={cityOptions}
                        placeholder="Вся Беларусь"
                        aria-label="Город"
                      />
                    </label>
                    <label>
                      Поиск по названию, адресу или городу
                      <input
                        value={filters.search}
                        onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                        placeholder="Например, Немига или Гродно"
                      />
                    </label>
                    <label>
                      Тип кухни / концепция
                      <CustomSelect
                        value={filters.cuisine}
                        onChange={(cuisine) => setFilters((prev) => ({ ...prev, cuisine }))}
                        options={cuisineOptions}
                        placeholder="Все кухни"
                        aria-label="Тип кухни"
                      />
                    </label>
                    <label>
                      Сортировка
                      <CustomSelect
                        value={filters.sortBy}
                        onChange={(sortBy) => setFilters((prev) => ({ ...prev, sortBy }))}
                        options={sortByOptions}
                        placeholder="По умолчанию"
                        aria-label="Сортировка"
                      />
                    </label>
                    {filters.sortBy && (
                      <label>
                        Направление
                        <CustomSelect
                          value={filters.sortOrder}
                          onChange={(sortOrder) => setFilters((prev) => ({ ...prev, sortOrder }))}
                          options={sortOrderOptions}
                          placeholder="Направление"
                          aria-label="Направление сортировки"
                        />
                      </label>
                    )}
                  </div>
                  <div className={styles.masonry}>
                    {filteredRestaurants.map((restaurant) => renderRestaurantCard(restaurant))}
                  </div>
                </section>
              )}
            </div>
          )}
          {!loading && filteredRestaurants.length === 0 && (
            <p className={`${styles.empty} ${styles.staged}`} style={{ animationDelay: '200ms' }}>
              По выбранным фильтрам ничего не найдено
            </p>
          )}
        </section>
      </main>
    </>
  );
};

export default RestaurantsPage;
