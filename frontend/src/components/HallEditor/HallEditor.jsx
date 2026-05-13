import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hallDecorOverlapsAnother, isHallDecorGeomValid, isHallDecorInsidePolygon } from '../../utils/hallBoundary';
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
  kitchen:    { w: 140, h: 100, rx: 8,  label: 'КУХНЯ',    fill: 'rgba(220,140,90,0.2)',   stroke: 'rgba(230,150,100,0.82)' },
  partition:  { w: 200, h: 28,  rx: 4,  label: '',          fill: 'rgba(100,110,130,0.35)',  stroke: 'rgba(130,140,165,0.88)' },
  lounge:     { w: 220, h: 140, rx: 20, label: 'ЗОНА',     fill: 'rgba(90,130,200,0.18)',   stroke: 'rgba(120,160,230,0.78)' },
};

export function presetFor(type) {
  return OBJECT_PRESETS[type] || OBJECT_PRESETS.bar;
}

const OBJECT_NAMES = {
  bar: 'Бар / стойка',
  stage: 'Сцена',
  dancefloor: 'Танцпол',
  pillar: 'Колонна',
  kitchen: 'Кухня',
  partition: 'Перегородка',
  lounge: 'Зона отдыха',
};

const MIN_OBJ = 40;
const VB_PAD = 12;

/** dragCorner = угол, который тянем; (fx,fy) — противоположный закреплённый угол */
function rectFromResizeCorner(dragCorner, fx, fy, sx, sy) {
  const sxs = snap(sx);
  const sys = snap(sy);
  let left; let top; let right; let bottom;
  if (dragCorner === 'se') {
    left = fx; top = fy;
    right = Math.max(fx + MIN_OBJ, sxs);
    bottom = Math.max(fy + MIN_OBJ, sys);
  } else if (dragCorner === 'nw') {
    right = fx; bottom = fy;
    left = Math.min(sxs, fx - MIN_OBJ);
    top = Math.min(sys, fy - MIN_OBJ);
  } else if (dragCorner === 'ne') {
    left = fx; bottom = fy;
    right = Math.max(fx + MIN_OBJ, sxs);
    top = Math.min(sys, fy - MIN_OBJ);
  } else {
    right = fx; top = fy;
    left = Math.min(sxs, fx - MIN_OBJ);
    bottom = Math.max(fy + MIN_OBJ, sys);
  }
  left = Math.max(VB_PAD, left);
  top = Math.max(VB_PAD, top);
  right = Math.min(VB_W - VB_PAD, right);
  bottom = Math.min(VB_H - VB_PAD, bottom);
  if (right - left < MIN_OBJ) {
    if (dragCorner === 'se' || dragCorner === 'ne') left = right - MIN_OBJ;
    else right = left + MIN_OBJ;
  }
  if (bottom - top < MIN_OBJ) {
    if (dragCorner === 'se' || dragCorner === 'sw') top = bottom - MIN_OBJ;
    else bottom = top + MIN_OBJ;
  }
  left = Math.max(VB_PAD, Math.min(left, VB_W - VB_PAD - MIN_OBJ));
  top = Math.max(VB_PAD, Math.min(top, VB_H - VB_PAD - MIN_OBJ));
  right = Math.max(left + MIN_OBJ, Math.min(right, VB_W - VB_PAD));
  bottom = Math.max(top + MIN_OBJ, Math.min(bottom, VB_H - VB_PAD));
  const w = right - left;
  const h = bottom - top;
  return { x: left + w / 2, y: top + h / 2, w, h };
}

function fixedCornerCoords(dragCorner, o) {
  const hw = o.w / 2;
  const hh = o.h / 2;
  if (dragCorner === 'se') return { fx: o.x - hw, fy: o.y - hh };
  if (dragCorner === 'nw') return { fx: o.x + hw, fy: o.y + hh };
  if (dragCorner === 'ne') return { fx: o.x - hw, fy: o.y + hh };
  return { fx: o.x + hw, fy: o.y - hh };
}

const TOOLS = [
  { id: 'polygon',  icon: '⬡', label: 'Контур зала',      hint: 'Кликайте, чтобы добавлять вершины контура' },
  { id: 'entrance', icon: '🚪', label: 'Вход',              hint: 'Два клика — начало и конец дверного проёма' },
  { id: 'object',   icon: '⬛', label: 'Объект',            hint: 'Объекты не должны пересекаться; после контура — ещё и внутри стен' },
  { id: 'select',   icon: '↖',  label: 'Выбор / правка',   hint: 'Перетащите вершину или объект; у объекта — углы и поля размера' },
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

  const selectedObj = useMemo(
    () => (selObjId ? objects.find((o) => o.id === selObjId) ?? null : null),
    [objects, selObjId],
  );

  const selectedObjIssue = useMemo(() => {
    if (!selectedObj) return 'none';
    const outside = points.length >= 3 && !isHallDecorInsidePolygon(points, selectedObj);
    const overlap = hallDecorOverlapsAnother(selectedObj, objects);
    if (!outside && !overlap) return 'ok';
    if (outside && overlap) return 'both';
    if (outside) return 'outside';
    return 'overlap';
  }, [selectedObj, points, objects]);

  const anyDecorInvalid = useMemo(
    () => objects.some((o) => !isHallDecorGeomValid(points, o, objects)),
    [points, objects],
  );

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

  const patchSelectedObj = useCallback((patch) => {
    if (!selObjId) return;
    setObjects((objs) => {
      const next = objs.map((o) => {
        if (o.id !== selObjId) return o;
        const nwRaw = patch.w !== undefined ? Number(patch.w) : o.w;
        const nhRaw = patch.h !== undefined ? Number(patch.h) : o.h;
        const nrxRaw = patch.rx !== undefined ? Number(patch.rx) : o.rx;
        let nw = Number.isFinite(nwRaw) ? nwRaw : o.w;
        let nh = Number.isFinite(nhRaw) ? nhRaw : o.h;
        let nrx = Number.isFinite(nrxRaw) ? nrxRaw : o.rx;
        nw = Math.min(VB_W - VB_PAD * 2, Math.max(MIN_OBJ, nw));
        nh = Math.min(VB_H - VB_PAD * 2, Math.max(MIN_OBJ, nh));
        nrx = Math.max(0, Math.min(nrx, Math.min(nw, nh) / 2));
        const label = patch.label !== undefined ? String(patch.label) : o.label;
        return { ...o, w: nw, h: nh, rx: nrx, label };
      });
      setPoints((pts) => { save(pts, entrance, next); return pts; });
      return next;
    });
  }, [selObjId, save, entrance]);

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
      } else if (kind === 'resize') {
        const { dragCorner, fx, fy, id: rid } = dragRef.current;
        const { x: cx, y: cy, w, h } = rectFromResizeCorner(dragCorner, fx, fy, raw.x, raw.y);
        setObjects((prev) => {
          const o = prev.find((t) => t.id === rid);
          if (!o) return prev;
          const rx = Math.min(o.rx, Math.min(w, h) / 2);
          const nextO = { ...o, x: cx, y: cy, w, h, rx };
          dragRef.current.lastSnapshot = nextO;
          return prev.map((t) => (t.id === rid ? nextO : t));
        });
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
    const d = dragRef.current;
    const {
      kind, idx, id, lastX, lastY, lastSnapshot,
    } = d;
    const moved = wasDragged.current;
    dragRef.current = null;
    wasDragged.current = false;

    if (kind === 'resize') {
      if (!moved || !lastSnapshot) return;
      setObjects((objs) => {
        const next = objs.map((o) => (o.id === id ? lastSnapshot : o));
        setPoints((pts) => { save(pts, entrance, next); return pts; });
        return next;
      });
      return;
    }

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
        const next = objs.map((o) => (o.id === id ? { ...o, x: lastX, y: lastY } : o));
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
      const pr = presetFor(objType);
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

  const onResizeHandleDown = useCallback((e, obj, dragCorner) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { fx, fy } = fixedCornerCoords(dragCorner, obj);
    dragRef.current = {
      kind: 'resize',
      id: obj.id,
      dragCorner,
      fx,
      fy,
      lastSnapshot: { ...obj },
    };
    wasDragged.current = false;
    setSelObjId(obj.id);
    setSelVertex(null);
  }, [tool]);

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

  const handleDone = () => {
    if (objects.some((o) => !isHallDecorGeomValid(points, o, objects))) return;
    onDone?.({ polygonPoints: points, entranceLine: entrance, objects });
  };

  /* ── Computed ─────────────────────────────────────────────── */
  const hasPolygon = points.length >= 3;
  const polyAttr   = points.map((p) => `${p.x},${p.y}`).join(' ');
  const lastPt     = points[points.length - 1] ?? null;

  const statusText = {
    polygon:  points.length === 0
      ? 'Кликайте по полю, чтобы добавить вершины контура'
      : `${points.length} вершин — продолжайте или переключите инструмент`,
    entrance: entStart ? 'Кликните вторую точку дверного проёма' : 'Кликните первую точку дверного проёма',
    object:   points.length >= 3
      ? `Кликните, чтобы поставить ${OBJECT_NAMES[objType]} — пересечения и выход за стены подсвечиваются`
      : `Кликните, чтобы разместить: ${OBJECT_NAMES[objType]} — не накладывайте объекты друг на друга`,
    select:   selVertex != null
      ? `Вершина ${selVertex + 1} выбрана — перетащите или удалите`
      : anyDecorInvalid
        ? 'Красные объекты нужно поправить — пересечения или выход за контур'
        : selObjId
          ? 'Объект выбран — перетащите, тяните за углы или задайте размер ниже'
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

        <button
          type="button"
          className={styles.btnDone}
          disabled={anyDecorInvalid}
          title={anyDecorInvalid ? 'Исправьте красные объекты на плане' : undefined}
          onClick={handleDone}
        >
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
                borderColor: presetFor(type).stroke,
                color: presetFor(type).stroke,
              } : {}}
              onClick={() => setObjType(type)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {tool === 'select' && selectedObj && (
        <div
          className={`${styles.objInspector} ${selectedObjIssue !== 'ok' ? styles.objInspectorAlert : ''}`}
        >
          <div className={styles.objInspHead}>
            <span className={styles.objInspTitle}>Размер и подпись</span>
            <span
              className={`${styles.objInspBadge} ${selectedObjIssue !== 'ok' ? styles.objInspBadgeWarn : styles.objInspBadgeOk}`}
              role="status"
              aria-live="polite"
            >
              {selectedObjIssue !== 'ok' ? 'Нужна правка' : 'В порядке'}
            </span>
          </div>
          <p className={`${styles.objInspHint} ${selectedObjIssue !== 'ok' ? styles.objInspHintWarn : ''}`}>
            {selectedObjIssue === 'ok' && 'Меняйте числа или тяните жёлтые углы на схеме.'}
            {selectedObjIssue === 'outside' && 'Объект должен целиком остаться внутри контура зала.'}
            {selectedObjIssue === 'overlap' && 'Отодвиньте от другого объекта — пересечения недопустимы.'}
            {selectedObjIssue === 'both' && 'Сдвиньте в зал и уберите наложение на другой объект.'}
          </p>
          <div className={styles.objInspGrid}>
            <label className={styles.objInspLab} htmlFor={`hall-obj-w-${selectedObj.id}`}>Ширина</label>
            <input
              id={`hall-obj-w-${selectedObj.id}`}
              className={styles.objInspInput}
              type="number"
              min={MIN_OBJ}
              max={VB_W - VB_PAD * 2}
              value={Math.round(selectedObj.w)}
              onChange={(e) => patchSelectedObj({ w: e.target.value })}
            />
            <label className={styles.objInspLab} htmlFor={`hall-obj-h-${selectedObj.id}`}>Высота</label>
            <input
              id={`hall-obj-h-${selectedObj.id}`}
              className={styles.objInspInput}
              type="number"
              min={MIN_OBJ}
              max={VB_H - VB_PAD * 2}
              value={Math.round(selectedObj.h)}
              onChange={(e) => patchSelectedObj({ h: e.target.value })}
            />
            <label className={styles.objInspLab} htmlFor={`hall-obj-rx-${selectedObj.id}`}>Скругление</label>
            <input
              id={`hall-obj-rx-${selectedObj.id}`}
              className={styles.objInspInput}
              type="number"
              min={0}
              max={Math.floor(Math.min(selectedObj.w, selectedObj.h) / 2)}
              value={Math.round(selectedObj.rx)}
              onChange={(e) => patchSelectedObj({ rx: e.target.value })}
            />
            <label className={styles.objInspLab} htmlFor={`hall-obj-lbl-${selectedObj.id}`}>Подпись</label>
            <input
              id={`hall-obj-lbl-${selectedObj.id}`}
              className={styles.objInspInput}
              type="text"
              maxLength={24}
              placeholder="надпись на схеме"
              value={selectedObj.label ?? ''}
              onChange={(e) => patchSelectedObj({ label: e.target.value })}
            />
          </div>
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
          const pr = presetFor(obj.type);
          const sel = selObjId === obj.id && tool === 'select';
          const inSelect = tool === 'select';
          const hw = obj.w / 2;
          const hh = obj.h / 2;
          const invalid = !isHallDecorGeomValid(points, obj, objects);
          return (
            <g key={obj.id} style={{ pointerEvents: inSelect ? 'all' : 'none' }}>
              {sel && (
                <rect
                  x={obj.x - hw - 5} y={obj.y - hh - 5}
                  width={obj.w + 10} height={obj.h + 10} rx={obj.rx + 5}
                  fill="none"
                  stroke={invalid ? 'rgba(248,113,113,0.88)' : 'rgba(242,208,154,0.45)'}
                  strokeWidth="1.2" strokeDasharray="5 3"
                  style={{ pointerEvents: 'none' }}
                />
              )}
              <rect
                x={obj.x - hw} y={obj.y - hh}
                width={obj.w} height={obj.h} rx={obj.rx}
                className={invalid ? styles.decorOutside : undefined}
                fill={invalid ? undefined : pr.fill}
                stroke={invalid ? undefined : (sel ? '#f2d09a' : pr.stroke)}
                strokeWidth={invalid ? undefined : (sel ? 2 : 1.5)}
                style={{ cursor: inSelect ? 'move' : 'default' }}
                onPointerDown={inSelect ? (e) => onObjDown(e, obj) : undefined}
                onClick={inSelect ? (e) => e.stopPropagation() : undefined}
              />
              {obj.label && (
                <text
                  x={obj.x} y={obj.y}
                  textAnchor="middle" dominantBaseline="middle"
                  className={styles.objLabel}
                  style={{ pointerEvents: 'none', fill: invalid ? 'rgba(254,202,202,0.92)' : undefined }}
                >
                  {obj.label}
                </text>
              )}
              {sel && (['nw', 'ne', 'sw', 'se']).map((c) => {
                const hx = c.includes('e') ? obj.x + hw : obj.x - hw;
                const hy = c.includes('s') ? obj.y + hh : obj.y - hh;
                return (
                  <circle
                    key={c}
                    cx={hx}
                    cy={hy}
                    r={8}
                    className={styles.resizeHandle}
                    style={{ cursor: `${c}-resize` }}
                    onPointerDown={(e) => onResizeHandleDown(e, obj, c)}
                    onClick={(e) => e.stopPropagation()}
                  />
                );
              })}
            </g>
          );
        })}

        {/* ── Object ghost preview (object tool + cursor) ─────── */}
        {tool === 'object' && cursor && (() => {
          const pr = presetFor(objType);
          const ghost = { x: cursor.x, y: cursor.y, w: pr.w, h: pr.h, rx: pr.rx, type: objType, id: '__ghost__' };
          const ghostBad = !isHallDecorGeomValid(points, ghost, objects);
          return (
            <g style={{ pointerEvents: 'none', opacity: ghostBad ? 0.72 : 0.45 }}>
              <rect
                x={cursor.x - pr.w / 2} y={cursor.y - pr.h / 2}
                width={pr.w} height={pr.h} rx={pr.rx}
                className={ghostBad ? styles.decorGhostInvalid : undefined}
                fill={ghostBad ? undefined : pr.fill}
                stroke={ghostBad ? undefined : pr.stroke}
                strokeWidth="1.5" strokeDasharray="6 3"
              />
              {pr.label && (
                <text x={cursor.x} y={cursor.y}
                  textAnchor="middle" dominantBaseline="middle"
                  className={styles.objLabel}
                  style={{
                    opacity: ghostBad ? 0.95 : 0.65,
                    fill: ghostBad ? 'rgba(254,202,202,0.95)' : undefined,
                  }}>
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
