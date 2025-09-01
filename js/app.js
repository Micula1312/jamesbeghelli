/* =========================================================
   James Beghelli — App.js (’90s UI)
   ---------------------------------------------------------
   Sezioni:
   01) Versione & Costanti percorso
   02) Config: immagini viewer, wallpapers, stickers, progetti, bio
   03) Helpers generici
   04) Layer effetti (fx-layer) sempre on-top
   05) Riferimenti DOM
   06) Viewer principale (init, sgretolamento, toolbar)
   07) Toast
   08) Cometa (1 sticker) — preload + traiettoria sempre visibile
   09) Finestra principale: drag & bounds
   10) Desktop: icone + gestione finestre
   11) Resize (stringere finestre)
   12) Finestre progetto
   13) Finestra Bio
   14) Wallpaper runtime (tile & cover) + pulsante switch
   15) Avvio
   16) Ripristino menu destro
   --------------------------------------------------------- */

/* ========== 01) Versione & Costanti percorso ========== */
const JB_VERSION = '2025-09-01-06';
console.info('[JAMES] app.js version', JB_VERSION);

/* ========== 02) Config & Assets ========== */
const FIT_MODE = 'contain'; // viewer: no deformazione

// Immagini del viewer (loop sequenziale)
const images = [
  'img/image1.jpeg','img/image2.jpeg','img/image4.jpeg','img/image5.jpeg',
  'img/image6.jpeg','img/image7.jpeg','img/image8.jpeg','img/image9.jpeg'
];

// Wallpapers: percorsi dentro /img/wallpapers come richiesto
/* ===== Wallpapers (desktop) ===== */
const WALLPAPERS = [
  { src: 'img/wallpapers/wallpaper1.jpg', opts: { mode:'cover', position:'center', repeat:'no-repeat' } },
  { src: 'img/wallpapers/wallpaper2.jpeg', opts: { mode:'cover', position:'center', repeat:'no-repeat' } },
];
let wpIndex = 0;

// Sticker/cometa (unico) usato dal pulsante "Saluta"
const stickers = ['img/stickers/sticker.png'];

// Icone cartelle / viewer
const FOLDER_ICON_SRC = 'img/ui/folder-sfoglia.png';
const VIEWER_ICON_SRC = 'img/ui/viewer-phone.png'; // 📱 icona viewer

// Progetti / Cartelle
const projects = [
  { id:'ritratti',     title:'Ritratti',     slug:'jamesbeghelli/ritratti',     icon:FOLDER_ICON_SRC, desc:'Serie di ritratti — volti, luci, texture.', items:['img/ritratti/001.jpg','img/ritratti/002.jpg','img/ritratti/003.jpg'] },
  { id:'zonzo',        title:'Zonzo',        slug:'jamesbeghelli/zonzo',        icon:FOLDER_ICON_SRC, desc:'Camminate e scatti in giro, urban roaming.', items:['img/zonzo/001.jpg','img/zonzo/002.jpg','img/zonzo/003.jpg'] },
  { id:'moda-random',  title:'Moda — Random',slug:'jamesbeghelli/moda-random',  icon:FOLDER_ICON_SRC, desc:'Shooting moda sparsi, backstage e prove.',    items:['img/moda-random/001.jpg','img/moda-random/002.jpg','img/moda-random/003.jpg'] },
  { id:'bdbaggies',    title:'BDBaggies',    slug:'jamesbeghelli/bdbaggies',    icon:FOLDER_ICON_SRC, desc:'Capsule / collab BDBaggies.',                items:['img/bdbaggies/001.jpg','img/bdbaggies/002.jpg','img/bdbaggies/003.jpg'] },
  { id:'rapper',       title:'Rapper',       slug:'jamesbeghelli/rapper',       icon:FOLDER_ICON_SRC, desc:'Ritratti, backstage e live set di rapper.',  items:['img/rapper/001.jpg','img/rapper/002.jpg','img/rapper/003.jpg'] }
];

// BIO
const BIO_TEXT = `
Bologna, 20 Marzo 1989

Vive e lavora a Bologna

Andrea Baraldi, in arte James Beghelli, ha iniziato la sua produzione creativa frequentando il corso di Decorazione, la materia in cui ha ottenuto la laurea presso l’Accademia di Belle Arti di Bologna. Fin dall’inizio della sua attività ha tentato di riunire le competenze possedute in differenti ambiti: illustrazione, stampa e fotografia, così da sviluppare un profilo artistico poliedrico e capace di operare con strumenti diversi. 

Il suo stile è funzionale alle discipline che padroneggia ed elementi di ognuna si possono riscoprire in tutte le sue creazioni artistiche. Da sempre ama giocare con gli “errori” di realizzazione, perché in essi ritrova la vitalità e il carattere che contraddistingue l’opera nella sua realizzazione finale. 

Nutre un forte interesse per la fotografia analogica che cerca di fondere con l’utilizzo degli strumenti digitali per creare un legame tra passato e presente.

Contatti

jamesbeghelli33@gmail.com

instagram: @jamesbeghelli
`.trim();

/* ========== 03) Helpers generici ========== */
const rand = (min,max)=> Math.random()*(max-min)+min;
const rint = (min,max)=> Math.floor(rand(min,max));
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function fitRect(nw, nh, vw, vh, mode='contain'){
  const ar = nw/nh, varr = vw/vh;
  const fullW = (mode==='contain') ? (ar > varr) : (ar < varr);
  if(fullW){ const w = vw, h = vw/ar; return { x:0, y:(vh-h)/2, w, h }; }
  const h = vh, w = vh*ar; return { x:(vw-w)/2, y:0, w, h };
}
function updateViewerTitle(){
  if (!viewerTitleEl || !viewerSlugEl) return;
  const full = state.src || images[state.index] || '';
  const tail = full.split('/').filter(Boolean).pop() || full;

  viewerTitleEl.textContent = 'Viewer';
  viewerTitleEl.title = 'Viewer';

  viewerSlugEl.textContent = tail;   // solo la coda (es. image5.jpeg)
  viewerSlugEl.title = full;         // tooltip: path completo
}

/* ========== 04) Layer effetti (fx-layer) sempre on-top ========== */
const COMET_SIZE = { min: 100, max: 200 };
const FX_Z = 2147483647;
const DEBUG_COMET = false; // attiva per mostrare la traiettoria

function fxAppend(el){
  let layer = document.getElementById('fx-layer');
  if(!layer){
    layer = document.createElement('div');
    layer.id = 'fx-layer';
    Object.assign(layer.style, {
      position:'fixed', inset:'0', overflow:'visible',
      pointerEvents:'none', zIndex:String(FX_Z), isolation:'isolate'
    });
    document.body.appendChild(layer);
  }
  // mantieni fx-layer sempre ultimo nel body (sopra a tutto)
  if (layer !== document.body.lastElementChild) {
    document.body.appendChild(layer);
  }
  el.style.zIndex = String(FX_Z + 1);
  layer.appendChild(el);
}

/* ========== 05) Riferimenti DOM ========== */
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
const viewerTitleEl = document.querySelector('.browser [data-title]');
const viewerSlugEl  = document.querySelector('.browser [data-slug]');

/* ========== 06) Viewer principale (init, sgretolamento, toolbar) ========== */
const state = { index:0, src:null, natW:0, natH:0 };

function addLine(text){
  if(!logBody) return;
  const line = document.createElement('div');
  line.className = 'line';
  line.textContent = text;
  logBody.appendChild(line);
  logBody.scrollTop = logBody.scrollHeight;
}

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
    updateViewerTitle();
    addLine('Welcome in a baba random space');
    addLine('Navigator 2.0 pronto.');
  };
}

// Effetto “sgretolamento”
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
    updateViewerTitle();
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

// Toolbar viewer
toolReload?.addEventListener('click', nextImage);   // ↻ = avanti
toolBack  ?.addEventListener('click', prevImage);   // ◀
toolFwd   ?.addEventListener('click', nextImage);   // ▶

/* ========== 07) Toast ========== */
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

/* ========== 08) Cometa (1 sticker) — preload + traiettoria visibile ========== */
const STICKER_IMGS = [];
function preloadStickers(){
  STICKER_IMGS.length = 0;
  stickers.forEach(src=>{
    const im = new Image();
    im.decoding = 'sync';
    im.loading = 'eager';
    im.src = src + '?v=' + JB_VERSION; // cache-bust soft
    STICKER_IMGS.push(im);
  });
}

btnSaluta?.addEventListener('click', ()=>{
  addLine('Un saluto da James Beghelli.');
  //showToast('Ciao! ’90s online 🤖');
  createCometRandom(); // una sola cometa per click
});

function createCometRandom(){
  const w = innerWidth, h = innerHeight;
  const cx = w/2, cy = h/2;

  // dimensione sticker
  const size = rint(COMET_SIZE.min, COMET_SIZE.max);

  // partenza fuori schermo su un lato a caso
  const OFF = Math.max(size, 140);
  const side = rint(0,4); // 0=L,1=R,2=T,3=B
  let start;
  switch(side){
    case 0: start = { x: -OFF,  y: rint(size/2, Math.max(size/2, h - size/2)) }; break;
    case 1: start = { x: w+OFF, y: rint(size/2, Math.max(size/2, h - size/2)) }; break;
    case 2: start = { x: rint(size/2, Math.max(size/2, w - size/2)), y: -OFF };  break;
    default:start = { x: rint(size/2, Math.max(size/2, w - size/2)), y: h+OFF };  break;
  }

  // dir verso il centro, poi oltre il bordo opposto (garantisce passaggio in canvas)
  let dirX = cx - start.x;
  let dirY = cy - start.y;
  const len = Math.hypot(dirX, dirY) || 1;
  dirX /= len; dirY /= len;

  // distanza dal centro al bordo in quella direzione
  const t = Math.min(
    ...(dirX > 0 ? [(w - cx)/dirX] : dirX < 0 ? [(0 - cx)/dirX] : [Infinity]),
    ...(dirY > 0 ? [(h - cy)/dirY] : dirY < 0 ? [(0 - cy)/dirY] : [Infinity])
  );
  const end = { x: cx + dirX*(t + OFF), y: cy + dirY*(t + OFF) };

  const dx = end.x - start.x, dy = end.y - start.y;
  const dist  = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180/Math.PI;

  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    position:'fixed',
    left: start.x + 'px',
    top:  start.y + 'px',
    transform: `translate3d(-50%,-50%,0) rotate(${angle}deg)`,
    willChange: 'transform',
    pointerEvents: 'none'
  });

  const img = document.createElement('img');
  img.src = (STICKER_IMGS.length ? STICKER_IMGS[rint(0, STICKER_IMGS.length)].src
                                 : stickers[rint(0, stickers.length)]);
  img.decoding = 'sync';
  img.loading  = 'eager';
  img.draggable = false;
  img.style.width  = size + 'px';
  img.style.height = size + 'px';

  // placeholder: parte comunque se l’immagine tarda
  const ph = document.createElement('div');
  Object.assign(ph.style, {
    width: size+'px', height:size+'px',
    background:'#ff0', border:'2px solid #000'
  });
  wrap.appendChild(ph);
  fxAppend(wrap);

  // animazione lineare
  const PX_PER_MS = 1;
  const dur = Math.max(360, Math.min(900, Math.round(dist / PX_PER_MS)));
  wrap.animate(
    [
      { transform:`translate3d(-50%,-50%,0) rotate(${angle}deg) translate(0,0)` },
      { transform:`translate3d(-50%,-50%,0) rotate(${angle}deg) translate(${dx}px,${dy}px)` }
    ],
    { duration:dur, easing:'linear', fill:'forwards' }
  ).onfinish = ()=> wrap.remove();

  // swap immagine + rotazione continua
  let swapped = false;
  function swapIn(){
    if (swapped) return;
    swapped = true;
    ph.replaceWith(img);
    img.animate(
      [{ transform:'rotate(0deg)' }, { transform:'rotate(360deg)' }],
      { duration:600, iterations:Infinity, easing:'linear' }
    );
  }
  if (img.complete && img.naturalWidth) {
    swapIn();
  } else {
    const fail = setTimeout(()=> swapIn(), 160);
    img.addEventListener('load',  ()=>{ clearTimeout(fail); swapIn(); }, { once:true });
    img.addEventListener('error', ()=>{ clearTimeout(fail); /* resta il placeholder */ }, { once:true });
  }
}


/* ========== 09) Finestra principale: drag & bounds ========== */
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
  bringToFront(main);
  updateViewerTitle();
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

/* ========== 10) Desktop: icone + gestione finestre ========== */
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

    // fallback: se l'immagine non c'è, mostra 📱
    const vImg = viewerIcon.querySelector('.folder-icon');
    vImg.addEventListener('error', ()=>{
    const glyph = document.createElement('div');
    glyph.style.fontSize = '36px';
    glyph.style.lineHeight = '36px';
    glyph.textContent = '📱';
    vImg.replaceWith(glyph);
    });

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

  // Icone Progetti
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

/* ========== 11) Resize (stringere finestre) ========== */
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

/* ========== 12) Finestre progetto ========== */
function openProjectById(pid){
  const p = projects.find(x => x.id === pid);
  if (!p || !winTpl) return;

  // se esiste già, porta davanti
  const existing = document.querySelector(`.win[data-pid="${pid}"]`);
  if (existing) { bringToFront(existing); return; }

  const node = winTpl.content.firstElementChild.cloneNode(true);
  node.dataset.pid = p.id;
  node.style.left = (24 + Math.random()*60) + 'px';
  node.style.top  = (24 + Math.random()*40) + 'px';
  node.style.zIndex = ++zTop;
  node.classList.add('active');
  if (getComputedStyle(node).position !== 'fixed') node.style.position = 'fixed';

  // --- fill contenuti ---
  const titleEl = node.querySelector('[data-title]');
  const slugEl  = node.querySelector('[data-slug]');
  const imgEl   = node.querySelector('[data-img]');
  const descEl  = node.querySelector('[data-desc]');

  if (titleEl) titleEl.textContent = p.title || '';
  if (titleEl) titleEl.title = p.title || '';

  if (slugEl){
    const fullSlug = p.slug || '';
    const tail = fullSlug.split('/').filter(Boolean).pop() || fullSlug;
    slugEl.textContent = tail;   // mostra solo l’ultima parte
    slugEl.title = fullSlug;     // tooltip con lo slug completo
  }

  if (descEl) descEl.textContent = p.desc || '';

  // stato locale finestra
  node.__state = { idx: 0, items: Array.isArray(p.items) ? p.items.slice() : [], project: p };

  function show(i){
    const s = node.__state;
    if (!s.items.length){
      if (imgEl){
        imgEl.removeAttribute('src');
        imgEl.alt = 'Nessuna immagine';
      }
      if (descEl && !descEl.textContent) descEl.textContent = 'Nessuna immagine disponibile.';
      return;
    }
    s.idx = (i + s.items.length) % s.items.length;
    const src = s.items[s.idx];
    const pre = new Image();
    pre.src = src;
    pre.onload = ()=> { if (imgEl) { imgEl.src = src; imgEl.alt = p.title || 'immagine'; } };
    pre.onerror = ()=> { if (descEl) descEl.textContent = 'Errore nel caricamento dell’immagine.'; };
  }
  show(0);

  // --- navigazione interna ---
  const btnPrev = node.querySelector('[data-prev]');
  const btnNext = node.querySelector('[data-next]');
  if (btnPrev) btnPrev.addEventListener('click', ()=> show(node.__state.idx - 1));
  if (btnNext) btnNext.addEventListener('click', ()=> show(node.__state.idx + 1));

  // supporto tastiera (freccia sinistra/destra, Esc per chiudere)
  node.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft')  show(node.__state.idx - 1);
    if (e.key === 'ArrowRight') show(node.__state.idx + 1);
    if (e.key === 'Escape')     node.remove();
  });

  // --- bottoni finestra ---
  node.addEventListener('mousedown', ()=> bringToFront(node));
  const btnClose = node.querySelector('[data-action="close"]');
  const btnMin   = node.querySelector('[data-action="min"]');
  const btnMax   = node.querySelector('[data-action="max"]');

  if (btnClose) btnClose.addEventListener('click', ()=> node.remove());
  if (btnMin) btnMin.addEventListener('click', ()=>{
    node.dataset.minimized = node.dataset.minimized ? '' : '1';
    node.style.height = node.dataset.minimized ? '44px' : 'min(65vh,620px)';
  });
  if (btnMax) btnMax.addEventListener('click', ()=>{
    if (node.dataset.maximized){
      node.dataset.maximized = '';
      node.style.left='20px'; node.style.top='20px';
      node.style.width='min(70vw,900px)'; node.style.height='min(65vh,620px)';
    } else {
      node.dataset.maximized = '1';
      node.style.left='0px'; node.style.top='0px';
      node.style.width='100vw'; node.style.height='100vh';
    }
  });

  attachDrag(node);
  attachResize(node, 320, 220); // finestre progetto stringibili

  document.body.appendChild(node);
  bringToFront(node);
  // focus per frecce/Esc
  node.tabIndex = -1;
  node.focus({ preventScroll: true });
}


/* ========== 13) Finestra Bio ========== */
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
btnBio?.addEventListener('click', openBio);

/* ========== 14) Wallpaper runtime + pulsante switch ========== */
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

function applyWallpaper(idx=0){
  if(!WALLPAPERS.length) return;
  wpIndex = idx % WALLPAPERS.length;
  const w = WALLPAPERS[wpIndex];
  setDesktopWallpaper(w.src, w.opts || {});
  try { localStorage.setItem('wpIndex', String(wpIndex)); } catch {}
}

function nextWallpaper(){
  if(!WALLPAPERS.length) return;
  const saved = Number(localStorage.getItem('wpIndex') ?? wpIndex);
  applyWallpaper((saved + 1) % WALLPAPERS.length);
}


function ensureButtonsBarStyles(bar){
  if(!document.getElementById('btnbar-style')){
    const st = document.createElement('style');
    st.id = 'btnbar-style';
    st.textContent = `
      .btn-bar { display:flex; align-items:center; gap:8px; justify-content:flex-end; flex-wrap:wrap; }
      .btn-bar button { font:700 12px/1 monospace; padding:6px 10px; border:2px outset #ccc; background:#e0e0e0; cursor:pointer; }
      @media (max-width: 560px){
        .btn-bar { justify-content:flex-end; }
        .btn-bar button { margin-top:4px; }
      }
    `;
    document.head.appendChild(st);
  }
  bar.classList.add('btn-bar');
}

function attachWallpaperButtonToBar(){
  // trova una barra: di solito il parent di btnSaluta
  const bar = (btnSaluta && btnSaluta.parentElement) || document.querySelector('.btn-bar') || document.body;
  ensureButtonsBarStyles(bar);
  let btn = document.getElementById('btn-wallpaper');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'btn-wallpaper';
    btn.textContent = 'BG';
    bar.appendChild(btn);
    btn.addEventListener('click', ()=> nextWallpaper());
  } else if(btn.parentElement !== bar){
    bar.appendChild(btn);
  }
}


// Pulsante flottante per switchare background

/* ========== 15) Avvio ========== */
window.addEventListener('load', ()=>{
  centerBrowser();
  setInitialBackground();
  renderDesktop();
  attachResize(browserEl, 500, 360);
  preloadStickers();

  // Wallpaper iniziale: usa quello salvato, altrimenti il primo
  const saved = Number(localStorage.getItem('wpIndex'));
  applyWallpaper(Number.isFinite(saved) ? saved : 0);

  // Pulsante per switchare i background
  attachWallpaperButtonToBar();
});


/* ========== 16) Ripristino menu destro ========== */
document.addEventListener('contextmenu', function restore(e){
  // non preveniamo il default
}, { capture:true });
