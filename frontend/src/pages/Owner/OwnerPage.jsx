import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { restaurantsApi } from '../../api/restaurants.api';
import { reservationsApi } from '../../api/reservations.api';
import { analyticsApi } from '../../api/analytics.api';
import Navbar from '../../components/Navbar/Navbar';
import OwnerRestaurantForm from '../../components/OwnerRestaurantForm/OwnerRestaurantForm';
import OwnerReservations from '../../components/OwnerReservations/OwnerReservations';
import OwnerAnalytics from '../../components/OwnerAnalytics/OwnerAnalytics';
import styles from './OwnerPage.module.css';

const TABS = ['Ресторан', 'Бронирования', 'Аналитика'];

const OwnerPage = () => {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    restaurantsApi
      .getAll({ ownerId: user?.id })
      .then(({ data }) => setRestaurant(data.data[0] || null))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <h1>Панель владельца</h1>

        {loading ? (
          <p className={styles.loading}>Загрузка...</p>
        ) : (
          <>
            <div className={styles.tabs}>
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === i ? styles.active : ''}`}
                  onClick={() => setActiveTab(i)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className={styles.content}>
              {activeTab === 0 && (
                <OwnerRestaurantForm
                  restaurant={restaurant}
                  onSaved={setRestaurant}
                />
              )}
              {activeTab === 1 && restaurant && (
                <OwnerReservations restaurantId={restaurant.id} />
              )}
              {activeTab === 2 && restaurant && (
                <OwnerAnalytics restaurantId={restaurant.id} />
              )}
              {(activeTab === 1 || activeTab === 2) && !restaurant && (
                <p className={styles.empty}>Сначала создайте ресторан</p>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
};

export default OwnerPage;
