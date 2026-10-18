/* DARK SOUL — لوحة الإدارة. كل عملية تُفحص صلاحيتها على الخادم (api/app.js)؛ الواجهة هنا للعرض فقط. */
(function () {
  'use strict';
  const D = window.DS, API = '/api/app';
  const $ = s => document.querySelector(s), esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ss = { get: k => { try { return sessionStorage.getItem('ds:' + k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { v ? sessionStorage.setItem('ds:' + k, v) : sessionStorage.removeItem('ds:' + k); } catch (e) { /* تجاهل */ } } };
  let tab = 'overview', info = null, settings = {}, flt = { kind: '', status: '', q: '' }, editing = null;
  let toastT; const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); };

  async function api(r, o) {
    o = o || {};
    const go = async () => { const h = { 'Content-Type': 'application/json' }, t = ss.get('at'); if (t) h.Authorization = 'Bearer ' + t; const res = await fetch(API + '?r=' + r + (o.q ? '&' + new URLSearchParams(o.q) : ''), { method: o.body ? 'POST' : 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined }); let j = {}; try { j = await res.json(); } catch (e) { /* تجاهل */ } return { res, j }; };
    let out = await go();
    if (out.res.status === 401 && ss.get('ar') && r !== 'login' && r !== 'refresh') {
      try { const rr = await fetch(API + '?r=refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: ss.get('ar') }) }); const rj = await rr.json(); if (rr.ok) { ss.set('at', rj.session.access_token); ss.set('ar', rj.session.refresh_token); out = await go(); } } catch (e) { /* تجاهل */ }
    }
    if (!out.res.ok) { const e = new Error(out.j.error || 'خطأ في الاتصال'); e.status = out.res.status; throw e; } return out.j;
  }
  const run = async (btn, fn) => { if (btn) btn.disabled = true; try { return await fn(); } catch (e) { toast(e.message); } finally { if (btn) btn.disabled = false; } };

  /* ---------- الدخول ---------- */
  function loginView(msg) {
    $('#outBtn').style.display = 'none';
    $('#app').innerHTML = `<div class="glass card" style="max-width:420px;margin:30px auto"><h2 class="neon">دخول الإدارة</h2>${msg ? `<div class="note">${esc(msg)}</div>` : ''}<label for="em">البريد الإلكتروني</label><input type="text" id="em" dir="ltr" inputmode="email" autocomplete="email"><label for="pw">كلمة المرور</label><input type="password" id="pw" dir="ltr" autocomplete="current-password"><p><button class="btn primary big" data-a="login" style="width:100%;justify-content:center">دخول</button></p><p class="muted" style="font-size:.85rem">الصلاحية تُمنح من قاعدة البيانات فقط (انظر README)، وليس من هذه الصفحة.</p></div>`;
  }
  async function boot() {
    if (!ss.get('at')) return loginView();
    try { info = await api('a_overview'); $('#outBtn').style.display = ''; await loadSettings(); render(); }
    catch (e) { if (e.status === 403) { ss.set('at', ''); ss.set('ar', ''); loginView('هذا الحساب ليس مديرًا ولا مشرفًا.'); } else if (e.status === 401) loginView('انتهت الجلسة، سجّل الدخول.'); else loginView(e.message); }
  }
  async function loadSettings() { if (info.me.role === 'admin') { try { settings = (await api('a_settings')).settings || {}; } catch (e) { /* تجاهل */ } } }

  /* ---------- الإطار ---------- */
  const TABS = [['overview', 'نظرة عامة'], ['content', 'المحتوى'], ['moderation', 'المراجعة'], ['users', 'المستخدمون'], ['cats', 'التصنيفات'], ['settings', 'الإعدادات'], ['import', 'استيراد']];
  function render() {
    const isAdmin = info.me.role === 'admin', tabs = TABS.filter(t => isAdmin || t[0] === 'overview' || t[0] === 'moderation');
    $('#app').innerHTML = `<div class="chips">${tabs.map(([k, l]) => `<button class="btn ${tab === k ? 'on' : ''}" data-a="tab" data-v="${k}">${l}</button>`).join('')}</div><div id="pane"></div>`;
    ({ overview: pOverview, content: pContent, moderation: pModeration, users: pUsers, cats: pCats, settings: pSettings, import: pImport }[tab])();
  }

  /* ---------- نظرة عامة ---------- */
  function pOverview() {
    const c = info.counts, tot = {}; (info.stats || []).forEach(s => { tot[s.type] = (tot[s.type] || 0) + s.n; });
    const cards = [['منشور', c.published], ['مسودات', c.pending], ['مخفي', c.hidden], ['مجدول', c.scheduled], ['مستخدمون', c.users], ['بانتظار المراجعة', c.community_pending], ['بلاغات مفتوحة', c.reports_open]].map(([l, n]) => `<div class="glass stat"><b>${n}</b>${l}</div>`).join('');
    $('#pane').innerHTML = `<p class="muted">${esc(info.me.email)} · ${info.me.role === 'admin' ? 'مدير' : 'مشرف'}</p><div class="grid g3">${cards}</div>
      <h3 style="margin-top:20px">آخر 7 أيام (مجهول الهوية)</h3><div class="grid g3">${[['view', 'مشاهدات'], ['copy', 'نسخ'], ['like', 'إعجاب'], ['fav', 'مفضلة']].map(([k, l]) => `<div class="glass stat"><b>${tot[k] || 0}</b>${l}</div>`).join('')}</div>
      <h3 style="margin-top:20px">الأكثر تفاعلًا (30 يومًا)</h3>${info.top.length ? `<table class="table">${info.top.map(t => `<tr><td dir="ltr">${esc(t.item_id)}</td><td>نقاط: ${t.score}</td><td>مشاهدات: ${t.views}</td></tr>`).join('')}</table>` : '<div class="glass empty">لا توجد بيانات بعد.</div>'}`;
  }

  /* ---------- المحتوى ---------- */
  const cc = () => settings.custom_cats || { sub: {}, pcat: {} };
  const allSubs = cat => Object.assign({}, (D.CATS[cat] || { subs: {} }).subs, (cc().sub || {})[cat] || {});
  const allPcats = () => Object.assign({}, D.PCATS, cc().pcat || {});
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  async function pContent() {
    $('#pane').innerHTML = `<div class="row"><input type="search" id="fq" placeholder="بحث في العنوان والنص" value="${esc(flt.q)}">${sel('fk', [['', 'كل الأنواع'], ['post', 'بوستات'], ['prompt', 'برومبتات'], ['story', 'قصص'], ['quote', 'اقتباسات']], flt.kind)}${sel('fs', [['', 'كل الحالات'], ['published', 'منشور'], ['pending', 'مسودة'], ['hidden', 'مخفي'], ['scheduled', 'مجدول']], flt.status)}<button class="btn" data-a="search">بحث</button><button class="btn primary" data-a="new">+ جديد</button></div><div id="editor"></div><div id="clist"></div>`;
    if (editing) editorView(); await listContent();
  }
  async function listContent() {
    const box = $('#clist'); box.innerHTML = '<div class="glass empty">جارٍ التحميل…</div>';
    try {
      const j = await api('a_content', { q: { kind: flt.kind, status: flt.status, q: flt.q } });
      box.innerHTML = j.items.length ? j.items.map(it => `<div class="glass card" style="margin-top:8px"><div><span class="badge">${esc(it.kind)}</span><span class="badge ${it.status === 'published' ? 'ok' : it.status === 'hidden' ? 'off' : 'warn'}">${esc(it.status)}</span>${it.featured ? '<span class="badge ok">★ مميز</span>' : ''}<span class="muted" dir="ltr" style="font-size:.8rem"> ${esc(it.id)}</span></div>
        <strong>${esc(it.title || '(بدون عنوان)')}</strong><div class="trunc">${esc(it.body)}</div>
        <div class="acts" style="margin-top:6px"><button class="btn" data-a="edit" data-id="${esc(it.id)}">تعديل</button><button class="btn" data-a="feat" data-id="${esc(it.id)}" data-v="${it.featured ? 0 : 1}">${it.featured ? 'إلغاء التمييز' : '★ تمييز'}</button><button class="btn" data-a="pub" data-id="${esc(it.id)}" data-v="${it.status === 'published' ? 'hidden' : 'published'}">${it.status === 'published' ? 'إخفاء' : 'نشر'}</button><button class="btn" data-a="del" data-id="${esc(it.id)}">🗑 حذف</button></div></div>`).join('') : '<div class="glass empty"><b>لا توجد عناصر</b>إن كانت قاعدتك فارغة فاستورد المحتوى الأولي من تبويب «استيراد».</div>';
      box._items = j.items;
    } catch (e) { box.innerHTML = `<div class="glass empty">${esc(e.message)}</div>`; }
  }
  function editorView() {
    const it = editing, k = it.kind || 'post';
    const toLocal = d => { if (!d) return ''; const x = new Date(d); return isNaN(x) ? '' : new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
    const catOpts = k === 'post' ? Object.keys(D.CATS).map(c => [c, D.CATS[c].label]) : k === 'prompt' ? Object.entries(allPcats()) : [];
    const subOpts = k === 'post' ? Object.entries(allSubs(it.cat || 'sad')) : [];
    $('#editor').innerHTML = `<div class="glass card" style="margin-top:10px"><h3>${it.id ? 'تعديل' : 'عنصر جديد'}</h3>
      <div class="row">${sel('e-kind', [['post', 'بوست'], ['prompt', 'برومبت'], ['story', 'قصة'], ['quote', 'اقتباس']], k)}${sel('e-status', [['published', 'منشور'], ['pending', 'مسودة'], ['hidden', 'مخفي'], ['scheduled', 'مجدول']], it.status || 'published')}<input type="datetime-local" id="e-pub" value="${toLocal(it.publish_at)}" aria-label="وقت النشر المجدول"></div>
      ${catOpts.length ? `<div class="row">${sel('e-cat', catOpts, it.cat || catOpts[0][0])}${k === 'post' ? sel('e-sub', subOpts, it.sub) + sel('e-dial', [['eg', 'مصرية'], ['ar', 'فصحى']], it.dial || 'ar') : sel('e-lang', [['en', 'English'], ['ar', 'عربي']], it.lang || 'en') + '<input type="text" id="e-tool" placeholder="الأداة" value="' + esc(it.tool || 'أي مولّد صور') + '">'}</div>` : ''}
      ${k === 'story' ? `<label>النوع</label><input type="text" id="e-genre" value="${esc(it.genre || '')}" placeholder="حزن / غموض / أكشن">` : ''}
      ${k !== 'quote' ? `<label>العنوان</label><input type="text" id="e-title" maxlength="120" value="${esc(it.title || '')}">` : ''}
      ${k === 'prompt' ? `<label>الوصف</label><input type="text" id="e-descr" maxlength="200" value="${esc(it.descr || '')}">` : ''}
      <label>النص</label><textarea id="e-body" style="min-height:160px" maxlength="6000">${esc(it.body || '')}</textarea>
      <label><input type="checkbox" id="e-feat" ${it.featured ? 'checked' : ''} style="width:auto;min-height:0"> محتوى مميز</label>
      <p><button class="btn primary" data-a="save">حفظ</button> <button class="btn" data-a="cancel">إلغاء</button></p></div>`;
  }
  const g = id => { const e = document.getElementById(id); return e ? e.value : ''; };
  function readEditor() {
    const k = g('e-kind'), it = { id: editing.id, kind: k, status: g('e-status'), body: g('e-body'), featured: document.getElementById('e-feat').checked };
    if (it.status === 'scheduled') it.publish_at = g('e-pub');
    if (k === 'post') { it.cat = g('e-cat'); it.sub = g('e-sub'); it.dial = g('e-dial'); }
    if (k === 'prompt') { it.cat = g('e-cat'); it.lang = g('e-lang'); it.tool = g('e-tool'); it.descr = g('e-descr'); }
    if (k === 'story') it.genre = g('e-genre');
    if (k !== 'quote') it.title = g('e-title');
    return it;
  }

  /* ---------- المراجعة ---------- */
  async function pModeration() {
    $('#pane').innerHTML = '<div class="glass empty">جارٍ التحميل…</div>';
    try {
      const j = await api('a_moderation'), b = (t, id, a, l) => `<button class="btn" data-a="mod" data-t="${t}" data-id="${esc(id)}" data-v="${a}">${l}</button>`;
      const RS = { spam: 'إزعاج', abuse: 'إساءة', selfharm: 'إيذاء نفس', other: 'آخر' };
      $('#pane').innerHTML = `<h3>منشورات بانتظار الموافقة (${j.pending.length})</h3>${j.pending.map(p => `<div class="glass card" style="margin-bottom:8px"><div class="muted">${esc(p.display_name)}</div><p class="post-text">${esc(p.body)}</p><div class="acts">${b('post', p.id, 'approve', '✓ موافقة')}${b('post', p.id, 'hide', 'إخفاء')}${b('post', p.id, 'delete', '🗑 حذف')}</div></div>`).join('') || '<div class="glass empty">لا شيء بانتظار المراجعة.</div>'}
        <h3 style="margin-top:20px">بلاغات مفتوحة (${j.reports.length})</h3>${j.reports.map(r => `<div class="glass card" style="margin-bottom:8px"><span class="badge off">${r.reasons.length} بلاغ</span><span class="badge">${r.type === 'post' ? 'منشور' : 'تعليق'}</span> <span class="muted">${esc(Array.from(new Set(r.reasons)).map(x => RS[x] || x).join('، '))}</span>
          <p class="post-text">${r.target ? esc(r.target.body) + ` <span class="badge">${esc(r.target.status)}</span>` : '(المحتوى محذوف)'}</p><div class="acts">${b(r.type, r.id, 'dismiss', 'تجاهل البلاغ')}${b(r.type, r.id, 'hide', 'إخفاء')}${b(r.type, r.id, 'delete', '🗑 حذف')}</div></div>`).join('') || '<div class="glass empty">لا توجد بلاغات.</div>'}`;
    } catch (e) { $('#pane').innerHTML = `<div class="glass empty">${esc(e.message)}</div>`; }
  }

  /* ---------- المستخدمون ---------- */
  async function pUsers() {
    $('#pane').innerHTML = '<div class="row"><input type="search" id="uq" placeholder="بحث بالاسم المستعار"><button class="btn" data-a="usearch">بحث</button></div><div id="ulist"></div>'; await listUsers('');
  }
  async function listUsers(q) {
    const box = $('#ulist'); try {
      const j = await api('a_users', { q: { q } });
      box.innerHTML = j.items.map(u => `<div class="glass card" style="margin-top:8px"><strong>${esc(u.nick || '(بدون اسم)')}</strong> <span class="muted" dir="ltr">${esc(u.email)}</span> ${u.banned ? '<span class="badge off">مقيَّد</span>' : ''}
        <div class="row" style="margin-top:6px">${sel('ur-' + u.id, [['user', 'عضو'], ['mod', 'مشرف'], ['admin', 'مدير']], u.role)}<button class="btn" data-a="urole" data-id="${esc(u.id)}">حفظ الصلاحية</button><button class="btn" data-a="uban" data-id="${esc(u.id)}" data-v="${u.banned ? 0 : 1}">${u.banned ? 'رفع التقييد' : 'تقييد (حظر النشر)'}</button></div></div>`).join('') || '<div class="glass empty">لا يوجد مستخدمون.</div>';
    } catch (e) { box.innerHTML = `<div class="glass empty">${esc(e.message)}</div>`; }
  }

  /* ---------- التصنيفات ---------- */
  function pCats() {
    const c = cc(), rows = [];
    Object.keys(c.sub || {}).forEach(s => Object.entries(c.sub[s]).forEach(([k, l]) => rows.push(`<tr><td>${esc(D.CATS[s] ? D.CATS[s].label : s)}</td><td dir="ltr">${esc(k)}</td><td>${esc(l)}</td><td><button class="btn" data-a="rmsub" data-s="${esc(s)}" data-k="${esc(k)}">حذف</button></td></tr>`)));
    Object.entries(c.pcat || {}).forEach(([k, l]) => rows.push(`<tr><td>برومبتات</td><td dir="ltr">${esc(k)}</td><td>${esc(l)}</td><td><button class="btn" data-a="rmpcat" data-k="${esc(k)}">حذف</button></td></tr>`));
    $('#pane').innerHTML = `<div class="glass card"><h3>إضافة تصنيف فرعي</h3><div class="row">${sel('c-sec', [...Object.keys(D.CATS).map(k => [k, D.CATS[k].label]), ['__p', 'تصنيف برومبتات']], 'sad')}<input type="text" id="c-key" dir="ltr" placeholder="مفتاح لاتيني: fear" maxlength="20"><input type="text" id="c-label" placeholder="الاسم بالعربي" maxlength="40"><button class="btn primary" data-a="addcat">إضافة</button></div><p class="muted" style="font-size:.85rem">التصنيفات الأصلية ثابتة؛ هنا تضيف تصنيفات جديدة تظهر في الموقع والمحرر فورًا.</p></div>
      <h3 style="margin-top:16px">التصنيفات المضافة</h3>${rows.length ? `<table class="table">${rows.join('')}</table>` : '<div class="glass empty">لا توجد تصنيفات مضافة.</div>'}`;
  }
  const saveCats = () => api('a_setting', { body: { key: 'custom_cats', value: cc() } }).then(() => { toast('تم الحفظ ✓'); pCats(); });

  /* ---------- الإعدادات ---------- */
  function pSettings() {
    const s = settings, p = s.promo || {};
    $('#pane').innerHTML = `<div class="glass card"><h3>الهوية</h3><label>رسالة الترحيب</label><textarea id="s-welcome" maxlength="300" style="min-height:80px">${esc(s.welcome || '')}</textarea><label>نص الشعار</label><input type="text" id="s-logo" maxlength="24" value="${esc(s.logo_text || '')}"><label>اللون الافتراضي للزوار الجدد</label>${sel('s-color', [['auto', 'تلقائي'], ['blue', 'أزرق'], ['purple', 'بنفسجي'], ['red', 'أحمر'], ['pink', 'وردي'], ['cyan', 'سماوي']], s.default_color || 'auto')}</div>
      <div class="glass card" style="margin-top:12px"><h3>المجتمع</h3><label><input type="checkbox" id="s-com" ${s.community_enabled ? 'checked' : ''} style="width:auto;min-height:0"> تفعيل المجتمع</label><label><input type="checkbox" id="s-pre" ${s.community_premod !== false ? 'checked' : ''} style="width:auto;min-height:0"> مراجعة المنشورات قبل ظهورها (موصى به)</label></div>
      <div class="glass card" style="margin-top:12px"><h3>مساحة ترويجية في الرئيسية</h3><label><input type="checkbox" id="s-pe" ${p.enabled ? 'checked' : ''} style="width:auto;min-height:0"> إظهار</label><label>النص</label><input type="text" id="s-pt" maxlength="140" value="${esc(p.text || '')}"><label>الرابط (https:// أو #/)</label><input type="text" id="s-pl" dir="ltr" maxlength="200" value="${esc(p.link || '')}"></div>
      <p><button class="btn primary big" data-a="savesettings">حفظ الإعدادات</button></p>`;
  }

  /* ---------- الاستيراد ---------- */
  function pImport() {
    $('#pane').innerHTML = `<div class="glass card"><h3>استيراد المحتوى الأولي</h3><p>ينقل كل ما في الموقع الآن (${D.posts.length} بوست، ${D.prompts.length} برومبت، ${D.stories.length} قصص، ${D.quotes.length} اقتباسًا) إلى قاعدة البيانات مع الحفاظ على معرّفاتها. بعدها يصير الموقع كله مدارًا من هذه اللوحة، ويمكنك تعديل أو حذف أي عنصر. آمن للتكرار (لا يُنشئ نسخًا مكررة).</p><p><button class="btn primary big" data-a="import">ابدأ الاستيراد</button></p><div id="imp" class="muted"></div></div>`;
  }
  async function doImport(btn) {
    const items = [];
    D.posts.forEach(p => items.push({ id: p.id, kind: 'post', cat: p.cat, sub: p.sub, dial: p.dial, title: p.title, body: p.text, featured: p.feat, created_at: p.added + 'T12:00:00Z' }));
    D.prompts.forEach(p => items.push({ id: p.id, kind: 'prompt', cat: p.cat, title: p.title, descr: p.desc, body: p.text, lang: p.lang, tool: p.tool, featured: p.feat, created_at: p.added + 'T12:00:00Z' }));
    D.stories.forEach(s => items.push({ id: s.id, kind: 'story', title: s.title, genre: s.genre, body: s.text, created_at: '2026-10-12T12:00:00Z' }));
    D.quotes.forEach((q, i) => items.push({ id: 'q' + (i + 1), kind: 'quote', body: q, created_at: '2026-10-05T12:00:00Z' }));
    let done = 0; const box = $('#imp');
    for (let i = 0; i < items.length; i += 100) {
      const chunk = items.slice(i, i + 100), last = i + 100 >= items.length;
      await api('a_import', { body: { items: chunk, final: last } }); done += chunk.length; box.textContent = `تم استيراد ${done} من ${items.length}…`;
    }
    box.textContent = `اكتمل: ${done} عنصرًا. حدّث الموقع لترى النتيجة.`; toast('اكتمل الاستيراد ✓'); await loadSettings();
  }

  /* ---------- الأحداث ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a, id = el.dataset.id;
    switch (a) {
      case 'login': run(el, async () => { const j = await api('login', { body: { email: g('em'), password: g('pw') } }); ss.set('at', j.session.access_token); ss.set('ar', j.session.refresh_token); await boot(); }); break;
      case 'tab': tab = el.dataset.v; editing = null; render(); break;
      case 'search': flt = { q: g('fq'), kind: g('fk'), status: g('fs') }; listContent(); break;
      case 'new': editing = {}; editorView(); window.scrollTo(0, 0); break;
      case 'cancel': editing = null; $('#editor').innerHTML = ''; break;
      case 'edit': { const it = ($('#clist')._items || []).find(x => x.id === id); if (it) { editing = Object.assign({}, it); editorView(); window.scrollTo(0, 0); } } break;
      case 'save': run(el, async () => { await api('a_save', { body: { item: readEditor() } }); toast('تم الحفظ ✓'); editing = null; $('#editor').innerHTML = ''; listContent(); }); break;
      case 'feat': case 'pub': run(el, async () => { const it = ($('#clist')._items || []).find(x => x.id === id); if (!it) return; await api('a_save', { body: { item: Object.assign({}, it, a === 'feat' ? { featured: el.dataset.v === '1' } : { status: el.dataset.v }) } }); listContent(); }); break;
      case 'del': if (confirm('حذف هذا العنصر نهائيًا؟')) run(el, async () => { await api('a_delete', { body: { id } }); listContent(); }); break;
      case 'mod': run(el, async () => { await api('a_mod', { body: { type: el.dataset.t, id, action: el.dataset.v } }); info = await api('a_overview'); pModeration(); }); break;
      case 'usearch': listUsers(g('uq')); break;
      case 'urole': run(el, async () => { await api('a_user', { body: { id, role: g('ur-' + id) } }); toast('تم ✓'); }); break;
      case 'uban': run(el, async () => { await api('a_user', { body: { id, banned: el.dataset.v === '1' } }); listUsers(g('uq')); }); break;
      case 'addcat': run(el, async () => { const sec = g('c-sec'), k = g('c-key').trim(), l = g('c-label').trim(); if (!/^[a-z0-9_]{2,20}$/.test(k) || !l) { toast('المفتاح لاتيني (2-20) والاسم مطلوب'); return; } const c = cc(); settings.custom_cats = c; if (sec === '__p') (c.pcat = c.pcat || {})[k] = l; else { c.sub = c.sub || {}; (c.sub[sec] = c.sub[sec] || {})[k] = l; } await saveCats(); }); break;
      case 'rmsub': run(el, async () => { const c = cc(); delete c.sub[el.dataset.s][el.dataset.k]; settings.custom_cats = c; await saveCats(); }); break;
      case 'rmpcat': run(el, async () => { const c = cc(); delete c.pcat[el.dataset.k]; settings.custom_cats = c; await saveCats(); }); break;
      case 'savesettings': run(el, async () => {
        const sets = [['welcome', g('s-welcome')], ['logo_text', g('s-logo')], ['default_color', g('s-color')], ['community_enabled', document.getElementById('s-com').checked], ['community_premod', document.getElementById('s-pre').checked], ['promo', { enabled: document.getElementById('s-pe').checked, text: g('s-pt'), link: g('s-pl') }]];
        for (const [key, value] of sets) await api('a_setting', { body: { key, value } }); await loadSettings(); toast('تم حفظ الإعدادات ✓');
      }); break;
      case 'import': if (confirm('بدء استيراد المحتوى إلى قاعدة البيانات؟')) run(el, () => doImport(el)); break;
    }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'e-kind') { editing = Object.assign(readEditor(), { kind: e.target.value, cat: '', sub: '' }); editorView(); }
    if (e.target.id === 'e-cat' && g('e-kind') === 'post') { editing = Object.assign(readEditor(), { cat: e.target.value, sub: '' }); editorView(); }
  });
  $('#outBtn').addEventListener('click', () => { ss.set('at', ''); ss.set('ar', ''); loginView('تم تسجيل الخروج.'); });
  boot();
})();
