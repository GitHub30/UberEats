import type { OrderStatus } from '../types';

export const STATUS_META: Record<OrderStatus, { label: string; tone: string }> = {
  placed: { label: '受付・手配待ち', tone: 'badge-warn' },
  preparing: { label: '店舗で調理中', tone: 'badge-info' },
  ready_for_pickup: { label: '受取準備OK', tone: 'badge-partner' },
  driver_heading_to_store: { label: 'ドライバー店舗移動中', tone: 'badge-proxy' },
  proxy_ordering: { label: '店頭で代理注文中', tone: 'badge-proxy' },
  proxy_waiting: { label: '店頭決済済・調理待ち', tone: 'badge-info' },
  delivering: { label: '配達中', tone: 'badge-partner' },
  delivered: { label: '配達完了', tone: 'badge-neutral' },
  cancelled: { label: 'キャンセル', tone: 'badge-danger' },
};

export function StatusBadge({ status, orderType }: { status: OrderStatus; orderType?: 'partner' | 'proxy_takeout' }) {
  const meta = STATUS_META[status] || { label: status, tone: 'badge-neutral' };
  let label = meta.label;
  if (status === 'placed') {
    label = orderType === 'proxy_takeout' ? '代理ドライバー募集中' : '店舗の承認待ち';
  }
  return <span className={`badge ${meta.tone}`}>{label}</span>;
}

export function OrderTypeBadge({ isPartner }: { isPartner: boolean }) {
  return isPartner ? (
    <span className="badge badge-partner">公式提携店</span>
  ) : (
    <span className="badge badge-proxy">非提携・持ち帰り代理注文</span>
  );
}

export function vehicleLabel(v: string | null | undefined): string {
  switch (v) {
    case 'bicycle':
      return '自転車';
    case 'ebike':
      return '電動アシスト自転車';
    case 'scooter':
      return '原付・バイク';
    case 'car':
      return '軽貨物・車';
    default:
      return 'バイク';
  }
}

export function substitutionLabel(policy: string): string {
  switch (policy) {
    case 'contact':
      return 'チャットで相談する';
    case 'similar':
      return '似た商品で代替OK';
    case 'cancel_item':
      return '品切れ商品のみ除外';
    default:
      return policy;
  }
}
