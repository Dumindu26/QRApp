import axios from 'axios';

const BASE = '/api/promo-screens';

export interface PromoScreen {
  id: string;
  restaurantId: string;
  name: string;
  slug: string;
  token: string;
  active: boolean;
  rotationSeconds: number;
  fitMode: 'cover' | 'contain';
  backgroundColor: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  activeItemCount?: number;
  restaurantName?: string;
  restaurantLogo?: string | null;
}

export interface PromoScreenItem {
  id: string;
  screenId: string;
  restaurantId: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromoScreenPayload {
  name: string;
  slug?: string;
  active?: boolean;
  rotationSeconds?: number;
  fitMode?: 'cover' | 'contain';
  backgroundColor?: string;
}

export interface PromoScreenItemPayload {
  title?: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string | null;
  active?: boolean;
  sortOrder?: number;
}

export const promoScreenService = {
  listScreens(): Promise<PromoScreen[]> {
    return axios.get<PromoScreen[]>(BASE).then((r) => r.data);
  },

  createScreen(data: PromoScreenPayload): Promise<PromoScreen> {
    return axios.post<PromoScreen>(BASE, data).then((r) => r.data);
  },

  updateScreen(id: string, data: Partial<PromoScreenPayload>): Promise<PromoScreen> {
    return axios.patch<PromoScreen>(`${BASE}/${id}`, data).then((r) => r.data);
  },

  refreshScreen(id: string): Promise<PromoScreen> {
    return axios.post<PromoScreen>(`${BASE}/${id}/refresh`).then((r) => r.data);
  },

  deleteScreen(id: string): Promise<void> {
    return axios.delete(`${BASE}/${id}`).then(() => {});
  },

  listItems(screenId: string): Promise<PromoScreenItem[]> {
    return axios.get<PromoScreenItem[]>(`${BASE}/${screenId}/items`).then((r) => r.data);
  },

  createItem(screenId: string, data: PromoScreenItemPayload): Promise<PromoScreenItem> {
    return axios.post<PromoScreenItem>(`${BASE}/${screenId}/items`, data).then((r) => r.data);
  },

  updateItem(itemId: string, data: Partial<PromoScreenItemPayload>): Promise<PromoScreenItem> {
    return axios.patch<PromoScreenItem>(`${BASE}/items/${itemId}`, data).then((r) => r.data);
  },

  deleteItem(itemId: string): Promise<void> {
    return axios.delete(`${BASE}/items/${itemId}`).then(() => {});
  },

  getPublicDisplay(token: string): Promise<{ screen: PromoScreen; items: PromoScreenItem[] }> {
    return axios.get<{ screen: PromoScreen; items: PromoScreenItem[] }>(`${BASE}/public/${token}`).then((r) => r.data);
  },
};
