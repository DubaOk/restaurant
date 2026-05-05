import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tablesApi } from '../../api/tables.api';
import { restaurantsApi } from '../../api/restaurants.api';
import { computeTableLayouts } from '../../utils/tableFloorLayout';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import HallEditor, { OBJECT_PRESETS } from '../HallEditor/HallEditor';
import styles from './OwnerTablesManager.module.css';

const SVG_W = 1000;
const SVG_H = 520;
const SCHEME_STORAGE_PREFIX = 'owner-floor-scheme';
const HALL_SCHEMA_KEY = (id) => `hall_schema_${id}`;

const FLOOR_SCHEMES = [
  {
    id: 'classic',
    name: 'Классика',
    hallPath: 'M58 82 Q500 18 942 82 L962 170 L930 438 Q500 494 70 438 L38 170 Z',
    entrance: { x1: 430, y1: 448, x2: 570, y2: 448, labelX: 500, labelY: 474, label: 'вход' },
    title: 'схема зала · классика',
  },
  {
    id: 'loft',
    name: 'Лофт',
    hallPath: 'M54 64 L906 64 L948 124 L926 458 L650 458 L612 416 L196 416 L158 458 L76 458 L32 136 Z',
    entrance: { x1: 90, y1: 458, x2: 210, y2: 458, labelX: 150, labelY: 484, label: 'вход' },
    title: 'схема зала · лофт',
  },
  {
    id: 'atrium',
    name: 'Атриум',
    hallPath: 'M66 98 Q200 46 346 78 Q500 24 654 78 Q800 46 934 98 L902 432 Q500 486 98 432 Z',
    entrance: { x1: 460, y1: 432, x2: 540, y2: 432, labelX: 500, labelY: 456, label: 'вход' },
    title: 'схема зала · атриум',
  },
  {
    id: 'terrace',
    name: 'Терраса',
    hallPath: 'M44 110 L700 110 L780 70 L930 70 L930 438 L790 438 L700 398 L44 398 Z',
    entrance: { x1: 820, y1: 70, x2: 900, y2: 70, labelX: 860, labelY: 94, label: 'вход' },
    title: 'схема зала · терраса',
  },
  {
    id: 'banquet',
    name: 'Банкет',
    hallPath: 'M40 102 L960 102 L960 418 L40 418 Z',
    entrance: { x1: 920, y1: 210, x2: 920, y2: 310, labelX: 870, labelY: 266, label: 'вход' },
    title: 'схема зала · банкетный',
  },
  {
    id: 'gallery',
    name: 'Галерея',
    hallPath: 'M60 76 L742 76 L820 120 L940 120 L940 444 L820 444 L742 486 L60 486 Z',
    entrance: { x1: 888, y1: 468, x2: 940, y2: 468, labelX: 900, labelY: 492, label: 'вход' },
    title: 'схема зала · галерея',
  },
  {
    id: 'u-shape',
    name: 'U-форма',
    hallPath: 'M58 74 L942 74 L942 220 L760 220 L760 360 L242 360 L242 220 L58 220 Z',
    entrance: { x1: 450, y1: 360, x2: 550, y2: 360, labelX: 500, labelY: 384, label: 'вход' },
    title: 'схема зала · u-форма',
  },
  {
    id: 'arcade',
    name: 'Аркада',
    hallPath: 'M70 130 Q180 54 320 80 Q500 26 680 80 Q820 54 930 130 L930 420 Q500 500 70 420 Z',
    entrance: { x1: 80, y1: 248, x2: 80, y2: 312, labelX: 126, labelY: 286, label: 'вход' },
    title: 'схема зала · аркада',
  },
  {
    id: 'amphitheater',
    name: 'Премиум · Амфитеатр',
    hallPath: 'M58 140 Q170 56 320 84 Q500 20 680 84 Q830 56 942 140 L910 430 Q500 506 90 430 Z',
    entrance: { x1: 464, y1: 430, x2: 536, y2: 430, labelX: 500, labelY: 454, label: 'главный вход' },
    title: 'премиум · амфитеатр',
  },
  {
    id: 'private-cabins',
    name: 'Премиум · Кабинки',
    hallPath: 'M42 92 L958 92 L958 438 L860 438 L860 370 L700 370 L700 438 L300 438 L300 370 L140 370 L140 438 L42 438 Z',
    entrance: { x1: 920, y1: 92, x2: 958, y2: 92, labelX: 922, labelY: 116, label: 'вход' },
    title: 'премиум · приватные кабинки',
  },
  {
    id: 'island-bar',
    name: 'Премиум · Островной бар',
    hallPath: 'M52 86 L948 86 L948 432 L52 432 Z',
    entrance: { x1: 72, y1: 432, x2: 200, y2: 432, labelX: 136, labelY: 456, label: 'вход' },
    title: 'премиум · островной бар',
  },
];

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
  const [tab, setTab] = useState('editor');
  const [tables, setTables] = useState([]);
  const [rows, setRows] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newTable, setNewTable] = useState({ number: 1, capacity: 4, isAvailable: true });
  const [tablePendingDelete, setTablePendingDelete] = useState(null);
  const [schemeId, setSchemeId] = useState(FLOOR_SCHEMES[0].id);

  // Custom hall: schema loaded from localStorage via HallEditor's own key
  const [customSchema, setCustomSchema] = useState(null); // { polygonPoints, entranceLine }
  // Whether the HallEditor is currently visible (editing custom hall shape)
  const [editingHall, setEditingHall] = useState(false);

  const svgRef = useRef(null);
  const dragRef = useRef(null); // { tableId, offsetX, offsetY, cx, cy }
  const [dragPos, setDragPos] = useState({});

  // ─── Load tables ──────────────────────────────────────────────
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

  // ─── Load saved scheme id ─────────────────────────────────────
  useEffect(() => {
    const key = `${SCHEME_STORAGE_PREFIX}:${restaurantId}`;
    const saved = localStorage.getItem(key);
    const validIds = [...FLOOR_SCHEMES.map((s) => s.id), 'custom'];
    setSchemeId(saved && validIds.includes(saved) ? saved : FLOOR_SCHEMES[0].id);
    setEditingHall(false);
  }, [restaurantId]);

  // ─── Load custom hall schema & sync to backend ───────────────
  useEffect(() => {
    if (!restaurantId) return;
    try {
      const raw = localStorage.getItem(HALL_SCHEMA_KEY(restaurantId));
      const parsed = raw ? JSON.parse(raw) : null;
      setCustomSchema(parsed);
      // Sync to DB so clients see the custom schema
      if (parsed?.polygonPoints?.length >= 3) {
        restaurantsApi.updateHallSchema(restaurantId, raw).catch(() => {});
      }
    } catch {
      setCustomSchema(null);
    }
  }, [restaurantId]);

  // ─── Suggested new table number ───────────────────────────────
  const suggestedNumber = useMemo(() => {
    if (!tables.length) return 1;
    return Math.max(...tables.map((t) => t.number)) + 1;
  }, [tables]);

  useEffect(() => {
    setNewTable((prev) => ({ ...prev, number: suggestedNumber }));
  }, [suggestedNumber, restaurantId]);

  // ─── Selected scheme (with custom support) ────────────────────
  const selectedScheme = useMemo(() => {
    if (schemeId === 'custom') {
      const ent = customSchema?.entranceLine;
      return {
        id: 'custom',
        hallPath: null,
        entrance: ent
          ? {
              x1: ent.start.x, y1: ent.start.y,
              x2: ent.end.x,   y2: ent.end.y,
              labelX: Math.round((ent.start.x + ent.end.x) / 2),
              labelY: Math.round((ent.start.y + ent.end.y) / 2) + 18,
              label: 'вход',
            }
          : null,
        title: 'схема зала · свой',
      };
    }
    return FLOOR_SCHEMES.find((s) => s.id === schemeId) || FLOOR_SCHEMES[0];
  }, [schemeId, customSchema]);

  const renderSchemeDecor = () => {
    if (selectedScheme.id === 'island-bar') {
      return (
        <>
          <rect x={410} y={210} width={180} height={100} rx={22} className={styles.editorDecorIsland} />
          <text x={500} y={268} textAnchor="middle" className={styles.editorDecorLabel}>бар</text>
        </>
      );
    }
    if (selectedScheme.id === 'private-cabins') {
      return (
        <>
          <rect x={80} y={130} width={130} height={90} rx={14} className={styles.editorDecorCabin} />
          <rect x={790} y={130} width={130} height={90} rx={14} className={styles.editorDecorCabin} />
          <rect x={80} y={252} width={130} height={90} rx={14} className={styles.editorDecorCabin} />
          <rect x={790} y={252} width={130} height={90} rx={14} className={styles.editorDecorCabin} />
        </>
      );
    }
    if (selectedScheme.id === 'amphitheater') {
      return (
        <>
          <path d="M170 340 Q500 430 830 340" className={styles.editorDecorArc} />
          <path d="M210 304 Q500 380 790 304" className={styles.editorDecorArc} />
          <path d="M250 272 Q500 334 750 272" className={styles.editorDecorArc} />
        </>
      );
    }
    return null;
  };

  const handleSchemeChange = (nextId) => {
    setSchemeId(nextId);
    if (nextId === 'custom') {
      setEditingHall(!(customSchema?.polygonPoints?.length >= 3));
      if (customSchema?.polygonPoints?.length >= 3) {
        restaurantsApi.updateHallSchema(restaurantId, JSON.stringify(customSchema)).catch(() => {});
      }
    } else {
      setEditingHall(false);
      restaurantsApi
        .updateHallSchema(restaurantId, JSON.stringify({ templateId: nextId }))
        .catch(() => {});
    }
    localStorage.setItem(`${SCHEME_STORAGE_PREFIX}:${restaurantId}`, nextId);
  };

  // ─── Drag (fix: position stored in dragRef, not dragPos closure) ─
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
    dragRef.current = {
      tableId,
      offsetX: cx - svgPos.x,
      offsetY: cy - svgPos.y,
      cx,
      cy,
    };
  }, [tab]);

  const handleSvgPointerMove = useCallback((e) => {
    if (!dragRef.current || !svgRef.current) return;
    const svgPos = toSvgCoords(svgRef.current, e.clientX, e.clientY);
    const cx = Math.max(55, Math.min(945, svgPos.x + dragRef.current.offsetX));
    const cy = Math.max(55, Math.min(465, svgPos.y + dragRef.current.offsetY));
    dragRef.current.cx = cx;
    dragRef.current.cy = cy;
    const id = dragRef.current.tableId;
    setDragPos((prev) => ({ ...prev, [id]: { cx, cy } }));
  }, []);

  const handleSvgPointerUp = useCallback(async () => {
    if (!dragRef.current) return;
    const { tableId, cx, cy } = dragRef.current;
    dragRef.current = null;
    setDragPos((prev) => { const n = { ...prev }; delete n[tableId]; return n; });
    setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, posX: cx, posY: cy } : t)));
    try {
      const { data } = await tablesApi.update(tableId, { posX: cx, posY: cy });
      if (data?.data) {
        const updated = data.data;
        setTables((prev) => prev.map((t) => (t.id === updated.id ? { ...t, posX: updated.posX, posY: updated.posY } : t)));
      }
    } catch {
      reload();
    }
  }, [reload]);

  const cancelDrag = useCallback(() => {
    if (!dragRef.current) return;
    const { tableId } = dragRef.current;
    dragRef.current = null;
    setDragPos((prev) => { const n = { ...prev }; delete n[tableId]; return n; });
  }, []);

  // ─── Hall modal close ─────────────────────────────────────────
  const handleModalClose = useCallback(() => {
    setEditingHall(false);
    // Re-read schema from localStorage in case HallEditor auto-saved changes
    try {
      const raw = localStorage.getItem(HALL_SCHEMA_KEY(restaurantId));
      const parsed = raw ? JSON.parse(raw) : null;
      setCustomSchema(parsed);
      if (parsed?.polygonPoints?.length >= 3) {
        restaurantsApi.updateHallSchema(restaurantId, raw).catch(() => {});
      }
    } catch { /* silent */ }
  }, [restaurantId]);

  // ESC key closes the modal
  useEffect(() => {
    if (!editingHall) return;
    const onKey = (e) => { if (e.key === 'Escape') handleModalClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingHall, handleModalClose]);

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

  // ─── Row / table edit (list tab) ──────────────────────────────
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

  // ─── Selected table panel ─────────────────────────────────────
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

  // ─── Create ───────────────────────────────────────────────────
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

  // ─── Delete ───────────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────
  const allSchemes = [...FLOOR_SCHEMES, { id: 'custom', name: '✏ Свой' }];

  const customPolygon = customSchema?.polygonPoints?.length >= 3
    ? customSchema.polygonPoints
    : null;

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

            {/* Scheme selector */}
            <div className={styles.schemeBar}>
              <span className={styles.schemeLabel}>Шаблон схемы:</span>
              <div className={styles.schemeChips}>
                {allSchemes.map((scheme) => (
                  <button
                    key={scheme.id}
                    type="button"
                    className={`${styles.schemeChip} ${scheme.id === schemeId ? styles.schemeChipActive : ''}`}
                    onClick={() => handleSchemeChange(scheme.id)}
                  >
                    {scheme.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom scheme: "Edit hall" button */}
            {schemeId === 'custom' && (
              <div className={styles.customToolbar}>
                {customPolygon ? (
                  <button
                    type="button"
                    className={styles.schemeChip}
                    onClick={() => setEditingHall(true)}
                  >
                    ✏ Редактировать зал
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.btnGold}
                    onClick={() => setEditingHall(true)}
                  >
                    ✏ Нарисовать форму зала
                  </button>
                )}
              </div>
            )}

            {/* SVG canvas — always visible (HallEditor opens as modal) */}
            <p className={styles.editorHint}>
              Перетащите столики, чтобы разместить их в зале. Позиция сохраняется автоматически при отпускании.
            </p>

            {tables.length === 0 ? (
              <div className={styles.emptyCanvas}>
                Столов пока нет — добавьте первый в панели справа
              </div>
            ) : (
              <svg
                ref={svgRef}
                className={styles.editorSvg}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                xmlns="http://www.w3.org/2000/svg"
                onPointerMove={handleSvgPointerMove}
                onPointerUp={handleSvgPointerUp}
                onPointerCancel={cancelDrag}
              >
                <defs>
                  <filter id="editorGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="5" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Hall outline */}
                {schemeId === 'custom' && customPolygon ? (
                  <polygon
                    points={customPolygon.map((p) => `${p.x},${p.y}`).join(' ')}
                    className={styles.editorHall}
                    fill="none"
                  />
                ) : selectedScheme.hallPath ? (
                  <path className={styles.editorHall} d={selectedScheme.hallPath} fill="none" />
                ) : (
                  <rect x={56} y={88} width={888} height={376} rx={20} className={styles.editorHallPlaceholder} />
                )}

                {/* Custom schema objects (bar, stage, etc.) */}
                {schemeId === 'custom' && customSchema?.objects?.map((obj) => {
                  const pr = OBJECT_PRESETS[obj.type];
                  if (!pr) return null;
                  return (
                    <g key={obj.id} style={{ pointerEvents: 'none' }}>
                      <rect
                        x={obj.x - obj.w / 2} y={obj.y - obj.h / 2}
                        width={obj.w} height={obj.h} rx={obj.rx}
                        fill={pr.fill} stroke={pr.stroke} strokeWidth="1.5"
                      />
                      {obj.label && (
                        <text
                          x={obj.x} y={obj.y}
                          textAnchor="middle" dominantBaseline="middle"
                          className={styles.editorDecorLabel}
                        >
                          {obj.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {renderSchemeDecor()}

                <text x={500} y={42} textAnchor="middle" className={styles.editorHallTitle}>
                  {selectedScheme.title}
                </text>

                {/* Entrance */}
                {selectedScheme.entrance && (
                  <>
                    <line
                      className={styles.editorEntrance}
                      x1={selectedScheme.entrance.x1} y1={selectedScheme.entrance.y1}
                      x2={selectedScheme.entrance.x2} y2={selectedScheme.entrance.y2}
                    />
                    <text
                      x={selectedScheme.entrance.labelX} y={selectedScheme.entrance.labelY}
                      textAnchor="middle" className={styles.editorEntranceLabel}
                    >
                      {selectedScheme.entrance.label}
                    </text>
                  </>
                )}

                {/* Tables */}
                {layouts.map((layout) => {
                  const { table, x, y, w, h, rx, cx, cy } = layout;
                  const isSelected = selectedId === table.id;
                  const isDragging = Boolean(dragPos[table.id]);
                  return (
                    <g
                      key={table.id}
                      transform={`translate(${x}, ${y})`}
                      className={`${styles.editorTable} ${isSelected ? styles.editorTableSelected : ''} ${isDragging ? styles.editorTableDragging : ''}`}
                      onPointerDown={(e) => handleTablePointerDown(e, table.id, cx, cy)}
                      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                      <rect
                        width={w} height={h} rx={rx}
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

            {/* ── Hall Editor modal ────────────────────────────────── */}
            {editingHall && (
              <div className={styles.hallModal}>
                <div className={styles.hallModalBackdrop} onClick={handleModalClose} />
                <div className={styles.hallModalBox}>
                  <div className={styles.hallModalHeader}>
                    <span className={styles.hallModalTitle}>Редактор схемы зала</span>
                    <button type="button" className={styles.hallModalClose} onClick={handleModalClose}>✕</button>
                  </div>
                  <HallEditor
                    restaurantId={restaurantId}
                    onDone={(schema) => {
                      setCustomSchema(schema);
                      setEditingHall(false);
                      // Persist schema to backend so clients can see the custom hall
                      restaurantsApi.updateHallSchema(restaurantId, JSON.stringify(schema)).catch(() => {});
                    }}
                  />
                </div>
              </div>
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
