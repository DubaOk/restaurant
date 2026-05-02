import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { restaurantsApi } from '../../api/restaurants.api';
import RestaurantMap from '../../components/RestaurantMap/RestaurantMap';
import Navbar from '../../components/Navbar/Navbar';
import styles from './RestaurantsPage.module.css';

const VIEW_MODES = [
  { id: 'gallery', label: 'Gallery', icon: '◧' },
  { id: 'grid', label: 'Grid', icon: '◰' },
  { id: 'map', label: 'Map', icon: '◎' },
  { id: 'filters', label: 'Filters', icon: '◌' },
];

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('gallery');
  const [filters, setFilters] = useState({ search: '', cuisine: '', sortBy: '', sortOrder: 'asc' });
  const [galleryProgress, setGalleryProgress] = useState(0);
  const galleryRef = useRef(null);

  const fetchRestaurants = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await restaurantsApi.getAll();
      setRestaurants(data.data);
    } catch {
      setError('Не удалось загрузить рестораны');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const cuisines = useMemo(
    () => [...new Set(restaurants.map((r) => r.cuisine).filter(Boolean))],
    [restaurants]
  );

  const filteredRestaurants = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const list = restaurants.filter((r) => {
      const matchesSearch = search
        ? r.name?.toLowerCase().includes(search) || r.address?.toLowerCase().includes(search)
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

  useEffect(() => {
    const node = galleryRef.current;
    if (!node || view !== 'gallery') return undefined;

    const updateProgress = () => {
      const maxScroll = node.scrollWidth - node.clientWidth;
      const progress = maxScroll <= 0 ? 0 : (node.scrollLeft / maxScroll) * 100;
      setGalleryProgress(progress);
    };

    updateProgress();
    node.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      node.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [view, filteredRestaurants.length]);

  const scrollGallery = (direction) => {
    if (!galleryRef.current) return;
    galleryRef.current.scrollBy({ left: direction * 360, behavior: 'smooth' });
  };

  const renderRestaurantCard = (restaurant, large = false) => (
    <Link
      key={restaurant.id}
      to={`/restaurants/${restaurant.id}`}
      className={`${styles.card} ${large ? styles.cardLarge : ''}`}
    >
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
        <p>{restaurant.address || 'Минск'}</p>
      </div>
    </Link>
  );

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
            <p className={styles.kicker}>MINSK FOOD ATLAS</p>
            <h1>ЛУЧШИЕ РЕСТОРАНЫ МИНСКА</h1>
            <p className={styles.subtitle}>
              Премиальный гид по ресторанам города: галерея, плитка и карта в одном интерфейсе.
            </p>
            <div className={styles.heroMeta}>
              <span>{filteredRestaurants.length} мест</span>
              <span>Минск</span>
              <span>Premium guide</span>
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
                <section className={`${styles.galleryView} ${styles.staged}`} style={{ animationDelay: '150ms' }}>
                  <div ref={galleryRef} className={styles.galleryTrack}>
                    {filteredRestaurants.map((restaurant, index) =>
                      renderRestaurantCard(restaurant, index === 1)
                    )}
                  </div>
                  <div className={styles.galleryFooter}>
                    <div className={styles.progress}>
                      <div className={styles.progressFill} style={{ width: `${galleryProgress}%` }} />
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
                    <h2>Фильтры</h2>
                    <label>
                      Поиск по названию/адресу
                      <input
                        value={filters.search}
                        onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                        placeholder="Например, Независимости"
                      />
                    </label>
                    <label>
                      Кухня
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
