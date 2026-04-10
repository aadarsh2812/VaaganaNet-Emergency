import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import MapView from '../components/MapView'
import { useWS } from '../context/WSContext'
import { useToast, ToastContainer } from '../components/Toast'
import { addAmbulance, addHospital, addTrafficLight, listEmergencies } from '../api'

export default function ControlCentre() {
  const { data } = useWS()
  const { toasts, show } = useToast()
  const [tab, setTab]           = useState('overview')
  const [emergencies, setEmerg] = useState([])
  const [arrivedLog, setArrivedLog] = useState([])
  const [selAmb, setSelAmb]     = useState(null)

  const [placeMode, setPlaceMode]   = useState(null)
  const [pending,   setPending]     = useState(null)
  const [ambLabel,  setAmbLabel]    = useState('')
  const [hospName,  setHospName]    = useState('')
  const [juncName,  setJuncName]    = useState('')
  const [saving,    setSaving]      = useState(false)

  useEffect(() => {
    listEmergencies().then(all => {
      setEmerg(all.filter(e => e.status === 'active'))
      setArrivedLog(all.filter(e => e.status === 'completed'))
    }).catch(() => {})
  }, [data.timestamp])

  const handleMapClick = (lat, lon) => {
    if (!placeMode) return
    setPending({ lat, lon, type: placeMode })
  }

  const confirmPlace = async () => {
    if (!pending || saving) return
    setSaving(true)
    try {
      if (pending.type === 'ambulance') {
        await addAmbulance(pending.lat, pending.lon, ambLabel || undefined)
        show(`🚑 Ambulance placed at ${pending.lat.toFixed(4)}, ${pending.lon.toFixed(4)}`)
        setAmbLabel('')
      } else if (pending.type === 'hospital') {
        await addHospital(hospName || 'General Hospital', pending.lat, pending.lon)
        show(`🏥 ${hospName || 'General Hospital'} placed`)
        setHospName('')
      } else if (pending.type === 'traffic') {
        await addTrafficLight(pending.lat, pending.lon, juncName || undefined)
        show(`🚦 Traffic light placed`)
        setJuncName('')
      }
      setPending(null); setPlaceMode(null)
    } catch (e) { show(e.response?.data?.detail || e.message, 'error') }
    setSaving(false)
  }

  const cancelPlace = () => { setPending(null); setPlaceMode(null) }

  const ambulances  = data.ambulances || []
  const hospitals   = data.hospitals  || []
  const traffic     = data.traffic    || []
  const busyAmbs    = ambulances.filter(a => a.status === 'busy')
  const idleAmbs    = ambulances.filter(a => a.status === 'idle')
  const sim         = data.simulation || {}

  const TABS = [
    { k:'overview', label:'Overview' },
    { k:'fleet',    label:'Fleet' },
    { k:'infra',    label:'Add to Map' },
    { k:`log`,      label:`Logs${arrivedLog.length ? ` (${arrivedLog.length})` : ''}` },
  ]
  const tabStyle = (active) => ({
    flex:1, padding:'10px 2px', border:'none', cursor:'pointer',
    background: active ? 'white' : 'transparent',
    color: active ? 'var(--blue2)' : 'var(--text3)',
    borderBottom: active ? '2px solid var(--blue2)' : '2px solid transparent',
    fontSize:11.5, fontWeight:700, fontFamily:"'Rajdhani',sans-serif",
    letterSpacing:'0.04em', textTransform:'uppercase',
  })

  return (
    <Layout title="Control Centre" subtitle="Fleet monitoring & infrastructure management" currentPage="control">
      <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
        <div style={{ width:280, background:'white', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--surface2)' }}>
            {TABS.map(t => <button key={t.k} onClick={() => setTab(t.k)} style={tabStyle(tab===t.k)}>{t.label}</button>)}
          </div>
          <div style={{ flex:1, overflow:'auto', padding:14 }}>

            {tab === 'overview' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <StatCard label="Active Calls" val={emergencies.length}         color="var(--red2)"    bg="var(--red-lt)" />
                  <StatCard label="Dispatched"   val={busyAmbs.length}            color="var(--orange2)" bg="var(--orange-lt)" />
                  <StatCard label="Available"    val={idleAmbs.length}            color="var(--green2)"  bg="var(--green-lt)" />
                  <StatCard label="Green Lights" val={traffic.filter(t=>t.state==='green').length} color="var(--green2)" bg="var(--green-lt)" />
                </div>
                {sim.ambulance_id && (
                  <div style={{ background:'var(--orange-lt)', border:'1px solid var(--orange-lt2)', borderRadius:10, padding:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--orange2)', animation:'pulse-dot 1s ease-in-out infinite' }}/>
                      <span style={{ fontWeight:600, fontSize:13, color:'var(--orange)' }}>Ambulance En Route</span>
                    </div>
                    <div style={{ height:6, background:'var(--orange-lt2)', borderRadius:3, marginBottom:6 }}>
                      <div style={{ width:`${sim.progress_pct??0}%`, height:'100%', background:'var(--orange2)', borderRadius:3, transition:'width 1s' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                      <span style={{ color:'var(--text3)' }}>{sim.progress_pct??0}% complete</span>
                      <span style={{ color:'var(--orange)', fontWeight:700 }}>ETA: {sim.remaining_min} min</span>
                    </div>
                  </div>
                )}
                <div>
                  <div className="label" style={{ marginBottom:8 }}>Active Emergencies</div>
                  {emergencies.length === 0
                    ? <Empty msg="No active emergencies" />
                    : emergencies.map(em => (
                      <div key={em._id} style={{ background:'var(--red-lt)', border:'1px solid var(--red-lt2)', borderRadius:9, padding:10, marginBottom:6 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <code style={{ fontSize:11, color:'var(--text3)' }}>{em._id.slice(0,12)}…</code>
                          <span className="badge badge-red">ACTIVE</span>
                        </div>
                        <div style={{ fontSize:12, color:'var(--text2)' }}>{em.distance_km} km · {em.duration_min?.toFixed(0)} min ETA</div>
                      </div>
                    ))
                  }
                </div>
                <div>
                  <div className="label" style={{ marginBottom:8 }}>Hospital Load</div>
                  {hospitals.length === 0 ? <Empty msg="No hospitals on map yet" /> : hospitals.map(h => {
                    const load = Math.round(((h.active_cases||0)/(h.capacity||50))*100)
                    return (
                      <div key={h._id} style={{ marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                          <span style={{ fontSize:12, fontWeight:500 }}>{h.name}</span>
                          <span style={{ fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:load>80?'var(--red)':load>50?'var(--orange)':'var(--green)' }}>{load}%</span>
                        </div>
                        <div style={{ height:5, background:'var(--surface3)', borderRadius:3 }}>
                          <div style={{ width:`${load}%`, height:'100%', background:load>80?'var(--red2)':load>50?'var(--orange2)':'var(--green2)', borderRadius:3 }}/>
                        </div>
                        <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{h.active_cases}/{h.capacity} beds</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {tab === 'fleet' && (
              <div>
                <div className="label" style={{ marginBottom:8 }}>ACTIVE ({busyAmbs.length})</div>
                {busyAmbs.map(a => <AmbCard key={a._id} amb={a} onClick={() => setSelAmb(a)} />)}
                {busyAmbs.length === 0 && <Empty msg="No dispatched ambulances" />}
                <div className="label" style={{ margin:'14px 0 8px' }}>AVAILABLE ({idleAmbs.length})</div>
                {idleAmbs.map(a => <AmbCard key={a._id} amb={a} onClick={() => setSelAmb(a)} />)}
                {idleAmbs.length === 0 && <Empty msg="No idle ambulances" />}
              </div>
            )}

            {tab === 'infra' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:'var(--blue-lt)', border:'1px solid var(--blue-lt2)', borderRadius:9, padding:12 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--blue2)', marginBottom:6 }}>📍 How to place on map</div>
                  <ol style={{ fontSize:12, color:'var(--text2)', paddingLeft:16, lineHeight:2 }}>
                    <li>Select what you want to add below</li>
                    <li>Click anywhere on the map</li>
                    <li>A pin will appear — confirm placement</li>
                  </ol>
                </div>
                <PlaceCard title="🚑 Add Ambulance" desc="Places an idle ambulance at clicked location" active={placeMode==='ambulance'} onActivate={()=>{setPlaceMode('ambulance');setPending(null)}} onCancel={cancelPlace}>
                  <input className="input" placeholder="Label e.g. AMB-01 (optional)" value={ambLabel} onChange={e=>setAmbLabel(e.target.value)}/>
                </PlaceCard>
                <PlaceCard title="🏥 Add Hospital" desc="Places a hospital at clicked location" active={placeMode==='hospital'} onActivate={()=>{setPlaceMode('hospital');setPending(null)}} onCancel={cancelPlace}>
                  <input className="input" placeholder="Hospital name" value={hospName} onChange={e=>setHospName(e.target.value)}/>
                </PlaceCard>
                <PlaceCard title="🚦 Add Traffic Light" desc="Places a traffic light at clicked location" active={placeMode==='traffic'} onActivate={()=>{setPlaceMode('traffic');setPending(null)}} onCancel={cancelPlace}>
                  <input className="input" placeholder="Intersection name (optional)" value={juncName} onChange={e=>setJuncName(e.target.value)}/>
                </PlaceCard>
                {pending && (
                  <div style={{ background:'var(--green-lt)', border:'1px solid var(--green-lt2)', borderRadius:10, padding:12 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'var(--green)', marginBottom:8 }}>✓ Location selected</div>
                    <div style={{ fontSize:12, color:'var(--text2)', marginBottom:3 }}>Type: <strong>{pending.type}</strong></div>
                    <div style={{ fontSize:12, color:'var(--text2)', marginBottom:10, fontFamily:"'JetBrains Mono',monospace" }}>{pending.lat.toFixed(5)}, {pending.lon.toFixed(5)}</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn btn-success" onClick={confirmPlace} disabled={saving} style={{ flex:1, justifyContent:'center' }}>{saving?'Saving…':'✓ Confirm'}</button>
                      <button className="btn btn-ghost" onClick={cancelPlace} style={{ flex:1, justifyContent:'center' }}>✕ Cancel</button>
                    </div>
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                  <InfoBox label="Ambulances"  val={ambulances.length} color="var(--blue2)" />
                  <InfoBox label="Hospitals"   val={hospitals.length}  color="var(--blue2)" />
                  <InfoBox label="Traffic Pts" val={traffic.length}    color="var(--blue2)" />
                </div>
              </div>
            )}

            {tab === 'log' && (
              <div>
                <div className="label" style={{ marginBottom:8 }}>COMPLETED EMERGENCIES ({arrivedLog.length})</div>
                {arrivedLog.length === 0 ? <Empty msg="No completed emergencies yet" /> : [...arrivedLog].reverse().map((em,i) => (
                  <div key={em._id} style={{ background:'var(--green-lt)', border:'1px solid var(--green-lt2)', borderRadius:9, padding:10, marginBottom:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <code style={{ fontSize:11, color:'var(--text3)' }}>#{i+1} · {em._id.slice(0,10)}</code>
                      <span className="badge badge-green">Completed</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text2)' }}>{em.distance_km} km · Survival: <strong style={{ color:'var(--green)' }}>{em.survival_pct?.toFixed(0)}%</strong></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {placeMode && (
            <div style={{ padding:'8px 16px', background:'#1d4ed8', color:'white', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <span style={{ fontSize:18 }}>{{ ambulance:'🚑', hospital:'🏥', traffic:'🚦' }[placeMode]}</span>
              <span style={{ fontWeight:600, fontSize:13 }}>Click anywhere on the map to place the {placeMode}</span>
              {pending && <span style={{ fontSize:12, opacity:0.8 }}>· Pin dropped — confirm in the left panel</span>}
              <button onClick={cancelPlace} style={{ marginLeft:'auto', background:'rgba(255,255,255,0.2)', border:'none', color:'white', padding:'4px 12px', borderRadius:6, cursor:'pointer', fontFamily:'inherit', fontSize:12 }}>Cancel</button>
            </div>
          )}
          <div style={{ padding:'8px 16px', background:'white', borderBottom:'1px solid var(--border)', display:'flex', gap:20, alignItems:'center', flexShrink:0 }}>
            <QuickStat label="Total Units"  val={ambulances.length} />
            <QuickStat label="Dispatched"   val={busyAmbs.length}   color="var(--orange2)" />
            <QuickStat label="Hospitals"    val={hospitals.length}  color="var(--blue2)" />
            <QuickStat label="Traffic Pts"  val={traffic.length} />
            <QuickStat label="Green"        val={traffic.filter(t=>t.state==='green').length} color="var(--green2)" />
            <QuickStat label="Active Calls" val={emergencies.length} color={emergencies.length>0?'var(--red2)':'var(--text2)'} />
            <div style={{ marginLeft:'auto', fontSize:11, color:'var(--text3)' }}>
              {placeMode ? `🖱️ Click map to place ${placeMode}` : 'Click ambulance icon for OBD details'}
            </div>
          </div>
          <div style={{ flex:1, padding:12, overflow:'hidden' }}>
            <MapView
              ambulances={ambulances} hospitals={hospitals} traffic={traffic}
              route={data.route||[]} emergencyLoc={data.emergency_loc}
              height="100%"
              onAmbulanceClick={a => setSelAmb(a)}
              placeMode={tab === 'infra' ? placeMode : null}
              onMapClick={handleMapClick}
              pendingMarker={pending}
            />
          </div>
        </div>
      </div>

      {selAmb && (
        <div className="overlay-backdrop" onClick={() => setSelAmb(null)}>
          <div className="animate-fade-in card" style={{ width:440, padding:0, overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'16px 20px', background:'linear-gradient(135deg,#1e3a5f,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:17, color:'white', fontFamily:"'Rajdhani',sans-serif" }}>{selAmb.label||selAmb._id.slice(0,10)}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.75)', marginTop:2 }}>Vehicle Status (OBD)</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ background:'rgba(255,255,255,0.2)', color:'white', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{selAmb.status==='busy'?'● DISPATCHED':'○ AVAILABLE'}</span>
                <button onClick={()=>setSelAmb(null)} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'white', width:28, height:28, borderRadius:6, cursor:'pointer', fontSize:16 }}>✕</button>
              </div>
            </div>
            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                <OBDGauge label="Fuel Level"  val={selAmb.fuel}        max={100} unit="%" lo={20}  color="var(--green2)" />
                <OBDGauge label="Battery"     val={selAmb.battery}     max={100} unit="%" lo={25}  color="var(--blue2)" />
                <OBDGauge label="Engine Temp" val={selAmb.engine_temp} max={120} unit="°C" hi={108} color="var(--orange2)" />
              </div>
              <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px' }}>
                <div className="label" style={{ marginBottom:8 }}>Location on Map</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  <InfoRow label="Latitude"  val={selAmb.lat?.toFixed(5)} />
                  <InfoRow label="Longitude" val={selAmb.lon?.toFixed(5)} />
                </div>
              </div>
              <button className="btn btn-ghost" onClick={()=>setSelAmb(null)} style={{ width:'100%', justifyContent:'center' }}>Close</button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} />
    </Layout>
  )
}

function PlaceCard({ title, desc, active, onActivate, onCancel, children }) {
  return (
    <div style={{ border:`1.5px solid ${active?'var(--blue2)':'var(--border)'}`, background:active?'var(--blue-lt)':'white', borderRadius:10, padding:12, transition:'all 0.15s' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:active?10:6 }}>
        <div>
          <div style={{ fontWeight:600, fontSize:13, color:active?'var(--blue2)':'var(--text)' }}>{title}</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{desc}</div>
        </div>
        {active ? <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ borderColor:'var(--red2)', color:'var(--red2)' }}>Cancel</button>
                : <button className="btn btn-primary btn-sm" onClick={onActivate}>Select</button>}
      </div>
      {active && <div className="animate-fade-in">{children}<div style={{ fontSize:11, color:'var(--blue2)', marginTop:8, fontWeight:500 }}>👆 Now click on the map to drop a pin</div></div>}
    </div>
  )
}
function StatCard({ label, val, color, bg }) {
  return <div style={{ background:bg, border:'1px solid', borderColor:color+'44', borderRadius:9, padding:'10px 12px' }}><div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:22, color, lineHeight:1 }}>{val}</div><div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{label}</div></div>
}
function AmbCard({ amb, onClick }) {
  return (
    <div onClick={onClick} className="card-hover" style={{ border:'1px solid var(--border)', borderRadius:9, padding:'10px 12px', marginBottom:6, cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontWeight:600, fontSize:13 }}>{amb.label||amb._id.slice(0,10)}</span>
        <span className={`badge badge-${amb.status==='busy'?'orange':'green'}`}>{amb.status==='busy'?'Dispatched':'Available'}</span>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        {[['Fuel',amb.fuel,100,'%','var(--green2)'],['Batt',amb.battery,100,'%','var(--blue2)'],['Temp',amb.engine_temp,120,'°','var(--orange2)']].map(([l,v,m,u,c])=>(
          <div key={l} style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}><span style={{ fontSize:10, color:'var(--text3)' }}>{l}</span><span style={{ fontSize:10, fontWeight:600, color:c, fontFamily:"'JetBrains Mono',monospace" }}>{v?.toFixed(0)}{u}</span></div>
            <div style={{ height:3, background:'var(--surface3)', borderRadius:2 }}><div style={{ width:`${Math.min(100,(v/m)*100)}%`, height:'100%', background:c, borderRadius:2 }}/></div>
          </div>
        ))}
      </div>
    </div>
  )
}
function OBDGauge({ label, val, max, unit, lo, hi, color }) {
  const pct = Math.min(100,(val/max)*100)
  const isWarn = (lo&&val<=lo)||(hi&&val>=hi)
  const c = isWarn?'var(--red2)':color
  return (
    <div style={{ border:`1px solid ${isWarn?'var(--red-lt2)':'var(--border)'}`, background:isWarn?'var(--red-lt)':'white', borderRadius:9, padding:'10px 12px', textAlign:'center' }}>
      <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:20, color:c, lineHeight:1, marginBottom:2 }}>{val?.toFixed(0)}<span style={{ fontSize:11, fontWeight:400 }}>{unit}</span></div>
      {isWarn && <div style={{ fontSize:10, color:'var(--red)', fontWeight:600, marginBottom:4 }}>⚠ Warning</div>}
      <div style={{ height:5, background:'var(--surface3)', borderRadius:3, marginTop:6 }}><div style={{ width:`${pct}%`, height:'100%', background:c, borderRadius:3 }}/></div>
    </div>
  )
}
function InfoBox({ label, val, color }) {
  return <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7, padding:'8px 10px', textAlign:'center' }}><div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:18, color }}>{val}</div><div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{label}</div></div>
}
function InfoRow({ label, val }) {
  return <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><span style={{ fontSize:12, color:'var(--text3)' }}>{label}</span><span style={{ fontSize:12, fontWeight:500, color:'var(--text)', fontFamily:"'JetBrains Mono',monospace" }}>{val}</span></div>
}
function QuickStat({ label, val, color='var(--text2)' }) {
  return <div style={{ textAlign:'center' }}><div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:18, color, lineHeight:1 }}>{val}</div><div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{label}</div></div>
}
function Empty({ msg }) {
  return <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center', padding:'14px 0' }}>{msg}</div>
}
