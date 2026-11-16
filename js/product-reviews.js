const products = {
  tennis: { id: '12003106005', name: '테니스 베어 키링' },
  swim: { id: '12759870689', name: '수영곰 키링 스위미베어' },
  climb: { id: '13195324005', name: '클라이밍 베어 키링' },
  drops: { id: '9527489976', name: '물방울 스티커' },
  magnet: { id: '13550300486', name: '수영장 마그넷' },
};

const labels = { naver: '네이버 스마트스토어', cm: '29CM', etsy: 'Etsy' };
const $ = id => document.getElementById(id);
const slug = new URLSearchParams(location.search).get('product');
const page = Object.hasOwn(products, slug) ? products[slug] : null;
const PAGE_SIZE = 20;
let reviews = [];
let source = '';
let limit = PAGE_SIZE;
let language = 'original';
let shown = 0;        // how many bubbles are on screen
let feed = 0;         // timer of the bubbles still arriving
let follow = true;    // keep the newest bubble in view (until the reader scrolls away)

// language flags, drawn (flag emoji do not show on Windows). viewBox 0 0 36 36, cropped to a circle by the button.
const flags = {
  original: ['원문', '<rect width="36" height="36" fill="#fff"/><path d="M11.5 18a6.5 6.5 0 0 1 13 0z" fill="#cd2e3a" transform="rotate(-34 18 18)"/><path d="M24.500 18a6.500 6.500 0 0 1-13 0z" fill="#0047a0" transform="rotate(-34 18 18)"/><g stroke="#000" stroke-width="1.6"><path d="M6 10l4-5M8 11.500l4-5M24 5.500l4 5M26 4.500l4 5M6 26l4 5M8 24.500l4 5M24 30.500l4-5M26 31.500l4-5"/></g>'],
  en: ['English', '<rect width="36" height="36" fill="#fff"/><g fill="#b22234"><rect width="36" height="2.800"/><rect y="5.540" width="36" height="2.800"/><rect y="11.080" width="36" height="2.800"/><rect y="16.620" width="36" height="2.800"/><rect y="22.160" width="36" height="2.800"/><rect y="27.700" width="36" height="2.800"/><rect y="33.240" width="36" height="2.800"/></g><rect width="19" height="19.400" fill="#3c3b6e"/><g fill="#fff"><circle cx="5" cy="5" r="1"/><circle cx="10" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="7.500" cy="9.700" r="1"/><circle cx="12.500" cy="9.700" r="1"/><circle cx="5" cy="14.400" r="1"/><circle cx="10" cy="14.400" r="1"/><circle cx="15" cy="14.400" r="1"/></g>'],
  ja: ['日本語', '<rect width="36" height="36" fill="#fff"/><circle cx="18" cy="18" r="8" fill="#bc002d"/>'],
  it: ['Italiano', '<rect width="12" height="36" fill="#009246"/><rect x="12" width="12" height="36" fill="#fff"/><rect x="24" width="12" height="36" fill="#ce2b37"/>'],
  de: ['Deutsch', '<rect width="36" height="12" fill="#000"/><rect y="12" width="36" height="12" fill="#dd0000"/><rect y="24" width="36" height="12" fill="#ffce00"/>'],
  es: ['Español', '<rect width="36" height="36" fill="#aa151b"/><rect y="9" width="36" height="18" fill="#f1bf00"/>'],
  fr: ['Français', '<rect width="12" height="36" fill="#0055a4"/><rect x="12" width="12" height="36" fill="#fff"/><rect x="24" width="12" height="36" fill="#ef4135"/>'],
  zh: ['简体中文', '<rect width="36" height="36" fill="#de2910"/><path d="M13 8l1.650 5.070h5.330l-4.310 3.130 1.640 5.070L13 18.140l-4.310 3.130 1.640-5.070-4.310-3.130h5.330z" fill="#ffde00"/><g fill="#ffde00"><circle cx="23" cy="8" r="1.300"/><circle cx="26.500" cy="12" r="1.300"/><circle cx="26.500" cy="17" r="1.300"/><circle cx="23" cy="21" r="1.300"/></g>'],
  'zh-Hant': ['繁體中文（台灣）', '<rect width="36" height="36" fill="#fe0000"/><rect width="20" height="19" fill="#000095"/><circle cx="10" cy="9.500" r="5.600" fill="#fff"/><circle cx="10" cy="9.500" r="3.400" fill="#000095"/><circle cx="10" cy="9.500" r="2.700" fill="#fff"/>'],
  th: ['ไทย', '<rect width="36" height="36" fill="#a51931"/><rect y="6" width="36" height="24" fill="#f4f5f8"/><rect y="12" width="36" height="12" fill="#2d2a4a"/>'],
};
function flagButton(key) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'flag'; button.title = flags[key][0];
  button.innerHTML = '<svg viewBox="0 0 36 36" aria-hidden="true">' + flags[key][1] + '</svg><span class="sr-only">' + flags[key][0] + '</span>';
  return button;
}
function drawFlags(open) {
  const now = $('flag-now'), list = $('flag-list');
  now.innerHTML = flagButton(language).innerHTML; now.title = '후기 언어: ' + flags[language][0];
  now.setAttribute('aria-expanded', String(open)); list.hidden = !open;
  if (!open) return;
  const others = Object.keys(flags).filter(key => key !== language);
  list.replaceChildren(...others.map((key, i) => {
    const button = flagButton(key);
    button.style.setProperty('--i', others.length - 1 - i);   // the one next to the button comes out first
    button.addEventListener('click', () => { language = key; drawFlags(false); render(false); $('flag-now').focus(); });
    return button;
  }));
}

function text(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}

function card(review, language) {
  const article = document.createElement('article'), bubble = text('div', '', 'bubble');
  const meta = text('div', '', 'meta');
  if (Number.isInteger(review.rating)) {
    const n = Math.max(0, Math.min(5, review.rating)), stars = text('span', '★'.repeat(n), 'stars');
    if (n < 5) stars.append(text('i', '★'.repeat(5 - n)));
    stars.setAttribute('role', 'img'); stars.setAttribute('aria-label', '5점 만점에 ' + n + '점');
    meta.append(stars);
  }
  if (labels[review.source]) meta.append(text('span', labels[review.source], 'src'));
  for (const value of [review.author, review.date]) if (value) meta.append(text('span', value));
  const translated = language !== 'original' && review.translations?.[language];
  const body = text('p', translated || review.text || '본문 없이 등록된 후기', review.text ? '' : 'none');
  if (review.text) body.lang = translated ? language : (review.textLang || 'ko');
  bubble.append(body);
  if (translated && translated !== review.text) {
    const detail = document.createElement('details');
    const original = text('p', review.text);
    original.lang = review.textLang || 'ko';
    detail.append(text('summary', '원문 보기'), original);
    bubble.append(detail);
  }
  if (review.photos?.length) {
    const photos = text('div', '', 'photos');
    for (const url of review.photos) {
      if (!/^https:\/\//i.test(url)) continue;
      const photo = document.createElement('img');
      photo.src = url;
      photo.alt = '고객 리뷰 사진';
      photo.loading = 'lazy';
      photo.referrerPolicy = 'no-referrer';
      photos.append(photo);
    }
    bubble.append(photos);
  }
  if (review.source === 'etsy' && /^\d+$/.test(review.listing || '')) {
    const link = text('a', 'Etsy 상품 보기 ↗');
    link.href = 'https://www.etsy.com/listing/' + review.listing;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    bubble.append(link);
  }
  article.append(bubble, meta);
  return article;
}

// arrive: true → the bubbles not on screen yet come in one after another, like messages
function render(arrive = true) {
  const visible = source ? reviews.filter(review => review.source === source) : reviews;
  const box = $('reviews'), list = visible.slice(0, limit);
  clearTimeout(feed);
  $('status').textContent = '구매 후기 ' + visible.length.toLocaleString('ko-KR') + '건';
  $('more').hidden = visible.length <= limit;
  for (const button of $('sources').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.source === source));
  }
  const still = !arrive || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const keep = Math.min(shown, list.length), at = box.scrollTop;
  box.replaceChildren(...list.slice(0, still ? list.length : keep).map(review => card(review, language)));
  if (still) { shown = list.length; box.scrollTop = arrive ? box.scrollHeight : at; return; }
  box.scrollTop = at; shown = keep; follow = true;
  const next = () => {
    if (shown >= list.length) return;
    const node = card(list[shown++], language); node.classList.add('in'); box.append(node);
    if (follow) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    feed = setTimeout(next, 420);
  };
  next();
}

async function init() {
  if (!page) {
    $('status').textContent = '3D 페이지에서 상품의 구매 후기 버튼으로 열어주세요.';
    return;
  }
  $('title').textContent = page.name;
  document.title = page.name + ' 구매 후기 · ALLTÄGLICH';
  try {
    const response = await fetch('https://alltaglich-reviews.pages.dev/reviews/' + page.id + '.json');
    if (!response.ok) throw new Error('Unable to load reviews');
    reviews = await response.json();
    if (!Array.isArray(reviews)) throw new Error('Invalid review data');
    const present = new Set(reviews.map(review => review.source));
    for (const key of ['', ...Object.keys(labels).filter(key => present.has(key))]) {
      const button = text('button', labels[key] || '전체');
      button.type = 'button';
      button.dataset.source = key;
      button.addEventListener('click', () => { source = key; limit = PAGE_SIZE; shown = 0; render(); });
      $('sources').append(button);
    }
    $('controls').hidden = false;
    render();
  } catch {
    $('status').textContent = '후기를 불러오지 못했어요. 잠시 뒤 이 페이지를 새로고침해 주세요.';
  }
}

$('flag-now').addEventListener('click', () => drawFlags($('flag-list').hidden));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('flag-list').hidden) { drawFlags(false); $('flag-now').focus(); } });
document.addEventListener('pointerdown', event => { if (!$('flag-list').hidden && !event.target.closest('.flags')) drawFlags(false); });
// the reader scrolled up to read: stop pulling the view down to each new bubble
for (const type of ['wheel', 'touchmove']) $('reviews').addEventListener(type, () => { follow = false; }, { passive: true });
drawFlags(false);
$('more').addEventListener('click', () => { limit += PAGE_SIZE; render(); });
void init();
