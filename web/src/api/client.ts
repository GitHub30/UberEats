import type {
  AdminAnalytics,
  Driver,
  MenuItem,
  Order,
  OrderEvent,
  OrderMessage,
  PlatformSettings,
  Store,
} from '../types';

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) || 'https://ubereats-api.6u.workers.dev';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `API Error (${res.status})`);
  }
  return data as T;
}

export const api = {
  health: () => apiFetch<{ ok: boolean; storesCount: number }>('/api/health'),

  // Settings
  getSettings: () => apiFetch<PlatformSettings>('/api/settings'),
  updateSettings: (payload: Partial<PlatformSettings>) =>
    apiFetch<PlatformSettings>('/api/settings', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Stores & Menu
  listStores: (params?: { partner?: '1' | '0'; include_unlisted?: boolean; category?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.partner) sp.set('partner', params.partner);
    if (params?.include_unlisted) sp.set('include_unlisted', '1');
    if (params?.category && params.category !== 'すべて') sp.set('category', params.category);
    if (params?.q) sp.set('q', params.q);
    const qs = sp.toString();
    return apiFetch<{ stores: Store[] }>(`/api/stores${qs ? `?${qs}` : ''}`);
  },
  getStore: (id: string) => apiFetch<{ store: Store; menu: MenuItem[] }>(`/api/stores/${id}`),
  createStore: (payload: Partial<Store>) =>
    apiFetch<{ store: Store }>('/api/stores', { method: 'POST', body: JSON.stringify(payload) }),
  updateStore: (id: string, payload: Partial<Store>) =>
    apiFetch<{ store: Store }>(`/api/stores/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteStore: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/api/stores/${id}`, {
      method: 'DELETE',
      headers: { 'X-MachiEats-Action': 'confirm' },
    }),
  addMenuItem: (storeId: string, payload: Partial<MenuItem>) =>
    apiFetch<{ item: MenuItem }>(`/api/stores/${storeId}/menu`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMenuItem: (itemId: string, payload: Partial<MenuItem>) =>
    apiFetch<{ item: MenuItem }>(`/api/menu/${itemId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteMenuItem: (itemId: string) =>
    apiFetch<{ deleted: boolean }>(`/api/menu/${itemId}`, { method: 'DELETE' }),

  // Drivers
  listDrivers: () => apiFetch<{ drivers: Driver[] }>('/api/drivers'),
  createDriver: (payload: Partial<Driver>) =>
    apiFetch<{ driver: Driver }>('/api/drivers', { method: 'POST', body: JSON.stringify(payload) }),
  updateDriver: (id: string, payload: Partial<Driver>) =>
    apiFetch<{ driver: Driver }>(`/api/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Orders
  listOrders: (params?: {
    status?: string;
    store_id?: string;
    driver_id?: string;
    order_type?: string;
    available_for_driver?: boolean;
  }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.store_id) sp.set('store_id', params.store_id);
    if (params?.driver_id) sp.set('driver_id', params.driver_id);
    if (params?.order_type) sp.set('order_type', params.order_type);
    if (params?.available_for_driver) sp.set('available_for_driver', '1');
    const qs = sp.toString();
    return apiFetch<{ orders: Order[] }>(`/api/orders${qs ? `?${qs}` : ''}`);
  },
  getOrder: (id: string) =>
    apiFetch<{ order: Order; events: OrderEvent[]; messages: OrderMessage[] }>(`/api/orders/${id}`),
  createOrder: (payload: Record<string, unknown>) =>
    apiFetch<{ order: Order }>('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  createCustomProxyOrder: (payload: Record<string, unknown>) =>
    apiFetch<{ order: Order; store_id: string }>('/api/orders/custom-proxy', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Order Actions
  merchantAccept: (id: string, estimated_prep_min: number) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/merchant-accept`, {
      method: 'POST',
      body: JSON.stringify({ estimated_prep_min }),
    }),
  merchantReady: (id: string) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/merchant-ready`, { method: 'POST', body: '{}' }),
  merchantReject: (id: string, reason: string) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/merchant-reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  driverAccept: (id: string, driver_id: string) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/driver-accept`, {
      method: 'POST',
      body: JSON.stringify({ driver_id }),
    }),
  proxyStartOrdering: (id: string, driver_id?: string) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/proxy-start-ordering`, {
      method: 'POST',
      body: JSON.stringify({ driver_id }),
    }),
  proxyConfirmPurchase: (
    id: string,
    payload: {
      actual_subtotal: number;
      receipt_image_url?: string;
      receipt_note?: string;
      driver_id?: string;
      driver_store_payment_method?: 'proxy_card' | 'cash' | 'paypay' | 'suica';
    }
  ) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/proxy-confirm-purchase`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  driverPickup: (id: string, driver_id?: string) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/driver-pickup`, {
      method: 'POST',
      body: JSON.stringify({ driver_id }),
    }),
  driverDeliver: (id: string, dropoff_image_url?: string, driver_id?: string) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/driver-deliver`, {
      method: 'POST',
      body: JSON.stringify({ dropoff_image_url, driver_id }),
    }),
  cancelOrder: (id: string, payload: { reason: string; actor_role: string; actor_name: string }) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitReview: (id: string, payload: { store_rating: number; driver_rating: number; comment: string }) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminUpdateOrder: (id: string, payload: { status?: string; driver_id?: string | null; note?: string }) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/admin`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Messages
  listMessages: (orderId: string) =>
    apiFetch<{ messages: OrderMessage[] }>(`/api/orders/${orderId}/messages`),
  sendMessage: (
    orderId: string,
    payload: { sender_role: string; sender_name: string; body: string; image_url?: string }
  ) =>
    apiFetch<{ messages: OrderMessage[] }>(`/api/orders/${orderId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Media (Cloudflare KV)
  uploadMedia: (dataUrl: string) =>
    apiFetch<{ id: string; url: string }>('/api/media', {
      method: 'POST',
      body: JSON.stringify({ dataUrl }),
    }),

  // Admin
  getAnalytics: () => apiFetch<AdminAnalytics>('/api/admin/analytics'),
  resetDemo: () =>
    apiFetch<{ ok: boolean; message: string }>('/api/admin/reset-demo', {
      method: 'POST',
      headers: { 'X-MachiEats-Action': 'confirm' },
    }),
};

export function formatYen(amount: number | null | undefined): string {
  const n = Math.round(Number(amount || 0));
  return `¥${n.toLocaleString('ja-JP')}`;
}

export function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function resolveAssetUrl(path: string): string {
  if (!path) return `${import.meta.env.BASE_URL}images/hero.webp`;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const clean = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${clean}`;
}

export async function compressImageFile(file: File, maxDim = 960): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

/** Generates a crisp realistic Japanese paper takeout receipt image on canvas for instant KV upload testing */
export function generateReceiptDataUrl(
  order: Order,
  actualSubtotal: number,
  storePayLabel = 'MachiEats 代理決済プリペイドカード（済）'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  // Paper background with subtle warm tone
  ctx.fillStyle = '#F7F5EE';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle shadow edge & receipt card
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(28, 22, 424, 596);
  ctx.strokeStyle = '#E4E0D5';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(28, 22, 424, 596);

  ctx.fillStyle = '#1A1A18';
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px "Noto Sans JP", sans-serif';
  ctx.fillText('領 収 書（テイクアウト）', 240, 74);

  ctx.font = 'bold 17px "Noto Sans JP", sans-serif';
  ctx.fillText(order.store_name.slice(0, 22), 240, 108);

  ctx.fillStyle = '#66635B';
  ctx.font = '12px "Noto Sans JP", sans-serif';
  ctx.fillText(order.store_address.slice(0, 34), 240, 132);
  ctx.fillText(`発行日時: ${new Date().toLocaleString('ja-JP')}`, 240, 152);
  ctx.fillText(`注文管理コード: ${order.order_code} / 店頭持ち帰り`, 240, 170);

  // Dashed divider
  ctx.strokeStyle = '#BDB8AA';
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(52, 192);
  ctx.lineTo(428, 192);
  ctx.stroke();
  ctx.setLineDash([]);

  // Items
  let y = 224;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1A1A18';
  ctx.font = '14px "Noto Sans JP", sans-serif';
  for (const item of order.items.slice(0, 7)) {
    const label = `${item.name.slice(0, 18)} ×${item.quantity}`;
    ctx.fillText(label, 54, y);
    ctx.textAlign = 'right';
    ctx.fillText(`¥${(item.unit_price * item.quantity).toLocaleString('ja-JP')}`, 426, y);
    ctx.textAlign = 'left';
    y += 30;
  }

  if (actualSubtotal !== order.estimated_subtotal) {
    const diff = actualSubtotal - order.estimated_subtotal;
    ctx.fillStyle = '#66635B';
    ctx.fillText('容器代・店頭価格調整', 54, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${diff >= 0 ? '+' : ''}¥${diff.toLocaleString('ja-JP')}`, 426, y);
    ctx.textAlign = 'left';
    y += 30;
  }

  // Total divider
  y = Math.max(y + 12, 420);
  ctx.strokeStyle = '#1A1A18';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(52, y);
  ctx.lineTo(428, y);
  ctx.stroke();

  y += 36;
  ctx.fillStyle = '#1A1A18';
  ctx.font = 'bold 20px "Noto Sans JP", sans-serif';
  ctx.fillText('合 計（税込8% 軽減税率）', 54, y);
  ctx.textAlign = 'right';
  ctx.fillText(`¥${actualSubtotal.toLocaleString('ja-JP')}`, 426, y);

  y += 34;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#068449';
  ctx.font = 'bold 13px "Noto Sans JP", sans-serif';
  ctx.fillText(`店頭決済: ${storePayLabel}`, 54, y);

  // Stamp
  ctx.strokeStyle = '#C85A17';
  ctx.lineWidth = 2;
  ctx.strokeRect(310, 520, 114, 52);
  ctx.fillStyle = '#C85A17';
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px "Noto Sans JP", sans-serif';
  ctx.fillText('店頭決済済', 367, 543);
  ctx.font = '11px "Noto Sans JP", sans-serif';
  ctx.fillText('TAKEOUT PAID', 367, 562);

  return canvas.toDataURL('image/jpeg', 0.88);
}
