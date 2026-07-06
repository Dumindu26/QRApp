import axios from 'axios';

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

export type DemoRequestStatus = 'open' | 'sent' | 'declined';

export interface DemoRequestRecord {
  id: string;
  name: string;
  email: string;
  restaurantName: string;
  phone: string;
  message: string;
  status: DemoRequestStatus;
  demoUsername: string;
  adminNote: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const demoRequestService = {
  /** Public — marketing site "Request a demo" form. */
  create: (data: { name: string; email: string; restaurantName: string; phone?: string; message?: string }): Promise<{ id: string }> =>
    axios.post<{ id: string }>(`${BASE}/demo-requests`, data).then((r) => r.data),

  /** Super admin — all requests, optionally filtered by status. */
  listAll: (status?: DemoRequestStatus): Promise<DemoRequestRecord[]> =>
    axios.get<DemoRequestRecord[]>(`${BASE}/demo-requests`, { params: status ? { status } : undefined }).then((r) => r.data),

  /** Super admin — count of open submissions (header badge). */
  openCount: (): Promise<number> =>
    axios.get<{ count: number }>(`${BASE}/demo-requests/open-count`).then((r) => r.data.count),

  /** Super admin — send demo credentials by email; marks the request as sent. */
  sendCredentials: (id: string, data: { username: string; password: string; note?: string }): Promise<DemoRequestRecord> =>
    axios.patch<DemoRequestRecord>(`${BASE}/demo-requests/${id}/send`, data).then((r) => r.data),

  /** Super admin — decline a request (no email sent). */
  decline: (id: string): Promise<DemoRequestRecord> =>
    axios.patch<DemoRequestRecord>(`${BASE}/demo-requests/${id}`, { status: 'declined' }).then((r) => r.data),
};
