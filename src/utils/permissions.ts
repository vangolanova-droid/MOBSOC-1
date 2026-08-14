import { User, UserRole } from '../types';

export const ALL_ROLES: UserRole[] = ['admin', 'coordenador', 'supervisor', 'mobilizador'];

export function roleLabel(tipo?: UserRole | string): string {
  switch (tipo) {
    case 'admin':
      return 'Administrador';
    case 'coordenador':
      return 'Coordenador de Zona';
    case 'supervisor':
      return 'Supervisor';
    case 'mobilizador':
      return 'Mobilizador Comunitário';
    default:
      return tipo || 'Utilizador';
  }
}

export function isAdmin(user?: User | null): boolean {
  return user?.tipo === 'admin';
}

export function hasElevatedAccess(user?: User | null): boolean {
  return user?.tipo === 'admin' || user?.tipo === 'coordenador';
}

export function canManageUsers(user?: User | null): boolean {
  return isAdmin(user);
}

export function canManageCoordinations(user?: User | null): boolean {
  return isAdmin(user) || user?.tipo === 'coordenador';
}

export function getAccessibleCoordIds(user?: User | null): number[] | null {
  if (!user) return [];
  if (isAdmin(user)) return null; // null significa acesso a todas
  if (user.tipo === 'coordenador') {
    return user.coordIds || (user.coordId != null ? [user.coordId] : []);
  }
  return user.coordId != null ? [user.coordId] : [];
}

export function hasAccessToCoord(user?: User | null, coordId?: number | null): boolean {
  if (isAdmin(user)) return true;
  if (coordId == null) return false;
  const ids = getAccessibleCoordIds(user);
  if (ids === null) return true;
  return ids.includes(Number(coordId));
}

export function scopeByCoord<T extends { coordId?: number | null }>(
  user: User | null | undefined,
  items: T[]
): T[] {
  if (!user) return [];
  const ids = getAccessibleCoordIds(user);
  if (ids === null) return items;
  return items.filter((item) => item.coordId != null && ids.includes(Number(item.coordId)));
}

export function canApproveFicha(user?: User | null, fichaCoordId?: number | null): boolean {
  if (isAdmin(user)) return true;
  if (user?.tipo === 'coordenador') return hasAccessToCoord(user, fichaCoordId);
  return false;
}

export function canDeleteApprovedFicha(user?: User | null): boolean {
  return isAdmin(user);
}

export function canDeleteFicha(user?: User | null, ficha?: { coordId?: number | null; status?: string }): boolean {
  if (isAdmin(user)) return true;
  if (ficha?.status === 'aprovada') return false;
  if (user?.tipo === 'coordenador') return hasAccessToCoord(user, ficha?.coordId);
  return false;
}

export function canViewFinancas(user?: User | null): boolean {
  return hasElevatedAccess(user);
}
