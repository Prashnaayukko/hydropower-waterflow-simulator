// ============================================================
// hydrograph.js  —  drop this into your project folder
// and add  <script src="hydrograph.js"></script>
// at the bottom of index.html, AFTER script.js
// ============================================================

// ── 1. Monthly Qriver data (typical Himalayan RoR river, m³/s)
//       Replace with real DHM gauge data for your site
const QRIVER_MONTHLY = {
  Jan: 38,  Feb: 28,  Mar: 22,  Apr: 30,
  May: 65,  Jun: 210, Jul: 480, Aug: 560,
  Sep: 400, Oct: 180, Nov: 85,  Dec: 52
};
const MONTHS = Object.keys(QRIVER_MONTHLY);
const QRIVER = Object.values(QRIVER_MONTHLY);

// ── 2. Inject the hydrograph panel into the existing dashboard sidebar
function injectHydrographPanel() {
  const dashboard = document.querySelector('.dashboard');
  if (!dashboard) return;

  const panel = document.createElement('div');
  panel.className = 'control-panel glass-panel';
  panel.style.cssText = 'margin-top:16px;';
  panel.innerHTML = `
    <h2 style="margin-bottom:8px;">Hydrograph <span style="font-size:12px;font-weight:400;opacity:0.6;">— Qin & Qriver</span></h2>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <label style="font-size:13px;opacity:0.8;white-space:nowrap;">Design Q<sub>d</sub> (m³/s)</label>
      <input type="range" id="qdSlider" min="20" max="400" value="120" step="5"
        style="flex:1;">
      <span id="qdVal" style="font-size:13px;font-weight:600;min-width:48px;text-align:right;">120</span>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:12px;font-size:12px;">
      <span id="hg-month-badge"
        style="padding:3px 10px;border-radius:20px;background:rgba(255,255,255,0.15);font-weight:600;">
        —
      </span>
      <span>Qriver: <strong id="hg-qriver">—</strong> m³/s</span>
      <span>Qin: <strong id="hg-qin">—</strong> m³/s</span>
      <span>Qenv: <strong id="hg-qenv">—</strong> m³/s</span>
    </div>

    <canvas id="hydrographCanvas" height="180"
      style="width:100%;border-radius:8px;background:rgba(0,0,0,0.15);">
    </canvas>

    <div style="display:flex;gap:14px;margin-top:8px;font-size:11px;opacity:0.75;">
      <span>&#9644; Qriver</span>
      <span style="color:#4fc3f7;">&#9644; Qin (usable)</span>
      <span style="color:#a5d6a7;">&#9644; Qenv (10%)</span>
      <span style="color:#ef9a9a;">&#9644; Qd limit</span>
    </div>

    <div style="margin-top:10px;">
      <button id="hgPlayBtn"
        style="padding:6px 16px;border-radius:20px;border:1px solid rgba(255,255,255,0.3);
               background:rgba(255,255,255,0.1);color:inherit;cursor:pointer;font-size:13px;">
        ▶ Animate season
      </button>
      <span id="hgSpillWarning"
        style="margin-left:10px;font-size:12px;color:#ef9a9a;display:none;">
        ⚠ Spill: <span id="hgSpillVal">0</span> m³/s
      </span>
    </div>
  `;
  dashboard.appendChild(panel);
}

// ── 3. Draw the hydrograph on canvas
function drawHydrograph(highlightMonth, Qd, bioPercent) {
  const canvas = document.getElementById('hydrographCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 320;
  canvas.width = W;
  const H = canvas.height;

  const pad = { top: 14, bottom: 28, left: 38, right: 10 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const Qmax = Math.max(...QRIVER) * 1.1;

  function yOf(q) { return pad.top + chartH - (q / Qmax) * chartH; }
  function xOf(i) { return pad.left + (i / (MONTHS.length - 1)) * chartW; }

  ctx.clearRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.5;
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const y = pad.top + chartH * (1 - f);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '9px sans-serif';
    ctx.fillText(Math.round(Qmax * f), 2, y + 3);
  });

  // Qd line
  const ydLine = yOf(Qd);
  ctx.strokeStyle = '#ef9a9a';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(pad.left, ydLine); ctx.lineTo(W - pad.right, ydLine); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ef9a9a';
  ctx.font = '9px sans-serif';
  ctx.fillText('Qd', W - pad.right - 14, ydLine - 2);

  // Qenv fill area
  ctx.fillStyle = 'rgba(165,214,167,0.18)';
  ctx.beginPath();
  QRIVER.forEach((q, i) => {
    const qenv = q * bioPercent / 100;
    const x = xOf(i), y = yOf(qenv);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(xOf(QRIVER.length - 1), yOf(0));
  ctx.lineTo(xOf(0), yOf(0));
  ctx.closePath(); ctx.fill();

  // Qin fill
  ctx.fillStyle = 'rgba(79,195,247,0.18)';
  ctx.beginPath();
  QRIVER.forEach((q, i) => {
    const qin = Math.min(q, Qd);
    const x = xOf(i), y = yOf(qin);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(xOf(QRIVER.length - 1), yOf(0));
  ctx.lineTo(xOf(0), yOf(0));
  ctx.closePath(); ctx.fill();

  // Qriver line
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  QRIVER.forEach((q, i) => {
    const x = xOf(i), y = yOf(q);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Qin line
  ctx.strokeStyle = '#4fc3f7';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  QRIVER.forEach((q, i) => {
    const x = xOf(i), y = yOf(Math.min(q, Qd));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // month labels + highlight
  MONTHS.forEach((m, i) => {
    const x = xOf(i);
    const isActive = i === highlightMonth;

    if (isActive) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, H - pad.bottom); ctx.stroke();
      ctx.setLineDash([]);

      // dot on Qriver
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, yOf(QRIVER[i]), 4, 0, Math.PI * 2); ctx.fill();

      // dot on Qin
      ctx.fillStyle = '#4fc3f7';
      ctx.beginPath();
      ctx.arc(x, yOf(Math.min(QRIVER[i], Qd)), 4, 0, Math.PI * 2); ctx.fill();
    }

    if (i % 2 === 0 || isActive) {
      ctx.fillStyle = isActive ? '#fff' : 'rgba(255,255,255,0.45)';
      ctx.font = isActive ? 'bold 10px sans-serif' : '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.slice(0, 3), x, H - 4);
    }
  });
  ctx.textAlign = 'left';
}

// ── 4. Update readout badges and sync with existing simulator sliders
function updateHydrographReadouts(monthIdx, Qd, bioPercent) {
  const q = QRIVER[monthIdx];
  const qin = Math.min(q, Qd);
  const qenv = q * bioPercent / 100;
  const qspill = Math.max(0, q - Qd);

  document.getElementById('hg-month-badge').textContent = MONTHS[monthIdx];
  document.getElementById('hg-qriver').textContent = q;
  document.getElementById('hg-qin').textContent = qin.toFixed(0);
  document.getElementById('hg-qenv').textContent = qenv.toFixed(0);

  const spillWarn = document.getElementById('hgSpillWarning');
  if (qspill > 0) {
    spillWarn.style.display = 'inline';
    document.getElementById('hgSpillVal').textContent = qspill.toFixed(0);
  } else {
    spillWarn.style.display = 'none';
  }

  // sync existing inflow slider so canvas animation reflects Qin
  const inflowSlider = document.getElementById('inflowSlider');
  const inflowValue  = document.getElementById('inflowValue');
  const powerValue   = document.getElementById('powerFlowValue');
  const bioValue     = document.getElementById('bioFlowValue');
  if (inflowSlider) {
    const syncQ = Math.min(qin, inflowSlider.max);
    inflowSlider.value = syncQ;
    if (inflowValue) inflowValue.textContent = Math.round(syncQ);
    const bioQ = Math.round(syncQ * bioPercent / 100);
    const powQ = Math.round(syncQ - bioQ);
    if (bioValue)   bioValue.textContent   = bioQ;
    if (powerValue) powerValue.textContent = powQ;
    // fire change so existing script.js redraws its canvas animation
    inflowSlider.dispatchEvent(new Event('input'));
  }
}

// ── 5. Animation state
let currentMonth = 6; // start at July (peak monsoon)
let animTimer = null;
let isPlaying = false;

function getQd()       { return parseInt(document.getElementById('qdSlider')?.value || 120); }
function getBioPercent() { return parseInt(document.getElementById('bioPercentSlider')?.value || 10); }

function goToMonth(idx) {
  currentMonth = idx;
  const Qd = getQd();
  const bio = getBioPercent();
  drawHydrograph(currentMonth, Qd, bio);
  updateHydrographReadouts(currentMonth, Qd, bio);
}

function togglePlay() {
  isPlaying = !isPlaying;
  const btn = document.getElementById('hgPlayBtn');
  if (isPlaying) {
    btn.textContent = '⏸ Pause';
    animTimer = setInterval(() => {
      currentMonth = (currentMonth + 1) % MONTHS.length;
      goToMonth(currentMonth);
    }, 700);
  } else {
    btn.textContent = '▶ Animate season';
    clearInterval(animTimer);
  }
}

// ── 6. Wire everything up on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  injectHydrographPanel();

  // slight delay so injected canvas has layout dimensions
  setTimeout(() => {
    goToMonth(currentMonth);

    document.getElementById('hgPlayBtn')?.addEventListener('click', togglePlay);

    document.getElementById('qdSlider')?.addEventListener('input', function () {
      document.getElementById('qdVal').textContent = this.value;
      goToMonth(currentMonth);
    });

    // redraw when existing bio slider changes
    document.getElementById('bioPercentSlider')?.addEventListener('input', () => {
      goToMonth(currentMonth);
    });

    // click on canvas to jump to a month
    document.getElementById('hydrographCanvas')?.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pad = 38;
      const chartW = this.offsetWidth - pad - 10;
      const idx = Math.round(((x - pad) / chartW) * (MONTHS.length - 1));
      if (idx >= 0 && idx < MONTHS.length) goToMonth(idx);
    });
  }, 100);
});
