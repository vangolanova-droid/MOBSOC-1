import { User, UserRole } from '../types';

export const ALL_ROLES: UserRole[] = ['admin', 'admin_junior', 'coordenador', 'supervisor', 'mobilizador'];

export function roleLabel(tipo?: UserRole | string): string {
  switch (tipo) {
    case 'admin':
      return 'Administrador Geral';
    case 'admin_junior':
      return 'Administrador Júnior (Visualizador UNICEF)';
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

export function isAdminJunior(user?: User | null): boolean {
  return user?.tipo === 'admin_junior';
}

export function isReadOnlyEvaluator(user?: User | null): boolean {
  return user?.tipo === 'admin_junior';
}

export function hasElevatedAccess(user?: User | null): boolean {
  return user?.tipo === 'admin' || user?.tipo === 'admin_junior' || user?.tipo === 'coordenador';
}

export function canManageUsers(user?: User | null): boolean {
  return isAdmin(user);
}

export function canRegisterOthers(user?: User | null): boolean {
  return isAdmin(user);
}

export function canRegisterMobilizador(user?: User | null): boolean {
  if (isReadOnlyEvaluator(user)) return false;
  return isAdmin(user) || user?.tipo === 'supervisor' || user?.tipo === 'coordenador';
}

export function canMutateData(user?: User | null): boolean {
  if (isReadOnlyEvaluator(user)) return false;
  return true;
}

export function canManageCoordinations(user?: User | null): boolean {
  return isAdmin(user) || user?.tipo === 'coordenador';
}

export function getAccessibleCoordIds(user?: User | null): number[] | null {
  if (!user) return [];
  if (isAdmin(user) || isAdminJunior(user)) return null; // null significa acesso a todas para visualização
  if (user.tipo === 'coordenador') {
    return user.coordIds || (user.coordId != null ? [user.coordId] : []);
  }
  return user.coordId != null ? [user.coordId] : [];
}

export function hasAccessToCoord(user?: User | null, coordId?: number | null): boolean {
  if (isAdmin(user) || isAdminJunior(user)) return true;
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
  if (isReadOnlyEvaluator(user)) return false;
  if (isAdmin(user)) return true;
  if (user?.tipo === 'coordenador') return hasAccessToCoord(user, fichaCoordId);
  return false;
}

export function canDeleteApprovedFicha(user?: User | null): boolean {
  if (isReadOnlyEvaluator(user)) return false;
  return isAdmin(user);
}

export function canDeleteFicha(user?: User | null, ficha?: { coordId?: number | null; status?: string }): boolean {
  if (isReadOnlyEvaluator(user)) return false;
  if (isAdmin(user)) return true;
  if (ficha?.status === 'aprovada') return false;
  if (user?.tipo === 'coordenador') return hasAccessToCoord(user, ficha?.coordId);
  return false;
}

export function canViewFinancas(user?: User | null): boolean {
  return hasElevatedAccess(user);
}
