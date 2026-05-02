import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { restaurantsApi } from '../../api/restaurants.api';
import Navbar from '../../components/Navbar/Navbar';
import OwnerRestaurantForm from '../../components/OwnerRestaurantForm/OwnerRestaurantForm';
import OwnerTablesManager from '../../components/OwnerTablesManager/OwnerTablesManager';
import OwnerReservations from '../../components/OwnerReservations/OwnerReservations';
import OwnerAnalytics from '../../components/OwnerAnalytics/OwnerAnalytics';
import OwnerMenuManager from '../../components/OwnerMenuManager/OwnerMenuManager';
import OwnerPromotionsManager from '../../components/OwnerPromotionsManager/OwnerPromotionsManager';
import styles from './OwnerPage.module.css';

const TABS = ['Мои рестораны', 'Бронирования', 'Меню', 'Акции', 'Аналитика'];

const OwnerPage = () => {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    restaurantsApi
      .getAll({ ownerId: user?.id })
      .then(({ data }) => {
        const list = data.data || [];
        setRestaurants(list);
        setSelectedRestaurantId(list[0]?.id || null);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId) || null;

  const handleSavedRestaurant = (saved) => {
    setRestaurants((prev) => {
      const exists = prev.some((item) => item.id === saved.id);
      if (!exists) return [saved, ...prev];
      return prev.map((item) => (item.id === saved.id ? saved : item));
    });
    setSelectedRestaurantId(saved.id);
    setIsCreating(false);
  };

  const handleDeleteRestaurant = async (id) => {
    if (!window.confirm('Удалить этот ресторан?')) return;
    await restaurantsApi.remove(id);
    setRestaurants((prev) => prev.filter((r) => r.id !== id));
    setSelectedRestaurantId((prev) => (prev === id ? null : prev));
  };

  return (
    <>
      <Navbar />
      <main className={styles.shell}>
        <div className={styles.inner}>
        <h1 className={styles.title}>Мои рестораны</h1>

        {loading ? (
          <p className={styles.loading}>Загрузка...</p>
        ) : (
          <>
            <div className={styles.tabs}>
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === i ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(i)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className={styles.content}>
              {activeTab === 0 && (
                <>
                  <div className={styles.pointsHeader}>
                    <h2>В списке</h2>
                    <button
                      type="button"
                      className={styles.btnAddPoint}
                      onClick={() => {
                        setIsCreating(true);
                        setSelectedRestaurantId(null);
                      }}
                    >
                      + Добавить ресторан
                    </button>
                  </div>

                  {restaurants.length > 0 && (
                    <div className={styles.pointsList}>
                      {restaurants.map((item) => (
                        <div
                          key={item.id}
                          className={`${styles.pointCard} ${selectedRestaurantId === item.id ? styles.pointCardActive : ''}`}
                        >
                          <button
                            type="button"
                            className={styles.pointSelect}
                            onClick={() => {
                              setSelectedRestaurantId(item.id);
                              setIsCreating(false);
                            }}
                          >
                            <strong>{item.name}</strong>
                            <span>{item.address}</span>
                          </button>
                          <button
                            type="button"
                            className={styles.pointDelete}
                            onClick={() => handleDeleteRestaurant(item.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <OwnerRestaurantForm
                    restaurant={isCreating ? null : selectedRestaurant}
                    onSaved={handleSavedRestaurant}
                  />
                  {!isCreating && selectedRestaurant && (
                    <OwnerTablesManager restaurantId={selectedRestaurant.id} />
                  )}
                </>
              )}
              {activeTab === 1 && selectedRestaurant && (
                <OwnerReservations restaurantId={selectedRestaurant.id} />
              )}
              {activeTab === 2 && selectedRestaurant && (
                <OwnerMenuManager restaurantId={selectedRestaurant.id} />
              )}
              {activeTab === 3 && selectedRestaurant && (
                <OwnerPromotionsManager restaurantId={selectedRestaurant.id} />
              )}
              {activeTab === 4 && selectedRestaurant && (
                <OwnerAnalytics restaurantId={selectedRestaurant.id} />
              )}
              {[1, 2, 3, 4].includes(activeTab) && !selectedRestaurant && (
                <p className={styles.empty}>Сначала создайте ресторан и выберите его в списке</p>
              )}
            </div>
          </>
        )}
        </div>
      </main>
    </>
  );
};

export default OwnerPage;
