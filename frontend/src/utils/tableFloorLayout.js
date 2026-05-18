/**
 * Раскладка столиков на условном плане зала (viewBox-координаты).
 * Если у столика заданы posX/posY — используются как координаты центра.
 * Иначе — автоматическая сетка «зал как кинозал»: ряды сверху вниз.
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
    const cap = Math.max(1, Math.min(Number(table.capacity) || 2, 10));

    /*
     * Реалистичная модель: глубина стола (h, «в ширину зала») как у 4 мест — под локти и посуду.
     * Вместимость >4 тянет только длину (w по X): за стол садятся вдоль длинной стороны.
     * Прирост длины слабо затухает — первые +2–4 места дают больше сантиметров, дальше плотнее.
     */
    const baseMaxW = Math.min(92, cellW - 16);
    const w4 = baseMaxW + Math.min(4, 8) * 2.5;
    const h4 = 44 + Math.min(4, 10) * 3.5;
    const h = h4;

    // Длина растёт заметно с каждым местом после 4; квадратичный член даёт «длинный банкет» на 16–20+.
    const extras = Math.max(0, Math.min(cap, 10) - 4);
    const extraW = extras * (8.2 + 0.52 * extras);
    const w = Math.min(cellW - 8, w4 + extraW);

    const cx =
      table.posX != null ? table.posX : marginX + col * cellW + cellW / 2;
    const cy =
      table.posY != null ? table.posY : marginTop + row * cellH + cellH / 2;

    return {
      table,
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      cx,
      cy,
      rx: Math.min(14, h * 0.22, w * 0.08, w / 2 - 1, h / 2 - 1),
    };
  });
}
