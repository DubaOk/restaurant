import { Link } from 'react-router-dom';
import styles from './RestaurantCard.module.css';

const RestaurantCard = ({ restaurant }) => {
  const { id, name, cuisine, address, avgRating, imageUrl, coverImage, images, openTime, closeTime } = restaurant;
  const mainImage = coverImage || images?.[0]?.url || imageUrl;
  const hasRating = avgRating != null;
  const ratingText = hasRating ? Number(avgRating).toFixed(1) : 'Новый';
  const workingHours = openTime && closeTime ? `${openTime} - ${closeTime}` : 'Уточняйте время работы';

  return (
    <Link to={`/restaurants/${id}`} className={styles.card} aria-label={`Открыть ресторан ${name}`}>
      <div
        className={styles.imgWrapper}
        style={mainImage ? { backgroundImage: `url(${mainImage})` } : undefined}
      >
        {!mainImage && <div className={styles.imgPlaceholder}>🍽</div>}
        <div className={styles.imgOverlay} />
        <div className={styles.heroText}>
          <h3 className={styles.name}>{name}</h3>
          <div className={styles.rating} title={hasRating ? 'Средний рейтинг' : 'Ресторан без отзывов'}>
            <span className={styles.star}>★</span>
            <span>{ratingText}</span>
          </div>
        </div>
        <span className={styles.badge}>Минск</span>
      </div>

      <div className={styles.body}>
        <p className={styles.cuisine}>{cuisine || 'Кухня не указана'}</p>
        <p className={styles.address}>{address || 'Адрес уточняется'}</p>
        <p className={styles.hours}>{workingHours}</p>
      </div>

      <div className={styles.footer}>
        <span className={styles.detailsHint}>Подробнее</span>
        <span className={styles.arrow}>→</span>
      </div>
    </Link>
  );
};

export default RestaurantCard;
