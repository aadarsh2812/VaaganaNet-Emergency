import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import MapView from '../components/MapView'
import ECGMonitor from '../components/ECGMonitor'
import SurvivalMeter from '../components/SurvivalMeter'
import { useWS } from '../context/WSContext'
import { listHospitals, getHospitalPatients, getVitalsHistory } from '../api'

function getPrepList(sev) {
  const base=['Prepare emergency bay','Alert on-call physician','Ready IV line and monitoring equipment']
  if (!sev||sev==='—') return base
  if (sev.includes('Critical')||sev.includes('Severe')) return [...base,'Alert ICU team','Prepare crash cart','Blood typing — possible transfusion','Notify senior consultant']
  if (sev==='Moderate') return [...base,'Prepare oxygen support','Alert cardiologist if HR abnormal']
  return [...base,'Standard admission protocol']
}

export default function HospitalDash() {
  const { data } = useWS()
  const [hospitals, setHospitals] = useState([])
  const [selHosp, setSelHosp]     = useState(null)
  const [patients, setPatients]   = useState([])
  const [selEntry, setSelEntry]   = useState(null)
  const [vitals,   setVitals]     = useState({ hr:[], spo2:[], temp:[] })
  const [loading,  setLoading]    = useState(false)
  const [showPat,  setShowPat]    = useState(false)
  const [mapFull,  setMapFull]    = useState(false)

  useEffect(()=>{
    listHospitals().then(list=>{
      setHospitals(list)
      if(list.length>0&&!selHosp) setSelHosp(list[0])
    }).catch(()=>{})
  },[data.hospitals])

  useEffect(()=>{
    if(!selHosp) return
    setLoading(true)
    getHospitalPatients(selHosp._id)
      .then(list=>{ setPatients(list); setLoading(false) })
      .catch(()=>setLoading(false))
  },[selHosp,data.timestamp])

  useEffect(()=>{
    if(!selEntry?.patient?._id) return
    getVitalsHistory(selEntry.patient._id).then(r=>{
      setVitals({ hr:r.map(x=>x.heart_rate), spo2:r.map(x=>x.spo2), temp:r.map(x=>x.temperature) })
    }).catch(()=>{})
  },[selEntry,data.timestamp])

  const wsP  = selEntry ? data.patients?.find(p=>p.patient_id===selEntry.patient?._id) : null
  const surv = wsP?.survival_pct ?? selEntry?.survival_pct ?? 0
  const sev  = wsP?.severity ?? '—'
  const lv   = wsP?.vitals || selEntry?.latest_vitals
  const sevColor = sev==='Stable'?'var(--green)':sev.includes('Severe')||sev.includes('Critical')?'var(--red)':'var(--yellow)'

  const activePats    = patients.filter(p=>p.status==='active')
  const completedPats = patients.filter(p=>p.status==='completed')

  // Ambulances incoming to this hospital
  const incomingAmbs = (data.ambulances||[]).filter(a=>
    activePats.some(p=>p.ambulance?._id===a._id)
  )

  return (
    <Layout title="Hospital" subtitle="Incoming patient monitoring & triage">
      <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>

        {/* ── Left: patient list ── */}
        <div style={{ width:280, background:'white', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>

          {/* Hospital selector */}
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
            <div className="label" style={{ marginBottom:6 }}>Hospital</div>
            <select className="input" value={selHosp?._id||''} onChange={e=>{setSelHosp(hospitals.find(h=>h._id===e.target.value));setSelEntry(null)}}>
              {hospitals.map(h=><option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
            {selHosp && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginTop:8 }}>
                {[['Cases',selHosp.active_cases??0,'var(--orange2)'],['Capacity',selHosp.capacity??50,'var(--blue2)'],['Load%',Math.round(((selHosp.active_cases??0)/(selHosp.capacity??50))*100),'var(--green2)']].map(([l,v,c])=>(
                  <div key={l} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7, padding:'5px', textAlign:'center' }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:16, color:c }}>{v}</div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Patient list */}
          <div style={{ flex:1, overflow:'auto', padding:'8px 10px' }}>
            {loading && <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center', padding:20 }}>Loading…</div>}

            {!loading && patients.length===0 && (
              <div style={{ textAlign:'center', padding:'28px 16px', color:'var(--text3)' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🏥</div>
                <div style={{ fontWeight:600, fontSize:14, color:'var(--text2)', marginBottom:6 }}>No patients assigned</div>
                <div style={{ fontSize:12, lineHeight:1.7 }}>Register a patient in Simulation to auto-dispatch an ambulance to this hospital</div>
              </div>
            )}

            {activePats.length>0 && (
              <div className="label" style={{ marginBottom:8, padding:'2px 2px' }}>
                Incoming / Active ({activePats.length})
              </div>
            )}

            {activePats.map(entry=>{
              const wsP2 = data.patients?.find(p=>p.patient_id===entry.patient?._id)
              const pct  = wsP2?.survival_pct ?? entry.survival_pct ?? 0
              const lv2  = wsP2?.vitals || entry.latest_vitals
              const isSel= selEntry?.emergency_id===entry.emergency_id
              const amb  = (data.ambulances||[]).find(a=>a._id===entry.ambulance?._id)
              const simA = data.simulation?.ambulance_id===amb?._id ? data.simulation : null
              const eta  = simA?.remaining_min ?? entry.duration_min

              return (
                <div key={entry.emergency_id}
                  onClick={()=>setSelEntry(entry)}
                  className="card-hover"
                  style={{
                    border:`1.5px solid ${isSel?'var(--blue2)':'#fca5a5'}`,
                    borderRadius:10, padding:'11px 12px', marginBottom:8,
                    background:isSel?'var(--blue-lt)':'var(--red-lt)',
                    transition:'all 0.15s',
                  }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', cursor:'pointer' }}
                        onClick={e=>{e.stopPropagation();setSelEntry(entry);setShowPat(true)}}>
                        {entry.patient?.name}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>Age {entry.patient?.age}</div>
                    </div>
                    <span className="badge badge-red">EN ROUTE</span>
                  </div>

                  {/* ETA — most important info for hospital prep */}
                  <div style={{ background:'white', borderRadius:7, padding:'5px 9px', marginBottom:7, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'var(--text3)' }}>🚑 ETA to hospital</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:13, color:'var(--orange2)' }}>
                      ~{eta?.toFixed(0)??'?'} min
                    </span>
                  </div>

                  {/* Quick vitals */}
                  {lv2 && (
                    <div style={{ display:'flex', gap:5, marginBottom:7 }}>
                      {[['HR',lv2.heart_rate?.toFixed(0),'bpm',lv2.heart_rate>=60&&lv2.heart_rate<=100],
                        ['SpO₂',lv2.spo2?.toFixed(0),'%',lv2.spo2>=95],
                        ['Temp',lv2.temperature?.toFixed(1),'°C',lv2.temperature>=36&&lv2.temperature<=37.5]
                      ].map(([l,v,u,ok])=>(
                        <div key={l} style={{ flex:1, background:ok?'white':'var(--red-lt2)', border:`1px solid ${ok?'var(--border)':'#fca5a5'}`, borderRadius:5, padding:'3px 5px', textAlign:'center' }}>
                          <div style={{ fontSize:9, color:'var(--text3)' }}>{l}</div>
                          <div style={{ fontSize:11, fontWeight:700, color:ok?'var(--text)':'var(--red)', fontFamily:"'JetBrains Mono',monospace" }}>{v}{u}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Survival bar */}
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:10, color:'var(--text3)' }}>Survival prob.</span>
                    <span style={{ fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:pct>=70?'var(--green)':pct>=45?'var(--yellow)':'var(--red)' }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height:4, background:'rgba(0,0,0,0.08)', borderRadius:2 }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:pct>=70?'var(--green2)':pct>=45?'#ca8a04':'var(--red2)', borderRadius:2, transition:'width 1s' }}/>
                  </div>
                </div>
              )
            })}

            {completedPats.length>0 && (
              <div className="label" style={{ margin:'12px 0 8px', padding:'2px 2px' }}>Arrived ({completedPats.length})</div>
            )}
            {completedPats.map(entry=>(
              <div key={entry.emergency_id}
                onClick={()=>setSelEntry(entry)}
                style={{
                  border:`1px solid ${selEntry?.emergency_id===entry.emergency_id?'var(--blue2)':'var(--border)'}`,
                  borderRadius:9, padding:'9px 12px', marginBottom:6, cursor:'pointer',
                  background:selEntry?.emergency_id===entry.emergency_id?'var(--blue-lt)':'var(--green-lt)',
                  transition:'all 0.15s',
                }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{entry.patient?.name}</div>
                  <span className="badge badge-green">Arrived</span>
                </div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Age {entry.patient?.age}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Map — full width, shows incoming ambulances */}
          <div style={{ flex: mapFull ? 1 : '0 0 45%', padding:'10px 12px 6px', display:'flex', flexDirection:'column', transition:'flex 0.3s' }}>
            <div style={{ fontSize:11.5, fontWeight:700, color:'var(--text2)', marginBottom:5, display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:"'Rajdhani',sans-serif", letterSpacing:'0.06em' }}>
              <span>INCOMING AMBULANCES MAP
                {incomingAmbs.length>0 && (
                  <span style={{ marginLeft:8, fontSize:10, fontWeight:400, color:'var(--orange2)' }}>
                    {incomingAmbs.length} ambulance{incomingAmbs.length>1?'s':''} en route
                  </span>
                )}
              </span>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {incomingAmbs.map(a=>{
                  const simA = data.simulation?.ambulance_id===a._id ? data.simulation : null
                  return simA ? (
                    <span key={a._id} style={{ fontSize:11, background:'var(--orange-lt)', border:'1px solid var(--orange-lt2)', borderRadius:6, padding:'2px 8px', color:'var(--orange)' }}>
                      🚑 {a.label||'AMB'} · <strong>{simA.remaining_min} min away</strong>
                    </span>
                  ) : null
                })}
                <button className="btn btn-ghost btn-sm" onClick={()=>setMapFull(m=>!m)}>
                  {mapFull?'⬇ Collapse':'⬆ Expand Map'}
                </button>
              </div>
            </div>
            <div style={{ flex:1 }}>
              <MapView
                ambulances={data.ambulances||[]} hospitals={data.hospitals||[]}
                traffic={data.traffic||[]} route={data.route||[]}
                emergencyLoc={data.emergency_loc}
                center={selHosp?[selHosp.lat,selHosp.lon]:undefined}
                height="100%"
              />
            </div>
          </div>

          {/* Patient detail — hidden when map is full */}
          {!mapFull && (
            <div style={{ flex:1, overflow:'auto', borderTop:'1px solid var(--border)', padding:14 }}>
              {selEntry ? (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {/* Patient header */}
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ width:46, height:46, borderRadius:'50%', background:'var(--blue-lt)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:20, color:'var(--blue2)', border:'2px solid var(--blue-lt2)', flexShrink:0 }}>
                      {selEntry.patient?.name?.charAt(0)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div
                        onClick={()=>setShowPat(true)}
                        style={{ fontWeight:700, fontSize:16, color:'var(--blue2)', cursor:'pointer', textDecoration:'underline', textDecorationColor:'transparent', transition:'text-decoration-color 0.15s' }}
                        onMouseEnter={e=>e.target.style.textDecorationColor='var(--blue2)'}
                        onMouseLeave={e=>e.target.style.textDecorationColor='transparent'}
                      >
                        {selEntry.patient?.name}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>Age {selEntry.patient?.age} · Click name for full dashboard</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <div style={{
                        background:sev==='Stable'?'var(--green-lt)':sev.includes('Severe')||sev.includes('Critical')?'var(--red-lt)':'var(--yellow-lt)',
                        border:`1px solid ${sev==='Stable'?'var(--green-lt2)':sev.includes('Severe')||sev.includes('Critical')?'var(--red-lt2)':'#fef08a'}`,
                        borderRadius:9, padding:'7px 12px', textAlign:'center',
                      }}>
                        <div style={{ fontSize:10, color:'var(--text3)' }}>Condition</div>
                        <div style={{ fontSize:15, fontWeight:700, color:sevColor }}>{sev}</div>
                        <div style={{ fontSize:10, color:'var(--text3)' }}>{surv.toFixed(0)}% survival</div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={()=>setShowPat(true)}>Full Dashboard →</button>
                    </div>
                  </div>

                  {/* Vitals + ECG */}
                  {lv && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                      {[
                        {l:'Heart Rate',v:lv.heart_rate,u:'bpm',ok:lv.heart_rate>=60&&lv.heart_rate<=100,c:'#dc2626',b:vitals.hr,mn:30,mx:180},
                        {l:'SpO₂',v:lv.spo2,u:'%',ok:lv.spo2>=95,c:'#2563eb',b:vitals.spo2,mn:70,mx:100},
                        {l:'Temperature',v:lv.temperature,u:'°C',ok:lv.temperature>=36&&lv.temperature<=37.5,c:'#ca8a04',b:vitals.temp,mn:34,mx:42},
                      ].map(g=>(
                        <div key={g.l} style={{ border:`1px solid ${g.ok?'var(--green-lt2)':'var(--red-lt2)'}`, background:g.ok?'var(--green-lt)':'var(--red-lt)', borderRadius:9, padding:'10px 12px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                            <span style={{ fontSize:11, color:'var(--text3)' }}>{g.l}</span>
                            <span style={{ fontSize:10, fontWeight:600, color:g.ok?'var(--green)':'var(--red)' }}>{g.ok?'✓ Normal':'⚠ Abnormal'}</span>
                          </div>
                          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:20, color:g.c, marginBottom:6 }}>
                            {g.v?.toFixed(1)} <span style={{ fontSize:11, fontWeight:400, color:'var(--text3)' }}>{g.u}</span>
                          </div>
                          <ECGMonitor data={g.b} color={g.c} min={g.mn} max={g.mx} height={50} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Prep checklist */}
                  <div style={{ background:'var(--blue-lt)', border:'1px solid var(--blue-lt2)', borderRadius:9, padding:12 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'var(--blue2)', marginBottom:8 }}>📋 Preparation Checklist</div>

                    {getPrepList(sev).map((item,i)=>(
                      <label key={i} style={{ display:'flex', gap:8, marginBottom:6, cursor:'pointer' }}>
                        <input type="checkbox" style={{ marginTop:2, accentColor:'var(--blue2)', cursor:'pointer' }}/>
                        <span style={{ fontSize:12, color:'var(--text2)' }}>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text3)', fontSize:13 }}>
                  Select a patient from the list to view details
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Full patient dashboard overlay ── */}
      {showPat && selEntry && (
        <div className="overlay-backdrop" onClick={()=>setShowPat(false)}>
          <div className="animate-fade-in" style={{ width:'92vw', maxWidth:920, height:'88vh', background:'white', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-lg)' }} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding:'16px 22px', background:'linear-gradient(135deg,#0f766e,#0d9488)', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
              <div style={{ width:46, height:46, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:20, color:'white', border:'2px solid rgba(255,255,255,0.2)' }}>
                {selEntry.patient?.name?.charAt(0)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:18, color:'white', fontFamily:"'Rajdhani',sans-serif", letterSpacing:'0.02em' }}>{selEntry.patient?.name}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.75)' }}>Age {selEntry.patient?.age} · Hospital Patient Detail</div>
              </div>
              <span style={{ background:'rgba(255,255,255,0.2)', color:'white', fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20 }}>
                {selEntry.status?.toUpperCase()}
              </span>
              <button onClick={()=>setShowPat(false)} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'white', width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:18, fontFamily:'inherit' }}>✕</button>
            </div>

            <div style={{ flex:1, overflow:'auto', padding:20, display:'flex', flexDirection:'column', gap:16 }}>
              {/* Top row */}
              <div style={{ display:'grid', gridTemplateColumns:'180px 1fr 1fr 1fr', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)', borderRadius:12, padding:12 }}>
                  <SurvivalMeter pct={Math.round(surv)} size={120}/>
                </div>
                {lv && <>
                  {[
                    {l:'Heart Rate',v:lv.heart_rate,u:'bpm',ok:lv.heart_rate>=60&&lv.heart_rate<=100,c:'#dc2626',r:'60–100'},
                    {l:'SpO₂',v:lv.spo2,u:'%',ok:lv.spo2>=95,c:'#2563eb',r:'95–100'},
                    {l:'Temperature',v:lv.temperature,u:'°C',ok:lv.temperature>=36&&lv.temperature<=37.5,c:'#ca8a04',r:'36–37.5'},
                  ].map(g=>(
                    <div key={g.l} style={{ border:`1px solid ${g.ok?'var(--green-lt2)':'var(--red-lt2)'}`, background:g.ok?'var(--green-lt)':'var(--red-lt)', borderRadius:11, padding:'14px 16px', textAlign:'center' }}>
                      <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{g.l}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:26, color:g.c, lineHeight:1 }}>{g.v?.toFixed(1)}</div>
                      <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{g.u}</div>
                      <div style={{ fontSize:11, fontWeight:600, color:g.ok?'var(--green)':'var(--red)', marginTop:6 }}>{g.ok?'✓ Normal':'⚠ Abnormal'}</div>
                      <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>Normal: {g.r} {g.u}</div>
                    </div>
                  ))}
                </>}
              </div>

              {/* AI assessment */}
              <div style={{ background:sev==='Stable'?'var(--green-lt)':sev.includes('Severe')||sev.includes('Critical')?'var(--red-lt)':'var(--yellow-lt)', border:`1px solid ${sev==='Stable'?'var(--green-lt2)':sev.includes('Severe')||sev.includes('Critical')?'var(--red-lt2)':'#fef08a'}`, borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ fontSize:11.5, color:'var(--text3)', fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:'0.06em' }}>ML ASSESSMENT</div>
                <div style={{ fontWeight:700, fontSize:20, color:sevColor, fontFamily:"'Rajdhani',sans-serif" }}>{sev}</div>
                <div style={{ fontSize:12, color:'var(--text2)' }}>Survival: <strong style={{ color:sevColor }}>{surv.toFixed(1)}%</strong></div>
                <div style={{ marginLeft:'auto', fontSize:11, color:'var(--text3)' }}>LogisticRegression · scikit-learn</div>

              </div>

              {/* ECG monitors */}
              <div>
                <div className="label" style={{ marginBottom:10 }}>Continuous ECG Monitor</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    {t:'HEART RATE',v:lv?.heart_rate,u:'bpm',c:'#dc2626',b:vitals.hr,mn:30,mx:180,h:95},
                    {t:'SpO₂',v:lv?.spo2,u:'%',c:'#2563eb',b:vitals.spo2,mn:70,mx:100,h:80},
                    {t:'TEMPERATURE',v:lv?.temperature,u:'°C',c:'#ca8a04',b:vitals.temp,mn:34,mx:42,h:75},
                  ].map(g=>(
                    <div key={g.t} style={{ border:'1px solid var(--border)', borderRadius:9, padding:'8px 12px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                        <span style={{ fontSize:11, fontWeight:600, color:'var(--text2)', letterSpacing:'0.05em' }}>{g.t}</span>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:18, color:g.c }}>
                          {g.v?.toFixed(1)} <span style={{ fontSize:11, color:'var(--text3)', fontWeight:400 }}>{g.u}</span>
                        </span>
                      </div>
                      <ECGMonitor data={g.b} color={g.c} min={g.mn} max={g.mx} height={g.h} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Prep checklist */}
              <div style={{ background:'var(--blue-lt)', border:'1px solid var(--blue-lt2)', borderRadius:9, padding:14 }}>
                <div style={{ fontWeight:600, fontSize:14, color:'var(--blue2)', marginBottom:10 }}>📋 Preparation Checklist</div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {getPrepList(sev).map((item,i)=>(
                    <label key={i} style={{ display:'flex', gap:8, cursor:'pointer' }}>
                      <input type="checkbox" style={{ marginTop:3, accentColor:'var(--blue2)', cursor:'pointer', flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
