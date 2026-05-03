import { useCallback, useEffect, useMemo, useState } from 'react';
import { tablesApi } from '../../api/tables.api';
import TableFloorPlan from '../TableFloorPlan/TableFloorPlan';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import styles from './OwnerTablesManager.module.css';

const rowDraft = (t) => ({
  number: t.number,
  capacity: t.capacity,
  isAvailable: t.isAvailable,
});

const OwnerTablesManager = ({ restaurantId }) => {
  const [tables, setTables] = useState([]);
  const [rows, setRows] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newTable, setNewTable] = useState({ number: 1, capacity: 4, isAvailable: true });
  const [tablePendingDelete, setTablePendingDelete] = useState(null);

  const reload = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await tablesApi.getByRestaurant(restaurantId);
      const list = data.data || [];
      setTables(list);
      setRows(Object.fromEntries(list.map((t) => [t.id, rowDraft(t)])));
      setSelectedId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      setError('Не удалось загрузить столики');
      setTables([]);
      setRows({});
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const suggestedNumber = useMemo(() => {
    if (!tables.length) return 1;
    return Math.max(...tables.map((t) => t.number)) + 1;
  }, [tables]);

  useEffect(() => {
    setNewTable((prev) => ({ ...prev, number: suggestedNumber }));
  }, [suggestedNumber, restaurantId]);

  const flushRowFromServer = (t) => {
    setRows((prev) => ({ ...prev, [t.id]: rowDraft(t) }));
  };

  const handleRowChange = (id, patch) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const isRowDirty = (t) => {
    const r = rows[t.id];
    if (!r) return false;
    return (
      Number(r.number) !== t.number ||
      Number(r.capacity) !== t.capacity ||
      Boolean(r.isAvailable) !== Boolean(t.isAvailable)
    );
  };

  const saveRow = async (t) => {
    const r = rows[t.id];
    if (!r) return;
    setSavingId(t.id);
    setError('');
    try {
      const payload = {
        number: Number(r.number),
        capacity: Number(r.capacity),
        isAvailable: Boolean(r.isAvailable),
      };
      const { data } = await tablesApi.update(t.id, payload);
      const updated = data.data;
      setTables((prev) => prev.map((x) => (x.id === updated.id ? { ...updated, slotKnown: false, occupiedForSlot: null } : x)));
      flushRowFromServer({ ...updated, slotKnown: false, occupiedForSlot: null });
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось сохранить стол');
      flushRowFromServer(t);
    } finally {
      setSavingId(null);
    }
  };

  const requestRemoveRow = (t) => setTablePendingDelete(t);

  const confirmRemoveRow = async () => {
    if (!tablePendingDelete) return;
    const t = tablePendingDelete;
    setTablePendingDelete(null);
    setError('');
    try {
      await tablesApi.remove(t.id);
      setSelectedId(null);
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось удалить стол');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const { data } = await tablesApi.create({
        restaurantId: Number(restaurantId),
        number: Number(newTable.number),
        capacity: Number(newTable.capacity),
        isAvailable: Boolean(newTable.isAvailable),
      });
      const created = data.data;
      setTables((prev) => [...prev, { ...created, slotKnown: false, occupiedForSlot: null }].sort((a, b) => a.number - b.number));
      setRows((prev) => ({ ...prev, [created.id]: rowDraft(created) }));
      setSelectedId(created.id);
      setNewTable({
        number: created.number + 1,
        capacity: newTable.capacity,
        isAvailable: true,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось добавить стол');
    } finally {
      setCreating(false);
    }
  };

  const planTables = tables.map((t) => ({
    ...t,
    slotKnown: true,
    occupiedForSlot: false,
  }));

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Столики и схема зала</h2>
      <p className={styles.help}>
        Расстановка столиков на условном плане строится автоматически по номерам и количеству мест. Чтобы изменить состав
        зала, добавляйте, редактируйте или удаляйте столы ниже — клиенты увидят обновление при бронировании.
      </p>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <p className={styles.loading}>Загрузка столиков…</p>}

      {!loading && tables.length > 0 && (
        <>
          <div className={styles.preview}>
            <TableFloorPlan
              tables={planTables}
              guestsCount={1}
              layoutOnly
              selectedTableId={selectedId}
              onSelectTable={(id) => setSelectedId(id)}
            />
          </div>

          <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Мест</th>
                    <th>Доступен</th>
                    <th aria-label="Действия" />
                  </tr>
                </thead>
                <tbody>
                  {tables.map((t) => {
                    const r = rows[t.id] ?? rowDraft(t);
                    const dirty = isRowDirty(t);
                    const active = selectedId === t.id;
                    return (
                      <tr key={t.id} className={active ? styles.selectedRow : ''}>
                        <td>
                          <input
                            className={styles.numInput}
                            type="number"
                            min={1}
                            value={r.number}
                            onChange={(e) => handleRowChange(t.id, { number: e.target.value })}
                            onFocus={() => setSelectedId(t.id)}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.capInput}
                            type="number"
                            min={1}
                            max={50}
                            value={r.capacity}
                            onChange={(e) => handleRowChange(t.id, { capacity: e.target.value })}
                            onFocus={() => setSelectedId(t.id)}
                          />
                        </td>
                        <td>
                          <label className={styles.check}>
                            <input
                              type="checkbox"
                              checked={Boolean(r.isAvailable)}
                              aria-label={`Стол №${t.number}: доступен для бронирования`}
                              onChange={(e) => handleRowChange(t.id, { isAvailable: e.target.checked })}
                              onFocus={() => setSelectedId(t.id)}
                            />
                          </label>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.btnGold}
                              disabled={!dirty || savingId === t.id}
                              onClick={() => saveRow(t)}
                            >
                              {savingId === t.id ? 'Сохранение…' : 'Сохранить'}
                            </button>
                            <button type="button" className={styles.btnGhost} onClick={() => requestRemoveRow(t)}>
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          </div>
        </>
      )}

      {!loading && tables.length === 0 && (
        <p className={styles.empty}>Столов пока нет — добавьте хотя бы один, чтобы клиенты могли бронировать места.</p>
      )}

      <form className={styles.addCard} onSubmit={handleCreate}>
        <h3 className={styles.addTitle}>Добавить стол</h3>
        <div className={styles.addGrid}>
          <div className={styles.field}>
            <label htmlFor="new-table-num">Номер</label>
            <input
              id="new-table-num"
              className={styles.numInput}
              type="number"
              min={1}
              required
              value={newTable.number}
              onChange={(e) => setNewTable((p) => ({ ...p, number: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="new-table-cap">Вместимость</label>
            <input
              id="new-table-cap"
              className={styles.capInput}
              type="number"
              min={1}
              max={50}
              required
              value={newTable.capacity}
              onChange={(e) => setNewTable((p) => ({ ...p, capacity: e.target.value }))}
            />
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={newTable.isAvailable}
              onChange={(e) => setNewTable((p) => ({ ...p, isAvailable: e.target.checked }))}
            />
            участвует в брони
          </label>
          <button type="submit" className={styles.btnGold} disabled={creating || !restaurantId}>
            {creating ? 'Добавление…' : '+ Добавить'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={tablePendingDelete != null}
        title="Удалить стол"
        message={
          tablePendingDelete
            ? `Удалить стол №${tablePendingDelete.number}? Связанные с ним бронирования в базе также будут удалены.`
            : ''
        }
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        onConfirm={confirmRemoveRow}
        onCancel={() => setTablePendingDelete(null)}
      />
    </section>
  );
};

export default OwnerTablesManager;
