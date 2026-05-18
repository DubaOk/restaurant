import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { restaurantsApi } from '../../api/restaurants.api';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import Navbar from '../../components/Navbar/Navbar';
import OwnerRestaurantForm from '../../components/OwnerRestaurantForm/OwnerRestaurantForm';
import OwnerTablesManager from '../../components/OwnerTablesManager/OwnerTablesManager';
import OwnerReservations from '../../components/OwnerReservations/OwnerReservations';
import OwnerAnalytics from '../../components/OwnerAnalytics/OwnerAnalytics';
import OwnerMenuManager from '../../components/OwnerMenuManager/OwnerMenuManager';
import OwnerPromotionsManager from '../../components/OwnerPromotionsManager/OwnerPromotionsManager';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import styles from './OwnerPage.module.css';

const TABS = ['Заведения и зал', 'Бронь гостей', 'Меню и цены', 'Акции', 'Показатели'];

const OwnerPage = () => {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

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
  const hasRestaurants = restaurants.length > 0;

  const establishmentOptions = useMemo(
    () => [
      {
        value: '',
        label: hasRestaurants ? 'Выберите заведение для работы' : 'Сначала добавьте заведение в гид',
        disabled: !hasRestaurants,
      },
      ...restaurants.map((r) => ({
        value: String(r.id),
        label: r.name,
      })),
    ],
    [restaurants, hasRestaurants],
  );

  const handleSavedRestaurant = (saved) => {
    setRestaurants((prev) => {
      const exists = prev.some((item) => item.id === saved.id);
      if (!exists) return [saved, ...prev];
      return prev.map((item) => (item.id === saved.id ? saved : item));
    });
    setSelectedRestaurantId(saved.id);
    setIsCreating(false);
  };

  const requestDeleteRestaurant = (id) => setDeleteTargetId(id);

  const confirmDeleteRestaurant = async () => {
    if (deleteTargetId == null) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await restaurantsApi.remove(id);
      setRestaurants((prev) => prev.filter((r) => r.id !== id));
      setSelectedRestaurantId((prev) => (prev === id ? null : prev));
    } catch {
      /* silent */
    }
  };

  return (
    <>
      <Navbar />
      <main className={styles.shell}>
        <div className={styles.inner}>
        <h1 className={styles.title}>Кабинет ресторатора</h1>

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

            <div className={styles.workspaceBar}>
              <label className={styles.workspaceLabel} htmlFor="restaurateur-establishment-select">
                Активное заведение
              </label>
              <CustomSelect
                id="restaurateur-establishment-select"
                className={styles.workspaceSelectWrap}
                value={selectedRestaurantId != null ? String(selectedRestaurantId) : ''}
                onChange={(v) => {
                  setSelectedRestaurantId(v ? Number(v) : null);
                  setIsCreating(false);
                }}
                options={establishmentOptions}
                placeholder="Выберите заведение"
                disabled={!hasRestaurants}
                aria-label="Активное заведение"
              />
            </div>

            <div className={styles.content}>
              {activeTab === 0 && (
                <>
                  <div className={styles.pointsHeader}>
                    <h2>Ваши заведения</h2>
                    <button
                      type="button"
                      className={styles.btnAddPoint}
                      onClick={() => {
                        setIsCreating(true);
                        setSelectedRestaurantId(null);
                      }}
                    >
                      + Добавить в гид
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
                            <span>
                              {item.city ? `${item.city} · ` : ''}
                              {item.address}
                            </span>
                          </button>
                          <button
                            type="button"
                            className={styles.pointDelete}
                            onClick={() => requestDeleteRestaurant(item.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isCreating && (
                    <OwnerRestaurantForm
                      restaurant={null}
                      onSaved={handleSavedRestaurant}
                    />
                  )}
                  {!isCreating && selectedRestaurant && (
                    <OwnerRestaurantForm
                      restaurant={selectedRestaurant}
                      onSaved={handleSavedRestaurant}
                    />
                  )}
                  {!isCreating && !selectedRestaurant && (
                    <p className={styles.empty}>
                      Выберите заведение в списке или нажмите «Добавить в гид».
                    </p>
                  )}
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
                <p className={styles.empty}>Добавьте заведение в гид и выберите его в списке</p>
              )}
            </div>
          </>
        )}
        </div>
      </main>

      <ConfirmDialog
        open={deleteTargetId != null}
        title="Удалить заведение"
        message="Заведение будет удалено из гида вместе с привязанными данными, которые допускает сервер. Продолжить?"
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        onConfirm={confirmDeleteRestaurant}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  );
};

export default OwnerPage;
