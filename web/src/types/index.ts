export type PaymentMethodType =
  | 'credit_card'
  | 'cash'
  | 'paypay'
  | 'suica'
  | 'apple_pay'
  | 'rakuten_pay'
  | 'd_barai';

export type PaymentStatus = 'paid' | 'cash_on_delivery' | 'cash_collected' | 'refunded';
export type BillingProfile = 'personal' | 'business';
export type DriverStorePaymentMethod = 'proxy_card' | 'cash' | 'paypay' | 'suica';

export interface WalletMethod {
  id: string;
  type: PaymentMethodType;
  label: string;
  sublabel?: string;
  brand?: 'visa' | 'mastercard' | 'jcb' | 'amex';
  promoHint?: string;
}

export interface PlatformSettings {
  id: number;
  base_delivery_fee: number;
  proxy_order_fee: number;
  service_fee_rate: number;
  merchant_commission_rate: number;
  driver_base_payout: number;
  driver_proxy_bonus: number;
  updated_at: string;
}

export interface MenuOptionChoice {
  label: string;
  price: number;
}

export interface MenuOptionGroup {
  name: string;
  choices: MenuOptionChoice[];
}

export interface Store {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  area: string;
  phone: string;
  lat: number;
  lng: number;
  image_url: string;
  is_partner: boolean;
  is_unlisted_request: boolean;
  is_open: boolean;
  busy_mode: boolean;
  avg_prep_min: number;
  rating: number;
  review_count: number;
  takeout_notes: string;
  available_item_count?: number;
  total_orders?: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  store_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  options: MenuOptionGroup[];
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle_type: 'bicycle' | 'ebike' | 'scooter' | 'car';
  is_online: boolean;
  proxy_card_enabled: boolean;
  is_approved: boolean;
  current_lat: number;
  current_lng: number;
  rating: number;
  completed_deliveries: number;
  total_earnings: number;
  active_order_count?: number;
  created_at: string;
}

export interface OrderItem {
  menu_item_id?: string;
  name: string;
  unit_price: number;
  quantity: number;
  selected_options?: string[];
  note?: string;
  is_custom?: boolean;
}

export type OrderStatus =
  | 'placed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'driver_heading_to_store'
  | 'proxy_ordering'
  | 'proxy_waiting'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  order_code: string;
  order_type: 'partner' | 'proxy_takeout';
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_note: string;
  delivery_lat: number;
  delivery_lng: number;
  store_id: string;
  store_name: string;
  store_address: string;
  store_lat: number;
  store_lng: number;
  store_is_partner: boolean;
  takeout_notes: string;
  driver_id: string | null;
  driver_name: string | null;
  driver_lat?: number | null;
  driver_lng?: number | null;
  driver_vehicle?: string | null;
  driver_phone?: string | null;
  driver_rating?: number | null;
  items: OrderItem[];
  estimated_subtotal: number;
  actual_subtotal: number | null;
  price_diff: number;
  delivery_fee: number;
  service_fee: number;
  proxy_fee: number;
  tip_amount: number;
  discount_amount: number;
  voucher_code: string;
  total_amount: number;
  driver_payout: number;
  payment_method: PaymentMethodType;
  payment_label: string;
  payment_status: PaymentStatus;
  billing_profile: BillingProfile;
  driver_store_payment_method: DriverStorePaymentMethod;
  substitution_policy: 'contact' | 'similar' | 'cancel_item';
  max_budget_overage: number;
  receipt_image_url: string | null;
  receipt_note: string | null;
  dropoff_image_url: string | null;
  estimated_prep_min: number | null;
  cancel_reason: string | null;
  customer_rating_store: number | null;
  customer_rating_driver: number | null;
  customer_review_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderEvent {
  id: number;
  order_id: string;
  actor_role: string;
  actor_name: string;
  event_type: string;
  message: string;
  created_at: string;
  store_name?: string;
  order_type?: string;
}

export interface OrderMessage {
  id: number;
  order_id: string;
  sender_role: 'customer' | 'driver' | 'merchant' | 'admin';
  sender_name: string;
  body: string;
  image_url: string | null;
  created_at: string;
}

export interface AdminAnalytics {
  summary: {
    total_orders: number;
    active_orders: number;
    completed_orders: number;
    cancelled_orders: number;
    partner_orders: number;
    proxy_orders: number;
    total_gmv: number;
    partner_gmv: number;
    proxy_gmv: number;
    commission_revenue: number;
    fee_revenue: number;
    driver_payout_total: number;
    net_platform_revenue: number;
    total_stores: number;
    partner_stores: number;
    non_partner_stores: number;
    unlisted_stores: number;
    online_drivers: number;
    total_drivers: number;
    proxy_capable_drivers: number;
  };
  status_counts: Record<string, number>;
  payment_breakdown: Array<{ payment_method: PaymentMethodType; count: number; total_amount: number }>;
  recent_events: OrderEvent[];
}

export interface CartItem {
  key: string;
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  selected_options: string[];
  note: string;
}
