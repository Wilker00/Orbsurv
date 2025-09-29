// ===== Config-first, modernized SPA =====
  const CONFIG = Object.freeze({
    limits: { vmax: 0.6, amax: 1.2, jmax: 6.0 },
    patrol: [0.08,0.36,0.64,0.92],
    quietHours: { start: 22, end: 7 },
    fov: { scan: 0.20, focus: 0.12 },
    ring: { seconds: 10, fps: 1 },
    nn: { hidden: 10, epochs: 12, lr: 0.04, synth: 600 },
    ui: { vignette: true, maxCandidates: 5 }
  });

  // Tiny pub/sub store for app state (flat-ish)
  const createStore = (initial) => {
    let state = structuredClone(initial);
    const subs = new Set();
    return {
      get: () => state,
      set: (patch) => { state = { ...state, ...patch }; subs.forEach(fn => fn(state)); },
      update: (fn) => { state = fn(state); subs.forEach(s => s(state)); },
      sub: (fn) => { subs.add(fn); return () => subs.delete(fn); }
    };
  };

  // Global-ish app singletons scoped to module
  const app = {
    world: { width:1, objects:[], time:0, doorX:0.86, pet:null },
    recorder: { moments:[], tracking:false, cur:null },
    tracks: new Map(),
    ring: [],
    faults: { code:null, since:0 },
    NN: null
  };

  const store = createStore({
    mode:'scan', speed:1, pos:0.1, delayedPos:0.1, fovW:CONFIG.fov.scan,
    target:0.9, dir:1, railW:0, heat:true, motion:true, ai:false,
    patrolIdx:0, focusTime:0, _v:0, _a:0, nn:false, chaos:0
  });

  // Utilities
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const nowStr=()=>new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  const isQuietHours=()=>{ const h=(new Date()).getHours(); const {start,end}=CONFIG.quietHours; return (h>=start || h<end); };

  // Zones
  const ZONES = [
    {name:'Porch',  poly:[0.80,0.95], priority:+2, quietIgnore:false},
    {name:'Drive',  poly:[0.40,0.72], priority:+0, quietIgnore:true}
  ];
  const zoneAt = (x)=> ZONES.find(z=> x>=z.poly[0] && x<=z.poly[1]);

  // DOM refs once
  const $ = (sel)=>document.querySelector(sel);
  const DOM = {
    stage: $('#railStage'), rail: $('#rail'), car: $('#car'), beam: $('#beam'), beamGlow: $('#beamGlow'), floor: $('#floorWash'),
    modeLabel: $('#modeLabel'), feed: $('#feed'), hud: $('#hud'),
    btn: {
      scan: $('#btnScan'), patrol: $('#btnPatrol'), focus: $('#btnFocus'), reset: $('#btnReset'),
      heat: $('#btnHeat'), motion: $('#btnMotion'), zones: $('#btnZones'), ai: $('#btnAi'), nn: $('#btnNN'), summary: $('#btnSummary'), masks: $('#btnMasks'), drop: $('#btnPkgMini')
    },
    speed: $('#speed'),
    summaryDialog: $('#summaryDialog'), logBody: $('#logBody'), closeSummary: $('#closeSummary'), exportLog: $('#exportLog'),
    feedCanvas: $('#feedCanvas'), feedHUD: $('#feedHUD'),
    ops: $('#opsPanel'), opMode: $('#opMode'), opAI: $('#opAI'), opNN: $('#opNN'), opFPS: $('#opFPS'), opPos: $('#opPos'), opZone: $('#opZone'), opFault: $('#opFault'), chaos: $('#chaos'), chaosVal: $('#chaosVal'), candList: $('#candList'),
    err: $('#err')
  };
  const fctx = DOM.feedCanvas.getContext('2d');

  // Error overlay helper
  const showError = (msg) => { DOM.err.textContent = `[error] ${msg}`; DOM.err.classList.remove('hidden'); };
  const hideError = () => DOM.err.classList.add('hidden');

  // Theme bootstrap
  (()=>{
    const toggle = document.getElementById('theme-toggle'); if(!toggle) return;
    const body = document.body;
    const apply=(theme)=>{ theme==='dark' ? body.classList.add('dark-mode') : body.classList.remove('dark-mode'); toggle.checked = theme==='dark'; };
    toggle.addEventListener('change',()=>{const t=toggle.checked?'dark':'light'; localStorage.setItem('theme',t); apply(t);});
    const saved = localStorage.getItem('theme'); const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    apply(saved ? saved : (prefersDark ? 'dark':'light'));
  })();

  // Canvas DPR
  const sizeCanvas=()=>{
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = DOM.feedCanvas.getBoundingClientRect();
    DOM.feedCanvas.width = Math.round(rect.width * dpr);
    DOM.feedCanvas.height = Math.round(160 * dpr);
    fctx.setTransform(dpr,0,0,dpr,0,0);
  };

  // Recorder / day log
  const dayLog=[];
  const logEvent=(kind, details={})=>{
    const entry={ t: nowStr(), kind, sev: details?.sev || 'info', ...details };
    dayLog.push(entry); if(dayLog.length>600) dayLog.shift();
  };

  // Ring buffer capture (idle friendly)
  let lastThumb=0;
  const captureThumb=()=>{
    const w=160, h=Math.round((DOM.feedCanvas.height/DOM.feedCanvas.width)*w);
    const off=document.createElement('canvas'); off.width=w; off.height=h;
    off.getContext('2d').drawImage(DOM.feedCanvas,0,0,w,h);
    return off.toDataURL('image/jpeg',0.7);
  };
  const tickRing=(dt)=>{
    const t=performance.now();
    if(t - lastThumb > 1000/CONFIG.ring.fps){
      lastThumb=t; app.ring.push({t, data:captureThumb()});
      const oldest = t - CONFIG.ring.seconds*1000;
      while(app.ring.length && app.ring[0].t < oldest) app.ring.shift();
    }
  };

  // Recorder helpers
  const startMoment=(obj)=>{
    if(app.recorder.tracking) return;
    app.recorder.tracking=true;
    app.recorder.cur={ startPos: store.get().pos, t0: performance.now(), classes:[obj.cls||obj.type], maxConf: obj.conf||0, id: obj.id||null, preRoll: app.ring.slice(), frames:[] };
  };
  const updateMoment=(obj)=>{
    if(!app.recorder.tracking || !app.recorder.cur) return;
    const cur=app.recorder.cur;
    cur.classes.push(obj.cls||obj.type);
    cur.maxConf = Math.max(cur.maxConf, obj.conf||0);
    if(Math.random()<0.06) cur.frames.push({t:performance.now(), data:captureThumb()});
  };
  const endMoment=()=>{
    if(!app.recorder.tracking || !app.recorder.cur) return;
    const cur=app.recorder.cur;
    cur.t1 = performance.now(); cur.endPos = store.get().pos; cur.classes = Array.from(new Set(cur.classes)); cur.postRoll = app.ring.slice();
    app.recorder.moments.push(cur);
    app.recorder.tracking=false; app.recorder.cur=null;
  };

  // Geometry + layout
  const drawTicks=()=>{
    DOM.rail.querySelectorAll('.tick').forEach(el=>el.remove());
    const step=64; const r=DOM.rail.getBoundingClientRect(); const n=Math.floor(r.width/step);
    for(let i=0;i<=n;i++){ const d=document.createElement('div'); d.className='tick'; d.style.left=(i*step)+'px'; DOM.rail.appendChild(d); }
  };
  const placeCar=()=>{
    const s=store.get();
    const railRect=DOM.rail.getBoundingClientRect(); const stageRect=DOM.stage.getBoundingClientRect();
    const offsetWithinStage = DOM.rail.offsetLeft;
    const x = offsetWithinStage + s.pos*s.railW;
    DOM.car.style.left=x+'px';
    const open = s.focusTime>0 ? 0.55 : 1;
    DOM.beam.style.borderLeftWidth=(220*open)+'px';
    DOM.beam.style.borderRightWidth=(220*open)+'px';
    DOM.beam.style.animation = s.focusTime>0 ? 'beam-flicker 1.2s ease-in-out infinite' : 'none';
    DOM.beamGlow.style.opacity = s.focusTime>0 ? 0.6 : 0.35;
    const hitX = (railRect.left - stageRect.left) + s.pos*railRect.width;
    DOM.floor.style.left = hitX + 'px';
  };
  const layout=()=>{
    const r=DOM.rail.getBoundingClientRect(); store.update(s=>({...s, railW:r.width}));
    drawTicks(); placeCar(); sizeCanvas();
  };

  // Buttons mirror
  const mirrorButtons=()=>{
    const s=store.get();
    const on=(b,active)=>{ b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); };
    on(DOM.btn.scan, s.mode==='scan'); on(DOM.btn.patrol, s.mode==='patrol'); on(DOM.btn.focus, s.mode==='focus');
    DOM.btn.heat.setAttribute('aria-pressed', String(s.heat));
    DOM.btn.motion.setAttribute('aria-pressed', String(s.motion));
    DOM.btn.zones.setAttribute('aria-pressed', String(window.rulesEnabled ?? true));
    DOM.btn.ai.setAttribute('aria-pressed', String(s.ai));
    DOM.btn.ai.textContent = s.ai ? 'Stop AI Mode' : 'Start AI Mode';
    DOM.btn.nn.setAttribute('aria-pressed', String(s.nn));
    DOM.btn.nn.textContent = s.nn ? 'NN On' : 'NN';
    DOM.modeLabel.textContent = `mode: ${s.mode}`;

    // ops
    DOM.opMode.textContent=s.mode; DOM.opAI.textContent=s.ai?'on':'off'; DOM.opNN.textContent=s.nn?'on':'off';
  };

  // Rules flag (stays global-ish)
  window.rulesEnabled = true;

  // Input wiring
  DOM.btn.scan.addEventListener('click',()=> store.update(s=>({...s, ai:false, mode:'scan'})));
  DOM.btn.patrol.addEventListener('click',()=> store.update(s=>({...s, ai:false, mode:'patrol'})));
  DOM.btn.focus.addEventListener('click',()=> store.update(s=>({...s, ai:false, mode:'focus', focusTime:1.5})));
  DOM.btn.reset.addEventListener('click',()=>{
    Object.assign(app.faults,{code:null,since:0});
    store.set({ pos:0.1, delayedPos:0.1, dir:1, patrolIdx:0, focusTime:0, _v:0, _a:0, mode:'scan', ai:false });
    placeCar(); logEvent('system',{msg:'reset'});
  });
  DOM.btn.heat.addEventListener('click',()=> store.update(s=>({...s, heat:!s.heat})));
  DOM.btn.motion.addEventListener('click',()=> store.update(s=>({...s, motion:!s.motion})));
  DOM.btn.zones.addEventListener('click',()=>{ window.rulesEnabled=!window.rulesEnabled; logEvent('system',{msg: window.rulesEnabled?'rules on':'rules off'}); mirrorButtons(); });
  DOM.speed.addEventListener('input',e=> store.update(s=>({...s, speed:parseFloat(e.target.value)})));
  DOM.btn.ai.addEventListener('click',()=> store.update(s=>({...s, ai:!s.ai, mode: s.ai? s.mode : 'scan'})));
  DOM.btn.nn.addEventListener('click',()=> store.update(s=>({...s, nn:!s.nn})));
  DOM.chaos.addEventListener('input', e=>{ DOM.chaosVal.textContent=parseFloat(e.target.value).toFixed(2); store.update(s=>({...s, chaos:parseFloat(e.target.value)})); });
  DOM.btn.drop.addEventListener('click',()=> addPackage(app.world.doorX));

  // Summary modal
  DOM.btn.summary.addEventListener('click',()=>{
    DOM.logBody.innerHTML = '';
    const evSection = document.createElement('div');
    evSection.innerHTML = `<div style="font-weight:700;margin:8px 0">Events (${dayLog.length})</div>` +
      (dayLog.length
        ? dayLog.map(e=>`<div class="logRow"><div><span class="pill">${e.t}</span><br><span class="pill">${e.sev}</span></div><div><strong>${e.kind}</strong> — ${e.msg||''} ${e.type?`<span class="pill">${e.type}</span>`:''} ${e.id?`<span class="pill">id:${e.id}</span>`:''} ${e.conf!==undefined?`<span class="pill">conf:${typeof e.conf==='number'?e.conf.toFixed(2):e.conf}</span>`:''}</div></div>`).join('')
        : '<div class="pad">No events yet.</div>');
    DOM.logBody.appendChild(evSection);

    const mom = app.recorder.moments;
    const clipSection = document.createElement('div');
    clipSection.innerHTML = `<div style="font-weight:700;margin:16px 0 8px">Clips (${mom.length})</div>`;
    DOM.logBody.appendChild(clipSection);

    if(mom.length){
      const grid = document.createElement('div'); grid.className='thumbGrid';
      mom.forEach((m, i)=>{
        const anyThumb = (m.frames[0]?.data) || (m.preRoll[m.preRoll.length-1]?.data) || '';
        const dur = ((m.t1-m.t0)/1000).toFixed(1);
        const wrap = document.createElement('div'); wrap.className='thumb';
        wrap.innerHTML = `<img alt="clip ${i}" src="${anyThumb}"><a download="clip_${i}.jpg" href="${anyThumb}">dl thumb · ${dur}s · id:${m.id??'n'}</a>`;
        grid.appendChild(wrap);
      });
      DOM.logBody.appendChild(grid);
    } else {
      const none = document.createElement('div'); none.className='pad'; none.textContent='No clips yet.';
      DOM.logBody.appendChild(none);
    }

    // Masks preview
    const maskInfo = document.createElement('div');
    maskInfo.style.marginTop='16px';
    maskInfo.innerHTML = `<div style="font-weight:700;margin:8px 0">Privacy masks (${masks.length})</div>` +
      (masks.length ? masks.map(m=>`<span class="pill">[${m.a.toFixed(2)}, ${m.b.toFixed(2)}]</span>`).join(' ') : '<div class="pad">No masks defined. Click “Masks” and drag on the feed to add one. Double-click feed to clear.</div>');
    DOM.logBody.appendChild(maskInfo);

    DOM.summaryDialog.showModal();
  });
  DOM.closeSummary.addEventListener('click',()=>DOM.summaryDialog.close());
  DOM.exportLog.addEventListener('click',()=>{
    const cfg = {ZONES, rulesEnabled: window.rulesEnabled, limits: CONFIG.limits, quietHours: CONFIG.quietHours, masks};
    const blob = new Blob([JSON.stringify({config:cfg, events:dayLog, moments:app.recorder.moments}, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='orbsurv_daylog.json'; a.click(); URL.revokeObjectURL(url);
  });

  // Privacy masks
  const masks=[]; let maskEditing=false, dragStart=null;
  DOM.btn.masks.addEventListener('click',()=>{ maskEditing=!maskEditing; DOM.btn.masks.setAttribute('aria-pressed', String(maskEditing)); logEvent('system',{msg:maskEditing?'mask edit on':'mask edit off'}); });
  DOM.feedCanvas.addEventListener('mousedown',(e)=>{
    if(!maskEditing) return; const rect=DOM.feedCanvas.getBoundingClientRect(); dragStart=(e.clientX-rect.left)/rect.width; DOM.feedCanvas.setPointerCapture?.(e.pointerId||0);
  });
  window.addEventListener('mouseup',(e)=>{
    if(!maskEditing || dragStart===null) return; const rect=DOM.feedCanvas.getBoundingClientRect(); let a=dragStart, b=(e.clientX-rect.left)/rect.width; if(a>b) [a,b]=[b,a]; a=clamp(a,0,1); b=clamp(b,0,1); if(b-a>0.03){ masks.push({a,b}); logEvent('privacy',{msg:'mask added', a:a.toFixed(2), b:b.toFixed(2)}); } dragStart=null;
  });
  DOM.feedCanvas.addEventListener('dblclick',()=>{ if(!maskEditing) return; masks.length=0; logEvent('privacy',{msg:'masks cleared'}); });

  // Stage interactions
  DOM.stage.addEventListener('click',(e)=>{
    const r=DOM.rail.getBoundingClientRect(); const gate = 42;
    if(e.clientY < r.top - gate || e.clientY > r.bottom + gate) return;
    const x=clamp((e.clientX - r.left)/r.width,0,1);
    store.set({ target:x, mode:'focus', focusTime:1.8 });
    spawnEvent('manual', e.clientX, e.clientY);
    logEvent('manual',{msg:'manual focus', x});
  });

  // Keys
  window.addEventListener('keydown', e=>{
    const s=store.get();
    if(e.key==='ArrowLeft') store.set({ target:clamp(s.pos-0.05,0.02,0.98), mode:'focus', focusTime:0.8 });
    if(e.key==='ArrowRight') store.set({ target:clamp(s.pos+0.05,0.02,0.98), mode:'focus', focusTime:0.8 });
    if(e.key==='a' || e.key==='A') store.set({ ai:!s.ai });
    if(e.key==='n' || e.key==='N') store.set({ nn:!s.nn });
    if(e.key==='f' || e.key==='F') store.set({ mode:'focus', focusTime:1.0 });
    if(e.key==='r' || e.key==='R') DOM.btn.reset.click();
    if(e.key==='m' || e.key==='M') DOM.btn.masks.click();
    if(e.key==='?') DOM.ops.classList.toggle('opsHide');
  }, {passive:true});

  // Tracking
  let nextId=1;
  const matchTrack=(x, cls)=>{
    let best=null, bestD=0.04; const now=performance.now();
    for(const [id,t] of app.tracks){ if(now - t.lastSeen > 2500) { app.tracks.delete(id); continue; } const d=Math.abs(t.x - x) + (t.cls===cls?0:0.01); if(d<bestD){ bestD=d; best={id,t}; }}
    return best?.id || null;
  };
  const touchTrack=(id, x, cls, conf)=> app.tracks.set(id, {x, cls, conf, lastSeen:performance.now()});

  // Event spawners
  const spawnEvent=(kind,absX,absY)=>{
    const rect=DOM.stage.getBoundingClientRect(); const r=DOM.rail.getBoundingClientRect();
    const vx = absX ?? (r.left + Math.random()*r.width); const vy = absY ?? (rect.top + 40 + Math.random()*Math.max(20, rect.height-80));
    const norm=clamp((vx - r.left)/r.width,0,1); const leftPx = (r.left - rect.left) + norm * r.width; const topPx = vy - rect.top;

    const dot=document.createElement('div'); dot.style.cssText='position:absolute;width:10px;height:10px;border-radius:50%;box-shadow:0 0 12px rgba(255,93,115,.7)'; dot.style.left=(leftPx-5)+'px'; dot.style.top=(topPx-5)+'px'; dot.style.background='var(--hot)'; dot.style.animation='dot-pop .25s ease-out both'; DOM.stage.appendChild(dot); setTimeout(()=>dot.remove(), 900);

    let cls='unknown', conf=0.6+Math.random()*0.35;
    if(kind==='motion'){ const rdm=Math.random(); cls = rdm<0.5? 'pet' : (rdm<0.8? 'box' : 'person'); if(cls==='person') conf = 0.75+Math.random()*0.2; }
    else if(kind==='manual'){ cls='poi'; conf=0.9; }

    addMotion(norm, cls, conf);
    if(store.get().ai && cls==='person'){ store.set({ target:norm, mode:'focus', focusTime:1.6 }); }
    logEvent('event',{type:cls, x:norm, msg:kind, conf: conf.toFixed(2)});
  };
  const addPackage=(x)=>{
    spawnHandCarrier(x);
    const id = matchTrack(x,'box') || nextId++;
    app.world.objects.push({id, type:'package', x, y:0.65, w:0.08, h:0.06, vx:-0.06, heat:0.4, conf:0.7, life:10});
    touchTrack(id, x, 'box', 0.7);
    logEvent('event',{type:'box', id, x, msg:'package drop', conf:0.70});
  };
  const spawnHandCarrier=(x)=>{
    const id = matchTrack(x,'hand') || nextId++;
    app.world.objects.push({id, type:'hand', x:x+0.04, vx:0.10, y:0.58, life:1.0, heat:0.9, conf:0.8});
    touchTrack(id, x, 'hand', 0.8);
    logEvent('event',{type:'hand', id, msg:'carrier detected', conf:0.80});
  };
  const addMotion=(x, cls, conf)=>{
    const id = matchTrack(x, cls) || nextId++;
    app.world.objects.push({ id, type:'motion', x, vx:(Math.random()-0.5)*0.08, y:0.5, r:0.02, cls:cls||'unknown', heat: cls==='person' ? 0.7 : 0.3, conf: conf ?? (0.6+Math.random()*0.35), life: 1.8 });
    touchTrack(id, x, cls, conf);
  };
  const ensurePet=()=>{
    if(app.world.pet) return; const id = nextId++; app.world.pet = { id, type:'motion', cls:'pet', x:0.3, vx:0, y:0.5, heat:0.5, conf:0.65, life:9999 }; app.world.objects.push(app.world.pet); touchTrack(id, 0.3, 'pet', 0.65);
  };

  // Scenarios
  const runScenario=(steps)=>{
    if(runScenario.timer){ clearInterval(runScenario.timer); runScenario.timer=null; }
    let idx=0, t=0;
    const tick=()=>{ t+=0.1; const cur=steps[Math.min(idx-1, steps.length-1)]; if(cur && t>(cur.wait||1)) step(); };
    const step=()=>{
      if(idx>=steps.length){ clearInterval(runScenario.timer); runScenario.timer=null; return; }
      const s=steps[idx++]; t=0; if(s.mode) store.set({mode:s.mode}); if(s.focus!==undefined) store.set({target:clamp(s.focus,0,1), focusTime:s.dwell||1.2}); if(s.event){ for(let j=0;j<(s.count||1);j++){ setTimeout(()=>spawnEvent(s.event), (j*120)); } } if(s.drop) addPackage(s.drop);
    };
    step(); runScenario.timer=setInterval(tick,100);
  };
  $('#scnQuiet').addEventListener('click',()=> runScenario([{mode:'scan', wait:2.0},{event:'heat', count:1, wait:1.2},{focus:0.72, dwell:1.6, wait:1.8},{mode:'scan', wait:2.2}]));
  $('#scnPackage').addEventListener('click',()=> runScenario([{mode:'patrol', wait:1.0},{drop: app.world.doorX, wait:0.6},{event:'motion', count:2, wait:0.8},{focus:app.world.doorX, dwell:1.4, wait:1.2},{mode:'patrol', wait:1.6}]));
  $('#scnPet').addEventListener('click',()=>{ ensurePet(); runScenario([{mode:'scan', wait:0.8},{event:'motion', count:1, wait:0.6},{focus:0.55, dwell:1.2, wait:0.9},{focus:0.65, dwell:0.9, wait:0.9},{focus:0.45, dwell:0.9, wait:0.9},{mode:'scan', wait:1.4}]); });

  // Physics
  const edgeLimitedVmax=(x)=>{ const edge = Math.min(x, 1-x); const scale = clamp(edge/0.10, 0.25, 1); return CONFIG.limits.vmax * scale * store.get().speed; };
  const stepKinematics=(target, dt)=>{
    if(app.faults.code) return; const s=store.get(); const dx = target - s.pos; const dir = Math.sign(dx) || 1; const desiredA = dir * CONFIG.limits.amax * s.speed; const da = clamp(desiredA - s._a, -CONFIG.limits.jmax*dt, CONFIG.limits.jmax*dt);
    let _a = s._a + da; const vmaxLocal = edgeLimitedVmax(s.pos); let _v = clamp(s._v + _a*dt, -vmaxLocal, vmaxLocal); if(Math.abs(dx) < Math.abs(_v*dt)){ _v = dx/dt; _a = 0; }
    store.set({ pos: clamp(s.pos + _v*dt, 0.0, 1.0), _v, _a });
  };

  // Watchdog
  let targetDemandTimer=0;
  const watchdog=(dt)=>{
    if(app.faults.code) return; const s=store.get(); const demand = Math.abs(s.target - s.pos); targetDemandTimer = demand > 0.12 ? targetDemandTimer + dt : 0; if(targetDemandTimer > 2.0){ app.faults.code='E201_STALL'; app.faults.since=performance.now(); logEvent('fault',{sev:'error', msg:'stall detected: demand > capability', type:app.faults.code}); }
  };

  // Render feed
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const drawFeed=(dt)=>{
    const rect = DOM.feedCanvas.getBoundingClientRect(); const w=rect.width, h=160; fctx.clearRect(0,0,w,h);

    // Latency & FOV/exposure
    const baseLatency = prefersReducedMotion ? 0.06 : 0.14 + 0.06*Math.sin(app.world.time);
    const a = clamp(dt/baseLatency, 0, 1); const s=store.get();
    const delayedPos = lerp(s.delayedPos, s.pos, a); const targetW = s.mode==='focus' ? CONFIG.fov.focus : CONFIG.fov.scan; const fovW = lerp(s.fovW, targetW, 0.08);
    store.set({ delayedPos, fovW });

    // Background
    const day = (Math.sin(app.world.time*0.05)+1)/2; const base = lerp(16, 36, day) + (s.mode==='focus'?8:0);
    fctx.fillStyle = `rgba(${base},${base+5},${base+10},0.45)`; fctx.fillRect(0,0,w,h);

    // Lines
    fctx.save(); fctx.fillStyle = `rgba(255,255,255,${lerp(0.02,0.06,day).toFixed(3)})`;
    for(let i=0;i<6;i++){ const y=lerp(40,h-30,i/5); fctx.fillRect(0,y,w,1); } fctx.restore();

    const cx = lerp(60,w-60,delayedPos); const leftF = delayedPos - fovW*0.5; const rightF = delayedPos + fovW*0.5;

    // Door
    const doorXPix = lerp(0,w,app.world.doorX); fctx.fillStyle='#2d3748'; fctx.fillRect(doorXPix-10, h*0.42, 20, 50); fctx.fillStyle='#475569'; fctx.fillRect(doorXPix-11, h*0.42, 2, 50);

    // Update objs
    app.world.time+=dt; const objs=[];
    for(const o of app.world.objects){
      const oo=o; if(oo.type==='package'){ oo.x += (oo.vx||-0.06)*dt; oo.life-=dt; touchTrack(oo.id, oo.x, 'box', oo.conf||0.7); }
      if(oo.type==='motion'){
        if(oo.cls==='pet') oo.vx = 0.06*Math.sin(app.world.time*0.6);
        oo.x += (oo.vx||0)*dt; oo.conf = clamp((oo.conf||0.6) - 0.04*dt, 0, 1); oo.heat = clamp((oo.heat||0.3) - 0.02*dt + (s.heat?0.01*dt:0), 0, 1);
        if(oo.conf>0.55 && oo.heat>0.7 && oo.cls!=='person'){ oo.cls='person'; oo.conf = Math.max(oo.conf,0.75); }
        oo.life-=dt; touchTrack(oo.id, oo.x, oo.cls, oo.conf);
      }
      if(oo.type==='hand'){ oo.x += (oo.vx||0.1)*dt; oo.life-=dt*1.3; touchTrack(oo.id, oo.x, 'hand', oo.conf||0.8); }
      if(oo.life>0) objs.push(oo);
    }
    app.world.objects=objs;

    // Draw visible
    for(const o of app.world.objects){
      if(o.x<leftF || o.x>rightF) continue; const xPix = lerp(0,w,o.x);
      if(o.type==='package'){
        const y = lerp(h*0.55,h*0.75, 1.0); fctx.fillStyle='rgba(0,0,0,.35)'; fctx.beginPath(); fctx.ellipse(xPix,y+16,28,10,0,0,Math.PI*2); fctx.fill(); fctx.fillStyle='#caa46a'; fctx.strokeStyle='#9a7b46'; fctx.lineWidth=2; roundRect(fctx,xPix-30,y-40,60,40,6,true,true); fctx.fillStyle='rgba(255,255,255,.5)'; fctx.fillRect(xPix-6,y-40,12,40);
      } else {
        const rs = clamp((o.vx||0)*260, -10, 10); const y = h*0.58 + (rs*0.15); const r = o.cls==='person' ? 13 : 11; const hue = o.cls==='person' ? 200 : (o.cls==='pet'? 120 : 40);
        fctx.fillStyle = `hsla(${hue},70%,60%,0.28)`; fctx.beginPath(); fctx.arc(xPix,y,r,0,Math.PI*2); fctx.fill(); fctx.font='10px Inter'; fctx.fillStyle='rgba(255,255,255,.85)'; fctx.fillText(`${o.cls||o.type} ${(o.conf||0).toFixed(2)} id:${o.id}`, xPix-30, y-16);
      }
    }

    // Masks
    if(masks.length){ fctx.save(); fctx.fillStyle='rgba(0,0,0,0.85)'; masks.forEach(m=>{ const a = lerp(0,w, m.a), b = lerp(0,w, m.b); fctx.fillRect(a, 0, b-a, h); }); fctx.restore(); }

    // Noise sprinkles
    for(let i=0;i<6;i++){ const nx = Math.random()*w, ny=Math.random()*h*0.8; fctx.fillStyle=`rgba(255,255,255,${Math.random()*0.02})`; fctx.fillRect(nx, ny, 1, 1); }

    // Reticle
    fctx.strokeStyle='rgba(255,255,255,.28)'; fctx.lineWidth=1; fctx.beginPath(); fctx.arc(cx,h*0.6,18,0,Math.PI*2); fctx.stroke();

    // HUD
    const mm = Math.floor(app.world.time/60).toString().padStart(2,'0'); const ss = Math.floor(app.world.time%60).toString().padStart(2,'0');
    const visible = app.world.objects.filter(o => o.x>=leftF && o.x<=rightF && o.type!=='hand');
    const best = visible.slice().sort((a,b)=> (b.cls==='person') - (a.cls==='person') || (b.conf||0)-(a.conf||0))[0];
    const z = zoneAt(delayedPos);
    let status = app.faults.code ? `FAULT ${app.faults.code}` : (best ? (s.mode==='focus' ? `tracking ${best.cls} id ${best.id}` : `detect ${best.cls} id ${best.id}`) : 'idle');
    if(z){ status += ` | zone:${z.name}`; if(isQuietHours() && z.quietIgnore) status += ' [quiet]'; }
    const nnTag = s.nn ? ' | nn' : ''; const chaosTag = s.chaos>0 ? ` | chaos:${s.chaos.toFixed(2)}` : '';
    DOM.feedHUD.textContent=`${mm}:${ss} | ${s.mode}${s.ai?' | ai':''}${nnTag}${chaosTag} | ${status}`;

    if(best){ if(!app.recorder.tracking) startMoment(best); else updateMoment(best); } else if(app.recorder.tracking){ endMoment(); }
    tickRing(dt);
  };

  const roundRect=(ctx,x,y,w,h,r,fill,stroke)=>{
    if(w<2*r) r=w/2; if(h<2*r) r=h/2; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill) ctx.fill(); if(stroke) ctx.stroke();
  };

  // NN (same as earlier version, moved behind API)
  class TinyMLP{ constructor(inDim, hidden=8){ this.inDim=inDim; this.h=hidden; const r=()=> (Math.random()*2-1)*0.2; this.W1=Array.from({length:hidden}, () => Array.from({length:inDim}, r)); this.b1=Array.from({length:hidden}, r); this.W2=Array.from({length:hidden}, r); this.b2=r(); }
    static sigmoid(x){ return 1/(1+Math.exp(-x)); } static relu(x){ return x>0?x:0; }
    forward(x){ const h=new Array(this.h); for(let i=0;i<this.h;i++){ let s=this.b1[i]; const w=this.W1[i]; for(let j=0;j<this.inDim;j++) s+=w[j]*x[j]; h[i]=TinyMLP.relu(s);} let y=this.b2; for(let i=0;i<this.h;i++) y+=this.W2[i]*h[i]; return {h, y: TinyMLP.sigmoid(y)}; }
    trainStep(x, target, lr=0.02){ const {h, y}=this.forward(x); const dy = y - target; for(let i=0;i<this.h;i++){ this.W2[i] -= lr * dy * h[i]; } this.b2 -= lr * dy; for(let i=0;i<this.h;i++){ const reluGrad = h[i]>0 ? 1 : 0; const dHi = dy * this.W2[i] * reluGrad; for(let j=0;j<this.inDim;j++){ this.W1[i][j] -= lr * dHi * x[j]; } this.b1[i] -= lr * dHi; } return y; }
    predict(x){ return this.forward(x).y; }
  }

  const featuresFor=(o, ctx)=>{
    const cls = o.cls || o.type || 'unknown';
    const oneHot = [ cls==='person'?1:0, cls==='pet'?1:0, (cls==='box'||cls==='package')?1:0 ];
    const conf = clamp(o.conf ?? 0, 0, 1); const heat = clamp(o.heat ?? 0, 0, 1); const z = zoneAt(o.x); const zonePriority = z ? (z.priority||0) : 0; const quiet = isQuietHours() ? 1 : 0; const vxAbs = Math.min(1, Math.abs(o.vx || 0) / 0.12); const fovDist = Math.min(1, Math.abs((o.x || 0) - ctx.pos) / Math.max(0.001, store.get().fovW*0.5));
    return [...oneHot, conf, heat, zonePriority, quiet, vxAbs, fovDist];
  };

  const makeSyntheticSet=(n=CONFIG.nn.synth)=>{ const X=[], Y=[]; for(let i=0;i<n;i++){ const clsPick = Math.random(); const cls = clsPick<0.5?'person':(clsPick<0.75?'box':'pet'); const conf = Math.random()*0.5 + (cls==='person'?0.4:0.2); const heat = Math.random()*0.5 + (cls==='person'?0.3:0.1); const x = Math.random(); const vx=(Math.random()-0.5)*0.12; const z = zoneAt(x); const quiet = Math.random()<0.35?1:0; const ctxPos = Math.random(); const fovW = Math.random()*0.12 + 0.12; const fovDist = Math.min(1, Math.abs(x-ctxPos) / Math.max(0.001,fovW*0.5)); let score = 0; score += (cls==='person') ? 1.2 : 0; score += (cls==='box') ? 0.2 : 0; score += (cls==='pet') ? 0.4 : 0; if(z && z.name==='Porch') score += 0.6; if(quiet && z && z.name==='Drive' && cls!=='person') score -= 1.0; score += 0.6*conf + 0.3*heat; score += 0.2*(1 - fovDist); score -= 0.1*Math.abs(vx)/0.12; const target = score>1.2 ? 1 : 0; const fx = [cls==='person'?1:0, cls==='pet'?1:0, cls==='box'?1:0, conf, heat, z ? (z.priority||0) : 0, quiet, Math.min(1, Math.abs(vx)/0.12), fovDist]; X.push(fx); Y.push(target);} return {X,Y}; };

  const trainNN=()=>{ const inDim = 9; app.NN = new TinyMLP(inDim, CONFIG.nn.hidden); const {X,Y} = makeSyntheticSet(); for(let e=0;e<CONFIG.nn.epochs;e++){ for(let i=0;i<X.length;i++){ app.NN.trainStep(X[i], Y[i], CONFIG.nn.lr); }} console.debug('[NN] trained', X.length, 'samples'); };
  const nnScore=(o)=>{ if(!app.NN) return 0; const x = featuresFor(o, {pos: store.get().delayedPos}); const base = app.NN.predict(x); const c = store.get().chaos; if(c<=0) return base; const rnd=Math.random(); const inv=1-base; return base*(1-c) + c*(0.6*rnd + 0.4*inv); };

  const applyRules=(cands)=>{
    if(!cands?.length) return cands;
    const s=store.get();
    if(s.nn && app.NN){ for(const c of cands){ c.score = nnScore(c); } cands.sort((a,b)=> (b.score||0)-(a.score||0)); return cands; }
    if(!window.rulesEnabled) return cands;
    const quiet=isQuietHours();
    for(const c of cands){ const z = zoneAt(c.x); c.score = (c.conf||0) + (c.cls==='person'?0.25:0) + (z?z.priority*0.1:0); if(quiet && z && z.quietIgnore) c.score -= 999; if(z && z.name==='Porch' && c.cls==='box') c.score += 0.4; }
    cands.sort((a,b)=> (b.score||0)-(a.score||0)); return cands;
  };

  // Candidate list UI
  const renderCandidates=(list=[])=>{
    DOM.candList.innerHTML = '';
    if(!list.length){ const p=document.createElement('div'); p.className='hint'; p.textContent='No candidates in FOV.'; DOM.candList.appendChild(p); return; }
    list.slice(0,CONFIG.ui.maxCandidates).forEach((c,i)=>{
      const wrap=document.createElement('div'); wrap.className='cand';
      const z=zoneAt(c.x); const zName=z?z.name:'—'; const score=(c.score??0).toFixed(2);
      wrap.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <div><b>#${i+1}</b> ${c.cls||c.type} <span class="meta">id:${c.id}</span></div>
          <div class="meta">x:${(c.x||0).toFixed(2)}</div>
        </div>
        <div class="meta">conf:${(c.conf||0).toFixed(2)} · heat:${(c.heat||0).toFixed(2)} · zone:${zName}</div>
        <div class="bar" aria-label="score"><span style="width:${clamp((c.score||0),0,1)*100}%"></span></div>
        <div class="meta">score:${score}${store.get().nn?' (NN)':' (rules)'} </div>
      `;
      DOM.candList.appendChild(wrap);
    });
  };

  // Main loop with guarded try/catch
  let last=performance.now(), fps=0, fpsA=0;
  const loop=(now)=>{
    try{
      const dt=Math.min(0.033,(now-last)/1000); last=now; const inst = 1/Math.max(dt,1e-6); fpsA = fpsA? lerp(fpsA, inst, 0.1) : inst; fps = Math.round(fpsA);

      // Random events
      const s=store.get();
      if(s.heat || s.motion){ if(Math.random()<dt*(s.heat?0.35:0)) spawnEvent('heat'); if(Math.random()<dt*(s.motion?0.50:0)) spawnEvent('motion'); }
      if(s.focusTime>0) store.set({ focusTime: s.focusTime - dt });

      // Target selection
      if(s.focusTime>0){ /* hold */ }
      else if(s.ai){
        const left = s.delayedPos - s.fovW*0.5; const right = s.delayedPos + s.fovW*0.5;
        const visible = app.world.objects.filter(o => o.x>=left && o.x<=right && o.type!=='hand');
        const ranked = applyRules(visible.slice()); renderCandidates(ranked);
        const tgt = ranked[0];
        if(tgt) store.set({ target: clamp(tgt.x,0.02,0.98), mode:'focus' });
        else { const goal=CONFIG.patrol[s.patrolIdx]; const stepDone=Math.abs(s.pos-goal)<0.012; store.set({ mode:'patrol', target: goal, patrolIdx: stepDone? (s.patrolIdx+1)%CONFIG.patrol.length : s.patrolIdx }); }
      } else {
        renderCandidates([]);
        if(s.mode==='scan'){
          let t = s.target + 0.22*dt*s.dir*s.speed; let dir=s.dir; if(t>0.98){ t=0.98; dir=-1; } if(t<0.02){ t=0.02; dir=1; } store.set({ target:t, dir });
        } else if(s.mode==='patrol'){
          const goal=CONFIG.patrol[s.patrolIdx]; const stepDone=Math.abs(s.pos-goal)<0.012; store.set({ target: goal, patrolIdx: stepDone? (s.patrolIdx+1)%CONFIG.patrol.length : s.patrolIdx });
        }
      }

      // Beam + motion
      const ss=store.get(); const dist = Math.abs(ss.target - ss.pos); const alpha = clamp(0.20 - dist*0.15, 0.06, 0.24); DOM.beam.style.borderTopColor = `rgba(13,110,253,${alpha})`;
      watchdog(dt); stepKinematics(ss.target, dt); placeCar(); drawFeed(dt);

      // ops vitals
      DOM.opFPS.textContent = String(fps); DOM.opPos.textContent = `${store.get().pos.toFixed(2)} → ${store.get().target.toFixed(2)}`; const z = zoneAt(store.get().delayedPos); DOM.opZone.textContent = z ? z.name : '—'; DOM.opFault.textContent = app.faults.code || 'none';

      hideError(); requestAnimationFrame(loop);
    } catch(err){ showError(err?.stack || String(err)); requestAnimationFrame(loop); }
  };

  // Reactive UI pieces
  store.sub(mirrorButtons);

  // Init
  const ro = 'ResizeObserver' in window ? new ResizeObserver(()=>layout()) : null;
  ro?.observe(DOM.rail); ro?.observe(DOM.feed);
  window.addEventListener('resize', layout, {passive:true});
  window.addEventListener('load', layout, {once:true, passive:true});
  ensurePet(); trainNN(); layout(); requestAnimationFrame(loop);

  // Smoke tests
  (function runDevTests(){
    try{
      console.assert(typeof app.world.time === 'number', 'world time ok');
      const prev=store.get().mode; store.set({mode:'patrol'});
      console.assert(DOM.btn.patrol.getAttribute('aria-pressed')==='true','patrol aria true');
      store.set({mode:'scan'});
      console.assert(DOM.btn.scan.getAttribute('aria-pressed')==='true','scan aria true');
      const rr=DOM.rail.getBoundingClientRect(); spawnEvent('heat', rr.left + rr.width*0.5, DOM.stage.getBoundingClientRect().top + 100); addPackage(app.world.doorX); store.set({mode:prev}); console.debug('[tests] ok');
    }catch(e){ console.error('[tests]', e); }
  })();
