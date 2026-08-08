import { Ficha, User } from '../types';

/**
 * Calculates the age of a ficha in hours relative to a given timestamp.
 */
export function getFichaAgeHours(ficha: Ficha, nowMs: number = Date.now()): number {
  let timestamp: number | null = null;

  if (ficha.createdAt) {
    const t = new Date(ficha.createdAt).getTime();
    if (!isNaN(t)) timestamp = t;
  }

  if (!timestamp && ficha.data) {
    const t = new Date(`${ficha.data}T00:00:00`).getTime();
    if (!isNaN(t)) timestamp = t;
  }

  if (!timestamp && typeof ficha.id === 'number' && ficha.id > 1000000000000) {
    timestamp = ficha.id;
  }

  if (!timestamp) return 0;

  const diffMs = nowMs - timestamp;
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

/**
 * Determines whether a ficha is pending for more than 48 hours.
 */
export function isFichaPendingOver48h(ficha: Ficha, nowMs: number = Date.now()): boolean {
  // A ficha is pending if explicitly 'pendente' or if status is not set (defaults to pending)
  const isPending = !ficha.status || ficha.status === 'pendente';
  if (!isPending) return false;

  const ageHours = getFichaAgeHours(ficha, nowMs);
  return ageHours >= 48;
}

/**
 * Returns all fichas that are pending over 48h, optionally scoped to a user/coordination.
 */
export function getPendingFichasOver48h(
  fichas: Ficha[],
  user?: User | null,
  nowMs: number = Date.now()
): Ficha[] {
  return fichas.filter((f) => {
    // If user is supervisor, check if ficha belongs to their coordination or user ID
    if (user && user.tipo !== 'admin') {
      const belongsToUser =
        f.userId === user.id ||
        (user.coordId && f.coordId === user.coordId);
      if (!belongsToUser) return false;
    }
    return isFichaPendingOver48h(f, nowMs);
  });
}
