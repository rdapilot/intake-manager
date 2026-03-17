import { DashboardData, FormRequest, FormTemplate, RequestStatus, VerificationResult } from './types';

const jsonHeaders = { 'Content-Type': 'application/json' };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed.' }));
    throw new Error(error.message || 'Request failed.');
  }

  return response.json() as Promise<T>;
}

export const api = {
  getDashboard: () => request<DashboardData>('/api/dashboard'),
  createTemplate: (payload: Partial<FormTemplate>) =>
    request<FormTemplate>('/api/templates', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }),
  createRequest: (payload: Partial<FormRequest>) =>
    request<FormRequest>('/api/requests', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }),
  updateRequestStatus: (id: string, status: RequestStatus, actor: string, detail?: string) =>
    request<FormRequest>('/api/requests/' + id + '/status', {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ status, actor, detail })
    }),
  createBundle: (payload: { title: string; category: string; requestIds: string[]; owner: string }) =>
    request('/api/bundles', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }),
  verifyRequest: (id: string) =>
    request<VerificationResult>('/api/requests/' + id + '/verify', {
      method: 'POST'
    }),
  exportRequest: (id: string) => request<Record<string, unknown>>('/api/requests/' + id + '/export')
};
