import { useState } from 'react';
import { reviewsApi } from '../../api/reviews.api';
import styles from './ReviewForm.module.css';

const ReviewForm = ({ restaurantId, onCreated }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hovered, setHovered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await reviewsApi.create({ restaurantId: parseInt(restaurantId), rating, comment });
      onCreated(data.data);
      setComment('');
      setRating(5);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка отправки отзыва');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.stars}>
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            className={(hovered || rating) > i ? styles.starFilled : styles.star}
            onMouseEnter={() => setHovered(i + 1)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(i + 1)}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className={styles.textarea}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Напишите ваш отзыв..."
        rows={3}
      />
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className={styles.btn} disabled={loading}>
        {loading ? 'Отправка...' : 'Отправить отзыв'}
      </button>
    </form>
  );
};

export default ReviewForm;
