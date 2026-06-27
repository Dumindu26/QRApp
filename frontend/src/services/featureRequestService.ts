import axios from 'axios';

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

export type RequestType = 'feature' | 'bug';
export type RequestStatus = 'open' | 'in_progress' | 'resolved' | 'declined';

export interface FeatureRequest {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  submittedBy: string;
  submitterName: string;
  type: RequestType;
  title: string;
  description: string;
  status: RequestStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

export const featureRequestService = {
  /** Restaurant admin/manager — submit a feature request or bug report. */
  create: (data: { type: RequestType; title: string; description: string }): Promise<FeatureRequest> =>
    axios.post<FeatureRequest>(`${BASE}/feature-requests`, data).then((r) => r.data),

  /** Restaurant admin/manager — own restaurant's submissions. */
  listMine: (): Promise<FeatureRequest[]> =>
    axios.get<FeatureRequest[]>(`${BASE}/feature-requests/mine`).then((r) => r.data),

  /** Super admin — all submissions, optionally filtered. */
  listAll: (filters?: { status?: RequestStatus; type?: RequestType }): Promise<FeatureRequest[]> =>
    axios.get<FeatureRequest[]>(`${BASE}/feature-requests`, { params: filters }).then((r) => r.data),

  /** Super admin — count of open submissions (header badge). */
  openCount: (): Promise<number> =>
    axios.get<{ count: number }>(`${BASE}/feature-requests/open-count`).then((r) => r.data.count),

  /** Super admin — update status and/or add a note. */
  update: (id: string, data: { status?: RequestStatus; adminNote?: string }): Promise<FeatureRequest> =>
    axios.patch<FeatureRequest>(`${BASE}/feature-requests/${id}`, data).then((r) => r.data),
};
