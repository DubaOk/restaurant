/**
 * Раскладка столиков на условном плане зала (viewBox-координаты).
 * При отсутствии полей разметки из БД — сетка «зал как кинозал»: ряды сверху вниз.
 */
export function computeTableLayouts(tables) {
  const n = tables.length;
  if (n === 0) return [];

  const sorted = [...tables].sort((a, b) => a.number - b.number);
  const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length * 1.15)));
  const rows = Math.ceil(sorted.length / cols);

  const marginX = 56;
  const marginTop = 88;
  const marginBottom = 56;
  const innerW = 1000 - marginX * 2;
  const innerH = 520 - marginTop - marginBottom;
  const cellW = innerW / cols;
  const cellH = innerH / rows;

  return sorted.map((table, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cap = Number(table.capacity) || 2;
    const w = Math.min(92, cellW - 16) + Math.min(cap, 8) * 2.5;
    const h = 44 + Math.min(cap, 10) * 3.5;
    const cx = marginX + col * cellW + cellW / 2;
    const cy = marginTop + row * cellH + cellH / 2;
    return {
      table,
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      rx: Math.min(14, h * 0.22),
    };
  });
}
