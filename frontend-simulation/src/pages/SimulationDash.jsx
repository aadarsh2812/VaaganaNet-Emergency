import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import MapView from '../components/MapView'
import { useWS } from '../context/WSContext'
import { useToast, ToastContainer } from '../components/Toast'
import { createPatient, updateSimulation, stopSimulation, getSimStatus, sendVitals } from '../api'

function drift(v,mn,mx,s) { return Math.min(mx,Math.max(mn,+(v+(Math.random()-0.5)*s*2).toFixed(1))) }

const SCENARIOS = [
  { label:'🚗 Road Accident',     name:'Raju Kumar',    age:34, hr:145, spo2:86, temp:38.4 },
  { label:'❤️ Cardiac Event',     name:'Meena Pillai',  age:68, hr:42,  spo2:91, temp:37.0 },
  { label:'🫁 Respiratory Issue', name:'Arjun Nair',    age:55, hr:115, spo2:80, temp:38.0 },
  { label:'🟢 Stable Patient',    name:'Priya Sharma',  age:29, hr:76,  spo2:98, temp:36.9 },
  { label:'🧠 Head Trauma',       name:'Vikram Das',    age:42, hr:60,  spo2:94, temp:37.5 },
]

export default function SimulationDash() {
  const { data } = useWS()
  const { toasts, show } = useToast()
  const [speed,  setSpeed]   = useState(1)
  const [sens,   setSens]    = useState(0.05)
  const [simSt,  setSimSt]   = useState(null)
  const [patName, setPatName] = useState('')
  const [patAge,  setPatAge]  = useState('')
  const [loading, setLoading] = useState(false)
  const [lastDisp, setLastDisp] = useState(null)
  const [regPats,  setRegPats]  = useState([])
  const [placeMode, setPlaceMode] = useState(null)
  const [pendingPat, setPendingPat] = useState(null)
  const streamRef = useRef(null)
  const svRef     = useRef({ heart_rate:82, spo2:97, temperature:37.0 })

  useEffect(()=>{
    const t = setInterval(()=>getSimStatus().then(setSimSt).catch(()=>{}),2000)
    return ()=>clearInterval(t)
  },[])

  useEffect(()=>{
    if(!lastDisp?.patient?._id) { clearInterval(streamRef.current); return }
    const pid = lastDisp.patient._id
    streamRef.current = setInterval(()=>{
      const v = svRef.current
      const nv = { heart_rate:drift(v.heart_rate,40,170,4), spo2:drift(v.spo2,75,100,1.5), temperature:drift(v.temperature,35,40,0.15) }
      svRef.current = nv
      sendVitals(pid,nv.heart_rate,nv.spo2,nv.temperature,'SIM-SYNTHETIC').catch(()=>{})
    },1500)
    return ()=>clearInterval(streamRef.current)
  },[lastDisp])

  const doRegister = async (scenario=null) => {
    const name = scenario?.name || patName
    const age  = scenario?.age  || parseInt(patAge)
    if(!name||!age) { show('Enter patient name and age','warning'); return }
    setLoading(true)
    if(scenario) svRef.current = { heart_rate:scenario.hr, spo2:scenario.spo2, temperature:scenario.temp }
    try {
      const lat = pendingPat?.lat ?? 13.0827
      const lon = pendingPat?.lon ?? 80.2707
      const res = await createPatient(name, age, lat, lon)
      setPendingPat(null); setPlaceMode(null)
      setLastDisp(res)
      setRegPats(p=>[...p,{...res.patient,dispatch:res.dispatch}])
      setPatName(''); setPatAge('')
      if(res.dispatch?.error) show(`Patient registered — ${res.dispatch.error}. Add resources in Control Centre.`,'warning')
      else show(`✓ ${name} registered → ${res.dispatch?.assigned_hospital?.name} assigned, ambulance dispatched!`)
    } catch(e) { show(e.response?.data?.detail||e.message,'error') }
    setLoading(false)
  }

  const handleMapClick = (lat, lon) => { if (placeMode === 'patient') setPendingPat({ lat, lon, type:'patient' }) }
  const doApply = async () => { try { await updateSimulation(speed,sens); show('Settings applied') } catch(e) { show(e.message,'error') } }
  const doStop  = async () => { try { await stopSimulation(); show('Simulation stopped','warning') } catch(e) { show(e.message,'error') } }

  const sim    = data.simulation || {}
  const isRun  = simSt?.active||false
  const traffic = data.traffic || []
  const greenCt = traffic.filter(t=>t.state==='green').length

  return (
    <Layout title="Simulation" subtitle="Demo & testing — triggers events visible in all dashboards" currentPage="simulation">
      <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
        <div style={{ width:310, background:'white', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'auto', flexShrink:0 }}>

          <div style={{ margin:12, padding:'10px 12px', background:'var(--yellow-lt)', border:'1px solid #fde68a', borderRadius:9 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#92400e', marginBottom:3, fontFamily:"'Rajdhani',sans-serif" }}>ℹ️ Demo Tool</div>
            <div style={{ fontSize:12, color:'#78350f', lineHeight:1.6 }}>Register a patient to trigger auto-dispatch. Open Control, Ambulance & Hospital apps to watch it live — all share the same backend WebSocket.</div>
          </div>

          <SectionLabel label="Simulation Status" />
          <div style={{ padding:'0 12px 14px' }}>
            <div style={{ border:`1.5px solid ${isRun?'#fed7aa':'var(--border)'}`, borderRadius:10, padding:12, background:isRun?'var(--orange-lt)':'var(--surface2)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:isRun?10:0 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:isRun?'var(--orange2)':'#d1d5db', animation:isRun?'pulse-dot 1s ease-in-out infinite':'none' }}/>
                <span style={{ fontWeight:600, fontSize:13, color:isRun?'var(--orange)':'var(--text2)' }}>{isRun?'Running':'Idle'}</span>
              </div>
              {isRun && simSt && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                    {[['Speed',`${simSt.speed}×`],['Step',`${simSt.step}/${simSt.total_steps}`],['Distance',`${simSt.distance_km} km`],['Duration',`${simSt.duration_min?.toFixed(0)} min`]].map(([l,v])=>(
                      <div key={l} style={{ background:'white', border:'1px solid var(--orange-lt2)', borderRadius:7, padding:'6px 9px' }}>
                        <div style={{ fontSize:10, color:'var(--text3)' }}>{l}</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:14, color:'var(--orange)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height:6, background:'var(--orange-lt2)', borderRadius:3, marginBottom:4 }}>
                    <div style={{ width:`${sim.progress_pct??0}%`, height:'100%', background:'var(--orange2)', borderRadius:3, transition:'width 1s' }}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                    <span style={{ color:'var(--text3)' }}>{sim.progress_pct??0}% complete</span>
                    <span style={{ color:'var(--orange)', fontWeight:600 }}>{sim.remaining_min} min remaining</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <SectionLabel label="Register Patient → Auto-Dispatch" />
          <div style={{ padding:'0 12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
            <input className="input" placeholder="Patient full name" value={patName} onChange={e=>setPatName(e.target.value)}/>
            <input className="input" placeholder="Age" type="number" value={patAge} onChange={e=>setPatAge(e.target.value)}/>
            <div style={{ border:`1px solid ${pendingPat?'var(--green2)':'var(--border)'}`, borderRadius:8, padding:10, background:pendingPat?'var(--green-lt)':'var(--surface2)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:pendingPat?6:0 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:pendingPat?'var(--green)':'var(--text2)' }}>{pendingPat?'✓ Accident location set':'📍 Set accident location'}</div>
                  {pendingPat && <div style={{ fontSize:11, color:'var(--text3)', fontFamily:"'JetBrains Mono',monospace" }}>{pendingPat.lat.toFixed(4)}, {pendingPat.lon.toFixed(4)}</div>}
                </div>
                <button className={`btn btn-sm ${placeMode==='patient'?'btn-danger':'btn-ghost'}`} onClick={()=>{setPlaceMode(m=>m==='patient'?null:'patient');if(placeMode==='patient')setPendingPat(null)}}>
                  {placeMode==='patient'?'✕ Cancel':pendingPat?'📍 Change':'📍 Click Map'}
                </button>
              </div>
              {placeMode==='patient' && <div style={{ fontSize:11, color:'var(--blue2)', fontWeight:500, marginTop:6 }}>👆 Click anywhere on the map to drop the accident pin</div>}
              {!pendingPat && placeMode!=='patient' && <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>Click "Click Map" then tap the accident location on the map</div>}
            </div>
            <button className="btn btn-danger" onClick={()=>doRegister()} disabled={loading||!patName||!patAge} style={{ justifyContent:'center' }}>{loading?'Registering…':'🚨 Register & Auto-Dispatch'}</button>
          </div>

          <SectionLabel label="Quick Demo Scenarios" />
          <div style={{ padding:'0 12px 14px', display:'flex', flexDirection:'column', gap:5 }}>
            {SCENARIOS.map(s=>(
              <button key={s.label} className="btn btn-ghost" disabled={loading} onClick={()=>doRegister(s)} style={{ justifyContent:'space-between', width:'100%', textAlign:'left' }}>
                <span style={{ fontWeight:500 }}>{s.label}</span>
                <span style={{ fontSize:10, color:'var(--text3)', fontFamily:"'JetBrains Mono',monospace" }}>HR:{s.hr} O₂:{s.spo2}</span>
              </button>
            ))}
          </div>

          <SectionLabel label="Ambulance Speed" />
          <div style={{ padding:'0 12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'var(--text2)' }}>Speed multiplier</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:14, color:'var(--blue2)' }}>{speed}×</span>
            </div>
            <input type="range" min={0.5} max={5} step={0.5} value={speed} onChange={e=>setSpeed(parseFloat(e.target.value))} style={{ width:'100%', accentColor:'var(--blue2)', marginBottom:8 }}/>
            <div style={{ display:'flex', gap:4 }}>
              {[0.5,1,2,3,5].map(v=>(
                <button key={v} onClick={()=>setSpeed(v)} style={{ flex:1, padding:'5px 0', border:`1px solid ${speed===v?'var(--blue2)':'var(--border)'}`, borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', background:speed===v?'var(--blue-lt)':'white', color:speed===v?'var(--blue2)':'var(--text2)' }}>{v}×</button>
              ))}
            </div>
          </div>

          <SectionLabel label="Traffic Sensitivity" />
          <div style={{ padding:'0 12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'var(--text2)' }}>Trigger radius (degrees)</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:14, color:'var(--green2)' }}>{sens}°</span>
            </div>
            <input type="range" min={0.01} max={0.2} step={0.01} value={sens} onChange={e=>setSens(parseFloat(e.target.value))} style={{ width:'100%', accentColor:'var(--green2)', marginBottom:4 }}/>
            <div style={{ fontSize:11, color:'var(--text3)' }}>Larger = lights turn green from further away</div>
          </div>

          <div style={{ padding:'0 12px 14px', display:'flex', gap:8 }}>
            <button className="btn btn-primary" onClick={doApply} style={{ flex:1, justifyContent:'center' }}>Apply Settings</button>
            <button className="btn btn-ghost" onClick={doStop} style={{ flex:1, justifyContent:'center', borderColor:'var(--red2)', color:'var(--red2)' }}>Stop</button>
          </div>

          {lastDisp?.dispatch && !lastDisp.dispatch.error && (
            <div style={{ margin:'0 12px 14px', border:'1px solid var(--green-lt2)', background:'var(--green-lt)', borderRadius:9, padding:12 }}>
              <div style={{ fontWeight:600, fontSize:12, color:'var(--green)', marginBottom:8 }}>✓ Last Dispatch</div>
              {[['Patient',lastDisp.patient?.name],['Hospital',lastDisp.dispatch?.assigned_hospital?.name],['Distance',`${lastDisp.dispatch?.distance_km} km`],['ETA',`${lastDisp.dispatch?.duration_min?.toFixed(1)} min`],['Survival',`${lastDisp.dispatch?.survival_pct?.toFixed(1)}%`]].map(([l,v])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'var(--text3)' }}>{l}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text)', fontFamily:"'JetBrains Mono',monospace" }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {traffic.length>0 && (
            <div style={{ padding:'0 12px 14px' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)', marginBottom:6, display:'flex', justifyContent:'space-between' }}>
                <span>Traffic Lights ({traffic.length})</span>
                <span style={{ color:'var(--green2)' }}>{greenCt} green</span>
              </div>
              <div style={{ maxHeight:100, overflow:'auto', border:'1px solid var(--border)', borderRadius:7 }}>
                {traffic.map((tl,i)=>(
                  <div key={tl._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 9px', borderBottom:i<traffic.length-1?'1px solid var(--border)':undefined }}>
                    <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>{tl.intersection_name||tl._id.slice(0,10)}</span>
                    <span className={`badge badge-${tl.state==='green'?'green':'red'}`} style={{ fontSize:10 }}>{tl.state==='green'?'● GREEN':'● RED'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {placeMode === 'patient' && (
            <div style={{ padding:'8px 16px', background:'#dc2626', color:'white', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <span style={{ fontSize:18 }}>🆘</span>
              <span style={{ fontWeight:600, fontSize:13 }}>Click on the map to set the accident / patient location</span>
              {pendingPat && <span style={{ fontSize:12, opacity:0.85 }}>· Pin placed — confirm in the left panel</span>}
              <button onClick={()=>{setPlaceMode(null);setPendingPat(null)}} style={{ marginLeft:'auto', background:'rgba(255,255,255,0.2)', border:'none', color:'white', padding:'4px 12px', borderRadius:6, cursor:'pointer', fontFamily:'inherit', fontSize:12 }}>Cancel</button>
            </div>
          )}
          <div style={{ padding:'8px 16px', background:'white', borderBottom:'1px solid var(--border)', display:'flex', gap:18, alignItems:'center', flexShrink:0 }}>
            {[['Ambulances',`${(data.ambulances||[]).filter(a=>a.status==='busy').length}/${(data.ambulances||[]).length}`,'var(--orange2)'],
              ['Hospitals',(data.hospitals||[]).length,'var(--blue2)'],
              ['Traffic Pts',traffic.length,'var(--text2)'],
              ['Green',greenCt,'var(--green2)'],
            ].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:18, color:c, lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{l}</div>
              </div>
            ))}
            <div style={{ marginLeft:'auto', fontSize:11, color:'var(--text2)', background:'var(--yellow-lt)', border:'1px solid #fde68a', borderRadius:6, padding:'4px 10px' }}>
              ⚡ Changes here reflect live in all 3 dashboards
            </div>
          </div>
          <div style={{ flex:1, padding:12, overflow:'hidden' }}>
            <MapView
              ambulances={data.ambulances||[]} hospitals={data.hospitals||[]}
              traffic={traffic} route={data.route||[]} emergencyLoc={data.emergency_loc}
              height="100%"
              placeMode={placeMode}
              onMapClick={handleMapClick}
              pendingMarker={pendingPat}
            />
          </div>
          {regPats.length>0 && (
            <div style={{ padding:'0 12px 10px', maxHeight:110, overflow:'auto', borderTop:'1px solid var(--border)', paddingTop:8 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)', marginBottom:6 }}>Session Patients ({regPats.length})</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {regPats.map((p,i)=>(
                  <div key={i} style={{ border:'1px solid var(--border)', borderRadius:7, padding:'4px 10px', background:'white', fontSize:11 }}>
                    <strong>{p.name}</strong>, {p.age}y
                    {p.dispatch?.assigned_hospital&&<span style={{ color:'var(--blue2)', marginLeft:5 }}>→ {p.dispatch.assigned_hospital.name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts}/>
    </Layout>
  )
}

function SectionLabel({label}) {
  return <div style={{ padding:'9px 12px 6px', fontSize:11.5, fontWeight:700, color:'var(--text3)', letterSpacing:'0.09em', textTransform:'uppercase', borderTop:'1px solid var(--border)', background:'var(--surface2)', fontFamily:"'Rajdhani',sans-serif" }}>{label}</div>
}
