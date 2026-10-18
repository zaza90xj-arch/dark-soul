/* DARK SOUL — النواة: الحالة، البحث، البطاقات، التوجيه، الصفحات */
(function () {
  'use strict';
  const D = window.DS;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- تخزين محلي (يتحمل منع المتصفح للتخزين) ---------- */
  const mem = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ds:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
    set(k, v) { try { localStorage.setItem('ds:' + k, JSON.stringify(v)); } catch (e) { mem[k] = v; } }
  };

  const ACCENTS = [
    { id: 'blue', name: 'أزرق كهربائي', c: '#3d7bff' }, { id: 'purple', name: 'بنفسجي', c: '#a855f7' },
    { id: 'red', name: 'أحمر', c: '#ff3b4e' }, { id: 'pink', name: 'وردي', c: '#ff4d9d' }, { id: 'cyan', name: 'سماوي', c: '#22d3ee' }
  ];
  const lowEnd = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  const S = {
    favP: store.get('favP', []), favR: store.get('favR', []), likes: store.get('likes', []), saved: store.get('saved', []),
    stats: store.get('stats', {}), profile: store.get('profile', { nick: '', avatar: '🌑' }),
    settings: Object.assign({ color: 'auto', fx: lowEnd ? 'none' : 'rain', calm: false }, store.get('settings', {})),
    ai: false, accent: ACCENTS[0].c
  };
  const persist = () => { store.set('favP', S.favP); store.set('favR', S.favR); store.set('likes', S.likes); store.set('saved', S.saved); store.set('stats', S.stats); store.set('profile', S.profile); store.set('settings', S.settings); };

  /* ---------- تجهيز البيانات ---------- */
  D.quotes = D.quotes.map((t, i) => ({ id: 'q' + (i + 1), _k: 'q', text: t, added: '2026-10-05' }));
  D.posts.forEach(p => { p._k = 'p'; });
  D.prompts.forEach(p => { p._k = 'r'; });
  D.stories.forEach(s => { s._k = 's'; s.added = '2026-10-12'; });
  const byId = {};
  [].concat(D.posts, D.prompts, D.stories, D.quotes).forEach(x => { byId[x.id] = x; });
  function rebuildIndex() { D.posts.forEach(p => { p._k = 'p'; }); D.prompts.forEach(p => { p._k = 'r'; }); D.stories.forEach(x => { x._k = 's'; }); D.quotes.forEach(x => { x._k = 'q'; }); Object.keys(byId).forEach(k => delete byId[k]); [].concat(D.posts, D.prompts, D.stories, D.quotes).forEach(x => { byId[x.id] = x; }); }
  const catLabel = p => (D.CATS[p.cat] && D.CATS[p.cat].subs[p.sub]) || '';

  /* ---------- أدوات ---------- */
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* احتياطي */ }
    try { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-100px;opacity:0'; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, 99999); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }
  function bump(id, what) { const s = S.stats[id] || (S.stats[id] = { c: 0, l: 0, f: 0 }); s[what]++; persist(); if (window.DSX && window.DSX.track) window.DSX.track(what === 'c' ? 'copy' : what === 'l' ? 'like' : 'fav', id); }
  const dayIndex = n => Math.floor(Date.now() / 864e5) % n;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const shareUrl = it => (window.DSX && window.DSX.seo && it._k !== 'q') ? location.origin + '/p/' + it.id : location.origin + location.pathname + '#/' + ({ p: 'post', r: 'prompt', s: 'story' }[it._k] || 'quote') + (it._k === 'q' ? '' : '/' + it.id);
  const TREND = {};
  const score = id => { const s = S.stats[id]; return (s ? s.c + s.l * 2 + s.f * 3 : 0) + (TREND[id] || 0); };

  /* ---------- بحث يتحمل الأخطاء الإملائية ---------- */
  const norm = s => String(s || '').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').toLowerCase();
  function lev(a, b) {
    const m = a.length, n = b.length; if (Math.abs(m - n) > 1) return 9;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  }
  function hay(it) {
    if (it._h) return it;
    let t = '';
    if (it._k === 'p') t = it.title + ' ' + it.text + ' ' + catLabel(it) + ' ' + D.CATS[it.cat].label;
    else if (it._k === 'r') t = it.title + ' ' + it.desc + ' ' + it.text + ' ' + D.PCATS[it.cat] + ' ' + it.tool;
    else if (it._k === 's') t = it.title + ' ' + it.text + ' ' + it.genre;
    else t = it.text;
    it._h = norm(t); it._w = it._h.split(/[^\u0621-\u064Aa-z0-9]+/).filter(Boolean);
    return it;
  }
  function matchScore(it, tokens) {
    hay(it); let s = 0;
    for (const t of tokens) {
      if (it._h.includes(t)) s += 3;
      else if (t.length >= 4 && it._w.some(w => lev(w, t) <= 1)) s += 1.5;
      else return 0;
    }
    return s;
  }
  function allItems(type) {
    if (type === 'post') return D.posts; if (type === 'prompt') return D.prompts; if (type === 'story') return D.stories; if (type === 'quote') return D.quotes;
    return [].concat(D.posts, D.prompts, D.stories, D.quotes);
  }
  function runSearch(o) {
    const tokens = norm(o.q || '').split(/\s+/).filter(Boolean);
    let res = allItems(o.type || 'all').filter(it => {
      if (o.cat && it.cat !== o.cat) return false;
      if (o.sub && it.sub !== o.sub) return false;
      if (o.dial && it.dial && it.dial !== o.dial) return false;
      if (o.dial && !it.dial && (it._k === 'p')) return false;
      if (o.len && it.len && it.len !== o.len) return false;
      if (o.lang && it.lang && it.lang !== o.lang) return false;
      if (o.tool && it.tool && it.tool !== o.tool) return false;
      return true;
    });
    if (tokens.length) { res = res.map(it => ({ it, s: matchScore(it, tokens) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s || (b.it.feat ? 1 : 0) - (a.it.feat ? 1 : 0)).map(x => x.it); }
    return res;
  }

  /* ---------- بطاقات ---------- */
  const favOn = it => (it._k === 'p' ? S.favP : S.favR).includes(it.id);
  function acts(it, withDetails) {
    const d = `data-id="${it.id}"`;
    let h = `<button class="btn" data-act="copy" ${d}>⧉ نسخ</button><button class="btn" data-act="share" ${d}>↗ مشاركة</button>`;
    if (it._k === 'p' || it._k === 'r') h += `<button class="btn ${favOn(it) ? 'on' : ''}" data-act="fav" ${d} aria-pressed="${favOn(it)}">♥ مفضلة</button>`;
    if (it._k === 'p') h += `<button class="btn ${S.likes.includes(it.id) ? 'on' : ''}" data-act="like" ${d} aria-pressed="${S.likes.includes(it.id)}">👍 إعجاب</button>`;
    if (it._k === 'q' || it._k === 'p') h += `<button class="btn" data-act="design" ${d}>🎨 صمّمه</button>`;
    if (withDetails) h += `<a class="btn" href="#/${it._k === 'p' ? 'post' : it._k === 'r' ? 'prompt' : 'story'}/${it.id}">التفاصيل</a>`;
    return `<div class="acts">${h}</div>`;
  }
  function cardPost(p, full) {
    const t = full || p.text.length <= 180 ? p.text : p.text.slice(0, 165).trim() + '…';
    return `<article class="glass card"><div><span class="tag hot">${esc(catLabel(p))}</span><span class="tag">${p.dial === 'eg' ? 'مصري' : 'فصحى'}</span><span class="tag">${p.len === 's' ? 'قصير' : 'طويل'}</span></div>
      <h3>${full ? esc(p.title) : `<a href="#/post/${p.id}">${esc(p.title)}</a>`}</h3><p class="post-text">${esc(t)}</p>${acts(p, !full)}</article>`;
  }
  function cardPrompt(r, full) {
    const t = full || r.text.length <= 200 ? r.text : r.text.slice(0, 190).trim() + '…';
    return `<article class="glass card"><div><span class="tag hot">${esc(D.PCATS[r.cat])}</span><span class="tag">${r.lang === 'en' ? 'English' : 'عربي'}</span><span class="tag">${esc(r.tool)}</span><span class="tag">${r.len === 's' ? 'مختصر' : 'مفصّل'}</span></div>
      <h3>${full ? esc(r.title) : `<a href="#/prompt/${r.id}">${esc(r.title)}</a>`}</h3><p class="muted" style="margin:0">${esc(r.desc)}</p>
      <p class="post-text" ${r.lang === 'en' ? 'dir="ltr" style="text-align:left"' : ''}>${esc(t)}</p>${acts(r, !full)}</article>`;
  }
  function cardStory(s) {
    return `<article class="glass card"><div><span class="tag hot">${esc(s.genre)}</span></div><h3><a href="#/story/${s.id}">${esc(s.title)}</a></h3><p class="post-text">${esc(s.text.split('\n')[0].slice(0, 150))}…</p><div class="acts"><a class="btn primary" href="#/story/${s.id}">اقرأ القصة</a></div></article>`;
  }
  function cardQuote(q) { return `<article class="glass card"><p class="post-text" style="font-family:var(--display);font-size:1.15rem">«${esc(q.text)}»</p>${acts(q)}</article>`; }
  const cardFor = it => it._k === 'p' ? cardPost(it) : it._k === 'r' ? cardPrompt(it) : it._k === 's' ? cardStory(it) : cardQuote(it);

  /* ---------- قوائم بتحميل تدريجي ---------- */
  const LISTS = {}; const PAGE = 10;
  function listHtml(items, key) {
    LISTS[key] = { items, shown: 0 };
    if (!items.length) return `<div class="glass empty"><b>لا توجد نتائج</b>جرّب كلمة أخرى أو غيّر الفلاتر. يمكنك أيضًا <a href="#/factory" style="color:var(--accent)">إنشاء نص جديد في المصنع</a>.</div>`;
    return `<div class="grid g2" id="list-${key}"></div><div style="text-align:center;margin-top:14px" id="more-${key}"></div><p class="muted" style="text-align:center;font-size:.85rem" id="cnt-${key}"></p>`;
  }
  function fillList(key) {
    const L = LISTS[key]; if (!L) return;
    const box = $('#list-' + key); if (!box) return;
    const next = L.items.slice(L.shown, L.shown + PAGE);
    box.insertAdjacentHTML('beforeend', next.map(cardFor).join(''));
    L.shown += next.length;
    $('#cnt-' + key).textContent = `عرض ${L.shown} من ${L.items.length}`;
    $('#more-' + key).innerHTML = L.shown < L.items.length ? `<button class="btn big" data-act="more" data-key="${key}">عرض المزيد</button>` : '';
  }

  /* ---------- الصفحات ---------- */
  const V = {}; let after = null; let Q = {};
  const crumbs = (...a) => `<nav class="crumbs" aria-label="مسار الصفحة"><a href="#/">الرئيسية</a>${a.map(x => ' ‹ ' + x).join('')}</nav>`;
  const sectionHead = (t, link, lt) => `<div class="sec-title"><h2>${t}</h2>${link ? `<a href="${link}">${lt || 'المزيد'}</a>` : ''}</div>`;
  const backBtn = `<button class="btn" data-act="back">‹ رجوع</button>`;
  const sub = t => `<p class="muted" style="margin-top:-6px">${t}</p>`;

  V.home = function () {
    const pod = D.posts[dayIndex(D.posts.length)], prd = D.prompts[dayIndex(D.prompts.length)];
    const rp = pick(D.posts), rq = pick(D.quotes);
    const latest = D.posts.map((p, i) => ({ p, i })).sort((a, b) => b.p.added.localeCompare(a.p.added) || b.i - a.i).slice(0, 4).map(x => x.p);
    const trend = trending().slice(0, 4);
    const cats = Object.keys(D.CATS).map(k => `<a class="glass card catcard" style="--c:${D.CATS[k].hue}" href="#/${k}"><h3>${D.CATS[k].label}</h3><p>${Object.keys(D.CATS[k].subs).length} قسمًا فرعيًا · ${D.posts.filter(p => p.cat === k).length} نصًا</p></a>`).join('');
    return `<section class="glass hero"><div class="logo-big neon">${esc(window.DSX.logoText || 'DARK SOUL')}</div><p style="direction:ltr;margin-bottom:6px">A World of Feelings, Stories &amp; Prompts</p>
      <p>هنا للكلمات مكان، وللمشاعر صوت، ولكل حكاية مساحة.</p>
      <form class="search-big" data-form="search" role="search"><input type="search" id="homeQ" placeholder="ابحث: خذلان، اشتياق، قناع، لوجو..." aria-label="بحث"><button class="btn primary" type="submit">بحث</button></form></section>
      ${sectionHead('الأقسام')}<div class="grid g3">${cats}
      <a class="glass card catcard" style="--c:#22d3ee" href="#/prompts"><h3>مكتبة البرومبتات</h3><p>${D.prompts.length} برومبت في ${Object.keys(D.PCATS).length} تصنيفًا</p></a>
      <a class="glass card catcard" style="--c:#a855f7" href="#/factory"><h3>مصنع البوستات</h3><p>DARK SOUL STUDIO: اصنع نصًّا بالشعور واللهجة والطول</p></a>
      <a class="glass card catcard" style="--c:#ff4d9d" href="#/studio"><h3>استوديو التصميم</h3><p>حوّل النص إلى صورة PNG جاهزة للنشر</p></a></div>
      ${sectionHead('بوست اليوم', '#/today', 'صفحة اليوم')}${cardPost(pod)}
      ${sectionHead('برومبت اليوم', '#/prompts')}${cardPrompt(prd)}
      ${sectionHead('اقتباس مختار')}<div class="glass quote-box">«${esc(rq.text)}»<div class="acts" style="justify-content:center;margin-top:12px"><button class="btn" data-act="copy" data-id="${rq.id}">⧉ نسخ</button><button class="btn" data-act="design" data-id="${rq.id}">🎨 صمّمه</button><a class="btn" href="#/quote">اقتباس آخر</a></div></div>
      ${sectionHead('محتوى عشوائي')}${cardPost(rp)}
      ${sectionHead('أحدث الإضافات', '#/latest')}<div class="grid g2">${latest.map(p => cardPost(p)).join('')}</div>
      ${sectionHead('الأكثر رواجًا', '#/trending')}<div class="grid g2">${trend.map(cardFor).join('')}</div>
      ${sectionHead('قصص قصيرة', '#/stories')}<div class="grid g2">${D.stories.slice(0, 2).map(cardStory).join('')}</div>
      <div class="glass card" style="margin-top:22px;text-align:center"><h3>عندك فكرة أو شعور؟</h3><p class="muted">اكتب الموضوع واختر اللهجة والطول، واحصل على نصوص جاهزة للنسخ والتعديل.</p><a class="btn primary" href="#/factory">افتح المصنع</a> <a class="btn" href="#/favorites">♥ مفضلتي</a> <a class="btn" href="#/account">حسابي</a></div>`;
  };

  V.explore = function () {
    const blocks = Object.keys(D.CATS).map(k => `<div class="glass card" style="margin-bottom:12px"><h3 style="color:${D.CATS[k].hue}">${D.CATS[k].label}</h3><div class="chips" style="flex-wrap:wrap">${Object.entries(D.CATS[k].subs).map(([s, l]) => `<a class="btn" href="#/${k}?sub=${s}">${l}</a>`).join('')}</div></div>`).join('');
    const pc = `<div class="glass card"><h3 style="color:#22d3ee">تصنيفات البرومبتات</h3><div class="chips" style="flex-wrap:wrap">${Object.entries(D.PCATS).map(([k, l]) => `<a class="btn" href="#/prompts?cat=${k}">${l}</a>`).join('')}</div></div>`;
    return `${crumbs('استكشف')}<h1 class="neon">استكشف المحتوى</h1>${sub('اختر قسمًا، أو جرّب <a style="color:var(--accent)" href="#/search">البحث المتقدم</a>.')}${blocks}${pc}`;
  };

  function filterBar(key, st, withSubs) {
    const cat = D.CATS[key];
    const chips = withSubs ? `<div class="chips"><button class="btn ${!st.sub ? 'on' : ''}" data-act="fsub" data-v="">الكل</button>${Object.entries(cat.subs).map(([k, l]) => `<button class="btn ${st.sub === k ? 'on' : ''}" data-act="fsub" data-v="${k}">${l}</button>`).join('')}</div>` : '';
    return `${chips}<div class="row"><input type="search" id="libQ" value="${esc(st.q || '')}" placeholder="ابحث داخل هذا القسم" aria-label="بحث داخل القسم">
      <select id="libDial" aria-label="اللهجة"><option value="">كل اللهجات</option><option value="eg" ${st.dial === 'eg' ? 'selected' : ''}>المصرية</option><option value="ar" ${st.dial === 'ar' ? 'selected' : ''}>الفصحى</option></select>
      <select id="libLen" aria-label="الطول"><option value="">كل الأطوال</option><option value="s" ${st.len === 's' ? 'selected' : ''}>قصير (للحالات)</option><option value="l" ${st.len === 'l' ? 'selected' : ''}>طويل (للمنشورات)</option></select></div>`;
  }
  const UI = {};
  function libView(key) {
    const st = UI[key] || (UI[key] = { sub: '', q: '', dial: '', len: '' });
    if (Q.sub !== undefined) { st.sub = Q.sub; }
    const cat = D.CATS[key];
    after = () => refreshLib(key);
    const intro = { sad: 'كلمات لما لا يُقال: غدر، فراق، اشتياق، ووحدة.', love: 'رسائل وكلام من القلب بلهجتين وأطوال مختلفة.', action: 'قصص وشخصيات واقتباسات بأجواء سينمائية بلا دماء.' }[key];
    return `${crumbs(cat.label)}<h1 style="color:${cat.hue};text-shadow:0 0 18px ${cat.hue}">${cat.label}</h1>${sub(intro)}${filterBar(key, st, true)}<div id="libOut"></div>`;
  }
  function refreshLib(key) {
    const st = UI[key];
    const res = runSearch({ type: 'post', cat: key, sub: st.sub, dial: st.dial, len: st.len, q: st.q });
    const out = $('#libOut'); if (!out) return;
    out.innerHTML = listHtml(res, 'lib'); fillList('lib');
    $$('[data-act=fsub]').forEach(b => { const on = b.dataset.v === st.sub; b.classList.toggle('on', on); });
  }
  V.sad = () => libView('sad'); V.love = () => libView('love'); V.action = () => libView('action');

  V.post = function (parts) {
    const p = byId[parts[1]]; if (!p || p._k !== 'p') return V.notfound();
    const rel = D.posts.filter(x => x.sub === p.sub && x.id !== p.id).slice(0, 4);
    document.title = p.title + ' — DARK SOUL';
    return `${crumbs(`<a href="#/${p.cat}">${D.CATS[p.cat].label}</a>`, esc(p.title))}${cardPost(p, true)}<div style="margin-top:10px">${backBtn}</div>
      ${rel.length ? sectionHead('من القسم نفسه') + `<div class="grid g2">${rel.map(x => cardPost(x)).join('')}</div>` : ''}`;
  };
  V.prompt = function (parts) {
    const r = byId[parts[1]]; if (!r || r._k !== 'r') return V.notfound();
    const rel = D.prompts.filter(x => x.cat === r.cat && x.id !== r.id);
    document.title = r.title + ' — DARK SOUL';
    return `${crumbs('<a href="#/prompts">مكتبة البرومبتات</a>', esc(r.title))}${cardPrompt(r, true)}<div style="margin-top:10px">${backBtn}</div>
      ${rel.length ? sectionHead('برومبتات مشابهة') + `<div class="grid g2">${rel.map(x => cardPrompt(x)).join('')}</div>` : ''}`;
  };

  V.prompts = function () {
    const st = UI.prompts || (UI.prompts = { cat: '', q: '', lang: '', tool: '' });
    if (Q.cat !== undefined) st.cat = Q.cat;
    after = refreshPrompts;
    const tools = Array.from(new Set(D.prompts.map(p => p.tool)));
    return `${crumbs('مكتبة البرومبتات')}<h1 class="neon">مكتبة البرومبتات</h1>${sub('كل برومبت قابل للنسخ مباشرة. الصور بالإنجليزية لأنها تعطي نتائج أدق في أغلب المولّدات.')}
      <div class="chips"><button class="btn ${!st.cat ? 'on' : ''}" data-act="pcat" data-v="">الكل</button>${Object.entries(D.PCATS).map(([k, l]) => `<button class="btn ${st.cat === k ? 'on' : ''}" data-act="pcat" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="row"><input type="search" id="prQ" value="${esc(st.q)}" placeholder="ابحث في البرومبتات" aria-label="بحث في البرومبتات">
      <select id="prLang" aria-label="اللغة"><option value="">كل اللغات</option><option value="en" ${st.lang === 'en' ? 'selected' : ''}>English</option><option value="ar" ${st.lang === 'ar' ? 'selected' : ''}>العربية</option></select>
      <select id="prTool" aria-label="الأداة"><option value="">كل الأدوات</option>${tools.map(t => `<option ${st.tool === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
      <p><a class="btn" href="#/favorites?tab=r">♥ مفضلة البرومبتات (${S.favR.length})</a></p><div id="prOut"></div>`;
  };
  function refreshPrompts() {
    const st = UI.prompts; const out = $('#prOut'); if (!out) return;
    out.innerHTML = listHtml(runSearch({ type: 'prompt', cat: st.cat, lang: st.lang, tool: st.tool, q: st.q }), 'pr'); fillList('pr');
    $$('[data-act=pcat]').forEach(b => b.classList.toggle('on', b.dataset.v === st.cat));
  }

  V.today = function () {
    const pod = D.posts[dayIndex(D.posts.length)], prd = D.prompts[dayIndex(D.prompts.length)], q = D.quotes[dayIndex(D.quotes.length)];
    return `${crumbs('بوست اليوم')}<h1 class="neon">بوست اليوم</h1>${sub('يتغير تلقائيًا كل يوم.')}${cardPost(pod)}${sectionHead('برومبت اليوم')}${cardPrompt(prd)}${sectionHead('اقتباس اليوم')}${cardQuote(q)}`;
  };
  let lastQuote = null;
  V.quote = function () {
    let q = pick(D.quotes); if (D.quotes.length > 1) while (q === lastQuote) q = pick(D.quotes); lastQuote = q;
    return `${crumbs('اقتباس عشوائي')}<h1 class="neon">اقتباس عشوائي</h1><div class="glass quote-box" style="margin:14px 0">«${esc(q.text)}»</div>
      <div class="acts" style="justify-content:center"><a class="btn primary big" href="#/quote" data-act="again">اقتباس آخر</a><button class="btn big" data-act="copy" data-id="${q.id}">⧉ نسخ</button><button class="btn big" data-act="design" data-id="${q.id}">🎨 صمّمه</button></div>`;
  };
  V.stories = () => `${crumbs('قصص قصيرة')}<h1 class="neon">قصص قصيرة</h1>${sub('قصص أصلية قصيرة بين الحزن والغموض والأكشن.')}<div class="grid g2">${D.stories.map(cardStory).join('')}</div>`;
  V.story = function (parts) {
    const s = byId[parts[1]]; if (!s || s._k !== 's') return V.notfound();
    document.title = s.title + ' — DARK SOUL';
    return `${crumbs('<a href="#/stories">قصص قصيرة</a>', esc(s.title))}<article class="glass card"><span class="tag hot">${esc(s.genre)}</span><h1>${esc(s.title)}</h1><div class="post-text" style="font-size:1.08rem;line-height:2.1">${esc(s.text)}</div>
      <div class="acts"><button class="btn" data-act="copy" data-id="${s.id}">⧉ نسخ القصة</button><button class="btn" data-act="share" data-id="${s.id}">↗ مشاركة</button></div></article><p>${backBtn}</p>`;
  };

  function trending() {
    return [].concat(D.posts, D.prompts).map(it => ({ it, s: (it.feat ? 5 : 0) + score(it.id) })).sort((a, b) => b.s - a.s).map(x => x.it);
  }
  V.trending = function () {
    after = () => { const o = $('#trOut'); o.innerHTML = listHtml(trending().slice(0, 30), 'tr'); fillList('tr'); };
    return `${crumbs('الأكثر رواجًا')}<h1 class="neon">الأكثر رواجًا</h1><div class="note">الترتيب الحالي = اختيارات التحرير + تفاعلك أنت على هذا الجهاز (نسخ وإعجاب ومفضلة). أرقام الزوار الحقيقية تحتاج خادمًا وقاعدة بيانات، وهي ضمن المرحلة التالية.</div><div id="trOut"></div>`;
  };
  V.latest = function () {
    const items = [].concat(D.posts, D.prompts, D.stories).sort((a, b) => b.added.localeCompare(a.added) || (parseInt(b.id.slice(1)) - parseInt(a.id.slice(1))));
    after = () => { $('#ltOut').innerHTML = listHtml(items, 'lt'); fillList('lt'); };
    return `${crumbs('أحدث الإضافات')}<h1 class="neon">أحدث الإضافات</h1><div id="ltOut"></div>`;
  };

  V.favorites = function () {
    const tab = Q.tab || 'p';
    const posts = S.favP.map(i => byId[i]).filter(Boolean), prs = S.favR.map(i => byId[i]).filter(Boolean);
    let body = '';
    if (tab === 'p') body = posts.length ? `<div class="grid g2">${posts.map(p => cardPost(p)).join('')}</div>` : `<div class="glass empty"><b>لا توجد بوستات مفضلة بعد</b>اضغط ♥ على أي بوست ليظهر هنا. <br><a class="btn primary" style="margin-top:10px" href="#/explore">استكشف المحتوى</a></div>`;
    else if (tab === 'r') body = prs.length ? `<div class="grid g2">${prs.map(p => cardPrompt(p)).join('')}</div>` : `<div class="glass empty"><b>لا توجد برومبتات مفضلة بعد</b><a class="btn primary" style="margin-top:10px" href="#/prompts">تصفّح البرومبتات</a></div>`;
    else body = S.saved.length ? S.saved.map((s, i) => `<div class="glass card" style="margin-bottom:10px"><p class="post-text">${esc(s.text)}</p><div class="acts"><button class="btn" data-act="copysaved" data-i="${i}">⧉ نسخ</button><button class="btn" data-act="designsaved" data-i="${i}">🎨 صمّمه</button><button class="btn" data-act="delsaved" data-i="${i}">🗑 حذف</button></div></div>`).join('') : `<div class="glass empty"><b>لا توجد نصوص محفوظة</b>اصنع نصًّا في المصنع واضغط «حفظ».<br><a class="btn primary" style="margin-top:10px" href="#/factory">افتح المصنع</a></div>`;
    return `${crumbs('المفضلة')}<h1 class="neon">المفضلة</h1><div class="note">تُحفظ المفضلة على هذا الجهاز فقط ولا تتزامن بين الأجهزة. استخدم «النسخة الاحتياطية» في صفحة الحساب لنقلها.</div>
      <div class="chips"><a class="btn ${tab === 'p' ? 'on' : ''}" href="#/favorites?tab=p">البوستات (${posts.length})</a><a class="btn ${tab === 'r' ? 'on' : ''}" href="#/favorites?tab=r">البرومبتات (${prs.length})</a><a class="btn ${tab === 's' ? 'on' : ''}" href="#/favorites?tab=s">نصوصي المحفوظة (${S.saved.length})</a></div>${body}`;
  };

  V.search = function () {
    const st = UI.search || (UI.search = { q: '', type: 'all', cat: '', dial: '', len: '' });
    if (Q.q !== undefined) st.q = Q.q;
    after = refreshSearch;
    const catOpts = '<option value="">كل الأقسام</option><optgroup label="البوستات">' + Object.keys(D.CATS).map(k => `<option value="${k}" ${st.cat === k ? 'selected' : ''}>${D.CATS[k].label}</option>`).join('') + '</optgroup><optgroup label="البرومبتات">' + Object.entries(D.PCATS).map(([k, l]) => `<option value="${k}" ${st.cat === k ? 'selected' : ''}>${l}</option>`).join('') + '</optgroup>';
    const typeOpts = [['all', 'الكل'], ['post', 'بوستات'], ['prompt', 'برومبتات'], ['story', 'قصص'], ['quote', 'اقتباسات']].map(([v, l]) => `<option value="${v}" ${st.type === v ? 'selected' : ''}>${l}</option>`).join('');
    return `${crumbs('البحث المتقدم')}<h1 class="neon">البحث المتقدم</h1>${sub('البحث يتجاهل التشكيل ويتحمّل الأخطاء الإملائية البسيطة (مثل ه/ة وأ/ا).')}
      <div class="row"><input type="search" id="sQ" value="${esc(st.q)}" placeholder="اكتب كلمة أو أكثر" aria-label="كلمات البحث"></div>
      <div class="row"><select id="sType" aria-label="النوع">${typeOpts}</select><select id="sCat" aria-label="القسم">${catOpts}</select>
      <select id="sDial" aria-label="اللهجة"><option value="">كل اللهجات</option><option value="eg" ${st.dial === 'eg' ? 'selected' : ''}>المصرية</option><option value="ar" ${st.dial === 'ar' ? 'selected' : ''}>الفصحى</option></select>
      <select id="sLen" aria-label="الطول"><option value="">كل الأطوال</option><option value="s" ${st.len === 's' ? 'selected' : ''}>قصير</option><option value="l" ${st.len === 'l' ? 'selected' : ''}>طويل</option></select></div><div id="sOut" style="margin-top:12px"></div>`;
  };
  function refreshSearch() {
    const st = UI.search; const out = $('#sOut'); if (!out) return;
    const hasFilter = st.q || st.cat || st.dial || st.len || st.type !== 'all';
    if (!hasFilter) { out.innerHTML = `<div class="glass empty"><b>ابدأ بكتابة كلمة</b>مثال: خذلان · اشتياق · مطر · لوجو</div>`; return; }
    const res = runSearch(st);
    out.innerHTML = listHtml(res, 'se'); fillList('se');
  }

  V.account = function () {
    const av = ['🌑', '🖤', '🦇', '🐺', '🔥', '⚡', '🌙', '👁️', '🥀', '🎭'];
    const sw = [{ id: 'auto', name: 'تلقائي', c: 'conic-gradient(#3d7bff,#a855f7,#ff3b4e,#ff4d9d,#22d3ee,#3d7bff)' }].concat(ACCENTS).map(a => `<button class="sw ${S.settings.color === a.id ? 'on' : ''}" style="background:${a.c};color:${a.c.startsWith('#') ? a.c : '#fff'}" data-act="color" data-v="${a.id}" aria-label="${a.name}" title="${a.name}"></button>`).join('');
    const fxs = [['rain', 'مطر'], ['stars', 'نجوم'], ['particles', 'جسيمات ضوئية'], ['none', 'بدون خلفية متحركة']].map(([v, l]) => `<button class="btn ${S.settings.fx === v ? 'on' : ''}" data-act="fx" data-v="${v}">${l}</button>`).join('');
    return `${crumbs('حسابي')}<h1 class="neon">حسابي</h1>
      <div id="authBox"></div>
      <div class="glass card"><h3>الملف الشخصي</h3><label for="nick">الاسم المستعار (اختياري)</label><input type="text" id="nick" maxlength="30" value="${esc(S.profile.nick)}" placeholder="مثال: ظلّ الليل">
        <label>الصورة الرمزية</label><div class="chips">${av.map(a => `<button class="btn ${S.profile.avatar === a ? 'on' : ''}" data-act="avatar" data-v="${a}" style="font-size:1.3rem">${a}</button>`).join('')}</div>
        <p class="muted" style="margin:6px 0 0">الاسم يُستخدم تلقائيًا كتوقيع اختياري في استوديو التصميم.</p></div>
      <div class="glass card" style="margin-top:12px"><h3>المظهر والحركة</h3><label>لون النيون</label><div class="swatches">${sw}</div>
        <label>الخلفية المتحركة</label><div class="chips" style="flex-wrap:wrap">${fxs}</div>
        <label><input type="checkbox" id="calm" ${S.settings.calm ? 'checked' : ''} style="width:auto;min-height:0"> الوضع الهادئ (إيقاف كل الحركة والمؤثرات)</label></div>
      <div class="glass card" style="margin-top:12px"><h3>نسخة احتياطية</h3><p class="muted">صدّر المفضلة والنصوص المحفوظة والإعدادات كملف، ثم استوردها على جهاز آخر.</p>
        <div class="acts"><button class="btn" data-act="export">⬇ تصدير</button><label class="btn" style="margin:0">⬆ استيراد<input type="file" id="importFile" accept="application/json,.json" class="sr"></label><button class="btn" data-act="wipe">🗑 مسح بياناتي المحلية</button></div></div>
      <div class="glass card" style="margin-top:12px"><h3>المجتمع</h3><p class="muted" style="margin:0">مجتمع الخواطر والتعليقات معطّل حاليًا لأنه يحتاج مصادقة حقيقية وقاعدة بيانات وأدوات إشراف وبلاغات. سيُفعَّل في المرحلة التالية ولن يعمل بشكل صوري قبل ذلك.</p></div>`;
  };

  V.about = () => `${crumbs('عن DARK SOUL')}<h1 class="neon">عن DARK SOUL</h1><div class="glass card"><p>DARK SOUL مساحة عربية للمشاعر والكتابة والتصميم: بوستات حزينة، وكلام حب، وقصص أكشن وغموض، ومكتبة برومبتات، ومصنع نصوص، واستوديو يحوّل الكلمات إلى صور.</p>
    <p>النصوص في الموقع مكتوبة خصيصًا له. وكل ما يُعرض على أنه «ذكاء اصطناعي» سيكون كذلك فعلًا، وإلا سيُسمّى بما هو عليه: تركيب محلي أو اختيار من المكتبة.</p></div>
    <div class="glass card dev-about dev" style="margin-top:12px">𝑫𝒆𝒗: 𝑯𝒂𝒎𝒆𝒅 𝒂𝒍𝒔𝒉𝒉𝒂𝒕 𝑯𝒂𝒎𝒆𝒅</div>`;
  V.contact = () => `${crumbs('تواصل معنا')}<h1 class="neon">تواصل معنا</h1><div class="glass card"><p>للاقتراحات أو البلاغات أو طلب إضافة محتوى:</p>
    <div class="acts"><a class="btn primary" href="https://t.me/MODYXBOT1" target="_blank" rel="noopener">تيليجرام @MODYXBOT1</a><a class="btn" href="https://www.tiktok.com/@king_burd" target="_blank" rel="noopener">تيك توك @king_burd</a></div>
    <p class="muted" style="margin-top:12px">لا يوجد نموذج مراسلة داخل الموقع حاليًا لأنه يحتاج خادمًا؛ الروابط أعلاه هي القنوات الفعلية.</p></div>`;
  V.privacy = () => `${crumbs('سياسة الخصوصية')}<h1 class="neon">سياسة الخصوصية</h1><div class="glass card"><p>DARK SOUL في نسخته الحالية لا يجمع بيانات عنك ولا يتتبّعك.</p>
    <p>المفضلة والنصوص المحفوظة والإعدادات والاسم المستعار تُحفظ في متصفحك (localStorage) على جهازك فقط، ويمكنك مسحها من صفحة «حسابي».</p>
    <p>الخطوط تُحمَّل من Google Fonts، لذا قد تصل إليهم بيانات الاتصال المعتادة (مثل عنوان IP). إن فعّلت خاصية الذكاء الاصطناعي الاختيارية على الخادم فسيُرسَل النص الذي تكتبه إلى مزوّد الخدمة لإنتاج النتيجة، ولن تُرسل إليه أي بيانات أخرى.</p>
    <p>عند إضافة الحسابات والمجتمع مستقبلًا ستُحدَّث هذه الصفحة بما يُجمع وكيف يُحمى.</p></div>`;
  V.terms = () => `${crumbs('شروط الاستخدام')}<h1 class="neon">شروط الاستخدام</h1><div class="glass card"><p>المحتوى للقراءة والإلهام والمشاركة الشخصية. يمكنك نسخ النصوص واستخدامها في منشوراتك مع ذكر المصدر عند الإمكان، ولا يجوز إعادة بيعها كمجموعة.</p>
    <p>ممنوع استخدام الموقع أو أدواته لإيذاء الآخرين أو التحرش أو نشر محتوى مسيء. المحتوى الخيالي لا يمجّد العنف أو الأذى الحقيقي.</p>
    <p>الموقع مقدَّم «كما هو»، وقد تتغير ميزاته مع تطويره. النصوص ليست بديلًا عن الدعم النفسي؛ إن كنت تمر بوقت صعب فتحدّث مع شخص تثق به أو مختص.</p></div>`;
  V.notfound = function () {
    document.title = 'الصفحة غير موجودة — DARK SOUL';
    return `<div class="glass empty" style="padding:60px 16px"><div class="logo-big neon" style="font-family:var(--display);font-size:5rem;line-height:1">404</div><b style="margin-top:10px">ضاعت هذه الصفحة في الظلام</b><p>الرابط غير صحيح أو أن المحتوى حُذف.</p><a class="btn primary" href="#/">العودة للرئيسية</a> <a class="btn" href="#/search">ابحث عمّا تريد</a></div>`;
  };

  /* ---------- القوائم والتنقل ---------- */
  const NAV = [['', 'الرئيسية'], ['explore', 'استكشف'], ['sad', 'مكتبة الحزن'], ['love', 'الحب والرومانسية'], ['action', 'الأكشن والغموض'], ['prompts', 'البرومبتات'], ['factory', 'مصنع البوستات'], ['studio', 'استوديو التصميم'], ['today', 'بوست اليوم'], ['quote', 'اقتباس عشوائي'], ['stories', 'قصص قصيرة'], ['community', 'المجتمع'], ['favorites', 'المفضلة'], ['trending', 'الأكثر رواجًا'], ['latest', 'أحدث الإضافات'], ['search', 'البحث المتقدم'], ['account', 'حسابي'], ['about', 'عن DARK SOUL'], ['contact', 'تواصل معنا'], ['privacy', 'الخصوصية'], ['terms', 'الشروط']];
  function buildNav() {
    $('#navMain').innerHTML = NAV.slice(0, 8).map(([k, l]) => `<a href="#/${k}" data-nav="${k}">${l}</a>`).join('');
    $('#drawerSheet').innerHTML = `<h4>القائمة</h4>` + NAV.map(([k, l]) => `<a href="#/${k}" data-nav="${k}" data-act="closeMenu">${l}</a>`).join('');
    $('#footLinks').innerHTML = NAV.filter(n => ['about', 'contact', 'privacy', 'terms', 'search', 'favorites'].includes(n[0])).map(([k, l]) => `<a href="#/${k}">${l}</a>`).join('');
  }
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const q = {}; (qs || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); q[k] = decodeURIComponent(v || ''); });
    return { parts, q };
  }
  function render() {
    const { parts, q } = parseHash(); Q = q; after = null;
    const name = parts[0] || 'home';
    const fn = V[name] && name !== 'notfound' ? V[name] : V.notfound;
    document.title = 'DARK SOUL — عالم المشاعر والقصص والبرومبتات';
    let html;
    try { html = fn(parts); } catch (e) { console.error(e); html = `<div class="glass empty"><b>حدث خطأ أثناء عرض الصفحة</b>حاول مرة أخرى أو ارجع للرئيسية.<br><a class="btn primary" style="margin-top:10px" href="#/">الرئيسية</a></div>`; }
    const view = $('#view'); view.innerHTML = html;
    $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (name === 'home' ? '' : name)));
    if (after) after();
    if (!(name === 'quote' && window.__sameQuote)) window.scrollTo(0, 0);
    if (window.DSX && DSX.afterView) DSX.afterView(name, parts);
  }

  /* ---------- الأحداث ---------- */
  function updateBtn(b, on) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
  async function onAct(el) {
    const act = el.dataset.act, id = el.dataset.id, it = id ? byId[id] : null;
    switch (act) {
      case 'copy': if (it) { const ok = await copyText(it._k === 'q' ? it.text : (it.title && it._k === 's' ? it.title + '\n\n' + it.text : it.text)); toast(ok ? 'تم النسخ ✓' : 'تعذّر النسخ، انسخ النص يدويًا'); if (ok) bump(id, 'c'); } break;
      case 'share': if (it) { const url = shareUrl(it); if (navigator.share) { try { await navigator.share({ title: it.title || 'DARK SOUL', text: (it.text || '').slice(0, 120), url }); } catch (e) { /* أُلغيت */ } } else { const ok = await copyText(url); toast(ok ? 'تم نسخ رابط المشاركة ✓' : url); } } break;
      case 'fav': if (it) { const arr = it._k === 'p' ? S.favP : S.favR; const i = arr.indexOf(id); if (i < 0) { arr.push(id); bump(id, 'f'); toast('أُضيف إلى المفضلة ♥'); } else { arr.splice(i, 1); toast('أُزيل من المفضلة'); } persist(); if (window.DSX.onFav) window.DSX.onFav(id, it._k === 'p' ? 'post' : 'prompt', i < 0); $$(`[data-act=fav][data-id="${id}"]`).forEach(b => updateBtn(b, i < 0)); if (parseHash().parts[0] === 'favorites') render(); } break;
      case 'like': { const i = S.likes.indexOf(id); if (i < 0) { S.likes.push(id); bump(id, 'l'); } else S.likes.splice(i, 1); persist(); $$(`[data-act=like][data-id="${id}"]`).forEach(b => updateBtn(b, i < 0)); } break;
      case 'design': if (it) { store.set('studioText', it.text); location.hash = '#/studio'; } break;
      case 'more': fillList(el.dataset.key); break;
      case 'back': history.length > 1 ? history.back() : (location.hash = '#/'); break;
      case 'fsub': UI[parseHash().parts[0]].sub = el.dataset.v; refreshLib(parseHash().parts[0]); break;
      case 'pcat': UI.prompts.cat = el.dataset.v; refreshPrompts(); break;
      case 'closeMenu': toggleMenu(false); break;
      case 'again': window.__sameQuote = false; if (location.hash === '#/quote') { render(); } break;
      case 'copysaved': { const ok = await copyText(S.saved[el.dataset.i].text); toast(ok ? 'تم النسخ ✓' : 'تعذّر النسخ'); } break;
      case 'designsaved': store.set('studioText', S.saved[el.dataset.i].text); location.hash = '#/studio'; break;
      case 'delsaved': S.saved.splice(+el.dataset.i, 1); persist(); render(); break;
      case 'color': S.settings.color = el.dataset.v; store.set('colorChosen', true); persist(); DSX.applyTheme(); render(); break;
      case 'fx': S.settings.fx = el.dataset.v; persist(); DSX.applyFx(); render(); break;
      case 'avatar': S.profile.avatar = el.dataset.v; persist(); render(); break;
      case 'export': { const blob = new Blob([JSON.stringify({ app: 'dark-soul', v: 1, favP: S.favP, favR: S.favR, likes: S.likes, saved: S.saved, profile: S.profile, settings: S.settings }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dark-soul-backup.json'; document.body.appendChild(a); a.click(); a.remove(); toast('جارٍ تنزيل النسخة الاحتياطية'); } break;
      case 'wipe': if (confirm('سيتم مسح المفضلة والنصوص المحفوظة والإعدادات من هذا الجهاز. متأكد؟')) { S.favP = []; S.favR = []; S.likes = []; S.saved = []; S.stats = {}; S.profile = { nick: '', avatar: '🌑' }; persist(); toast('تم المسح'); render(); } break;
      default: if (window.DSX && DSX.act) DSX.act(act, el);
    }
  }
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    if (el.tagName === 'A' && el.dataset.act === 'again') { window.__sameQuote = true; }
    if (el.tagName === 'A' && el.dataset.act !== 'again' && el.dataset.act !== 'closeMenu') return;
    if (el.tagName !== 'A') e.preventDefault();
    onAct(el);
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form=search]'); if (!f) return; e.preventDefault();
    const q = $('#homeQ').value.trim(); location.hash = '#/search?q=' + encodeURIComponent(q);
  });
  let dbT;
  const deb = fn => { clearTimeout(dbT); dbT = setTimeout(fn, 180); };
  document.addEventListener('input', e => {
    const id = e.target.id, name = parseHash().parts[0];
    if (id === 'libQ') { UI[name].q = e.target.value; deb(() => refreshLib(name)); }
    else if (id === 'prQ') { UI.prompts.q = e.target.value; deb(refreshPrompts); }
    else if (id === 'sQ') { UI.search.q = e.target.value; deb(refreshSearch); }
    else if (id === 'nick') { S.profile.nick = e.target.value.slice(0, 30); persist(); }
  });
  document.addEventListener('change', e => {
    const id = e.target.id, name = parseHash().parts[0], v = e.target.value;
    if (id === 'libDial') { UI[name].dial = v; refreshLib(name); } else if (id === 'libLen') { UI[name].len = v; refreshLib(name); }
    else if (id === 'prLang') { UI.prompts.lang = v; refreshPrompts(); } else if (id === 'prTool') { UI.prompts.tool = v; refreshPrompts(); }
    else if (id === 'sType') { UI.search.type = v; refreshSearch(); } else if (id === 'sCat') { UI.search.cat = v; refreshSearch(); }
    else if (id === 'sDial') { UI.search.dial = v; refreshSearch(); } else if (id === 'sLen') { UI.search.len = v; refreshSearch(); }
    else if (id === 'calm') { S.settings.calm = e.target.checked; persist(); DSX.applyFx(); }
    else if (id === 'importFile') {
      const f = e.target.files[0]; if (!f) return; const rd = new FileReader();
      rd.onload = () => { try { const j = JSON.parse(rd.result); if (j.app !== 'dark-soul') throw 0; ['favP', 'favR', 'likes', 'saved'].forEach(k => { if (Array.isArray(j[k])) S[k] = Array.from(new Set(S[k].concat(j[k].filter(x => typeof x === 'string' || (x && typeof x.text === 'string'))))).slice(0, 500); }); if (j.profile && typeof j.profile === 'object') S.profile = { nick: String(j.profile.nick || '').slice(0, 30), avatar: String(j.profile.avatar || '🌑').slice(0, 4) }; persist(); toast('تم الاستيراد ✓'); render(); } catch (err) { toast('الملف غير صالح'); } };
      rd.readAsText(f);
    }
  });
  function toggleMenu(open) { const d = $('#drawer'); d.classList.toggle('open', open); d.setAttribute('aria-hidden', !open); if (open) $('#drawerSheet a').focus(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { toggleMenu(false); hideSplash(); } });
  window.addEventListener('hashchange', render);

  /* ---------- شاشة البداية ---------- */
  function hideSplash() { const s = $('#splash'); if (!s.classList.contains('show')) return; s.classList.add('out'); setTimeout(() => { s.classList.remove('show', 'out'); }, 600); try { sessionStorage.setItem('ds:splash', '1'); } catch (e) { /* تجاهل */ } }
  function maybeSplash() {
    let seen = false; try { seen = sessionStorage.getItem('ds:splash') === '1'; } catch (e) { /* تجاهل */ }
    const h = location.hash.replace('#', '');
    if (!seen && (h === '' || h === '/')) $('#splash').classList.add('show');
  }

  /* ---------- تصدير للأجزاء الأخرى ---------- */
  window.DSX = { rebuildIndex, TREND, D, S, V, $, $$, esc, store, persist, toast, copyText, pick, shuffle, runSearch, byId, norm, ACCENTS, render, parseHash, bump, setAfter: f => { after = f; } };

  window.addEventListener('load', function () {
    buildNav();
    $('#menuBtn').addEventListener('click', () => toggleMenu(true));
    $('#enterBtn').addEventListener('click', hideSplash);
    $('#fxBtn').addEventListener('click', () => { S.settings.calm = !S.settings.calm; persist(); DSX.applyFx(); toast(S.settings.calm ? 'تم إيقاف الحركة والمؤثرات' : 'تم تشغيل الحركة والمؤثرات'); });
    maybeSplash();
    render();
    if (window.DSX.netInit) window.DSX.netInit();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
  });
})();
