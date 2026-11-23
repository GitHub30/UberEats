import { seedDatabase } from './seed';

export interface Env {
  DB: D1Database;
  MEDIA_KV: KVNamespace;
  ADMIN_TOKEN?: string;
}

const ALLOWED_ORIGINS = new Set([
  'https://github30.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
]);

const VALID_STATUSES = new Set([
  'placed',
  'preparing',
  'ready_for_pickup',
  'driver_heading_to_store',
  'proxy_ordering',
  'proxy_waiting',
  'delivering',
  'delivered',
  'cancelled',
]);

const VALID_SUBSTITUTION_POLICIES = new Set(['contact', 'similar', 'cancel_item']);
const VALID_VEHICLES = new Set(['bicycle', 'ebike', 'scooter', 'car']);
const VALID_ACTOR_ROLES = new Set(['customer', 'driver', 'merchant', 'admin']);
const VALID_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const VALID_PAYMENT_METHODS: Record<string, string> = {
  credit_card: 'クレジットカード',
  cash: '現金（配達時払い）',
  paypay: 'PayPay',
  suica: 'モバイルSuica / 交通系IC',
  apple_pay: 'Apple Pay / タッチ決済',
  rakuten_pay: '楽天ペイ',
  d_barai: 'd払い',
};
const VALID_BILLING_PROFILES = new Set(['personal', 'business']);
const VALID_DRIVER_STORE_PAYMENTS = new Set(['proxy_card', 'cash', 'paypay', 'suica']);
const SAFE_STORE_IMAGE_RE = /^images\/[a-z0-9_-]+\.webp$/i;
const SAFE_MEDIA_ID_RE = /^[a-zA-Z0-9_-]{6,48}$/;

function resolvePaymentMeta(body: Record<string, unknown>) {
  const rawMethod = typeof body.payment_method === 'string' ? body.payment_method.trim().toLowerCase() : 'credit_card';
  const method = rawMethod in VALID_PAYMENT_METHODS ? rawMethod : 'credit_card';
  const rawLabel = typeof body.payment_label === 'string' ? body.payment_label.trim().slice(0, 60) : '';
  const label = rawLabel || VALID_PAYMENT_METHODS[method];
  const status = method === 'cash' ? 'cash_on_delivery' : 'paid';
  const billingProfile = VALID_BILLING_PROFILES.has(String(body.billing_profile))
    ? String(body.billing_profile)
    : 'personal';
  return { method, label, status, billingProfile };
}

function computeServerDiscount(
  voucherCodeRaw: unknown,
  useWalletCash: boolean,
  subtotal: number,
  proxyFee: number,
  paymentMethod: string
): { voucherCode: string; discountAmount: number } {
  const code = typeof voucherCodeRaw === 'string' ? voucherCodeRaw.trim().toUpperCase().slice(0, 24) : '';
  let discount = 0;
  let appliedCode = '';
  if (code === 'WELCOME500' && subtotal >= 1000) {
    discount += 500;
    appliedCode = code;
  } else if (code === 'PROXY250' && proxyFee > 0) {
    discount += proxyFee;
    appliedCode = code;
  } else if (code === 'PAYPAY100' && paymentMethod === 'paypay') {
    discount += 100;
    appliedCode = code;
  } else if (code === 'SUICA100' && paymentMethod === 'suica') {
    discount += 100;
    appliedCode = code;
  }
  if (useWalletCash) {
    discount += 500;
  }
  return {
    voucherCode: appliedCode,
    discountAmount: Math.min(discount, subtotal + proxyFee),
  };
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

function buildCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-MachiEats-Action',
    Vary: 'Origin',
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (!origin) {
    headers['Access-Control-Allow-Origin'] = 'https://github30.github.io';
  }
  return headers;
}

function makeResponder(request: Request) {
  const cors = buildCorsHeaders(request);
  return {
    cors,
    json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...SECURITY_HEADERS,
          ...cors,
          ...extraHeaders,
        },
      });
    },
    error(message: string, status = 400): Response {
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...SECURITY_HEADERS,
          ...cors,
        },
      });
    },
  };
}

class BadRequestError extends Error {}

async function parseJsonObject(request: Request, allowEmpty = false): Promise<Record<string, unknown>> {
  const contentLen = Number(request.headers.get('content-length') || 0);
  if (contentLen > 3_200_000) {
    throw new BadRequestError('リクエストサイズが大きすぎます');
  }
  const text = await request.text();
  if (!text.trim()) {
    if (allowEmpty) return {};
    throw new BadRequestError('JSONボディが必要です');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BadRequestError('JSONの形式が正しくありません');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestError('JSONオブジェクトを指定してください');
  }
  return parsed as Record<string, unknown>;
}

function clampStr(v: unknown, maxLen = 240, fallback = ''): string {
  if (typeof v !== 'string') return fallback;
  return v.trim().slice(0, maxLen);
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clampFloat(v: unknown, min: number, max: number, fallback: number): number {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function maskPhone(phone: unknown): string {
  const s = String(phone || '');
  const parts = s.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-****-${parts[2]}`;
  }
  return s.length > 4 ? `***-${s.slice(-4)}` : '';
}

function randomCode(len = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[buf[i] % chars.length];
  }
  return out;
}

function makeOrderId(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const num = 1000 + (buf[0] % 9000);
  return `ORD-${num}${randomCode(3)}`;
}

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

function verifyImageMagicBytes(bytes: Uint8Array, contentType: string): boolean {
  if (bytes.length < 12) return false;
  if (contentType === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (contentType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === 'image/webp') {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

function validateSafeMediaUrl(rawUrl: unknown, origin: string): string | null {
  if (typeof rawUrl !== 'string') return null;
  const prefix = `${origin}/api/media/`;
  if (!rawUrl.startsWith(prefix)) return null;
  const mediaId = rawUrl.slice(prefix.length);
  if (!SAFE_MEDIA_ID_RE.test(mediaId)) return null;
  return `${prefix}${mediaId}`;
}

function validateSafeStoreImage(rawUrl: unknown, origin: string, fallback = 'images/hero.webp'): string {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return fallback;
  const trimmed = rawUrl.trim();
  if (SAFE_STORE_IMAGE_RE.test(trimmed)) return trimmed;
  const safeMedia = validateSafeMediaUrl(trimmed, origin);
  if (safeMedia) return safeMedia;
  return fallback;
}

interface MenuOptionGroup {
  name: string;
  choices: Array<{ label: string; price: number }>;
}

function sanitizeMenuOptions(raw: unknown): MenuOptionGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: MenuOptionGroup[] = [];
  for (const g of raw.slice(0, 8)) {
    if (!g || typeof g !== 'object') continue;
    const rec = g as Record<string, unknown>;
    const name = clampStr(rec.name, 50);
    if (!name || !Array.isArray(rec.choices)) continue;
    const choices: Array<{ label: string; price: number }> = [];
    for (const c of rec.choices.slice(0, 12)) {
      if (!c || typeof c !== 'object') continue;
      const cr = c as Record<string, unknown>;
      const label = clampStr(cr.label, 50);
      if (!label) continue;
      choices.push({ label, price: clampInt(cr.price, 0, 50000, 0) });
    }
    if (choices.length > 0) {
      groups.push({ name, choices });
    }
  }
  return groups;
}

interface SettingsRow {
  id: number;
  base_delivery_fee: number;
  proxy_order_fee: number;
  service_fee_rate: number;
  merchant_commission_rate: number;
  driver_base_payout: number;
  driver_proxy_bonus: number;
  updated_at: string;
}

async function getSettings(db: D1Database): Promise<SettingsRow> {
  const row = await db.prepare('SELECT * FROM platform_settings WHERE id = 1').first<SettingsRow>();
  if (row) return row;
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT OR IGNORE INTO platform_settings
       (id, base_delivery_fee, proxy_order_fee, service_fee_rate, merchant_commission_rate, driver_base_payout, driver_proxy_bonus, updated_at)
       VALUES (1, 320, 250, 0.10, 0.25, 380, 240, ?)`
    )
    .bind(now)
    .run();
  return {
    id: 1,
    base_delivery_fee: 320,
    proxy_order_fee: 250,
    service_fee_rate: 0.1,
    merchant_commission_rate: 0.25,
    driver_base_payout: 380,
    driver_proxy_bonus: 240,
    updated_at: now,
  };
}

function formatOrder(row: Record<string, unknown>) {
  return {
    ...row,
    customer_phone: maskPhone(row.customer_phone),
    driver_phone: row.driver_phone ? maskPhone(row.driver_phone) : null,
    store_is_partner: Boolean(row.store_is_partner),
    items: safeJsonParse(row.items_json as string, []),
  };
}

function formatStore(row: Record<string, unknown>) {
  return {
    ...row,
    is_partner: Boolean(row.is_partner),
    is_unlisted_request: Boolean(row.is_unlisted_request),
    is_open: Boolean(row.is_open),
    busy_mode: Boolean(row.busy_mode),
  };
}

function formatMenuItem(row: Record<string, unknown>) {
  return {
    ...row,
    is_available: Boolean(row.is_available),
    is_popular: Boolean(row.is_popular),
    options: sanitizeMenuOptions(safeJsonParse(row.options_json as string, [])),
  };
}

function formatDriver(row: Record<string, unknown>) {
  return {
    ...row,
    phone: maskPhone(row.phone),
    is_online: Boolean(row.is_online),
    proxy_card_enabled: Boolean(row.proxy_card_enabled),
    is_approved: Boolean(row.is_approved),
  };
}

async function addOrderEvent(
  db: D1Database,
  orderId: string,
  actorRole: string,
  actorName: string,
  eventType: string,
  message: string
) {
  await db
    .prepare(
      `INSERT INTO order_events (order_id, actor_role, actor_name, event_type, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(orderId, actorRole, actorName, eventType, message, new Date().toISOString())
    .run();
}

function requireAdminGuard(request: Request, env: Env, requireConfirmHeader = false): string | null {
  if (env.ADMIN_TOKEN) {
    const auth = request.headers.get('Authorization') || '';
    if (auth !== `Bearer ${env.ADMIN_TOKEN}`) {
      return '管理者認証が必要です';
    }
  }
  if (requireConfirmHeader && request.headers.get('X-MachiEats-Action') !== 'confirm') {
    return '確認ヘッダ（X-MachiEats-Action: confirm）が必要です';
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const resp = makeResponder(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...resp.cors } });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const isRead = method === 'GET' || method === 'HEAD';

    try {
      // ================================================================
      // HEALTH CHECK & MACHINE-READABLE LLMO CATALOG
      // ================================================================
      if (path === '/api/health' && isRead) {
        if (method === 'HEAD') {
          return new Response(null, { status: 200, headers: { ...SECURITY_HEADERS, ...resp.cors } });
        }
        const count = await env.DB.prepare('SELECT COUNT(*) as c FROM stores').first<{ c: number }>();
        return resp.json({
          ok: true,
          service: 'ubereats-api',
          storesCount: count?.c ?? 0,
          timestamp: new Date().toISOString(),
        });
      }

      if (path === '/api/llms.json' && isRead) {
        if (method === 'HEAD') {
          return new Response(null, {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...resp.cors },
          });
        }
        const [settings, storesRes] = await Promise.all([
          getSettings(env.DB),
          env.DB.prepare(
            'SELECT id, name, category, area, address, is_partner, is_open, busy_mode, avg_prep_min, rating, review_count, takeout_notes FROM stores WHERE is_unlisted_request = 0 ORDER BY is_partner DESC, rating DESC LIMIT 100'
          ).all(),
        ]);
        return resp.json(
          {
            name: 'MachiEats',
            site: 'https://github30.github.io/UberEats/',
            llms_txt: 'https://github30.github.io/UberEats/llms.txt',
            llms_full_txt: 'https://github30.github.io/UberEats/llms-full.txt',
            description:
              '公式提携レストランと非提携店舗（ドライバー店頭持ち帰り代理注文）の両方に対応するフードデリバリーPWAプラットフォーム',
            apps: {
              portal: 'https://github30.github.io/UberEats/',
              customer: 'https://github30.github.io/UberEats/customer/',
              driver: 'https://github30.github.io/UberEats/driver/',
              merchant: 'https://github30.github.io/UberEats/merchant/',
              admin: 'https://github30.github.io/UberEats/admin/',
            },
            pricing: {
              currency: 'JPY',
              base_delivery_fee: settings.base_delivery_fee,
              proxy_order_fee: settings.proxy_order_fee,
              service_fee_rate: settings.service_fee_rate,
              merchant_commission_rate: settings.merchant_commission_rate,
              driver_base_payout: settings.driver_base_payout,
              driver_proxy_bonus: settings.driver_proxy_bonus,
            },
            stores: (storesRes.results || []).map((s) => formatStore(s as Record<string, unknown>)),
            updated_at: new Date().toISOString(),
          },
          200,
          { 'Cache-Control': 'public, max-age=60' }
        );
      }

      // ================================================================
      // MEDIA UPLOAD & SERVING (Cloudflare KV + Magic-Byte Validation + TTL)
      // ================================================================
      if (path === '/api/media' && method === 'POST') {
        const body = await parseJsonObject(request);
        if (!body.dataUrl || typeof body.dataUrl !== 'string') {
          return resp.error('dataUrl is required');
        }
        const match = body.dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i);
        if (!match) {
          return resp.error('PNG / JPEG / WebP 形式の画像をアップロードしてください');
        }
        const contentType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
        const b64 = match[2];
        if (b64.length > 2_800_000) {
          return resp.error('画像サイズは2MB以下にしてください', 413);
        }
        let binStr: string;
        try {
          binStr = atob(b64);
        } catch {
          return resp.error('Base64エンコードが不正です', 400);
        }
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        if (!verifyImageMagicBytes(bytes, contentType)) {
          return resp.error('画像データの形式が不正です（ヘッダ検証エラー）', 400);
        }
        const mediaId = `${Date.now().toString(36)}-${randomCode(8).toLowerCase()}`;
        await env.MEDIA_KV.put(mediaId, bytes.buffer, {
          expirationTtl: 60 * 60 * 24 * 30,
          metadata: { contentType },
        });
        return resp.json(
          {
            id: mediaId,
            url: `${url.origin}/api/media/${mediaId}`,
            contentType,
          },
          201
        );
      }

      const mediaMatch = path.match(/^\/api\/media\/([a-zA-Z0-9_-]+)$/);
      if (mediaMatch && isRead) {
        const mediaId = mediaMatch[1];
        if (!SAFE_MEDIA_ID_RE.test(mediaId)) {
          return resp.error('Not found', 404);
        }
        const { value, metadata } = await env.MEDIA_KV.getWithMetadata<{ contentType?: string }>(
          mediaId,
          'arrayBuffer'
        );
        if (!value) {
          return new Response('Not found', { status: 404, headers: { ...SECURITY_HEADERS, ...resp.cors } });
        }
        const safeType =
          metadata?.contentType && VALID_MEDIA_TYPES.has(metadata.contentType)
            ? metadata.contentType
            : 'image/jpeg';
        const headers: Record<string, string> = {
          'Content-Type': safeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Security-Policy': "default-src 'none'; sandbox",
          ...SECURITY_HEADERS,
          ...resp.cors,
        };
        return new Response(method === 'HEAD' ? null : value, { status: 200, headers });
      }

      // ================================================================
      // PLATFORM SETTINGS
      // ================================================================
      if (path === '/api/settings' && method === 'GET') {
        const settings = await getSettings(env.DB);
        return resp.json(settings);
      }

      if (path === '/api/settings' && method === 'PATCH') {
        const authErr = requireAdminGuard(request, env);
        if (authErr) return resp.error(authErr, 403);
        const body = await parseJsonObject(request);
        const current = await getSettings(env.DB);
        const now = new Date().toISOString();
        await env.DB.prepare(
          `UPDATE platform_settings SET
            base_delivery_fee = ?,
            proxy_order_fee = ?,
            service_fee_rate = ?,
            merchant_commission_rate = ?,
            driver_base_payout = ?,
            driver_proxy_bonus = ?,
            updated_at = ?
           WHERE id = 1`
        )
          .bind(
            clampInt(body.base_delivery_fee, 0, 5000, current.base_delivery_fee),
            clampInt(body.proxy_order_fee, 0, 5000, current.proxy_order_fee),
            clampFloat(body.service_fee_rate, 0, 0.4, current.service_fee_rate),
            clampFloat(body.merchant_commission_rate, 0, 0.5, current.merchant_commission_rate),
            clampInt(body.driver_base_payout, 0, 5000, current.driver_base_payout),
            clampInt(body.driver_proxy_bonus, 0, 5000, current.driver_proxy_bonus),
            now
          )
          .run();
        const updated = await getSettings(env.DB);
        return resp.json(updated);
      }

      // ================================================================
      // STORES & MENU ITEMS
      // ================================================================
      if (path === '/api/stores' && method === 'GET') {
        const partnerParam = url.searchParams.get('partner');
        const includeUnlisted = url.searchParams.get('include_unlisted') === '1';
        const category = url.searchParams.get('category');
        const q = url.searchParams.get('q')?.trim().toLowerCase();

        let sql = `
          SELECT s.*,
            (SELECT COUNT(*) FROM menu_items m WHERE m.store_id = s.id AND m.is_available = 1) as available_item_count,
            (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id) as total_orders
          FROM stores s
          WHERE 1=1
        `;
        const binds: unknown[] = [];

        if (!includeUnlisted) {
          sql += ' AND s.is_unlisted_request = 0';
        }
        if (partnerParam === '1' || partnerParam === '0') {
          sql += ' AND s.is_partner = ?';
          binds.push(Number(partnerParam));
        }
        if (category && category !== 'すべて') {
          sql += ' AND s.category = ?';
          binds.push(category);
        }
        sql += ' ORDER BY s.is_open DESC, s.is_partner DESC, s.rating DESC, s.created_at DESC LIMIT 100';

        const stmt = env.DB.prepare(sql);
        const res = binds.length > 0 ? await stmt.bind(...binds).all() : await stmt.all();
        let stores = (res.results || []).map((r) => formatStore(r as Record<string, unknown>));

        if (q) {
          stores = stores.filter((s: Record<string, unknown>) =>
            String(s.name).toLowerCase().includes(q) ||
            String(s.category).toLowerCase().includes(q) ||
            String(s.area).toLowerCase().includes(q) ||
            String(s.description).toLowerCase().includes(q)
          );
        }

        return resp.json({ stores });
      }

      if (path === '/api/stores' && method === 'POST') {
        const authErr = requireAdminGuard(request, env);
        if (authErr) return resp.error(authErr, 403);
        const body = await parseJsonObject(request);
        const name = clampStr(body.name, 80);
        const address = clampStr(body.address, 160);
        if (!name || !address) {
          return resp.error('店舗名と住所は必須です');
        }
        const id = `store-${Date.now().toString(36)}-${randomCode(4).toLowerCase()}`;
        const now = new Date().toISOString();
        const lat = clampFloat(body.lat, -90, 90, 35.656 + (Math.random() - 0.5) * 0.015);
        const lng = clampFloat(body.lng, -180, 180, 139.704 + (Math.random() - 0.5) * 0.015);

        await env.DB.prepare(
          `INSERT INTO stores (
            id, name, category, description, address, area, phone, lat, lng, image_url,
            is_partner, is_unlisted_request, is_open, busy_mode, avg_prep_min, rating, review_count, takeout_notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 4.7, 0, ?, ?)`
        )
          .bind(
            id,
            name,
            clampStr(body.category, 40, 'その他'),
            clampStr(body.description, 400),
            address,
            clampStr(body.area, 40, '渋谷'),
            clampStr(body.phone, 30),
            lat,
            lng,
            validateSafeStoreImage(body.image_url, url.origin),
            body.is_partner ? 1 : 0,
            body.is_unlisted_request ? 1 : 0,
            body.is_open === false ? 0 : 1,
            clampInt(body.avg_prep_min, 5, 120, 20),
            clampStr(body.takeout_notes, 400),
            now
          )
          .run();

        const created = await env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(id).first();
        return resp.json({ store: formatStore(created as Record<string, unknown>) }, 201);
      }

      const storeDetailMatch = path.match(/^\/api\/stores\/([^/]+)$/);
      if (storeDetailMatch && method === 'GET') {
        const storeId = storeDetailMatch[1];
        const store = await env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
        if (!store) return resp.error('店舗が見つかりません', 404);
        const itemsRes = await env.DB.prepare(
          'SELECT * FROM menu_items WHERE store_id = ? ORDER BY sort_order ASC, is_popular DESC, name ASC LIMIT 100'
        )
          .bind(storeId)
          .all();
        return resp.json({
          store: formatStore(store as Record<string, unknown>),
          menu: (itemsRes.results || []).map((m) => formatMenuItem(m as Record<string, unknown>)),
        });
      }

      if (storeDetailMatch && method === 'PATCH') {
        const storeId = storeDetailMatch[1];
        const existing = await env.DB.prepare('SELECT * FROM stores WHERE id = ?')
          .bind(storeId)
          .first<Record<string, unknown>>();
        if (!existing) return resp.error('店舗が見つかりません', 404);
        const body = await parseJsonObject(request);

        await env.DB.prepare(
          `UPDATE stores SET
            name = ?,
            category = ?,
            description = ?,
            address = ?,
            area = ?,
            phone = ?,
            image_url = ?,
            is_partner = ?,
            is_unlisted_request = ?,
            is_open = ?,
            busy_mode = ?,
            avg_prep_min = ?,
            takeout_notes = ?
           WHERE id = ?`
        )
          .bind(
            body.name !== undefined ? clampStr(body.name, 80, String(existing.name)) : existing.name,
            body.category !== undefined ? clampStr(body.category, 40, String(existing.category)) : existing.category,
            body.description !== undefined ? clampStr(body.description, 400) : existing.description,
            body.address !== undefined ? clampStr(body.address, 160, String(existing.address)) : existing.address,
            body.area !== undefined ? clampStr(body.area, 40, String(existing.area)) : existing.area,
            body.phone !== undefined ? clampStr(body.phone, 30) : existing.phone,
            body.image_url !== undefined
              ? validateSafeStoreImage(body.image_url, url.origin, String(existing.image_url))
              : existing.image_url,
            body.is_partner !== undefined ? (body.is_partner ? 1 : 0) : existing.is_partner,
            body.is_unlisted_request !== undefined ? (body.is_unlisted_request ? 1 : 0) : existing.is_unlisted_request,
            body.is_open !== undefined ? (body.is_open ? 1 : 0) : existing.is_open,
            body.busy_mode !== undefined ? (body.busy_mode ? 1 : 0) : existing.busy_mode,
            body.avg_prep_min !== undefined
              ? clampInt(body.avg_prep_min, 5, 120, Number(existing.avg_prep_min))
              : existing.avg_prep_min,
            body.takeout_notes !== undefined ? clampStr(body.takeout_notes, 400) : existing.takeout_notes,
            storeId
          )
          .run();

        const updated = await env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
        return resp.json({ store: formatStore(updated as Record<string, unknown>) });
      }

      if (storeDetailMatch && method === 'DELETE') {
        const authErr = requireAdminGuard(request, env, true);
        if (authErr) return resp.error(authErr, 403);
        const storeId = storeDetailMatch[1];
        const refCount = await env.DB.prepare('SELECT COUNT(*) as c FROM orders WHERE store_id = ?')
          .bind(storeId)
          .first<{ c: number }>();
        if ((refCount?.c ?? 0) > 0) {
          return resp.error('注文履歴が存在する店舗は削除できません（営業停止にしてください）', 409);
        }
        await env.DB.prepare('DELETE FROM stores WHERE id = ?').bind(storeId).run();
        return resp.json({ deleted: true, id: storeId });
      }

      const storeMenuMatch = path.match(/^\/api\/stores\/([^/]+)\/menu$/);
      if (storeMenuMatch && method === 'POST') {
        const storeId = storeMenuMatch[1];
        const store = await env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(storeId).first();
        if (!store) return resp.error('店舗が見つかりません', 404);
        const body = await parseJsonObject(request);
        const name = clampStr(body.name, 80);
        const price = clampInt(body.price, 1, 100000, 0);
        if (!name || price <= 0) {
          return resp.error('商品名と正しい価格を入力してください');
        }
        const safeOptions = sanitizeMenuOptions(body.options);
        const id = `item-${Date.now().toString(36)}-${randomCode(4).toLowerCase()}`;
        await env.DB.prepare(
          `INSERT INTO menu_items (id, store_id, name, description, price, category, options_json, is_available, is_popular, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 99)`
        )
          .bind(
            id,
            storeId,
            name,
            clampStr(body.description, 300),
            price,
            clampStr(body.category, 40, 'メイン'),
            JSON.stringify(safeOptions),
            body.is_popular ? 1 : 0
          )
          .run();
        const item = await env.DB.prepare('SELECT * FROM menu_items WHERE id = ?').bind(id).first();
        return resp.json({ item: formatMenuItem(item as Record<string, unknown>) }, 201);
      }

      const menuItemMatch = path.match(/^\/api\/menu\/([^/]+)$/);
      if (menuItemMatch && method === 'PATCH') {
        const itemId = menuItemMatch[1];
        const existing = await env.DB.prepare('SELECT * FROM menu_items WHERE id = ?')
          .bind(itemId)
          .first<Record<string, unknown>>();
        if (!existing) return resp.error('メニューが見つかりません', 404);
        const body = await parseJsonObject(request);

        await env.DB.prepare(
          `UPDATE menu_items SET
            name = ?,
            description = ?,
            price = ?,
            category = ?,
            is_available = ?,
            is_popular = ?
           WHERE id = ?`
        )
          .bind(
            body.name !== undefined ? clampStr(body.name, 80, String(existing.name)) : existing.name,
            body.description !== undefined ? clampStr(body.description, 300) : existing.description,
            body.price !== undefined ? clampInt(body.price, 1, 100000, Number(existing.price)) : existing.price,
            body.category !== undefined ? clampStr(body.category, 40, String(existing.category)) : existing.category,
            body.is_available !== undefined ? (body.is_available ? 1 : 0) : existing.is_available,
            body.is_popular !== undefined ? (body.is_popular ? 1 : 0) : existing.is_popular,
            itemId
          )
          .run();
        const updated = await env.DB.prepare('SELECT * FROM menu_items WHERE id = ?').bind(itemId).first();
        return resp.json({ item: formatMenuItem(updated as Record<string, unknown>) });
      }

      if (menuItemMatch && method === 'DELETE') {
        const itemId = menuItemMatch[1];
        await env.DB.prepare('DELETE FROM menu_items WHERE id = ?').bind(itemId).run();
        return resp.json({ deleted: true, id: itemId });
      }

      // ================================================================
      // DRIVERS
      // ================================================================
      if (path === '/api/drivers' && method === 'GET') {
        const res = await env.DB.prepare(
          `SELECT d.*,
            (SELECT COUNT(*) FROM orders o WHERE o.driver_id = d.id AND o.status NOT IN ('delivered', 'cancelled')) as active_order_count
           FROM drivers d
           ORDER BY d.is_online DESC, d.completed_deliveries DESC LIMIT 100`
        ).all();
        return resp.json({
          drivers: (res.results || []).map((d) => formatDriver(d as Record<string, unknown>)),
        });
      }

      if (path === '/api/drivers' && method === 'POST') {
        const authErr = requireAdminGuard(request, env);
        if (authErr) return resp.error(authErr, 403);
        const body = await parseJsonObject(request);
        const name = clampStr(body.name, 60);
        if (!name) return resp.error('ドライバー名は必須です');
        const vehicle = VALID_VEHICLES.has(String(body.vehicle_type)) ? String(body.vehicle_type) : 'ebike';
        const id = `drv-${Date.now().toString(36)}-${randomCode(4).toLowerCase()}`;
        const now = new Date().toISOString();
        await env.DB.prepare(
          `INSERT INTO drivers (id, name, phone, vehicle_type, is_online, proxy_card_enabled, is_approved, current_lat, current_lng, rating, completed_deliveries, total_earnings, created_at)
           VALUES (?, ?, ?, ?, 1, ?, 1, 35.6580, 139.7016, 5.0, 0, 0, ?)`
        )
          .bind(
            id,
            name,
            clampStr(body.phone, 30, '090-0000-0000'),
            vehicle,
            body.proxy_card_enabled === false ? 0 : 1,
            now
          )
          .run();
        const driver = await env.DB.prepare('SELECT * FROM drivers WHERE id = ?').bind(id).first();
        return resp.json({ driver: formatDriver(driver as Record<string, unknown>) }, 201);
      }

      const driverMatch = path.match(/^\/api\/drivers\/([^/]+)$/);
      if (driverMatch && method === 'PATCH') {
        const driverId = driverMatch[1];
        const existing = await env.DB.prepare('SELECT * FROM drivers WHERE id = ?')
          .bind(driverId)
          .first<Record<string, unknown>>();
        if (!existing) return resp.error('ドライバーが見つかりません', 404);
        const body = await parseJsonObject(request);
        const nextVehicle =
          body.vehicle_type !== undefined && VALID_VEHICLES.has(String(body.vehicle_type))
            ? String(body.vehicle_type)
            : existing.vehicle_type;

        const nextLat = clampFloat(body.current_lat, -90, 90, Number(existing.current_lat));
        const nextLng = clampFloat(body.current_lng, -180, 180, Number(existing.current_lng));

        await env.DB.prepare(
          `UPDATE drivers SET
            name = ?,
            phone = ?,
            vehicle_type = ?,
            is_online = ?,
            proxy_card_enabled = ?,
            is_approved = ?,
            current_lat = ?,
            current_lng = ?
           WHERE id = ?`
        )
          .bind(
            body.name !== undefined ? clampStr(body.name, 60, String(existing.name)) : existing.name,
            body.phone !== undefined ? clampStr(body.phone, 30, String(existing.phone)) : existing.phone,
            nextVehicle,
            body.is_online !== undefined ? (body.is_online ? 1 : 0) : existing.is_online,
            body.proxy_card_enabled !== undefined ? (body.proxy_card_enabled ? 1 : 0) : existing.proxy_card_enabled,
            body.is_approved !== undefined ? (body.is_approved ? 1 : 0) : existing.is_approved,
            nextLat,
            nextLng,
            driverId
          )
          .run();
        const updated = await env.DB.prepare('SELECT * FROM drivers WHERE id = ?').bind(driverId).first();
        return resp.json({ driver: formatDriver(updated as Record<string, unknown>) });
      }

      // ================================================================
      // ORDERS — LIST & CREATE (Server-Authoritative Pricing)
      // ================================================================
      if (path === '/api/orders' && method === 'GET') {
        const status = url.searchParams.get('status');
        const storeId = url.searchParams.get('store_id');
        const driverId = url.searchParams.get('driver_id');
        const orderType = url.searchParams.get('order_type');
        const availableForDriver = url.searchParams.get('available_for_driver') === '1';

        let sql = `
          SELECT o.*,
            d.current_lat as driver_lat,
            d.current_lng as driver_lng,
            d.vehicle_type as driver_vehicle,
            d.phone as driver_phone,
            d.rating as driver_rating
          FROM orders o
          LEFT JOIN drivers d ON o.driver_id = d.id
          WHERE 1=1
        `;
        const binds: unknown[] = [];

        if (availableForDriver) {
          sql += ` AND o.driver_id IS NULL AND (
            (o.order_type = 'partner' AND o.status IN ('preparing', 'ready_for_pickup'))
            OR (o.order_type = 'proxy_takeout' AND o.status = 'placed')
          )`;
        } else {
          if (status && VALID_STATUSES.has(status)) {
            sql += ' AND o.status = ?';
            binds.push(status);
          }
          if (storeId) {
            sql += ' AND o.store_id = ?';
            binds.push(storeId);
          }
          if (driverId) {
            sql += ' AND o.driver_id = ?';
            binds.push(driverId);
          }
          if (orderType === 'partner' || orderType === 'proxy_takeout') {
            sql += ' AND o.order_type = ?';
            binds.push(orderType);
          }
        }

        sql += ' ORDER BY o.created_at DESC LIMIT 100';
        const stmt = env.DB.prepare(sql);
        const res = binds.length > 0 ? await stmt.bind(...binds).all() : await stmt.all();
        return resp.json({
          orders: (res.results || []).map((r) => formatOrder(r as Record<string, unknown>)),
        });
      }

      if (path === '/api/orders' && method === 'POST') {
        const body = await parseJsonObject(request);
        const storeId = clampStr(body.store_id, 80);
        const rawItems = body.items;
        if (!storeId || !Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 30) {
          return resp.error('店舗と商品（1〜30点）を正しく指定してください');
        }
        const store = await env.DB.prepare('SELECT * FROM stores WHERE id = ?')
          .bind(storeId)
          .first<Record<string, unknown>>();
        if (!store) return resp.error('指定された店舗が見つかりません', 404);
        if (!store.is_open) return resp.error('現在この店舗は営業時間外です', 409);

        const isPartner = Boolean(store.is_partner);
        const orderType = isPartner ? 'partner' : 'proxy_takeout';

        const menuRes = await env.DB.prepare('SELECT * FROM menu_items WHERE store_id = ?')
          .bind(storeId)
          .all<Record<string, unknown>>();
        const menuMap = new Map<string, Record<string, unknown>>();
        for (const m of menuRes.results || []) {
          menuMap.set(String(m.id), m);
        }

        const cleanItems: Array<{
          menu_item_id: string;
          name: string;
          unit_price: number;
          quantity: number;
          selected_options: string[];
          note: string;
          is_custom?: boolean;
        }> = [];

        for (const rawIt of rawItems) {
          if (!rawIt || typeof rawIt !== 'object') return resp.error('商品データの形式が不正です');
          const it = rawIt as Record<string, unknown>;
          const qty = clampInt(it.quantity, 1, 50, 1);
          const reqOpts = Array.isArray(it.selected_options)
            ? it.selected_options.slice(0, 10).map((s) => clampStr(s, 60))
            : [];
          const note = clampStr(it.note, 200);
          const menuItemId = clampStr(it.menu_item_id, 80);

          if (menuItemId && menuMap.has(menuItemId)) {
            const dbItem = menuMap.get(menuItemId)!;
            if (!dbItem.is_available) {
              return resp.error(`「${dbItem.name}」は現在売り切れです`, 409);
            }
            const optionGroups = sanitizeMenuOptions(safeJsonParse(dbItem.options_json as string, []));
            let optionExtra = 0;
            const verifiedOptions: string[] = [];
            for (const g of optionGroups) {
              for (const ch of g.choices) {
                if (reqOpts.includes(ch.label)) {
                  optionExtra += ch.price;
                  verifiedOptions.push(ch.label);
                  break;
                }
              }
            }
            cleanItems.push({
              menu_item_id: String(dbItem.id),
              name: String(dbItem.name),
              unit_price: Number(dbItem.price) + optionExtra,
              quantity: qty,
              selected_options: verifiedOptions,
              note,
            });
          } else if (!isPartner) {
            const itemName = clampStr(it.name, 80);
            if (!itemName) return resp.error('商品名を入力してください');
            cleanItems.push({
              menu_item_id: '',
              name: itemName,
              unit_price: clampInt(it.unit_price, 50, 100000, 1000),
              quantity: qty,
              selected_options: ['店頭メニュー自由指定'],
              note,
              is_custom: true,
            });
          } else {
            return resp.error('公式提携店のメニューIDが無効です', 400);
          }
        }

        const settings = await getSettings(env.DB);
        const estimatedSubtotal = cleanItems.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
        const deliveryFee = settings.base_delivery_fee;
        const serviceFee = Math.round(estimatedSubtotal * settings.service_fee_rate);
        const proxyFee = isPartner ? 0 : settings.proxy_order_fee;
        const tipAmount = clampInt(body.tip_amount, 0, 50000, 0);
        const payment = resolvePaymentMeta(body);
        const { voucherCode, discountAmount } = computeServerDiscount(
          body.voucher_code,
          Boolean(body.use_wallet_cash),
          estimatedSubtotal,
          proxyFee,
          payment.method
        );
        const totalAmount = Math.max(
          0,
          estimatedSubtotal + deliveryFee + serviceFee + proxyFee + tipAmount - discountAmount
        );
        const driverPayout =
          settings.driver_base_payout + (isPartner ? 0 : settings.driver_proxy_bonus) + tipAmount;

        const orderId = makeOrderId();
        const orderCode = randomCode(4);
        const now = new Date().toISOString();
        const customerName = clampStr(body.customer_name, 60, 'ゲストユーザー');
        const subPolicy = VALID_SUBSTITUTION_POLICIES.has(String(body.substitution_policy))
          ? String(body.substitution_policy)
          : 'contact';

        const deliveryLat = clampFloat(body.delivery_lat, -90, 90, 35.6542 + (Math.random() - 0.5) * 0.01);
        const deliveryLng = clampFloat(body.delivery_lng, -180, 180, 139.7042 + (Math.random() - 0.5) * 0.01);

        await env.DB.prepare(
          `INSERT INTO orders (
            id, order_code, order_type, status,
            customer_name, customer_phone, delivery_address, delivery_note, delivery_lat, delivery_lng,
            store_id, store_name, store_address, store_lat, store_lng, store_is_partner, takeout_notes,
            items_json, estimated_subtotal, actual_subtotal, price_diff,
            delivery_fee, service_fee, proxy_fee, tip_amount, discount_amount, voucher_code, total_amount, driver_payout,
            payment_method, payment_label, payment_status, billing_profile, driver_store_payment_method,
            substitution_policy, max_budget_overage, estimated_prep_min,
            created_at, updated_at
          ) VALUES (?, ?, ?, 'placed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proxy_card', ?, ?, ?, ?, ?)`
        )
          .bind(
            orderId,
            orderCode,
            orderType,
            customerName,
            clampStr(body.customer_phone, 30, '090-0000-0000'),
            clampStr(body.delivery_address, 180, '東京都渋谷区桜丘町15-14 渋谷マンション 402'),
            clampStr(body.delivery_note, 200),
            deliveryLat,
            deliveryLng,
            store.id,
            store.name,
            store.address,
            store.lat,
            store.lng,
            isPartner ? 1 : 0,
            store.takeout_notes || '',
            JSON.stringify(cleanItems),
            estimatedSubtotal,
            isPartner ? estimatedSubtotal : null,
            deliveryFee,
            serviceFee,
            proxyFee,
            tipAmount,
            discountAmount,
            voucherCode,
            totalAmount,
            driverPayout,
            payment.method,
            payment.label,
            payment.status,
            payment.billingProfile,
            subPolicy,
            isPartner ? 0 : clampInt(body.max_budget_overage, 0, 10000, 300),
            isPartner ? null : Number(store.avg_prep_min || 20),
            now,
            now
          )
          .run();

        await addOrderEvent(
          env.DB,
          orderId,
          'customer',
          customerName,
          'placed',
          isPartner
            ? `提携店舗へ注文が送信されました（${payment.label} / 店舗承認待ち）`
            : `非提携店舗の持ち帰り代理注文をリクエストしました（${payment.label} / 対応ドライバー検索中）`
        );

        const created = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        return resp.json({ order: formatOrder(created as Record<string, unknown>) }, 201);
      }

      // Create custom proxy takeout order for ANY unlisted restaurant (validates items BEFORE inserting store!)
      if (path === '/api/orders/custom-proxy' && method === 'POST') {
        const body = await parseJsonObject(request);
        const storeName = clampStr(body.store_name, 80);
        const storeAddress = clampStr(body.store_address, 160);
        const rawItems = body.items;
        if (!storeName || !storeAddress || !Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 30) {
          return resp.error('お店の名前・住所・持ち帰り希望メニュー（1〜30品）を入力してください');
        }

        const cleanItems = rawItems
          .filter((it): it is Record<string, unknown> => Boolean(it && typeof it === 'object'))
          .map((it) => ({
            menu_item_id: '',
            name: clampStr(it.name, 80),
            unit_price: clampInt(it.estimated_price, 50, 100000, 800),
            quantity: clampInt(it.quantity, 1, 50, 1),
            selected_options: ['自由リクエスト'],
            note: clampStr(it.note, 200),
            is_custom: true,
          }))
          .filter((it) => it.name.length > 0);

        if (cleanItems.length === 0) {
          return resp.error('有効な商品名を1品以上入力してください');
        }

        const now = new Date().toISOString();
        const storeId = `store-custom-${Date.now().toString(36)}-${randomCode(4).toLowerCase()}`;
        const storeLat = 35.656 + (Math.random() - 0.5) * 0.016;
        const storeLng = 139.705 + (Math.random() - 0.5) * 0.016;
        const takeoutNotes =
          clampStr(body.takeout_notes, 400) ||
          '未掲載店舗のため、店頭でテイクアウト可能か確認のうえ代理購入してください。';

        const settings = await getSettings(env.DB);
        const estimatedSubtotal = cleanItems.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
        const deliveryFee = settings.base_delivery_fee;
        const serviceFee = Math.round(estimatedSubtotal * settings.service_fee_rate);
        const proxyFee = settings.proxy_order_fee;
        const tipAmount = clampInt(body.tip_amount, 0, 50000, 0);
        const payment = resolvePaymentMeta(body);
        const { voucherCode, discountAmount } = computeServerDiscount(
          body.voucher_code,
          Boolean(body.use_wallet_cash),
          estimatedSubtotal,
          proxyFee,
          payment.method
        );
        const totalAmount = Math.max(
          0,
          estimatedSubtotal + deliveryFee + serviceFee + proxyFee + tipAmount - discountAmount
        );
        const driverPayout = settings.driver_base_payout + settings.driver_proxy_bonus + tipAmount;

        const orderId = makeOrderId();
        const orderCode = randomCode(4);
        const customerName = clampStr(body.customer_name, 60, 'ゲストユーザー');
        const subPolicy = VALID_SUBSTITUTION_POLICIES.has(String(body.substitution_policy))
          ? String(body.substitution_policy)
          : 'contact';

        await env.DB.batch([
          env.DB.prepare(
            `INSERT INTO stores (
              id, name, category, description, address, area, phone, lat, lng, image_url,
              is_partner, is_unlisted_request, is_open, busy_mode, avg_prep_min, rating, review_count, takeout_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, 'images/hero.webp', 0, 1, 1, 0, 25, 4.7, 0, ?, ?)`
          ).bind(
            storeId,
            storeName,
            clampStr(body.store_category, 40, 'その他'),
            'お客様からの自由リクエスト店舗（非提携・持ち帰り代理購入）',
            storeAddress,
            clampStr(body.store_area, 40, '渋谷周辺'),
            storeLat,
            storeLng,
            takeoutNotes,
            now
          ),
          env.DB.prepare(
            `INSERT INTO orders (
              id, order_code, order_type, status,
              customer_name, customer_phone, delivery_address, delivery_note, delivery_lat, delivery_lng,
              store_id, store_name, store_address, store_lat, store_lng, store_is_partner, takeout_notes,
              items_json, estimated_subtotal, actual_subtotal, price_diff,
              delivery_fee, service_fee, proxy_fee, tip_amount, discount_amount, voucher_code, total_amount, driver_payout,
              payment_method, payment_label, payment_status, billing_profile, driver_store_payment_method,
              substitution_policy, max_budget_overage, estimated_prep_min,
              created_at, updated_at
            ) VALUES (?, ?, 'proxy_takeout', 'placed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proxy_card', ?, ?, 25, ?, ?)`
          ).bind(
            orderId,
            orderCode,
            customerName,
            clampStr(body.customer_phone, 30, '090-0000-0000'),
            clampStr(body.delivery_address, 180, '東京都渋谷区桜丘町15-14 渋谷マンション 402'),
            clampStr(body.delivery_note, 200),
            35.6532 + (Math.random() - 0.5) * 0.01,
            139.7038 + (Math.random() - 0.5) * 0.01,
            storeId,
            storeName,
            storeAddress,
            storeLat,
            storeLng,
            takeoutNotes,
            JSON.stringify(cleanItems),
            estimatedSubtotal,
            deliveryFee,
            serviceFee,
            proxyFee,
            tipAmount,
            discountAmount,
            voucherCode,
            totalAmount,
            driverPayout,
            payment.method,
            payment.label,
            payment.status,
            payment.billingProfile,
            subPolicy,
            clampInt(body.max_budget_overage, 0, 10000, 500),
            now,
            now
          ),
          env.DB.prepare(
            `INSERT INTO order_events (order_id, actor_role, actor_name, event_type, message, created_at)
             VALUES (?, 'customer', ?, 'placed', ?, ?)`
          ).bind(orderId, customerName, `未掲載店舗「${storeName}」の持ち帰り代理注文リクエストを作成しました（${payment.label}）`, now),
        ]);

        const created = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        return resp.json({ order: formatOrder(created as Record<string, unknown>), store_id: storeId }, 201);
      }

      // ================================================================
      // SINGLE ORDER DETAIL & ATOMIC COMPARE-AND-SWAP STATE TRANSITIONS
      // ================================================================
      const orderDetailMatch = path.match(/^\/api\/orders\/([^/]+)$/);
      if (orderDetailMatch && method === 'GET') {
        const orderId = orderDetailMatch[1];
        const order = await env.DB.prepare(
          `SELECT o.*,
            d.current_lat as driver_lat,
            d.current_lng as driver_lng,
            d.vehicle_type as driver_vehicle,
            d.phone as driver_phone,
            d.rating as driver_rating
           FROM orders o
           LEFT JOIN drivers d ON o.driver_id = d.id
           WHERE o.id = ?`
        )
          .bind(orderId)
          .first<Record<string, unknown>>();
        if (!order) return resp.error('注文が見つかりません', 404);

        const [eventsRes, messagesRes] = await Promise.all([
          env.DB.prepare('SELECT * FROM order_events WHERE order_id = ? ORDER BY id ASC LIMIT 100')
            .bind(orderId)
            .all(),
          env.DB.prepare('SELECT * FROM order_messages WHERE order_id = ? ORDER BY id ASC LIMIT 100')
            .bind(orderId)
            .all(),
        ]);

        return resp.json({
          order: formatOrder(order),
          events: eventsRes.results || [],
          messages: messagesRes.results || [],
        });
      }

      const orderActionMatch = path.match(/^\/api\/orders\/([^/]+)\/([a-z-]+)$/);
      if (orderActionMatch) {
        const [, orderId, action] = orderActionMatch;
        const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?')
          .bind(orderId)
          .first<Record<string, unknown>>();
        if (!order) return resp.error('注文が見つかりません', 404);
        const now = new Date().toISOString();

        // Messages
        if (action === 'messages' && method === 'GET') {
          const res = await env.DB.prepare('SELECT * FROM order_messages WHERE order_id = ? ORDER BY id ASC LIMIT 100')
            .bind(orderId)
            .all();
          return resp.json({ messages: res.results || [] });
        }

        if (action === 'messages' && method === 'POST') {
          if (['delivered', 'cancelled'].includes(String(order.status))) {
            return resp.error('完了済み・キャンセル済みの注文にはチャット送信できません', 409);
          }
          const body = await parseJsonObject(request);
          const text = clampStr(body.body, 500);
          if (!text) return resp.error('メッセージを入力してください');
          const role = VALID_ACTOR_ROLES.has(String(body.sender_role)) ? String(body.sender_role) : 'customer';
          await env.DB.prepare(
            `INSERT INTO order_messages (order_id, sender_role, sender_name, body, image_url, created_at)
             VALUES (?, ?, ?, ?, NULL, ?)`
          )
            .bind(orderId, role, clampStr(body.sender_name, 60, 'ユーザー'), text, now)
            .run();
          const res = await env.DB.prepare('SELECT * FROM order_messages WHERE order_id = ? ORDER BY id ASC LIMIT 100')
            .bind(orderId)
            .all();
          return resp.json({ messages: res.results || [] }, 201);
        }

        // Merchant Accept (Atomic CAS)
        if (action === 'merchant-accept' && method === 'POST') {
          if (order.order_type !== 'partner') {
            return resp.error('非提携店舗の注文は店舗承認対象外です', 400);
          }
          const body = await parseJsonObject(request, true);
          const prepMin = clampInt(body.estimated_prep_min, 5, 90, 15);
          const res = await env.DB.prepare(
            `UPDATE orders SET status = 'preparing', estimated_prep_min = ?, updated_at = ?
             WHERE id = ? AND order_type = 'partner' AND status = 'placed'`
          )
            .bind(prepMin, now, orderId)
            .run();
          if ((res.meta?.changes ?? 0) !== 1) {
            return resp.error('この注文はすでに処理済みです', 409);
          }
          await addOrderEvent(
            env.DB,
            orderId,
            'merchant',
            String(order.store_name),
            'preparing',
            `店舗が注文を受注しました（調理目安：約${prepMin}分・ドライバー手配を開始）`
          );
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return resp.json({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Merchant Ready (Atomic CAS)
        if (action === 'merchant-ready' && method === 'POST') {
          const res = await env.DB.prepare(
            `UPDATE orders SET status = 'ready_for_pickup', updated_at = ?
             WHERE id = ? AND order_type = 'partner' AND status = 'preparing'`
          )
            .bind(now, orderId)
            .run();
          if ((res.meta?.changes ?? 0) !== 1) {
            return resp.error('調理中の提携注文のみ受け渡し準備完了にできます', 409);
          }
          await addOrderEvent(
            env.DB,
            orderId,
            'merchant',
            String(order.store_name),
            'ready_for_pickup',
            '調理が完了しました（ドライバー受け渡し準備OK）'
          );
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return resp.json({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Merchant Reject (Atomic CAS)
        if (action === 'merchant-reject' && method === 'POST') {
          const body = await parseJsonObject(request, true);
          const reason = clampStr(body.reason, 200, '混雑または品切れのため受注できませんでした');
          const res = await env.DB.prepare(
            `UPDATE orders SET status = 'cancelled', cancel_reason = ?, updated_at = ?
             WHERE id = ? AND order_type = 'partner' AND status IN ('placed', 'preparing')`
          )
            .bind(reason, now, orderId)
            .run();
          if ((res.meta?.changes ?? 0) !== 1) {
            return resp.error('この状態の注文は店舗から辞退できません', 409);
          }
          await addOrderEvent(env.DB, orderId, 'merchant', String(order.store_name), 'cancelled', `店舗によりキャンセル：${reason}`);
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return resp.json({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Driver Accept Job (Atomic CAS + Online & Proxy Card Enforcement!)
        if (action === 'driver-accept' && method === 'POST') {
          const body = await parseJsonObject(request);
          const driverId = clampStr(body.driver_id, 80);
          if (!driverId) return resp.error('driver_id is required');
          const driver = await env.DB.prepare('SELECT * FROM drivers WHERE id = ?')
            .bind(driverId)
            .first<Record<string, unknown>>();
          if (!driver) return resp.error('ドライバーが見つかりません', 404);
          if (!driver.is_approved) return resp.error('アカウントが未承認のため受諾できません', 403);
          if (!driver.is_online) return resp.error('オンライン状態にしてから配達を受諾してください', 409);
          if (order.order_type === 'proxy_takeout' && !driver.proxy_card_enabled) {
            return resp.error('店頭代理注文を受諾するには代理決済カードの有効化が必要です', 403);
          }

          const nextStatus =
            order.order_type === 'proxy_takeout' ? 'driver_heading_to_store' : String(order.status);

          const res = await env.DB.prepare(
            `UPDATE orders SET driver_id = ?, driver_name = ?, status = ?, updated_at = ?
             WHERE id = ? AND driver_id IS NULL AND (
               (order_type = 'partner' AND status IN ('preparing', 'ready_for_pickup'))
               OR (order_type = 'proxy_takeout' AND status = 'placed')
             )`
          )
            .bind(driver.id, driver.name, nextStatus, now, orderId)
            .run();

          if ((res.meta?.changes ?? 0) !== 1) {
            return resp.error('他のドライバーがすでに受諾したか、現在受諾できない状態です', 409);
          }

          await addOrderEvent(
            env.DB,
            orderId,
            'driver',
            String(driver.name),
            'driver_assigned',
            order.order_type === 'proxy_takeout'
              ? `ドライバー ${driver.name} が店頭代理注文を受諾し、店舗へ向かっています`
              : `ドライバー ${driver.name} が配達を受諾しました`
          );

          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return resp.json({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Proxy Start Ordering (Atomic CAS + Driver Ownership!)
        if (action === 'proxy-start-ordering' && method === 'POST') {
          const body = await parseJsonObject(request, true);
          const reqDriverId = clampStr(body.driver_id, 80);
          if (reqDriverId && reqDriverId !== order.driver_id) {
            return resp.error('担当ドライバーのみ操作できます', 403);
          }
          const res = await env.DB.prepare(
            `UPDATE orders SET status = 'proxy_ordering', updated_at = ?
             WHERE id = ? AND order_type = 'proxy_takeout' AND status = 'driver_heading_to_store' AND driver_id IS NOT NULL`
          )
            .bind(now, orderId)
            .run();
          if ((res.meta?.changes ?? 0) !== 1) {
            return resp.error('店舗移動中の代理注文のみ開始できます', 409);
          }
          if (order.driver_id) {
            await env.DB.prepare('UPDATE drivers SET current_lat = ?, current_lng = ? WHERE id = ?')
              .bind(order.store_lat, order.store_lng, order.driver_id)
              .run();
          }
          await addOrderEvent(
            env.DB,
            orderId,
            'driver',
            String(order.driver_name || 'ドライバー'),
            'proxy_ordering',
            '店舗に到着しました。カウンター・券売機にて持ち帰り注文を行っています'
          );
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return resp.json({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Proxy Confirm Purchase (Atomic CAS + max_budget_overage + Driver Ownership!)
        if (action === 'proxy-confirm-purchase' && method === 'POST') {
          const body = await parseJsonObject(request);
          const reqDriverId = clampStr(body.driver_id, 80);
          if (reqDriverId && reqDriverId !== order.driver_id) {
            return resp.error('担当ドライバーのみ決済確定できます', 403);
          }
          const estimatedSubtotal = Number(order.estimated_subtotal || 0);
          const maxBudgetOverage = Number(order.max_budget_overage || 0);
          const actualSubtotal = clampInt(body.actual_subtotal, 1, 300000, estimatedSubtotal);
          const maxAllowed = estimatedSubtotal + maxBudgetOverage;
          if (actualSubtotal > maxAllowed) {
            return resp.error(
              `実費金額（¥${actualSubtotal.toLocaleString()}）がお客様の許容上限（¥${maxAllowed.toLocaleString()}）を超えています。チャットでお客様へ確認してください。`,
              400
            );
          }
          const priceDiff = actualSubtotal - estimatedSubtotal;
          const safeReceiptUrl = validateSafeMediaUrl(body.receipt_image_url, url.origin);

          const settings = await getSettings(env.DB);
          const serviceFee = Math.round(actualSubtotal * settings.service_fee_rate);
          const totalAmount = Math.max(
            0,
            actualSubtotal +
              Number(order.delivery_fee || 0) +
              serviceFee +
              Number(order.proxy_fee || 0) +
              Number(order.tip_amount || 0) -
              Number(order.discount_amount || 0)
          );
          const driverStorePay = VALID_DRIVER_STORE_PAYMENTS.has(String(body.driver_store_payment_method))
            ? String(body.driver_store_payment_method)
            : 'proxy_card';

          const res = await env.DB.prepare(
            `UPDATE orders SET
              status = 'proxy_waiting',
              actual_subtotal = ?,
              price_diff = ?,
              service_fee = ?,
              total_amount = ?,
              driver_store_payment_method = ?,
              receipt_image_url = COALESCE(?, receipt_image_url),
              receipt_note = COALESCE(?, receipt_note),
              updated_at = ?
             WHERE id = ? AND order_type = 'proxy_takeout' AND status = 'proxy_ordering' AND driver_id IS NOT NULL`
          )
            .bind(
              actualSubtotal,
              priceDiff,
              serviceFee,
              totalAmount,
              driverStorePay,
              safeReceiptUrl,
              clampStr(body.receipt_note, 200) || null,
              now,
              orderId
            )
            .run();

          if ((res.meta?.changes ?? 0) !== 1) {
            return resp.error('店頭代理注文中のオーダーのみ決済確定できます', 409);
          }

          const diffMsg =
            priceDiff === 0
              ? '目安金額どおり'
              : priceDiff > 0
              ? `目安より+¥${priceDiff}（実費精算）`
              : `目安より-¥${Math.abs(priceDiff)}（お安くなりました）`;

          await addOrderEvent(
            env.DB,
            orderId,
            'driver',
            String(order.driver_name || 'ドライバー'),
            'proxy_waiting',
            `店頭で持ち帰り注文・代理決済完了（実費 ¥${actualSubtotal.toLocaleString()} / ${diffMsg}）。出来上がりを待っています`
          );

          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return resp.json({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Driver Pickup -> Delivering (Atomic CAS + Strict ready_for_pickup / proxy_waiting!)
        if (action === 'driver-pickup' && method === 'POST') {
          const body = await parseJsonObject(request, true);
          const reqDriverId = clampStr(body.driver_id, 80);
          if (reqDriverId && reqDriverId !== order.driver_id) {
            return resp.error('担当ドライバーのみ受取処理できます', 403);
          }
          const res = await env.DB.prepare(
            `UPDATE orders SET status = 'delivering', updated_at = ?
             WHERE id = ? AND driver_id IS NOT NULL AND (
               (order_type = 'partner' AND status = 'ready_for_pickup')
               OR (order_type = 'proxy_takeout' AND status = 'proxy_waiting')
             )`
          )
            .bind(now, orderId)
            .run();
          if ((res.meta?.changes ?? 0) !== 1) {
            return resp.error('店舗の調理・受取準備が完了してから受け取ってください', 409);
          }
          const midLat = (Number(order.store_lat) * 2 + Number(order.delivery_lat)) / 3;
          const midLng = (Number(order.store_lng) * 2 + Number(order.delivery_lng)) / 3;
          await env.DB.prepare('UPDATE drivers SET current_lat = ?, current_lng = ? WHERE id = ?')
            .bind(midLat, midLng, order.driver_id)
            .run();
          await addOrderEvent(
            env.DB,
            orderId,
            'driver',
            String(order.driver_name || 'ドライバー'),
            'delivering',
            order.order_type === 'proxy_takeout'
              ? 'テイクアウト商品を受け取り、お届け先へ向かっています'
              : '店舗で商品を受け取り、お届け先へ向かっています'
          );
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return resp.json({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Driver Deliver -> Delivered (Atomic CAS prevents double payout + records cash collection!)
        if (action === 'driver-deliver' && method === 'POST') {
          const body = await parseJsonObject(request, true);
          const reqDriverId = clampStr(body.driver_id, 80);
          if (reqDriverId && reqDriverId !== order.driver_id) {
            return resp.error('担当ドライバーのみ配達完了できます', 403);
          }
          const safeDropoff = validateSafeMediaUrl(body.dropoff_image_url, url.origin);
          const nextPaymentStatus = order.payment_method === 'cash' ? 'cash_collected' : String(order.payment_status || 'paid');

          const res = await env.DB.prepare(
            `UPDATE orders SET status = 'delivered', payment_status = ?, dropoff_image_url = COALESCE(?, dropoff_image_url), updated_at = ?
             WHERE id = ? AND status = 'delivering' AND driver_id IS NOT NULL`
          )
            .bind(nextPaymentStatus, safeDropoff, now, orderId)
            .run();

          if ((res.meta?.changes ?? 0) !== 1) {
            return resp.error('配達中の注文のみ完了できます（二重完了は防止されます）', 409);
          }

          const deliveredMsg =
            order.payment_method === 'cash'
              ? `お届け先へ配達が完了し、現金 ¥${Number(order.total_amount || 0).toLocaleString()} を受領しました。ご利用ありがとうございました！`
              : 'お届け先へ配達が完了しました。ご利用ありがとうございました！';

          await env.DB.batch([
            env.DB.prepare(
              `UPDATE drivers SET
                completed_deliveries = completed_deliveries + 1,
                total_earnings = total_earnings + ?,
                current_lat = ?,
                current_lng = ?
               WHERE id = ?`
            ).bind(Number(order.driver_payout || 0), order.delivery_lat, order.delivery_lng, order.driver_id),
            env.DB.prepare(
              `INSERT INTO order_events (order_id, actor_role, actor_name, event_type, message, created_at)
               VALUES (?, 'driver', ?, 'delivered', ?, ?)`
            ).bind(orderId, String(order.driver_name || 'ドライバー'), deliveredMsg, now),
          ]);

          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return resp.json({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Cancel order (Atomic CAS — blocks customer cancel after store purchase!)
        if (action === 'cancel' && method === 'POST') {
          const body = await parseJsonObject(request, true);
          const actorRole = VALID_ACTOR_ROLES.has(String(body.actor_role)) ? String(body.actor_role) : 'customer';
          const reason = clampStr(body.reason, 200, 'お客様都合によるキャンセル');
          const allowedCancelSql =
            actorRole === 'admin'
              ? `status NOT IN ('delivered', 'cancelled')`
              : `status IN ('placed', 'preparing', 'driver_heading_to_store')`;

          const res = await env.DB.prepare(
            `UPDATE orders SET status = 'cancelled', cancel_reason = ?, updated_at = ?
             WHERE id = ? AND ${allowedCancelSql}`
          )
            .bind(reason, now, orderId)
            .run();

          if ((res.meta?.changes ?? 0) !== 1) {
            return resp.error('すでに店頭決済または配達工程に進んでいるためキャンセルできません', 409);
          }

          await addOrderEvent(
            env.DB,
            orderId,
            actorRole,
            clampStr(body.actor_name, 60, String(order.customer_name)),
            'cancelled',
            `注文がキャンセルされました：${reason}`
          );
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return resp.json({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Customer Review (Atomic CAS — prevents concurrent duplicate ratings!)
        if (action === 'review' && method === 'POST') {
          const body = await parseJsonObject(request);
          const sr = clampInt(body.store_rating, 1, 5, 5);
          const dr = clampInt(body.driver_rating, 1, 5, 5);
          const res = await env.DB.prepare(
            `UPDATE orders SET customer_rating_store = ?, customer_rating_driver = ?, customer_review_comment = ?, updated_at = ?
             WHERE id = ? AND status = 'delivered' AND customer_rating_store IS NULL`
          )
            .bind(sr, dr, clampStr(body.comment, 300), now, orderId)
            .run();

          if ((res.meta?.changes ?? 0) !== 1) {
            return resp.error('配達完了済みかつ未評価の注文のみ評価できます', 409);
          }

          const ratingUpdates: D1PreparedStatement[] = [
            env.DB.prepare(
              `UPDATE stores SET
                rating = ROUND(((rating * review_count) + ?) / (review_count + 1), 2),
                review_count = review_count + 1
               WHERE id = ?`
            ).bind(sr, order.store_id),
          ];
          if (order.driver_id) {
            ratingUpdates.push(
              env.DB.prepare(
                `UPDATE drivers SET
                  rating = ROUND(((rating * MAX(completed_deliveries, 1)) + ?) / (MAX(completed_deliveries, 1) + 1), 2)
                 WHERE id = ?`
              ).bind(dr, order.driver_id)
            );
          }
          await env.DB.batch(ratingUpdates);

          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return resp.json({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Admin Override (blocks reverting delivered orders to prevent payout farming!)
        if (action === 'admin' && method === 'PATCH') {
          const authErr = requireAdminGuard(request, env);
          if (authErr) return resp.error(authErr, 403);
          const body = await parseJsonObject(request);
          if (body.status !== undefined && !VALID_STATUSES.has(String(body.status))) {
            return resp.error('無効なステータス値です', 400);
          }
          const nextStatus = body.status ? String(body.status) : String(order.status);
          if (order.status === 'delivered' && nextStatus !== 'delivered') {
            return resp.error('配達完了・報酬確定済みの注文ステータスは戻せません', 409);
          }
          let driverId = order.driver_id as string | null;
          let driverName = order.driver_name as string | null;
          if (body.driver_id !== undefined) {
            if (!body.driver_id) {
              driverId = null;
              driverName = null;
            } else {
              const drv = await env.DB.prepare('SELECT id, name FROM drivers WHERE id = ?')
                .bind(String(body.driver_id))
                .first<{ id: string; name: string }>();
              if (!drv) return resp.error('指定ドライバーが見つかりません', 404);
              driverId = drv.id;
              driverName = drv.name;
            }
          }
          await env.DB.prepare(
            `UPDATE orders SET status = ?, driver_id = ?, driver_name = ?, updated_at = ? WHERE id = ?`
          )
            .bind(nextStatus, driverId, driverName, now, orderId)
            .run();
          await addOrderEvent(
            env.DB,
            orderId,
            'admin',
            '運営管理者',
            'admin_override',
            clampStr(body.note, 200) ||
              `管理画面から状態を「${nextStatus}」に更新しました${driverName ? `（担当：${driverName}）` : ''}`
          );
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return resp.json({ order: formatOrder(updated as Record<string, unknown>) });
        }
      }

      // ================================================================
      // ADMIN ANALYTICS (Pure SQL Aggregates — Zero Full-Table JS Scans!)
      // ================================================================
      if (path === '/api/admin/analytics' && method === 'GET') {
        const settings = await getSettings(env.DB);
        const [orderAgg, storeAgg, driverAgg, statusRes, paymentRes, recentEventsRes] = await Promise.all([
          env.DB.prepare(
            `SELECT
              COUNT(*) as total_orders,
              SUM(CASE WHEN status NOT IN ('delivered', 'cancelled') THEN 1 ELSE 0 END) as active_orders,
              SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_orders,
              SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
              SUM(CASE WHEN status != 'cancelled' AND order_type = 'partner' THEN 1 ELSE 0 END) as partner_orders,
              SUM(CASE WHEN status != 'cancelled' AND order_type = 'proxy_takeout' THEN 1 ELSE 0 END) as proxy_orders,
              COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_gmv,
              COALESCE(SUM(CASE WHEN status != 'cancelled' AND order_type = 'partner' THEN total_amount ELSE 0 END), 0) as partner_gmv,
              COALESCE(SUM(CASE WHEN status != 'cancelled' AND order_type = 'proxy_takeout' THEN total_amount ELSE 0 END), 0) as proxy_gmv,
              COALESCE(SUM(CASE WHEN status != 'cancelled' AND order_type = 'partner' THEN COALESCE(actual_subtotal, estimated_subtotal) ELSE 0 END), 0) as partner_subtotal_sum,
              COALESCE(SUM(CASE WHEN status != 'cancelled' THEN service_fee + proxy_fee + delivery_fee ELSE 0 END), 0) as fee_revenue,
              COALESCE(SUM(CASE WHEN status != 'cancelled' THEN driver_payout ELSE 0 END), 0) as driver_payout_total
             FROM orders`
          ).first<Record<string, number>>(),
          env.DB.prepare(
            `SELECT
              COUNT(*) as total_stores,
              SUM(CASE WHEN is_partner = 1 THEN 1 ELSE 0 END) as partner_stores,
              SUM(CASE WHEN is_partner = 0 THEN 1 ELSE 0 END) as non_partner_stores,
              SUM(CASE WHEN is_unlisted_request = 1 THEN 1 ELSE 0 END) as unlisted_stores
             FROM stores`
          ).first<Record<string, number>>(),
          env.DB.prepare(
            `SELECT
              COUNT(*) as total_drivers,
              SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) as online_drivers,
              SUM(CASE WHEN proxy_card_enabled = 1 THEN 1 ELSE 0 END) as proxy_capable_drivers
             FROM drivers`
          ).first<Record<string, number>>(),
          env.DB.prepare('SELECT status, COUNT(*) as c FROM orders GROUP BY status').all<{ status: string; c: number }>(),
          env.DB.prepare(
            `SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount
             FROM orders WHERE status != 'cancelled' GROUP BY payment_method ORDER BY count DESC`
          ).all<{ payment_method: string; count: number; total_amount: number }>(),
          env.DB.prepare(
            `SELECT e.*, o.store_name, o.order_type
             FROM order_events e
             JOIN orders o ON e.order_id = o.id
             ORDER BY e.id DESC LIMIT 20`
          ).all(),
        ]);

        const commissionRevenue = Math.round(
          Number(orderAgg?.partner_subtotal_sum || 0) * settings.merchant_commission_rate
        );
        const feeRevenue = Number(orderAgg?.fee_revenue || 0);
        const driverPayoutTotal = Number(orderAgg?.driver_payout_total || 0);

        const statusCounts: Record<string, number> = {};
        for (const r of statusRes.results || []) {
          statusCounts[r.status] = r.c;
        }

        return resp.json({
          summary: {
            total_orders: Number(orderAgg?.total_orders || 0),
            active_orders: Number(orderAgg?.active_orders || 0),
            completed_orders: Number(orderAgg?.completed_orders || 0),
            cancelled_orders: Number(orderAgg?.cancelled_orders || 0),
            partner_orders: Number(orderAgg?.partner_orders || 0),
            proxy_orders: Number(orderAgg?.proxy_orders || 0),
            total_gmv: Number(orderAgg?.total_gmv || 0),
            partner_gmv: Number(orderAgg?.partner_gmv || 0),
            proxy_gmv: Number(orderAgg?.proxy_gmv || 0),
            commission_revenue: commissionRevenue,
            fee_revenue: feeRevenue,
            driver_payout_total: driverPayoutTotal,
            net_platform_revenue: Math.max(0, commissionRevenue + feeRevenue - driverPayoutTotal),
            total_stores: Number(storeAgg?.total_stores || 0),
            partner_stores: Number(storeAgg?.partner_stores || 0),
            non_partner_stores: Number(storeAgg?.non_partner_stores || 0),
            unlisted_stores: Number(storeAgg?.unlisted_stores || 0),
            online_drivers: Number(driverAgg?.online_drivers || 0),
            total_drivers: Number(driverAgg?.total_drivers || 0),
            proxy_capable_drivers: Number(driverAgg?.proxy_capable_drivers || 0),
          },
          status_counts: statusCounts,
          payment_breakdown: paymentRes.results || [],
          recent_events: recentEventsRes.results || [],
        });
      }

      if (path === '/api/admin/reset-demo' && method === 'POST') {
        const authErr = requireAdminGuard(request, env, true);
        if (authErr) return resp.error(authErr, 403);
        await seedDatabase(env.DB);
        return resp.json({ ok: true, message: 'デモデータを初期化しました' });
      }

      return resp.error('Endpoint not found', 404);
    } catch (err) {
      if (err instanceof BadRequestError) {
        return resp.error(err.message, 400);
      }
      console.error('Worker error:', err);
      return resp.error('サーバー内部エラーが発生しました', 500);
    }
  },
};
