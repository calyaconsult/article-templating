// Fills teasers, archive list and article content of a blog post page.
const TEASER_DATA_URL = './data/all-teaser-content.json';
const ARTICLE_DIR = './';          // folder of the Markdown files, e.g. './articles/'
const TEASER_COUNT = 2;
const YEAR = 2026;                 // teaser dates in the JSON carry no year

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// blogpost-YYYYMMDD-n.html
const ARTICLE_URL_PATTERN = /blogpost-(\d{4})(\d{2})(\d{2})-(\d+)\.html$/;

// Filename of the calling document without extension, e.g. "blogpost-20261023-1"
const BASEFILE = location.pathname.split('/').pop().split('.')[0];

document.addEventListener('DOMContentLoaded', fillPage);

async function fillPage() {
  const data = await loadTeaserData();   // null on failure; article still works

  // Each step runs independently, so an error in one doesn't block the others
  const steps = [
    ['Teaser',  () => fillTeasers(data)],
    ['Archiv',  () => fillArchive(data)],
    ['Artikel', fillArticle],
  ];
  for (const [name, step] of steps) {
    try {
      await step();
      console.info(`✔ ${name} gefüllt`);
    } catch (err) {
      console.error(`✘ ${name} fehlgeschlagen:`, err);
    }
  }
}

async function loadTeaserData() {
  try {
    const response = await fetch(TEASER_DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status} beim Laden von ${TEASER_DATA_URL}`);
    return await response.json();
  } catch (err) {
    console.error('Teaser-Daten konnten nicht geladen werden:', err);
    return null;
  }
}

/* ---------- Teasers ---------- */

// "23. Oktober" -> "2026-10-23"; anything unrecognized is returned unchanged
function datumToISO(str) {
  const [dayPart, monthName] = str.trim().split(/\s+/);
  const monthIndex = MONATE.indexOf(monthName);
  if (monthIndex === -1) return str.trim();

  const day   = String(parseInt(dayPart, 10)).padStart(2, '0');
  const month = String(monthIndex + 1).padStart(2, '0');
  return `${YEAR}-${month}-${day}`;
}

function fillTeasers(data) {
  if (!data) throw new Error('keine Teaser-Daten');

  // Keep the JSON order and skip the first entry (DUMMY)
  const [, ...teasers] = Object.values(data);
  teasers.slice(0, TEASER_COUNT).forEach((teaser, index) => {
    fillTeaser(document.getElementById(`teaser-${index}`), teaser);
  });
}

function fillTeaser(container, teaser) {
  if (!container || !teaser) return;

  container.querySelector('strong').textContent       = teaser.strong;
  container.querySelector('h3').textContent           = teaser.h3;
  container.querySelector('p.card-text').textContent  = teaser.p;
  container.querySelector('a.stretched-link').href    = teaser.a;

  const time = container.querySelector('time.text-muted');
  time.textContent = teaser.div;
  time.dateTime    = datumToISO(teaser.div);

  const img = container.querySelector('img');
  img.src = teaser['img-src'];
  img.alt = teaser['img-alt'];
}

/* ---------- Archive ---------- */

function fillArchive(data) {
  if (!data) throw new Error('keine Teaser-Daten');

  const list = findArchiveList();
  if (!list) throw new Error('Archiv-Liste nicht gefunden');

  const articles = Object.values(data)
    .map(parseArticle)
    .filter(Boolean)                                      // drops DUMMY and invalid links
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey));  // newest first

  list.replaceChildren(...articles.map(createArchiveItem));
}

function findArchiveList() {
  const byId = document.getElementById('archiv-liste');
  if (byId) return byId;

  const heading = [...document.querySelectorAll('.blog-sidebar h2')]
    .find(h => h.textContent.trim() === 'Archiv');
  return heading?.parentElement.querySelector('ul') ?? null;
}

function parseArticle(teaser) {
  const match = ARTICLE_URL_PATTERN.exec(teaser?.a ?? '');
  if (!match) return null;

  const [, year, month, day, number] = match;
  return {
    url: teaser.a,
    title: teaser.h3,
    dateText: `${Number(day)}. ${MONATE[Number(month) - 1]} ${year}`,
    sortKey: `${year}${month}${day}-${number.padStart(3, '0')}`,
  };
}

function createArchiveItem(article) {
  const li = document.createElement('li');

  const a = document.createElement('a');
  a.href = article.url;
  a.textContent = article.title;

  const small = document.createElement('small');
  small.className = 'text-muted';
  small.textContent = article.dateText;

  li.append(a, ' ', small);
  return li;
}

/* ---------- Article content (Markdown) ---------- */

async function fillArticle() {
  const url = articleSourceUrl();
  if (!url) {
    throw new Error('Keine Markdown-Quelle: Dateiname passt nicht zu blogpost-YYYYMMDD-n.html ' +
                    'und kein <meta name="article-source"> vorhanden');
  }
  if (typeof marked === 'undefined') {
    throw new Error('marked.js ist nicht geladen');
  }

  const response = await fetch(url);
  if (!response.ok) {
    console.error(
      `HTTP ${response.status} beim Laden von ${url}\n\n` +
      'So beheben Sie das Problem:\n' +
      `1. Existiert die Datei "${url}"? Der Name muss genau zur Seite passen (blogpost-YYYYMMDD-n.md).\n` +
      `2. Liegt sie im richtigen Ordner? ARTICLE_DIR ist aktuell "${ARTICLE_DIR}".\n` +
      '3. Falls <meta name="article-source"> gesetzt ist: Stimmt der Pfad darin?'
    );
    throw new Error(`HTTP ${response.status} beim Laden von ${url}`);
  }

  const { meta, body } = parseFrontMatter(await response.text());

  const missing = ['title', 'kategorie', 'description', 'author', 'robots', 'canonical']
    .filter(key => !meta[key]);
  if (missing.length) console.warn('Fehlende Angaben im Front Matter:', missing.join(', '));

  // <head>
  if (meta.title) document.title = meta.title;
  setAttr('meta[name="title"]',    'content', meta.title);
  setAttr('#meta_description',     'content', meta.description);
  setAttr('meta[name="author"]',   'content', meta.author);
  setAttr('meta[name="robots"]',   'content', meta.robots);
  setAttr('link[rel="canonical"]', 'href',    meta.canonical);

  // <body>
  setText('.blog-header-logo', meta.kategorie);
  setText('.blog-main h1',     meta.headline || meta.title);
  findContentContainer().innerHTML = marked.parse(body);
}

// blogpost-20261023-1.html  ->  ./blogpost-20261023-1.md
// Override: <meta name="article-source" content="pfad/zur/datei.md">
function articleSourceUrl() {
  const override = document.querySelector('meta[name="article-source"]')?.content?.trim();
  if (override) {
    // A mismatch is suspicious but doesn't crash the page
    const overrideBase = override.split('/').pop().replace(/\.\w+$/, '');
    if (overrideBase !== BASEFILE) {
      console.warn(`article-source "${override}" passt nicht zum Seitennamen "${BASEFILE}"`);
    }
    return override;
  }

  const file = decodeURIComponent(location.pathname.split('/').pop());
  return ARTICLE_URL_PATTERN.test(file) ? ARTICLE_DIR + file.replace(/\.html$/, '.md') : null;
}

// Reads simple "key: value" lines between two "---" lines at the top of the file
function parseFrontMatter(text) {
  text = text.replace(/^\uFEFF/, '');                     // remove BOM, if any
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(text);
  if (!match) return { meta: {}, body: text };

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(line);     // "# ..." comments don't match
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    meta[kv[1].toLowerCase()] = value;
  }
  return { meta, body: text.slice(match[0].length) };
}

function findContentContainer() {
  const byId = document.getElementById('artikel-inhalt');
  if (byId) return byId;

  // Fallback: replace the text node "{{ARTIKEL_HAUPTINHALT}}" with a <div>
  const main = document.querySelector('.blog-main');
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue.includes('{{ARTIKEL_HAUPTINHALT}}')) {
      const div = document.createElement('div');
      div.id = 'artikel-inhalt';
      walker.currentNode.replaceWith(div);
      return div;
    }
  }
  throw new Error('Platzhalter {{ARTIKEL_HAUPTINHALT}} nicht gefunden');
}

/* ---------- Helpers ---------- */

function setAttr(selector, attr, value) {
  if (value) document.querySelector(selector)?.setAttribute(attr, value);
}

function setText(selector, value) {
  if (!value) return;
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

