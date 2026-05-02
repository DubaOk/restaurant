import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeTableLayouts } from '../../utils/tableFloorLayout';
import styles from './TableFloorPlan.module.css';

const VIEW_W = 1000;
const VIEW_H = 520;

const LABELS = {
  free: 'Свободен',
  booked: 'Занят на это время',
  disabled: 'Недоступен',
  small: 'Мало мест под состав гостей',
  unknown: 'Занятость проверится после выбора даты и времени',
};

/**
 * Статус стола для формы бронирования.
 * Сначала проверяем доступность и вместимость; «unknown» — слот времени ещё не запрошен (можно выбрать стол заранее).
 */
export function pickStatus(table, guestsCount) {
  if (!table.isAvailable) return 'disabled';
  const cap = Number(table.capacity) || 0;
  const guests = Number(guestsCount) || 0;
  if (guests > cap) return 'small';
  if (!table.slotKnown) return 'unknown';
  if (table.occupiedForSlot) return 'booked';
  return 'free';
}

/** Можно нажать на стол на схеме или выбрать в списке (до отправки нужны дата и статус «свободен» после проверки слота). */
export function canPreselectBookingTable(table, guestsCount) {
  const st = pickStatus(table, guestsCount);
  return st === 'free' || st === 'unknown';
}

/** Режим владельца: без слота и времени — только недоступные столы серым, остальные «свободны». */
export function pickLayoutPreviewStatus(table) {
  return table.isAvailable ? 'free' : 'disabled';
}

function TableFloorPlan({
  tables,
  guestsCount,
  selectedTableId,
  onSelectTable,
  /** Схема зала без бронирования (настройка владельца) */
  layoutOnly = false,
  /** Высокая область карты для экрана бронирования */
  bookingStretch = false,
}) {
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const viewRef = useRef({ k: 1, px: 0, py: 0 });
  const [view, setView] = useState({ k: 1, px: 0, py: 0 });
  viewRef.current = view;
  const [hoveredId, setHoveredId] = useState(null);
  const [popover, setPopover] = useState(null);

  const layouts = useMemo(() => computeTableLayouts(tables), [tables]);

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

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.11;
      setView((v) => ({ ...v, k: Math.min(2.8, Math.max(0.52, v.k * factor)) }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDownBackdrop = useCallback((e) => {
    if (e.target.closest(`.${styles.tableHit}`)) return;
    const v = viewRef.current;
    dragRef.current = { x: e.clientX, y: e.clientY, px: v.px, py: v.py, k: v.k };
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      setView((v) => ({ ...v, px: d.px + dx / d.k, py: d.py + dy / d.k }));
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const zoomIn = () => setView((v) => ({ ...v, k: Math.min(2.8, v.k * 1.15) }));
  const zoomOut = () => setView((v) => ({ ...v, k: Math.max(0.52, v.k / 1.15) }));
  const resetView = () => setView({ k: 1, px: 0, py: 0 });

  const statusForTable = layoutOnly ? pickLayoutPreviewStatus : (t) => pickStatus(t, guestsCount);

  const handleTableClick = (ev, layout) => {
    ev.stopPropagation();
    const { table } = layout;
    const st = statusForTable(table);
    setPopover({
      id: table.id,
      screenX: ev.clientX,
      screenY: ev.clientY,
      table,
      st,
    });
    if (layoutOnly && onSelectTable) onSelectTable(table.id);
    if (!layoutOnly && onSelectTable && canPreselectBookingTable(table, guestsCount)) {
      onSelectTable(table.id);
    }
  };

  const dimOthers = hoveredId != null;

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

      <div className={styles.zoomBar}>
        <button type="button" className={styles.zoomBtn} onClick={zoomOut} aria-label="Уменьшить">
          −
        </button>
        <button type="button" className={styles.zoomBtn} onClick={resetView} aria-label="Сброс">
          ⊙
        </button>
        <button type="button" className={styles.zoomBtn} onClick={zoomIn} aria-label="Увеличить">
          +
        </button>
      </div>

      <div
        ref={viewportRef}
        className={`${styles.viewport} ${bookingStretch ? styles.viewportBooking : ''} ${dimOthers ? styles.viewportDimPeers : ''}`}
        role="presentation"
        onPointerDown={onPointerDownBackdrop}
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
            <path
              className={styles.hallOutline}
              d="M40 72 Q500 38 960 72 L980 488 Q500 442 20 488 Z"
              fill="none"
            />

            <text x={500} y={42} textAnchor="middle" className={styles.hallTitle}>
              зона зала · схема
            </text>

            <line className={styles.entrance} x1={360} y1={488} x2={640} y2={488} />

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
                  className={`${styles.tableGroup} ${hovered ? styles.tableHovered : ''} ${dimOthers && hoveredId !== table.id ? styles.peerFade : ''}`}
                  transform={`translate(${x}, ${y})`}
                  style={{
                    cursor:
                      layoutOnly || canPreselectBookingTable(table, guestsCount)
                        ? 'pointer'
                        : 'default',
                  }}
                >
                  <rect
                    className={`${styles.tableHit}`}
                    width={w}
                    height={h}
                    rx={rx}
                    fill="transparent"
                    stroke="none"
                    onMouseEnter={() => setHoveredId(table.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={(ev) => handleTableClick(ev, layout)}
                  />
                  <rect
                    className={`${styles.tableShape} ${shapeClass}`}
                    width={w}
                    height={h}
                    rx={rx}
                    filter={
                      selected && (layoutOnly || st === 'free' || st === 'unknown')
                        ? 'url(#tableGlow)'
                        : undefined
                    }
                  />
                  <text
                    x={w / 2}
                    y={h / 2 - 6}
                    textAnchor="middle"
                    className={styles.tableCap}
                  >
                    {table.number}
                  </text>
                  <text
                    x={w / 2}
                    y={h / 2 + 12}
                    textAnchor="middle"
                    className={styles.tableCapSub}
                  >
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
            top: Math.min(popover.screenY + 12, typeof window !== 'undefined' ? window.innerHeight - 160 : 0),
          }}
          role="dialog"
          aria-labelledby="seat-tip-title"
        >
          <p id="seat-tip-title" className={styles.popTitle}>
            Стол №{popover.table.number}
          </p>
          <p className={styles.popLine}>До {popover.table.capacity} персон</p>
          <p className={styles.popStatus}>{LABELS[popover.st]}</p>
          {(popover.st === 'free' || popover.st === 'unknown') && (
            <button type="button" className={styles.popDismiss} onClick={closePopover}>
              Ок
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TableFloorPlan;
