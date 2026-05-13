/**
 * Проверка: стол (прямоугольник раскладки) целиком внутри контура зала.
 * Для своей схемы — polygon; для шаблона — SVG path (isPointInFill).
 */

const NS = 'http://www.w3.org/2000/svg';

export function pointInPolygon(x, y, points) {
  if (!points?.length) return true;
  let inside = false;
  const n = points.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Проверка точки внутри заливки path (шаблоны зала).
 * Элемент должен быть в DOM — иначе WebKit/Chromium часто дают false для всех точек.
 */
function pointInSvgPath(pathD, x, y) {
  if (typeof document === 'undefined' || !pathD) return true;
  let svg = null;
  try {
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '1200');
    svg.setAttribute('height', '700');
    Object.assign(svg.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
    });
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('d', pathD);
    el.setAttribute('fill', '#000000');
    svg.appendChild(el);
    document.body.appendChild(svg);

    const pt = new DOMPoint(x, y);
    if (typeof el.isPointInFill !== 'function') {
      document.body.removeChild(svg);
      return true;
    }

    el.setAttribute('fill-rule', 'nonzero');
    if (el.isPointInFill(pt)) {
      document.body.removeChild(svg);
      return true;
    }
    el.setAttribute('fill-rule', 'evenodd');
    if (el.isPointInFill(pt)) {
      document.body.removeChild(svg);
      return true;
    }

    document.body.removeChild(svg);
    return false;
  } catch {
    if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
    return true;
  }
}

/** Точка внутри «рамки» зала для режима без контура (плейсхолдер). */
function pointInPlaceholder(x, y) {
  return x >= 56 && x <= 944 && y >= 88 && y <= 464;
}

function pointInsideHallMode(x, y, mode) {
  if (mode.type === 'polygon') return pointInPolygon(x, y, mode.points);
  if (mode.type === 'path') return pointInSvgPath(mode.pathD, x, y);
  return pointInPlaceholder(x, y);
}

function rectSamplePoints(layout, inset = 2) {
  const { x, y, w, h } = layout;
  const ix = Math.max(0.25, Math.min(inset, w / 4 - 0.01));
  const iy = Math.max(0.25, Math.min(inset, h / 4 - 0.01));
  return [
    { x: x + ix, y: y + iy },
    { x: x + w - ix, y: y + iy },
    { x: x + w - ix, y: y + h - iy },
    { x: x + ix, y: y + h - iy },
    { x: x + w / 2, y: y + h / 2 },
  ];
}

/**
 * @param {{ type: 'polygon', points: {x:number,y:number}[] } | { type: 'path', pathD: string } | { type: 'placeholder' }} hallMode
 * @param {{ x:number,y:number,w:number,h:number,cx:number,cy:number }} layout
 */
export function isTableLayoutInsideHall(hallMode, layout) {
  if (!layout) return true;
  const inset = hallMode.type === 'path' ? 1 : 2;
  const pts = rectSamplePoints(layout, inset);
  const flags = pts.map((p) => pointInsideHallMode(p.x, p.y, hallMode));
  if (flags.every(Boolean)) return true;

  /* Шаблоны (path): из-за кривых и сглаживания hit-test иногда «рвётся» на углах стола.
     Если центр внутри и ≥3 из 5 контрольных точек внутри — считаем стол допустимым. */
  if (hallMode.type === 'path' && layout.cx != null && layout.cy != null) {
    const centerIn = pointInsideHallMode(layout.cx, layout.cy, hallMode);
    const insideCount = flags.filter(Boolean).length;
    if (centerIn && insideCount >= 3) return true;
  }

  return false;
}

/**
 * Декор HallEditor: центр (x,y), размеры w×h — целиком внутри многоугольника контура.
 * Пока контура нет (< 3 вершин) — считаем допустимым (ограничений нет).
 */
export function isHallDecorInsidePolygon(polygonPoints, obj) {
  if (!polygonPoints?.length || polygonPoints.length < 3 || !obj?.w || !obj.h) return true;
  const mode = { type: 'polygon', points: polygonPoints };
  const layout = {
    x: obj.x - obj.w / 2,
    y: obj.y - obj.h / 2,
    w: obj.w,
    h: obj.h,
    cx: obj.x,
    cy: obj.y,
  };
  return isTableLayoutInsideHall(mode, layout);
}

/** Оси-выровненные прямоугольники пересекаются с ненулевой площадью */
export function axisAlignedRectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  const ar = ax + aw;
  const ab = ay + ah;
  const br = bx + bw;
  const bb = by + bh;
  return !(ar <= bx || ax >= br || ab <= by || ay >= bb);
}

/**
 * Раскладка стола (левый верх layout.x/y, layout.w/h) пересекается с декором HallEditor (центр obj.x/y).
 */
export function tableLayoutOverlapsAnyDecor(layout, decorObjects) {
  if (!layout?.w || !layout?.h || !decorObjects?.length) return false;
  const { x: lx, y: ly, w: lw, h: lh } = layout;
  for (let i = 0; i < decorObjects.length; i++) {
    const obj = decorObjects[i];
    if (!obj?.w || !obj.h) continue;
    const ox = obj.x - obj.w / 2;
    const oy = obj.y - obj.h / 2;
    if (axisAlignedRectsOverlap(lx, ly, lw, lh, ox, oy, obj.w, obj.h)) return true;
  }
  return false;
}

/** Пересечение с другим столом (по раскладкам). */
export function tableLayoutOverlapsAnyOtherTable(layout, allLayouts) {
  if (!layout?.table?.id || !layout?.w || !layout?.h || !allLayouts?.length) return false;
  const { x, y, w, h } = layout;
  const id = layout.table.id;
  for (let i = 0; i < allLayouts.length; i++) {
    const o = allLayouts[i];
    if (!o?.table?.id || o.table.id === id || !o.w || !o.h) continue;
    if (axisAlignedRectsOverlap(x, y, w, h, o.x, o.y, o.w, o.h)) return true;
  }
  return false;
}

/**
 * Декор пересекается с другим декором (свои габариты — ось-выровненный AABB).
 * Совпадение id — тот же объект, пропускаем.
 */
export function hallDecorOverlapsAnother(obj, allObjects) {
  if (!obj?.w || !obj?.h || !allObjects?.length) return false;
  const ax = obj.x - obj.w / 2;
  const ay = obj.y - obj.h / 2;
  const aw = obj.w;
  const ah = obj.h;
  for (let i = 0; i < allObjects.length; i++) {
    const o = allObjects[i];
    if (!o?.w || !o.h) continue;
    if (o.id != null && obj.id != null && o.id === obj.id) continue;
    const bx = o.x - o.w / 2;
    const by = o.y - o.h / 2;
    if (axisAlignedRectsOverlap(ax, ay, aw, ah, bx, by, o.w, o.h)) return true;
  }
  return false;
}

/** Внутри контура (если он задан) и без пересечений с другими объектами. */
export function isHallDecorGeomValid(polygonPoints, obj, allObjects) {
  if (!obj?.w || !obj?.h) return true;
  if (polygonPoints?.length >= 3 && !isHallDecorInsidePolygon(polygonPoints, obj)) return false;
  if (hallDecorOverlapsAnother(obj, allObjects)) return false;
  return true;
}

export function getHallModeForEditor(schemeId, customPolygon, hallPathFromTemplate) {
  if (schemeId === 'custom' && customPolygon?.length >= 3) {
    return { type: 'polygon', points: customPolygon };
  }
  if (hallPathFromTemplate) {
    return { type: 'path', pathD: hallPathFromTemplate };
  }
  return { type: 'placeholder' };
}
