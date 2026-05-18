/** Краткая подпись стола для списков бронирований */
export function reservationTableLabel(reservation) {
  if (!reservation?.table) return '';
  const base = `стол №${reservation.table.number}`;
  const extraIds = Array.isArray(reservation.combinedWithTableIds)
    ? reservation.combinedWithTableIds.filter((id) => Number.isFinite(Number(id)))
    : [];
  if (extraIds.length > 0) {
    return `${base} + ещё ${extraIds.length} ${extraIds.length === 1 ? 'стол' : 'стола'}`;
  }
  if (reservation.extraChair) {
    return `${base} (доп. места)`;
  }
  return base;
}
