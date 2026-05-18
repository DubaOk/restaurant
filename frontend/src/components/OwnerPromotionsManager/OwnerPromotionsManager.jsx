import { useState, useEffect } from 'react';
import { promotionsApi } from '../../api/promotions.api';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import ValidatedForm from '../ValidatedForm/ValidatedForm';
import DatePicker from '../DatePicker/DatePicker';
import styles from './OwnerPromotionsManager.module.css';

const EMPTY_PROMO = { title: '', description: '', startDate: '', endDate: '' };

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('ru-RU') : '—');
const toInputDate = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const isExpired = (promo) => promo.endDate && new Date(promo.endDate) < new Date();

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Минимум для «Конца»: не раньше сегодня и не раньше даты начала */
const minEndDate = (startDate) => {
  const today = todayISO();
  if (!startDate || startDate < today) return today;
  return startDate;
};

const validateDates = (startDate, endDate, originalStartDate = null) => {
  const today = todayISO();
  if (startDate && endDate && endDate < startDate) {
    return 'Дата окончания не может быть раньше даты начала';
  }
  if (startDate && startDate < today && startDate !== originalStartDate) {
    return 'Дата начала не может быть в прошлом';
  }
  if (endDate && endDate < today) {
    return 'Дата окончания не может быть в прошлом';
  }
  return null;
};

const syncDateRange = (prev, patch) => {
  const next = { ...prev, ...patch };
  const today = todayISO();
  if (next.startDate && next.startDate < today) {
    next.startDate = today;
  }
  if (next.startDate && next.endDate && next.endDate < next.startDate) {
    next.endDate = next.startDate;
  }
  if (next.endDate && next.endDate < today) {
    next.endDate = today;
  }
  return next;
};

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
      .getByRestaurantAll(restaurantId)
      .then(({ data }) => setPromos(data.data))
      .catch(() => setError('Не удалось загрузить акции'))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const startEdit = (promo) => {
    setEditingId(promo.id);
    const startDate = toInputDate(promo.startDate);
    setEditForm({
      title: promo.title,
      description: promo.description,
      startDate,
      endDate: toInputDate(promo.endDate),
      originalStartDate: startDate,
    });
  };

  const handleSave = async (id) => {
    const dateErr = validateDates(
      editForm.startDate,
      editForm.endDate,
      editForm.originalStartDate,
    );
    if (dateErr) { setError(dateErr); return; }
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
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка сохранения');
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
    const dateErr = validateDates(newPromo.startDate, newPromo.endDate);
    if (dateErr) { setError(dateErr); return; }
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
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка создания акции');
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
                  <div className={styles.dateField}>
                    <span className={styles.dateLabel}>Начало</span>
                    <DatePicker
                      value={editForm.startDate}
                      min={todayISO()}
                      onChange={(startDate) => setEditForm((p) => syncDateRange(p, { startDate }))}
                      placeholder="Выберите дату"
                    />
                  </div>
                  <div className={styles.dateField}>
                    <span className={styles.dateLabel}>Конец</span>
                    <DatePicker
                      value={editForm.endDate}
                      min={minEndDate(editForm.startDate)}
                      onChange={(endDate) => setEditForm((p) => syncDateRange(p, { endDate }))}
                      placeholder="Выберите дату"
                      popupAlign="end"
                    />
                  </div>
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
                  <div className={styles.promoTitleRow}>
                    <span className={styles.promoTitle}>{promo.title}</span>
                    {isExpired(promo) && (
                      <span className={styles.expiredBadge}>Истекла</span>
                    )}
                  </div>
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

      <ValidatedForm onSubmit={handleAdd} className={styles.addForm}>
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
          <div className={styles.dateField}>
            <span className={styles.dateLabel}>Начало</span>
            <DatePicker
              value={newPromo.startDate}
              min={todayISO()}
              onChange={(startDate) => setNewPromo((p) => syncDateRange(p, { startDate }))}
              placeholder="Выберите дату"
            />
          </div>
          <div className={styles.dateField}>
            <span className={styles.dateLabel}>Конец</span>
            <DatePicker
              value={newPromo.endDate}
              min={minEndDate(newPromo.startDate)}
              onChange={(endDate) => setNewPromo((p) => ({ ...p, endDate }))}
              placeholder="Выберите дату"
              popupAlign="end"
            />
          </div>
        </div>
        <button type="submit" className={styles.addBtn} disabled={adding}>
          {adding ? 'Добавление...' : '+ Добавить'}
        </button>
      </ValidatedForm>

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
