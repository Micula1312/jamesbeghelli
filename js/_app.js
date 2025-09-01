/* =========================================================
   James Beghelli — App.js (’90s UI)
   - Viewer principale con effetto “sgretolamento”
   - Navigazione sequenziale (◀ ▶ ↻)
   - Finestra principale draggabile + ridimensionabile
   - Cometa semplice (1 sticker), sempre visibile e on-top
   - Desktop con cartelle progetto + icona “Viewer”
   ========================================================= */

/* ===== Versione (utile per cache-busting in console) ===== */
const JB_VERSION = '2025-09-01-01';
console.info('[JAMES] app.js version', JB_VERSION);

/* ===== Config & Assets ===== */
const FIT_MODE = 'contain'; // nessuna deformazione nel viewer principale

// Sequenza immagini per il viewer principale (ordine = loop sequenziale)
const images = [
  'img/image1.jpeg','img/image2.jpeg','img/image4.jpeg','img/image5.jpeg',
  'img/image6.jpeg','img/image7.jpeg','img/image8.jpeg','img/image9.jpeg'
];

/* ===== Wallpapers (desktop) ===== */
const WALLPAPERS = [
  'img/wallpapers/wallpaper1.jpg',
  'img/wallpapers/wallpaper2.jpg'
];
let wpIndex = 0;

// Sticker/cometa usati dal pulsante "Saluta"
const stickers = ['img/stickers/sticker.png'];

// Icone cartelle / viewer
const FOLDER_ICON_SRC = 'img/ui/folder-sfoglia.png';
const VIEWER_ICON_SRC = FOLDER_ICON_SRC;

/* ===== Progetti / Cartelle ===== */
const projects = [
  { id:'ritratti',     title:'Ritratti',     slug:'jamesbeghelli/ritratti',     icon:FOLDER_ICON_SRC, desc:'Serie di ritratti — volti, luci, texture.', items:['img/ritratti/001.jpg','img/ritratti/002.jpg','img/ritratti/003.jpg'] },
  { id:'zonzo',        title:'Zonzo',        slug:'jamesbeghelli/zonzo',        icon:FOLDER_ICON_SRC, desc:'Camminate e scatti in giro, urban roaming.', items:['img/zonzo/001.jpg','img/zonzo/002.jpg','img/zonzo/003.jpg'] },
  { id:'moda-random',  title:'Moda — Random',slug:'jamesbeghelli/moda-random',  icon:FOLDER_ICON_SRC, desc:'Shooting moda sparsi, backstage e prove.',    items:['img/moda-random/001.jpg','img/moda-random/002.jpg','img/moda-random/003.jpg'] },
  { id:'bdbaggies',    title:'BDBaggies',    slug:'jamesbeghelli/bdbaggies',    icon:FOLDER_ICON_SRC, desc:'Capsule / collab BDBaggies.',                items:['img/bdbaggies/001.jpg','img/bdbaggies/002.jpg','img/bdbaggies/003.jpg'] },
  { id:'rapper',       title:'Rapper',       slug:'jamesbeghelli/rapper',       icon:FOLDER_ICON_SRC, desc:'Ritratti, backstage e live set di rapper.',  items:['img/rapper/001.jpg','img/rapper/002.jpg','img/rapper/003.jpg'] }
];

/* ===== BIO content ===== */
const BIO_TEXT = `
Bologna, 20 Marzo 1989

Vive e lavora a Bologna

Andrea Baraldi, in arte James Beghelli, ha iniziato la sua produzione creativa frequentando il corso di Decorazione, la materia in cui ha ottenuto la laurea presso l’Accademia di Belle Arti di Bologna. Fin dall’inizio della sua attività ha tentato di riunire le competenze possedute in differenti ambiti: illustrazione, stampa e fotografia, così da sviluppare un profilo artistico poliedrico e capace di operare con strumenti diversi. 

Il suo stile è funzionale alle discipline che padroneggia ed elementi di ognuna si possono riscoprire in tutte le sue creazioni artistiche. Da sempre ama giocare con gli “errori” di realizzazione, perché in essi ritrova la vitalità e il carattere che contraddistingue l’opera nella sua realizzazione finale. 

Nutre un forte interesse per la fotografia analogica che cerca di fondere con l’utilizzo degli strumenti digitali per creare un legame tra passato e presente.

Contatti

jamesbeghelli33@gmail.com

instagram/jamesbeghelli
`.trim();

/* ===== Helpers ===== */
const rand = (min,max)=> Math.random()*(max-min)+min;
const rint = (min,max)=> Math.floor(rand(min,max));
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

function fitRect(nw, nh, vw, vh, mode='contain'){
  const ar = nw/nh, varr = vw/vh;
  const fullW = (mode==='contain') ? (ar > varr) : (ar < varr);
  if(fullW){ const w = vw, h = vw/ar; return { x:0, y:(vh-h)/2, w, h }; }
  const h = vh, w = vh*ar; return { x:(vw-w)/2, y:0, w, h };
}

/* ===== Cometa: dimensioni + layer on-top ===== */
const COMET_SIZE = { min: 100, max: 200 };

// Layer effetti sempre sopra a tutto
const FX_Z = 2147483000;
function fxAppend(el){
  let layer = document.getElementById('fx-layer');
  if(!layer){
    layer = document.createElement('div');
    layer.id = 'fx-layer';
    Object.assign(layer.style, {
      position:'fixed', inset:'0', overflow:'visible',
      pointerEvents:'none', zIndex:String(FX_Z)
    });
    document.body.appendChild(layer);
  } else {
    if(getComputedStyle(layer).position !== 'fixed') layer.style.position = 'fixed';
    const z = parseInt(getComputedStyle(layer).zIndex || '0', 10);
    if(isNaN(z) || z<FX_Z) layer.style.zIndex = String(FX_Z);
    layer.style.pointerEvents = 'none';
    layer.style.overflow = 'visible';
  }
  el.style.zIndex = String(FX_Z + 1);
  layer.appendChild(el);
}

/* ===== DOM ===== */
const viewport   = document.getElementById('viewport');
const vpImg      = document.getElementById('vpImg');
const btnBio     = document.getElementById('btn-bio');
const bioTpl     = document.getElementById('bio-template');

const btnSaluta  = document.getElementById('btn-saluta');
const toolReload = document.getElementById('tool-reload');
const toolBack   = document.getElementById('tool-back');
const toolFwd    = document.getElementById('tool-forward');
const logBody    = document.getElementById('logBody');
const browserEl  = document.querySelector('.browser');
const titlebarEl = document.querySelector('.titlebar');
const desktopEl  = document.getElementById('desktop');
const winTpl     = document.getElementById('win-template');

const mainBtnClose = document.querySelector('.browser .tb-controls [data-action="close"]');
const mainBtnMin   = document.querySelector('.browser .tb-controls [data-action="min"]');
const mainBtnMax   = document.querySelector('.browser .tb-controls [data-action="max"]');

/* ===== Stato viewer principale ===== */
const state = { index:0, src:null, natW:0, natH:0 };

/* ===== Log laterale stile Netscape ===== */
function addLine(text){
  if(!logBody) return;
  const line = document.createElement('div');
  line.className = 'line';
  line.textContent = text;
  logBody.appendChild(line);
  logBody.scrollTop = logBody.scrollHeight;
}

/* ===== Init viewer ===== */
function setInitialBackground(){
  if(!images.length || !vpImg) return;
  state.index = 0;
  const src = images[state.index];
  const img = new Image();
  img.src = src;
  img.onload = ()=>{
    state.src  = src;
    state.natW = img.naturalWidth;
    state.natH = img.naturalHeight;
    vpImg.src  = src; // object-fit: contain => niente deformazione
    addLine('Benvenuti nello spazio di James Beghelli');
    addLine('Navigator 2.0 pronto.');
  };
}

/* ===== Effetto “sgretolamento” ===== */
const COLS = 20, ROWS = 12;
const TILE_DUR = 420;     // ms
const ROW_DELAY = 18;     // ms
const STEP_COUNT = 10;    // steps()

function changeImageTo(nextIndex){
  if(!images.length || !viewport || !vpImg) return;

  const prev = { src: state.src, natW: state.natW, natH: state.natH };
  const nextSrc = images[(nextIndex + images.length) % images.length];

  if(!prev.src){
    const pre = new Image();
    pre.src = nextSrc;
    pre.onload = ()=>{
      state.index = (nextIndex + images.length) % images.length;
      state.src = nextSrc; state.natW = pre.naturalWidth; state.natH = pre.naturalHeight;
      vpImg.src = nextSrc;
    };
    return;
  }

  const preload = new Image();
  preload.src = nextSrc;
  preload.onload = ()=>{
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const rect = fitRect(prev.natW, prev.natH, vw, vh, FIT_MODE);

    vpImg.src = nextSrc;

    state.index = (nextIndex + images.length) % images.length;
    state.src   = nextSrc;
    state.natW  = preload.naturalWidth;
    state.natH  = preload.naturalHeight;

    const wrap = document.createElement('div');
    wrap.className = 'crumble';
    viewport.appendChild(wrap);

    const tw = Math.ceil(rect.w / COLS);
    const th = Math.ceil(rect.h / ROWS);

    for(let r=0; r<ROWS; r++){
      for(let c=0; c<COLS; c++){
        const sx = c*tw, sy = r*th;
        const px = rect.x + sx, py = rect.y + sy;

        const tile = document.createElement('div');
        tile.className = 'crumb';
        Object.assign(tile.style, {
          width: tw+'px', height: th+'px', left: px+'px', top: py+'px',
          backgroundImage: `url('${prev.src}')`,
          backgroundSize: `${rect.w}px ${rect.h}px`,
          backgroundPosition: `-${sx}px -${sy}px`
        });
        wrap.appendChild(tile);

        const dy = vh + th + 60;
        const delay = r * ROW_DELAY;

        tile.animate(
          [{ transform:`translate(0,0)` }, { transform:`translate(0,${dy}px)` }],
          { duration: TILE_DUR, delay, easing:`steps(${STEP_COUNT}, end)`, fill:'forwards' }
        );
      }
    }

    const total = TILE_DUR + ROW_DELAY*(ROWS-1) + 20;
    setTimeout(()=>{ wrap.remove(); addLine('Operazione completata.'); }, total);
    addLine(`Caricamento: ${nextSrc.split('/').pop()} ...`);
  };
}

function nextImage(){ changeImageTo(state.index + 1); }
function prevImage(){ changeImageTo(state.index - 1); }

/* ===== Toolbar / Pulsanti viewer ===== */
toolReload?.addEventListener('click', nextImage);   // ↻ = avanti
toolBack  ?.addEventListener('click', prevImage);   // ◀
toolFwd   ?.addEventListener('click', nextImage);   // ▶

/* ===== Toast ===== */
function showToast(text='Ciao!'){
  const node = document.createElement('div');
  node.className = 'toast';
  node.innerHTML = `<span class="led"></span><span>${text}</span>`;
  document.body.appendChild(node);
  setTimeout(()=>{
    node.style.animation = 'toast-out .1s steps(3,end) forwards';
    node.addEventListener('animationend', ()=> node.remove(), { once:true });
  }, 1400);
}

/* ===== Cometa: 1 sticker, traiettoria sempre visibile ===== */
btnSaluta?.addEventListener('click', ()=>{
  addLine('Ciao');
  showToast("Ciao! Cat's online 🐈");
  cometWave(1); // UNA sola cometa
});

function cometWave(count=1){ for(let i=0;i<count;i++) createCometRandom(); }

function createCometRandom(){
  const w = innerWidth, h = innerHeight;
  const size = rint(COMET_SIZE.min, COMET_SIZE.max);
  const PAD  = Math.max(32, Math.ceil(size * 0.6));
  const OFF  = 140;

  // rotta orizzontale o verticale dentro la banda visibile
  let start, end;
  if (Math.random() < 0.5) {
    const y = rint(PAD, h - PAD);
    if (Math.random() < 0.5) { start = {x:-OFF,  y}; end = {x:w+OFF, y}; }
    else                     { start = {x:w+OFF, y}; end = {x:-OFF,  y}; }
  } else {
    const x = rint(PAD, w - PAD);
    if (Math.random() < 0.5) { start = {x, y:-OFF};  end = {x, y:h+OFF}; }
    else                     { start = {x, y:h+OFF}; end = {x, y:-OFF};  }
  }

  const dx = end.x - start.x, dy = end.y - start.y;
  const dist  = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180/Math.PI;

  const wrap = document.createElement('div');
  wrap.className = 'comet';
  wrap.style.position = 'fixed';
  wrap.style.left = start.x + 'px';
  wrap.style.top  = start.y + 'px';
  wrap.style.transform = `translate3d(-50%,-50%,0) rotate(${angle}deg)`;
  wrap.style.willChange = 'transform';
  wrap.style.pointerEvents = 'none';

  const img = document.createElement('img');
  img.src = stickers[rint(0, stickers.length)];
  img.style.width  = size + 'px';
  img.style.height = size + 'px';

  // rotazione continua
  img.animate(
    [{ transform:'rotate(0deg)' }, { transform:'rotate(360deg)' }],
    { duration:600, iterations:Infinity, easing:'linear' }
  );

  wrap.appendChild(img);
  fxAppend(wrap); // sempre on-top

  // velocità costante per pixel (lineare)
  const PX_PER_MS = 2.8;
  const dur = Math.max(320, Math.min(900, Math.round(dist / PX_PER_MS)));

  wrap.animate(
    [
      { transform:`translate3d(-50%,-50%,0) rotate(${angle}deg) translate(0,0)` },
      { transform:`translate3d(-50%,-50%,0) rotate(${angle}deg) translate(${dx}px,${dy}px)` }
    ],
    { duration:dur, easing:'linear', fill:'forwards' }
  ).onfinish = ()=> wrap.remove();
}

/* ===== Main window: drag (hold→drag→release) ===== */
// Forza position:fixed nel caso CSS vecchio sia in cache
(function enforceFixed(){
  if(browserEl && getComputedStyle(browserEl).position !== 'fixed'){
    browserEl.style.position = 'fixed';
    browserEl.style.left = '0px';
    browserEl.style.top  = '0px';
    console.info('[JAMES] Patched .browser to position:fixed (cache fallback).');
  }
})();

function centerBrowser(){
  if(!browserEl) return;
  const rect = browserEl.getBoundingClientRect();
  const x = Math.round((window.innerWidth  - rect.width)  / 2);
  const y = Math.round((window.innerHeight - rect.height) / 2);
  browserEl.style.left = clamp(x, 0, Math.max(0, window.innerWidth  - rect.width)) + 'px';
  browserEl.style.top  = clamp(y, 0, Math.max(0, window.innerHeight - rect.height)) + 'px';
}
function ensureInBounds(){
  if(!browserEl) return;
  const rect = browserEl.getBoundingClientRect();
  const maxX = Math.max(0, window.innerWidth  - rect.width);
  const maxY = Math.max(0, window.innerHeight - rect.height);
  browserEl.style.left = clamp(rect.left, 0, maxX) + 'px';
  browserEl.style.top  = clamp(rect.top,  0, maxY) + 'px';
}
const dragMain = { active:false, pointerId:null, dx:0, dy:0 };
function isInteractiveTarget(t){ return !!t.closest('.tb-controls, .tool-btn, .addr, .addr *'); }

function onPointerDownMain(e){
  if(e.button !== 0 || !titlebarEl || !browserEl) return;
  if(isInteractiveTarget(e.target)) return;
  const rect = browserEl.getBoundingClientRect();
  dragMain.active = true;
  dragMain.pointerId = e.pointerId;
  dragMain.dx = e.clientX - rect.left;
  dragMain.dy = e.clientY - rect.top;
  titlebarEl.classList.add('dragging');
  browserEl.classList.add('dragging');
  window.addEventListener('pointermove', onPointerMoveMain);
  window.addEventListener('pointerup',   onPointerUpMain, { once:true });
  window.addEventListener('pointercancel', onPointerUpMain, { once:true });
}
function onPointerMoveMain(e){
  if(!dragMain.active || e.pointerId !== dragMain.pointerId || !browserEl) return;
  const rect = browserEl.getBoundingClientRect();
  let x = e.clientX - dragMain.dx;
  let y = e.clientY - dragMain.dy;
  x = clamp(x, 0, Math.max(0, window.innerWidth  - rect.width));
  y = clamp(y, 0, Math.max(0, window.innerHeight - rect.height));
  browserEl.style.left = x + 'px';
  browserEl.style.top  = y + 'px';
}
function onPointerUpMain(e){
  if(e && e.pointerId !== dragMain.pointerId) return;
  dragMain.active = false;
  titlebarEl?.classList.remove('dragging');
  browserEl?.classList.remove('dragging');
  window.removeEventListener('pointermove', onPointerMoveMain);
}
titlebarEl?.addEventListener('pointerdown', onPointerDownMain);
window.addEventListener('resize', ensureInBounds);
titlebarEl?.addEventListener('dblclick', centerBrowser);

// Porta in primo piano quando clicchi QUALSIASI punto visibile del Viewer
browserEl?.addEventListener('mousedown', () => bringToFront(browserEl));

// X/min/max della finestra principale (X nasconde, riapribile da icona Viewer)
function openMainViewer(){
  const main = document.querySelector('.browser');
  if(!main){ showToast('Viewer non disponibile.'); return; }
  main.style.display = '';
  ensureInBounds();
  bringToFront(main);
}
mainBtnClose?.addEventListener('click', (e)=>{
  e.stopPropagation();
  if (browserEl){
    browserEl.style.display = 'none';
    showToast('Viewer nascosto – usa l’icona "Viewer" per riaprirlo');
  }
});
mainBtnMin?.addEventListener('click', (e)=>{
  e.stopPropagation();
  browserEl.dataset.minimized = browserEl.dataset.minimized ? '' : '1';
  browserEl.style.height = browserEl.dataset.minimized ? '44px' : 'min(78vh,760px)';
});
mainBtnMax?.addEventListener('click', (e)=>{
  e.stopPropagation();
  if(browserEl.dataset.maximized){
    browserEl.dataset.maximized = '';
    browserEl.style.left='0px'; browserEl.style.top='0px';
    browserEl.style.width='min(92vw,1100px)'; browserEl.style.height='min(78vh,760px)';
    centerBrowser();
  }else{
    browserEl.dataset.maximized = '1';
    browserEl.style.left='0px'; browserEl.style.top='0px';
    browserEl.style.width='100vw'; browserEl.style.height='100vh';
  }
});

/* ===== Desktop: icone-cartella + icona Viewer + finestre progetto ===== */
let zTop = 20; // stacking delle finestre

function renderDesktop(){
  if(!desktopEl) return;
  desktopEl.innerHTML = '';

  // --- Icona Viewer ---
  const viewerIcon = document.createElement('div');
  viewerIcon.className = 'icon';
  viewerIcon.tabIndex = 0;
  viewerIcon.innerHTML = `
    <img class="folder-icon" src="${VIEWER_ICON_SRC}" alt="Viewer">
    <div class="label">Viewer</div>
  `;
  desktopEl.appendChild(viewerIcon);

  viewerIcon.addEventListener('click', ()=>{
    desktopEl.querySelectorAll('.icon.selected').forEach(i=>i.classList.remove('selected'));
    viewerIcon.classList.add('selected');
  });
  viewerIcon.addEventListener('dblclick', openMainViewer);
  viewerIcon.addEventListener('keydown', (e)=>{ if(e.key==='Enter') openMainViewer(); });
  let lastTapV = 0;
  viewerIcon.addEventListener('pointerup', (e)=>{
    if(e.pointerType !== 'touch') return;
    const now = Date.now();
    if (now - lastTapV < 300) { openMainViewer(); lastTapV = 0; } else { lastTapV = now; }
  });

  // --- Icone Progetti ---
  projects.forEach(p=>{
    const icon = document.createElement('div');
    icon.className = 'icon';
    icon.tabIndex = 0;
    icon.dataset.pid = p.id;

    icon.innerHTML = `
      <img class="folder-icon" src="${FOLDER_ICON_SRC}" alt="Cartella">
      <div class="label">${p.title}</div>
    `;
    desktopEl.appendChild(icon);

    // fallback emoji se l'immagine non esiste/carica
    const imgEl = icon.querySelector('.folder-icon');
    imgEl.addEventListener('error', ()=>{
      const glyph = document.createElement('div');
      glyph.style.fontSize = '36px';
      glyph.style.lineHeight = '36px';
      glyph.textContent = '📁';
      imgEl.replaceWith(glyph);
    });

    icon.addEventListener('click', ()=>{
      desktopEl.querySelectorAll('.icon.selected').forEach(i=>i.classList.remove('selected'));
      icon.classList.add('selected');
    });
    icon.addEventListener('dblclick', ()=> openProjectById(p.id));
    icon.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') openProjectById(p.id); });

    // Touch: double-tap per aprire
    let lastTap = 0;
    icon.addEventListener('pointerup', (e)=>{
      if(e.pointerType !== 'touch') return;
      const now = Date.now();
      if (now - lastTap < 300) { openProjectById(p.id); lastTap = 0; } else { lastTap = now; }
    });
  });
}

function bringToFront(win){
  document.querySelectorAll('.win.active, .browser.active').forEach(w=>w.classList.remove('active'));
  win.classList.add('active');
  win.style.zIndex = ++zTop;
}

/* ===== Drag per finestre progetto ===== */
function attachDrag(win){
  const bar = win.querySelector('.titlebar');
  if(!bar) return;
  const drag = { active:false, pointerId:null, dx:0, dy:0 };
  function down(e){
    if(e.button!==0) return;
    bringToFront(win);
    const rect = win.getBoundingClientRect();
    drag.active = true; drag.pointerId = e.pointerId;
    drag.dx = e.clientX - rect.left; drag.dy = e.clientY - rect.top;
    bar.classList.add('dragging'); win.classList.add('dragging');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup',   up, { once:true });
    window.addEventListener('pointercancel', up, { once:true });
  }
  function move(e){
    if(!drag.active || e.pointerId!==drag.pointerId) return;
    const rect = win.getBoundingClientRect();
    const maxX = Math.max(0, window.innerWidth  - rect.width);
    const maxY = Math.max(0, window.innerHeight - rect.height);
    let x = e.clientX - drag.dx; let y = e.clientY - drag.dy;
    x = Math.max(0, Math.min(maxX, x)); y = Math.max(0, Math.min(maxY, y));
    win.style.left = x + 'px'; win.style.top = y + 'px';
  }
  function up(e){
    if(e && e.pointerId!==drag.pointerId) return;
    drag.active=false; bar.classList.remove('dragging'); win.classList.remove('dragging');
    window.removeEventListener('pointermove', move);
  }
  bar.addEventListener('pointerdown', down);
}

/* ===== Resize (stringere le finestre) ===== */
function attachResize(win, minW=360, minH=240){
  if(win.__resizable) return; // evita doppio setup
  win.__resizable = true;

  const handles = {
    e : Object.assign(document.createElement('div'), { className:'rs-e' }),
    s : Object.assign(document.createElement('div'), { className:'rs-s' }),
    se: Object.assign(document.createElement('div'), { className:'rs-se' })
  };
  // stile inline per evitare dipendenze CSS
  Object.assign(handles.e.style,  { position:'absolute', top:0, right:0, width:'8px',  height:'100%', cursor:'e-resize' , zIndex:1 });
  Object.assign(handles.s.style,  { position:'absolute', left:0, bottom:0, width:'100%', height:'8px', cursor:'s-resize' , zIndex:1 });
  Object.assign(handles.se.style, { position:'absolute', right:0, bottom:0, width:'14px', height:'14px', cursor:'se-resize', zIndex:2 });

  win.appendChild(handles.e); win.appendChild(handles.s); win.appendChild(handles.se);

  const rz = { active:false, pointerId:null, startX:0, startY:0, startW:0, startH:0, dir:'' };

  function down(dir){
    return (e)=>{
      if(e.button !== 0) return;
      if(win.dataset.maximized) return; // non ridimensionare da max
      bringToFront(win);
      const rect = win.getBoundingClientRect();
      rz.active = true; rz.pointerId = e.pointerId; rz.dir = dir;
      rz.startX = e.clientX; rz.startY = e.clientY;
      rz.startW = rect.width; rz.startH = rect.height;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup',   up, { once:true });
      window.addEventListener('pointercancel', up, { once:true });
      e.preventDefault();
    };
  }
  function move(e){
    if(!rz.active || e.pointerId !== rz.pointerId) return;
    let w = rz.startW, h = rz.startH;
    if(rz.dir.includes('e')) w = rz.startW + (e.clientX - rz.startX);
    if(rz.dir.includes('s')) h = rz.startH + (e.clientY - rz.startY);

    const rect = win.getBoundingClientRect();
    const maxW = window.innerWidth  - rect.left;
    const maxH = window.innerHeight - rect.top;
    w = clamp(w, minW, Math.max(minW, maxW));
    h = clamp(h, minH, Math.max(minH, maxH));

    win.style.width  = w + 'px';
    win.style.height = h + 'px';
  }
  function up(e){
    if(e && e.pointerId !== rz.pointerId) return;
    rz.active = false;
    window.removeEventListener('pointermove', move);
  }

  handles.e.addEventListener('pointerdown',  down('e'));
  handles.s.addEventListener('pointerdown',  down('s'));
  handles.se.addEventListener('pointerdown', down('se'));
}

function openProjectById(pid){
  const p = projects.find(x=>x.id===pid);
  if(!p || !winTpl) return;

  // Se esiste già, porta davanti e basta
  const existing = document.querySelector(`.win[data-pid="${pid}"]`);
  if (existing) { bringToFront(existing); return; }

  const node = winTpl.content.firstElementChild.cloneNode(true);
  node.dataset.pid = p.id;
  node.style.left = (24 + Math.random()*60) + 'px';
  node.style.top  = (24 + Math.random()*40) + 'px';
  node.style.zIndex = ++zTop;
  node.classList.add('active');

  if(getComputedStyle(node).position !== 'fixed'){
    node.style.position = 'fixed';
  }

  // Fill contenuti
  node.querySelector('[data-title]').textContent = p.title;
  node.querySelector('[data-slug]').textContent  = p.slug;
  const imgEl = node.querySelector('[data-img]');
  const descEl= node.querySelector('[data-desc]');

  node.__state = { idx:0, items:p.items.slice(), project:p };

  function show(i){
    const s = node.__state;
    s.idx = (i + s.items.length) % s.items.length;
    const src = s.items[s.idx];
    const pre = new Image();
    pre.src = src;
    pre.onload = ()=>{
      imgEl.src = src; // object-fit: contain evita deformazioni
      descEl.textContent = p.desc || '';
    };
  }
  show(0);

  // Navigazione interna
  node.querySelector('[data-prev]').addEventListener('click', ()=> show(node.__state.idx - 1));
  node.querySelector('[data-next]').addEventListener('click', ()=> show(node.__state.idx + 1));

  // Bottoni finestra
  node.addEventListener('mousedown', ()=> bringToFront(node));
  node.querySelector('[data-action="close"]').addEventListener('click', ()=> node.remove());
  node.querySelector('[data-action="min"]').addEventListener('click', ()=>{
    node.dataset.minimized = node.dataset.minimized ? '' : '1';
    node.style.height = node.dataset.minimized ? '44px' : 'min(65vh,620px)';
  });
  node.querySelector('[data-action="max"]').addEventListener('click', ()=>{
    if(node.dataset.maximized){
      node.dataset.maximized = '';
      node.style.left='20px'; node.style.top='20px';
      node.style.width='min(70vw,900px)'; node.style.height='min(65vh,620px)';
    }else{
      node.dataset.maximized = '1';
      node.style.left='0px'; node.style.top='0px';
      node.style.width='100vw'; node.style.height='100vh';
    }
  });

  attachDrag(node);
  attachResize(node, 320, 220); // finestre progetto stringibili
  document.body.appendChild(node);
}

/* ===== Bio popup ===== */
function openBio(){
  // se esiste già, porta davanti
  const existing = document.querySelector('.win[data-pid="bio"]');
  if (existing){ bringToFront(existing); return; }

  const node = bioTpl.content.firstElementChild.cloneNode(true);
  node.dataset.pid = 'bio';
  node.style.left = (40 + Math.random()*40) + 'px';
  node.style.top  = (40 + Math.random()*30) + 'px';
  node.style.zIndex = ++zTop;
  node.classList.add('active');

  // riempi testo
  const body = node.querySelector('[data-bio]');
  body.innerHTML = BIO_TEXT
    .replace(/\n/g,'<br>')
    .replace(/https?:\/\/\S+/g, url => `<a href="${url}" target="_blank">${url}</a>`);
  node.style.width = 'min(60vw,700px)';
  node.style.height = 'min(55vh,520px)';

  node.addEventListener('mousedown', ()=> bringToFront(node));
  node.querySelector('[data-action="close"]').addEventListener('click', ()=> node.remove());
  node.querySelector('[data-action="min"]').addEventListener('click', ()=>{
    node.dataset.minimized = node.dataset.minimized ? '' : '1';
    node.style.height = node.dataset.minimized ? '44px' : 'min(65vh,620px)';
  });
  node.querySelector('[data-action="max"]').addEventListener('click', ()=>{
    if(node.dataset.maximized){
      node.dataset.maximized = '';
      node.style.left='20px'; node.style.top='20px';
      node.style.width='min(70vw,900px)'; node.style.height='min(65vh,620px)';
    }else{
      node.dataset.maximized = '1';
      node.style.left='0px'; node.style.top='0px';
      node.style.width='100vw'; node.style.height='100vh';
    }
  });

  attachDrag(node);
  attachResize(node, 360, 260); // bio stringibile
  document.body.appendChild(node);
}

// click sul bottone "Bio"
btnBio?.addEventListener('click', openBio);

/* ===== Wallpaper runtime (con preload) ===== */
function setDesktopWallpaper(src, { mode='cover', position='center', repeat='no-repeat' } = {}){
  if(!desktopEl) return;

  // layer desktop a schermo intero
  const cs = getComputedStyle(desktopEl);
  if(cs.position !== 'fixed') desktopEl.style.position = 'fixed';
  desktopEl.style.inset = '0';
  desktopEl.style.zIndex = '0';          // sotto le finestre
  desktopEl.style.pointerEvents = 'auto';// clic sulle icone

  const img = new Image();
  img.src = src;
  img.onload = ()=>{
    desktopEl.style.backgroundImage = `url("${src}")`;
    desktopEl.style.backgroundPosition = position;
    desktopEl.style.backgroundRepeat = repeat;

    if(mode === 'tile'){
      desktopEl.style.backgroundSize = 'auto';
      desktopEl.style.imageRendering = 'pixelated';
    } else if(mode === 'contain'){
      desktopEl.style.backgroundSize = 'contain';
      desktopEl.style.imageRendering = '';
    } else if(mode === 'stretch'){
      desktopEl.style.backgroundSize = '100% 100%';
      desktopEl.style.imageRendering = '';
    } else { // cover
      desktopEl.style.backgroundSize = 'cover';
      desktopEl.style.imageRendering = '';
    }
  };
  img.onerror = ()=>{
    console.warn('[Wallpaper] errore caricamento:', src);
    desktopEl.style.backgroundImage = '';
    desktopEl.style.backgroundColor = '#102030';
  };
}

function nextWallpaper(opts){
  if(!WALLPAPERS.length) return;
  wpIndex = (wpIndex + 1) % WALLPAPERS.length;
  setDesktopWallpaper(WALLPAPERS[wpIndex], opts);
}

/* ===== Avvio ===== */
window.addEventListener('load', ()=>{
  centerBrowser();
  setInitialBackground();
  renderDesktop();
  attachResize(browserEl, 500, 360); // viewer principale stringibile

  // Wallpaper iniziale in TILE (pattern): cambia src se usi un pattern piccolo tipo 64–128px
  if (WALLPAPERS.length) setDesktopWallpaper(WALLPAPERS[0], { mode:'tile', repeat:'repeat', position:'top left' });
});

/* ===== Ripristina menu destro (eventuale vecchio blocco) ===== */
document.addEventListener('contextmenu', function restore(e){
  // non preveniamo il default
}, { capture:true });
