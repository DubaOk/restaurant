import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tablesApi } from '../../api/tables.api';
import { computeTableLayouts } from '../../utils/tableFloorLayout';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import styles from './OwnerTablesManager.module.css';

const SVG_W = 1000;
const SVG_H = 520;

function toSvgCoords(svgEl, clientX, clientY) {
  const rect = svgEl.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * SVG_W,
    y: ((clientY - rect.top) / rect.height) * SVG_H,
  };
}

const rowDraft = (t) => ({
  number: t.number,
  capacity: t.capacity,
  isAvailable: t.isAvailable,
});

const OwnerTablesManager = ({ restaurantId }) => {
  const [tab, setTab] = useState('editor'); // 'editor' | 'list'
  const [tables, setTables] = useState([]);
  const [rows, setRows] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newTable, setNewTable] = useState({ number: 1, capacity: 4, isAvailable: true });
  const [tablePendingDelete, setTablePendingDelete] = useState(null);

  // Drag state for floor editor
  const svgRef = useRef(null);
  const dragRef = useRef(null); // { tableId, offsetX, offsetY }
  const [dragPos, setDragPos] = useState({}); // { [id]: { cx, cy } }

  const reload = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await tablesApi.getByRestaurant(restaurantId);
      const list = data.data || [];
      setTables(list);
      setRows(Object.fromEntries(list.map((t) => [t.id, rowDraft(t)])));
      setDragPos({});
      setSelectedId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        return null;
      });
    } catch {
      setError('Не удалось загрузить столики');
      setTables([]);
      setRows({});
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { reload(); }, [reload]);

  const suggestedNumber = useMemo(() => {
    if (!tables.length) return 1;
    return Math.max(...tables.map((t) => t.number)) + 1;
  }, [tables]);

  useEffect(() => {
    setNewTable((prev) => ({ ...prev, number: suggestedNumber }));
  }, [suggestedNumber, restaurantId]);

  // ─── Drag handlers ────────────────────────────────────────
  const layouts = useMemo(() => {
    const tablesWithDrag = tables.map((t) => {
      const dp = dragPos[t.id];
      return dp ? { ...t, posX: dp.cx, posY: dp.cy } : t;
    });
    return computeTableLayouts(tablesWithDrag);
  }, [tables, dragPos]);

  const handleTablePointerDown = useCallback((e, tableId, cx, cy) => {
    if (tab !== 'editor') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedId(tableId);
    if (!svgRef.current) return;
    const svgPos = toSvgCoords(svgRef.current, e.clientX, e.clientY);
    dragRef.current = { tableId, offsetX: cx - svgPos.x, offsetY: cy - svgPos.y };
  }, [tab]);

  const handleSvgPointerMove = useCallback((e) => {
    if (!dragRef.current || !svgRef.current) return;
    const svgPos = toSvgCoords(svgRef.current, e.clientX, e.clientY);
    const cx = Math.max(55, Math.min(945, svgPos.x + dragRef.current.offsetX));
    const cy = Math.max(55, Math.min(465, svgPos.y + dragRef.current.offsetY));
    setDragPos((prev) => ({ ...prev, [dragRef.current.tableId]: { cx, cy } }));
  }, []);

  const handleSvgPointerUp = useCallback(async () => {
    if (!dragRef.current) return;
    const { tableId } = dragRef.current;
    const pos = dragPos[tableId];
    dragRef.current = null;
    if (pos) {
      try {
        const { data } = await tablesApi.update(tableId, { posX: pos.cx, posY: pos.cy });
        const updated = data.data;
        setTables((prev) => prev.map((t) => (t.id === updated.id ? { ...t, posX: updated.posX, posY: updated.posY } : t)));
      } catch {
        setDragPos((prev) => { const n = { ...prev }; delete n[tableId]; return n; });
      }
    }
  }, [dragPos]);

  const resetPositions = async () => {
    if (!selectedId) return;
    try {
      await tablesApi.update(selectedId, { posX: null, posY: null });
      setTables((prev) => prev.map((t) => (t.id === selectedId ? { ...t, posX: null, posY: null } : t)));
      setDragPos((prev) => { const n = { ...prev }; delete n[selectedId]; return n; });
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось сбросить позицию');
    }
  };

  // ─── Row/table edit (list tab) ────────────────────────────
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
      const { data } = await tablesApi.update(t.id, {
        number: Number(r.number),
        capacity: Number(r.capacity),
        isAvailable: Boolean(r.isAvailable),
      });
      const updated = data.data;
      setTables((prev) =>
        prev.map((x) => (x.id === updated.id ? { ...updated, slotKnown: false, occupiedForSlot: null } : x))
      );
      setRows((prev) => ({ ...prev, [updated.id]: rowDraft(updated) }));
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось сохранить стол');
    } finally {
      setSavingId(null);
    }
  };

  // ─── Selected table row edit (editor panel) ───────────────
  const selectedTable = tables.find((t) => t.id === selectedId);
  const selectedRow = selectedId ? rows[selectedId] : null;

  const saveSelectedPanel = async () => {
    if (!selectedTable || !selectedRow) return;
    setSavingId(selectedId);
    setError('');
    try {
      const { data } = await tablesApi.update(selectedId, {
        number: Number(selectedRow.number),
        capacity: Number(selectedRow.capacity),
        isAvailable: Boolean(selectedRow.isAvailable),
      });
      const updated = data.data;
      setTables((prev) =>
        prev.map((x) => (x.id === updated.id ? { ...updated, slotKnown: false, occupiedForSlot: null } : x))
      );
      setRows((prev) => ({ ...prev, [updated.id]: rowDraft(updated) }));
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось сохранить');
    } finally {
      setSavingId(null);
    }
  };

  const isSelectedDirty = () => {
    if (!selectedTable || !selectedRow) return false;
    return (
      Number(selectedRow.number) !== selectedTable.number ||
      Number(selectedRow.capacity) !== selectedTable.capacity ||
      Boolean(selectedRow.isAvailable) !== Boolean(selectedTable.isAvailable)
    );
  };

  // ─── Create ───────────────────────────────────────────────
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
      setTables((prev) =>
        [...prev, { ...created, slotKnown: false, occupiedForSlot: null }].sort((a, b) => a.number - b.number)
      );
      setRows((prev) => ({ ...prev, [created.id]: rowDraft(created) }));
      setSelectedId(created.id);
      setNewTable((prev) => ({ number: created.number + 1, capacity: prev.capacity, isAvailable: true }));
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось добавить стол');
    } finally {
      setCreating(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────
  const confirmRemove = async () => {
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

  // ─── Render ───────────────────────────────────────────────
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.title}>Столики и схема зала</h2>
        <div className={styles.tabSwitch}>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'editor' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('editor')}
          >
            Схема зала
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'list' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('list')}
          >
            Список столов
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <p className={styles.loading}>Загрузка столиков…</p>}

      {/* ── Floor Editor tab ─────────────────────────────────── */}
      {tab === 'editor' && !loading && (
        <div className={styles.editorLayout}>
          <div className={styles.editorCanvas}>
            <p className={styles.editorHint}>
              Перетащите столики, чтобы разместить их в зале. Позиция сохраняется автоматически при отпускании.
            </p>
            {tables.length === 0 ? (
              <div className={styles.emptyCanvas}>
                Столов пока нет — добавьте первый ниже
              </div>
            ) : (
              <svg
                ref={svgRef}
                className={styles.editorSvg}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                xmlns="http://www.w3.org/2000/svg"
                onPointerMove={handleSvgPointerMove}
                onPointerUp={handleSvgPointerUp}
              >
                <defs>
                  <filter id="editorGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="5" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                <path
                  className={styles.editorHall}
                  d="M40 72 Q500 38 960 72 L980 488 Q500 442 20 488 Z"
                  fill="none"
                />
                <text x={500} y={42} textAnchor="middle" className={styles.editorHallTitle}>
                  схема зала · редактор расстановки
                </text>
                <line className={styles.editorEntrance} x1={360} y1={488} x2={640} y2={488} />
                <text x={500} y={508} textAnchor="middle" className={styles.editorEntranceLabel}>вход</text>

                {layouts.map((layout) => {
                  const { table, x, y, w, h, rx, cx, cy } = layout;
                  const isSelected = selectedId === table.id;
                  const isDragging = Boolean(dragRef.current?.tableId === table.id);
                  return (
                    <g
                      key={table.id}
                      transform={`translate(${x}, ${y})`}
                      className={`${styles.editorTable} ${isSelected ? styles.editorTableSelected : ''} ${isDragging ? styles.editorTableDragging : ''}`}
                      onPointerDown={(e) => handleTablePointerDown(e, table.id, cx, cy)}
                      style={{ cursor: 'grab' }}
                    >
                      <rect
                        width={w}
                        height={h}
                        rx={rx}
                        className={`${styles.editorTableRect} ${isSelected ? styles.editorTableRectSelected : ''} ${!table.isAvailable ? styles.editorTableRectDisabled : ''}`}
                        filter={isSelected ? 'url(#editorGlow)' : undefined}
                      />
                      <text x={w / 2} y={h / 2 - 6} textAnchor="middle" className={styles.editorTableNum}>
                        {table.number}
                      </text>
                      <text x={w / 2} y={h / 2 + 12} textAnchor="middle" className={styles.editorTableCap}>
                        до {table.capacity}
                      </text>
                      {!table.isAvailable && (
                        <text x={w / 2} y={h / 2 + 26} textAnchor="middle" className={styles.editorTableDisabledLabel}>
                          ✕
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Right panel */}
          <div className={styles.editorPanel}>
            {selectedTable && selectedRow ? (
              <>
                <h4 className={styles.panelTitle}>Стол №{selectedTable.number}</h4>
                <div className={styles.panelField}>
                  <label className={styles.panelLabel}>Номер</label>
                  <input
                    className={styles.panelInput}
                    type="number"
                    min={1}
                    value={selectedRow.number}
                    onChange={(e) => handleRowChange(selectedId, { number: e.target.value })}
                  />
                </div>
                <div className={styles.panelField}>
                  <label className={styles.panelLabel}>Вместимость</label>
                  <input
                    className={styles.panelInput}
                    type="number"
                    min={1}
                    max={50}
                    value={selectedRow.capacity}
                    onChange={(e) => handleRowChange(selectedId, { capacity: e.target.value })}
                  />
                </div>
                <label className={styles.panelCheck}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedRow.isAvailable)}
                    onChange={(e) => handleRowChange(selectedId, { isAvailable: e.target.checked })}
                  />
                  Доступен для брони
                </label>

                <div className={styles.panelActions}>
                  <button
                    type="button"
                    className={styles.btnGold}
                    disabled={!isSelectedDirty() || savingId === selectedId}
                    onClick={saveSelectedPanel}
                  >
                    {savingId === selectedId ? 'Сохр…' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={resetPositions}
                    title="Сбросить позицию на схеме до авто"
                  >
                    ↺ Авто
                  </button>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => setTablePendingDelete(selectedTable)}
                  >
                    Удалить
                  </button>
                </div>

                <p className={styles.panelHint}>
                  {selectedTable.posX != null
                    ? `Позиция: ${Math.round(selectedTable.posX)}, ${Math.round(selectedTable.posY)}`
                    : 'Позиция: авто'}
                </p>
              </>
            ) : (
              <p className={styles.panelPlaceholder}>
                Нажмите на столик в схеме, чтобы выбрать его и настроить параметры.
              </p>
            )}

            <div className={styles.panelDivider} />

            <form className={styles.addCard} onSubmit={handleCreate}>
              <h4 className={styles.addTitle}>+ Добавить стол</h4>
              <div className={styles.addGrid}>
                <div className={styles.panelField}>
                  <label className={styles.panelLabel}>Номер</label>
                  <input
                    className={styles.panelInput}
                    type="number"
                    min={1}
                    required
                    value={newTable.number}
                    onChange={(e) => setNewTable((p) => ({ ...p, number: e.target.value }))}
                  />
                </div>
                <div className={styles.panelField}>
                  <label className={styles.panelLabel}>Мест</label>
                  <input
                    className={styles.panelInput}
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={newTable.capacity}
                    onChange={(e) => setNewTable((p) => ({ ...p, capacity: e.target.value }))}
                  />
                </div>
              </div>
              <label className={styles.panelCheck}>
                <input
                  type="checkbox"
                  checked={newTable.isAvailable}
                  onChange={(e) => setNewTable((p) => ({ ...p, isAvailable: e.target.checked }))}
                />
                Участвует в брони
              </label>
              <button
                type="submit"
                className={styles.btnGold}
                disabled={creating || !restaurantId}
              >
                {creating ? 'Добавление…' : 'Добавить'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── List tab ─────────────────────────────────────────── */}
      {tab === 'list' && !loading && (
        <>
          {tables.length === 0 ? (
            <p className={styles.empty}>Столов пока нет — добавьте хотя бы один.</p>
          ) : (
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
                              aria-label={`Стол №${t.number}: доступен`}
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
                              {savingId === t.id ? 'Сохр…' : 'Сохранить'}
                            </button>
                            <button
                              type="button"
                              className={styles.btnGhost}
                              onClick={() => setTablePendingDelete(t)}
                            >
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
              <button
                type="submit"
                className={styles.btnGold}
                disabled={creating || !restaurantId}
              >
                {creating ? 'Добавление…' : '+ Добавить'}
              </button>
            </div>
          </form>
        </>
      )}

      <ConfirmDialog
        open={tablePendingDelete != null}
        title="Удалить стол"
        message={
          tablePendingDelete
            ? `Удалить стол №${tablePendingDelete.number}? Связанные бронирования также будут удалены.`
            : ''
        }
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        onConfirm={confirmRemove}
        onCancel={() => setTablePendingDelete(null)}
      />
    </section>
  );
};

export default OwnerTablesManager;
