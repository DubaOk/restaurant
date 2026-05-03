import { useState, useEffect } from 'react';
import { promotionsApi } from '../../api/promotions.api';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import styles from './OwnerPromotionsManager.module.css';

const EMPTY_PROMO = { title: '', description: '', startDate: '', endDate: '' };

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('ru-RU') : '—');
const toInputDate = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

const OwnerPromotionsManager = ({ restaurantId }) => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newPromo, setNewPromo] = useState(EMPTY_PROMO);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    setLoading(true);
    promotionsApi
      .getByRestaurant(restaurantId)
      .then(({ data }) => setPromos(data.data))
      .catch(() => setError('Не удалось загрузить акции'))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const startEdit = (promo) => {
    setEditingId(promo.id);
    setEditForm({
      title: promo.title,
      description: promo.description,
      startDate: toInputDate(promo.startDate),
      endDate: toInputDate(promo.endDate),
    });
  };

  const handleSave = async (id) => {
    setSaving(true);
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : null,
        endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : null,
      };
      const { data } = await promotionsApi.update(id, payload);
      setPromos((prev) => prev.map((p) => (p.id === id ? data.data : p)));
      setEditingId(null);
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (id) => setConfirmDeleteId(id);

  const confirmDelete = async () => {
    if (confirmDeleteId == null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await promotionsApi.remove(id);
      setPromos((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* silent */
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const payload = {
        restaurantId,
        title: newPromo.title,
        description: newPromo.description,
        startDate: newPromo.startDate ? new Date(newPromo.startDate).toISOString() : null,
        endDate: newPromo.endDate ? new Date(newPromo.endDate).toISOString() : null,
      };
      const { data } = await promotionsApi.create(payload);
      setPromos((prev) => [data.data, ...prev]);
      setNewPromo(EMPTY_PROMO);
    } catch {
      /* silent */
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <p className={styles.loading}>Загрузка акций...</p>;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Акции</h3>
      {error && <p className={styles.error}>{error}</p>}

      {promos.length === 0 && <p className={styles.empty}>Акций пока нет</p>}

      <div className={styles.list}>
        {promos.map((promo) => (
          <div key={promo.id} className={styles.item}>
            {editingId === promo.id ? (
              <div className={styles.editForm}>
                <input
                  className={styles.input}
                  placeholder="Название *"
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                />
                <textarea
                  className={styles.textarea}
                  placeholder="Описание *"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                />
                <div className={styles.dateRow}>
                  <label className={styles.dateLabel}>
                    Начало
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={editForm.startDate}
                      onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                    />
                  </label>
                  <label className={styles.dateLabel}>
                    Конец
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={editForm.endDate}
                      onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                    />
                  </label>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={() => handleSave(promo.id)}
                    disabled={saving}
                  >
                    {saving ? '...' : 'Сохранить'}
                  </button>
                  <button type="button" className={styles.cancelBtn} onClick={() => setEditingId(null)}>
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.promoInfo}>
                  <span className={styles.promoTitle}>{promo.title}</span>
                  <span className={styles.promoDesc}>{promo.description}</span>
                  <span className={styles.promoDates}>
                    {fmtDate(promo.startDate)} — {fmtDate(promo.endDate)}
                  </span>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.editBtn} onClick={() => startEdit(promo)}>
                    Изменить
                  </button>
                  <button type="button" className={styles.deleteBtn} onClick={() => requestDelete(promo.id)}>
                    Удалить
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className={styles.addForm}>
        <h4 className={styles.addTitle}>Добавить акцию</h4>
        <input
          className={styles.input}
          placeholder="Название *"
          value={newPromo.title}
          onChange={(e) => setNewPromo((p) => ({ ...p, title: e.target.value }))}
          required
        />
        <textarea
          className={styles.textarea}
          placeholder="Описание *"
          rows={3}
          value={newPromo.description}
          onChange={(e) => setNewPromo((p) => ({ ...p, description: e.target.value }))}
          required
        />
        <div className={styles.dateRow}>
          <label className={styles.dateLabel}>
            Начало
            <input
              type="date"
              className={styles.dateInput}
              value={newPromo.startDate}
              onChange={(e) => setNewPromo((p) => ({ ...p, startDate: e.target.value }))}
            />
          </label>
          <label className={styles.dateLabel}>
            Конец
            <input
              type="date"
              className={styles.dateInput}
              value={newPromo.endDate}
              onChange={(e) => setNewPromo((p) => ({ ...p, endDate: e.target.value }))}
            />
          </label>
        </div>
        <button type="submit" className={styles.addBtn} disabled={adding}>
          {adding ? 'Добавление...' : '+ Добавить'}
        </button>
      </form>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Удалить акцию"
        message="Акция будет удалена и перестанет отображаться гостям. Продолжить?"
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default OwnerPromotionsManager;
