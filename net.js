/* DARK SOUL — الاتصال بالخادم: الحسابات، المزامنة، المحتوى من قاعدة البيانات، المجتمع */
(function () {
  'use strict';
  const X = window.DSX, D = X.D, S = X.S, V = X.V, $ = X.$, esc = X.esc, store = X.store, toast = X.toast;
  const API = '/api/app';
  const cfg = { db: false, ai: false, settings: {} };
  let auth = store.get('auth', null), me = null, authMode = 'login', recTok = '';

  // رابط استعادة كلمة المرور يعود إلى الموقع بـ #access_token=...&type=recovery
  if (/type=recovery/.test(location.hash)) {
    try { recTok = new URLSearchParams(location.hash.replace(/^#/, '')).get('access_token') || ''; } catch (e) { /* تجاهل */ }
    history.replaceState(null, '', location.pathname + '#/reset');
  }

  /* ---------- طلبات الخادم ---------- */
  function setAuth(s) { auth = s; store.set('auth', s); if (!s) me = null; }
  async function refresh() {
    try {
      const res = await fetch(API + '?r=refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: auth.refresh_token }) });
      const j = await res.json(); if (!res.ok) throw 0; setAuth(j.session); return true;
    } catch (e) { setAuth(null); return false; }
  }
  async function api(r, o) {
    o = o || {};
    const go = async () => {
      const h = { 'Content-Type': 'application/json' }; if (auth && auth.access_token) h.Authorization = 'Bearer ' + auth.access_token;
      const res = await fetch(API + '?r=' + r + (o.q ? '&' + new URLSearchParams(o.q) : ''), { method: o.body ? 'POST' : 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined });
      let j = {}; try { j = await res.json(); } catch (e) { /* تجاهل */ } return { res, j };
    };
    let out = await go();
    if (out.res.status === 401 && auth && auth.refresh_token && r !== 'refresh' && r !== 'login' && await refresh()) out = await go();
    if (!out.res.ok) { const e = new Error(out.j.error || 'تعذّر الاتصال بالخادم'); e.status = out.res.status; throw e; }
    return out.j;
  }
  const busy = async (btn, fn) => { if (btn) btn.disabled = true; try { return await fn(); } catch (e) { toast(e.message || 'حدث خطأ'); } finally { if (btn) btn.disabled = false; } };

  /* ---------- التهيئة ---------- */
  X.netInit = async function () {
    try { const c = await api('config'); cfg.db = !!c.db; cfg.ai = !!c.ai; cfg.settings = c.settings || {}; } catch (e) { return; } // استضافة ثابتة بلا خادم
    if (cfg.ai) { S.ai = true; if (X.onAi) X.onAi(); }
    if (!cfg.db) { if (location.hash.indexOf('account') > -1) renderAuthBox(); return; }
    X.seo = true; applySettings(); loadContent(); loadTrend(); if (auth) loadMe();
    if (parseHash0() === 'account') renderAuthBox();
  };
  const parseHash0 = () => X.parseHash().parts[0] || 'home';
  const SAFE_ROUTES = ['home', 'sad', 'love', 'action', 'prompts', 'explore', 'trending', 'latest', 'today', 'stories', 'story', 'post', 'prompt', 'favorites', 'quote'];
  const softRender = () => { if (SAFE_ROUTES.includes(parseHash0())) X.render(); };

  function applySettings() {
    const st = cfg.settings, cc = st.custom_cats || {};
    Object.keys(cc.sub || {}).forEach(c => { if (D.CATS[c]) Object.assign(D.CATS[c].subs, cc.sub[c]); });
    Object.assign(D.PCATS, cc.pcat || {});
    if (st.welcome) { const w = $('#splash .welcome'); if (w) w.textContent = st.welcome; }
    if (st.logo_text) {
      X.logoText = st.logo_text; const big = $('#splash .logo-big'); if (big) big.textContent = st.logo_text;
      const lg = $('.logo'); if (lg && lg.firstChild) lg.firstChild.textContent = st.logo_text;
    }
    if (st.default_color && st.default_color !== 'auto' && !store.get('colorChosen', false)) { S.settings.color = st.default_color; X.applyTheme(); }
  }

  /* ---------- المحتوى من قاعدة البيانات ---------- */
  function toItem(r) {
    const added = String(r.created_at || '').slice(0, 10) || '2026-10-17';
    if (r.kind === 'post') { if (!D.CATS[r.cat]) return null; return { id: r.id, _k: 'p', cat: r.cat, sub: r.sub || '', dial: r.dial || 'ar', title: r.title, text: r.body, len: r.body.length < 110 ? 's' : 'l', feat: !!r.featured, added }; }
    if (r.kind === 'prompt') { if (!D.PCATS[r.cat]) return null; return { id: r.id, _k: 'r', cat: r.cat, title: r.title, desc: r.descr || '', text: r.body, lang: r.lang || 'ar', tool: r.tool || 'أي مساعد كتابة', feat: !!r.featured, len: r.body.length < 220 ? 's' : 'l', added }; }
    if (r.kind === 'story') return { id: r.id, _k: 's', title: r.title, genre: r.genre || 'قصة', text: r.body, added };
    if (r.kind === 'quote') return { id: r.id, _k: 'q', text: r.body, added };
    return null;
  }
  function applyRemote(rows) {
    if (!rows.length) return;
    const arr = { p: D.posts, r: D.prompts, s: D.stories, q: D.quotes };
    const items = rows.map(toItem).filter(Boolean);
    if (cfg.settings.seed_imported) {
      Object.values(arr).forEach(a => { a.length = 0; });
      const isSeed = i => /^[prsq]\d+$/.test(i.id), num = i => parseInt(i.id.slice(1), 10);
      items.sort((a, b) => (isSeed(a) - isSeed(b)) || (isSeed(a) ? num(a) - num(b) : 0)); // الجديد أولًا ثم الأصلي بترتيبه
      items.forEach(i => arr[i._k].push(i));
    } else {
      items.forEach(i => { const a = arr[i._k], k = a.findIndex(x => x.id === i.id); if (k >= 0) a[k] = i; else a.unshift(i); });
    }
    X.rebuildIndex(); softRender();
  }
  async function loadContent() { try { applyRemote((await api('content')).items || []); } catch (e) { /* نبقى على المحتوى المضمّن */ } }
  async function loadTrend() { try { const j = await api('trend'); (j.items || []).forEach(t => { X.TREND[t.item_id] = t.score + Math.round(t.views / 10); }); if (parseHash0() === 'trending') X.render(); } catch (e) { /* تجاهل */ } }

  /* ---------- تتبّع مجهول (بلا بيانات شخصية) ---------- */
  X.track = function (type, id) {
    if (!cfg.db || !/^[A-Za-z0-9_-]{1,40}$/.test(String(id))) return;
    try { fetch(API + '?r=track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, item: id }), keepalive: true }).catch(() => { }); } catch (e) { /* تجاهل */ }
  };
  X.onFav = function (id, kind, added) { if (!auth) return; api('favs', { body: added ? { add: [{ id, kind }] } : { remove: [id] } }).catch(() => { }); };

  /* ---------- الحساب ---------- */
  async function loadMe() {
    try {
      const j = await api('me'); me = j;
      const sv = j.favorites || [], svP = sv.filter(f => f.kind === 'post').map(f => f.item_id), svR = sv.filter(f => f.kind === 'prompt').map(f => f.item_id);
      const addUp = S.favP.filter(i => !svP.includes(i)).map(id => ({ id, kind: 'post' })).concat(S.favR.filter(i => !svR.includes(i)).map(id => ({ id, kind: 'prompt' })));
      S.favP = Array.from(new Set(S.favP.concat(svP))); S.favR = Array.from(new Set(S.favR.concat(svR)));
      if (addUp.length) api('favs', { body: { add: addUp } }).catch(() => { });
      S.profile.nick = j.profile.nick || S.profile.nick; S.profile.avatar = j.profile.avatar || S.profile.avatar;
      if (j.settings && j.settings.color) { Object.assign(S.settings, { color: j.settings.color, fx: j.settings.fx || S.settings.fx, calm: !!j.settings.calm }); X.applyFx(); }
      else api('usersettings', { body: { data: S.settings } }).catch(() => { });
      X.persist(); if (['account', 'favorites'].includes(parseHash0())) X.render();
    } catch (e) { if (e.status === 401) setAuth(null); }
  }
  function renderAuthBox() {
    const box = $('#authBox'); if (!box) return;
    if (!cfg.db) { box.innerHTML = '<div class="note">هذا حساب محلي على جهازك: لا بريد ولا كلمة مرور. تسجيل الدخول والمزامنة يظهران بعد ربط قاعدة البيانات على الخادم (انظر README).</div>'; return; }
    if (auth && me) {
      const p = me.profile, admin = ['admin', 'mod'].includes(p.role);
      box.innerHTML = `<div class="glass card"><h3>${esc(p.avatar)} ${esc(p.nick || 'بدون اسم مستعار')}</h3><p class="muted" style="margin:0 0 8px">${esc(me.user.email)} · ${p.role === 'admin' ? 'مدير' : p.role === 'mod' ? 'مشرف' : 'عضو'}${p.banned ? ' · الحساب مقيَّد' : ''}</p>
        <p class="muted" style="margin:0 0 10px;font-size:.88rem">المفضلة والإعدادات تتزامن مع حسابك بين أجهزتك.</p>
        <div class="acts">${admin ? '<a class="btn primary" href="/admin.html">لوحة الإدارة</a>' : ''}<button class="btn" data-n="savenick">حفظ الاسم والصورة في حسابي</button><button class="btn" data-n="logout">تسجيل الخروج</button><button class="btn" data-n="delme">حذف حسابي نهائيًا</button></div></div>`;
      return;
    }
    if (auth && !me) { box.innerHTML = '<div class="glass empty">جارٍ تحميل حسابك…</div>'; return; }
    const tabs = ['login', 'signup'].map(m => `<button class="btn ${authMode === m ? 'on' : ''}" data-n="mode" data-m="${m}">${m === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}</button>`).join('');
    let form = '';
    if (authMode === 'login') form = `<label for="aMail">البريد الإلكتروني</label><input type="text" id="aMail" inputmode="email" autocomplete="email" dir="ltr"><label for="aPw">كلمة المرور</label><input type="password" id="aPw" autocomplete="current-password" dir="ltr" style="width:100%;background:rgba(0,0,0,.4);color:inherit;border:1px solid var(--line);border-radius:12px;padding:11px 14px;min-height:44px"><p><button class="btn primary" data-n="login">دخول</button> <button class="btn" data-n="mode" data-m="forgot">نسيت كلمة المرور</button></p>`;
    else if (authMode === 'signup') form = `<label for="aNick">الاسم المستعار (اختياري)</label><input type="text" id="aNick" maxlength="30"><label for="aMail">البريد الإلكتروني</label><input type="text" id="aMail" inputmode="email" autocomplete="email" dir="ltr"><label for="aPw">كلمة المرور (8 أحرف فأكثر)</label><input type="password" id="aPw" autocomplete="new-password" dir="ltr" style="width:100%;background:rgba(0,0,0,.4);color:inherit;border:1px solid var(--line);border-radius:12px;padding:11px 14px;min-height:44px"><p><button class="btn primary" data-n="signup">إنشاء الحساب</button></p><p class="muted" style="font-size:.85rem">بريدك يُستخدم للدخول واستعادة الحساب فقط، ولا يظهر للآخرين.</p>`;
    else form = `<label for="aMail">بريدك الإلكتروني</label><input type="text" id="aMail" inputmode="email" dir="ltr"><p><button class="btn primary" data-n="forgot">أرسل رابط الاستعادة</button> <button class="btn" data-n="mode" data-m="login">رجوع</button></p>`;
    box.innerHTML = `<div class="glass card"><h3>حسابي على DARK SOUL</h3><p class="muted" style="margin-top:-6px">التصفح مفتوح للجميع. الحساب اختياري لمزامنة المفضلة والمشاركة في المجتمع.</p><div class="chips">${tabs}</div>${form}</div>`;
  }
  async function afterLogin(session) { setAuth(session); toast('تم تسجيل الدخول ✓'); await loadMe(); if (parseHash0() === 'reset') location.hash = '#/account'; else X.render(); }

  /* ---------- صفحة استعادة كلمة المرور ---------- */
  V.reset = function () {
    if (!recTok) return '<div class="glass empty"><b>رابط غير صالح</b>اطلب رابط استعادة جديدًا من صفحة حسابي.<br><a class="btn primary" style="margin-top:10px" href="#/account">حسابي</a></div>';
    return `<h1 class="neon">كلمة مرور جديدة</h1><div class="glass card"><label for="rPw">كلمة المرور الجديدة (8 أحرف فأكثر)</label><input type="password" id="rPw" dir="ltr" autocomplete="new-password" style="width:100%;background:rgba(0,0,0,.4);color:inherit;border:1px solid var(--line);border-radius:12px;padding:11px 14px;min-height:44px"><p><button class="btn primary" data-n="resetpw">حفظ</button></p></div>`;
  };

  /* ---------- المجتمع ---------- */
  const crumbs = t => `<nav class="crumbs"><a href="#/">الرئيسية</a> ‹ ${t}</nav>`;
  const fmt = d => { try { return new Date(d).toLocaleDateString('ar-EG'); } catch (e) { return ''; } };
  const REASONS = [['spam', 'إزعاج أو إعلان'], ['abuse', 'إساءة أو تنمّر'], ['selfharm', 'إيذاء النفس (صاحبه يحتاج مساعدة)'], ['other', 'سبب آخر']];
  const diary = () => store.get('diary', []);
  function diaryHtml() {
    const d = diary();
    return `<div class="glass card" style="margin-top:18px"><h3>يومياتي الخاصة 🔒</h3><p class="muted" style="margin-top:-6px;font-size:.9rem">تُحفظ على جهازك فقط، ولا تُرسل للخادم ولا تُنشر أبدًا.</p><textarea id="dText" maxlength="1500" placeholder="اكتب ما تشاء…"></textarea><p><button class="btn" data-n="dsave">حفظ في يومياتي</button></p>
      ${d.map((x, i) => `<div class="glass card" style="margin-top:8px"><div class="muted" style="font-size:.8rem">${esc(x.date)}</div><p class="post-text">${esc(x.text)}</p><button class="btn" data-n="ddel" data-i="${i}">🗑 حذف</button></div>`).join('')}</div>`;
  }
  V.community = function () {
    X.setAfter(() => { if (cfg.db && cfg.settings.community_enabled) loadPosts(); });
    const on = cfg.db && cfg.settings.community_enabled;
    let body;
    if (!on) body = '<div class="glass empty"><b>المجتمع غير مفعّل حاليًا</b>سيُفتح بعد ربط قاعدة البيانات وتفعيله من لوحة الإدارة، مع مراجعة وإبلاغ وإشراف.</div>';
    else {
      const composer = !auth ? '<div class="glass card"><p style="margin:0">سجّل الدخول لتشارك خاطرة أو تعلّق.</p><p><a class="btn primary" href="#/account">تسجيل الدخول</a></p></div>'
        : `<div class="glass card"><h3>شارك خاطرة</h3><textarea id="cText" maxlength="800" placeholder="اكتب خاطرتك (10 أحرف على الأقل)…"></textarea><label for="cName">الاسم الظاهر (مستعار، لا يكشف هويتك)</label><input type="text" id="cName" maxlength="24" value="${esc(S.profile.nick)}" placeholder="مجهول">
          <label><input type="checkbox" id="cConsent" style="width:auto;min-height:0"> أوافق على نشر هذا النص علنًا بالاسم الظاهر أعلاه</label><p><button class="btn primary" data-n="cpost">نشر</button></p>${cfg.settings.community_premod === false ? '' : '<p class="muted" style="font-size:.85rem;margin:0">المنشورات تُراجع قبل ظهورها.</p>'}</div>`;
      body = composer + '<div id="cList" style="margin-top:12px"></div>';
    }
    return `${crumbs('المجتمع')}<h1 class="neon">المجتمع</h1><div class="note">مساحة للخواطر باحترام. ممنوع الإساءة والإزعاج والروابط الدعائية. إن كنت أنت أو غيرك في خطر الآن فتواصل فورًا مع خدمات الطوارئ المحلية أو شخص تثق به.</div>${body}${diaryHtml()}`;
  }
  async function loadPosts() {
    const box = $('#cList'); if (!box) return;
    try {
      const j = await api('cposts'); if (!$('#cList')) return;
      $('#cList').innerHTML = j.items.length ? j.items.map(p => `<article class="glass card" style="margin-bottom:10px"><div class="muted" style="font-size:.85rem">${esc(p.name)} · ${fmt(p.at)}</div><p class="post-text">${esc(p.body)}</p>
        <div class="acts"><button class="btn" data-n="ccm" data-id="${esc(p.id)}">💬 التعليقات</button><button class="btn" data-n="crep" data-t="post" data-id="${esc(p.id)}">⚑ إبلاغ</button>${p.mine ? `<button class="btn" data-n="cdel" data-t="post" data-id="${esc(p.id)}">🗑 حذف</button>` : ''}</div><div id="rp-post-${esc(p.id)}"></div><div id="cm-${esc(p.id)}"></div></article>`).join('')
        : '<div class="glass empty"><b>لا توجد منشورات بعد</b>كن أول من يشارك.</div>';
    } catch (e) { box.innerHTML = `<div class="glass empty"><b>تعذّر تحميل المنشورات</b>${esc(e.message)}</div>`; }
  }
  async function loadComments(pid) {
    const box = document.getElementById('cm-' + pid); if (!box) return;
    try {
      const j = await api('ccomments', { q: { post: pid } });
      box.innerHTML = j.items.map(c => `<div style="border-top:1px solid var(--line);padding:8px 0"><div class="muted" style="font-size:.8rem">${esc(c.name)} · ${fmt(c.at)}</div><div>${esc(c.body)}</div><div class="acts" style="margin-top:4px"><button class="btn" data-n="crep" data-t="comment" data-id="${esc(c.id)}">⚑</button>${c.mine ? `<button class="btn" data-n="cdel" data-t="comment" data-id="${esc(c.id)}" data-p="${esc(pid)}">🗑</button>` : ''}</div><div id="rp-comment-${esc(c.id)}"></div></div>`).join('')
        + (auth ? `<div class="row" style="margin-top:8px"><input type="text" id="cc-${esc(pid)}" maxlength="300" placeholder="اكتب تعليقًا"><button class="btn" data-n="ccsend" data-id="${esc(pid)}">إرسال</button></div>` : '<p class="muted" style="font-size:.85rem">سجّل الدخول للتعليق.</p>');
    } catch (e) { box.innerHTML = `<p class="muted">${esc(e.message)}</p>`; }
  }

  /* ---------- أحداث الأزرار ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-n]'); if (!el) return; e.preventDefault(); const n = el.dataset.n, val = id => { const i = document.getElementById(id); return i ? i.value : ''; };
    switch (n) {
      case 'mode': authMode = el.dataset.m; renderAuthBox(); break;
      case 'login': busy(el, async () => { const j = await api('login', { body: { email: val('aMail'), password: val('aPw') } }); await afterLogin(j.session); }); break;
      case 'signup': busy(el, async () => { const j = await api('signup', { body: { email: val('aMail'), password: val('aPw'), nick: val('aNick') } }); if (j.session) await afterLogin(j.session); else { toast('تم إنشاء الحساب، فعّل بريدك ثم سجّل الدخول'); authMode = 'login'; renderAuthBox(); } }); break;
      case 'forgot': busy(el, async () => { await api('recover', { body: { email: val('aMail') } }); toast('إن كان البريد مسجّلًا فقد أرسلنا رابط الاستعادة'); }); break;
      case 'resetpw': busy(el, async () => { await api('updatepw', { body: { token: recTok, password: val('rPw') } }); recTok = ''; toast('تم تغيير كلمة المرور، سجّل الدخول'); location.hash = '#/account'; }); break;
      case 'logout': setAuth(null); toast('تم تسجيل الخروج'); X.render(); break;
      case 'savenick': busy(el, async () => { await api('profile', { body: { nick: S.profile.nick, avatar: S.profile.avatar } }); toast('تم الحفظ ✓'); await loadMe(); }); break;
      case 'delme': if (confirm('سيُحذف حسابك وكل بياناته من الخادم نهائيًا. متأكد؟') && confirm('تأكيد أخير: لا يمكن التراجع.')) busy(el, async () => { await api('delme', { body: {} }); setAuth(null); toast('تم حذف حسابك'); X.render(); }); break;
      case 'dsave': { const t = val('dText').trim(); if (!t) return; const d = diary(); d.unshift({ text: t.slice(0, 1500), date: new Date().toISOString().slice(0, 10) }); store.set('diary', d.slice(0, 200)); X.render(); } break;
      case 'ddel': { const d = diary(); d.splice(+el.dataset.i, 1); store.set('diary', d); X.render(); } break;
      case 'cpost': busy(el, async () => { const j = await api('cpost', { body: { body: val('cText'), name: val('cName'), consent: document.getElementById('cConsent').checked } }); toast(j.status === 'pending' ? 'تم الإرسال، سيظهر بعد مراجعة المشرف' : 'تم النشر ✓'); X.render(); }); break;
      case 'ccm': { const box = document.getElementById('cm-' + el.dataset.id); if (box && box.innerHTML) box.innerHTML = ''; else loadComments(el.dataset.id); } break;
      case 'ccsend': busy(el, async () => { const id = el.dataset.id; await api('ccomment', { body: { post: id, body: val('cc-' + id) } }); loadComments(id); }); break;
      case 'crep': { if (!auth) { toast('سجّل الدخول للإبلاغ'); return; } const box = document.getElementById('rp-' + el.dataset.t + '-' + el.dataset.id); if (!box) return;
        box.innerHTML = `<div class="row" style="margin-top:8px"><select id="rr-${esc(el.dataset.id)}">${REASONS.map(r => `<option value="${r[0]}">${r[1]}</option>`).join('')}</select><button class="btn" data-n="crsend" data-t="${esc(el.dataset.t)}" data-id="${esc(el.dataset.id)}">إرسال البلاغ</button></div>`; } break;
      case 'crsend': busy(el, async () => { await api('report', { body: { type: el.dataset.t, id: el.dataset.id, reason: val('rr-' + el.dataset.id) } }); toast('وصل بلاغك، شكرًا لك'); const b = el.closest('[id^=rp-]'); if (b) b.innerHTML = ''; }); break;
      case 'cdel': if (confirm('حذف هذا المحتوى؟')) busy(el, async () => { await api('cdelete', { body: { type: el.dataset.t, id: el.dataset.id } }); if (el.dataset.t === 'post') loadPosts(); else loadComments(el.dataset.p); }); break;
    }
  });

  /* ---------- ما بعد عرض الصفحة ---------- */
  X.afterView = function (name, parts) {
    if (name === 'account') renderAuthBox();
    if (name === 'home' && cfg.db) {
      const p = cfg.settings.promo; if (p && p.enabled && p.text) {
        const ext = /^https?:/i.test(p.link || ''), tag = p.link ? 'a' : 'div';
        $('#view').insertAdjacentHTML('afterbegin', `<${tag} class="glass card promo" ${p.link ? `href="${esc(p.link)}"` : ''} ${ext ? 'target="_blank" rel="noopener sponsored"' : ''}>${esc(p.text)}</${tag}>`);
      }
    }
    if (['post', 'prompt', 'story'].includes(name) && parts && parts[1]) X.track('view', parts[1]);
  };
})();
