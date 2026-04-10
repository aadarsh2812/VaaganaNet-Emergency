import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
delete L.Icon.Default.prototype._getIconUrl

// ── Icons ─────────────────────────────────────────────────────────────────────

function makeAmbIcon(busy, label) {
  const color = busy ? '#ea580c' : '#2563eb'
  const cab   = busy ? '#c2410c' : '#1d4ed8'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="32" viewBox="0 0 52 32">
    <rect x="1" y="8" width="36" height="18" rx="3" fill="${color}"/>
    <rect x="31" y="4" width="19" height="23" rx="3" fill="${cab}"/>
    <rect x="33" y="7" width="11" height="8" rx="2" fill="#bfdbfe" opacity="0.9"/>
    <rect x="9" y="14" width="11" height="3.5" rx="1.5" fill="white"/>
    <rect x="12" y="11" width="3.5" height="10" rx="1.5" fill="white"/>
    <circle cx="10" cy="27" r="4.5" fill="#1e293b"/>
    <circle cx="10" cy="27" r="2.5" fill="#64748b"/>
    <circle cx="34" cy="27" r="4.5" fill="#1e293b"/>
    <circle cx="34" cy="27" r="2.5" fill="#64748b"/>
    <rect x="7"  y="5" width="6" height="4" rx="1" fill="${busy?'#ef4444':'#94a3b8'}" opacity="${busy?1:0.5}"/>
    <rect x="15" y="5" width="6" height="4" rx="1" fill="${busy?'#3b82f6':'#94a3b8'}" opacity="${busy?1:0.5}"/>
    ${busy ? `<circle cx="6" cy="7" r="2" fill="#fbbf24" opacity="0.9"/>` : ''}
  </svg>`
  return L.divIcon({
    html: `<div style="position:relative;width:52px;height:32px">
      ${busy ? `<div style="position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:10px;height:10px;border-radius:50%;background:#ef4444;animation:pulse-dot 1s ease-in-out infinite;z-index:1"></div>` : ''}
      <div style="width:52px;height:32px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.35))">${svg}</div>
      <div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);background:${color};color:white;font-size:9px;font-weight:700;white-space:nowrap;padding:2px 6px;border-radius:4px;font-family:monospace">${label}</div>
    </div>`,
    className: '', iconSize: [52, 32], iconAnchor: [26, 16],
  })
}

function makeHospIcon() {
  return L.divIcon({
    html: `<div style="width:44px;height:52px;filter:drop-shadow(0 4px 10px rgba(37,99,235,0.35))">
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">
        <rect x="3" y="16" width="38" height="32" rx="3" fill="white" stroke="#2563eb" stroke-width="1.5"/>
        <polygon points="1,17 22,3 43,17" fill="#eff6ff" stroke="#2563eb" stroke-width="1.2"/>
        <rect x="17" y="7" width="10" height="2.5" rx="1.2" fill="#2563eb"/>
        <rect x="19.8" y="4.5" width="4" height="8" rx="1.2" fill="#2563eb"/>
        <rect x="5"  y="22" width="7" height="7" rx="1.5" fill="#dbeafe" stroke="#93c5fd" stroke-width="0.5"/>
        <rect x="18" y="22" width="8" height="7" rx="1.5" fill="#dbeafe" stroke="#93c5fd" stroke-width="0.5"/>
        <rect x="32" y="22" width="7" height="7" rx="1.5" fill="#dbeafe" stroke="#93c5fd" stroke-width="0.5"/>
        <rect x="16" y="34" width="12" height="14" rx="1.5" fill="white" stroke="#93c5fd" stroke-width="1"/>
        <rect x="18" y="39" width="8" height="2" rx="1" fill="#2563eb"/>
        <rect x="21" y="36" width="2" height="8" rx="1" fill="#2563eb"/>
      </svg>
    </div>`,
    className: '', iconSize: [44, 52], iconAnchor: [22, 52],
  })
}

function makeTrafficIcon(state) {
  const green = state === 'green'
  return L.divIcon({
    html: `<div style="width:16px;height:30px;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.3))">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="30" viewBox="0 0 16 30">
        <rect x="2" y="0" width="12" height="22" rx="4" fill="#1f2937"/>
        <circle cx="8" cy="6"  r="3.5" fill="${!green?'#ef4444':'#374151'}" opacity="${!green?1:0.3}"/>
        <circle cx="8" cy="15" r="3.5" fill="${green?'#22c55e':'#374151'}"  opacity="${green?1:0.3}"/>
        ${!green ? `<circle cx="8" cy="6"  r="1.5" fill="#fca5a5" opacity="0.7"/>` : ''}
        ${green  ? `<circle cx="8" cy="15" r="1.5" fill="#86efac" opacity="0.8"/>` : ''}
        <rect x="7" y="22" width="2" height="7" fill="#374151"/>
      </svg>
    </div>`,
    className: '', iconSize: [16, 30], iconAnchor: [8, 30],
  })
}

function makeEmergIcon() {
  return L.divIcon({
    html: `<div style="width:36px;height:36px;filter:drop-shadow(0 0 10px rgba(220,38,38,0.6))">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="rgba(220,38,38,0.12)" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="5,3"/>
        <circle cx="18" cy="18" r="10" fill="rgba(220,38,38,0.2)" stroke="#dc2626" stroke-width="1.2"/>
        <circle cx="18" cy="18" r="5" fill="#dc2626"/>
        <line x1="18" y1="2"  x2="18" y2="9"  stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="18" y1="27" x2="18" y2="34" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="2"  y1="18" x2="9"  y2="18" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="27" y1="18" x2="34" y2="18" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </div>`,
    className: '', iconSize: [36, 36], iconAnchor: [18, 18],
  })
}

const PLACE_ICONS = {
  ambulance: { emoji: '🚑', bg: '#2563eb' },
  hospital:  { emoji: '🏥', bg: '#16a34a' },
  traffic:   { emoji: '🚦', bg: '#ca8a04' },
  patient:   { emoji: '🆘', bg: '#dc2626' },
}

function makePendingIcon(type) {
  const cfg = PLACE_ICONS[type] || { emoji: '📍', bg: '#6b7280' }
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;animation:bounce 0.6s ease-in-out infinite alternate">
      <div style="width:38px;height:38px;border-radius:50%;background:${cfg.bg};border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:18px">${cfg.emoji}</div>
      <div style="width:2px;height:10px;background:${cfg.bg};margin-top:1px;border-radius:1px"></div>
      <div style="width:6px;height:3px;border-radius:50%;background:rgba(0,0,0,0.2)"></div>
    </div>`,
    className: '', iconSize: [38, 54], iconAnchor: [19, 54],
  })
}

const CURSOR_STYLES = { ambulance:'crosshair', hospital:'crosshair', traffic:'crosshair', patient:'crosshair' }

function animateMarker(marker, fromLat, fromLon, toLat, toLon, duration = 1800) {
  const start = performance.now()
  const tick = (now) => {
    const t    = Math.min((now - start) / duration, 1)
    const ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2
    marker.setLatLng([fromLat + (toLat-fromLat)*ease, fromLon + (toLon-fromLon)*ease])
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapView({
  ambulances    = [],
  hospitals     = [],
  traffic       = [],
  route         = [],
  emergencyLoc  = null,
  center        = [13.0827, 80.2707],
  zoom          = 13,
  height        = '100%',
  onAmbulanceClick = null,
  followAmbulance  = null,
  placeMode        = null,
  onMapClick       = null,
  pendingMarker    = null,
}) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const layers       = useRef({ a:{}, h:{}, t:{}, line:null, em:null, pending:null })
  const prevPos      = useRef({})
  const prevStatus   = useRef({})
  const routeKey     = useRef('')

  // Init map
  useEffect(() => {
    if (mapRef.current) return
    const m = L.map(containerRef.current, {
      center, zoom, attributionControl: false, zoomControl: true,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd',
    }).addTo(m)
    mapRef.current = m
    return () => { m.remove(); mapRef.current = null }
  }, [])

  // Click handler
  useEffect(() => {
    const m = mapRef.current; if (!m) return
    const handler = (e) => { if (placeMode && onMapClick) onMapClick(e.latlng.lat, e.latlng.lng) }
    m.on('click', handler)
    if (m._container) m._container.style.cursor = placeMode ? (CURSOR_STYLES[placeMode] || 'crosshair') : ''
    return () => m.off('click', handler)
  }, [placeMode, onMapClick])

  // Pending marker
  useEffect(() => {
    const m = mapRef.current; if (!m) return
    if (layers.current.pending) { m.removeLayer(layers.current.pending); layers.current.pending = null }
    if (pendingMarker?.lat && pendingMarker?.lon) {
      layers.current.pending = L.marker([pendingMarker.lat, pendingMarker.lon], { icon: makePendingIcon(pendingMarker.type), zIndexOffset: 500 })
        .bindTooltip(`Drop ${pendingMarker.type} here`, { className:'map-tip' }).addTo(m)
    }
  }, [pendingMarker])

  // Ambulances
  useEffect(() => {
    const m = mapRef.current; if (!m) return
    const L2 = layers.current.a
    ambulances.forEach(a => {
      const label = a.label || a._id.slice(0, 6)
      if (L2[a._id]) {
        const ps = prevStatus.current[a._id]
        if (!ps || ps.status !== a.status || ps.label !== label) {
          L2[a._id].setIcon(makeAmbIcon(a.status === 'busy', label))
          prevStatus.current[a._id] = { status: a.status, label }
        }
        L2[a._id].setTooltipContent(`<b>${a.label||'Ambulance'}</b><br>Status: ${a.status}<br>Fuel: ${a.fuel?.toFixed(0)}%`)
        const prev = prevPos.current[a._id]
        if (prev && (Math.abs(prev.lat-a.lat)>0.00005 || Math.abs(prev.lon-a.lon)>0.00005)) {
          animateMarker(L2[a._id], prev.lat, prev.lon, a.lat, a.lon, 1800)
        }
      } else {
        const mk = L.marker([a.lat, a.lon], { icon: makeAmbIcon(a.status === 'busy', label), zIndexOffset: 100 })
          .bindTooltip(`<b>${a.label||'Ambulance'}</b><br>Status: ${a.status}<br>Fuel: ${a.fuel?.toFixed(0)}%`, { className:'map-tip', sticky:true })
        if (onAmbulanceClick) mk.on('click', () => onAmbulanceClick(a))
        mk.addTo(m)
        L2[a._id] = mk
        prevStatus.current[a._id] = { status: a.status, label }
      }
      prevPos.current[a._id] = { lat: a.lat, lon: a.lon }
    })
    Object.keys(L2).forEach(id => {
      if (!ambulances.find(x=>x._id===id)) { m.removeLayer(L2[id]); delete L2[id]; delete prevPos.current[id]; delete prevStatus.current[id] }
    })
  }, [ambulances, onAmbulanceClick])

  // Follow ambulance
  useEffect(() => {
    const m = mapRef.current; if (!m || !followAmbulance) return
    const amb = ambulances.find(a=>a._id===followAmbulance)
    if (amb) m.panTo([amb.lat, amb.lon], { animate:true, duration:1.5, easeLinearity:0.25 })
  }, [ambulances, followAmbulance])

  // Hospitals
  useEffect(() => {
    const m = mapRef.current; if (!m) return
    const L2 = layers.current.h
    hospitals.forEach(h => {
      if (!L2[h._id]) {
        L2[h._id] = L.marker([h.lat, h.lon], { icon: makeHospIcon(), zIndexOffset: 50 })
          .bindTooltip(`<b>${h.name}</b><br>Cases: ${h.active_cases??0}/${h.capacity??50}`, { className:'map-tip', sticky:true })
          .addTo(m)
      } else L2[h._id].setTooltipContent(`<b>${h.name}</b><br>Cases: ${h.active_cases??0}/${h.capacity??50}`)
    })
    Object.keys(L2).forEach(id => { if (!hospitals.find(x=>x._id===id)) { m.removeLayer(L2[id]); delete L2[id] } })
  }, [hospitals])

  // Traffic
  useEffect(() => {
    const m = mapRef.current; if (!m) return
    const L2 = layers.current.t
    traffic.forEach(t => {
      const icon = makeTrafficIcon(t.state)
      if (L2[t._id]) L2[t._id].setIcon(icon)
      else L2[t._id] = L.marker([t.lat, t.lon], { icon })
        .bindTooltip(t.intersection_name||'Junction', { className:'map-tip' }).addTo(m)
    })
    Object.keys(L2).forEach(id => { if (!traffic.find(x=>x._id===id)) { m.removeLayer(L2[id]); delete L2[id] } })
  }, [traffic])

  // Route — solid blue
  useEffect(() => {
    const m = mapRef.current; if (!m) return
    const key = route.length > 1 ? `${JSON.stringify(route[0])}-${route.length}` : 'empty'
    if (key === routeKey.current) return
    routeKey.current = key
    if (layers.current.line) { m.removeLayer(layers.current.line); layers.current.line = null }
    if (route.length > 1) {
      const pts  = route.map(c => Array.isArray(c) ? [c[0],c[1]] : [c.lat,c.lon])
      const line = L.polyline(pts, { color:'#2563eb', weight:4, opacity:0.85 })
      layers.current.line = L.layerGroup([line]).addTo(m)
      try { m.fitBounds(line.getBounds(), { padding:[60,60], maxZoom:15 }) } catch(_) {}
    }
  }, [route])

  // Emergency
  useEffect(() => {
    const m = mapRef.current; if (!m) return
    if (layers.current.em) { m.removeLayer(layers.current.em); layers.current.em = null }
    if (emergencyLoc?.lat && emergencyLoc?.lon) {
      layers.current.em = L.marker([emergencyLoc.lat, emergencyLoc.lon], { icon: makeEmergIcon(), zIndexOffset: 200 })
        .bindTooltip('<b>🚨 Emergency Location</b>', { className:'map-tip' }).addTo(m)
    }
  }, [emergencyLoc])

  return (
    <>
      <style>{`
        .map-tip { background:white!important; border:1px solid #e2e8f0!important; border-radius:8px!important; padding:6px 10px!important; font-size:12px!important; font-family:'Inter',sans-serif!important; box-shadow:0 4px 12px rgba(0,0,0,0.1)!important; color:#111827!important; }
        .map-tip::before { display:none!important; }
        @keyframes bounce { from { transform:translateY(0); } to { transform:translateY(-8px); } }
      `}</style>
      <div ref={containerRef} style={{ width:'100%', height, borderRadius:10, overflow:'hidden', boxShadow:'var(--shadow)' }} />
    </>
  )
}
