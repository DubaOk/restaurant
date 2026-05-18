import CustomSelect from '../CustomSelect/CustomSelect';
import styles from './RestaurantFilters.module.css';

const CUISINE_OPTIONS = [
  { value: '', label: 'Все кухни' },
  { value: 'Белорусская', label: 'Белорусская' },
  { value: 'Европейская', label: 'Европейская' },
  { value: 'Итальянская', label: 'Итальянская' },
  { value: 'Японская', label: 'Японская' },
  { value: 'Китайская', label: 'Китайская' },
  { value: 'Грузинская', label: 'Грузинская' },
  { value: 'Американская', label: 'Американская' },
  { value: 'Французская', label: 'Французская' },
];

const RATING_OPTIONS = [
  { value: '', label: 'Любой рейтинг' },
  { value: '3', label: 'От 3★' },
  { value: '4', label: 'От 4★' },
  { value: '4.5', label: 'От 4.5★' },
];

const SORT_BY_OPTIONS = [
  { value: 'name', label: 'По названию' },
  { value: 'avgRating', label: 'По рейтингу' },
  { value: 'createdAt', label: 'По дате добавления' },
];

const SORT_ORDER_OPTIONS = [
  { value: 'asc', label: 'По возрастанию' },
  { value: 'desc', label: 'По убыванию' },
];

const RestaurantFilters = ({ filters, onChange }) => {
  const setField = (name, value) => {
    onChange((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className={styles.filters}>
      <input
        className={styles.search}
        name="search"
        value={filters.search}
        onChange={(e) => setField('search', e.target.value)}
        placeholder="Поиск по названию или адресу..."
      />

      <CustomSelect
        value={filters.cuisine}
        onChange={(v) => setField('cuisine', v)}
        options={CUISINE_OPTIONS}
        placeholder="Все кухни"
        aria-label="Тип кухни"
      />

      <CustomSelect
        value={filters.minRating}
        onChange={(v) => setField('minRating', v)}
        options={RATING_OPTIONS}
        placeholder="Любой рейтинг"
        aria-label="Минимальный рейтинг"
      />

      <CustomSelect
        value={filters.sortBy}
        onChange={(v) => setField('sortBy', v)}
        options={SORT_BY_OPTIONS}
        placeholder="Сортировка"
        aria-label="Сортировка"
      />

      <CustomSelect
        value={filters.sortOrder}
        onChange={(v) => setField('sortOrder', v)}
        options={SORT_ORDER_OPTIONS}
        placeholder="Направление"
        aria-label="Направление сортировки"
      />
    </div>
  );
};

export default RestaurantFilters;
