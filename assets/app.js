// scanchart: draws the charts as vector SVG at exact millimetre sizes, listens to the scanner (a HID keyboard)
// and circles whatever it reads.
(() => {
const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (v, d = 2) => v.toFixed(d).replace('.', ',');

// ---------- Drawing ----------

// bwip-js draws 2 SVG units per module (2D) or per narrow bar (1D) at scale 1, so units / 2 = modules.
function svg(opts) {
  const doc = new DOMParser().parseFromString(bwipjs.toSVG(Object.assign({ scale: 1 }, opts)), 'image/svg+xml');
  const el = document.importNode(doc.documentElement, true);
  const [, , w, h] = el.getAttribute('viewBox').split(/\s+/).map(Number);
  el.removeAttribute('width'); el.removeAttribute('height');
  el.setAttribute('shape-rendering', 'crispEdges');
  return { el, modsW: w / 2, modsH: h / 2 };
}

const key = (kind, id) => `${kind}:${id}`;
const targets = {};            // key -> [elements]
const addTarget = (k, el) => (targets[k] = targets[k] || []).push(el);

// 1. Type chart: one cell per symbology, 2D at 0.5 mm modules and 1D at 0.33 mm bars, scaled down to fit the cell.
function drawTypes() {
  const box = $('types');
  SC.TYPES.forEach((t, i) => {
    const cell = document.createElement('figure'); cell.className = 'type' + (t.inverse ? ' inverse' : '');
    let code;
    try {
      const o = { bcid: t.bcid, text: t.text };
      if (t.g === '1D' || t.bcid === 'code128') Object.assign(o, { height: 9, includetext: false });
      if (t.inverse) Object.assign(o, { backgroundcolor: '111111', barcolor: 'FFFFFF', padding: 4 });
      Object.assign(o, t.opts || {});
      code = svg(o);
    } catch (e) { code = null; }
    const is1D = t.g === '1D' || t.bcid === 'code128';
    const unit = t.moduleMm || (is1D ? 0.33 : 0.5);
    const holder = document.createElement('span'); holder.className = 'target';
    if (code) {
      const wMm = Math.min(code.modsW * unit, 40), hMm = Math.min(code.modsH * unit * (wMm / (code.modsW * unit)), 21);
      const s = Math.min(wMm / code.modsW, hMm / code.modsH);
      code.el.style.width = `${code.modsW * s}mm`; code.el.style.height = `${code.modsH * s}mm`;
      code.el.setAttribute('preserveAspectRatio', 'none');
      code.el.setAttribute('aria-label', `${t.name} barkodu`); code.el.setAttribute('role', 'img');
      holder.appendChild(code.el);
    } else holder.textContent = 'çizilemedi';
    addTarget(key('type', t.id), holder);
    const cap = document.createElement('figcaption');
    const short = t.text.length > 22 ? t.text.slice(0, 20) + '…' : t.text;
    cap.innerHTML = `<b></b><span class="grp"></span><code></code>`;
    cap.querySelector('b').textContent = `${i + 1}. ${t.name}`;
    cap.querySelector('.grp').textContent = t.g;
    cap.querySelector('code').textContent = short;
    cell.append(holder, cap);
    box.appendChild(cell);
  });
}

// 2–3. Acuity charts: each row repeats one code at a fixed module size; rows get smaller downwards.
function drawRows(boxId, kind, sizes, payload, bcid, quiet) {
  const box = $(boxId), AVAIL = 150;   // mm left of the row label
  sizes.forEach((m, r) => {
    const row = document.createElement('div'); row.className = 'row';
    const code = svg({ bcid, text: payload(r + 1) });
    const n = code.modsW, wMm = n * m, cell = (n + 2 * quiet) * m;
    const copies = Math.max(1, Math.min(5, Math.floor(AVAIL / cell)));
    row.innerHTML = `<div class="rl"><b>${r + 1}</b><span>${fmt(m)} mm</span><small>${fmt(wMm, 1)} mm kod</small></div><div class="rc"></div>`;
    for (let c = 0; c < copies; c++) {
      // A cut box: the code plus its full quiet zone, so a piece cut out along the dashes still scans.
      const h = document.createElement('span'); h.className = 'target cut';
      const el = c ? code.el.cloneNode(true) : code.el;
      el.style.width = el.style.height = `${wMm}mm`;
      el.setAttribute('role', 'img'); el.setAttribute('aria-label', `${kind.toUpperCase()} satır ${r + 1}, modül ${fmt(m)} mm`);
      h.style.padding = `${quiet * m}mm`;
      h.appendChild(el); row.querySelector('.rc').appendChild(h);
      addTarget(key(kind, r + 1), h);
    }
    box.appendChild(row);
  });
}

// A 100 mm ruler under every sheet: if it doesn't measure 10 cm on paper, the print was scaled and the mm sizes are off.
function drawFooters() {
  const sheets = [...document.querySelectorAll('.sheet')];
  sheets.forEach((sh, i) => {
    let ticks = '', nums = '';
    for (let mm = 0; mm <= 100; mm++) { const h = mm % 10 ? (mm % 5 ? 1.5 : 2.5) : 4; ticks += `<line x1="${mm}" y1="0" x2="${mm}" y2="${h}"/>`; }
    for (let cm = 0; cm <= 10; cm++) nums += `<text x="${cm * 10}" y="6.6" text-anchor="middle">${cm}</text>`;
    const f = document.createElement('footer'); f.className = 'sf';
    f.innerHTML = `<div class="rul"><svg viewBox="0 0 100 7" aria-hidden="true"><line x1="0" y1="0" x2="100" y2="0" stroke="#111" stroke-width=".25"/><g stroke="#111" stroke-width=".2">${ticks}</g><g>${nums}</g></svg>
      <span>Bu cetvel kâğıtta tam 10 cm olmalı. Değilse yazdırırken ölçeği %100 yap.</span></div>
      <span class="pg">kiliczsh.github.io/scanchart · ${i + 1}/${sheets.length}</span>`;
    f.querySelectorAll('text').forEach(t => { t.setAttribute('font-size', '2.6'); t.setAttribute('fill', '#4b5258'); t.setAttribute('font-family', 'Familjen Grotesk, sans-serif'); });
    sh.appendChild(f);
  });
}

function drawForm() {
  SC.TYPES.forEach((t, i) => { const li = document.createElement('li'); li.textContent = `${t.name}`; li.value = i + 1; $('checks').appendChild(li); });
}

// ---------- Scanner input ----------
// Read physical key codes, not characters, so the result is what the scanner sent regardless of keyboard layout.
const SHIFTED = { Minus: '_', Equal: '+', BracketLeft: '{', BracketRight: '}', Backslash: '|', Semicolon: ':', Quote: '"', Backquote: '~', Comma: '<', Period: '>', Slash: '?',
  Digit1: '!', Digit2: '@', Digit3: '#', Digit4: '$', Digit5: '%', Digit6: '^', Digit7: '&', Digit8: '*', Digit9: '(', Digit0: ')' };
const PLAIN = { Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Backquote: '`', Comma: ',', Period: '.', Slash: '/', Space: ' ' };
function usChar(e) {
  const c = e.code;
  if (c.startsWith('Key')) { const l = c.slice(3); return e.shiftKey ? l : l.toLowerCase(); }
  if (c.startsWith('Digit')) return e.shiftKey ? SHIFTED[c] : c.slice(5);
  if (c.startsWith('Numpad') && /\d$/.test(c)) return c.slice(-1);
  if (e.shiftKey && SHIFTED[c]) return SHIFTED[c];
  return PLAIN[c] ?? `‹${c}›`;
}

function match(us) {
  let m;
  if ((m = us.match(/^SCQ(\d\d)$/i)) && +m[1] <= SC.QR_ROWS.length) return { k: key('qr', +m[1]), label: `QR satır ${+m[1]} · ${fmt(SC.QR_ROWS[+m[1] - 1])} mm` };
  if ((m = us.match(/^90(\d\d)$/)) && +m[1] <= SC.DM_ROWS.length) return { k: key('dm', +m[1]), label: `Data Matrix satır ${+m[1]} · ${fmt(SC.DM_ROWS[+m[1] - 1])} mm` };
  const t = SC.TYPES.find(t => t.match ? t.match(us) : us.includes(t.id));
  return t ? { k: key('type', t.id), label: t.name, t } : null;
}

const reads = {};      // key -> Set of distances ('' when not given)
const fails = new Set(); // keys marked "okumadı" by hand in the one-at-a-time test
const log = [];
let buf = [], typed = '', times = [], idle = null;

function flush(suffix) {
  clearTimeout(idle); if (!buf.length) return;
  const us = buf.join(''), shown = typed;
  const gaps = times.slice(1).map((v, i) => v - times[i]); const avg = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  buf = []; typed = ''; times = [];
  const dist = $('dist').value, m = match(us);
  const entry = { n: log.length + 1, at: new Date(), dist, us, shown, avg, suffix, m };
  log.push(entry);
  if (m) {
    markRead(m.k, dist);
    if (!stepOpen() && targets[m.k]?.[0] && !inView(targets[m.k][0])) targets[m.k][0].scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }
  $('last').textContent = m ? `Son: ${m.label}${dist ? ` · ${dist} cm` : ''}${m.t?.exact && us !== shown ? ' · ekranda farklı yazıldı (klavye düzeni)' : ''}`
    : `Tanınmadı: ${us.length > 40 ? us.slice(0, 40) + '…' : us}`;
  $('last').className = 'last ' + (m ? 'ok' : 'no');
  logRow(entry); summary(); stepAfterScan(m);
}
function markRead(k, dist) {
  (reads[k] = reads[k] || new Set()).add(dist); fails.delete(k);
  // A small stamp in the cell corner or under the row label, never on the code itself.
  const where = [...reads[k]].filter(Boolean);
  const hosts = new Set((targets[k] || []).map(el => el.closest('.type') || el.closest('.row')?.querySelector('.rl')).filter(Boolean));
  hosts.forEach(h => { h.dataset.seen = `✓ okundu${where.length ? ' · ' + where.join(', ') + ' cm' : ''}`; h.classList.remove('flash'); void h.offsetWidth; h.classList.add('seen'); if (!reduce) h.classList.add('flash'); });
}
const inView = el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; };

document.addEventListener('keydown', e => {
  if (buf.length && ((e.ctrlKey && e.code === 'BracketRight') || e.code === 'F8')) { e.preventDefault(); buf.push('\x1d'); typed += '‹GS›'; times.push(performance.now()); return; }
  if (e.metaKey || e.ctrlKey || (e.altKey && !e.code.startsWith('Numpad'))) return;
  if (['ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'CapsLock'].includes(e.code)) return;
  // Only real text fields keep their keys. A focused <select> (the distance picker) would otherwise swallow a scan
  // and jump to whatever option its digits spell, so scanner bursts are taken from it too.
  if (e.target.matches?.('input:not([type=range]):not([type=checkbox]):not([type=radio]), textarea')) return;
  const onSelect = e.target.matches?.('select');
  if (onSelect && !buf.length && /^(Arrow|Page|Home|End|Tab|Escape|Enter|Space)/.test(e.code)) return;
  if (!buf.length && (e.code === 'Tab' || ((e.code === 'Enter' || e.code === 'Space') && e.target.closest?.('button, a')))) return;
  if (!buf.length && stepOpen()) {
    if (e.code === 'Escape') { e.preventDefault(); return stepClose(); }
    if (e.code === 'ArrowRight') { e.preventDefault(); return stepGo(cur + 1); }
    if (e.code === 'ArrowLeft') { e.preventDefault(); return stepGo(cur - 1); }
  }
  if (!buf.length && /^(Arrow|Page|Home|End|Escape)/.test(e.code)) return;
  e.preventDefault();
  if (e.code === 'Enter' || e.code === 'NumpadEnter') return flush('Enter');
  if (e.code === 'Tab') return flush('Tab');
  if (onSelect) e.target.blur();
  buf.push(usChar(e)); typed += e.key.length === 1 ? e.key : `‹${e.key}›`; times.push(performance.now());
  clearTimeout(idle); idle = setTimeout(() => flush('yok'), 400);
});
const setListening = on => { document.body.classList.toggle('listening', on); $('listen').textContent = $('listen2').textContent = on ? 'Dinliyor' : 'Sayfaya tıkla'; };
addEventListener('focus', () => setListening(true)); addEventListener('blur', () => setListening(false));

// ---------- Results ----------
function smallest(kind, rows, dist) {
  let best = 0;
  rows.forEach((_, i) => { const s = reads[key(kind, i + 1)]; if (s && (dist === undefined || s.has(dist))) best = i + 1; });
  return best;
}
function summary() {
  const types = SC.TYPES.filter(t => reads[key('type', t.id)]).length;
  const q = smallest('qr', SC.QR_ROWS), d = smallest('dm', SC.DM_ROWS);
  $('sum').innerHTML = `<b>${types}</b>/28 tür · QR <b>${q ? `${q}. satır` : '–'}</b>${q ? ` (${fmt(SC.QR_ROWS[q - 1])} mm)` : ''} · DM <b>${d ? `${d}. satır` : '–'}</b>${d ? ` (${fmt(SC.DM_ROWS[d - 1])} mm)` : ''}`;
}
function logRow(e) {
  $('logEmpty').hidden = true;
  const tr = document.createElement('tr');
  [e.n, e.at.toLocaleTimeString('tr-TR'), e.dist ? `${e.dist} cm` : '–', e.m ? e.m.label : 'Tanınmadı', e.us.replace(/\x1d/g, '‹GS›'), e.shown, e.manual ? '–' : fmt(e.avg, 1)]
    .forEach((v, i) => { const td = document.createElement('td'); td.textContent = v; if (i === 4 || i === 5) td.className = 'mono'; tr.appendChild(td); });
  $('log').prepend(tr);
}

function report() {
  const dists = [...new Set(Object.values(reads).flatMap(s => [...s]))].sort((a, b) => (+a || 0) - (+b || 0));
  const ok = SC.TYPES.filter(t => reads[key('type', t.id)]), miss = SC.TYPES.filter(t => !reads[key('type', t.id)]);
  const lines = ['### scanchart sonucu', `${new Date().toLocaleString('tr-TR')} · ${navigator.userAgent.match(/(Chrome|Firefox|Safari)\/[\d.]+/)?.[0] || ''}`,
    `Türler: ${ok.length}/28 okundu`, `  okudu: ${ok.map(t => t.name).join(', ') || '–'}`,
    `  okumadı: ${miss.filter(t => fails.has(key('type', t.id))).map(t => t.name).join(', ') || '–'}`,
    `  denenmedi: ${miss.filter(t => !fails.has(key('type', t.id))).map(t => t.name).join(', ') || '–'}`, 'Keskinlik (okunan en küçük satır):'];
  dists.forEach(d => {
    const q = smallest('qr', SC.QR_ROWS, d), m = smallest('dm', SC.DM_ROWS, d);
    lines.push(`  ${d ? d + ' cm' : 'uzaklık belirtilmedi'}: QR ${q ? `${q}. satır (${fmt(SC.QR_ROWS[q - 1])} mm)` : '–'} · DM ${m ? `${m}. satır (${fmt(SC.DM_ROWS[m - 1])} mm)` : '–'}`);
  });
  const failedRows = [...fails].filter(k => !k.startsWith('type')).map(k => k.replace('qr:', 'QR satır ').replace('dm:', 'DM satır '));
  if (failedRows.length) lines.push(`Okumadı olarak işaretlenen satırlar: ${failedRows.join(', ')}`);
  const manual = log.filter(e => e.manual).length;
  if (manual) lines.push(`Elle "okudu" işaretlenen: ${manual}`);
  const speeds = log.filter(e => e.m && !e.manual).map(e => e.avg);
  if (speeds.length) lines.push(`Okuyucu hızı: ${fmt(Math.min(...speeds), 1)}–${fmt(Math.max(...speeds), 1)} ms/tuş · son ek: ${[...new Set(log.map(e => e.suffix))].join(', ')}`);
  const layout = log.filter(e => e.m?.t?.exact);
  layout.forEach(e => lines.push(`${e.m.label}: gönderilen "${e.us}", ekrana yazılan "${e.shown}" → ${e.us === e.shown ? 'aynı' : 'farklı'}`));
  return lines.join('\n');
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { const ta = Object.assign(document.createElement('textarea'), { value: text }); ta.style.position = 'fixed'; ta.style.opacity = 0; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; }
}
const flashBtn = (b, t) => { const o = b.dataset.l || b.textContent; b.dataset.l = o; b.textContent = t; setTimeout(() => b.textContent = o, 1500); };
$('copy').onclick = async e => flashBtn(e.currentTarget, await copyText(report()) ? 'Kopyalandı' : 'Olmadı');
$('csv').onclick = e => {
  const rows = [['#', 'Saat', 'Uzaklık (cm)', 'Eşleşen', 'Gönderilen', 'Ekrana yazılan', 'ms/tuş', 'Son ek'],
    ...log.map(l => [l.n, l.at.toISOString(), l.dist, l.m ? l.m.label : 'Tanınmadı', l.us.replace(/\x1d/g, '<GS>'), l.shown, fmt(l.avg, 1), l.suffix])];
  const csv = '﻿' + rows.map(r => r.map(v => /[";\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(';')).join('\r\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `scanchart-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.appendChild(a); a.click(); a.remove(); flashBtn(e.currentTarget, 'İndirildi');
};
$('reset').onclick = () => {
  for (const k in reads) delete reads[k]; log.length = 0; fails.clear();
  document.querySelectorAll('.seen').forEach(el => el.classList.remove('seen', 'flash'));
  $('log').innerHTML = ''; $('logEmpty').hidden = false; $('last').textContent = ''; summary(); if (stepOpen()) stepRender();
};
$('print').onclick = () => print();
try { $('dist').value = localStorage.getItem('scanchart.dist') || ''; } catch {}
$('dist').addEventListener('change', () => { try { localStorage.setItem('scanchart.dist', $('dist').value); } catch {} $('dist').blur(); });

// ---------- One at a time ----------
// Every code from the charts, alone and big on a white screen, so a neighbour can't be read by mistake.
const STEPS = [
  ...SC.TYPES.map(t => ({ set: 'type', k: key('type', t.id), t, title: t.name, pos: t.g, payload: t.text })),
  ...SC.QR_ROWS.map((m, i) => ({ set: 'qr', k: key('qr', i + 1), m, n: 21, quiet: 4, bcid: 'qrcode', title: `QR · ${i + 1}. satır`, pos: 'QR keskinlik', payload: SC.qrPayload(i + 1) })),
  ...SC.DM_ROWS.map((m, i) => ({ set: 'dm', k: key('dm', i + 1), m, n: 10, quiet: 2, bcid: 'datamatrix', title: `Data Matrix · ${i + 1}. satır`, pos: 'DM keskinlik', payload: SC.dmPayload(i + 1) })),
];
let set = 'all', list = STEPS, cur = 0, advance = null;
const stepOpen = () => !$('step').hidden;

function stepGo(i) {
  clearTimeout(advance);
  cur = Math.max(0, Math.min(list.length - 1, i));
  stepRender();
}

function stepRender() {
  const s = list[cur], holder = $('stepTarget'), stage = holder.parentElement.getBoundingClientRect();
  holder.innerHTML = ''; holder.className = 'target'; holder.style.padding = '';
  $('stepPos').textContent = `${cur + 1} / ${list.length} · ${s.pos}`;
  $('stepTitle').textContent = s.title;
  const short = s.payload.length > 48 ? s.payload.slice(0, 46) + '…' : s.payload;
  $('stepSub').innerHTML = s.t ? 'Beklenen <code></code>' : `Modül ${fmt(s.m)} mm · kod ${fmt(s.n * s.m, 1)} mm · ekranda yaklaşık`;
  if (s.t) $('stepSub').querySelector('code').textContent = short;
  let code;
  try {
    if (s.t) {
      const t = s.t, is1D = t.g === '1D' || t.bcid === 'code128';
      const o = Object.assign({ bcid: t.bcid, text: t.text }, is1D ? { height: 12, includetext: false } : {}, t.inverse ? { backgroundcolor: '111111', barcolor: 'FFFFFF', padding: 4 } : {}, t.opts || {});
      code = svg(o);
      if (t.moduleMm) code.el.style.width = `${code.modsW * t.moduleMm}mm`;   // the small-module test keeps its true size
      else {
        const w = Math.min(stage.width * .9, is1D ? 900 : stage.height * .82 * code.modsW / code.modsH, stage.height * .82 * code.modsW / code.modsH);
        code.el.style.width = `${Math.max(120, w)}px`;
      }
      if (t.inverse) holder.classList.add('inverse-bg');
    } else {
      code = svg({ bcid: s.bcid, text: s.payload });
      code.el.style.width = `${code.modsW * s.m}mm`;
      holder.style.padding = `${s.quiet * s.m}mm`;
    }
    code.el.style.height = 'auto';
    code.el.setAttribute('role', 'img'); code.el.setAttribute('aria-label', `${s.title} kodu`);
    holder.appendChild(code.el);
  } catch (e) { holder.textContent = 'Bu kod çizilemedi.'; }
  const read = reads[s.k], failed = fails.has(s.k);
  const where = read ? [...read].filter(Boolean) : [];
  $('stepStamp').hidden = !read && !failed;
  $('stepStamp').className = 'step-stamp ' + (read ? 'yes' : 'no');
  $('stepStamp').textContent = read ? `✓ okundu${where.length ? ' · ' + where.join(', ') + ' cm' : ''}` : 'okumadı';
  $('stepState').textContent = read ? `Okudu${[...read].filter(Boolean).length ? ` · ${[...read].filter(Boolean).join(', ')} cm` : ''}` : failed ? 'Okumadı olarak işaretlendi' : 'Bekliyor: okuyucuyu koda tut';
  $('stepState').className = 'step-state ' + (read ? 'yes' : failed ? 'no' : '');
  $('stepPrev').disabled = cur === 0;
  $('stepNext').textContent = cur === list.length - 1 ? 'Bitir' : 'Sonraki →';
  const dots = $('stepDots'); dots.innerHTML = '';
  list.forEach((x, i) => { const d = document.createElement('i'); d.className = (reads[x.k] ? 'yes' : fails.has(x.k) ? 'no' : '') + (i === cur ? ' now' : ''); d.title = x.title; d.onclick = () => stepGo(i); dots.appendChild(d); });
}

function stepAfterScan(m) {
  if (!stepOpen() || !m || m.k !== list[cur].k) { if (stepOpen()) stepRender(); return; }
  stepRender();
  clearTimeout(advance); advance = setTimeout(() => { if (cur < list.length - 1) stepGo(cur + 1); }, reduce ? 300 : 800);
}

function stepMark(ok) {
  const s = list[cur], dist = $('dist').value;
  if (ok) {
    markRead(s.k, dist);
    const entry = { n: log.length + 1, at: new Date(), dist, us: '(elle işaretlendi)', shown: '', avg: 0, suffix: '–', manual: true, m: { k: s.k, label: s.title } };
    log.push(entry); logRow(entry);
  } else { if (!reads[s.k]) fails.add(s.k); }
  summary(); stepRender();
  clearTimeout(advance); advance = setTimeout(() => { if (cur < list.length - 1) stepGo(cur + 1); }, reduce ? 0 : 350);
}

function stepSet(v) {
  set = v; list = v === 'all' ? STEPS : STEPS.filter(s => s.set === v);
  document.querySelectorAll('.step-set button').forEach(b => b.setAttribute('aria-pressed', b.dataset.set === v));
  const firstOpen = list.findIndex(s => !reads[s.k] && !fails.has(s.k));
  stepGo(firstOpen < 0 ? 0 : firstOpen);
}

function stepOpenFn() {
  $('step').hidden = false; document.body.classList.add('stepping');
  stepSet(set); $('step').focus?.();
}
function stepClose() { clearTimeout(advance); $('step').hidden = true; document.body.classList.remove('stepping'); }

$('stepOpen').onclick = stepOpenFn; $('stepOpen2').onclick = stepOpenFn;
$('stepClose').onclick = stepClose;
$('stepPrev').onclick = () => stepGo(cur - 1);
$('stepNext').onclick = () => cur === list.length - 1 ? stepClose() : stepGo(cur + 1);
$('stepYes').onclick = () => stepMark(true);
$('stepNo').onclick = () => stepMark(false);
document.querySelectorAll('.step-set button').forEach(b => b.onclick = () => stepSet(b.dataset.set));
addEventListener('resize', () => { if (stepOpen()) stepRender(); });
$('step').tabIndex = -1;

// ---------- Screen fit ----------
// Sheets are A4 in real millimetres; on narrow screens they are zoomed down as a whole so the layout never reflows.
function fit() {
  const sheetPx = 210 * 96 / 25.4, avail = document.documentElement.clientWidth - 24;
  document.documentElement.style.setProperty('--fit', Math.min(1, avail / sheetPx).toFixed(3));
}
addEventListener('resize', fit);

drawTypes();
drawRows('qrRows', 'qr', SC.QR_ROWS, SC.qrPayload, 'qrcode', 4);
drawRows('dmRows', 'dm', SC.DM_ROWS, SC.dmPayload, 'datamatrix', 2);
drawForm(); drawFooters(); fit(); summary(); setListening(document.hasFocus());
if (new URLSearchParams(location.search).has('tek')) stepOpenFn();
window.SC.match = match;   // for tests
})();
