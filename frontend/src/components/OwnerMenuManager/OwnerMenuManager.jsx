import { useMemo, useState, useEffect } from 'react';
import { menuApi } from '../../api/menu.api';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import ValidatedForm from '../ValidatedForm/ValidatedForm';
import CustomSelect from '../CustomSelect/CustomSelect';
import styles from './OwnerMenuManager.module.css';

const PRESET_CATEGORIES = ['Закуски', 'Салаты', 'Горячее', 'Супы', 'Гарниры', 'Десерты', 'Напитки'];
const CUSTOM_CATEGORY = '__custom__';

const MENU_CATEGORY_OPTIONS = [
  ...PRESET_CATEGORIES.map((c) => ({ value: c, label: c })),
  { value: CUSTOM_CATEGORY, label: 'Своя категория' },
];

const EMPTY_ITEM = {
  name: '',
  description: '',
  price: '',
  category: PRESET_CATEGORIES[0],
  customCategory: '',
  categoryChoice: PRESET_CATEGORIES[0],
  isAvailable: true,
  isRecommended: false,
  image: null,
};

const resolveCategoryFormState = (category) => {
  if (PRESET_CATEGORIES.includes(category)) {
    return { categoryChoice: category, customCategory: '' };
  }
  return { categoryChoice: CUSTOM_CATEGORY, customCategory: category || '' };
};

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
    const categoryState = resolveCategoryFormState(item.category);
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category: item.category,
      ...categoryState,
      isAvailable: item.isAvailable,
      isRecommended: !!item.isRecommended,
      imageUrl: item.imageUrl || '',
      image: null,
    });
  };

  const handleSave = async (id) => {
    setSavingId(id);
    try {
      const category =
        editForm.categoryChoice === CUSTOM_CATEGORY ? editForm.customCategory.trim() : editForm.categoryChoice;
      const payload = {
        name: editForm.name,
        description: editForm.description,
        price: parseFloat(editForm.price),
        category,
        isAvailable: editForm.isAvailable,
        isRecommended: editForm.isRecommended,
        image: editForm.image || undefined,
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
      const category =
        newItem.categoryChoice === CUSTOM_CATEGORY ? newItem.customCategory.trim() : newItem.categoryChoice;
      const payload = {
        restaurantId,
        name: newItem.name,
        description: newItem.description,
        price: parseFloat(newItem.price),
        category,
        isAvailable: newItem.isAvailable,
        isRecommended: newItem.isRecommended,
        image: newItem.image || undefined,
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
                      <CustomSelect
                        className={styles.categorySelect}
                        value={editForm.categoryChoice || PRESET_CATEGORIES[0]}
                        onChange={(categoryChoice) => setEditForm((p) => ({ ...p, categoryChoice }))}
                        options={MENU_CATEGORY_OPTIONS}
                        placeholder="Категория"
                        aria-label="Категория блюда"
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
                    {editForm.categoryChoice === CUSTOM_CATEGORY && (
                      <input
                        className={styles.input}
                        placeholder="Своя категория *"
                        value={editForm.customCategory || ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, customCategory: e.target.value }))}
                        required
                      />
                    )}
                    <textarea
                      className={styles.textarea}
                      placeholder="Описание (необязательно)"
                      value={editForm.description}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    />
                    <div className={styles.fileRow}>
                      {editForm.imageUrl && (
                        <img
                          src={editForm.imageUrl}
                          alt={`${editForm.name || 'Позиция'} фото`}
                          className={styles.previewThumb}
                        />
                      )}
                      <label className={styles.fileLabel}>
                        Обновить фото
                        <input
                          className={styles.fileInput}
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, image: e.target.files?.[0] || null }))
                          }
                        />
                      </label>
                    </div>
                    <label className={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={editForm.isAvailable}
                        onChange={(e) => setEditForm((p) => ({ ...p, isAvailable: e.target.checked }))}
                      />
                      Доступно
                    </label>
                    <label className={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={!!editForm.isRecommended}
                        onChange={(e) => setEditForm((p) => ({ ...p, isRecommended: e.target.checked }))}
                      />
                      Рекомендовать в карточке
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
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={`${item.name} фото`} className={styles.itemThumb} />
                    )}
                    <div className={styles.itemInfo}>
                      <div className={styles.itemTopRow}>
                        <span className={styles.itemName}>{item.name}</span>
                        {item.isRecommended && <span className={styles.recommendedTag}>Рекомендуем</span>}
                      </div>
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

      <ValidatedForm onSubmit={handleAdd} className={styles.addForm}>
        <h4 className={styles.addTitle}>Добавить позицию</h4>
        <div className={styles.addRow}>
          <input
            className={styles.input}
            placeholder="Название *"
            value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <CustomSelect
            className={styles.categorySelect}
            value={newItem.categoryChoice}
            onChange={(categoryChoice) => setNewItem((p) => ({ ...p, categoryChoice }))}
            options={MENU_CATEGORY_OPTIONS}
            placeholder="Категория"
            aria-label="Категория блюда"
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
        {newItem.categoryChoice === CUSTOM_CATEGORY && (
          <input
            className={styles.input}
            placeholder="Своя категория *"
            value={newItem.customCategory}
            onChange={(e) => setNewItem((p) => ({ ...p, customCategory: e.target.value }))}
            required
          />
        )}
        <textarea
          className={styles.textarea}
          placeholder="Описание (необязательно)"
          value={newItem.description}
          onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
        />
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={newItem.isRecommended}
            onChange={(e) => setNewItem((p) => ({ ...p, isRecommended: e.target.checked }))}
          />
          Рекомендовать в карточке ресторана
        </label>
        <div className={styles.fileRow}>
          {newItem.image && <span className={styles.fileName}>{newItem.image.name}</span>}
          <label className={styles.fileLabel}>
            Загрузить фото блюда
            <input
              className={styles.fileInput}
              type="file"
              accept="image/*"
              onChange={(e) => setNewItem((p) => ({ ...p, image: e.target.files?.[0] || null }))}
            />
          </label>
        </div>
        <button type="submit" className={styles.addBtn} disabled={adding}>
          {adding ? 'Добавление...' : '+ Добавить'}
        </button>
      </ValidatedForm>

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
