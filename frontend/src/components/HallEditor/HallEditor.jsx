import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './HallEditor.module.css';

/* ─── Constants ──────────────────────────────────────────────── */
const VB_W = 1000;
const VB_H = 520;
const GRID = 20; // snap grid size in viewBox units

/* ─── localStorage ───────────────────────────────────────────── */
const SCHEMA_KEY = (id) => `hall_schema_${id}`;

function loadSchema(id) {
  try {
    const raw = localStorage.getItem(SCHEMA_KEY(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persistSchema(id, data) {
  try { localStorage.setItem(SCHEMA_KEY(id), JSON.stringify(data)); } catch {}
}

/* ─── Coordinate helpers ─────────────────────────────────────── */
function toVB(svgEl, clientX, clientY) {
  const r = svgEl.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * VB_W,
    y: ((clientY - r.top) / r.height) * VB_H,
  };
}

function snap(v) { return Math.round(v / GRID) * GRID; }
function snapPt(p) { return { x: snap(p.x), y: snap(p.y) }; }
function uid() { return Math.random().toString(36).slice(2, 9); }

/* ─── Object presets (exported for table-view rendering) ─────── */
export const OBJECT_PRESETS = {
  bar:        { w: 180, h: 56,  rx: 14, label: 'БАР',      fill: 'rgba(201,169,98,0.22)',  stroke: 'rgba(201,169,98,0.78)'  },
  stage:      { w: 280, h: 80,  rx: 10, label: 'СЦЕНА',    fill: 'rgba(148,100,210,0.22)', stroke: 'rgba(148,100,210,0.78)' },
  dancefloor: { w: 200, h: 200, rx: 18, label: 'ТАНЦПОЛ',  fill: 'rgba(72,180,160,0.22)',  stroke: 'rgba(72,180,160,0.78)'  },
  pillar:     { w: 44,  h: 44,  rx: 22, label: '',          fill: 'rgba(120,132,150,0.45)', stroke: 'rgba(140,152,172,0.85)' },
};

const OBJECT_NAMES = {
  bar: 'Бар / стойка',
  stage: 'Сцена',
  dancefloor: 'Танцпол',
  pillar: 'Колонна',
};

const TOOLS = [
  { id: 'polygon',  icon: '⬡', label: 'Контур зала',      hint: 'Кликайте, чтобы добавлять вершины контура' },
  { id: 'entrance', icon: '🚪', label: 'Вход',              hint: 'Два клика — начало и конец дверного проёма' },
  { id: 'object',   icon: '⬛', label: 'Объект',            hint: 'Кликните, чтобы разместить объект' },
  { id: 'select',   icon: '↖',  label: 'Выбор / правка',   hint: 'Перетащите вершину или объект для изменения' },
];

/* ═══════════════════════════════════════════════════════════════
   HallEditor
   Props:
     restaurantId  — key for localStorage
     onDone(schema)— called when user clicks "→ К столикам"
═══════════════════════════════════════════════════════════════ */
const HallEditor = ({ restaurantId, onDone }) => {
  const [tool, setTool]               = useState('polygon');
  const [objType, setObjType]         = useState('bar');
  const [points, setPoints]           = useState([]);        // polygon vertices [{x,y}]
  const [entrance, setEntrance]       = useState(null);      // {start:{x,y}, end:{x,y}}
  const [objects, setObjects]         = useState([]);        // special elements
  const [selVertex, setSelVertex]     = useState(null);      // selected vertex index
  const [selObjId, setSelObjId]       = useState(null);      // selected object id
  const [entStart, setEntStart]       = useState(null);      // entrance: first click
  const [cursor, setCursor]           = useState(null);      // snapped mouse {x,y}

  const svgRef      = useRef(null);
  const dragRef     = useRef(null);    // active drag state
  const wasDragged  = useRef(false);   // distinguish click vs drag

  /* ── Load ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!restaurantId) return;
    const s = loadSchema(restaurantId);
    setPoints(s?.polygonPoints ?? []);
    setEntrance(s?.entranceLine ?? null);
    setObjects(s?.objects ?? []);
    setSelVertex(null); setSelObjId(null);
    setEntStart(null);  setCursor(null);
    setTool('polygon');
  }, [restaurantId]);

  /* ── Save helper ──────────────────────────────────────────── */
  const save = useCallback((pts, ent, objs) => {
    persistSchema(restaurantId, { polygonPoints: pts, entranceLine: ent, objects: objs });
  }, [restaurantId]);

  /* ── SVG coordinate conversion ────────────────────────────── */
  const svgPt = useCallback((e) => {
    if (!svgRef.current) return null;
    return toVB(svgRef.current, e.clientX, e.clientY);
  }, []);

  /* ─────────────────────────────────────────────────────────────
     POINTER EVENTS
  ───────────────────────────────────────────────────────────── */
  const handlePointerMove = useCallback((e) => {
    const raw = svgPt(e);
    if (!raw) return;

    if (dragRef.current) {
      wasDragged.current = true;
      const { kind, idx, id, ox, oy } = dragRef.current;
      const x = snap(raw.x + ox);
      const y = snap(raw.y + oy);
      dragRef.current.lastX = x;
      dragRef.current.lastY = y;

      if (kind === 'vertex') {
        setPoints((prev) => prev.map((p, i) => i === idx ? { x, y } : p));
      } else if (kind === 'object') {
        setObjects((prev) => prev.map((o) => o.id === id ? { ...o, x, y } : o));
      }
      return;
    }

    if (tool !== 'select') {
      setCursor({ x: snap(raw.x), y: snap(raw.y) });
    } else {
      setCursor(null);
    }
  }, [tool, svgPt]);

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current) return;
    const { kind, idx, id, lastX, lastY } = dragRef.current;
    const moved = wasDragged.current;
    dragRef.current = null;
    wasDragged.current = false;

    if (!moved || lastX == null) return;

    // Apply final position and save using functional setters for freshness
    if (kind === 'vertex') {
      setPoints((pts) => {
        const next = pts.map((p, i) => i === idx ? { x: lastX, y: lastY } : p);
        setObjects((objs) => { save(next, entrance, objs); return objs; });
        return next;
      });
    } else if (kind === 'object') {
      setObjects((objs) => {
        const next = objs.map((o) => o.id === id ? { ...o, x: lastX, y: lastY } : o);
        setPoints((pts) => { save(pts, entrance, next); return pts; });
        return next;
      });
    }
  }, [save, entrance]);

  const handlePointerLeave = useCallback(() => setCursor(null), []);

  /* ── SVG background click ─────────────────────────────────── */
  const handleSvgClick = useCallback((e) => {
    if (wasDragged.current) { wasDragged.current = false; return; }
    const raw = svgPt(e);
    if (!raw) return;
    const pos = snapPt(raw);

    if (tool === 'polygon') {
      const next = [...points, pos];
      setPoints(next);
      save(next, entrance, objects);

    } else if (tool === 'entrance') {
      if (!entStart) {
        setEntStart(pos);
      } else {
        const ent = { start: entStart, end: pos };
        setEntrance(ent);
        setEntStart(null);
        save(points, ent, objects);
      }

    } else if (tool === 'object') {
      const pr = OBJECT_PRESETS[objType];
      const obj = { id: uid(), type: objType, x: pos.x, y: pos.y, w: pr.w, h: pr.h, rx: pr.rx, label: pr.label };
      const next = [...objects, obj];
      setObjects(next);
      setSelObjId(obj.id);
      save(points, entrance, next);

    } else if (tool === 'select') {
      setSelVertex(null);
      setSelObjId(null);
    }
  }, [tool, objType, points, entrance, objects, entStart, save, svgPt]);

  /* ── Vertex drag start ────────────────────────────────────── */
  const onVertexDown = useCallback((e, i) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const raw = svgPt(e);
    if (!raw) return;
    dragRef.current = { kind: 'vertex', idx: i, ox: points[i].x - snap(raw.x), oy: points[i].y - snap(raw.y) };
    wasDragged.current = false;
    setSelVertex(i);
    setSelObjId(null);
  }, [tool, points, svgPt]);

  /* ── Object drag start ────────────────────────────────────── */
  const onObjDown = useCallback((e, obj) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const raw = svgPt(e);
    if (!raw) return;
    dragRef.current = { kind: 'object', id: obj.id, ox: obj.x - snap(raw.x), oy: obj.y - snap(raw.y) };
    wasDragged.current = false;
    setSelObjId(obj.id);
    setSelVertex(null);
  }, [tool, svgPt]);

  /* ── Toolbar actions ──────────────────────────────────────── */
  const switchTool = (t) => { setTool(t); setEntStart(null); setCursor(null); };

  const undoVertex = () => {
    if (!points.length) return;
    const next = points.slice(0, -1);
    setPoints(next);
    setSelVertex(null);
    save(next, entrance, objects);
  };

  const deleteVertex = () => {
    if (selVertex == null) return;
    const next = points.filter((_, i) => i !== selVertex);
    setPoints(next);
    setSelVertex(null);
    save(next, entrance, objects);
  };

  const deleteObject = () => {
    if (!selObjId) return;
    const next = objects.filter((o) => o.id !== selObjId);
    setObjects(next);
    setSelObjId(null);
    save(points, entrance, next);
  };

  const clearAll = () => {
    setPoints([]); setEntrance(null); setObjects([]);
    setSelVertex(null); setSelObjId(null); setEntStart(null);
    save([], null, []);
  };

  const handleDone = () => onDone?.({ polygonPoints: points, entranceLine: entrance, objects });

  /* ── Computed ─────────────────────────────────────────────── */
  const hasPolygon = points.length >= 3;
  const polyAttr   = points.map((p) => `${p.x},${p.y}`).join(' ');
  const lastPt     = points[points.length - 1] ?? null;

  const statusText = {
    polygon:  points.length === 0
      ? 'Кликайте по полю, чтобы добавить вершины контура'
      : `${points.length} вершин — продолжайте или переключите инструмент`,
    entrance: entStart ? 'Кликните вторую точку дверного проёма' : 'Кликните первую точку дверного проёма',
    object:   `Кликните, чтобы разместить: ${OBJECT_NAMES[objType]}`,
    select:   selVertex != null
      ? `Вершина ${selVertex + 1} выбрана — перетащите или удалите`
      : selObjId
        ? 'Объект выбран — перетащите или удалите'
        : 'Выберите вершину или объект для правки',
  }[tool];

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className={styles.root}>

      {/* ══ Main toolbar ═════════════════════════════════════ */}
      <div className={styles.toolbar}>

        {/* Tool buttons */}
        <div className={styles.toolGroup}>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.hint}
              className={`${styles.toolBtn} ${tool === t.id ? styles.toolBtnActive : ''}`}
              onClick={() => switchTool(t.id)}
            >
              <span className={styles.toolIcon}>{t.icon}</span>
              <span className={styles.toolLabel}>{t.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.sep} />

        {/* Context actions */}
        <div className={styles.ctxGroup}>
          {tool === 'polygon' && points.length > 0 && (
            <button type="button" className={styles.ctxBtn} onClick={undoVertex}>← Отменить</button>
          )}
          {tool === 'select' && selVertex != null && (
            <button type="button" className={`${styles.ctxBtn} ${styles.ctxDanger}`} onClick={deleteVertex}>
              🗑 Вершину
            </button>
          )}
          {tool === 'select' && selObjId && (
            <button type="button" className={`${styles.ctxBtn} ${styles.ctxDanger}`} onClick={deleteObject}>
              🗑 Объект
            </button>
          )}
          {(points.length > 0 || objects.length > 0) && (
            <button type="button" className={`${styles.ctxBtn} ${styles.ctxDanger}`} onClick={clearAll}>
              Сбросить всё
            </button>
          )}
        </div>

        <span className={styles.spacer} />

        <button type="button" className={styles.btnDone} onClick={handleDone}>
          → К столикам
        </button>
      </div>

      {/* ══ Object type selector (when tool = object) ════════ */}
      {tool === 'object' && (
        <div className={styles.objBar}>
          <span className={styles.objBarLabel}>Тип:</span>
          {Object.entries(OBJECT_NAMES).map(([type, name]) => (
            <button
              key={type}
              type="button"
              className={`${styles.objTypeBtn} ${objType === type ? styles.objTypeBtnActive : ''}`}
              style={objType === type ? {
                borderColor: OBJECT_PRESETS[type].stroke,
                color: OBJECT_PRESETS[type].stroke,
              } : {}}
              onClick={() => setObjType(type)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* ══ SVG canvas ═══════════════════════════════════════ */}
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        xmlns="http://www.w3.org/2000/svg"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClick={handleSvgClick}
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
      >
        {/* ── Dot grid ──────────────────────────────────────── */}
        <defs>
          <pattern id="hg" x="0" y="0" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <circle cx={GRID / 2} cy={GRID / 2} r="0.9" fill="rgba(255,255,255,0.1)" />
          </pattern>
        </defs>
        <rect width={VB_W} height={VB_H} fill="url(#hg)" />

        {/* ── Hall polygon fill ──────────────────────────────── */}
        {hasPolygon && (
          <polygon points={polyAttr} className={styles.hallPoly} />
        )}

        {/* ── Drawing edges (polygon tool) ──────────────────── */}
        {tool === 'polygon' && points.map((p, i) =>
          i > 0 ? (
            <line key={`de${i}`}
              x1={points[i - 1].x} y1={points[i - 1].y}
              x2={p.x} y2={p.y}
              className={styles.drawEdge}
            />
          ) : null
        )}

        {/* ── Live preview: last pt → cursor ────────────────── */}
        {tool === 'polygon' && lastPt && cursor && (
          <line x1={lastPt.x} y1={lastPt.y} x2={cursor.x} y2={cursor.y} className={styles.previewLine} />
        )}

        {/* ── Closure preview: last → first (dashed) ────────── */}
        {tool === 'polygon' && hasPolygon && lastPt && (
          <line x1={lastPt.x} y1={lastPt.y} x2={points[0].x} y2={points[0].y} className={styles.closureLine} />
        )}

        {/* ── Objects ───────────────────────────────────────── */}
        {objects.map((obj) => {
          const pr = OBJECT_PRESETS[obj.type];
          const sel = selObjId === obj.id && tool === 'select';
          const inSelect = tool === 'select';
          return (
            <g
              key={obj.id}
              style={{ cursor: inSelect ? 'move' : 'default', pointerEvents: inSelect ? 'all' : 'none' }}
              onPointerDown={inSelect ? (e) => onObjDown(e, obj) : undefined}
              onClick={inSelect ? (e) => e.stopPropagation() : undefined}
            >
              {/* selection ring */}
              {sel && (
                <rect
                  x={obj.x - obj.w / 2 - 5} y={obj.y - obj.h / 2 - 5}
                  width={obj.w + 10} height={obj.h + 10} rx={obj.rx + 5}
                  fill="none" stroke="rgba(242,208,154,0.45)"
                  strokeWidth="1.2" strokeDasharray="5 3"
                />
              )}
              <rect
                x={obj.x - obj.w / 2} y={obj.y - obj.h / 2}
                width={obj.w} height={obj.h} rx={obj.rx}
                fill={pr.fill}
                stroke={sel ? '#f2d09a' : pr.stroke}
                strokeWidth={sel ? 2 : 1.5}
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

        {/* ── Object ghost preview (object tool + cursor) ─────── */}
        {tool === 'object' && cursor && (() => {
          const pr = OBJECT_PRESETS[objType];
          return (
            <g style={{ pointerEvents: 'none', opacity: 0.45 }}>
              <rect
                x={cursor.x - pr.w / 2} y={cursor.y - pr.h / 2}
                width={pr.w} height={pr.h} rx={pr.rx}
                fill={pr.fill} stroke={pr.stroke}
                strokeWidth="1.5" strokeDasharray="6 3"
              />
              {pr.label && (
                <text x={cursor.x} y={cursor.y}
                  textAnchor="middle" dominantBaseline="middle"
                  className={styles.objLabel} style={{ opacity: 0.65 }}>
                  {pr.label}
                </text>
              )}
            </g>
          );
        })()}

        {/* ── Entrance line ──────────────────────────────────── */}
        {entrance && (
          <>
            <line
              x1={entrance.start.x} y1={entrance.start.y}
              x2={entrance.end.x}   y2={entrance.end.y}
              className={styles.entranceLine}
            />
            <text
              x={(entrance.start.x + entrance.end.x) / 2}
              y={(entrance.start.y + entrance.end.y) / 2 + 18}
              textAnchor="middle" className={styles.entranceLabel}
            >
              вход
            </text>
          </>
        )}

        {/* ── Entrance tool: draft point + live line ─────────── */}
        {tool === 'entrance' && entStart && (
          <>
            <circle cx={entStart.x} cy={entStart.y} r={6}
              className={styles.entranceDraft} style={{ pointerEvents: 'none' }} />
            {cursor && (
              <line x1={entStart.x} y1={entStart.y} x2={cursor.x} y2={cursor.y}
                className={styles.entrancePreview} />
            )}
          </>
        )}

        {/* ── Vertex circles ─────────────────────────────────── */}
        {points.map((p, i) => {
          const sel    = tool === 'select' && selVertex === i;
          const first  = i === 0;
          const inSel  = tool === 'select';
          return (
            <circle
              key={`v${i}`}
              cx={p.x} cy={p.y}
              r={sel ? 9 : first ? 7 : 5}
              className={sel ? styles.vtxSel : first ? styles.vtxFirst : styles.vtx}
              style={{ cursor: inSel ? 'move' : 'default', pointerEvents: inSel ? 'all' : 'none' }}
              onPointerDown={inSel ? (e) => onVertexDown(e, i) : undefined}
              onClick={inSel ? (e) => e.stopPropagation() : undefined}
            />
          );
        })}

        {/* ── Cursor snap indicator ──────────────────────────── */}
        {cursor && tool !== 'object' && (
          <circle cx={cursor.x} cy={cursor.y} r={2.5}
            fill="rgba(242,208,154,0.55)" style={{ pointerEvents: 'none' }} />
        )}

        {/* ── SVG title ──────────────────────────────────────── */}
        <text x={VB_W / 2} y={26} textAnchor="middle" className={styles.svgTitle}>
          {tool === 'polygon'  ? 'контур зала — добавление вершин'      :
           tool === 'entrance' ? 'разметка входа'                         :
           tool === 'object'   ? `разместить: ${OBJECT_NAMES[objType]}` :
                                 'режим выбора и правки'}
        </text>
      </svg>

      {/* ══ Status bar ════════════════════════════════════════ */}
      <div className={styles.statusBar}>
        <span className={styles.statusText}>{statusText}</span>
        {cursor && (
          <span className={styles.coords}>X {cursor.x} · Y {cursor.y}</span>
        )}
      </div>
    </div>
  );
};

export default HallEditor;
