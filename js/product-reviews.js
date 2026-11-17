const products = {
  tennis: { id: '12003106005', name: 'Tennis Bear' },
  swim: { id: '12759870689', name: 'Swimmy Bear' },
  climb: { id: '13195324005', name: 'Climbing Bear' },
  drops: { id: '9527489976', name: 'Water Drop Sticker' },
  magnet: { id: '13550300486', name: 'Swimming pool Magnet Set' },
};

const labels = { naver: 'Naver Smart Store', cm: '29CM', etsy: 'Etsy' };
const $ = id => document.getElementById(id);
const slug = new URLSearchParams(location.search).get('product');
const page = Object.hasOwn(products, slug) ? products[slug] : null;
const PAGE_SIZE = 20;
let reviews = [];
let source = '';
let limit = PAGE_SIZE;

function text(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}

function card(review, language) {
  const article = document.createElement('article');
  const meta = text('div', '', 'meta');
  if (Number.isInteger(review.rating)) {
    const n = Math.max(0, Math.min(5, review.rating)), stars = text('span', '★'.repeat(n), 'stars');
    if (n < 5) stars.append(text('i', '★'.repeat(5 - n)));
    stars.setAttribute('role', 'img'); stars.setAttribute('aria-label', n + ' out of 5');
    meta.append(stars);
  }
  if (labels[review.source]) meta.append(text('span', labels[review.source], 'src'));
  for (const value of [review.author, review.date]) if (value) meta.append(text('span', value));
  article.append(meta);
  const translated = language !== 'original' && review.translations?.[language];
  const body = text('p', translated || review.text || 'Rating only, no text');
  if (review.text) body.lang = translated ? language : (review.textLang || 'ko');
  article.append(body);
  if (translated && translated !== review.text) {
    const detail = document.createElement('details');
    const original = text('p', review.text);
    original.lang = review.textLang || 'ko';
    detail.append(text('summary', 'Show original'), original);
    article.append(detail);
  }
  if (review.photos?.length) {
    const photos = text('div', '', 'photos');
    for (const url of review.photos) {
      if (!/^https:\/\//i.test(url)) continue;
      const photo = document.createElement('img');
      photo.src = url;
      photo.alt = 'Customer photo';
      photo.loading = 'lazy';
      photo.referrerPolicy = 'no-referrer';
      photos.append(photo);
    }
    article.append(photos);
  }
  if (review.source === 'etsy' && /^\d+$/.test(review.listing || '')) {
    const link = text('a', 'View on Etsy ↗');
    link.href = 'https://www.etsy.com/listing/' + review.listing;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    article.append(link);
  }
  return article;
}

function render() {
  const visible = source ? reviews.filter(review => review.source === source) : reviews;
  const language = $('language').value;
  $('status').textContent = visible.length.toLocaleString('en-US') + (visible.length === 1 ? ' review' : ' reviews');
  $('reviews').replaceChildren(...visible.slice(0, limit).map(review => card(review, language)));
  $('more').hidden = visible.length <= limit;
  for (const button of $('sources').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.source === source));
  }
}

async function init() {
  if (!page) {
    $('status').textContent = 'Open this page from a product\'s review button on the 3D site.';
    return;
  }
  $('title').textContent = page.name;
  document.title = page.name + ' Reviews · ALLTÄGLICH';
  try {
    const response = await fetch('https://alltaglich-reviews.pages.dev/reviews/' + page.id + '.json', { signal: AbortSignal.timeout(15000) });   // never wait for ever
    if (!response.ok) throw new Error('Unable to load reviews');
    reviews = await response.json();
    if (!Array.isArray(reviews)) throw new Error('Invalid review data');
    const present = new Set(reviews.map(review => review.source));
    for (const key of ['', ...Object.keys(labels).filter(key => present.has(key))]) {
      const button = text('button', labels[key] || 'All');
      button.type = 'button';
      button.dataset.source = key;
      button.addEventListener('click', () => { source = key; limit = PAGE_SIZE; render(); });
      $('sources').append(button);
    }
    $('controls').hidden = false;
    render();
  } catch {
    $('status').textContent = 'The reviews could not be loaded. Please refresh this page in a moment.';
  }
}

$('language').addEventListener('change', render);
$('more').addEventListener('click', () => { limit += PAGE_SIZE; render(); });
void init();
