import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reviewsApi } from '../../api/reviews.api';
import { adminApi } from '../../api/admin.api';
import styles from './ReviewList.module.css';

const ReviewList = ({ reviews: initialReviews, currentUserId, onDeleted, onUpdated }) => {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 5, comment: '' });
  const [saving, setSaving] = useState(false);

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

  const startEdit = (review) => {
    setEditingId(review.id);
    setEditForm({ rating: review.rating, comment: review.comment || '' });
  };

  const handleEditSubmit = async (id) => {
    setSaving(true);
    try {
      const { data } = await reviewsApi.update(id, editForm);
      onUpdated?.(data.data);
      setEditingId(null);
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  if (initialReviews.length === 0) {
    return <p className={styles.empty}>Отзывов пока нет</p>;
  }

  return (
    <ul className={styles.list}>
      {initialReviews.map((review) => (
        <li key={review.id} className={styles.item}>
          {editingId === review.id ? (
            <div className={styles.editForm}>
              <div className={styles.editStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={star <= editForm.rating ? styles.starFilled : styles.star}
                    onClick={() => setEditForm((p) => ({ ...p, rating: star }))}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                className={styles.editTextarea}
                value={editForm.comment}
                onChange={(e) => setEditForm((p) => ({ ...p, comment: e.target.value }))}
                rows={3}
                placeholder="Ваш отзыв..."
              />
              <div className={styles.editActions}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={() => handleEditSubmit(review.id)}
                  disabled={saving}
                >
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  className={styles.cancelEditBtn}
                  onClick={() => setEditingId(null)}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
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
              <div className={styles.actions}>
                {review.userId === currentUserId && (
                  <button className={styles.editBtn} onClick={() => startEdit(review)}>
                    Редактировать
                  </button>
                )}
                {(user?.role === 'ADMIN' || review.userId === currentUserId) && (
                  <button className={styles.deleteBtn} onClick={() => handleDelete(review.id)}>
                    Удалить
                  </button>
                )}
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
};

export default ReviewList;
