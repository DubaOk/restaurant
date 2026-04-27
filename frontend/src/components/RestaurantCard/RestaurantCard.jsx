import { Link } from 'react-router-dom';
import styles from './RestaurantCard.module.css';

const RestaurantCard = ({ restaurant }) => {
  const { id, name, cuisine, address, avgRating, imageUrl } = restaurant;

  return (
    <Link to={`/restaurants/${id}`} className={styles.card}>
      <div className={styles.imgWrapper}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className={styles.img} />
        ) : (
          <div className={styles.imgPlaceholder}>🍽</div>
        )}
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.cuisine}>{cuisine}</p>
        <p className={styles.address}>{address}</p>
        {avgRating != null && (
          <div className={styles.rating}>
            <span className={styles.star}>★</span>
            <span>{Number(avgRating).toFixed(1)}</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default RestaurantCard;
