import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import MapView from '../components/MapView'
import ECGMonitor from '../components/ECGMonitor'
import SurvivalMeter from '../components/SurvivalMeter'
import { useWS } from '../context/WSContext'
import { getVitalsHistory, sendVitals, listPatients } from '../api'

function drift(v,mn,mx,s) { return Math.min(mx,Math.max(mn,+(v+(Math.random()-0.5)*s*2).toFixed(1))) }

export default function AmbulanceDash() {
  const { data } = useWS()
  const [patients, setPatients]   = useState([])
  const [selAmb,   setSelAmb]     = useState(null)
  const [selPat,   setSelPat]     = useState(null)
  const [live,     setLive]       = useState({ heart_rate:82, spo2:97, temperature:37.0 })
  const [hrBuf,    setHrBuf]      = useState([])
  const [spo2Buf,  setSpo2Buf]    = useState([])
  const [tempBuf,  setTempBuf]    = useState([])
  const [showPatDash, setShowPatDash] = useState(false)
  const [showOBD,     setShowOBD]    = useState(false)
  const timerRef = useRef(null)

  const ambulances = data.ambulances || []

  useEffect(() => { listPatients().then(setPatients).catch(()=>{}) }, [])

  useEffect(() => {
    if (!selAmb && ambulances.length>0) {
      setSelAmb(ambulances.find(a=>a.status==='busy') || ambulances[0])
    }
  },[ambulances])

  useEffect(() => {
    if (selAmb?.assigned_patient) {
      const p = patients.find(x=>x._id===selAmb.assigned_patient)
      setSelPat(p||null)
      if (p) getVitalsHistory(p._id).then(h=>{
        if (!h.length) return
        setHrBuf(h.map(r=>r.heart_rate))
        setSpo2Buf(h.map(r=>r.spo2))
        setTempBuf(h.map(r=>r.temperature))
        const last=h[h.length-1]
        setLive({heart_rate:last.heart_rate,spo2:last.spo2,temperature:last.temperature})
      }).catch(()=>{})
    } else setSelPat(null)
  },[selAmb,patients])

  useEffect(() => {
    if (!selPat) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(()=>{
      setLive(prev=>{
        const n={
          heart_rate:  drift(prev.heart_rate,  40,170,4),
          spo2:        drift(prev.spo2,         75,100,1.2),
          temperature: drift(prev.temperature,  35,40.5,0.12),
        }
        setHrBuf(b=>[...b.slice(-199),n.heart_rate])
        setSpo2Buf(b=>[...b.slice(-199),n.spo2])
        setTempBuf(b=>[...b.slice(-199),n.temperature])
        sendVitals(selPat._id,n.heart_rate,n.spo2,n.temperature,'AMB-SIM').catch(()=>{})
        return n
      })
    },1000)
    return ()=>clearInterval(timerRef.current)
  },[selPat])

  const wsP    = data.patients?.find(p=>p.patient_id===selPat?._id)
  const surv   = wsP?.survival_pct ?? 0
  const sev    = wsP?.severity ?? '—'
  const sim    = data.simulation || {}
  const obd    = { fuel:selAmb?.fuel??0, battery:selAmb?.battery??0, engine_temp:selAmb?.engine_temp??0 }
  const hrOk   = live.heart_rate>=60 && live.heart_rate<=100
  const spo2Ok = live.spo2>=95
  const tempOk = live.temperature>=36 && live.temperature<=37.5
  const sevColor= sev==='Stable'?'var(--green)':sev.includes('Severe')||sev.includes('Critical')?'var(--red)':'var(--yellow)'

  return (
    <Layout title="Ambulance" subtitle="Paramedic & Driver dashboard" currentPage="ambulance">
      <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>

        {/* ── Left panel ── */}
        <div style={{ width:290, background:'white', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>

          {/* Ambulance selector */}
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
            <div className="label" style={{ marginBottom:6 }}>Active Unit</div>
            <select className="input" value={selAmb?._id||''} onChange={e=>setSelAmb(ambulances.find(a=>a._id===e.target.value))}>
              {ambulances.map(a=><option key={a._id} value={a._id}>{a.label||a._id.slice(0,12)} — {a.status}</option>)}
            </select>
          </div>

          <div style={{ flex:1, overflow:'auto', padding:14, display:'flex', flexDirection:'column', gap:12 }}>
            {selPat ? (<>

              {/* Patient banner */}
              <div style={{ background:'var(--blue-lt)', border:'1px solid var(--blue-lt2)', borderRadius:10, padding:12, display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--blue2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:17, color:'white', flexShrink:0 }}>
                  {selPat.name?.charAt(0)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{selPat.name}</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>Age {selPat.age} · On board</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>setShowPatDash(true)}>
                  Full →
                </button>
              </div>

              {/* AI Assessment + survival */}
              <div style={{
                border:`1px solid ${sev==='Stable'?'var(--green-lt2)':sev.includes('Severe')||sev.includes('Critical')?'var(--red-lt2)':'#fef08a'}`,
                background:sev==='Stable'?'var(--green-lt)':sev.includes('Severe')||sev.includes('Critical')?'var(--red-lt)':'var(--yellow-lt)',
                borderRadius:10, padding:12, display:'flex', gap:12, alignItems:'center',
              }}>
                <SurvivalMeter pct={Math.round(surv)} size={80}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11.5, color:'var(--text3)', marginBottom:3, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:'0.06em' }}>CONDITION ASSESSMENT</div>
                  <div style={{ fontSize:20, fontWeight:700, color:sevColor, lineHeight:1.2, fontFamily:"'Rajdhani',sans-serif" }}>{sev}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:6, fontWeight:500 }}>ML Model · Updated live</div>
                </div>
              </div>

              {/* Vitals */}
              <div>
                <div className="label" style={{ marginBottom:8 }}>Live Vitals <span style={{ textTransform:'none', fontWeight:400 }}>— 1s sensor feed</span></div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <VitalRow label="Heart Rate"  val={live.heart_rate}  unit="bpm" ok={hrOk}   color="#dc2626" range="60–100" />
                  <VitalRow label="SpO₂"        val={live.spo2}        unit="%"   ok={spo2Ok} color="#2563eb" range="95–100" />
                  <VitalRow label="Temperature" val={live.temperature} unit="°C"  ok={tempOk} color="#ca8a04" range="36–37.5" />
                </div>
              </div>

              {/* OBD quick strip */}
              <div style={{ border:'1px solid var(--border)', borderRadius:9, padding:'10px 12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>Vehicle</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>Engine {selAmb?.status==='busy'?'Running':'Off'}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setShowOBD(true)}>OBD Details →</button>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <QuickOBD label="Fuel"    val={obd.fuel}        unit="%" warn={obd.fuel<20} />
                  <QuickOBD label="Battery" val={obd.battery}     unit="%" warn={obd.battery<25} />
                  <QuickOBD label="Eng °C"  val={obd.engine_temp} unit=""  warn={obd.engine_temp>110} />
                </div>
              </div>

            </>) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:8, color:'var(--text3)', textAlign:'center' }}>
                <div style={{ fontSize:40 }}>🚑</div>
                <div style={{ fontWeight:600, color:'var(--text2)', fontSize:14 }}>No patient assigned</div>
                <div style={{ fontSize:12, lineHeight:1.6 }}>Register a patient in the Simulation tab to trigger auto-dispatch</div>
              </div>
            )}
          </div>

          {/* ETA bar */}
          {sim.ambulance_id && (
            <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', background:'var(--orange-lt)', flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--orange)' }}>🏥 En route to hospital</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:14, color:'var(--orange)' }}>{sim.remaining_min} min</span>
              </div>
              <div style={{ height:6, background:'var(--orange-lt2)', borderRadius:3, marginBottom:4 }}>
                <div style={{ width:`${sim.progress_pct??0}%`, height:'100%', background:'var(--orange2)', borderRadius:3, transition:'width 1s' }}/>
              </div>
              <div style={{ fontSize:11, color:'var(--orange)', textAlign:'right' }}>{sim.progress_pct??0}% complete</div>
            </div>
          )}
        </div>

        {/* ── Right: Map + ECG ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flex:'0 0 52%', padding:'10px 12px 6px' }}>
            <div style={{ fontSize:11.5, fontWeight:700, color:'var(--text2)', marginBottom:5, display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:"'Rajdhani',sans-serif", letterSpacing:'0.06em' }}>
              <span>NAVIGATION — Route to Hospital</span>
              <span style={{ fontSize:10, color:'var(--text3)', fontWeight:400 }}>Solid blue = shortest route · Auto-follows ambulance</span>
            </div>
            <MapView
              ambulances={data.ambulances||[]} hospitals={data.hospitals||[]}
              traffic={data.traffic||[]} route={data.route||[]}
              emergencyLoc={data.emergency_loc} height="calc(100% - 24px)"
              followAmbulance={selAmb?._id}
            />
          </div>

          {selPat ? (
            <div style={{ flex:1, padding:'0 12px 10px', display:'flex', flexDirection:'column', gap:6, overflow:'hidden' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0' }}>
                <span style={{ fontSize:11.5, fontWeight:700, color:'var(--text2)', fontFamily:"'Rajdhani',sans-serif", letterSpacing:'0.06em' }}>PATIENT MONITOR</span>
                <button className="btn btn-ghost btn-sm" onClick={()=>setShowPatDash(true)}>
                  Full Patient Dashboard →
                </button>
              </div>
              <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, overflow:'hidden' }}>
                <ECGCard title="Heart Rate" val={live.heart_rate} unit="bpm" color="#dc2626" buf={hrBuf}   min={30}  max={180} />
                <ECGCard title="SpO₂"       val={live.spo2}       unit="%"   color="#2563eb" buf={spo2Buf} min={70}  max={100} />
                <ECGCard title="Temperature" val={live.temperature} unit="°C" color="#ca8a04" buf={tempBuf} min={34} max={42} />
              </div>
            </div>
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:13 }}>
              Patient monitor activates after dispatch
            </div>
          )}
        </div>
      </div>

      {/* ── Full Patient Dashboard overlay ── */}
      {showPatDash && selPat && (
        <div className="overlay-backdrop" onClick={()=>setShowPatDash(false)}>
          <div className="animate-fade-in" style={{ width:'92vw', maxWidth:900, height:'88vh', background:'white', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-lg)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'16px 22px', background:'linear-gradient(135deg,#1e3a5f,#1d4ed8)', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
              <div style={{ width:46, height:46, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:20, color:'white', border:'2px solid rgba(255,255,255,0.2)' }}>
                {selPat.name?.charAt(0)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:18, color:'white', fontFamily:"'Rajdhani',sans-serif", letterSpacing:'0.02em' }}>{selPat.name}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.75)' }}>Age {selPat.age} · Full Patient Monitor</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80', animation:'pulse-dot 1s ease-in-out infinite' }}/>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.9)', fontWeight:500 }}>Live</span>
              </div>
              <button onClick={()=>setShowPatDash(false)} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'white', width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:18, fontFamily:'inherit' }}>✕</button>
            </div>

            <div style={{ flex:1, overflow:'auto', padding:20, display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'180px 1fr 1fr 1fr', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)', borderRadius:12, padding:12 }}>
                  <SurvivalMeter pct={Math.round(surv)} size={120} />
                </div>
                <BigVital label="Heart Rate"  val={live.heart_rate}  unit="bpm" ok={hrOk}   color="#dc2626" range="60–100" />
                <BigVital label="SpO₂"        val={live.spo2}        unit="%"   ok={spo2Ok} color="#2563eb" range="95–100" />
                <BigVital label="Temperature" val={live.temperature} unit="°C"  ok={tempOk} color="#ca8a04" range="36–37.5" />
              </div>

              <div style={{
                background:sev==='Stable'?'var(--green-lt)':sev.includes('Severe')||sev.includes('Critical')?'var(--red-lt)':'var(--yellow-lt)',
                border:`1px solid ${sev==='Stable'?'var(--green-lt2)':sev.includes('Severe')||sev.includes('Critical')?'var(--red-lt2)':'#fef08a'}`,
                borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:16,
              }}>
                <div style={{ fontSize:11.5, color:'var(--text3)', fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:'0.06em' }}>ML ASSESSMENT</div>
                <div style={{ fontWeight:700, fontSize:20, color:sevColor, fontFamily:"'Rajdhani',sans-serif" }}>{sev}</div>
                <div style={{ fontSize:12, color:'var(--text2)' }}>Survival probability: <strong style={{ color:sevColor }}>{surv.toFixed(1)}%</strong></div>
                <div style={{ marginLeft:'auto', fontSize:11, color:'var(--text3)', fontFamily:"'JetBrains Mono',monospace", fontWeight:500 }}>LogisticRegression · scikit-learn</div>
              </div>

              <div>
                <div className="label" style={{ marginBottom:10 }}>Continuous ECG Monitor</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <LargeECG title="HEART RATE" val={live.heart_rate} unit="bpm" color="#dc2626" buf={hrBuf}   min={30}  max={180} height={100} />
                  <LargeECG title="SpO₂"       val={live.spo2}       unit="%"   color="#2563eb" buf={spo2Buf} min={70}  max={100} height={80}  />
                  <LargeECG title="TEMPERATURE" val={live.temperature} unit="°C" color="#ca8a04" buf={tempBuf} min={34} max={42}  height={80}  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OBD overlay ── */}
      {showOBD && (
        <div className="overlay-backdrop" onClick={()=>setShowOBD(false)}>
          <div className="animate-fade-in card" style={{ width:400, padding:0, overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'14px 18px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:16, fontFamily:"'Rajdhani',sans-serif", letterSpacing:'0.02em' }}>🔧 OBD Vehicle Status</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>{selAmb?.label||'Ambulance'} · Engine {selAmb?.status==='busy'?'Running':'Off'}</div>
              </div>
              <button onClick={()=>setShowOBD(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div style={{ padding:18, display:'flex', flexDirection:'column', gap:12 }}>
              {[
                {label:'Fuel Level',    val:obd.fuel,        max:100,unit:'%',  lo:20,  color:'var(--green2)'},
                {label:'Battery',       val:obd.battery,     max:100,unit:'%',  lo:25,  color:'var(--blue2)'},
                {label:'Engine Temp',   val:obd.engine_temp, max:120,unit:'°C', hi:108, color:'var(--orange2)'},
              ].map(g=>{
                const isWarn=(g.lo&&g.val<=g.lo)||(g.hi&&g.val>=g.hi)
                const c=isWarn?'var(--red2)':g.color
                return (
                  <div key={g.label} style={{ border:`1px solid ${isWarn?'var(--red-lt2)':'var(--border)'}`, background:isWarn?'var(--red-lt)':'white', borderRadius:9, padding:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontWeight:500, fontSize:13 }}>{g.label}</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:16, color:c }}>
                        {g.val?.toFixed(1)}{g.unit} {isWarn&&'⚠'}
                      </span>
                    </div>
                    <div style={{ height:8, background:'var(--surface3)', borderRadius:4 }}>
                      <div style={{ width:`${Math.min(100,(g.val/g.max)*100)}%`, height:'100%', background:c, borderRadius:4, transition:'width 0.5s' }}/>
                    </div>
                  </div>
                )
              })}
              {sim.ambulance_id && (
                <div style={{ background:'var(--blue-lt)', border:'1px solid var(--blue-lt2)', borderRadius:9, padding:12 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--blue2)', marginBottom:8 }}>Mission Progress</div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text2)', marginBottom:6 }}>
                    <span>{sim.progress_pct??0}% complete</span>
                    <span style={{ fontWeight:700, color:'var(--orange2)' }}>ETA: {sim.remaining_min} min</span>
                  </div>
                  <div style={{ height:6, background:'var(--blue-lt2)', borderRadius:3 }}>
                    <div style={{ width:`${sim.progress_pct??0}%`, height:'100%', background:'var(--blue2)', borderRadius:3, transition:'width 1s' }}/>
                  </div>
                </div>
              )}
              <button className="btn btn-ghost" onClick={()=>setShowOBD(false)} style={{ width:'100%', justifyContent:'center' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function VitalRow({label,val,unit,ok,color,range}) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, border:`1px solid ${ok?'var(--green-lt2)':'var(--red-lt2)'}`, background:ok?'var(--green-lt)':'var(--red-lt)', borderRadius:8, padding:'8px 12px' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:1 }}>{label}</div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:20, color, lineHeight:1 }}>
          {val.toFixed(1)} <span style={{ fontSize:11, fontWeight:400, color:'var(--text3)' }}>{unit}</span>
        </div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:11, fontWeight:600, color:ok?'var(--green)':'var(--red)', marginBottom:2 }}>
          {ok?'✓ Normal':'⚠ Abnormal'}
        </div>
        <div style={{ fontSize:10, color:'var(--text3)' }}>{range}</div>
      </div>
    </div>
  )
}
function QuickOBD({label,val,unit,warn}) {
  return (
    <div style={{ flex:1, border:`1px solid ${warn?'var(--red-lt2)':'var(--border)'}`, background:warn?'var(--red-lt)':'white', borderRadius:7, padding:'6px 8px', textAlign:'center' }}>
      <div style={{ fontSize:10, color:'var(--text3)', marginBottom:2 }}>{label}</div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:14, color:warn?'var(--red2)':'var(--text)' }}>
        {val?.toFixed(0)}{unit}
      </div>
    </div>
  )
}
function ECGCard({title,val,unit,color,buf,min,max}) {
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:9, padding:'8px 10px', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4, flexShrink:0 }}>
        <span style={{ fontSize:10, fontWeight:600, color:'var(--text2)' }}>{title}</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:14, color }}>
          {val.toFixed(1)} <span style={{ fontSize:9, color:'var(--text3)', fontWeight:400 }}>{unit}</span>
        </span>
      </div>
      <div style={{ flex:1, minHeight:0 }}>
        <ECGMonitor data={buf} color={color} min={min} max={max} height="100%" />
      </div>
    </div>
  )
}
function BigVital({label,val,unit,ok,color,range}) {
  return (
    <div style={{ border:`1px solid ${ok?'var(--green-lt2)':'var(--red-lt2)'}`, background:ok?'var(--green-lt)':'var(--red-lt)', borderRadius:11, padding:'14px 16px', textAlign:'center' }}>
      <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:28, color, lineHeight:1 }}>
        {val!=null?val.toFixed(1):'—'}
      </div>
      <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{unit}</div>
      <div style={{ fontSize:11, fontWeight:600, color:ok?'var(--green)':'var(--red)', marginTop:6 }}>
        {ok?'✓ Normal':'⚠ Abnormal'}
      </div>
      <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>Normal: {range}</div>
    </div>
  )
}
function LargeECG({title,val,unit,color,buf,min,max,height}) {
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:9, padding:'8px 12px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
        <span style={{ fontSize:11, fontWeight:600, color:'var(--text2)', letterSpacing:'0.05em' }}>{title}</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:18, color }}>
          {val?.toFixed(1)} <span style={{ fontSize:11, color:'var(--text3)', fontWeight:400 }}>{unit}</span>
        </span>
      </div>
      <ECGMonitor data={buf} color={color} min={min} max={max} height={height} />
    </div>
  )
}
