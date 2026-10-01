import { buildApiV1Url } from '@/config/apiBaseUrl';

/**
 * Painel de administração: lê o que `core/admin/admin.routes.ts` já expõe.
 * Só role `admin`, permissão `admin` ou super-admin passam pelo gate da API.
 */

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTenants: number;
  totalProjects: number;
  totalModels: number;
  planBreakdown: { plan: string | null; count: number }[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminTenant {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  subscription: { plan?: string } | null;
  createdAt: string;
  userCount: number;
  projectCount: number;
  modelCount: number;
  storageBytes: number;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  userEmail: string;
  createdAt: string;
  details?: Record<string, unknown> | null;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}` };
}

async function get<T>(path: string, fallback: string): Promise<T> {
  const response = await fetch(buildApiV1Url(`/admin${path}`), { headers: authHeaders() });
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.message || body?.error || '';
    } catch {
      /* sem corpo JSON */
    }
    throw new Error(detail || fallback);
  }
  return response.json();
}

export const adminService = {
  stats: () => get<AdminStats>('/stats', 'Não foi possível carregar os totais.'),

  users: async (limit = 8) => {
    const r = await get<{ users: AdminUser[]; total: number }>(`/users?limit=${limit}`, 'Não foi possível carregar os usuários.');
    return r;
  },

  tenants: async () => {
    const r = await get<{ tenants: AdminTenant[]; total: number }>('/tenants', 'Não foi possível carregar as organizações.');
    return r;
  },

  audit: async (limit = 10) => {
    const r = await get<{ logs: AdminAuditLog[]; total: number }>(`/audit?limit=${limit}`, 'Não foi possível carregar a auditoria.');
    return r;
  },
};
