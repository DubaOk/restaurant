import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeTableLayouts } from '../../utils/tableFloorLayout';
import { OBJECT_PRESETS } from '../HallEditor/HallEditor';
import styles from './TableFloorPlan.module.css';

const VIEW_W = 1000;
const VIEW_H = 520;
const TEMPLATE_SCHEMES = {
  classic: {
    hallPath: 'M58 82 Q500 18 942 82 L962 170 L930 438 Q500 494 70 438 L38 170 Z',
    entrance: { x1: 430, y1: 448, x2: 570, y2: 448, labelX: 500, labelY: 474, label: 'вход' },
    title: 'схема зала · классика',
  },
  loft: {
    hallPath: 'M54 64 L906 64 L948 124 L926 458 L650 458 L612 416 L196 416 L158 458 L76 458 L32 136 Z',
    entrance: { x1: 90, y1: 458, x2: 210, y2: 458, labelX: 150, labelY: 484, label: 'вход' },
    title: 'схема зала · лофт',
  },
  atrium: {
    hallPath: 'M66 98 Q200 46 346 78 Q500 24 654 78 Q800 46 934 98 L902 432 Q500 486 98 432 Z',
    entrance: { x1: 460, y1: 432, x2: 540, y2: 432, labelX: 500, labelY: 456, label: 'вход' },
    title: 'схема зала · атриум',
  },
  terrace: {
    hallPath: 'M44 110 L700 110 L780 70 L930 70 L930 438 L790 438 L700 398 L44 398 Z',
    entrance: { x1: 820, y1: 70, x2: 900, y2: 70, labelX: 860, labelY: 94, label: 'вход' },
    title: 'схема зала · терраса',
  },
  banquet: {
    hallPath: 'M40 102 L960 102 L960 418 L40 418 Z',
    entrance: { x1: 920, y1: 210, x2: 920, y2: 310, labelX: 870, labelY: 266, label: 'вход' },
    title: 'схема зала · банкетный',
  },
  gallery: {
    hallPath: 'M60 76 L742 76 L820 120 L940 120 L940 444 L820 444 L742 486 L60 486 Z',
    entrance: { x1: 888, y1: 468, x2: 940, y2: 468, labelX: 900, labelY: 492, label: 'вход' },
    title: 'схема зала · галерея',
  },
  'u-shape': {
    hallPath: 'M58 74 L942 74 L942 220 L760 220 L760 360 L242 360 L242 220 L58 220 Z',
    entrance: { x1: 450, y1: 360, x2: 550, y2: 360, labelX: 500, labelY: 384, label: 'вход' },
    title: 'схема зала · u-форма',
  },
  arcade: {
    hallPath: 'M70 130 Q180 54 320 80 Q500 26 680 80 Q820 54 930 130 L930 420 Q500 500 70 420 Z',
    entrance: { x1: 80, y1: 248, x2: 80, y2: 312, labelX: 126, labelY: 286, label: 'вход' },
    title: 'схема зала · аркада',
  },
  amphitheater: {
    hallPath: 'M58 140 Q170 56 320 84 Q500 20 680 84 Q830 56 942 140 L910 430 Q500 506 90 430 Z',
    entrance: { x1: 464, y1: 430, x2: 536, y2: 430, labelX: 500, labelY: 454, label: 'главный вход' },
    title: 'премиум · амфитеатр',
  },
  'private-cabins': {
    hallPath: 'M42 92 L958 92 L958 438 L860 438 L860 370 L700 370 L700 438 L300 438 L300 370 L140 370 L140 438 L42 438 Z',
    entrance: { x1: 920, y1: 92, x2: 958, y2: 92, labelX: 922, labelY: 116, label: 'вход' },
    title: 'премиум · приватные кабинки',
  },
  'island-bar': {
    hallPath: 'M52 86 L948 86 L948 432 L52 432 Z',
    entrance: { x1: 72, y1: 432, x2: 200, y2: 432, labelX: 136, labelY: 456, label: 'вход' },
    title: 'премиум · островной бар',
  },
};

function renderTemplateDecor(templateId) {
  if (templateId === 'island-bar') {
    return (
      <>
        <rect
          x={410}
          y={210}
          width={180}
          height={100}
          rx={22}
          fill="rgba(201,169,98,0.22)"
          stroke="rgba(201,169,98,0.72)"
          strokeWidth="1.5"
          style={{ pointerEvents: 'none' }}
        />
        <text x={500} y={268} textAnchor="middle" className={styles.objLabel}>
          бар
        </text>
      </>
    );
  }

  if (templateId === 'private-cabins') {
    return (
      <>
        <rect x={80} y={130} width={130} height={90} rx={14} fill="rgba(148,100,210,0.22)" stroke="rgba(148,100,210,0.72)" strokeWidth="1.5" />
        <rect x={790} y={130} width={130} height={90} rx={14} fill="rgba(148,100,210,0.22)" stroke="rgba(148,100,210,0.72)" strokeWidth="1.5" />
        <rect x={80} y={252} width={130} height={90} rx={14} fill="rgba(148,100,210,0.22)" stroke="rgba(148,100,210,0.72)" strokeWidth="1.5" />
        <rect x={790} y={252} width={130} height={90} rx={14} fill="rgba(148,100,210,0.22)" stroke="rgba(148,100,210,0.72)" strokeWidth="1.5" />
      </>
    );
  }

  if (templateId === 'amphitheater') {
    return (
      <>
        <path d="M170 340 Q500 430 830 340" stroke="rgba(255,255,255,0.22)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M210 304 Q500 380 790 304" stroke="rgba(255,255,255,0.22)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M250 272 Q500 334 750 272" stroke="rgba(255,255,255,0.22)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    );
  }

  return null;
}

const LABELS = {
  free: 'Свободен',
  booked: 'Занят на это время',
  disabled: 'Недоступен',
  small: 'Мало мест под состав гостей',
  oversized: 'Слишком большой стол для вашего состава',
  overflow: 'Свободен · понадобится дополнительное место',
  unknown: 'Занятость проверится после выбора даты и времени',
};

/** Допустимый запас пустых номинальных мест (синхронно с бэкендом бронирования) */
const nominalPartySlack = (guests) =>
  guests >= 4 ? Math.max(4, Math.ceil(guests * 0.85)) : Math.max(2, Math.ceil(guests / 2));

export function pickStatus(table, guestsCount) {
  if (!table.isAvailable) return 'disabled';
  const cap = Number(table.capacity) || 0;
  const maxCap = Number(table.maxCapacity) || cap;
  const guests = Number(guestsCount) || 0;
  if (guests > maxCap) return 'small';
  if (!table.slotKnown) return 'unknown';
  if (table.occupiedForSlot) return 'booked';
  if (guests <= cap && cap - guests > nominalPartySlack(guests)) return 'oversized';
  if (guests > cap) return 'overflow';
  return 'free';
}

export function canPreselectBookingTable(table, guestsCount, { strict = false } = {}) {
  const st = pickStatus(table, guestsCount);
  if (strict) return st === 'free' || st === 'overflow';
  return st === 'free' || st === 'unknown' || st === 'overflow';
}

export function pickLayoutPreviewStatus(table) {
  return table.isAvailable ? 'free' : 'disabled';
}

/* ─── Parse hallSchema JSON string safely ─────────────────────── */
function parseHallSchema(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed?.templateId && TEMPLATE_SCHEMES[parsed.templateId]) {
      return { type: 'template', templateId: parsed.templateId };
    }
    return parsed?.polygonPoints?.length >= 3 ? { type: 'custom', ...parsed } : null;
  } catch { return null; }
}

function TableFloorPlan({
  tables,
  guestsCount,
  selectedTableId,
  onSelectTable,
  layoutOnly = false,
  bookingStretch = false,
  /** Disable zoom/pan (for booking step) */
  staticMode = false,
  /** Minimum scale (1 = no zoom-out below default fit) */
  minZoomK = 0.52,
  /** JSON string from restaurant.hallSchema */
  hallSchema,
  /** IDs of tables forming a suggested merge group (pulse effect) */
  suggestedPairIds = null,
  /** IDs of tables selected as a merged group (bridge + glow) */
  selectedMergedIds = null,
  /** Combined capacity to show on the merge bridge badge */
  mergedCapacity = null,
  /** Called when user clicks a table that is part of the suggested pair */
  onSelectMergedPair = null,
  /** Require known slot occupancy (no «unknown» tables) */
  strictBooking = false,
}) {
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const viewRef = useRef({ k: 1, px: 0, py: 0 });
  const [view, setView] = useState({ k: 1, px: 0, py: 0 });
  viewRef.current = view;
  const [hoveredId, setHoveredId] = useState(null);
  const [popover, setPopover] = useState(null);

  const layouts = useMemo(() => computeTableLayouts(tables), [tables]);
  const schema = useMemo(() => parseHallSchema(hallSchema), [hallSchema]);

  const closePopover = useCallback(() => setPopover(null), []);

  /* Zoom via wheel — disabled in staticMode */
  useEffect(() => {
    if (staticMode) return undefined;
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.11;
      setView((v) => ({ ...v, k: Math.min(2.8, Math.max(minZoomK, v.k * factor)) }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [staticMode, minZoomK]);

  /* Pan via drag — disabled in staticMode */
  const onPointerDownBackdrop = useCallback((e) => {
    if (staticMode) return;
    if (e.target.closest('g[data-table]')) return;
    const v = viewRef.current;
    dragRef.current = { x: e.clientX, y: e.clientY, px: v.px, py: v.py, k: v.k };
  }, [staticMode]);

  useEffect(() => {
    if (staticMode) return undefined;
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      setView((v) => ({ ...v, px: d.px + dx / d.k, py: d.py + dy / d.k }));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [staticMode]);

  const zoomIn  = () => setView((v) => ({ ...v, k: Math.min(2.8, v.k * 1.15) }));
  const zoomOut = () => setView((v) => ({ ...v, k: Math.max(minZoomK, v.k / 1.15) }));
  const canZoomOut = view.k > minZoomK + 0.001;
  const resetView = () => setView({ k: 1, px: 0, py: 0 });

  const statusForTable = layoutOnly
    ? pickLayoutPreviewStatus
    : (t) => pickStatus(t, guestsCount);

  const suggestedSet  = useMemo(() => new Set(suggestedPairIds  || []), [suggestedPairIds]);
  const mergedSet     = useMemo(() => new Set(selectedMergedIds || []), [selectedMergedIds]);

  const handleTableClick = (ev, layout) => {
    ev.stopPropagation();
    const { table } = layout;
    if (layoutOnly && onSelectTable) onSelectTable(table.id);
    if (!layoutOnly) {
      // If clicking a suggested pair table → trigger merge selection
      if (suggestedSet.has(table.id) && onSelectMergedPair) {
        onSelectMergedPair();
        return;
      }
      if (onSelectTable && canPreselectBookingTable(table, guestsCount, { strict: strictBooking })) {
        onSelectTable(table.id);
      }
    }
  };

  const renderMergeBridge = () => {
    if (!selectedMergedIds || selectedMergedIds.length < 2) return null;
    const selectedLayouts = selectedMergedIds
      .map((id) => layouts.find((l) => l.table.id === id))
      .filter(Boolean);
    if (selectedLayouts.length < 2) return null;

    const points = selectedLayouts.map((l) => ({
      id: l.table.id,
      x: l.x + l.w / 2,
      y: l.y + l.h / 2,
      adj: Array.isArray(l.table.adjacentTableIds) ? l.table.adjacentTableIds : [],
    }));
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

    const bridges = [];
    for (const p1 of points) {
      for (const p2 of points) {
        if (p2.id <= p1.id) continue;
        if (!p1.adj.includes(p2.id) && !p2.adj.includes(p1.id)) continue;
        bridges.push(
          <line
            key={`bridge-${p1.id}-${p2.id}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="rgba(80, 200, 155, 0.22)"
            strokeWidth="18"
            strokeLinecap="round"
          />
        );
      }
    }

    return (
      <g className={styles.mergeBridge}>
        {bridges}
        {/* Capacity badge */}
        <circle cx={cx} cy={cy} r={22}
          fill="rgba(14, 22, 28, 0.85)"
          stroke="rgba(80, 200, 155, 0.75)"
          strokeWidth="1.5"
        />
        <text x={cx} y={cy - 4} textAnchor="middle" className={styles.tableCap} style={{ fontSize: '13px', fill: 'rgba(80,210,160,0.95)' }}>
          {mergedCapacity}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className={styles.tableCapSub} style={{ fontSize: '9px' }}>
          мест
        </text>
      </g>
    );
  };

  const dimOthers = hoveredId != null;

  /* ── Hall outline: custom schema or hardcoded fallback ──────── */
  const renderHallOutline = () => {
    if (schema?.type === 'template') {
      const tpl = TEMPLATE_SCHEMES[schema.templateId];
      return (
        <>
          <path className={styles.hallOutline} d={tpl.hallPath} fill="none" />
          {renderTemplateDecor(schema.templateId)}
          {tpl.entrance && (
            <>
              <line
                x1={tpl.entrance.x1}
                y1={tpl.entrance.y1}
                x2={tpl.entrance.x2}
                y2={tpl.entrance.y2}
                className={styles.entrance}
              />
              <text
                x={tpl.entrance.labelX}
                y={tpl.entrance.labelY}
                textAnchor="middle"
                className={styles.entranceLabel}
              >
                {tpl.entrance.label}
              </text>
            </>
          )}
          <text x={VIEW_W / 2} y={28} textAnchor="middle" className={styles.hallTitle}>
            {tpl.title}
          </text>
        </>
      );
    }

    if (schema?.type === 'custom') {
      const polyPts = schema.polygonPoints.map((p) => `${p.x},${p.y}`).join(' ');
      const ent = schema.entranceLine;
      return (
        <>
          <polygon points={polyPts} className={styles.hallOutline} fill="none" />

          {/* Decorative objects (bar, stage, etc.) */}
          {schema.objects?.map((obj) => {
            const pr = OBJECT_PRESETS[obj.type] || OBJECT_PRESETS.bar;
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
                    className={styles.objLabel}
                  >
                    {obj.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Entrance line */}
          {ent && (
            <>
              <line
                x1={ent.start.x} y1={ent.start.y}
                x2={ent.end.x}   y2={ent.end.y}
                className={styles.entrance}
              />
              <text
                x={(ent.start.x + ent.end.x) / 2}
                y={(ent.start.y + ent.end.y) / 2 + 16}
                textAnchor="middle"
                className={styles.entranceLabel}
              >
                вход
              </text>
            </>
          )}

          <text x={VIEW_W / 2} y={28} textAnchor="middle" className={styles.hallTitle}>
            зона зала · своя схема
          </text>
        </>
      );
    }

    /* Fallback: generic outline */
    return (
      <>
        <path
          className={styles.hallOutline}
          d="M40 72 Q500 38 960 72 L980 488 Q500 442 20 488 Z"
          fill="none"
        />
        <text x={500} y={42} textAnchor="middle" className={styles.hallTitle}>
          зона зала · схема
        </text>
        <line className={styles.entrance} x1={360} y1={488} x2={640} y2={488} />
      </>
    );
  };

  return (
    <div className={`${styles.wrapper} ${bookingStretch ? styles.wrapperBooking : ''}`}>
      <div className={styles.legend}>
        <span className={styles.legendTitle}>{layoutOnly ? 'Схема зала' : 'Подсказка'}</span>
        {layoutOnly ? (
          <>
            <span className={styles.legendItem}><i className={styles.dotFree} /> доступен</span>
            <span className={styles.legendItem}><i className={styles.dotBooked} /> недоступен</span>
            <span className={styles.legendItem}><i className={styles.dotChosen} /> выбран стол</span>
          </>
        ) : (
          <>
            <span className={styles.legendItem}><i className={styles.dotFree} /> свободен</span>
            <span className={styles.legendItem}><i className={styles.dotBooked} /> занят</span>
            <span className={styles.legendItem}><i className={styles.dotOverflow} /> +1 место</span>
            <span className={styles.legendItem}><i className={styles.dotOversized} /> слишком велик</span>
            <span className={styles.legendItem}><i className={styles.dotMerge} /> объединить</span>
            <span className={styles.legendItem}><i className={styles.dotChosen} /> выбран</span>
          </>
        )}
      </div>

      {/* Zoom controls — hidden in staticMode */}
      {!staticMode && (
        <div className={styles.zoomBar}>
          <button
            type="button"
            className={styles.zoomBtn}
            onClick={zoomOut}
            disabled={!canZoomOut}
            aria-label="Уменьшить"
          >
            −
          </button>
          <button type="button" className={styles.zoomBtn} onClick={resetView} aria-label="Сброс">⊙</button>
          <button type="button" className={styles.zoomBtn} onClick={zoomIn} aria-label="Увеличить">+</button>
        </div>
      )}

      <div
        ref={viewportRef}
        className={`${styles.viewport} ${bookingStretch ? styles.viewportBooking : ''} ${dimOthers ? styles.viewportDimPeers : ''}`}
        role="presentation"
        onPointerDown={onPointerDownBackdrop}
        style={{ cursor: staticMode ? 'default' : undefined }}
      >
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="tableGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${view.px}, ${view.py}) scale(${view.k})`}>
            {renderHallOutline()}

            {/* Merge bridge drawn under table shapes */}
            {renderMergeBridge()}

            {layouts.map((layout) => {
              const { table, x, y, w, h, rx } = layout;
              const st = statusForTable(table);
              const selected = selectedTableId === table.id || mergedSet.has(table.id);
              const hovered = hoveredId === table.id;
              const isMerged    = mergedSet.has(table.id);
              const isSuggested = !isMerged && suggestedSet.has(table.id);

              let shapeClass = styles.shapeFree;
              if (isMerged) {
                shapeClass = styles.shapeMerged;
              } else if (isSuggested) {
                shapeClass = styles.shapeSuggested;
              } else if (st === 'booked' || st === 'disabled') {
                shapeClass = styles.shapeBooked;
              } else if (st === 'unknown') {
                shapeClass = styles.shapeUnknown;
              } else if (st === 'small') {
                shapeClass = styles.shapeSmall;
              } else if (st === 'oversized') {
                shapeClass = styles.shapeOversized;
              } else if (st === 'overflow') {
                shapeClass = selected ? styles.shapeSelected : styles.shapeOverflow;
              }

              if (!isMerged && !isSuggested) {
                if (layoutOnly && selected) shapeClass = styles.shapeSelected;
                else if (selected && (st === 'free' || st === 'unknown' || st === 'overflow')) shapeClass = styles.shapeSelected;
              }

              const isClickable = layoutOnly
                || canPreselectBookingTable(table, guestsCount, { strict: strictBooking })
                || suggestedSet.has(table.id);

              return (
                <g
                  key={table.id}
                  data-table={table.id}
                  className={`${styles.tableGroup} ${hovered ? styles.tableHovered : ''} ${dimOthers && hoveredId !== table.id ? styles.peerFade : ''}`}
                  transform={`translate(${x}, ${y})`}
                  style={{ cursor: isClickable ? 'pointer' : 'default' }}
                  onMouseEnter={(ev) => {
                    setHoveredId(table.id);
                    setPopover({
                      id: table.id,
                      screenX: ev.clientX,
                      screenY: ev.clientY,
                      table,
                      st,
                    });
                  }}
                  onMouseMove={(ev) => {
                    setPopover((prev) =>
                      prev?.id === table.id
                        ? { ...prev, screenX: ev.clientX, screenY: ev.clientY }
                        : prev
                    );
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    closePopover();
                  }}
                  onClick={(ev) => handleTableClick(ev, layout)}
                >
                  <rect
                    className={`${styles.tableShape} ${shapeClass}`}
                    width={w} height={h} rx={rx}
                    filter={selected && (layoutOnly || st === 'free' || st === 'unknown' || st === 'overflow' || isMerged) ? 'url(#tableGlow)' : undefined}
                  />
                  <text x={w / 2} y={h / 2 - 6} textAnchor="middle" className={styles.tableCap}>
                    {table.number}
                  </text>
                  <text x={w / 2} y={h / 2 + 12} textAnchor="middle" className={styles.tableCapSub}>
                    до {isMerged ? (table.maxCapacity || table.capacity) : table.capacity}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {popover && (
        <div
          className={styles.popover}
          style={{
            left: Math.min(popover.screenX + 12, typeof window !== 'undefined' ? window.innerWidth - 220 : 0),
            top:  Math.min(popover.screenY + 12, typeof window !== 'undefined' ? window.innerHeight - 160 : 0),
          }}
          role="dialog"
          aria-labelledby="seat-tip-title"
        >
          <p id="seat-tip-title" className={styles.popTitle}>Стол №{popover.table.number}</p>
          <p className={styles.popLine}>До {popover.table.capacity} персон</p>
          <p className={styles.popStatus}>{LABELS[popover.st]}</p>
        </div>
      )}
    </div>
  );
}

export default TableFloorPlan;
