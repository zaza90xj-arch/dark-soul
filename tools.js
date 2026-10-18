/* DARK SOUL — المظهر، الخلفيات المتحركة، مصنع البوستات، استوديو التصميم */
(function () {
  'use strict';
  const X = window.DSX, D = X.D, S = X.S, V = X.V, $ = X.$, esc = X.esc, store = X.store, toast = X.toast, pick = X.pick, shuffle = X.shuffle;
  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgba = (h, a) => { const c = hexRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

  /* ---------- اللون التلقائي أو المثبّت ---------- */
  let autoT = 0, ai = 0;
  X.applyTheme = function () {
    clearInterval(autoT);
    const set = c => { S.accent = c; document.documentElement.style.setProperty('--accent', c); };
    if (S.settings.color === 'auto') {
      set(X.ACCENTS[ai % X.ACCENTS.length].c);
      if (!S.settings.calm) autoT = setInterval(() => { ai++; set(X.ACCENTS[ai % X.ACCENTS.length].c); }, 7000);
    } else set((X.ACCENTS.find(a => a.id === S.settings.color) || X.ACCENTS[0]).c);
  };

  /* ---------- خلفيات متحركة خفيفة ---------- */
  const cv = $('#fx'), cx = cv.getContext('2d'); let W = 0, H = 0, parts = [], raf = 0;
  function size() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
  function seedParts(mode) {
    parts = [];
    const n = mode === 'rain' ? Math.min(90, Math.floor(W / 11)) : mode === 'stars' ? 70 : 45;
    for (let i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, l: 10 + Math.random() * 16, v: 6 + Math.random() * 8, r: 0.6 + Math.random() * 1.8, p: Math.random() * 6.28, vx: (Math.random() - .5) * .5, vy: -0.15 - Math.random() * .4 });
  }
  function frame() {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const mode = S.settings.fx; cx.clearRect(0, 0, W, H);
    const c = hexRgb(S.accent);
    for (const p of parts) {
      if (mode === 'rain') { cx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},.28)`; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - 2, p.y + p.l); cx.stroke(); p.y += p.v; p.x -= .3; if (p.y > H) { p.y = -20; p.x = Math.random() * W; } }
      else if (mode === 'stars') { p.p += .03; cx.fillStyle = `rgba(255,255,255,${.25 + Math.sin(p.p) * .25 + .25})`; cx.fillRect(p.x, p.y, p.r, p.r); }
      else { p.x += p.vx; p.y += p.vy; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; } cx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},.35)`; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill(); }
    }
  }
  X.applyFx = function () {
    cancelAnimationFrame(raf); size(); cx.clearRect(0, 0, W, H);
    document.documentElement.classList.toggle('calm', !!S.settings.calm);
    document.documentElement.classList.toggle('motion-ok', !S.settings.calm);
    X.applyTheme();
    if (S.settings.calm || S.settings.fx === 'none') return;
    seedParts(S.settings.fx); frame();
  };
  window.addEventListener('resize', () => { clearTimeout(window.__rz); window.__rz = setTimeout(X.applyFx, 250); });

  /* ---------- مصنع البوستات ---------- */
  const F = Object.assign({ type: 'post', style: 'sad', feel: 'الحزن', topic: '', dial: 'eg', len: 'm', n: 3, src: 'mix' }, store.get('fprefs', {}));
  const FEELS = ['الحزن', 'الخذلان', 'الاشتياق', 'الحب', 'الوحدة', 'الندم', 'القوة', 'الغموض'];
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`).join('');
  let GEN = [];
  V.factory = function () {
    X.setAfter(() => { const f = $('#fForm'); if (f) { f.addEventListener('input', readF); f.addEventListener('change', readF); } GEN = []; });
    return `<nav class="crumbs"><a href="#/">الرئيسية</a> ‹ مصنع البوستات</nav><h1 class="neon">DARK SOUL STUDIO</h1>
      <p class="muted" style="margin-top:-6px">اختر ما تريد، واحصل على نصوص قابلة للنسخ والتعديل والحفظ.</p>
      <div class="tool-grid"><form class="glass card" id="fForm" onsubmit="return false">
        <label for="f-type">نوع المحتوى</label><select id="f-type">${opt([['post', 'منشور'], ['status', 'حالة قصيرة'], ['letter', 'رسالة'], ['khater', 'خاطرة']], F.type)}</select>
        <label for="f-style">الأسلوب</label><select id="f-style">${opt([['sad', 'حزين'], ['love', 'رومانسي'], ['mystery', 'غامض'], ['cinematic', 'سينمائي'], ['power', 'تحفيزي']], F.style)}</select>
        <label for="f-feel">الشعور</label><select id="f-feel">${opt(FEELS.map(x => [x, x]), F.feel)}</select>
        <label for="f-topic">الموضوع (اختياري)</label><input type="text" id="f-topic" maxlength="40" value="${esc(F.topic)}" placeholder="مثال: الصحاب، الغربة، آخر مرة">
        <label for="f-dial">اللهجة</label><select id="f-dial">${opt([['eg', 'المصرية'], ['ar', 'العربية الفصحى']], F.dial)}</select>
        <label for="f-len">طول النص</label><select id="f-len">${opt([['s', 'قصير'], ['m', 'متوسط'], ['l', 'طويل']], F.len)}</select>
        <label for="f-n">عدد النتائج</label><select id="f-n">${opt([[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], F.n)}</select>
        <label for="f-src">المصدر</label><select id="f-src">${opt([['mix', 'تركيب جديد (محلي)'], ['lib', 'اختيار من المكتبة']], F.src)}${S.ai ? '<option value="ai">ذكاء اصطناعي (عبر الخادم)</option>' : ''}</select>
        <p style="margin-top:14px"><button class="btn primary big" type="button" data-act="gen" style="width:100%;justify-content:center">✦ أنشئ النصوص</button></p></form>
      <div id="fOut"><div class="glass empty"><b>نتائجك ستظهر هنا</b>اضبط الخيارات ثم اضغط «أنشئ النصوص».</div></div></div>`;
  };
  X.onAi = function () { const s = $('#f-src'); if (s && !s.querySelector('[value=ai]')) s.insertAdjacentHTML('beforeend', '<option value="ai">ذكاء اصطناعي (عبر الخادم)</option>'); };
  function readF() {
    F.type = $('#f-type').value; F.style = $('#f-style').value; F.feel = $('#f-feel').value; F.topic = $('#f-topic').value;
    F.dial = $('#f-dial').value; F.len = $('#f-len').value; F.n = +$('#f-n').value; F.src = $('#f-src').value; store.set('fprefs', F);
  }
  function compose() {
    const pool = D.pools[F.style][F.dial], t = F.topic.trim() || F.feel;
    const len = F.type === 'status' ? 's' : (F.type === 'khater' && F.len === 's' ? 'm' : F.len);
    const seen = new Set(), res = []; let tries = 0;
    while (res.length < F.n && tries++ < 80) {
      const m = shuffle(pool.m), o = pick(pool.o), c = pick(pool.c);
      const parts = len === 's' ? [m[0], c] : len === 'm' ? [o, m[0], c] : [o, m[0], m[1], m[2], c];
      let txt = parts.join(len === 'l' ? '\n' : ' ').replace(/\{t\}/g, t);
      if (F.type === 'letter') txt = (F.dial === 'eg' ? 'إلى اللي وحشني،\n\n' : 'إلى من يهمّه قلبي،\n\n') + txt;
      if (!seen.has(txt)) { seen.add(txt); res.push({ text: txt, src: 'تركيب محلي' }); }
    }
    return res;
  }
  function fromLib() {
    const map = D.FEEL_LIB[F.style], t = F.topic.trim();
    const inCat = p => p.cat === map.cat && (!map.subs || map.subs.includes(p.sub));
    const lenOk = p => F.type === 'status' ? p.len === 's' : (F.len === 'm' || p.len === F.len);
    // نبدأ بالمطابقة الكاملة، ثم نخفّف شرط الطول، ثم اللهجة، حتى لا تخرج النتيجة فارغة
    let base = D.posts.filter(p => inCat(p) && p.dial === F.dial && lenOk(p)), note = '';
    if (!base.length) { base = D.posts.filter(p => inCat(p) && p.dial === F.dial); note = 'لا يوجد نص بهذا الطول في المكتبة، عرضنا الأقرب'; }
    if (!base.length) { base = D.posts.filter(inCat); note = 'لا توجد نصوص بهذه اللهجة لهذا الأسلوب، عرضنا لهجة أخرى'; }
    if (note) toast(note);
    const first = t ? X.runSearch({ type: 'post', q: t }).filter(p => base.includes(p)) : [];
    const rest = shuffle(base.filter(p => !first.includes(p)));
    return first.concat(rest).slice(0, F.n).map(p => ({ text: p.text, src: 'من المكتبة · ' + p.title }));
  }
  async function viaAI() {
    const r = await fetch('/api/app?r=generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: F.type, style: F.style, feel: F.feel, topic: F.topic.trim(), dial: F.dial, len: F.len, n: F.n }) });
    let j = {}; try { j = await r.json(); } catch (e) { /* تجاهل */ }
    if (!r.ok) throw new Error(j.error || 'تعذّر الاتصال بالخادم');
    return (j.texts || []).map(t => ({ text: t, src: 'ذكاء اصطناعي' }));
  }
  function showGen() {
    const out = $('#fOut');
    if (!GEN.length) { out.innerHTML = '<div class="glass empty"><b>لم نجد نتائج</b>غيّر الخيارات أو جرّب مصدرًا آخر.</div>'; return; }
    out.innerHTML = GEN.map((g, i) => `<div class="glass card result"><span class="tag hot">${esc(g.src)}</span><textarea id="g-${i}" aria-label="النص ${i + 1}">${esc(g.text)}</textarea>
      <div class="acts"><button class="btn" data-act="copygen" data-i="${i}">⧉ نسخ</button><button class="btn" data-act="savegen" data-i="${i}">💾 حفظ</button><button class="btn" data-act="designgen" data-i="${i}">🎨 صمّمه</button><button class="btn" data-act="sharegen" data-i="${i}">↗ مشاركة</button></div></div>`).join('')
      + '<p class="note">«تركيب محلي» يجمع جملًا مكتوبة مسبقًا حول موضوعك، وليس ذكاءً اصطناعيًا. «ذكاء اصطناعي» يظهر فقط حين يكون الخادم مضبوطًا فعلًا.</p>';
  }
  async function gen(btn) {
    readF(); const out = $('#fOut');
    if (F.src === 'ai') {
      out.innerHTML = '<div class="glass empty"><b>جارٍ التوليد…</b>قد يستغرق بضع ثوانٍ.</div>'; btn.disabled = true;
      try { GEN = await viaAI(); } catch (e) { GEN = []; toast(e.message || 'حدث خطأ'); out.innerHTML = `<div class="glass empty"><b>تعذّر التوليد</b>${esc(e.message || 'حدث خطأ غير متوقع')}. جرّب التركيب المحلي.</div>`; btn.disabled = false; return; }
      btn.disabled = false;
    } else if (F.src === 'lib') { GEN = fromLib(); if (GEN.length < F.n && GEN.length) toast('المكتبة تحوي ' + GEN.length + ' نص مطابق فقط'); }
    else GEN = compose();
    showGen();
  }
  const val = i => { const t = $('#g-' + i); return t ? t.value : (GEN[i] && GEN[i].text) || ''; };

  /* ---------- استوديو التصميم ---------- */
  const SIZES = { post: [1080, 1350, 'منشور 4:5'], story: [1080, 1920, 'ستوري 9:16'], square: [1080, 1080, 'مربع 1:1'] };
  const TPL = { sad: ['حزن', '#3d7bff'], love: ['حب', '#ff4d9d'], action: ['أكشن', '#ff3b4e'], mystery: ['غموض', '#a855f7'] };
  const ST = { text: '', tpl: 'sad', color: '#3d7bff', size: 'post', fs: 58, align: 'center', sig: '', wm: true, seed: 7 };
  function mul(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  V.studio = function () {
    ST.text = store.get('studioText', '') || ST.text || pick(D.quotes).text;
    if (!ST.sig && S.profile.nick) ST.sig = S.profile.nick;
    X.setAfter(() => { const f = $('#stForm'); const h = () => { readST(); }; f.addEventListener('input', h); f.addEventListener('change', h); draw(); if (document.fonts && document.fonts.load) document.fonts.load('700 40px Tajawal').then(draw).catch(() => { }); });
    const sw = X.ACCENTS.map(a => `<button type="button" class="sw ${ST.color === a.c ? 'on' : ''}" style="background:${a.c};color:${a.c}" data-act="stcolor" data-v="${a.c}" aria-label="${a.name}"></button>`).join('');
    return `<nav class="crumbs"><a href="#/">الرئيسية</a> ‹ استوديو التصميم</nav><h1 class="neon">استوديو التصميم</h1><p class="muted" style="margin-top:-6px">اكتب أو الصق نصًّا، واختر القالب، ثم نزّل الصورة.</p>
      <div class="tool-grid"><form class="glass card" id="stForm" onsubmit="return false">
        <label for="st-text">النص</label><textarea id="st-text" maxlength="600">${esc(ST.text)}</textarea>
        <label>القالب</label><div class="chips">${Object.entries(TPL).map(([k, v]) => `<button type="button" class="btn ${ST.tpl === k ? 'on' : ''}" data-act="tpl" data-v="${k}">${v[0]}</button>`).join('')}</div>
        <label>لون النيون</label><div class="swatches" id="stSw">${sw}</div>
        <label for="st-size">المقاس</label><select id="st-size">${opt(Object.entries(SIZES).map(([k, v]) => [k, v[2]]), ST.size)}</select>
        <label for="st-fs">حجم الخط</label><input type="range" id="st-fs" min="30" max="110" value="${ST.fs}">
        <label>المحاذاة</label><div class="chips">${[['right', 'يمين'], ['center', 'وسط'], ['left', 'يسار']].map(([v, l]) => `<button type="button" class="btn ${ST.align === v ? 'on' : ''}" data-act="align" data-v="${v}">${l}</button>`).join('')}</div>
        <label for="st-sig">التوقيع أو اسم المستخدم (اختياري)</label><input type="text" id="st-sig" maxlength="40" value="${esc(ST.sig)}" placeholder="@username">
        <label><input type="checkbox" id="st-wm" ${ST.wm ? 'checked' : ''} style="width:auto;min-height:0"> إظهار شعار DARK SOUL الصغير</label></form>
      <div class="glass canvas-wrap"><canvas id="cv" width="1080" height="1350" role="img" aria-label="معاينة التصميم"></canvas>
        <div class="acts" style="justify-content:center;margin-top:10px"><button class="btn primary big" type="button" data-act="dl">⬇ تنزيل PNG</button><button class="btn" type="button" data-act="newseed">🎲 تنويع الخلفية</button></div>
        <p class="note">إن لم يبدأ التنزيل في متصفحك، اضغط مطولًا على الصورة واختر «حفظ الصورة».</p></div></div>`;
  };
  let rq = 0;
  function readST() {
    ST.text = $('#st-text').value; ST.size = $('#st-size').value; ST.fs = +$('#st-fs').value; ST.sig = $('#st-sig').value; ST.wm = $('#st-wm').checked;
    store.set('studioText', ST.text); cancelAnimationFrame(rq); rq = requestAnimationFrame(draw);
  }
  function wrap(c, text, maxW) {
    const lines = [];
    text.split('\n').forEach(par => {
      if (!par.trim()) { lines.push(''); return; }
      let line = '';
      par.split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (c.measureText(t).width <= maxW || !line) line = t; else { lines.push(line); line = w; } });
      lines.push(line);
    });
    return lines;
  }
  function draw() {
    const cvs = $('#cv'); if (!cvs) return; const c = cvs.getContext('2d'), sz = SIZES[ST.size], w = sz[0], h = sz[1];
    if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; }
    const col = ST.color, rnd = mul(ST.seed * 977 + ST.tpl.length), pad = 90;
    c.clearRect(0, 0, w, h); c.shadowBlur = 0; c.fillStyle = '#04040a'; c.fillRect(0, 0, w, h);
    let g = c.createRadialGradient(w * .85, h * .05, 0, w * .85, h * .05, w); g.addColorStop(0, rgba(col, .4)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(0, 0, w, h);
    g = c.createRadialGradient(w * .1, h * .95, 0, w * .1, h * .95, w * .9); g.addColorStop(0, rgba(col, .24)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (ST.tpl === 'sad') { c.lineWidth = 2; for (let i = 0; i < 170; i++) { const x = rnd() * w * 1.2, y = rnd() * h, l = 40 + rnd() * 100; c.strokeStyle = `rgba(190,210,255,${.05 + rnd() * .14})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * .25, y + l); c.stroke(); } }
    else if (ST.tpl === 'love') { for (let i = 0; i < 30; i++) { const r = 30 + rnd() * 110, x = rnd() * w, y = rnd() * h, cc = i % 2 ? col : '#ff4d9d'; const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, rgba(cc, .26)); rg.addColorStop(1, rgba(cc, 0)); c.fillStyle = rg; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); } }
    else if (ST.tpl === 'action') { for (let i = 0; i < 10; i++) { const x0 = rnd() * w * 1.6; c.strokeStyle = rgba(col, .15 + rnd() * .3); c.lineWidth = 2 + rnd() * 12; c.beginPath(); c.moveTo(x0, -20); c.lineTo(x0 - h * .5, h + 20); c.stroke(); } }
    else { const m = c.createRadialGradient(w * .75, h * .15, 10, w * .75, h * .15, 150); m.addColorStop(0, 'rgba(255,255,255,.85)'); m.addColorStop(.35, rgba(col, .45)); m.addColorStop(1, rgba(col, 0)); c.fillStyle = m; c.beginPath(); c.arc(w * .75, h * .15, 150, 0, 6.283); c.fill(); for (let i = 0; i < 8; i++) { const x = rnd() * w, y = h * (.65 + rnd() * .4), r = 160 + rnd() * 200; const fg = c.createRadialGradient(x, y, 0, x, y, r); fg.addColorStop(0, 'rgba(200,190,255,.10)'); fg.addColorStop(1, 'rgba(200,190,255,0)'); c.fillStyle = fg; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); } }
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
    c.strokeStyle = rgba(col, .9); c.lineWidth = 3; c.shadowColor = col; c.shadowBlur = 22; c.strokeRect(36, 36, w - 72, h - 72); c.shadowBlur = 0;
    c.direction = 'rtl'; c.textBaseline = 'middle';
    if (ST.wm) { c.font = '700 32px "Reem Kufi", Tajawal, sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.78)'; try { c.letterSpacing = '6px'; } catch (e) { /* غير مدعوم */ } c.shadowColor = col; c.shadowBlur = 14; c.fillText('DARK SOUL', w / 2, 96); try { c.letterSpacing = '0px'; } catch (e) { /* تجاهل */ } c.shadowBlur = 0; }
    const maxW = w - pad * 2, avail = h - 2 * pad - 190; let fs = ST.fs, lines;
    for (; ;) { c.font = `700 ${fs}px Tajawal, "Noto Sans Arabic", sans-serif`; lines = wrap(c, ST.text.trim() || 'اكتب نصك هنا', maxW); if (lines.length * fs * 1.7 <= avail || fs <= 24) break; fs -= 2; }
    const lh = fs * 1.7, startY = (h - lines.length * lh) / 2 + 10, ax = ST.align === 'right' ? w - pad : ST.align === 'left' ? pad : w / 2;
    c.textAlign = ST.align; c.fillStyle = '#fff'; c.shadowColor = col; c.shadowBlur = 26;
    lines.forEach((l, i) => { c.fillText(l, ax, startY + i * lh + lh / 2); }); c.shadowBlur = 10; lines.forEach((l, i) => { c.fillText(l, ax, startY + i * lh + lh / 2); }); c.shadowBlur = 0;
    if (ST.sig.trim()) { c.font = '600 38px Tajawal, sans-serif'; c.textAlign = 'center'; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 16; c.fillText(ST.sig.trim(), w / 2, h - pad - 20); c.shadowBlur = 0; }
  }
  function download() {
    const cvs = $('#cv'); if (!cvs) return;
    try {
      cvs.toBlob(b => {
        if (!b) { toast('تعذّر إنشاء الصورة'); return; }
        const url = URL.createObjectURL(b), a = document.createElement('a'); a.href = url; a.download = 'dark-soul-' + Date.now() + '.png'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 8000); toast('جارٍ تنزيل الصورة ✓');
      }, 'image/png');
    } catch (e) { toast('تعذّر التصدير على هذا المتصفح'); }
  }

  /* ---------- أوامر الأزرار ---------- */
  X.act = async function (act, el) {
    const i = el.dataset.i;
    switch (act) {
      case 'gen': gen(el); break;
      case 'copygen': { const ok = await X.copyText(val(i)); toast(ok ? 'تم النسخ ✓' : 'تعذّر النسخ'); } break;
      case 'savegen': { const t = val(i).trim(); if (t) { S.saved.unshift({ text: t, date: new Date().toISOString().slice(0, 10) }); S.saved = S.saved.slice(0, 200); X.persist(); toast('تم الحفظ في «نصوصي المحفوظة»'); } } break;
      case 'designgen': store.set('studioText', val(i)); location.hash = '#/studio'; break;
      case 'sharegen': { const t = val(i); if (navigator.share) { try { await navigator.share({ text: t }); } catch (e) { /* أُلغيت */ } } else { const ok = await X.copyText(t); toast(ok ? 'تم نسخ النص للمشاركة ✓' : 'تعذّرت المشاركة'); } } break;
      case 'tpl': ST.tpl = el.dataset.v; ST.color = TPL[ST.tpl][1]; document.querySelectorAll('[data-act=tpl]').forEach(b => b.classList.toggle('on', b.dataset.v === ST.tpl)); document.querySelectorAll('[data-act=stcolor]').forEach(b => b.classList.toggle('on', b.dataset.v === ST.color)); draw(); break;
      case 'stcolor': ST.color = el.dataset.v; document.querySelectorAll('[data-act=stcolor]').forEach(b => b.classList.toggle('on', b.dataset.v === ST.color)); draw(); break;
      case 'align': ST.align = el.dataset.v; document.querySelectorAll('[data-act=align]').forEach(b => b.classList.toggle('on', b.dataset.v === ST.align)); draw(); break;
      case 'newseed': ST.seed = Math.floor(Math.random() * 99999); draw(); break;
      case 'dl': download(); break;
    }
  };

  /* ---------- تشغيل ---------- */
  window.addEventListener('load', function () {
    if (!store.get('settings', null) && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { S.settings.calm = true; X.persist(); }
    X.applyFx();
  });
})();
