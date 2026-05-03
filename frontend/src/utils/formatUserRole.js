/** Человекочитаемые роли (в API по-прежнему OWNER / CLIENT / ADMIN). */
export function formatUserRole(role) {
  if (role === 'OWNER') return 'Ресторатор';
  if (role === 'CLIENT') return 'Гость';
  if (role === 'ADMIN') return 'Администратор';
  return role || '—';
}
