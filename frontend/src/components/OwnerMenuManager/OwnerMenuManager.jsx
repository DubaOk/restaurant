import { useState, useEffect } from 'react';
import { menuApi } from '../../api/menu.api';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import styles from './OwnerMenuManager.module.css';

const EMPTY_ITEM = { name: '', description: '', price: '', category: '', isAvailable: true };

const OwnerMenuManager = ({ restaurantId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    setLoading(true);
    menuApi
      .getByRestaurant(restaurantId)
      .then(({ data }) => setItems(data.data))
      .catch(() => setError('Не удалось загрузить карту блюд'))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category: item.category,
      isAvailable: item.isAvailable,
    });
  };

  const handleSave = async (id) => {
    setSavingId(id);
    try {
      const payload = {
        name: editForm.name,
        description: editForm.description,
        price: parseFloat(editForm.price),
        category: editForm.category,
        isAvailable: editForm.isAvailable,
      };
      const { data } = await menuApi.update(id, payload);
      setItems((prev) => prev.map((i) => (i.id === id ? data.data : i)));
      setEditingId(null);
    } catch {
      /* silent */
    } finally {
      setSavingId(null);
    }
  };

  const requestDelete = (id) => setConfirmDeleteId(id);

  const confirmDelete = async () => {
    if (confirmDeleteId == null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await menuApi.remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
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
        name: newItem.name,
        description: newItem.description,
        price: parseFloat(newItem.price),
        category: newItem.category,
        isAvailable: newItem.isAvailable,
      };
      const { data } = await menuApi.create(payload);
      setItems((prev) => [...prev, data.data]);
      setNewItem(EMPTY_ITEM);
    } catch {
      /* silent */
    } finally {
      setAdding(false);
    }
  };

  const byCategory = items.reduce((acc, item) => {
    const cat = item.category || 'Прочее';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (loading) return <p className={styles.loading}>Загрузка меню...</p>;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Карта блюд и цен</h3>
      {error && <p className={styles.error}>{error}</p>}

      {Object.entries(byCategory).map(([cat, catItems]) => (
        <div key={cat} className={styles.category}>
          <h4 className={styles.catTitle}>{cat}</h4>
          <div className={styles.itemList}>
            {catItems.map((item) => (
              <div key={item.id} className={`${styles.item} ${!item.isAvailable ? styles.unavailable : ''}`}>
                {editingId === item.id ? (
                  <div className={styles.editForm}>
                    <div className={styles.editRow}>
                      <input
                        className={styles.input}
                        placeholder="Название"
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      />
                      <input
                        className={styles.input}
                        placeholder="Категория"
                        value={editForm.category}
                        onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                      />
                      <input
                        className={styles.inputSmall}
                        type="number"
                        step="0.01"
                        placeholder="Цена"
                        value={editForm.price}
                        onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                      />
                    </div>
                    <input
                      className={styles.input}
                      placeholder="Описание (необязательно)"
                      value={editForm.description}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    />
                    <label className={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={editForm.isAvailable}
                        onChange={(e) => setEditForm((p) => ({ ...p, isAvailable: e.target.checked }))}
                      />
                      Доступно
                    </label>
                    <div className={styles.editActions}>
                      <button
                        type="button"
                        className={styles.saveBtn}
                        onClick={() => handleSave(item.id)}
                        disabled={savingId === item.id}
                      >
                        {savingId === item.id ? '...' : 'Сохранить'}
                      </button>
                      <button type="button" className={styles.cancelBtn} onClick={() => setEditingId(null)}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{item.name}</span>
                      {item.description && <span className={styles.itemDesc}>{item.description}</span>}
                      <span className={styles.itemPrice}>
                        {item.price.toFixed(2)}&nbsp;<i className="nbrb-icon">BYN</i>
                      </span>
                      {!item.isAvailable && <span className={styles.itemTag}>Недоступно</span>}
                    </div>
                    <div className={styles.itemActions}>
                      <button type="button" className={styles.editBtn} onClick={() => startEdit(item)}>
                        Изменить
                      </button>
                      <button type="button" className={styles.deleteBtn} onClick={() => requestDelete(item.id)}>
                        Удалить
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && <p className={styles.empty}>Меню пока пустое</p>}

      <form onSubmit={handleAdd} className={styles.addForm}>
        <h4 className={styles.addTitle}>Добавить позицию</h4>
        <div className={styles.addRow}>
          <input
            className={styles.input}
            placeholder="Название *"
            value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className={styles.input}
            placeholder="Категория *"
            value={newItem.category}
            onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
            required
          />
          <input
            className={styles.inputSmall}
            type="number"
            step="0.01"
            placeholder="Цена *"
            value={newItem.price}
            onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))}
            required
          />
        </div>
        <input
          className={styles.input}
          placeholder="Описание (необязательно)"
          value={newItem.description}
          onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
        />
        <button type="submit" className={styles.addBtn} disabled={adding}>
          {adding ? 'Добавление...' : '+ Добавить'}
        </button>
      </form>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Убрать позицию"
        message="Блюдо будет удалено из карты меню. Продолжить?"
        confirmLabel="Убрать"
        cancelLabel="Отмена"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default OwnerMenuManager;
