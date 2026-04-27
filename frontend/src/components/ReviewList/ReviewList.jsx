import { useAuth } from '../../context/AuthContext';
import { reviewsApi } from '../../api/reviews.api';
import { adminApi } from '../../api/admin.api';
import styles from './ReviewList.module.css';

const ReviewList = ({ reviews, currentUserId, onDeleted }) => {
  const { user } = useAuth();

  const handleDelete = async (id) => {
    try {
      if (user?.role === 'ADMIN') {
        await adminApi.deleteReview(id);
      } else {
        await reviewsApi.remove(id);
      }
      onDeleted(id);
    } catch {
      /* silent */
    }
  };

  if (reviews.length === 0) {
    return <p className={styles.empty}>Отзывов пока нет</p>;
  }

  return (
    <ul className={styles.list}>
      {reviews.map((review) => (
        <li key={review.id} className={styles.item}>
          <div className={styles.header}>
            <span className={styles.author}>{review.user?.name || 'Аноним'}</span>
            <div className={styles.stars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < review.rating ? styles.starFilled : styles.star}>
                  ★
                </span>
              ))}
            </div>
            <span className={styles.date}>
              {new Date(review.createdAt).toLocaleDateString('ru-RU')}
            </span>
          </div>
          {review.comment && <p className={styles.comment}>{review.comment}</p>}
          {(user?.role === 'ADMIN' || review.userId === currentUserId) && (
            <button className={styles.deleteBtn} onClick={() => handleDelete(review.id)}>
              Удалить
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

export default ReviewList;
