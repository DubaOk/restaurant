import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeTableLayouts } from '../../utils/tableFloorLayout';
import styles from './TableFloorPlan.module.css';

const VIEW_W = 1000;
const VIEW_H = 520;

/* ─── Object presets (same palette as HallEditor) ────────────── */
const OBJ_PRESETS = {
  bar:        { fill: 'rgba(201,169,98,0.22)',  stroke: 'rgba(201,169,98,0.72)'  },
  stage:      { fill: 'rgba(148,100,210,0.22)', stroke: 'rgba(148,100,210,0.72)' },
  dancefloor: { fill: 'rgba(72,180,160,0.22)',  stroke: 'rgba(72,180,160,0.72)'  },
  pillar:     { fill: 'rgba(120,132,150,0.45)', stroke: 'rgba(140,152,172,0.85)' },
};

const LABELS = {
  free: 'Свободен',
  booked: 'Занят на это время',
  disabled: 'Недоступен',
  small: 'Мало мест под состав гостей',
  unknown: 'Занятость проверится после выбора даты и времени',
};

export function pickStatus(table, guestsCount) {
  if (!table.isAvailable) return 'disabled';
  const cap = Number(table.capacity) || 0;
  const guests = Number(guestsCount) || 0;
  if (guests > cap) return 'small';
  if (!table.slotKnown) return 'unknown';
  if (table.occupiedForSlot) return 'booked';
  return 'free';
}

export function canPreselectBookingTable(table, guestsCount) {
  const st = pickStatus(table, guestsCount);
  return st === 'free' || st === 'unknown';
}

export function pickLayoutPreviewStatus(table) {
  return table.isAvailable ? 'free' : 'disabled';
}

/* ─── Parse hallSchema JSON string safely ─────────────────────── */
function parseHallSchema(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed?.polygonPoints?.length >= 3 ? parsed : null;
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
  /** JSON string from restaurant.hallSchema */
  hallSchema,
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

  useEffect(() => {
    if (!popover) return undefined;
    const onDoc = (e) => {
      if (viewportRef.current?.contains(e.target)) return;
      setPopover(null);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [popover]);

  /* Zoom via wheel — disabled in staticMode */
  useEffect(() => {
    if (staticMode) return undefined;
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.11;
      setView((v) => ({ ...v, k: Math.min(2.8, Math.max(0.52, v.k * factor)) }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [staticMode]);

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
  const zoomOut = () => setView((v) => ({ ...v, k: Math.max(0.52, v.k / 1.15) }));
  const resetView = () => setView({ k: 1, px: 0, py: 0 });

  const statusForTable = layoutOnly
    ? pickLayoutPreviewStatus
    : (t) => pickStatus(t, guestsCount);

  const handleTableClick = (ev, layout) => {
    ev.stopPropagation();
    const { table } = layout;
    const st = statusForTable(table);
    setPopover({ id: table.id, screenX: ev.clientX, screenY: ev.clientY, table, st });
    if (layoutOnly && onSelectTable) onSelectTable(table.id);
    if (!layoutOnly && onSelectTable && canPreselectBookingTable(table, guestsCount)) {
      onSelectTable(table.id);
    }
  };

  const dimOthers = hoveredId != null;

  /* ── Hall outline: custom schema or hardcoded fallback ──────── */
  const renderHallOutline = () => {
    if (schema) {
      const polyPts = schema.polygonPoints.map((p) => `${p.x},${p.y}`).join(' ');
      const ent = schema.entranceLine;
      return (
        <>
          <polygon points={polyPts} className={styles.hallOutline} fill="none" />

          {/* Decorative objects (bar, stage, etc.) */}
          {schema.objects?.map((obj) => {
            const pr = OBJ_PRESETS[obj.type] || OBJ_PRESETS.bar;
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
            <span className={styles.legendItem}><i className={styles.dotFree} /> доступен для брони</span>
            <span className={styles.legendItem}><i className={styles.dotBooked} /> недоступен</span>
            <span className={styles.legendItem}><i className={styles.dotChosen} /> выбран стол</span>
          </>
        ) : (
          <>
            <span className={styles.legendItem}><i className={styles.dotFree} /> свободен</span>
            <span className={styles.legendItem}><i className={styles.dotBooked} /> занят</span>
            <span className={styles.legendItem}><i className={styles.dotChosen} /> выбран</span>
          </>
        )}
      </div>

      {/* Zoom controls — hidden in staticMode */}
      {!staticMode && (
        <div className={styles.zoomBar}>
          <button type="button" className={styles.zoomBtn} onClick={zoomOut} aria-label="Уменьшить">−</button>
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

            {layouts.map((layout) => {
              const { table, x, y, w, h, rx } = layout;
              const st = statusForTable(table);
              const selected = selectedTableId === table.id;
              const hovered = hoveredId === table.id;
              let shapeClass = styles.shapeFree;
              if (st === 'booked' || st === 'disabled') shapeClass = styles.shapeBooked;
              else if (st === 'unknown') shapeClass = styles.shapeUnknown;
              else if (st === 'small') shapeClass = styles.shapeSmall;
              if (layoutOnly && selected) shapeClass = styles.shapeSelected;
              else if (selected && (st === 'free' || st === 'unknown')) shapeClass = styles.shapeSelected;

              return (
                <g
                  key={table.id}
                  data-table={table.id}
                  className={`${styles.tableGroup} ${hovered ? styles.tableHovered : ''} ${dimOthers && hoveredId !== table.id ? styles.peerFade : ''}`}
                  transform={`translate(${x}, ${y})`}
                  style={{
                    cursor: layoutOnly || canPreselectBookingTable(table, guestsCount) ? 'pointer' : 'default',
                  }}
                  onMouseEnter={() => setHoveredId(table.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(ev) => handleTableClick(ev, layout)}
                >
                  <rect
                    className={`${styles.tableShape} ${shapeClass}`}
                    width={w} height={h} rx={rx}
                    filter={selected && (layoutOnly || st === 'free' || st === 'unknown') ? 'url(#tableGlow)' : undefined}
                  />
                  <text x={w / 2} y={h / 2 - 6} textAnchor="middle" className={styles.tableCap}>
                    {table.number}
                  </text>
                  <text x={w / 2} y={h / 2 + 12} textAnchor="middle" className={styles.tableCapSub}>
                    до {table.capacity}
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
          {(popover.st === 'free' || popover.st === 'unknown') && (
            <button type="button" className={styles.popDismiss} onClick={closePopover}>Ок</button>
          )}
        </div>
      )}
    </div>
  );
}

export default TableFloorPlan;
