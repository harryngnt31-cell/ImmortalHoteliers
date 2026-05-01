/* ═══════════════════════════════════════════════════════════
   IMMORTAL HOTELIERS — main.js  (canonical clean version)
   Single source of truth. No patches. No duplicate functions.
   Data layer: localStorage — swap DB.* methods for API calls.
═══════════════════════════════════════════════════════════ */

'use strict';

/* ── CONSTANTS ─────────────────────────────────────────────── */
const ADMIN_USERNAME = 'hari';
const ADMIN_PASSWORD = 'IH@admin2025'; // Change before going live!
const PAGE_SIZE      = 6;

/* ── DATA LAYER ─────────────────────────────────────────────── */
const DB = {
  _get: (k, def) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : def; } catch { return def; } },
  _set: (k, v)   => localStorage.setItem(k, JSON.stringify(v)),

  getStories:     () => DB._get('ih_stories',    []),
  setStories:     (v) => DB._set('ih_stories',    v),
  getUsers:       () => DB._get('ih_users',       []),
  setUsers:       (v) => DB._set('ih_users',       v),
  getBlogs:       () => DB._get('ih_blogs',       []),
  setBlogs:       (v) => DB._set('ih_blogs',       v),
  getSession:     () => DB._get('ih_session',     null),
  setSession:     (v) => DB._set('ih_session',     v),
  clearSession:   () => localStorage.removeItem('ih_session'),
  getTheme:       () => DB._get('ih_theme',       null),
  setTheme:       (v) => DB._set('ih_theme',       v),
  getSocials:     () => DB._get('ih_socials',     { linkedin: '', instagram: '', whatsapp: '97451142741' }),
  setSocials:     (v) => DB._set('ih_socials',     v),
  getSubscribers: () => DB._get('ih_subscribers', []),
  setSubscribers: (v) => DB._set('ih_subscribers', v),
};

/* ── SESSION ────────────────────────────────────────────────── */
const currentUser = () => DB.getSession();
const isAdmin     = () => { const s = currentUser(); return !!(s && s.role === 'admin'); };
const isLoggedIn  = () => !!currentUser();

/* ── UTILS ──────────────────────────────────────────────────── */
const esc    = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const fmtDate= (iso, opts = { day:'numeric', month:'short', year:'numeric' }) => { try { return new Date(iso).toLocaleDateString('en-GB', opts); } catch { return ''; } };
const $      = (id) => document.getElementById(id);
const getVal = (id) => $$(id)?.value ?? '';
const setVal = (id, v) => { const el = $$(id); if (el) el.value = v; };
const setTxt = (id, v) => { const el = $$(id); if (el) el.textContent = v; };
const showEl = (id) => { const el = $$(id); if (el) el.style.display = 'block'; };
const hideEl = (id) => { const el = $$(id); if (el) el.style.display = 'none'; };

function $$(id) { return document.getElementById(id); }

function flashMsg(id, text, ms = 3000) {
  const el = $$(id);
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, ms);
}

/* ── NAV ────────────────────────────────────────────────────── */
function renderNav() {
  const s       = currentUser();
  const navAuth = $$('nav-auth-area');
  const mobAuth = $$('mobile-auth-area');
  let desktop   = '', mobile = '';

  if (!s) {
    desktop = `<button class="nav-cta" onclick="showPage('login')">Login</button>`;
    mobile  = `<a class="mobile-auth-link" onclick="showPage('login');toggleMenu()">Login</a>`;
  } else if (s.role === 'admin') {
    desktop = `<span class="nav-user-badge admin-badge">⚡ Admin</span>
      <button class="nav-cta" onclick="showPage('admin')">Dashboard</button>
      <button class="nav-cta nav-cta--ghost" onclick="logout()">Logout</button>`;
    mobile  = `<a class="mobile-auth-link" onclick="showPage('admin');toggleMenu()">⚡ Dashboard</a>
      <a class="mobile-auth-link" onclick="logout();toggleMenu()">Logout</a>`;
  } else {
    desktop = `<span class="nav-user-badge">✦ ${esc(s.name)}</span>
      <button class="nav-cta" onclick="showPage('submit')">Submit Story</button>
      <button class="nav-cta nav-cta--ghost" onclick="logout()">Logout</button>`;
    mobile  = `<span class="mobile-auth-name">✦ ${esc(s.name)}</span>
      <a class="mobile-auth-link" onclick="showPage('submit');toggleMenu()">Submit Story</a>
      <a class="mobile-auth-link" onclick="logout();toggleMenu()">Logout</a>`;
  }

  if (navAuth) navAuth.innerHTML = desktop;
  if (mobAuth) mobAuth.innerHTML = mobile;
}

/* ── ROUTING ────────────────────────────────────────────────── */
let _adminTab    = 'dashboard';
let _storiesPage = 1;

function showPage(id) {
  if (id === 'submit' && !isLoggedIn()) { showPage('login'); return; }
  if (id === 'admin'  && !isAdmin())    { showPage('login'); return; }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

  const page = $$('page-' + id);
  if (!page) return;
  page.classList.add('active');
  const navEl = $$('nav-' + id);
  if (navEl) navEl.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (id === 'stories') { _storiesPage = 1; renderPublicStories(); }
  if (id === 'blogs')   renderPublicBlogs();
  if (id === 'submit')  renderSubmitPage();
  if (id === 'admin')   renderAdminDashboard();
}

function toggleMenu() { $$('mobileMenu')?.classList.toggle('open'); }

/* ── AUTH ───────────────────────────────────────────────────── */
function login(e) {
  e.preventDefault();
  const username = getVal('login-username').trim().toLowerCase();
  const password = getVal('login-password');
  const errEl    = $$('login-error');
  if (errEl) errEl.style.display = 'none';

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    DB.setSession({ role: 'admin', name: 'Hari Patel', username: 'hari' });
    renderNav(); showPage('admin'); return;
  }

  const user = DB.getUsers().find(u => u.username === username && u.password === password && u.active);
  if (user) {
    DB.setSession({ role: 'user', name: user.name, username: user.username, id: user.id });
    renderNav(); showPage('submit'); return;
  }

  if (errEl) { errEl.textContent = 'Invalid credentials or account not active.'; errEl.style.display = 'block'; }
}

function logout() { DB.clearSession(); renderNav(); showPage('home'); }

/* ── STORY SUBMISSION ───────────────────────────────────────── */
function renderSubmitPage() {
  const wrap = $$('submit-form-wrap');
  if (!wrap) return;
  const session    = currentUser();
  const myStories  = DB.getStories().filter(s => s.authorId === session.id);

  const badge = (s) => s.status === 'approved'
    ? '<span class="status-badge status-approved">✓ Published</span>'
    : s.status === 'declined'
    ? '<span class="status-badge status-declined">✕ Declined</span>'
    : '<span class="status-badge status-pending">◷ Pending Review</span>';

  const myHtml = myStories.length ? `
    <div class="my-stories">
      <h3 class="my-stories-title">Your Submissions</h3>
      ${myStories.map(s => `
        <div class="my-story-item">
          <div class="my-story-info">
            <strong>${esc(s.title)}</strong>
            <span class="my-story-role">${esc(s.role)}</span>
          </div>
          ${badge(s)}
          ${s.status === 'declined' && s.adminNote ? `<div class="decline-note">Note from Hari: ${esc(s.adminNote)}</div>` : ''}
        </div>`).join('')}
    </div>` : '';

  wrap.innerHTML = `
    <form id="story-form" onsubmit="submitStory(event)">
      <div class="form-full">
        <input  type="text" id="s-title"   placeholder="Story title *" required>
        <input  type="text" id="s-role"    placeholder="Your role &amp; years (e.g. General Manager · 20 years) *" required>
        <input  type="text" id="s-photo"   placeholder="Your photo URL (optional)">
        <textarea           id="s-content" placeholder="Tell your story — be honest, be real *" style="min-height:280px" required></textarea>
        <p style="font-size:0.75rem;color:var(--warm);margin-top:-0.5rem;line-height:1.7">Write as much as you like. Hari reviews everything before it goes live.</p>
        <div id="submit-error"   class="form-error"  style="display:none"></div>
        <div id="submit-success" class="form-success" style="display:none">✓ Submitted! Hari will be in touch.</div>
        <button type="submit" class="btn btn-solid" style="font-family:var(--sans);align-self:flex-start">Submit for Review</button>
      </div>
    </form>
    ${myHtml}`;
}

function submitStory(e) {
  e.preventDefault();
  const session = currentUser();
  const title   = getVal('s-title').trim();
  const role    = getVal('s-role').trim();
  const content = getVal('s-content').trim();
  const errEl   = $$('submit-error');

  if (!title || !role || !content) {
    if (errEl) { errEl.textContent = 'Please fill in all required fields.'; errEl.style.display = 'block'; }
    return;
  }
  if (errEl) errEl.style.display = 'none';

  const stories = DB.getStories();
  stories.push({ id: Date.now().toString(), authorId: session.id, authorName: session.name,
    title, role, photo: getVal('s-photo').trim(), content,
    status: 'pending', submittedAt: new Date().toISOString(), adminNote: '' });
  DB.setStories(stories);

  showEl('submit-success');
  $$('story-form')?.reset();
  setTimeout(() => renderSubmitPage(), 2000);
}

/* ── PUBLIC STORIES ─────────────────────────────────────────── */
function renderPublicStories() {
  const container = $$('public-stories-list');
  if (!container) return;
  const approved = DB.getStories().filter(s => s.status === 'approved');

  if (!approved.length) {
    container.innerHTML = `
      <div class="story-card placeholder-story">
        <div class="story-img story-img-placeholder"><span>✦</span></div>
        <div class="story-body"><div class="story-num">01</div><h3>Stories coming soon</h3>
          <span class="story-role">The first journeys are being reviewed</span>
          <p>Real, unfiltered stories from across hospitality are on their way. Check back soon — or share your own.</p>
          <a class="story-cta" onclick="showPage('contact')">Share your story</a></div>
      </div>
      <div class="story-card placeholder-story">
        <div class="story-img story-img-placeholder"><span>◈</span></div>
        <div class="story-body"><div class="story-num">02</div><h3>Your story could be here</h3>
          <span class="story-role">Hoteliers · Restaurateurs · Chefs · Leaders</span>
          <p>We are looking for honest voices — from early-career journeys to decades of leadership. Every story matters.</p>
          <a class="story-cta" onclick="showPage('contact')">Get in touch</a></div>
      </div>`;
    return;
  }

  const slice = approved.slice(0, _storiesPage * PAGE_SIZE);
  container.innerHTML = slice.map((s, i) => `
    <div class="story-card dynamic-story" onclick="openStoryModal('${esc(s.id)}')">
      ${s.photo
        ? `<img class="story-img" src="${esc(s.photo)}" alt="${esc(s.authorName)}"
               onerror="this.src='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80'">`
        : `<div class="story-img story-img-placeholder"><span>${esc(s.authorName[0])}</span></div>`}
      <div class="story-body">
        <div class="story-num">${String(i + 1).padStart(2, '0')}</div>
        <h3>${esc(s.title)}</h3>
        <span class="story-role">${esc(s.role)}</span>
        <p>${esc(s.content.substring(0, 160))}…</p>
        <a class="story-cta">Read the full story</a>
      </div>
    </div>`).join('');

  if (slice.length < approved.length) {
    const remaining = approved.length - slice.length;
    const btn = document.createElement('div');
    btn.className = 'load-more-wrap';
    btn.innerHTML = `<button class="btn" onclick="loadMoreStories()">Load More Stories <span style="opacity:.6;font-size:.85em">(${remaining} remaining)</span></button>`;
    container.appendChild(btn);
  }
}

function loadMoreStories() {
  _storiesPage++;
  renderPublicStories();
  const cards    = document.querySelectorAll('#public-stories-list .story-card');
  const firstNew = cards[(_storiesPage - 1) * PAGE_SIZE];
  if (firstNew) firstNew.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openStoryModal(id) {
  const story = DB.getStories().find(s => s.id === id);
  if (!story) return;
  setTxt('modal-title',  story.title);
  setTxt('modal-role',   story.role);
  setTxt('modal-author', story.authorName);
  const content = $$('modal-content');
  if (content) content.innerHTML = '<p>' + esc(story.content).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
  const photo = $$('modal-photo');
  if (photo) { photo.src = story.photo || ''; photo.style.display = story.photo ? 'block' : 'none'; }
  $$('story-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeStoryModal() {
  $$('story-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── PUBLIC BLOGS ───────────────────────────────────────────── */
const SEED_BLOGS = [
  { id:'seed-0', tag:'Industry Trends', date:'March 2025',
    img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&h=400&q=80',
    title:'The Future of Luxury Hospitality in the Middle East',
    excerpt:'Exploring how regional culture and global luxury standards are merging to create unprecedented guest experiences.',
    content:`The Middle East hospitality landscape is undergoing a profound transformation. Regional culture and global luxury standards are converging to create guest experiences that are simultaneously rooted in local heritage and internationally refined.\n\nFrom the iconic skylines of Dubai to the ancient charm of AlUla, hoteliers are rethinking what luxury means — not through imported templates, but through genuine cultural expression.\n\nThis shift is being driven by a new generation of hospitality leaders who grew up straddling both worlds, and by guests who are increasingly seeking authenticity over familiarity.` },
  { id:'seed-1', tag:'Leadership', date:'February 2025',
    img:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=600&h=400&q=80',
    title:'What Makes a Great Hotel General Manager in 2025',
    excerpt:'The skills, mindset, and human qualities that define exceptional hotel leadership today.',
    content:`The role of General Manager has always been demanding. But in 2025, the expectations have expanded in ways few anticipated.\n\nBeyond the operational mastery and revenue instincts, today's GM must be a cultural architect — someone who can hold the emotional climate of an entire property, inspire teams that span dozens of nationalities, and make guests feel genuinely seen rather than processed.\n\nThe best GMs I have spoken to share one trait: they never stopped being curious. They still walk the floor. They still remember names. They still ask questions that a junior member of staff might ask.` },
  { id:'seed-2', tag:'Career Growth', date:'January 2025',
    img:'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=600&h=400&q=80',
    title:'How to Transition from Operations to Consulting in Hospitality',
    excerpt:'A practical guide for experienced hoteliers looking to leverage their expertise as independent advisors.',
    content:`After twenty or thirty years in operations, the idea of consulting can feel both liberating and terrifying. Liberating because you finally get to choose your engagements. Terrifying because the structure that defined your career — the brand, the team, the hierarchy — is suddenly gone.\n\nThe transition requires more than expertise. It requires repositioning how you think about your value. In operations, you are paid for time and presence. In consulting, you are paid for judgment and outcomes.\n\nStart with one well-scoped project in an area where your experience is undeniable. Deliver it brilliantly. Let that be your proof of concept.` },
  { id:'seed-3', tag:'Technology', date:'December 2024',
    img:'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&h=400&q=80',
    title:'AI and the Hospitality Industry: Friend or Foe?',
    excerpt:'How artificial intelligence is reshaping guest experiences and what it means for hospitality professionals.',
    content:`The question of AI in hospitality is not really about technology. It is about what hospitality actually is.\n\nIf hospitality is fundamentally about human connection — about one person making another feel cared for — then AI is a tool, not a replacement. It can handle the repetitive, the administrative, the data-heavy. It frees the human professional to do the one thing no algorithm can replicate: be genuinely present.\n\nThe hoteliers who will thrive over the next decade are those who embrace AI for what it is good at, while doubling down on the irreducibly human dimensions of their craft.` },
  { id:'seed-4', tag:'F&B', date:'November 2024',
    img:'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&h=400&q=80',
    title:'The Art of Restaurant Concept Development',
    excerpt:'From vision to opening night — the critical steps that separate thriving restaurants from those that close within a year.',
    content:`Most restaurants that fail do not fail because of bad food. They fail because the concept was never properly stress-tested before the first brick was laid.\n\nA concept is not a cuisine and a mood board. It is a complete answer to the question: why would someone choose this place, on a Tuesday night, when they have twenty other options?\n\nThe strongest restaurant concepts I have encountered all share a specific clarity — the founder could describe the guest, the occasion, and the feeling they wanted to create in three sentences or fewer.` },
  { id:'seed-5', tag:'People', date:'October 2024',
    img:'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=600&h=400&q=80',
    title:'Why Hospitality Professionals Burn Out — and How to Prevent It',
    excerpt:'An honest conversation about wellbeing, sustainability, and the human cost of a high-service industry.',
    content:`Burnout in hospitality is not a personal failure. It is an industry problem.\n\nWe have built a culture that celebrates sacrifice — the double shifts, the missed weddings, the vacations never taken — as evidence of dedication. And then we are surprised when people leave.\n\nThe professionals who sustain long, meaningful careers in this industry are the ones who learned, often the hard way, to treat their own wellbeing as a professional responsibility. Not a luxury. Not selfishness. A responsibility — because a depleted leader cannot care for anyone else.` },
];

function renderPublicBlogs() {
  const container = $$('public-blogs-list');
  if (!container) return;

  container.querySelectorAll('.admin-blog-card, .load-more-wrap').forEach(c => c.remove());

  const adminBlogs = [...DB.getBlogs().filter(b => b.status === 'published')]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  adminBlogs.forEach(b => {
    const card = document.createElement('div');
    card.className = 'blog-card admin-blog-card';
    const date = fmtDate(b.publishedAt, { month: 'long', year: 'numeric' });
    card.innerHTML = `
      ${b.img ? `<div class="blog-img-wrap"><img class="blog-img" src="${esc(b.img)}" alt="" onerror="this.parentElement.style.display='none'"></div>` : ''}
      <div class="blog-body">
        <span class="blog-tag">${esc(b.tag)}</span>
        <h3>${esc(b.title)}</h3>
        <p>${esc(b.excerpt || b.content.substring(0, 140))}…</p>
        <div class="blog-meta">
          <span class="blog-date">${date}</span>
          <a class="blog-read" onclick="openBlogModalById('${esc(b.id)}')">Read More</a>
        </div>
      </div>`;
    container.insertBefore(card, container.firstChild);
  });

  const seedCards = container.querySelectorAll('.seed-blog');
  const visibleSeeds = Math.max(0, PAGE_SIZE - adminBlogs.length);
  seedCards.forEach((c, i) => { c.style.display = i < visibleSeeds ? '' : 'none'; });
}

function openSeedBlog(index) { openBlogModal(SEED_BLOGS[index]); }

function openBlogModalById(id) {
  const b = DB.getBlogs().find(b => b.id === id);
  if (b) openBlogModal(b);
}

function openBlogModal(b) {
  if (!b) return;
  setTxt('bm-title',  b.title);
  setTxt('bm-tag',    b.tag);
  setTxt('bm-author', b.author || 'Hari Patel');
  setTxt('bm-date',   b.date || fmtDate(b.publishedAt || new Date(), { day: 'numeric', month: 'long', year: 'numeric' }));
  const img = $$('bm-img');
  if (img) { img.src = b.img || ''; img.style.display = b.img ? 'block' : 'none'; }
  const content = $$('bm-content');
  if (content) content.innerHTML = '<p>' + esc(b.content).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
  $$('blog-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeBlogModal() {
  $$('blog-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── CONTACT FORMS ──────────────────────────────────────────── */
const FORMSPREE_ID = 'YOUR_FORM_ID'; // → sign up at formspree.io, paste ID here

async function submitContactForm(e, formId) {
  e.preventDefault();
  const home  = formId === 'home';
  const errId = home ? 'hc-error' : 'cp-error';
  const sucId = home ? 'hc-success' : 'cp-success';
  hideEl(errId);

  const payload = home
    ? { name: getVal('hc-name'), email: getVal('hc-email'), role: getVal('hc-role'), message: getVal('hc-message') }
    : { name: `${getVal('cp-fname')} ${getVal('cp-lname')}`.trim(), email: getVal('cp-email'),
        phone: getVal('cp-phone'), role: getVal('cp-role'), reason: getVal('cp-reason'), message: getVal('cp-message') };

  if (!payload.email || !payload.message) {
    const err = $$(errId);
    if (err) { err.textContent = 'Please fill in all required fields.'; err.style.display = 'block'; } return;
  }

  if (FORMSPREE_ID === 'YOUR_FORM_ID') {
    flashMsg(sucId, '✓ Message sent! Hari will be in touch soon.', 5000); return;
  }

  try {
    const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) { flashMsg(sucId, '✓ Message sent! Hari will be in touch soon.', 5000); }
    else { const err = $$(errId); if (err) { err.textContent = 'Send failed. Please email us directly.'; err.style.display = 'block'; } }
  } catch {
    const err = $$(errId); if (err) { err.textContent = 'Network error. Please email us directly.'; err.style.display = 'block'; }
  }
}

/* ── NEWSLETTER ─────────────────────────────────────────────── */
function subscribeNewsletter(e) {
  e.preventDefault();
  const input = $$('newsletter-email');
  const msg   = $$('newsletter-msg');
  const email = input?.value.trim();
  if (!email || !email.includes('@')) { if (msg) { msg.textContent = 'Please enter a valid email.'; msg.style.display = 'block'; } return; }
  const subs = DB.getSubscribers();
  if (subs.find(s => s.email === email)) { if (msg) { msg.textContent = 'You are already subscribed!'; msg.style.display = 'block'; } return; }
  subs.push({ email, date: new Date().toISOString() });
  DB.setSubscribers(subs);
  if (input) input.value = '';
  if (msg) { msg.textContent = `✓ Subscribed! ${subs.length} reader${subs.length > 1 ? 's' : ''} in the community.`; msg.style.display = 'block'; }
}

function exportSubscribers() {
  const subs = DB.getSubscribers();
  if (!subs.length) { alert('No subscribers yet.'); return; }
  const csv  = 'Email,Date\n' + subs.map(s => `${s.email},${s.date}`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = 'ih-subscribers.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ── SOCIAL LINKS ───────────────────────────────────────────── */
function openSocial(platform) {
  const s   = DB.getSocials();
  const url = platform === 'linkedin'
    ? (s.linkedin || 'https://linkedin.com')
    : (s.instagram ? `https://instagram.com/${s.instagram.replace(/^@/, '')}` : 'https://instagram.com');
  window.open(url, '_blank', 'noopener');
}

function applySocials() {
  const s  = DB.getSocials();
  const wa = document.querySelector('.whatsapp-fab');
  if (wa && s.whatsapp) {
    wa.href = `https://wa.me/${s.whatsapp.replace(/\D/g, '')}?text=Hello%2C%20I%20found%20Immortal%20Hoteliers%20and%20would%20love%20to%20connect.`;
  }
}

function saveSocials() {
  DB.setSocials({ linkedin: getVal('set-linkedin').trim(), instagram: getVal('set-instagram').trim(), whatsapp: getVal('set-whatsapp').trim() });
  applySocials();
  flashMsg('socials-saved', '✓ Social links saved.', 3000);
}

/* ── COOKIE CONSENT ─────────────────────────────────────────── */
function checkCookieConsent() {
  if (!localStorage.getItem('ih_cookie_consent')) {
    setTimeout(() => $$('cookie-banner')?.classList.add('visible'), 1800);
  }
}
function acceptCookies()  { localStorage.setItem('ih_cookie_consent','accepted');  $$('cookie-banner')?.classList.remove('visible'); }
function declineCookies() { localStorage.setItem('ih_cookie_consent','declined');  $$('cookie-banner')?.classList.remove('visible'); }

/* ── ADMIN PANEL ────────────────────────────────────────────── */
function renderAdminDashboard() { renderAdminStats(); setAdminTab(_adminTab); }

function renderAdminStats() {
  const stories = DB.getStories(), users = DB.getUsers(), subs = DB.getSubscribers();
  setTxt('stat-total-stories', stories.length);
  setTxt('stat-pending',       stories.filter(s => s.status === 'pending').length);
  setTxt('stat-published',     stories.filter(s => s.status === 'approved').length);
  setTxt('stat-users',         users.length);
  setTxt('stat-subscribers',   subs.length);
}

function setAdminTab(tab) {
  _adminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  $$('tab-' + tab)?.classList.add('active');
  const content = $$('admin-tab-content');
  if (!content) return;
  const map = { dashboard: renderDashboardTab, pending: () => renderStoriesTab(content,'pending'),
    published: () => renderStoriesTab(content,'approved'), declined: () => renderStoriesTab(content,'declined'),
    blogs: renderBlogsTab, users: renderUsersTab, theme: renderThemeTab };
  (map[tab] || (() => {}))(content);
}

/* Dashboard */
function renderDashboardTab(el) {
  const stories = DB.getStories();
  const subs    = DB.getSubscribers();
  const recent  = [...stories].sort((a,b) => new Date(b.submittedAt)-new Date(a.submittedAt)).slice(0,6);
  el.innerHTML  = `
    <div class="dash-grid">
      <div class="dash-main">
        <div class="admin-section-title">Recent Submissions</div>
        ${recent.length ? recent.map(storyRow).join('') : '<div class="empty-state">No stories yet. Invite your first storyteller.</div>'}
      </div>
      <div class="dash-side">
        <div class="admin-section-title" style="display:flex;align-items:center;justify-content:space-between">
          Subscribers
          ${subs.length ? `<button class="admin-btn admin-btn--edit" onclick="exportSubscribers()">Export CSV</button>` : ''}
        </div>
        ${subs.length
          ? `<div class="subs-list">${subs.slice(-8).reverse().map(s =>
              `<div class="sub-item"><span>${esc(s.email)}</span><span class="sub-date">${fmtDate(s.date,{day:'numeric',month:'short'})}</span></div>`
            ).join('')}</div>
            ${subs.length > 8 ? `<p style="font-size:.72rem;color:var(--warm);padding:.5rem 0">+ ${subs.length-8} more</p>` : ''}`
          : '<div class="empty-state" style="font-size:.8rem;text-align:left;padding:1rem 0">No subscribers yet.</div>'}
      </div>
    </div>`;
}

/* Stories tabs */
function renderStoriesTab(el, status) {
  const stories = DB.getStories().filter(s => s.status === status);
  const label   = { pending:'Pending', approved:'Published', declined:'Declined' }[status] || status;
  el.innerHTML  = `
    <div class="admin-section-title">${label} Stories (${stories.length})</div>
    ${stories.length ? stories.map(storyRow).join('') : `<div class="empty-state">No ${label.toLowerCase()} stories.</div>`}`;
}

function storyRow(s) {
  const date    = fmtDate(s.submittedAt);
  const actions = s.status === 'pending'
    ? `<button class="admin-btn admin-btn--approve" onclick="approveStory('${s.id}')">✓ Approve</button>
       <button class="admin-btn admin-btn--edit"    onclick="editStoryModal('${s.id}')">✎ Edit</button>
       <button class="admin-btn admin-btn--decline" onclick="declineStoryPrompt('${s.id}')">✕ Decline</button>`
    : s.status === 'approved'
    ? `<button class="admin-btn admin-btn--edit"    onclick="editStoryModal('${s.id}')">✎ Edit</button>
       <button class="admin-btn admin-btn--decline" onclick="declineStoryPrompt('${s.id}')">Unpublish</button>`
    : `<button class="admin-btn admin-btn--approve" onclick="approveStory('${s.id}')">Re-approve</button>
       <button class="admin-btn admin-btn--delete"  onclick="deleteStory('${s.id}')">Delete</button>`;
  return `<div class="story-row" id="row-${s.id}">
    <div class="story-row-main">
      <div class="story-row-title">${esc(s.title)}</div>
      <div class="story-row-meta">${esc(s.authorName)} · ${esc(s.role)} · ${date}</div>
      <div class="story-row-preview">${esc(s.content.substring(0,130))}…</div>
    </div>
    <div class="story-row-actions">${actions}</div>
  </div>`;
}

function approveStory(id) {
  const stories = DB.getStories(), s = stories.find(s=>s.id===id);
  if (s) { s.status='approved'; s.adminNote=''; }
  DB.setStories(stories); renderPublicStories(); renderAdminDashboard();
}

function deleteStory(id) {
  if (!confirm('Permanently delete this story?')) return;
  DB.setStories(DB.getStories().filter(s=>s.id!==id)); renderAdminDashboard();
}

function declineStoryPrompt(id) {
  const stories = DB.getStories(), s = stories.find(s=>s.id===id);
  if (!s) return;
  setTxt('decline-story-title', s.title);
  setVal('decline-note-input', s.adminNote || '');
  $$('decline-confirm-btn').onclick = () => {
    s.status = 'declined'; s.adminNote = getVal('decline-note-input').trim();
    DB.setStories(stories); closeDeclineModal(); renderAdminDashboard();
  };
  $$('decline-modal')?.classList.add('open');
}

function closeDeclineModal() { $$('decline-modal')?.classList.remove('open'); }

function editStoryModal(id) {
  const s = DB.getStories().find(s=>s.id===id);
  if (!s) return;
  setVal('edit-story-id', id); setVal('edit-title', s.title);
  setVal('edit-role', s.role); setVal('edit-content', s.content);
  $$('edit-modal')?.classList.add('open');
}

function saveEditedStory(e) {
  e.preventDefault();
  const id = getVal('edit-story-id'), stories = DB.getStories(), s = stories.find(s=>s.id===id);
  if (s) { s.title=getVal('edit-title').trim(); s.role=getVal('edit-role').trim(); s.content=getVal('edit-content').trim(); }
  DB.setStories(stories); closeEditModal(); renderPublicStories(); renderAdminDashboard();
}

function closeEditModal() { $$('edit-modal')?.classList.remove('open'); }

/* Users */
function renderUsersTab(el) {
  const users = DB.getUsers();
  el.innerHTML = `
    <div class="admin-section-title">Invited Users (${users.length})</div>
    <form onsubmit="addUser(event)" class="add-user-form">
      <input type="text"     id="new-name"       placeholder="Full name *"            required>
      <input type="text"     id="new-username"   placeholder="Username *"             required>
      <input type="password" id="new-password"   placeholder="Temporary password *"  required>
      <input type="text"     id="new-role-title" placeholder="Their role (e.g. GM, Chef)">
      <button type="submit" class="admin-btn admin-btn--approve">+ Add User</button>
    </form>
    <div id="add-user-error" class="form-error" style="display:none;margin-bottom:1rem"></div>
    ${users.length ? `<div class="users-list">${users.map(userRow).join('')}</div>`
      : '<div class="empty-state">No users yet. Add someone above to give them access.</div>'}`;
}

function userRow(u) {
  return `<div class="user-row">
    <div class="user-row-info">
      <strong>${esc(u.name)}</strong>
      <span class="user-row-meta">@${esc(u.username)} · ${esc(u.roleTitle||'Hospitality Professional')} · joined ${fmtDate(u.createdAt)}</span>
    </div>
    <div class="user-row-actions">
      <span class="status-badge ${u.active?'status-approved':'status-declined'}">${u.active?'Active':'Banned'}</span>
      <button class="admin-btn ${u.active?'admin-btn--decline':'admin-btn--approve'}" onclick="toggleUserActive('${u.id}')">${u.active?'Ban':'Restore'}</button>
      <button class="admin-btn admin-btn--delete" onclick="deleteUser('${u.id}')">Delete</button>
    </div>
  </div>`;
}

function addUser(e) {
  e.preventDefault();
  const users    = DB.getUsers();
  const username = getVal('new-username').trim().toLowerCase();
  const errEl    = $$('add-user-error');
  if (username === ADMIN_USERNAME || users.find(u=>u.username===username)) {
    if (errEl) { errEl.textContent='Username already taken.'; errEl.style.display='block'; } return;
  }
  if (errEl) errEl.style.display='none';
  users.push({ id:Date.now().toString(), name:getVal('new-name').trim(), username,
    password:getVal('new-password'), roleTitle:getVal('new-role-title').trim(),
    active:true, createdAt:new Date().toISOString() });
  DB.setUsers(users); renderAdminStats(); setAdminTab('users');
}

function toggleUserActive(id) {
  const users=DB.getUsers(), u=users.find(u=>u.id===id);
  if (u) u.active=!u.active; DB.setUsers(users);
  const session=currentUser();
  if (session&&session.id===id&&!u.active) logout();
  else renderUsersTab($$('admin-tab-content'));
}

function deleteUser(id) {
  if (!confirm('Delete this user? Their stories will remain.')) return;
  DB.setUsers(DB.getUsers().filter(u=>u.id!==id)); renderAdminStats(); setAdminTab('users');
}

/* Blogs */
function renderBlogsTab(el) {
  const blogs = DB.getBlogs();
  el.innerHTML = `
    <div class="admin-section-title">Blog Posts (${blogs.length})</div>
    <button class="admin-btn admin-btn--approve" style="margin-bottom:1.5rem" onclick="openBlogEditModal(null)">+ Write New Post</button>
    ${blogs.length ? blogs.map(blogRow).join('') : '<div class="empty-state">No blog posts yet. Write your first one above.</div>'}`;
}

function blogRow(b) {
  const date = fmtDate(b.createdAt);
  return `<div class="story-row">
    <div class="story-row-main">
      <div class="story-row-title">${esc(b.title)}</div>
      <div class="story-row-meta">${esc(b.tag)} · ${date} · <span class="${b.status==='published'?'approved-col':'pending-col'}">${b.status}</span></div>
      <div class="story-row-preview">${esc((b.excerpt||b.content).substring(0,130))}…</div>
    </div>
    <div class="story-row-actions">
      ${b.status==='draft'
        ? `<button class="admin-btn admin-btn--approve" onclick="publishBlog('${b.id}')">Publish</button>`
        : `<button class="admin-btn admin-btn--decline" onclick="unpublishBlog('${b.id}')">Unpublish</button>`}
      <button class="admin-btn admin-btn--edit"   onclick="openBlogEditModal('${b.id}')">✎ Edit</button>
      <button class="admin-btn admin-btn--delete" onclick="deleteBlog('${b.id}')">Delete</button>
    </div>
  </div>`;
}

function openBlogEditModal(idOrNull) {
  const b = typeof idOrNull === 'string' ? DB.getBlogs().find(b=>b.id===idOrNull) : null;
  setVal('be-id',''); setVal('be-title',''); setVal('be-tag',''); setVal('be-img',''); setVal('be-excerpt',''); setVal('be-content','');
  if (b) { setVal('be-id',b.id); setVal('be-title',b.title); setVal('be-tag',b.tag); setVal('be-img',b.img||''); setVal('be-excerpt',b.excerpt||''); setVal('be-content',b.content); }
  $$('blog-edit-modal')?.classList.add('open');
}

function saveBlog(e, publish) {
  e.preventDefault();
  const blogs = DB.getBlogs(), id = getVal('be-id');
  const data  = { title:getVal('be-title').trim(), tag:getVal('be-tag').trim(), img:getVal('be-img').trim(),
    excerpt:getVal('be-excerpt').trim(), content:getVal('be-content').trim(), author:'Hari Patel' };
  if (!data.title || !data.content) { alert('Title and content are required.'); return; }
  if (id) {
    const b = blogs.find(b=>b.id===id);
    if (b) { Object.assign(b,data); if (publish&&b.status!=='published') { b.status='published'; b.publishedAt=new Date().toISOString(); } }
  } else {
    blogs.push({ id:Date.now().toString(), ...data, status:publish?'published':'draft',
      createdAt:new Date().toISOString(), publishedAt:publish?new Date().toISOString():null });
  }
  DB.setBlogs(blogs); closeBlogEditModal(); renderPublicBlogs(); renderAdminDashboard();
}

function publishBlog(id) {
  const blogs=DB.getBlogs(), b=blogs.find(b=>b.id===id);
  if (b) { b.status='published'; b.publishedAt=new Date().toISOString(); }
  DB.setBlogs(blogs); renderPublicBlogs(); setAdminTab('blogs');
}

function unpublishBlog(id) {
  const blogs=DB.getBlogs(), b=blogs.find(b=>b.id===id);
  if (b) b.status='draft'; DB.setBlogs(blogs); renderPublicBlogs(); setAdminTab('blogs');
}

function deleteBlog(id) {
  if (!confirm('Permanently delete this blog post?')) return;
  DB.setBlogs(DB.getBlogs().filter(b=>b.id!==id)); renderPublicBlogs(); setAdminTab('blogs');
}

function closeBlogEditModal() { $$('blog-edit-modal')?.classList.remove('open'); }

/* ── THEME STUDIO ───────────────────────────────────────────── */
const SEASONAL_THEMES = [
  { id:'ramadan',  name:'Ramadan',  dates:[{start:'02-15',end:'03-25'}],
    vars:{'--gold':'#D4A853','--gold-light':'#E8C06B','--ink':'#0C0A06','--ink-soft':'#1C160C','--cream':'#F9F5EC'},
    preview:'linear-gradient(135deg,#0C0A06 0%,#1C160C 50%,#D4A853 100%)' },
  { id:'eid',      name:'Eid',      dates:[{start:'03-25',end:'04-05'},{start:'05-28',end:'06-07'}],
    vars:{'--gold':'#C8963A','--gold-light':'#E2B55A','--ink':'#071209','--ink-soft':'#0E1E0F','--cream':'#F2F7F2'},
    preview:'linear-gradient(135deg,#071209 0%,#0E1E0F 50%,#C8963A 100%)' },
  { id:'newyear',  name:'New Year', dates:[{start:'12-29',end:'01-04'}],
    vars:{'--gold':'#E8D5A3','--gold-light':'#F2E4C0','--ink':'#050507','--ink-soft':'#0D0D16','--cream':'#F5F5FA'},
    preview:'linear-gradient(135deg,#050507 0%,#0D0D16 50%,#E8D5A3 100%)' },
  { id:'summer',   name:'Summer',   dates:[{start:'06-15',end:'08-31'}],
    vars:{'--gold':'#D4803A','--gold-light':'#E89B5A','--ink':'#080504','--ink-soft':'#180E08','--cream':'#FBF7F0'},
    preview:'linear-gradient(135deg,#080504 0%,#180E08 50%,#D4803A 100%)' },
];

const FONT_PAIRS = [
  { id:'default',    label:'Cormorant + Montserrat', serif:'Cormorant Garamond', sans:'Montserrat',     url:null },
  { id:'playfair',   label:'Playfair + Lato',        serif:'Playfair Display',  sans:'Lato',            url:'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&display=swap' },
  { id:'eb-garamond',label:'EB Garamond + Nunito',   serif:'EB Garamond',       sans:'Nunito',          url:'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Nunito:wght@300;400;600&display=swap' },
  { id:'bodoni',     label:'Libre Bodoni + Inter',   serif:'Libre Bodoni',      sans:'Inter',           url:'https://fonts.googleapis.com/css2?family=Libre+Bodoni:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500&display=swap' },
  { id:'dm-serif',   label:'DM Serif + DM Sans',     serif:'DM Serif Display',  sans:'DM Sans',         url:'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap' },
];

function inRange(range) {
  const now=new Date(), md=`${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  return range.start<=range.end ? md>=range.start&&md<=range.end : md>=range.start||md<=range.end;
}

function applyTheme(themeData) {
  const root=document.documentElement;
  if (themeData.vars) Object.entries(themeData.vars).forEach(([k,v])=>root.style.setProperty(k,v));
  if (themeData.fontId) {
    const fp=FONT_PAIRS.find(f=>f.id===themeData.fontId);
    if (fp) {
      if (fp.url) {
        let lnk=$$('dynamic-font-link');
        if (!lnk) { lnk=document.createElement('link'); lnk.id='dynamic-font-link'; lnk.rel='stylesheet'; document.head.appendChild(lnk); }
        lnk.href=fp.url;
      }
      root.style.setProperty('--serif',`'${fp.serif}', Georgia, serif`);
      root.style.setProperty('--sans', `'${fp.sans}', sans-serif`);
    }
  }
}

function detectAndApplySeasonalTheme() {
  const saved=DB.getTheme();
  // Only apply colour overrides if admin deliberately pinned a theme
  if (saved?.pinned) { applyTheme(saved); return; }
  // Auto-apply seasonal colour palette if today is within a seasonal range
  for (const t of SEASONAL_THEMES) {
    if (t.dates.some(inRange)) { applyTheme({vars:t.vars, fontId:saved?.fontId||'default'}); return; }
  }
  // Otherwise: only restore font preference — never auto-apply saved colour overrides.
  // Colours revert to the CSS defaults unless admin explicitly pins them.
  if (saved?.fontId && saved.fontId !== 'default') applyTheme({ fontId: saved.fontId });
}

function activeSeasonal() {
  for (const t of SEASONAL_THEMES) { if (t.dates.some(inRange)) return t.name; }
  return null;
}

function cssVarHex(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function renderThemeTab(el) {
  const saved=DB.getTheme()||{}, fontId=saved.fontId||'default';
  const seasonal=activeSeasonal(), socials=DB.getSocials(), subs=DB.getSubscribers();
  el.innerHTML=`
    <div class="theme-studio">
      ${seasonal?`<div class="seasonal-banner">🌙 <strong>${seasonal}</strong> seasonal theme is active automatically.</div>`:''}
      ${saved.pinned?`<div class="seasonal-banner" style="border-left-color:#5cba82">📌 <strong>${esc(saved.pinnedName||'Custom')}</strong> theme is pinned.
        <button class="admin-btn admin-btn--ghost" onclick="unpinTheme()" style="margin-left:1rem;font-size:.58rem">Unpin</button></div>`:''}

      <div class="theme-section">
        <div class="theme-section-title">Seasonal Themes <span class="theme-hint">Auto-apply on their dates — preview or pin any time</span></div>
        <div class="seasonal-grid">
          ${SEASONAL_THEMES.map(t=>`
            <div class="seasonal-card" style="background:${t.preview}">
              <div class="seasonal-name">${t.name}</div>
              <div class="seasonal-dates">${t.dates.map(d=>`${d.start} → ${d.end}`).join(', ')}</div>
              <div class="seasonal-actions">
                <button class="admin-btn admin-btn--edit"    onclick="previewSeasonalTheme('${t.id}')">Preview</button>
                <button class="admin-btn admin-btn--approve" onclick="pinSeasonalTheme('${t.id}')">Pin</button>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <div class="theme-section">
        <div class="theme-section-title">Typography</div>
        <div class="font-grid">
          ${FONT_PAIRS.map(f=>`
            <div class="font-card ${fontId===f.id?'font-card--active':''}" onclick="applyFontPair('${f.id}')">
              <div class="font-preview" style="font-family:'${f.serif}',Georgia,serif">${f.serif.split(' ')[0]}</div>
              <div class="font-label">${f.label}</div>
            </div>`).join('')}
        </div>
      </div>

      <div class="theme-section">
        <div class="theme-section-title">Brand Colours</div>
        <div class="color-grid">
          <div class="color-swatch-wrap"><label>Gold Accent</label>
            <input type="color" id="pick-gold"  value="${cssVarHex('--gold','#C9973A')}"  oninput="liveColorPick()"></div>
          <div class="color-swatch-wrap"><label>Background</label>
            <input type="color" id="pick-cream" value="${cssVarHex('--cream','#F7F4EE')}" oninput="liveColorPick()"></div>
          <div class="color-swatch-wrap"><label>Dark Base</label>
            <input type="color" id="pick-ink"   value="${cssVarHex('--ink','#080604')}"   oninput="liveColorPick()"></div>
        </div>
        <div style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap">
          <button class="admin-btn admin-btn--approve" onclick="saveCustomTheme()">Save Colours</button>
          <button class="admin-btn admin-btn--ghost" onclick="resetTheme()" style="border-color:rgba(0,0,0,.18);color:var(--warm)">Reset to Default</button>
        </div>
        <div id="theme-saved-msg" class="form-success" style="display:none;margin-top:1rem">✓ Theme saved.</div>
      </div>

      <div class="theme-section">
        <div class="theme-section-title">Social &amp; Contact Links</div>
        <div class="form-full" style="max-width:480px">
          <input type="url"  id="set-linkedin"  placeholder="LinkedIn URL (https://linkedin.com/company/...)" value="${esc(socials.linkedin||'')}">
          <input type="text" id="set-instagram" placeholder="Instagram handle (@immortalhoteliers)"            value="${esc(socials.instagram||'')}">
          <input type="text" id="set-whatsapp"  placeholder="WhatsApp number (97451142741)"                   value="${esc(socials.whatsapp||'')}">
          <div id="socials-saved" class="form-success" style="display:none">✓ Saved.</div>
          <button class="admin-btn admin-btn--approve" onclick="saveSocials()" style="font-family:var(--sans);align-self:flex-start">Save Links</button>
        </div>
      </div>

      <div class="theme-section">
        <div class="theme-section-title">Newsletter Subscribers</div>
        <p style="font-size:.82rem;color:var(--warm);margin-bottom:1rem">${subs.length} subscriber${subs.length!==1?'s':''} collected.</p>
        <button class="admin-btn admin-btn--edit" onclick="exportSubscribers()">Export as CSV</button>
      </div>
    </div>`;
}

function liveColorPick() {
  const root=document.documentElement;
  const g=$$('pick-gold')?.value, c=$$('pick-cream')?.value, k=$$('pick-ink')?.value;
  if (g) root.style.setProperty('--gold',g);
  if (c) root.style.setProperty('--cream',c);
  if (k) { root.style.setProperty('--ink',k); root.style.setProperty('--ink-soft',k); }
}

function applyFontPair(fontId) {
  const saved=DB.getTheme()||{}; saved.fontId=fontId; DB.setTheme(saved); applyTheme(saved); setAdminTab('theme');
}

function saveCustomTheme() {
  const saved=DB.getTheme()||{};
  saved.vars={'--gold':$$('pick-gold')?.value||'#C9973A','--cream':$$('pick-cream')?.value||'#F7F4EE',
    '--ink':$$('pick-ink')?.value||'#080604','--ink-soft':$$('pick-ink')?.value||'#1A1612'};
  saved.pinned=false; DB.setTheme(saved); applyTheme(saved);
  flashMsg('theme-saved-msg','✓ Theme saved and applied.',3000);
}

function previewSeasonalTheme(id) {
  const t=SEASONAL_THEMES.find(t=>t.id===id);
  if (t) applyTheme({vars:t.vars, fontId:(DB.getTheme()||{}).fontId||'default'});
}

function pinSeasonalTheme(id) {
  const t=SEASONAL_THEMES.find(t=>t.id===id); if (!t) return;
  const theme={vars:t.vars, fontId:(DB.getTheme()||{}).fontId||'default', pinned:true, pinnedName:t.name};
  DB.setTheme(theme); applyTheme(theme); setAdminTab('theme');
}

function unpinTheme() {
  const saved=DB.getTheme()||{}; saved.pinned=false; DB.setTheme(saved);
  detectAndApplySeasonalTheme(); setAdminTab('theme');
}

function resetTheme() {
  DB.setTheme(null);
  const root=document.documentElement;
  [['--gold','#C9973A'],['--gold-light','#E8B84B'],['--ink','#080604'],['--ink-soft','#1A1612'],['--cream','#F7F4EE'],
   ['--serif',"'Cormorant Garamond', Georgia, serif"],['--sans',"'Montserrat', sans-serif"]].forEach(([k,v])=>root.style.setProperty(k,v));
  const lnk=$$('dynamic-font-link'); if (lnk) lnk.href='';
  setAdminTab('theme');
}

/* ── FOOTER ─────────────────────────────────────────────────── */
function setFooterYear() { setTxt('footer-year', new Date().getFullYear()); }

/* ── ADMIN DASHBOARD LAYOUT CSS ─────────────────────────────── */
(function injectDashCSS() {
  const style = document.createElement('style');
  style.textContent = `
    .dash-grid{display:grid;grid-template-columns:1fr 320px;gap:2.5rem}
    .dash-side{border-left:1px solid var(--rule);padding-left:2rem}
    .subs-list{margin-top:.5rem}
    .sub-item{display:flex;justify-content:space-between;padding:.55rem 0;border-bottom:1px solid var(--rule);font-size:.8rem}
    .sub-item span{color:var(--warm);font-weight:300}
    .sub-date{color:rgba(0,0,0,.3)!important;font-size:.7rem}
    @media(max-width:900px){.dash-grid{grid-template-columns:1fr}.dash-side{border-left:none;padding-left:0;border-top:1px solid var(--rule);padding-top:2rem}}
  `;
  document.head.appendChild(style);
})();

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  detectAndApplySeasonalTheme(); // first — prevents theme flash
  renderNav();
  renderPublicStories();
  renderPublicBlogs();
  applySocials();
  setFooterYear();
  checkCookieConsent();

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(m => {
    m.addEventListener('click', e => {
      if (e.target !== m) return;
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Escape key closes any open modal
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-backdrop.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
});

/* ═══════════════════════════════════════════════════════════
   STORIES SEARCH + FILTER
═══════════════════════════════════════════════════════════ */
let _searchQuery  = '';
let _activeFilter = 'all';

function searchStories(query) {
  _searchQuery = query.trim().toLowerCase();
  const clearBtn = $$('search-clear-btn');
  if (clearBtn) clearBtn.style.display = _searchQuery ? 'flex' : 'none';
  _storiesPage = 1;
  renderPublicStories();
}

function clearSearch() {
  const input = $$('stories-search-input');
  if (input) input.value = '';
  _searchQuery = '';
  const clearBtn = $$('search-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';
  _storiesPage = 1;
  renderPublicStories();
}

function setStoryFilter(filter, btn) {
  _activeFilter = filter;
  _storiesPage  = 1;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderPublicStories();
}

// Override renderPublicStories to support search + filter
// This extends the existing function already defined above in the file
const _baseRenderStories = renderPublicStories;
window.renderPublicStories = function () {
  const container = $$('public-stories-list');
  if (!container) return;

  const all      = DB.getStories().filter(s => s.status === 'approved');
  const countEl  = $$('search-results-count');

  // If no search/filter active, fall back to base render
  if (!_searchQuery && _activeFilter === 'all') {
    if (countEl) countEl.style.display = 'none';
    _baseRenderStories();
    return;
  }

  // Filter
  let filtered = all.filter(s => {
    const matchesFilter = _activeFilter === 'all' ||
      s.role.toLowerCase().includes(_activeFilter.toLowerCase()) ||
      s.title.toLowerCase().includes(_activeFilter.toLowerCase());
    const matchesQuery  = !_searchQuery ||
      s.title.toLowerCase().includes(_searchQuery)       ||
      s.role.toLowerCase().includes(_searchQuery)        ||
      s.authorName.toLowerCase().includes(_searchQuery)  ||
      s.content.toLowerCase().includes(_searchQuery);
    return matchesFilter && matchesQuery;
  });

  // Results count
  if (countEl) {
    if (_searchQuery || _activeFilter !== 'all') {
      countEl.textContent = filtered.length
        ? `${filtered.length} stor${filtered.length === 1 ? 'y' : 'ies'} found`
        : 'No stories match your search';
      countEl.style.display = 'block';
    } else {
      countEl.style.display = 'none';
    }
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">◎</div>
        <h3>No stories found</h3>
        <p>Try a different keyword or <a onclick="clearSearch()" style="color:var(--gold);cursor:pointer">clear the search</a> to see all stories.</p>
      </div>`;
    return;
  }

  const slice = filtered.slice(0, _storiesPage * PAGE_SIZE);

  container.innerHTML = slice.map((s, i) => {
    // Highlight matching text in title/role
    const highlight = (text) => {
      if (!_searchQuery) return esc(text);
      const re  = new RegExp(`(${_searchQuery.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
      return esc(text).replace(re, '<mark class="search-highlight">$1</mark>');
    };
    return `
      <div class="story-card dynamic-story" onclick="openStoryModal('${esc(s.id)}')">
        ${s.photo
          ? `<img class="story-img" src="${esc(s.photo)}" alt="${esc(s.authorName)}"
                 onerror="this.src='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80'">`
          : `<div class="story-img story-img-placeholder"><span>${esc(s.authorName[0])}</span></div>`}
        <div class="story-body">
          <div class="story-num">${String(i + 1).padStart(2, '0')}</div>
          <h3>${highlight(s.title)}</h3>
          <span class="story-role">${highlight(s.role)}</span>
          <p>${esc(s.content.substring(0, 160))}…</p>
          <a class="story-cta">Read the full story</a>
        </div>
      </div>`;
  }).join('');

  if (slice.length < filtered.length) {
    const remaining = filtered.length - slice.length;
    const btn = document.createElement('div');
    btn.className = 'load-more-wrap';
    btn.innerHTML = `<button class="btn" onclick="loadMoreStories()">
      Load More <span style="opacity:.6;font-size:.85em">(${remaining} remaining)</span>
    </button>`;
    container.appendChild(btn);
  }
};

/* ═══════════════════════════════════════════════════════════
   SERVICE CONNECT MODAL
═══════════════════════════════════════════════════════════ */
function openServiceContact(reason) {
  const select = $$('sc-reason');
  if (select) {
    // Pre-select the matching option
    Array.from(select.options).forEach(opt => {
      opt.selected = opt.text === reason;
    });
    // If no match, select "General inquiry"
    if (select.selectedIndex <= 0) {
      Array.from(select.options).forEach(opt => {
        if (opt.text === 'General inquiry') opt.selected = true;
      });
    }
  }
  // Clear previous state
  hideEl('sc-error');
  hideEl('sc-success');
  $$('service-contact-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeServiceContactModal() {
  $$('service-contact-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

async function submitServiceContact(e) {
  e.preventDefault();
  const errEl = $$('sc-error');
  const sucEl = $$('sc-success');
  hideEl('sc-error');

  const fname   = getVal('sc-fname').trim();
  const lname   = getVal('sc-lname').trim();
  const email   = getVal('sc-email').trim();
  const message = getVal('sc-message').trim();

  if (!fname || !email || !message) {
    if (errEl) { errEl.textContent = 'Please fill in your name, email, and message.'; errEl.style.display = 'block'; }
    return;
  }

  const payload = {
    name:    `${fname} ${lname}`,
    email,
    phone:   getVal('sc-phone').trim(),
    role:    getVal('sc-role').trim(),
    reason:  getVal('sc-reason'),
    message,
    source:  'Services Page',
  };

  if (FORMSPREE_ID === 'YOUR_FORM_ID') {
    flashMsg('sc-success', '✓ Message sent! Hari will be in touch within 24 hours.', 6000);
    // Reset form after success
    setTimeout(() => {
      ['sc-fname','sc-lname','sc-email','sc-phone','sc-role','sc-message'].forEach(id => setVal(id, ''));
    }, 500);
    return;
  }

  try {
    const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (res.ok) {
      flashMsg('sc-success', '✓ Message sent! Hari will be in touch within 24 hours.', 6000);
      setTimeout(() => closeServiceContactModal(), 4000);
    } else {
      if (errEl) { errEl.textContent = 'Send failed. Please email us directly at info@immortalhoteliers.com'; errEl.style.display = 'block'; }
    }
  } catch {
    if (errEl) { errEl.textContent = 'Network error. Please email info@immortalhoteliers.com directly.'; errEl.style.display = 'block'; }
  }
}
