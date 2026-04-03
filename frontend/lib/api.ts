const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// ─── Leads ─────────────────────────────────────────────────────────────────

export const api = {
  leads: {
    list: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString();
      return apiFetch(`/api/leads${qs ? '?' + qs : ''}`);
    },
    get: (id: number) => apiFetch(`/api/leads/${id}`),
    update: (id: number, data: any) => apiFetch(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/api/leads/${id}`, { method: 'DELETE' }),
    bulk: (data: any) => apiFetch('/api/leads/bulk', { method: 'POST', body: JSON.stringify(data) }),
    import: (file: File, mapping: any) => {
      const form = new FormData();
      form.append('file', file);
      form.append('mapping', JSON.stringify(mapping));
      return fetch(`${API_BASE}/api/leads/import`, { method: 'POST', body: form }).then(r => r.json());
    },
    countByFilter: (filters: any) => apiFetch(`/api/leads/count/by-filter?filters=${encodeURIComponent(JSON.stringify(filters))}`),
    meta: {
      sources: () => apiFetch('/api/leads/meta/sources'),
      tags: () => apiFetch('/api/leads/meta/tags'),
      countries: () => apiFetch('/api/leads/meta/countries'),
      industries: () => apiFetch('/api/leads/meta/industries'),
    },
  },

  templates: {
    list: () => apiFetch('/api/templates'),
    get: (id: number) => apiFetch(`/api/templates/${id}`),
    create: (data: any) => apiFetch('/api/templates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/api/templates/${id}`, { method: 'DELETE' }),
  },

  campaigns: {
    list: () => apiFetch('/api/campaigns'),
    get: (id: number) => apiFetch(`/api/campaigns/${id}`),
    create: (data: any) => apiFetch('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch(`/api/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' }),
    send: (id: number) => apiFetch(`/api/campaigns/${id}/send`, { method: 'POST' }),
    pause: (id: number) => apiFetch(`/api/campaigns/${id}/pause`, { method: 'POST' }),
    stats: (id: number) => apiFetch(`/api/campaigns/${id}/stats`),
    previewLeads: (filters: any) => apiFetch(`/api/campaigns/preview/leads?filters=${encodeURIComponent(JSON.stringify(filters))}`),
  },

  settings: {
    get: () => apiFetch('/api/settings'),
    update: (data: any) => apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },

  email: {
    testSmtp: () => apiFetch('/api/email/test', { method: 'POST' }),
    sendTest: (to: string) => apiFetch(`/api/email/send-test?to_email=${encodeURIComponent(to)}`, { method: 'POST' }),
  },

  analytics: {
    overview: () => apiFetch('/api/analytics/overview'),
    campaigns: () => apiFetch('/api/analytics/campaigns'),
    leadsTimeline: () => apiFetch('/api/analytics/leads/timeline'),
    statusBreakdown: () => apiFetch('/api/analytics/leads/status-breakdown'),
  },
};
