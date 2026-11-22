import { seedDatabase } from './seed';

export interface Env {
  DB: D1Database;
  MEDIA_KV: KVNamespace;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function randomCode(len = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function makeOrderId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  const suffix = randomCode(2);
  return `ORD-${num}${suffix}`;
}

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
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
    options: safeJsonParse(row.options_json as string, []),
  };
}

function formatDriver(row: Record<string, unknown>) {
  return {
    ...row,
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ================================================================
      // HEALTH CHECK
      // ================================================================
      if (path === '/api/health' && method === 'GET') {
        const count = await env.DB.prepare('SELECT COUNT(*) as c FROM stores').first<{ c: number }>();
        return jsonResponse({
          ok: true,
          service: 'ubereats-api',
          storesCount: count?.c ?? 0,
          timestamp: new Date().toISOString(),
        });
      }

      // ================================================================
      // MEDIA UPLOAD & SERVING (Cloudflare KV)
      // ================================================================
      if (path === '/api/media' && method === 'POST') {
        const body = (await request.json()) as { dataUrl?: string };
        if (!body.dataUrl || typeof body.dataUrl !== 'string') {
          return errorResponse('dataUrl is required');
        }
        const match = body.dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
        if (!match) {
          return errorResponse('Unsupported image format. Use PNG, JPEG, or WebP dataUrl.');
        }
        const contentType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
        const b64 = match[2];
        if (b64.length > 2_800_000) {
          return errorResponse('Image exceeds 2MB limit', 413);
        }
        const binStr = atob(b64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        const mediaId = `${Date.now().toString(36)}-${randomCode(6).toLowerCase()}`;
        await env.MEDIA_KV.put(mediaId, bytes.buffer, {
          metadata: { contentType },
        });
        return jsonResponse({
          id: mediaId,
          url: `${url.origin}/api/media/${mediaId}`,
          contentType,
        }, 201);
      }

      const mediaMatch = path.match(/^\/api\/media\/([a-zA-Z0-9_-]+)$/);
      if (mediaMatch && method === 'GET') {
        const mediaId = mediaMatch[1];
        const { value, metadata } = await env.MEDIA_KV.getWithMetadata<{ contentType?: string }>(
          mediaId,
          'arrayBuffer'
        );
        if (!value) {
          return new Response('Not found', { status: 404, headers: CORS_HEADERS });
        }
        return new Response(value, {
          status: 200,
          headers: {
            'Content-Type': metadata?.contentType || 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
            ...CORS_HEADERS,
          },
        });
      }

      // ================================================================
      // PLATFORM SETTINGS
      // ================================================================
      if (path === '/api/settings' && method === 'GET') {
        const settings = await getSettings(env.DB);
        return jsonResponse(settings);
      }

      if (path === '/api/settings' && method === 'PATCH') {
        const body = (await request.json()) as Partial<SettingsRow>;
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
            Math.max(0, Math.round(body.base_delivery_fee ?? current.base_delivery_fee)),
            Math.max(0, Math.round(body.proxy_order_fee ?? current.proxy_order_fee)),
            Math.max(0, Math.min(0.5, Number(body.service_fee_rate ?? current.service_fee_rate))),
            Math.max(0, Math.min(0.5, Number(body.merchant_commission_rate ?? current.merchant_commission_rate))),
            Math.max(0, Math.round(body.driver_base_payout ?? current.driver_base_payout)),
            Math.max(0, Math.round(body.driver_proxy_bonus ?? current.driver_proxy_bonus)),
            now
          )
          .run();
        const updated = await getSettings(env.DB);
        return jsonResponse(updated);
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
        sql += ' ORDER BY s.is_open DESC, s.is_partner DESC, s.rating DESC, s.created_at DESC';

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

        return jsonResponse({ stores });
      }

      if (path === '/api/stores' && method === 'POST') {
        const body = (await request.json()) as Record<string, unknown>;
        const name = String(body.name || '').trim();
        const address = String(body.address || '').trim();
        if (!name || !address) {
          return errorResponse('店舗名と住所は必須です');
        }
        const id = `store-${Date.now().toString(36)}-${randomCode(3).toLowerCase()}`;
        const now = new Date().toISOString();
        await env.DB.prepare(
          `INSERT INTO stores (
            id, name, category, description, address, area, phone, lat, lng, image_url,
            is_partner, is_unlisted_request, is_open, busy_mode, avg_prep_min, rating, review_count, takeout_notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 4.7, 0, ?, ?)`
        )
          .bind(
            id,
            name,
            String(body.category || 'その他'),
            String(body.description || ''),
            address,
            String(body.area || '渋谷'),
            String(body.phone || ''),
            Number(body.lat ?? 35.656 + (Math.random() - 0.5) * 0.015),
            Number(body.lng ?? 139.704 + (Math.random() - 0.5) * 0.015),
            String(body.image_url || 'images/hero.webp'),
            body.is_partner ? 1 : 0,
            body.is_unlisted_request ? 1 : 0,
            body.is_open === false ? 0 : 1,
            Number(body.avg_prep_min ?? 20),
            String(body.takeout_notes || ''),
            now
          )
          .run();

        const created = await env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(id).first();
        return jsonResponse({ store: formatStore(created as Record<string, unknown>) }, 201);
      }

      const storeDetailMatch = path.match(/^\/api\/stores\/([^/]+)$/);
      if (storeDetailMatch && method === 'GET') {
        const storeId = storeDetailMatch[1];
        const store = await env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
        if (!store) return errorResponse('店舗が見つかりません', 404);
        const itemsRes = await env.DB.prepare(
          'SELECT * FROM menu_items WHERE store_id = ? ORDER BY sort_order ASC, is_popular DESC, name ASC'
        )
          .bind(storeId)
          .all();
        return jsonResponse({
          store: formatStore(store as Record<string, unknown>),
          menu: (itemsRes.results || []).map((m) => formatMenuItem(m as Record<string, unknown>)),
        });
      }

      if (storeDetailMatch && method === 'PATCH') {
        const storeId = storeDetailMatch[1];
        const existing = await env.DB.prepare('SELECT * FROM stores WHERE id = ?')
          .bind(storeId)
          .first<Record<string, unknown>>();
        if (!existing) return errorResponse('店舗が見つかりません', 404);
        const body = (await request.json()) as Record<string, unknown>;

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
            body.name !== undefined ? String(body.name) : existing.name,
            body.category !== undefined ? String(body.category) : existing.category,
            body.description !== undefined ? String(body.description) : existing.description,
            body.address !== undefined ? String(body.address) : existing.address,
            body.area !== undefined ? String(body.area) : existing.area,
            body.phone !== undefined ? String(body.phone) : existing.phone,
            body.image_url !== undefined ? String(body.image_url) : existing.image_url,
            body.is_partner !== undefined ? (body.is_partner ? 1 : 0) : existing.is_partner,
            body.is_unlisted_request !== undefined ? (body.is_unlisted_request ? 1 : 0) : existing.is_unlisted_request,
            body.is_open !== undefined ? (body.is_open ? 1 : 0) : existing.is_open,
            body.busy_mode !== undefined ? (body.busy_mode ? 1 : 0) : existing.busy_mode,
            body.avg_prep_min !== undefined ? Number(body.avg_prep_min) : existing.avg_prep_min,
            body.takeout_notes !== undefined ? String(body.takeout_notes) : existing.takeout_notes,
            storeId
          )
          .run();

        const updated = await env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
        return jsonResponse({ store: formatStore(updated as Record<string, unknown>) });
      }

      if (storeDetailMatch && method === 'DELETE') {
        const storeId = storeDetailMatch[1];
        await env.DB.prepare('DELETE FROM stores WHERE id = ?').bind(storeId).run();
        return jsonResponse({ deleted: true, id: storeId });
      }

      const storeMenuMatch = path.match(/^\/api\/stores\/([^/]+)\/menu$/);
      if (storeMenuMatch && method === 'POST') {
        const storeId = storeMenuMatch[1];
        const store = await env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(storeId).first();
        if (!store) return errorResponse('店舗が見つかりません', 404);
        const body = (await request.json()) as Record<string, unknown>;
        const name = String(body.name || '').trim();
        const price = Math.max(0, Math.round(Number(body.price || 0)));
        if (!name || price <= 0) {
          return errorResponse('商品名と価格を入力してください');
        }
        const id = `item-${Date.now().toString(36)}-${randomCode(3).toLowerCase()}`;
        await env.DB.prepare(
          `INSERT INTO menu_items (id, store_id, name, description, price, category, options_json, is_available, is_popular, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 99)`
        )
          .bind(
            id,
            storeId,
            name,
            String(body.description || ''),
            price,
            String(body.category || 'メイン'),
            JSON.stringify(body.options || []),
            body.is_popular ? 1 : 0
          )
          .run();
        const item = await env.DB.prepare('SELECT * FROM menu_items WHERE id = ?').bind(id).first();
        return jsonResponse({ item: formatMenuItem(item as Record<string, unknown>) }, 201);
      }

      const menuItemMatch = path.match(/^\/api\/menu\/([^/]+)$/);
      if (menuItemMatch && method === 'PATCH') {
        const itemId = menuItemMatch[1];
        const existing = await env.DB.prepare('SELECT * FROM menu_items WHERE id = ?')
          .bind(itemId)
          .first<Record<string, unknown>>();
        if (!existing) return errorResponse('メニューが見つかりません', 404);
        const body = (await request.json()) as Record<string, unknown>;

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
            body.name !== undefined ? String(body.name) : existing.name,
            body.description !== undefined ? String(body.description) : existing.description,
            body.price !== undefined ? Math.max(0, Math.round(Number(body.price))) : existing.price,
            body.category !== undefined ? String(body.category) : existing.category,
            body.is_available !== undefined ? (body.is_available ? 1 : 0) : existing.is_available,
            body.is_popular !== undefined ? (body.is_popular ? 1 : 0) : existing.is_popular,
            itemId
          )
          .run();
        const updated = await env.DB.prepare('SELECT * FROM menu_items WHERE id = ?').bind(itemId).first();
        return jsonResponse({ item: formatMenuItem(updated as Record<string, unknown>) });
      }

      if (menuItemMatch && method === 'DELETE') {
        const itemId = menuItemMatch[1];
        await env.DB.prepare('DELETE FROM menu_items WHERE id = ?').bind(itemId).run();
        return jsonResponse({ deleted: true, id: itemId });
      }

      // ================================================================
      // DRIVERS
      // ================================================================
      if (path === '/api/drivers' && method === 'GET') {
        const res = await env.DB.prepare(
          `SELECT d.*,
            (SELECT COUNT(*) FROM orders o WHERE o.driver_id = d.id AND o.status NOT IN ('delivered', 'cancelled')) as active_order_count
           FROM drivers d
           ORDER BY d.is_online DESC, d.completed_deliveries DESC`
        ).all();
        return jsonResponse({
          drivers: (res.results || []).map((d) => formatDriver(d as Record<string, unknown>)),
        });
      }

      if (path === '/api/drivers' && method === 'POST') {
        const body = (await request.json()) as Record<string, unknown>;
        const name = String(body.name || '').trim();
        if (!name) return errorResponse('ドライバー名は必須です');
        const id = `drv-${Date.now().toString(36)}-${randomCode(3).toLowerCase()}`;
        const now = new Date().toISOString();
        await env.DB.prepare(
          `INSERT INTO drivers (id, name, phone, vehicle_type, is_online, proxy_card_enabled, is_approved, current_lat, current_lng, rating, completed_deliveries, total_earnings, created_at)
           VALUES (?, ?, ?, ?, 1, ?, 1, 35.6580, 139.7016, 5.0, 0, 0, ?)`
        )
          .bind(
            id,
            name,
            String(body.phone || '090-0000-0000'),
            String(body.vehicle_type || 'ebike'),
            body.proxy_card_enabled === false ? 0 : 1,
            now
          )
          .run();
        const driver = await env.DB.prepare('SELECT * FROM drivers WHERE id = ?').bind(id).first();
        return jsonResponse({ driver: formatDriver(driver as Record<string, unknown>) }, 201);
      }

      const driverMatch = path.match(/^\/api\/drivers\/([^/]+)$/);
      if (driverMatch && method === 'PATCH') {
        const driverId = driverMatch[1];
        const existing = await env.DB.prepare('SELECT * FROM drivers WHERE id = ?')
          .bind(driverId)
          .first<Record<string, unknown>>();
        if (!existing) return errorResponse('ドライバーが見つかりません', 404);
        const body = (await request.json()) as Record<string, unknown>;

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
            body.name !== undefined ? String(body.name) : existing.name,
            body.phone !== undefined ? String(body.phone) : existing.phone,
            body.vehicle_type !== undefined ? String(body.vehicle_type) : existing.vehicle_type,
            body.is_online !== undefined ? (body.is_online ? 1 : 0) : existing.is_online,
            body.proxy_card_enabled !== undefined ? (body.proxy_card_enabled ? 1 : 0) : existing.proxy_card_enabled,
            body.is_approved !== undefined ? (body.is_approved ? 1 : 0) : existing.is_approved,
            body.current_lat !== undefined ? Number(body.current_lat) : existing.current_lat,
            body.current_lng !== undefined ? Number(body.current_lng) : existing.current_lng,
            driverId
          )
          .run();
        const updated = await env.DB.prepare('SELECT * FROM drivers WHERE id = ?').bind(driverId).first();
        return jsonResponse({ driver: formatDriver(updated as Record<string, unknown>) });
      }

      // ================================================================
      // ORDERS — LIST & CREATE
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
          // Partnered orders accepted by merchant (preparing/ready_for_pickup) with no driver,
          // OR non-partnered proxy takeout orders in 'placed' status with no driver!
          sql += ` AND o.driver_id IS NULL AND (
            (o.order_type = 'partner' AND o.status IN ('preparing', 'ready_for_pickup'))
            OR (o.order_type = 'proxy_takeout' AND o.status = 'placed')
          )`;
        } else {
          if (status) {
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
          if (orderType) {
            sql += ' AND o.order_type = ?';
            binds.push(orderType);
          }
        }

        sql += ' ORDER BY o.created_at DESC LIMIT 100';
        const stmt = env.DB.prepare(sql);
        const res = binds.length > 0 ? await stmt.bind(...binds).all() : await stmt.all();
        return jsonResponse({
          orders: (res.results || []).map((r) => formatOrder(r as Record<string, unknown>)),
        });
      }

      // Create standard catalog order (Partner OR Non-Partnered catalog store)
      if (path === '/api/orders' && method === 'POST') {
        const body = (await request.json()) as {
          store_id?: string;
          customer_name?: string;
          customer_phone?: string;
          delivery_address?: string;
          delivery_note?: string;
          delivery_lat?: number;
          delivery_lng?: number;
          items?: Array<{
            menu_item_id?: string;
            name: string;
            unit_price: number;
            quantity: number;
            selected_options?: string[];
            note?: string;
          }>;
          tip_amount?: number;
          payment_method?: string;
          substitution_policy?: string;
          max_budget_overage?: number;
        };

        if (!body.store_id || !body.items || body.items.length === 0) {
          return errorResponse('店舗と商品を1点以上選択してください');
        }
        const store = await env.DB.prepare('SELECT * FROM stores WHERE id = ?')
          .bind(body.store_id)
          .first<Record<string, unknown>>();
        if (!store) return errorResponse('指定された店舗が見つかりません', 404);
        if (!store.is_open) return errorResponse('現在この店舗は営業時間外です', 409);

        const settings = await getSettings(env.DB);
        const isPartner = Boolean(store.is_partner);
        const orderType = isPartner ? 'partner' : 'proxy_takeout';

        const cleanItems = body.items.map((it) => ({
          menu_item_id: it.menu_item_id || '',
          name: String(it.name || '商品').trim(),
          unit_price: Math.max(0, Math.round(Number(it.unit_price || 0))),
          quantity: Math.max(1, Math.round(Number(it.quantity || 1))),
          selected_options: Array.isArray(it.selected_options) ? it.selected_options : [],
          note: String(it.note || ''),
        }));

        const estimatedSubtotal = cleanItems.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
        const deliveryFee = settings.base_delivery_fee;
        const serviceFee = Math.round(estimatedSubtotal * settings.service_fee_rate);
        const proxyFee = isPartner ? 0 : settings.proxy_order_fee;
        const tipAmount = Math.max(0, Math.round(Number(body.tip_amount || 0)));
        const totalAmount = estimatedSubtotal + deliveryFee + serviceFee + proxyFee + tipAmount;
        const driverPayout =
          settings.driver_base_payout + (isPartner ? 0 : settings.driver_proxy_bonus) + tipAmount;

        const orderId = makeOrderId();
        const orderCode = randomCode(4);
        const now = new Date().toISOString();
        const customerName = String(body.customer_name || 'ゲストユーザー').trim();

        await env.DB.prepare(
          `INSERT INTO orders (
            id, order_code, order_type, status,
            customer_name, customer_phone, delivery_address, delivery_note, delivery_lat, delivery_lng,
            store_id, store_name, store_address, store_lat, store_lng, store_is_partner, takeout_notes,
            items_json, estimated_subtotal, actual_subtotal, price_diff,
            delivery_fee, service_fee, proxy_fee, tip_amount, total_amount, driver_payout,
            payment_method, substitution_policy, max_budget_overage, estimated_prep_min,
            created_at, updated_at
          ) VALUES (?, ?, ?, 'placed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            orderId,
            orderCode,
            orderType,
            customerName,
            String(body.customer_phone || '090-0000-0000'),
            String(body.delivery_address || '東京都渋谷区桜丘町15-14 渋谷マンション 402'),
            String(body.delivery_note || ''),
            Number(body.delivery_lat ?? 35.6542 + (Math.random() - 0.5) * 0.01),
            Number(body.delivery_lng ?? 139.7042 + (Math.random() - 0.5) * 0.01),
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
            totalAmount,
            driverPayout,
            String(body.payment_method || 'credit_card'),
            String(body.substitution_policy || 'contact'),
            isPartner ? 0 : Math.max(0, Math.round(Number(body.max_budget_overage ?? 300))),
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
            ? '提携店舗へ注文が送信されました（店舗の受注確認待ち）'
            : '非提携店舗の持ち帰り代理注文をリクエストしました（対応ドライバー検索中）'
        );

        const created = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        return jsonResponse({ order: formatOrder(created as Record<string, unknown>) }, 201);
      }

      // Create custom proxy takeout order for ANY unlisted restaurant!
      if (path === '/api/orders/custom-proxy' && method === 'POST') {
        const body = (await request.json()) as {
          store_name?: string;
          store_address?: string;
          store_area?: string;
          store_category?: string;
          takeout_notes?: string;
          customer_name?: string;
          customer_phone?: string;
          delivery_address?: string;
          delivery_note?: string;
          items?: Array<{ name: string; estimated_price: number; quantity: number; note?: string }>;
          tip_amount?: number;
          substitution_policy?: string;
          max_budget_overage?: number;
        };

        const storeName = String(body.store_name || '').trim();
        const storeAddress = String(body.store_address || '').trim();
        if (!storeName || !storeAddress || !body.items || body.items.length === 0) {
          return errorResponse('お店の名前・住所・持ち帰り希望メニューを入力してください');
        }

        const now = new Date().toISOString();
        const storeId = `store-custom-${Date.now().toString(36)}-${randomCode(3).toLowerCase()}`;
        const storeLat = 35.656 + (Math.random() - 0.5) * 0.016;
        const storeLng = 139.705 + (Math.random() - 0.5) * 0.016;
        const takeoutNotes =
          String(body.takeout_notes || '').trim() ||
          '未掲載店舗のため、店頭でテイクアウト可能か確認のうえ代理購入してください。';

        await env.DB.prepare(
          `INSERT INTO stores (
            id, name, category, description, address, area, phone, lat, lng, image_url,
            is_partner, is_unlisted_request, is_open, busy_mode, avg_prep_min, rating, review_count, takeout_notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, 'images/hero.webp', 0, 1, 1, 0, 25, 4.7, 0, ?, ?)`
        )
          .bind(
            storeId,
            storeName,
            String(body.store_category || 'その他'),
            'お客様からの自由リクエスト店舗（非提携・持ち帰り代理購入）',
            storeAddress,
            String(body.store_area || '渋谷周辺'),
            storeLat,
            storeLng,
            takeoutNotes,
            now
          )
          .run();

        const settings = await getSettings(env.DB);
        const cleanItems = body.items.map((it) => ({
          menu_item_id: '',
          name: String(it.name || '').trim(),
          unit_price: Math.max(0, Math.round(Number(it.estimated_price || 0))),
          quantity: Math.max(1, Math.round(Number(it.quantity || 1))),
          selected_options: ['自由リクエスト'],
          note: String(it.note || ''),
          is_custom: true,
        }));

        const estimatedSubtotal = cleanItems.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
        const deliveryFee = settings.base_delivery_fee;
        const serviceFee = Math.round(estimatedSubtotal * settings.service_fee_rate);
        const proxyFee = settings.proxy_order_fee;
        const tipAmount = Math.max(0, Math.round(Number(body.tip_amount || 0)));
        const totalAmount = estimatedSubtotal + deliveryFee + serviceFee + proxyFee + tipAmount;
        const driverPayout = settings.driver_base_payout + settings.driver_proxy_bonus + tipAmount;

        const orderId = makeOrderId();
        const orderCode = randomCode(4);
        const customerName = String(body.customer_name || 'ゲストユーザー').trim();

        await env.DB.prepare(
          `INSERT INTO orders (
            id, order_code, order_type, status,
            customer_name, customer_phone, delivery_address, delivery_note, delivery_lat, delivery_lng,
            store_id, store_name, store_address, store_lat, store_lng, store_is_partner, takeout_notes,
            items_json, estimated_subtotal, actual_subtotal, price_diff,
            delivery_fee, service_fee, proxy_fee, tip_amount, total_amount, driver_payout,
            payment_method, substitution_policy, max_budget_overage, estimated_prep_min,
            created_at, updated_at
          ) VALUES (?, ?, 'proxy_takeout', 'placed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, ?, 'credit_card', ?, ?, 25, ?, ?)`
        )
          .bind(
            orderId,
            orderCode,
            customerName,
            String(body.customer_phone || '090-0000-0000'),
            String(body.delivery_address || '東京都渋谷区桜丘町15-14 渋谷マンション 402'),
            String(body.delivery_note || ''),
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
            totalAmount,
            driverPayout,
            String(body.substitution_policy || 'contact'),
            Math.max(0, Math.round(Number(body.max_budget_overage ?? 500))),
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
          `未掲載店舗「${storeName}」の持ち帰り代理注文リクエストを作成しました`
        );

        const created = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        return jsonResponse({ order: formatOrder(created as Record<string, unknown>), store_id: storeId }, 201);
      }

      // ================================================================
      // SINGLE ORDER DETAIL & ACTIONS
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
        if (!order) return errorResponse('注文が見つかりません', 404);

        const [eventsRes, messagesRes] = await Promise.all([
          env.DB.prepare('SELECT * FROM order_events WHERE order_id = ? ORDER BY id ASC').bind(orderId).all(),
          env.DB.prepare('SELECT * FROM order_messages WHERE order_id = ? ORDER BY id ASC').bind(orderId).all(),
        ]);

        return jsonResponse({
          order: formatOrder(order),
          events: eventsRes.results || [],
          messages: messagesRes.results || [],
        });
      }

      // Order action sub-routes
      const orderActionMatch = path.match(/^\/api\/orders\/([^/]+)\/([a-z-]+)$/);
      if (orderActionMatch) {
        const [, orderId, action] = orderActionMatch;
        const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?')
          .bind(orderId)
          .first<Record<string, unknown>>();
        if (!order) return errorResponse('注文が見つかりません', 404);
        const now = new Date().toISOString();

        // Messages GET/POST
        if (action === 'messages' && method === 'GET') {
          const res = await env.DB.prepare('SELECT * FROM order_messages WHERE order_id = ? ORDER BY id ASC')
            .bind(orderId)
            .all();
          return jsonResponse({ messages: res.results || [] });
        }

        if (action === 'messages' && method === 'POST') {
          const body = (await request.json()) as {
            sender_role?: string;
            sender_name?: string;
            body?: string;
            image_url?: string;
          };
          const text = String(body.body || '').trim();
          if (!text && !body.image_url) return errorResponse('メッセージを入力してください');
          await env.DB.prepare(
            `INSERT INTO order_messages (order_id, sender_role, sender_name, body, image_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
            .bind(
              orderId,
              String(body.sender_role || 'customer'),
              String(body.sender_name || 'ユーザー'),
              text,
              body.image_url || null,
              now
            )
            .run();
          const res = await env.DB.prepare('SELECT * FROM order_messages WHERE order_id = ? ORDER BY id ASC')
            .bind(orderId)
            .all();
          return jsonResponse({ messages: res.results || [] }, 201);
        }

        // Merchant Accept (partner only)
        if (action === 'merchant-accept' && method === 'POST') {
          if (order.order_type !== 'partner') {
            return errorResponse('非提携店舗の注文は店舗承認対象外です');
          }
          if (order.status !== 'placed') {
            return errorResponse('この注文はすでに処理済みです', 409);
          }
          const body = (await request.json().catch(() => ({}))) as { estimated_prep_min?: number };
          const prepMin = Math.max(5, Math.min(90, Number(body.estimated_prep_min || 15)));
          await env.DB.prepare(
            `UPDATE orders SET status = 'preparing', estimated_prep_min = ?, updated_at = ? WHERE id = ?`
          )
            .bind(prepMin, now, orderId)
            .run();
          await addOrderEvent(
            env.DB,
            orderId,
            'merchant',
            String(order.store_name),
            'preparing',
            `店舗が注文を受注しました（調理目安：約${prepMin}分・ドライバー手配を開始）`
          );
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return jsonResponse({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Merchant Ready
        if (action === 'merchant-ready' && method === 'POST') {
          if (order.status !== 'preparing') {
            return errorResponse('調理中の注文のみ受け渡し準備完了にできます', 409);
          }
          await env.DB.prepare(`UPDATE orders SET status = 'ready_for_pickup', updated_at = ? WHERE id = ?`)
            .bind(now, orderId)
            .run();
          await addOrderEvent(
            env.DB,
            orderId,
            'merchant',
            String(order.store_name),
            'ready_for_pickup',
            '調理が完了しました（ドライバー受け渡し準備OK）'
          );
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return jsonResponse({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Merchant Reject
        if (action === 'merchant-reject' && method === 'POST') {
          const body = (await request.json().catch(() => ({}))) as { reason?: string };
          const reason = String(body.reason || '混雑または品切れのため受注できませんでした');
          await env.DB.prepare(
            `UPDATE orders SET status = 'cancelled', cancel_reason = ?, updated_at = ? WHERE id = ?`
          )
            .bind(reason, now, orderId)
            .run();
          await addOrderEvent(env.DB, orderId, 'merchant', String(order.store_name), 'cancelled', `店舗によりキャンセル：${reason}`);
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return jsonResponse({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Driver Accept Job
        if (action === 'driver-accept' && method === 'POST') {
          const body = (await request.json()) as { driver_id?: string };
          if (!body.driver_id) return errorResponse('driver_id is required');
          if (order.driver_id && order.driver_id !== body.driver_id) {
            return errorResponse('他のドライバーがすでにこの配達を受諾しました', 409);
          }
          const driver = await env.DB.prepare('SELECT * FROM drivers WHERE id = ?')
            .bind(body.driver_id)
            .first<Record<string, unknown>>();
          if (!driver) return errorResponse('ドライバーが見つかりません', 404);
          if (!driver.is_approved) return errorResponse('アカウントが未承認のため受諾できません', 403);
          if (order.order_type === 'proxy_takeout' && !driver.proxy_card_enabled) {
            return errorResponse('店頭代理注文を受諾するには代理決済カードの有効化が必要です', 403);
          }

          const nextStatus =
            order.order_type === 'proxy_takeout' ? 'driver_heading_to_store' : String(order.status);

          await env.DB.prepare(
            `UPDATE orders SET driver_id = ?, driver_name = ?, status = ?, updated_at = ? WHERE id = ?`
          )
            .bind(driver.id, driver.name, nextStatus, now, orderId)
            .run();

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
          return jsonResponse({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Proxy Takeout: Driver arrived at store & begins ordering takeout
        if (action === 'proxy-start-ordering' && method === 'POST') {
          if (order.order_type !== 'proxy_takeout') {
            return errorResponse('非提携店舗の代理注文のみ実行できます');
          }
          await env.DB.prepare(
            `UPDATE orders SET status = 'proxy_ordering', updated_at = ? WHERE id = ?`
          )
            .bind(now, orderId)
            .run();
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
          return jsonResponse({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Proxy Takeout: Driver confirms takeout purchase with actual receipt subtotal & receipt photo
        if (action === 'proxy-confirm-purchase' && method === 'POST') {
          if (order.order_type !== 'proxy_takeout') {
            return errorResponse('非提携店舗の代理注文のみ実行できます');
          }
          const body = (await request.json()) as {
            actual_subtotal?: number;
            receipt_image_url?: string;
            receipt_note?: string;
          };
          const actualSubtotal = Math.max(
            0,
            Math.round(Number(body.actual_subtotal ?? order.estimated_subtotal))
          );
          const estimatedSubtotal = Number(order.estimated_subtotal || 0);
          const priceDiff = actualSubtotal - estimatedSubtotal;

          const settings = await getSettings(env.DB);
          const serviceFee = Math.round(actualSubtotal * settings.service_fee_rate);
          const totalAmount =
            actualSubtotal +
            Number(order.delivery_fee || 0) +
            serviceFee +
            Number(order.proxy_fee || 0) +
            Number(order.tip_amount || 0);

          await env.DB.prepare(
            `UPDATE orders SET
              status = 'proxy_waiting',
              actual_subtotal = ?,
              price_diff = ?,
              service_fee = ?,
              total_amount = ?,
              receipt_image_url = COALESCE(?, receipt_image_url),
              receipt_note = COALESCE(?, receipt_note),
              updated_at = ?
             WHERE id = ?`
          )
            .bind(
              actualSubtotal,
              priceDiff,
              serviceFee,
              totalAmount,
              body.receipt_image_url || null,
              body.receipt_note || null,
              now,
              orderId
            )
            .run();

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
          return jsonResponse({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Driver Pickup -> Delivering
        if (action === 'driver-pickup' && method === 'POST') {
          if (
            order.status !== 'ready_for_pickup' &&
            order.status !== 'proxy_waiting' &&
            order.status !== 'preparing'
          ) {
            return errorResponse('現在この注文は受取可能な状態ではありません', 409);
          }
          await env.DB.prepare(`UPDATE orders SET status = 'delivering', updated_at = ? WHERE id = ?`)
            .bind(now, orderId)
            .run();
          if (order.driver_id) {
            // Position driver halfway between store and customer for live tracking realism
            const midLat = (Number(order.store_lat) * 2 + Number(order.delivery_lat)) / 3;
            const midLng = (Number(order.store_lng) * 2 + Number(order.delivery_lng)) / 3;
            await env.DB.prepare('UPDATE drivers SET current_lat = ?, current_lng = ? WHERE id = ?')
              .bind(midLat, midLng, order.driver_id)
              .run();
          }
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
          return jsonResponse({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Driver Deliver -> Delivered
        if (action === 'driver-deliver' && method === 'POST') {
          if (order.status !== 'delivering') {
            return errorResponse('配達中の注文のみ完了できます', 409);
          }
          const body = (await request.json().catch(() => ({}))) as { dropoff_image_url?: string };
          await env.DB.prepare(
            `UPDATE orders SET status = 'delivered', dropoff_image_url = COALESCE(?, dropoff_image_url), updated_at = ? WHERE id = ?`
          )
            .bind(body.dropoff_image_url || null, now, orderId)
            .run();

          if (order.driver_id) {
            await env.DB.prepare(
              `UPDATE drivers SET
                completed_deliveries = completed_deliveries + 1,
                total_earnings = total_earnings + ?,
                current_lat = ?,
                current_lng = ?
               WHERE id = ?`
            )
              .bind(Number(order.driver_payout || 0), order.delivery_lat, order.delivery_lng, order.driver_id)
              .run();
          }

          await addOrderEvent(
            env.DB,
            orderId,
            'driver',
            String(order.driver_name || 'ドライバー'),
            'delivered',
            'お届け先へ配達が完了しました。ご利用ありがとうございました！'
          );
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return jsonResponse({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Cancel order (Customer or Admin)
        if (action === 'cancel' && method === 'POST') {
          const body = (await request.json().catch(() => ({}))) as {
            reason?: string;
            actor_role?: string;
            actor_name?: string;
          };
          if (order.status === 'delivered') {
            return errorResponse('配達完了済みの注文はキャンセルできません', 409);
          }
          const reason = String(body.reason || 'お客様都合によるキャンセル');
          await env.DB.prepare(
            `UPDATE orders SET status = 'cancelled', cancel_reason = ?, updated_at = ? WHERE id = ?`
          )
            .bind(reason, now, orderId)
            .run();
          await addOrderEvent(
            env.DB,
            orderId,
            String(body.actor_role || 'customer'),
            String(body.actor_name || order.customer_name),
            'cancelled',
            `注文がキャンセルされました：${reason}`
          );
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return jsonResponse({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Customer Review
        if (action === 'review' && method === 'POST') {
          const body = (await request.json()) as {
            store_rating?: number;
            driver_rating?: number;
            comment?: string;
          };
          const sr = Math.max(1, Math.min(5, Math.round(Number(body.store_rating || 5))));
          const dr = Math.max(1, Math.min(5, Math.round(Number(body.driver_rating || 5))));
          await env.DB.prepare(
            `UPDATE orders SET customer_rating_store = ?, customer_rating_driver = ?, customer_review_comment = ?, updated_at = ? WHERE id = ?`
          )
            .bind(sr, dr, String(body.comment || ''), now, orderId)
            .run();

          // Update store rolling rating
          await env.DB.prepare(
            `UPDATE stores SET
              rating = ROUND(((rating * review_count) + ?) / (review_count + 1), 2),
              review_count = review_count + 1
             WHERE id = ?`
          )
            .bind(sr, order.store_id)
            .run();

          if (order.driver_id) {
            await env.DB.prepare(
              `UPDATE drivers SET
                rating = ROUND(((rating * MAX(completed_deliveries, 1)) + ?) / (MAX(completed_deliveries, 1) + 1), 2)
               WHERE id = ?`
            )
              .bind(dr, order.driver_id)
              .run();
          }

          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return jsonResponse({ order: formatOrder(updated as Record<string, unknown>) });
        }

        // Admin Override (force status / reassign driver)
        if (action === 'admin' && method === 'PATCH') {
          const body = (await request.json()) as {
            status?: string;
            driver_id?: string | null;
            note?: string;
          };
          let driverId = order.driver_id as string | null;
          let driverName = order.driver_name as string | null;
          if (body.driver_id !== undefined) {
            if (!body.driver_id) {
              driverId = null;
              driverName = null;
            } else {
              const drv = await env.DB.prepare('SELECT id, name FROM drivers WHERE id = ?')
                .bind(body.driver_id)
                .first<{ id: string; name: string }>();
              if (!drv) return errorResponse('指定ドライバーが見つかりません', 404);
              driverId = drv.id;
              driverName = drv.name;
            }
          }
          const nextStatus = body.status || String(order.status);
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
            body.note || `管理画面から状態を「${nextStatus}」に更新しました${driverName ? `（担当：${driverName}）` : ''}`
          );
          const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
          return jsonResponse({ order: formatOrder(updated as Record<string, unknown>) });
        }
      }

      // ================================================================
      // ADMIN ANALYTICS & RESET DEMO
      // ================================================================
      if (path === '/api/admin/analytics' && method === 'GET') {
        const settings = await getSettings(env.DB);
        const [ordersRes, storesRes, driversRes, recentEventsRes] = await Promise.all([
          env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC').all(),
          env.DB.prepare('SELECT * FROM stores').all(),
          env.DB.prepare('SELECT * FROM drivers').all(),
          env.DB.prepare(
            `SELECT e.*, o.store_name, o.order_type
             FROM order_events e
             JOIN orders o ON e.order_id = o.id
             ORDER BY e.id DESC LIMIT 20`
          ).all(),
        ]);

        const orders = (ordersRes.results || []) as Array<Record<string, unknown>>;
        const stores = (storesRes.results || []) as Array<Record<string, unknown>>;
        const drivers = (driversRes.results || []) as Array<Record<string, unknown>>;

        const validOrders = orders.filter((o) => o.status !== 'cancelled');
        const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(String(o.status)));
        const partnerOrders = validOrders.filter((o) => o.order_type === 'partner');
        const proxyOrders = validOrders.filter((o) => o.order_type === 'proxy_takeout');

        const totalGmv = validOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const partnerGmv = partnerOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const proxyGmv = proxyOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

        const commissionRevenue = partnerOrders.reduce(
          (s, o) => s + Math.round(Number(o.actual_subtotal ?? o.estimated_subtotal ?? 0) * settings.merchant_commission_rate),
          0
        );
        const feeRevenue = validOrders.reduce(
          (s, o) => s + Number(o.service_fee || 0) + Number(o.proxy_fee || 0) + Number(o.delivery_fee || 0),
          0
        );
        const driverPayoutTotal = validOrders.reduce((s, o) => s + Number(o.driver_payout || 0), 0);

        const statusCounts: Record<string, number> = {};
        for (const o of orders) {
          const st = String(o.status);
          statusCounts[st] = (statusCounts[st] || 0) + 1;
        }

        return jsonResponse({
          summary: {
            total_orders: orders.length,
            active_orders: activeOrders.length,
            completed_orders: orders.filter((o) => o.status === 'delivered').length,
            cancelled_orders: orders.filter((o) => o.status === 'cancelled').length,
            partner_orders: partnerOrders.length,
            proxy_orders: proxyOrders.length,
            total_gmv: totalGmv,
            partner_gmv: partnerGmv,
            proxy_gmv: proxyGmv,
            commission_revenue: commissionRevenue,
            fee_revenue: feeRevenue,
            driver_payout_total: driverPayoutTotal,
            net_platform_revenue: Math.max(0, commissionRevenue + feeRevenue - driverPayoutTotal),
            total_stores: stores.length,
            partner_stores: stores.filter((s) => Boolean(s.is_partner)).length,
            non_partner_stores: stores.filter((s) => !Boolean(s.is_partner)).length,
            unlisted_stores: stores.filter((s) => Boolean(s.is_unlisted_request)).length,
            online_drivers: drivers.filter((d) => Boolean(d.is_online)).length,
            total_drivers: drivers.length,
            proxy_capable_drivers: drivers.filter((d) => Boolean(d.proxy_card_enabled)).length,
          },
          status_counts: statusCounts,
          recent_events: recentEventsRes.results || [],
        });
      }

      if (path === '/api/admin/reset-demo' && method === 'POST') {
        await seedDatabase(env.DB);
        return jsonResponse({ ok: true, message: 'デモデータを初期化しました' });
      }

      return errorResponse('Endpoint not found', 404);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal Server Error';
      console.error('Worker error:', err);
      return errorResponse(msg, 500);
    }
  },
};
