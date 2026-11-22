import type { Order } from '../types';

interface DeliveryMapProps {
  order: Order;
  compact?: boolean;
}

// Projects Shibuya/Ebisu/Nakameguro/Roppongi lat/lng cleanly onto SVG canvas
function project(lat: number, lng: number, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  const padX = 56;
  const padY = 38;
  const w = 520 - padX * 2;
  const h = 220 - padY * 2;
  const xNorm = (lng - bounds.minLng) / Math.max(0.002, bounds.maxLng - bounds.minLng);
  const yNorm = 1 - (lat - bounds.minLat) / Math.max(0.002, bounds.maxLat - bounds.minLat);
  return {
    x: padX + Math.max(0, Math.min(1, xNorm)) * w,
    y: padY + Math.max(0, Math.min(1, yNorm)) * h,
  };
}

export function DeliveryMap({ order }: DeliveryMapProps) {
  const pts: Array<{ lat: number; lng: number }> = [
    { lat: order.store_lat || 35.658, lng: order.store_lng || 139.701 },
    { lat: order.delivery_lat || 35.652, lng: order.delivery_lng || 139.706 },
  ];
  if (order.driver_lat && order.driver_lng) {
    pts.push({ lat: order.driver_lat, lng: order.driver_lng });
  }

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const latMargin = Math.max(0.004, (Math.max(...lats) - Math.min(...lats)) * 0.45);
  const lngMargin = Math.max(0.005, (Math.max(...lngs) - Math.min(...lngs)) * 0.45);
  const bounds = {
    minLat: Math.min(...lats) - latMargin,
    maxLat: Math.max(...lats) + latMargin,
    minLng: Math.min(...lngs) - lngMargin,
    maxLng: Math.max(...lngs) + lngMargin,
  };

  const storePt = project(pts[0].lat, pts[0].lng, bounds);
  const destPt = project(pts[1].lat, pts[1].lng, bounds);
  const driverPt =
    order.driver_lat && order.driver_lng ? project(order.driver_lat, order.driver_lng, bounds) : null;

  const isProxy = order.order_type === 'proxy_takeout';

  return (
    <div className="delivery-map-card">
      <svg viewBox="0 0 520 220" className="delivery-map-svg" role="img" aria-label="配達ルートマップ">
        {/* Stylized Urban Map Canvas */}
        <rect x="0" y="0" width="520" height="220" fill="#EDF1EA" />
        {/* Parks */}
        <path d="M0 155 Q60 130 110 170 L90 220 L0 220 Z" fill="#D8E8D2" />
        <path d="M400 0 L520 0 L520 75 Q460 85 420 50 Z" fill="#D8E8D2" />
        {/* Clean City Avenues */}
        <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
          <path d="M-10 62 L530 48" strokeWidth="8" />
          <path d="M-10 142 L530 154" strokeWidth="7" />
          <path d="M120 -10 L146 230" strokeWidth="7" />
          <path d="M290 -10 L262 230" strokeWidth="9" />
          <path d="M425 -10 L440 230" strokeWidth="6" />
        </g>
        <g stroke="#DFE5DC" strokeWidth="1.5" fill="none">
          <path d="M40 -10 L60 230" />
          <path d="M205 -10 L195 230" />
          <path d="M355 -10 L365 230" />
          <path d="M-10 102 L530 98" />
          <path d="M-10 188 L530 192" />
        </g>

        {/* Route Path: Store -> Customer */}
        <path
          d={`M ${storePt.x} ${storePt.y} Q ${(storePt.x + destPt.x) / 2} ${Math.min(storePt.y, destPt.y) - 24} ${destPt.x} ${destPt.y}`}
          fill="none"
          stroke={isProxy ? '#C85A17' : '#068449'}
          strokeWidth="3.5"
          strokeDasharray="7 6"
          strokeLinecap="round"
        />

        {/* If driver heading to store, show leg from driver to store */}
        {driverPt && (order.status === 'driver_heading_to_store' || order.status === 'preparing' || order.status === 'ready_for_pickup') && (
          <line
            x1={driverPt.x}
            y1={driverPt.y}
            x2={storePt.x}
            y2={storePt.y}
            stroke="#1D63B8"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />
        )}

        {/* Store Pin */}
        <g transform={`translate(${storePt.x}, ${storePt.y})`}>
          <circle r="16" fill={isProxy ? 'rgba(200,90,23,0.18)' : 'rgba(6,132,73,0.18)'} />
          <circle r="9" fill={isProxy ? '#C85A17' : '#068449'} stroke="#FFFFFF" strokeWidth="2.5" />
          <rect x="-48" y="-33" width="96" height="19" rx="9" fill="#141413" opacity="0.88" />
          <text x="0" y="-20" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">
            {isProxy ? '店頭買付先' : '店舗'}
          </text>
        </g>

        {/* Customer Destination Pin */}
        <g transform={`translate(${destPt.x}, ${destPt.y})`}>
          <circle r="15" fill="rgba(20,20,19,0.12)" />
          <circle r="8.5" fill="#141413" stroke="#FFFFFF" strokeWidth="2.5" />
          <rect x="-36" y="13" width="72" height="19" rx="9" fill="#FFFFFF" stroke="#141413" strokeWidth="1" />
          <text x="0" y="26" textAnchor="middle" fill="#141413" fontSize="10" fontWeight="700">
            お届け先
          </text>
        </g>

        {/* Live Driver Marker */}
        {driverPt && order.status !== 'cancelled' && (
          <g transform={`translate(${driverPt.x}, ${driverPt.y})`}>
            <circle r="18" fill="rgba(29,99,184,0.22)" />
            <circle r="10" fill="#1D63B8" stroke="#FFFFFF" strokeWidth="2.5" />
            <circle r="3.2" fill="#FFFFFF" />
            <rect x="-42" y="-33" width="84" height="19" rx="9" fill="#1D63B8" />
            <text x="0" y="-20" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">
              {order.driver_name || 'ドライバー'}
            </text>
          </g>
        )}
      </svg>

      <div className="delivery-map-legend">
        <div className="map-legend-items">
          <span className="map-legend-item">
            <span className="map-dot" style={{ background: isProxy ? '#C85A17' : '#068449' }} />
            {order.store_name}
          </span>
          <span className="map-legend-item">
            <span className="map-dot" style={{ background: '#141413' }} />
            {order.delivery_address.slice(0, 22)}
            {order.delivery_address.length > 22 ? '…' : ''}
          </span>
          {order.driver_name && (
            <span className="map-legend-item">
              <span className="map-dot" style={{ background: '#1D63B8' }} />
              担当: {order.driver_name}
            </span>
          )}
        </div>
        <span className="tabular-nums" style={{ fontWeight: 700 }}>
          受取コード: {order.order_code}
        </span>
      </div>
    </div>
  );
}
