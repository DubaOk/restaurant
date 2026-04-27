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
        <div className={styles.hero}>
          {restaurant.imageUrl && (
            <img src={restaurant.imageUrl} alt={restaurant.name} className={styles.heroImg} />
          )}
          <div className={styles.heroInfo}>
            <h1>{restaurant.name}</h1>
            <p className={styles.cuisine}>{restaurant.cuisine}</p>
            <p className={styles.address}>{restaurant.address}</p>
            <div className={styles.actions}>
              {user && (
                <button
                  className={`${styles.favBtn} ${isFavorite ? styles.favActive : ''}`}
                  onClick={toggleFavorite}
                >
                  {isFavorite ? '♥ В избранном' : '♡ В избранное'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <h2>О ресторане</h2>
            <p>{restaurant.description}</p>
          </section>

          {promotions.length > 0 && (
            <section className={styles.section}>
              <h2>Акции</h2>
              <PromotionList promotions={promotions} />
            </section>
          )}

          {user?.role === 'CLIENT' && (
            <section className={styles.section}>
              <h2>Забронировать столик</h2>
              <ReservationForm restaurantId={id} />
            </section>
          )}

          <section className={styles.section}>
            <h2>Отзывы ({reviews.length})</h2>
            {user?.role === 'CLIENT' && (
              <ReviewForm restaurantId={id} onCreated={handleReviewCreated} />
            )}
            <ReviewList reviews={reviews} currentUserId={user?.id} onDeleted={(rid) =>
              setReviews((prev) => prev.filter((r) => r.id !== rid))
            } />
          </section>
        </div>
      </main>
    </>
  );
};

export default RestaurantPage;
