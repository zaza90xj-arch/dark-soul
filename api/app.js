// DARK SOUL — الخادم (ملف واحد) على Vercel Serverless
// متغيرات البيئة (من إعدادات Vercel، لا تضعها في الكود أبدًا):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY   ← للحسابات والمحتوى والإدارة
//   AI_API_KEY (اختياري), AI_MODEL (اختياري), SITE_URL (اختياري)
// التحقق من الصلاحيات يتم هنا على الخادم في كل طلب؛ إخفاء رابط الإدارة وحده لا يحمي شيئًا.

const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const ANON = process.env.SUPABASE_ANON_KEY || '';
const SVC = process.env.SUPABASE_SERVICE_KEY || '';
const configured = () => !!(SB_URL && ANON && SVC);

class HttpErr extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = m => new HttpErr(400, m);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const KINDS = ['post', 'prompt', 'story', 'quote'];
const STATUSES = ['published', 'pending', 'hidden', 'scheduled'];
const COLORS = ['auto', 'blue', 'purple', 'red', 'pink', 'cyan'];

/* ---------- أدوات عامة ---------- */
const hits = new Map();
function limited(key, max, ms) {
  const now = Date.now(); const arr = (hits.get(key) || []).filter(t => now - t < ms); arr.push(now); hits.set(key, arr);
  if (hits.size > 8000) hits.clear();
  return arr.length > max;
}
const clientIp = req => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const oneLine = (s, n) => clean(s, n).replace(/\s+/g, ' ');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeParse = s => { try { return JSON.parse(s) || {}; } catch (e) { return {}; } };
const enc = encodeURIComponent;
const origin = req => process.env.SITE_URL || ('https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'localhost'));

async function http(url, opts, ms) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms || 12000);
  try { return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal })); }
  catch (e) { throw new HttpErr(504, 'تعذّر الاتصال بالخدمة، حاول مجددًا'); }
  finally { clearTimeout(t); }
}
async function sb(path, o) {
  o = o || {};
  const r = await http(SB_URL + '/rest/v1/' + path, {
    method: o.method || 'GET',
    headers: Object.assign({ apikey: SVC, Authorization: 'Bearer ' + SVC, 'Content-Type': 'application/json' }, o.prefer ? { Prefer: o.prefer } : {}, o.headers || {}),
    body: o.body !== undefined ? JSON.stringify(o.body) : undefined
  });
  const txt = await r.text(); let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
  if (!r.ok) { console.error('sb', r.status, path.split('?')[0], String(txt).slice(0, 200)); throw new HttpErr(502, 'خطأ في قاعدة البيانات'); }
  return o.raw ? { data, headers: r.headers } : data;
}
async function sbCount(path) {
  const { headers } = await sb(path + (path.includes('?') ? '&' : '?') + 'select=id&limit=1', { prefer: 'count=exact', raw: true, headers: { Range: '0-0' } });
  const m = /\/(\d+)$/.exec(headers.get('content-range') || ''); return m ? +m[1] : 0;
}
async function gotrue(path, method, body, token) {
  const r = await http(SB_URL + '/auth/v1/' + path, { method, headers: { apikey: ANON, Authorization: 'Bearer ' + (token || ANON), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text(); return { ok: r.ok, status: r.status, j: safeParse(txt) };
}
function authMsg(res) {
  const m = String(res.j.msg || res.j.error_description || res.j.message || '').toLowerCase(), c = String(res.j.error_code || '');
  if (c === 'user_already_exists' || m.includes('already')) return 'هذا البريد مسجّل مسبقًا';
  if (c === 'invalid_credentials' || m.includes('invalid login')) return 'البريد أو كلمة المرور غير صحيحة';
  if (c === 'email_not_confirmed' || m.includes('not confirmed')) return 'فعّل بريدك أولًا من الرسالة التي وصلتك';
  if (c === 'weak_password' || m.includes('password')) return 'كلمة المرور ضعيفة، استخدم 8 أحرف على الأقل';
  if (res.status === 429 || m.includes('rate')) return 'محاولات كثيرة، انتظر قليلًا';
  return 'تعذّر تنفيذ الطلب';
}
const sessionOut = j => ({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: { id: j.user && j.user.id, email: j.user && j.user.email } });

/* ---------- هوية المستخدم ---------- */
const tokenCache = new Map();
async function whoami(req) {
  const tok = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!tok || tok.length > 4000) return null;
  const c = tokenCache.get(tok); if (c && c.exp > Date.now()) return c.val;
  const r = await gotrue('user', 'GET', null, tok);
  if (!r.ok || !r.j.id) return null;
  let rows = await sb(`profiles?id=eq.${r.j.id}&select=id,nick,avatar,role,banned`);
  if (!rows.length) rows = await sb('profiles', { method: 'POST', prefer: 'return=representation,resolution=ignore-duplicates', body: { id: r.j.id } }) || [];
  const p = rows[0] || { id: r.j.id, nick: '', avatar: '🌑', role: 'user', banned: false };
  const val = { id: r.j.id, email: r.j.email, profile: p };
  tokenCache.set(tok, { val, exp: Date.now() + 20000 }); if (tokenCache.size > 500) tokenCache.clear();
  return val;
}
function need(ctx, level) {
  if (!ctx.me) throw new HttpErr(401, 'سجّل الدخول أولًا');
  const role = ctx.me.profile.role;
  if (level === 'admin' && role !== 'admin') throw new HttpErr(403, 'هذه العملية للمدير فقط');
  if (level === 'mod' && !['admin', 'mod'].includes(role)) throw new HttpErr(403, 'ليست لديك صلاحية');
  if (level === 'write' && ctx.me.profile.banned) throw new HttpErr(403, 'تم تقييد حسابك من الإشراف');
}

/* ---------- إعدادات الموقع ---------- */
let setCache = { t: 0, v: null };
async function settings(force) {
  if (!force && setCache.v && Date.now() - setCache.t < 30000) return setCache.v;
  const rows = await sb('site_settings?select=key,value'); const v = {}; rows.forEach(r => { v[r.key] = r.value; });
  setCache = { t: Date.now(), v }; return v;
}

/* ---------- الإجراءات ---------- */
const A = {};

A.config = async ctx => {
  const out = { db: configured(), ai: !!process.env.AI_API_KEY, settings: {} };
  if (configured()) {
    try { const s = await settings(); ['welcome', 'logo_text', 'default_color', 'community_enabled', 'community_premod', 'seed_imported', 'promo', 'custom_cats'].forEach(k => { out.settings[k] = s[k]; }); } catch (e) { out.db = false; }
  }
  ctx.cache = 's-maxage=30, stale-while-revalidate=120'; return out;
};

A.content = async ctx => {
  const now = new Date().toISOString();
  const rows = await sb('content?select=id,kind,cat,sub,dial,lang,tool,genre,title,descr,body,featured,created_at&or=' + enc(`(status.eq.published,and(status.eq.scheduled,publish_at.lte.${now}))`) + '&order=created_at.desc&limit=2500');
  ctx.cache = 's-maxage=60, stale-while-revalidate=300'; return { items: rows };
};

A.track = async ctx => {
  if (ctx.method !== 'POST') throw new HttpErr(405, 'غير مسموح');
  if (limited('tr:' + ctx.ip, 80, 60000)) return { ok: true };
  const type = ctx.body.type, item = ctx.body.item;
  if (!['view', 'copy', 'like', 'fav'].includes(type) || !SAFE_ID.test(String(item || ''))) throw bad('بيانات غير صالحة');
  await sb('events', { method: 'POST', body: { type, item_id: item }, prefer: 'return=minimal' }); return { ok: true };
};
A.trend = async ctx => { const rows = await sb('trending?select=item_id,score,views&order=score.desc&limit=60'); ctx.cache = 's-maxage=120'; return { items: rows }; };

/* --- حسابات --- */
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
A.signup = async ctx => {
  if (limited('su:' + ctx.ip, 6, 3600000)) throw new HttpErr(429, 'محاولات كثيرة، حاول لاحقًا');
  const email = clean(ctx.body.email, 254).toLowerCase(), pw = String(ctx.body.password || ''), nick = oneLine(ctx.body.nick, 30);
  if (!EMAIL.test(email)) throw bad('البريد الإلكتروني غير صالح');
  if (pw.length < 8 || pw.length > 72) throw bad('كلمة المرور من 8 إلى 72 حرفًا');
  const r = await gotrue('signup', 'POST', { email, password: pw, data: { nick } });
  if (!r.ok) throw bad(authMsg(r));
  if (r.j.access_token) return { session: sessionOut(r.j) };
  return { needs_confirm: true };
};
A.login = async ctx => {
  if (limited('li:' + ctx.ip, 15, 600000)) throw new HttpErr(429, 'محاولات كثيرة، انتظر قليلًا');
  const email = clean(ctx.body.email, 254).toLowerCase(), pw = String(ctx.body.password || '');
  if (!EMAIL.test(email) || !pw) throw bad('أدخل البريد وكلمة المرور');
  const r = await gotrue('token?grant_type=password', 'POST', { email, password: pw });
  if (!r.ok) throw new HttpErr(401, authMsg(r));
  return { session: sessionOut(r.j) };
};
A.refresh = async ctx => {
  const rt = String(ctx.body.refresh_token || '').slice(0, 500); if (!rt) throw bad('لا توجد جلسة');
  const r = await gotrue('token?grant_type=refresh_token', 'POST', { refresh_token: rt });
  if (!r.ok) throw new HttpErr(401, 'انتهت الجلسة، سجّل الدخول مجددًا');
  return { session: sessionOut(r.j) };
};
A.recover = async ctx => {
  if (limited('rc:' + ctx.ip, 4, 3600000)) throw new HttpErr(429, 'محاولات كثيرة، حاول لاحقًا');
  const email = clean(ctx.body.email, 254).toLowerCase(); if (!EMAIL.test(email)) throw bad('البريد غير صالح');
  await gotrue('recover?redirect_to=' + enc(origin(ctx.req) + '/'), 'POST', { email });
  return { ok: true }; // نفس الرد دائمًا حتى لا نكشف وجود الحساب
};
A.updatepw = async ctx => {
  const tok = String(ctx.body.token || '').slice(0, 4000), pw = String(ctx.body.password || '');
  if (pw.length < 8 || pw.length > 72) throw bad('كلمة المرور من 8 إلى 72 حرفًا');
  const r = await gotrue('user', 'PUT', { password: pw }, tok); if (!r.ok) throw bad('انتهت صلاحية رابط الاستعادة، اطلب رابطًا جديدًا');
  return { ok: true };
};

/* --- الحساب والمفضلة --- */
A.me = async ctx => {
  need(ctx, 'user'); const id = ctx.me.id;
  const [favs, st] = await Promise.all([sb(`favorites?user_id=eq.${id}&select=item_id,kind&limit=1000`), sb(`user_settings?user_id=eq.${id}&select=data`)]);
  const p = ctx.me.profile; return { user: { id, email: ctx.me.email }, profile: { nick: p.nick, avatar: p.avatar, role: p.role, banned: p.banned }, favorites: favs, settings: (st[0] && st[0].data) || {} };
};
A.profile = async ctx => {
  need(ctx, 'user'); const nick = oneLine(ctx.body.nick, 30), avatar = clean(ctx.body.avatar || '🌑', 8) || '🌑';
  await sb(`profiles?id=eq.${ctx.me.id}`, { method: 'PATCH', body: { nick, avatar }, prefer: 'return=minimal' }); tokenCache.clear(); return { ok: true };
};
A.favs = async ctx => {
  need(ctx, 'user'); const id = ctx.me.id, add = Array.isArray(ctx.body.add) ? ctx.body.add.slice(0, 300) : [], rem = Array.isArray(ctx.body.remove) ? ctx.body.remove.slice(0, 300) : [];
  const rows = add.filter(x => x && SAFE_ID.test(String(x.id)) && ['post', 'prompt'].includes(x.kind)).map(x => ({ user_id: id, item_id: x.id, kind: x.kind }));
  if (rows.length) await sb('favorites?on_conflict=user_id,item_id', { method: 'POST', body: rows, prefer: 'resolution=ignore-duplicates,return=minimal' });
  const ids = rem.map(String).filter(x => SAFE_ID.test(x));
  if (ids.length) await sb(`favorites?user_id=eq.${id}&item_id=in.(${ids.map(enc).join(',')})`, { method: 'DELETE', prefer: 'return=minimal' });
  return { ok: true };
};
A.usersettings = async ctx => {
  need(ctx, 'user'); const d = ctx.body.data || {}, data = { color: COLORS.includes(d.color) ? d.color : 'auto', fx: ['rain', 'stars', 'particles', 'none'].includes(d.fx) ? d.fx : 'rain', calm: !!d.calm };
  await sb('user_settings?on_conflict=user_id', { method: 'POST', body: { user_id: ctx.me.id, data }, prefer: 'resolution=merge-duplicates,return=minimal' }); return { ok: true };
};
A.delme = async ctx => {
  need(ctx, 'user'); if (ctx.me.profile.role === 'admin' && (await sbCount('profiles?role=eq.admin')) < 2) throw bad('أنت المدير الوحيد؛ عيّن مديرًا آخر قبل حذف حسابك');
  const r = await http(`${SB_URL}/auth/v1/admin/users/${ctx.me.id}`, { method: 'DELETE', headers: { apikey: SVC, Authorization: 'Bearer ' + SVC } });
  if (!r.ok) throw new HttpErr(502, 'تعذّر حذف الحساب'); tokenCache.clear(); return { ok: true };
};

/* --- المجتمع --- */
async function communityOn() { const s = await settings(); if (!s.community_enabled) throw new HttpErr(403, 'المجتمع غير مفعّل حاليًا'); return s; }
A.cposts = async ctx => {
  await communityOn(); const off = Math.max(0, parseInt(ctx.q.get('offset'), 10) || 0);
  const rows = await sb(`community_posts?select=id,user_id,display_name,body,created_at&status=eq.published&order=created_at.desc&limit=20&offset=${off}`);
  return { items: rows.map(r => ({ id: r.id, name: r.display_name, body: r.body, at: r.created_at, mine: !!(ctx.me && ctx.me.id === r.user_id) })) };
};
A.ccomments = async ctx => {
  await communityOn(); const pid = ctx.q.get('post'); if (!UUID.test(pid || '')) throw bad('معرّف غير صالح');
  const rows = await sb(`comments?select=id,user_id,display_name,body,created_at&post_id=eq.${pid}&status=eq.published&order=created_at.asc&limit=100`);
  return { items: rows.map(r => ({ id: r.id, name: r.display_name, body: r.body, at: r.created_at, mine: !!(ctx.me && ctx.me.id === r.user_id) })) };
};
function spamCheck(body) { if ((body.match(/https?:\/\/|www\./gi) || []).length > 1) throw bad('الروابط ممنوعة في المنشورات (رابط واحد كحد أقصى)'); if (/(.)\1{9,}/.test(body)) throw bad('النص يحتوي تكرارًا مفرطًا'); }
A.cpost = async ctx => {
  need(ctx, 'write'); const s = await communityOn(); const body = clean(ctx.body.body, 800);
  if (body.length < 10) throw bad('اكتب 10 أحرف على الأقل'); if (ctx.body.consent !== true) throw bad('أكّد موافقتك على نشر النص علنًا');
  spamCheck(body);
  const since = new Date(Date.now() - 3600000).toISOString();
  if ((await sbCount(`community_posts?user_id=eq.${ctx.me.id}&created_at=gte.${enc(since)}`)) >= 3) throw new HttpErr(429, 'الحد 3 منشورات في الساعة');
  const day = new Date(Date.now() - 86400000).toISOString();
  if ((await sbCount(`community_posts?user_id=eq.${ctx.me.id}&body=eq.${enc(body)}&created_at=gte.${enc(day)}`)) > 0) throw bad('نشرت هذا النص من قبل');
  const name = oneLine(ctx.body.name, 24) || ctx.me.profile.nick || 'مجهول'; const status = s.community_premod === false ? 'published' : 'pending';
  await sb('community_posts', { method: 'POST', body: { user_id: ctx.me.id, display_name: name, body, status }, prefer: 'return=minimal' });
  return { status };
};
A.ccomment = async ctx => {
  need(ctx, 'write'); await communityOn(); const pid = String(ctx.body.post || ''), body = clean(ctx.body.body, 300);
  if (!UUID.test(pid)) throw bad('معرّف غير صالح'); if (body.length < 2) throw bad('التعليق قصير جدًا'); spamCheck(body);
  if (!(await sbCount(`community_posts?id=eq.${pid}&status=eq.published`))) throw new HttpErr(404, 'المنشور غير موجود');
  const since = new Date(Date.now() - 3600000).toISOString();
  if ((await sbCount(`comments?user_id=eq.${ctx.me.id}&created_at=gte.${enc(since)}`)) >= 10) throw new HttpErr(429, 'الحد 10 تعليقات في الساعة');
  const name = oneLine(ctx.body.name, 24) || ctx.me.profile.nick || 'مجهول';
  await sb('comments', { method: 'POST', body: { post_id: pid, user_id: ctx.me.id, display_name: name, body }, prefer: 'return=minimal' }); return { ok: true };
};
A.report = async ctx => {
  need(ctx, 'write'); const type = ctx.body.type, id = String(ctx.body.id || ''), reason = ctx.body.reason;
  if (!['post', 'comment'].includes(type) || !UUID.test(id) || !['spam', 'abuse', 'selfharm', 'other'].includes(reason)) throw bad('بيانات غير صالحة');
  await sb('reports?on_conflict=target_type,target_id,reporter', { method: 'POST', body: { target_type: type, target_id: id, reporter: ctx.me.id, reason }, prefer: 'resolution=ignore-duplicates,return=minimal' });
  const n = await sbCount(`reports?target_type=eq.${type}&target_id=eq.${id}&status=eq.open`);
  if (n >= 3) await sb(`${type === 'post' ? 'community_posts' : 'comments'}?id=eq.${id}`, { method: 'PATCH', body: { status: 'hidden' }, prefer: 'return=minimal' }); // إخفاء احترازي حتى يراجعه المشرف
  return { ok: true };
};
A.cdelete = async ctx => {
  need(ctx, 'user'); const type = ctx.body.type, id = String(ctx.body.id || ''); if (!['post', 'comment'].includes(type) || !UUID.test(id)) throw bad('بيانات غير صالحة');
  await sb(`${type === 'post' ? 'community_posts' : 'comments'}?id=eq.${id}&user_id=eq.${ctx.me.id}`, { method: 'DELETE', prefer: 'return=minimal' }); return { ok: true };
};

/* --- الإدارة --- */
A.a_overview = async ctx => {
  need(ctx, 'mod'); const day7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [pub, pen, hid, sch, users, cpen, rep, stats, top] = await Promise.all([
    sbCount('content?status=eq.published'), sbCount('content?status=eq.pending'), sbCount('content?status=eq.hidden'), sbCount('content?status=eq.scheduled'),
    sbCount('profiles?id=not.is.null'), sbCount('community_posts?status=eq.pending'), sbCount('reports?status=eq.open'),
    sb(`stats_daily?select=day,type,n&day=gte.${day7}&order=day.asc`), sb('trending?select=item_id,score,views&order=score.desc&limit=10')]);
  return { counts: { published: pub, pending: pen, hidden: hid, scheduled: sch, users, community_pending: cpen, reports_open: rep }, stats, top, me: { email: ctx.me.email, role: ctx.me.profile.role } };
};
A.a_content = async ctx => {
  need(ctx, 'admin'); let q = 'content?select=id,kind,cat,sub,dial,lang,tool,genre,title,descr,body,featured,status,publish_at,created_at&order=created_at.desc&limit=50';
  const kind = ctx.q.get('kind'), status = ctx.q.get('status'), s = (ctx.q.get('q') || '').replace(/[,()*%\\:]/g, ' ').trim().slice(0, 40), off = Math.max(0, parseInt(ctx.q.get('offset'), 10) || 0);
  if (KINDS.includes(kind)) q += '&kind=eq.' + kind; if (STATUSES.includes(status)) q += '&status=eq.' + status; if (s) q += '&or=' + enc(`(title.ilike.*${s}*,body.ilike.*${s}*)`);
  return { items: await sb(q + '&offset=' + off) };
};
function normItem(it, uid) {
  if (!KINDS.includes(it.kind)) throw bad('نوع المحتوى غير صالح');
  const body = clean(it.body, 6000); if (!body) throw bad('النص مطلوب');
  const status = STATUSES.includes(it.status) ? it.status : 'published';
  const row = { kind: it.kind, cat: oneLine(it.cat, 30) || null, sub: oneLine(it.sub, 30) || null, dial: ['eg', 'ar'].includes(it.dial) ? it.dial : null, lang: ['en', 'ar'].includes(it.lang) ? it.lang : null, tool: oneLine(it.tool, 40) || null, genre: oneLine(it.genre, 30) || null, title: oneLine(it.title, 120), descr: oneLine(it.descr, 200), body, featured: !!it.featured, status, publish_at: null };
  if (status === 'scheduled') { const d = new Date(it.publish_at); if (isNaN(d)) throw bad('حدّد وقت النشر المجدول'); row.publish_at = d.toISOString(); }
  if (it.id && SAFE_ID.test(String(it.id))) row.id = String(it.id);
  if (it.created_at && !isNaN(new Date(it.created_at))) row.created_at = new Date(it.created_at).toISOString();
  if (uid) row.created_by = uid; return row;
}
A.a_save = async ctx => {
  need(ctx, 'admin'); const row = normItem(ctx.body.item || {}, ctx.me.id);
  if (row.id) { const id = row.id; delete row.id; delete row.created_by; delete row.created_at; await sb(`content?id=eq.${enc(id)}`, { method: 'PATCH', body: row, prefer: 'return=minimal' }); return { id }; }
  const out = await sb('content', { method: 'POST', body: row, prefer: 'return=representation' }); return { id: out[0].id };
};
A.a_delete = async ctx => { need(ctx, 'admin'); const id = String(ctx.body.id || ''); if (!SAFE_ID.test(id)) throw bad('معرّف غير صالح'); await sb(`content?id=eq.${enc(id)}`, { method: 'DELETE', prefer: 'return=minimal' }); return { ok: true }; };
A.a_import = async ctx => {
  need(ctx, 'admin'); const items = Array.isArray(ctx.body.items) ? ctx.body.items.slice(0, 120) : [];
  const rows = items.map(it => { const r = normItem(Object.assign({}, it, { status: 'published' }), ctx.me.id); if (!r.id) throw bad('كل عنصر مستورد يحتاج معرّفًا'); return r; });
  if (rows.length) await sb('content?on_conflict=id', { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=minimal' });
  if (ctx.body.final) { await sb('site_settings?on_conflict=key', { method: 'POST', body: { key: 'seed_imported', value: true }, prefer: 'resolution=merge-duplicates,return=minimal' }); setCache.t = 0; }
  return { imported: rows.length };
};
A.a_moderation = async ctx => {
  need(ctx, 'mod');
  const [posts, reps] = await Promise.all([sb('community_posts?select=id,display_name,body,created_at&status=eq.pending&order=created_at.asc&limit=50'), sb('reports?select=id,target_type,target_id,reason,created_at&status=eq.open&order=created_at.asc&limit=100')]);
  const ids = t => Array.from(new Set(reps.filter(r => r.target_type === t).map(r => r.target_id))).filter(x => UUID.test(x));
  const pIds = ids('post'), cIds = ids('comment');
  const [tp, tc] = await Promise.all([pIds.length ? sb(`community_posts?select=id,display_name,body,status&id=in.(${pIds.join(',')})`) : [], cIds.length ? sb(`comments?select=id,display_name,body,status&id=in.(${cIds.join(',')})`) : []]);
  const tmap = {}; tp.forEach(x => { tmap['post:' + x.id] = x; }); tc.forEach(x => { tmap['comment:' + x.id] = x; });
  const groups = {}; reps.forEach(r => { const k = r.target_type + ':' + r.target_id; const g = groups[k] || (groups[k] = { type: r.target_type, id: r.target_id, reasons: [], target: tmap[k] || null }); g.reasons.push(r.reason); });
  return { pending: posts, reports: Object.values(groups) };
};
A.a_mod = async ctx => {
  need(ctx, 'mod'); const type = ctx.body.type, id = String(ctx.body.id || ''), act = ctx.body.action;
  if (!['post', 'comment'].includes(type) || !UUID.test(id) || !['approve', 'hide', 'delete', 'dismiss'].includes(act)) throw bad('بيانات غير صالحة');
  const tbl = type === 'post' ? 'community_posts' : 'comments';
  if (act === 'approve') await sb(`${tbl}?id=eq.${id}`, { method: 'PATCH', body: { status: 'published' }, prefer: 'return=minimal' });
  if (act === 'hide') await sb(`${tbl}?id=eq.${id}`, { method: 'PATCH', body: { status: 'hidden' }, prefer: 'return=minimal' });
  if (act === 'delete') await sb(`${tbl}?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
  if (act !== 'approve') await sb(`reports?target_type=eq.${type}&target_id=eq.${id}`, { method: 'PATCH', body: { status: 'closed' }, prefer: 'return=minimal' });
  return { ok: true };
};
A.a_users = async ctx => {
  need(ctx, 'admin'); const q = (ctx.q.get('q') || '').replace(/[,()*%\\:]/g, ' ').trim().slice(0, 30);
  const profs = await sb('profiles?select=id,nick,role,banned,created_at&order=created_at.desc&limit=100' + (q ? '&nick=ilike.' + enc('*' + q + '*') : ''));
  const r = await http(`${SB_URL}/auth/v1/admin/users?per_page=200`, { headers: { apikey: SVC, Authorization: 'Bearer ' + SVC } }); const j = safeParse(await r.text());
  const em = {}; (j.users || []).forEach(u => { em[u.id] = u.email; });
  return { items: profs.map(p => Object.assign({}, p, { email: em[p.id] || '' })) };
};
A.a_user = async ctx => {
  need(ctx, 'admin'); const id = String(ctx.body.id || ''); if (!UUID.test(id)) throw bad('معرّف غير صالح');
  const patch = {}; if (ctx.body.role !== undefined) { if (!['user', 'mod', 'admin'].includes(ctx.body.role)) throw bad('صلاحية غير صالحة'); patch.role = ctx.body.role; }
  if (ctx.body.banned !== undefined) patch.banned = !!ctx.body.banned;
  if (id === ctx.me.id && (patch.role && patch.role !== 'admin' || patch.banned)) throw bad('لا يمكنك تقييد أو تخفيض حسابك أنت');
  if (!Object.keys(patch).length) throw bad('لا يوجد تغيير'); await sb(`profiles?id=eq.${id}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' }); tokenCache.clear(); return { ok: true };
};
A.a_setting = async ctx => {
  need(ctx, 'admin'); const key = ctx.body.key, v = ctx.body.value; let val;
  switch (key) {
    case 'welcome': val = oneLine(v, 300); break;
    case 'logo_text': val = oneLine(v, 24) || 'DARK SOUL'; break;
    case 'default_color': if (!COLORS.includes(v)) throw bad('لون غير صالح'); val = v; break;
    case 'community_enabled': case 'community_premod': val = !!v; break;
    case 'promo': { const link = String((v && v.link) || '').trim().slice(0, 200); if (link && !/^https?:\/\//i.test(link) && !link.startsWith('#/')) throw bad('الرابط يجب أن يبدأ بـ https:// أو #/'); val = { enabled: !!(v && v.enabled), text: oneLine(v && v.text, 140), link }; break; }
    case 'custom_cats': {
      const out = { sub: {}, pcat: {} }, src = v || {}; const keyOk = k => /^[a-z0-9_]{2,20}$/.test(k);
      ['sad', 'love', 'action'].forEach(c => { const m = (src.sub || {})[c] || {}; Object.keys(m).slice(0, 30).forEach(k => { if (keyOk(k)) { out.sub[c] = out.sub[c] || {}; out.sub[c][k] = oneLine(m[k], 40); } }); });
      Object.keys(src.pcat || {}).slice(0, 30).forEach(k => { if (keyOk(k)) out.pcat[k] = oneLine(src.pcat[k], 40); }); val = out; break;
    }
    default: throw bad('إعداد غير معروف');
  }
  await sb('site_settings?on_conflict=key', { method: 'POST', body: { key, value: val }, prefer: 'resolution=merge-duplicates,return=minimal' }); setCache.t = 0; return { ok: true };
};
A.a_settings = async ctx => { need(ctx, 'admin'); return { settings: await settings(true) }; };

/* --- صفحات للمشاركة ومحركات البحث --- */
A.page = async ctx => {
  const id = ctx.q.get('id') || ''; if (!SAFE_ID.test(id)) throw new HttpErr(404, 'غير موجود');
  const rows = await sb(`content?select=id,kind,title,body,genre&id=eq.${enc(id)}&status=eq.published&limit=1`); const it = rows[0]; if (!it) throw new HttpErr(404, 'غير موجود');
  const route = { post: 'post', prompt: 'prompt', story: 'story', quote: 'quote' }[it.kind], o = origin(ctx.req);
  const title = (it.title || it.body.slice(0, 50)) + ' — DARK SOUL', desc = it.body.replace(/\s+/g, ' ').slice(0, 150), target = '/#/' + route + (it.kind === 'quote' ? '' : '/' + id);
  ctx.html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(o)}/p/${esc(id)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="article"><meta property="og:url" content="${esc(o)}/p/${esc(id)}"><meta name="theme-color" content="#05050a"><style>body{background:#05050a;color:#eef0ff;font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;line-height:2;white-space:pre-wrap}a{color:#3d7bff}</style></head><body><article><h1>${esc(it.title || '')}</h1><p>${esc(it.body)}</p></article><p><a href="${target}">افتح في DARK SOUL ←</a></p><script>location.replace(${JSON.stringify(target)})</script></body></html>`;
  ctx.cache = 's-maxage=300, stale-while-revalidate=600'; return null;
};
A.sitemap = async ctx => {
  const rows = await sb('content?select=id&status=eq.published&kind=neq.quote&limit=2500'), o = origin(ctx.req);
  ctx.xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(o)}/</loc></url>${rows.map(r => `<url><loc>${esc(o)}/p/${esc(r.id)}</loc></url>`).join('')}</urlset>`;
  ctx.cache = 's-maxage=3600'; return null;
};

/* --- ذكاء اصطناعي اختياري (لا يحتاج قاعدة بيانات) --- */
const STYLES = { sad: 'حزين', love: 'رومانسي', mystery: 'غامض', cinematic: 'سينمائي', power: 'تحفيزي' };
const TYPES = { post: 'منشور', status: 'حالة قصيرة', letter: 'رسالة', khater: 'خاطرة' };
const LENS = { s: 'سطر إلى سطرين', m: 'ثلاثة إلى خمسة أسطر', l: 'فقرة طويلة من ستة إلى عشرة أسطر' };
A.generate = async ctx => {
  const key = process.env.AI_API_KEY;
  if (ctx.method === 'GET') return { enabled: !!key };
  if (!key) throw new HttpErr(503, 'الذكاء الاصطناعي غير مفعّل على هذا الخادم');
  if (limited('ai:' + ctx.ip, 6, 60000)) throw new HttpErr(429, 'طلبات كثيرة، انتظر دقيقة ثم حاول مجددًا');
  const b = ctx.body, style = STYLES[b.style] ? b.style : 'sad', type = TYPES[b.type] ? b.type : 'post', len = LENS[b.len] ? b.len : 'm';
  const dial = b.dial === 'ar' ? 'العربية الفصحى' : 'اللهجة المصرية', n = Math.min(Math.max(parseInt(b.n, 10) || 1, 1), 3), topic = oneLine(b.topic, 40), feel = oneLine(b.feel, 20);
  const prompt = `اكتب ${n} نصوصًا أصلية مختلفة من نوع «${TYPES[type]}» بأسلوب ${STYLES[style]}، عن الشعور: ${feel || 'عام'}${topic ? ' والموضوع: ' + topic : ''}.\nاللغة: ${dial}. الطول: ${LENS[len]}.\nالشروط: عربية طبيعية بلا تكرار ولا كليشيهات مستهلكة، بلا أي تحريض على إيذاء النفس أو الآخرين، وبلا ذكر أسماء حقيقية.\nأخرج JSON فقط بالشكل {"texts":["...","..."]} دون أي شرح أو علامات Markdown.`;
  const r = await http('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-haiku-5-5', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }) }, 20000);
  if (!r.ok) throw new HttpErr(502, 'رفض مزوّد الذكاء الاصطناعي الطلب (' + r.status + ')');
  const data = safeParse(await r.text()), text = (data.content || []).map(c => c.text || '').join('').replace(/```json|```/g, '').trim(), parsed = safeParse(text);
  const texts = Array.isArray(parsed.texts) ? parsed.texts.filter(t => typeof t === 'string' && t.trim()).slice(0, n).map(t => t.trim().slice(0, 1200)) : [];
  if (!texts.length) throw new HttpErr(502, 'رد غير مفهوم من المزوّد، حاول مجددًا'); return { texts };
};

/* ---------- الموجّه ---------- */
const PUBLIC_NO_DB = ['config', 'generate'];
module.exports = async function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams, r = q.get('r') || '';
  const ctx = { req, q, ip: clientIp(req), method: req.method, body: {}, me: null, cache: 'no-store' };
  try {
    if (!Object.prototype.hasOwnProperty.call(A, r)) throw new HttpErr(404, 'غير موجود');
    if (req.method !== 'GET' && req.method !== 'POST') throw new HttpErr(405, 'غير مسموح');
    if (!configured() && !PUBLIC_NO_DB.includes(r)) throw new HttpErr(503, 'قاعدة البيانات غير مضبوطة بعد');
    ctx.body = req.method === 'POST' ? (typeof req.body === 'string' ? safeParse(req.body) : (req.body || {})) : {};
    if (configured() && (req.headers.authorization || r.startsWith('a_') || ['me', 'profile', 'favs', 'usersettings', 'delme', 'cposts', 'ccomments', 'cpost', 'ccomment', 'report', 'cdelete'].includes(r))) ctx.me = await whoami(req);
    if (limited('all:' + ctx.ip, 240, 60000)) throw new HttpErr(429, 'طلبات كثيرة، انتظر قليلًا');
    const out = await A[r](ctx);
    res.setHeader('Cache-Control', ctx.cache);
    if (ctx.html) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.status(200).send(ctx.html); }
    if (ctx.xml) { res.setHeader('Content-Type', 'application/xml; charset=utf-8'); return res.status(200).send(ctx.xml); }
    return res.status(200).json(out);
  } catch (e) {
    const status = e instanceof HttpErr ? e.status : 500;
    if (!(e instanceof HttpErr)) console.error(e);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).json({ error: e instanceof HttpErr ? e.message : 'خطأ غير متوقع في الخادم' });
  }
};
module.exports._A = A; // للاختبار فقط
