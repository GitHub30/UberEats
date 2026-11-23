-- MachiEats (UberEats-style Food Delivery with Non-Partner Proxy Takeout & Multi-Payment Support)
-- Cloudflare D1 Schema

DROP TABLE IF EXISTS order_messages;
DROP TABLE IF EXISTS order_events;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS platform_settings;

CREATE TABLE platform_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  base_delivery_fee INTEGER NOT NULL DEFAULT 320,
  proxy_order_fee INTEGER NOT NULL DEFAULT 250,
  service_fee_rate REAL NOT NULL DEFAULT 0.10,
  merchant_commission_rate REAL NOT NULL DEFAULT 0.25,
  driver_base_payout INTEGER NOT NULL DEFAULT 380,
  driver_proxy_bonus INTEGER NOT NULL DEFAULT 240,
  updated_at TEXT NOT NULL
);

CREATE TABLE stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT '渋谷',
  phone TEXT NOT NULL DEFAULT '',
  lat REAL NOT NULL DEFAULT 35.6595,
  lng REAL NOT NULL DEFAULT 139.7005,
  image_url TEXT NOT NULL DEFAULT 'images/hero.webp',
  is_partner INTEGER NOT NULL DEFAULT 1,
  is_unlisted_request INTEGER NOT NULL DEFAULT 0,
  is_open INTEGER NOT NULL DEFAULT 1,
  busy_mode INTEGER NOT NULL DEFAULT 0,
  avg_prep_min INTEGER NOT NULL DEFAULT 20,
  rating REAL NOT NULL DEFAULT 4.7,
  review_count INTEGER NOT NULL DEFAULT 0,
  takeout_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE menu_items (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'メイン',
  options_json TEXT NOT NULL DEFAULT '[]',
  is_available INTEGER NOT NULL DEFAULT 1,
  is_popular INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_menu_items_store ON menu_items(store_id);

CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'ebike',
  is_online INTEGER NOT NULL DEFAULT 1,
  proxy_card_enabled INTEGER NOT NULL DEFAULT 1,
  is_approved INTEGER NOT NULL DEFAULT 1,
  current_lat REAL NOT NULL DEFAULT 35.6580,
  current_lng REAL NOT NULL DEFAULT 139.7016,
  rating REAL NOT NULL DEFAULT 4.9,
  completed_deliveries INTEGER NOT NULL DEFAULT 0,
  total_earnings INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL,
  order_type TEXT NOT NULL, -- 'partner' | 'proxy_takeout'
  status TEXT NOT NULL,     -- placed | preparing | ready_for_pickup | driver_heading_to_store | proxy_ordering | proxy_waiting | delivering | delivered | cancelled
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_note TEXT NOT NULL DEFAULT '',
  delivery_lat REAL NOT NULL DEFAULT 35.6540,
  delivery_lng REAL NOT NULL DEFAULT 139.7060,
  store_id TEXT NOT NULL REFERENCES stores(id),
  store_name TEXT NOT NULL,
  store_address TEXT NOT NULL,
  store_lat REAL NOT NULL DEFAULT 35.6595,
  store_lng REAL NOT NULL DEFAULT 139.7005,
  store_is_partner INTEGER NOT NULL DEFAULT 1,
  takeout_notes TEXT NOT NULL DEFAULT '',
  driver_id TEXT REFERENCES drivers(id),
  driver_name TEXT,
  items_json TEXT NOT NULL DEFAULT '[]',
  estimated_subtotal INTEGER NOT NULL DEFAULT 0,
  actual_subtotal INTEGER,
  price_diff INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 320,
  service_fee INTEGER NOT NULL DEFAULT 0,
  proxy_fee INTEGER NOT NULL DEFAULT 0,
  tip_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  voucher_code TEXT NOT NULL DEFAULT '',
  total_amount INTEGER NOT NULL DEFAULT 0,
  driver_payout INTEGER NOT NULL DEFAULT 380,
  payment_method TEXT NOT NULL DEFAULT 'credit_card', -- credit_card | cash | paypay | suica | apple_pay | rakuten_pay | d_barai
  payment_label TEXT NOT NULL DEFAULT 'Visa •••• 4919',
  payment_status TEXT NOT NULL DEFAULT 'paid',        -- paid | cash_on_delivery | cash_collected | refunded
  billing_profile TEXT NOT NULL DEFAULT 'personal',   -- personal | business
  driver_store_payment_method TEXT NOT NULL DEFAULT 'proxy_card',
  substitution_policy TEXT NOT NULL DEFAULT 'contact',
  max_budget_overage INTEGER NOT NULL DEFAULT 300,
  receipt_image_url TEXT,
  receipt_note TEXT,
  dropoff_image_url TEXT,
  estimated_prep_min INTEGER,
  cancel_reason TEXT,
  customer_rating_store INTEGER,
  customer_rating_driver INTEGER,
  customer_review_comment TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_driver ON orders(driver_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

CREATE TABLE order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_role TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_order_events_order ON order_events(order_id);

CREATE TABLE order_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_order_messages_order ON order_messages(order_id);
