import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { restaurantsApi } from '../../api/restaurants.api';
import { reviewsApi } from '../../api/reviews.api';
import { favoritesApi } from '../../api/favorites.api';
import { promotionsApi } from '../../api/promotions.api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar/Navbar';
import ReviewList from '../../components/ReviewList/ReviewList';
import ReviewForm from '../../components/ReviewForm/ReviewForm';
import ReservationForm from '../../components/ReservationForm/ReservationForm';
import PromotionList from '../../components/PromotionList/PromotionList';
import styles from './RestaurantPage.module.css';

const RestaurantPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [restRes, reviewsRes, promoRes] = await Promise.all([
          restaurantsApi.getById(id),
          reviewsApi.getByRestaurant(id),
          promotionsApi.getByRestaurant(id),
        ]);
        setRestaurant(restRes.data.data);
        setReviews(reviewsRes.data.data);
        setPromotions(promoRes.data.data);

        if (user) {
          const favRes = await favoritesApi.getMyFavorites();
          const favIds = favRes.data.data.map((f) => f.restaurantId);
          setIsFavorite(favIds.includes(parseInt(id)));
        }
      } catch {
        setError('Не удалось загрузить данные ресторана');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const toggleFavorite = async () => {
    if (!user) return;
    try {
      if (isFavorite) {
        await favoritesApi.remove(id);
      } else {
        await favoritesApi.add(id);
      }
      setIsFavorite((prev) => !prev);
    } catch {
      /* silent */
    }
  };

  const handleReviewCreated = (newReview) => {
    setReviews((prev) => [newReview, ...prev]);
  };

  if (loading) return <><Navbar /><p className={styles.loading}>Загрузка...</p></>;
  if (error) return <><Navbar /><p className={styles.error}>{error}</p></>;
  if (!restaurant) return null;

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <Link to="/restaurants" className={styles.backLink}>
          ← К списку ресторанов
        </Link>

        <section className={styles.heroSection}>
          {restaurant.imageUrl ? (
            <img src={restaurant.imageUrl} alt={restaurant.name} className={styles.heroImage} />
          ) : (
            <div className={styles.heroImagePlaceholder}>🍽</div>
          )}

          <div className={styles.heroBody}>
            <div className={styles.heroTop}>
              <h1 className={styles.name}>{restaurant.name}</h1>
              <div className={styles.badges}>
                <span className={`${styles.badge} ${styles.badgeCuisine}`}>
                  {restaurant.cuisine || 'Кухня не указана'}
                </span>
                <span className={`${styles.badge} ${styles.badgeRating}`}>
                  ★ {restaurant.avgRating != null ? Number(restaurant.avgRating).toFixed(1) : 'Новый'}
                </span>
              </div>
            </div>

            <div className={styles.meta}>
              <span className={styles.metaItem}>📍 {restaurant.address || 'Адрес уточняется'}</span>
              {restaurant.phone && <span className={styles.metaItem}>📞 {restaurant.phone}</span>}
              {(restaurant.openTime || restaurant.closeTime) && (
                <span className={styles.metaItem}>
                  🕒 {restaurant.openTime || '--:--'} - {restaurant.closeTime || '--:--'}
                </span>
              )}
            </div>

            <p className={styles.description}>
              {restaurant.description || 'Описание ресторана скоро будет добавлено.'}
            </p>

            <div className={styles.heroActions}>
              {user && (
                <button
                  className={`${styles.btnOutline} ${isFavorite ? styles.btnFavActive : ''}`}
                  onClick={toggleFavorite}
                >
                  {isFavorite ? '♥ В избранном' : '♡ В избранное'}
                </button>
              )}
              <a href="#reviews" className={styles.btnPrimary}>
                К отзывам
              </a>
            </div>
          </div>
        </section>

        <div className={styles.content}>
          <div className={styles.mainCol}>
            {user?.role === 'CLIENT' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Бронирование</h2>
                </div>
                <div className={styles.sectionBody}>
                  <ReservationForm restaurantId={id} />
                </div>
              </section>
            )}

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>О ресторане</h2>
              </div>
              <div className={styles.sectionBody}>
                <p>{restaurant.description || 'Описание ресторана скоро будет добавлено.'}</p>
              </div>
            </section>

            <section className={styles.section} id="reviews">
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Отзывы ({reviews.length})</h2>
              </div>
              <div className={styles.sectionBody}>
                {user?.role === 'CLIENT' && (
                  <ReviewForm restaurantId={id} onCreated={handleReviewCreated} />
                )}
                <ReviewList
                  reviews={reviews}
                  currentUserId={user?.id}
                  onDeleted={(rid) => setReviews((prev) => prev.filter((r) => r.id !== rid))}
                />
              </div>
            </section>
          </div>

          <aside className={styles.sideCol}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Информация</h2>
              </div>
              <div className={styles.sectionBody}>
                <ul className={styles.infoList}>
                  <li><strong>Город:</strong> Минск</li>
                  <li><strong>Кухня:</strong> {restaurant.cuisine || 'Не указана'}</li>
                  <li><strong>Адрес:</strong> {restaurant.address || 'Не указан'}</li>
                  {restaurant.phone && <li><strong>Телефон:</strong> {restaurant.phone}</li>}
                </ul>
              </div>
            </section>

            {promotions.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Акции</h2>
                </div>
                <div className={styles.sectionBody}>
                  <PromotionList promotions={promotions} />
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>
    </>
  );
};

export default RestaurantPage;
