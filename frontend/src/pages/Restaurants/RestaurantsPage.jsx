import { useState, useEffect } from 'react';
import { restaurantsApi } from '../../api/restaurants.api';
import RestaurantCard from '../../components/RestaurantCard/RestaurantCard';
import RestaurantFilters from '../../components/RestaurantFilters/RestaurantFilters';
import RestaurantMap from '../../components/RestaurantMap/RestaurantMap';
import Navbar from '../../components/Navbar/Navbar';
import styles from './RestaurantsPage.module.css';

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('list');
  const [filters, setFilters] = useState({
    search: '',
    cuisine: '',
    minRating: '',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const fetchRestaurants = async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const { data } = await restaurantsApi.getAll(params);
      setRestaurants(data.data);
    } catch {
      setError('Не удалось загрузить рестораны');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [filters]);

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <div className={styles.header}>
          <h1>Рестораны Минска</h1>
          <div className={styles.viewToggle}>
            <button
              className={view === 'list' ? styles.active : ''}
              onClick={() => setView('list')}
            >
              Список
            </button>
            <button
              className={view === 'map' ? styles.active : ''}
              onClick={() => setView('map')}
            >
              Карта
            </button>
          </div>
        </div>

        <RestaurantFilters filters={filters} onChange={setFilters} />

        {error && <p className={styles.error}>{error}</p>}

        {view === 'map' ? (
          <RestaurantMap restaurants={restaurants} />
        ) : (
          <>
            {loading ? (
              <p className={styles.loading}>Загрузка...</p>
            ) : restaurants.length === 0 ? (
              <p className={styles.empty}>Рестораны не найдены</p>
            ) : (
              <div className={styles.grid}>
                {restaurants.map((r) => (
                  <RestaurantCard key={r.id} restaurant={r} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
};

export default RestaurantsPage;
