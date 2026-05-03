import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { restaurantsApi } from '../../api/restaurants.api';
import RestaurantMap from '../../components/RestaurantMap/RestaurantMap';
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

  useEffect(() => {
    const shell = galleryShellRef.current;
    const track = galleryRef.current;
    const fill = galleryProgressFillRef.current;
    if (!shell || !track || view !== 'gallery') return undefined;

    const cardsSel = () => track.querySelectorAll('[data-gallery-card]');

    let rafProgress = null;
    let rafActive = null;

    const syncProgress = () => {
      if (!fill || !track) return;
      const maxScroll = track.scrollWidth - track.clientWidth;
      const pct = maxScroll <= 0 ? 0 : (track.scrollLeft / maxScroll) * 100;
      fill.style.width = `${pct}%`;
    };

    const scheduleProgress = () => {
      if (rafProgress != null) return;
      rafProgress = requestAnimationFrame(() => {
        rafProgress = null;
        syncProgress();
      });
    };

    let lastActiveIdx = -1;

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
      if (cards[bestIdx]) {
        cards[bestIdx].classList.add(styles.galleryCardActive);
      }
      lastActiveIdx = bestIdx;
    };

    const scheduleActive = () => {
      if (rafActive != null) return;
      rafActive = requestAnimationFrame(() => {
        rafActive = null;
        syncActiveCard();
        syncProgress();
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

    let pointerInShell = false;
    let wheelCooldown = false;
    const COOLDOWN_MS = 420;

    const resolveGalleryStep = (dir) => {
      const cards = cardsSel();
      if (!cards.length) return null;
      const n = cards.length;
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      if (maxScroll <= 0) return null;

      let idx = 0;
      let best = Infinity;
      const anchor = track.scrollLeft;
      for (let i = 0; i < n; i++) {
        const d = Math.abs(cards[i].offsetLeft - anchor);
        if (d < best) {
          best = d;
          idx = i;
        }
      }
      const next = Math.min(n - 1, Math.max(0, idx + dir));
      if (next === idx) return null;
      return cards[next].offsetLeft;
    };

    const onWheelDocument = (e) => {
      if (e.ctrlKey || view !== 'gallery') return;
      if (!pointerInShell) return;
      if (!shell.contains(e.target)) return;
      if (e.target.closest?.('[data-gallery-chrome]')) return;

      const raw = getWheelDelta(e);
      if (raw === 0) return;

      const dir = raw > 0 ? 1 : -1;
      const targetLeft = resolveGalleryStep(dir);
      if (targetLeft == null) return;

      if (wheelCooldown) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      wheelCooldown = true;
      window.setTimeout(() => {
        wheelCooldown = false;
      }, COOLDOWN_MS);
      track.scrollTo({ left: targetLeft, behavior: 'smooth' });
    };

    const onPointerEnterShell = () => {
      pointerInShell = true;
    };
    const onPointerLeaveShell = () => {
      pointerInShell = false;
    };

    syncProgress();
    syncActiveCard();
    shell.addEventListener('pointerenter', onPointerEnterShell);
    shell.addEventListener('pointerleave', onPointerLeaveShell);
    track.addEventListener('scroll', scheduleActive, { passive: true });
    document.addEventListener('wheel', onWheelDocument, { passive: false, capture: true });
    window.addEventListener('resize', scheduleProgress);
    return () => {
      shell.removeEventListener('pointerenter', onPointerEnterShell);
      shell.removeEventListener('pointerleave', onPointerLeaveShell);
      track.removeEventListener('scroll', scheduleActive);
      document.removeEventListener('wheel', onWheelDocument, true);
      window.removeEventListener('resize', scheduleProgress);
      if (rafProgress != null) cancelAnimationFrame(rafProgress);
      if (rafActive != null) cancelAnimationFrame(rafActive);
    };
  }, [view, galleryDeckKey]);

  const scrollGallery = (direction) => {
    const track = galleryRef.current;
    if (!track) return;
    const cards = track.querySelectorAll('[data-gallery-card]');
    if (!cards.length) return;
    const n = cards.length;
    let idx = 0;
    let best = Infinity;
    const anchor = track.scrollLeft;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(cards[i].offsetLeft - anchor);
      if (d < best) {
        best = d;
        idx = i;
      }
    }
    const next = Math.min(n - 1, Math.max(0, idx + direction));
    track.scrollTo({ left: cards[next].offsetLeft, behavior: 'smooth' });
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
              <label className={styles.heroCityLabel}>
                Город
                <select
                  className={styles.heroCitySelect}
                  value={filters.city}
                  onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
                >
                  <option value="">Вся Беларусь</option>
                  {BELARUS_CITY_NAMES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
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
                      <select
                        value={filters.city}
                        onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
                      >
                        <option value="">Вся Беларусь</option>
                        {BELARUS_CITY_NAMES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
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
                      <select
                        value={filters.cuisine}
                        onChange={(e) => setFilters((prev) => ({ ...prev, cuisine: e.target.value }))}
                      >
                        <option value="">Все кухни</option>
                        {cuisines.map((cuisine) => (
                          <option key={cuisine} value={cuisine}>
                            {cuisine}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Сортировка
                      <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
                      >
                        <option value="">По умолчанию</option>
                        <option value="name">По названию</option>
                        <option value="avgRating">По рейтингу</option>
                        <option value="cuisine">По кухне</option>
                      </select>
                    </label>
                    {filters.sortBy && (
                      <label>
                        Направление
                        <select
                          value={filters.sortOrder}
                          onChange={(e) => setFilters((prev) => ({ ...prev, sortOrder: e.target.value }))}
                        >
                          <option value="asc">По возрастанию</option>
                          <option value="desc">По убыванию</option>
                        </select>
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
