import L from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// ── Icon builders ─────────────────────────────────────────────────────────────
function buildActiveIcon(deg) {
  return L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 32],
    html: `
      <div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;
        transform:rotate(${deg}deg);transition:transform 150ms ease;
        filter:drop-shadow(0 0 10px rgba(29,78,216,0.75)) drop-shadow(0 2px 5px rgba(0,0,0,0.25));">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="28" r="5.5" fill="#1e3a8a" stroke="#1d4ed8" stroke-width="1.5"/>
          <path d="M18 3 L30 25 L18 20 L6 25 Z" fill="#1d4ed8" stroke="#93c5fd" stroke-width="1.2"/>
        </svg>
      </div>`,
  })
}

const HOSPITAL_ICON = L.divIcon({
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  html: `
    <div style="width:34px;height:34px;background:white;border:2.5px solid #dc2626;
      border-radius:8px;display:flex;align-items:center;justify-content:center;
      font-size:18px;box-shadow:0 2px 10px rgba(220,38,38,0.3);">🏥</div>`,
})

const EMERGENCY_ICON = L.divIcon({
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  html: `
    <div class="emergency-pulse-marker"
      style="width:40px;height:40px;background:#dc2626;border:3px solid white;
      border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:20px;box-shadow:0 0 0 5px rgba(220,38,38,0.25);">⚠️</div>`,
})

// ── Follow active ambulance ───────────────────────────────────────────────────
function FollowActive({ pos }) {
  const map = useMap()
  map.setView([pos.lat, pos.lng], map.getZoom(), { animate: true, duration: 0.3 })
  return null
}

// ── Main MapView ──────────────────────────────────────────────────────────────
export default function MapView({
  markerPosition,
  headingDeg   = 0,
  trail        = [],
  hospitals    = [],
  emergencyLoc = null,
}) {
  const activeIcon = buildActiveIcon(headingDeg)

  return (
    <MapContainer
      center={[markerPosition.lat, markerPosition.lng]}
      zoom={15}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {/* Route trail */}
      {trail.length > 1 && (
        <Polyline
          positions={trail}
          pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.7 }}
        />
      )}

      {/* Auto-follow active ambulance */}
      <FollowActive pos={markerPosition} />

      {/* Ambulance arrow */}
      <Marker position={[markerPosition.lat, markerPosition.lng]} icon={activeIcon}>
        <Popup>
          <strong>AMB-01</strong> — Active<br />
          <small>{markerPosition.lat.toFixed(5)}, {markerPosition.lng.toFixed(5)}</small>
        </Popup>
      </Marker>

      {/* Hospital landmarks */}
      {hospitals.map((h, i) => (
        <Marker
          key={h.id ?? `hosp-${i}`}
          position={[h.lat, h.lon ?? h.lng ?? 0]}
          icon={HOSPITAL_ICON}
        >
          <Popup>
            <strong>🏥 {h.name}</strong>
            {h.beds && <><br /><small>Beds: {h.beds}</small></>}
          </Popup>
        </Marker>
      ))}

      {/* Emergency pin — pulsing red */}
      {emergencyLoc && (
        <Marker position={[emergencyLoc.lat, emergencyLoc.lng]} icon={EMERGENCY_ICON}>
          <Popup>
            <strong>🚨 Emergency!</strong><br />
            <small>{emergencyLoc.lat.toFixed(5)}, {emergencyLoc.lng.toFixed(5)}</small>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}
