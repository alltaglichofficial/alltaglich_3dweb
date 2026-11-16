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
    stars.setAttribute('role', 'img'); stars.setAttribute('aria-label', '5점 만점에 ' + n + '점');
    meta.append(stars);
  }
  if (labels[review.source]) meta.append(text('span', labels[review.source], 'src'));
  for (const value of [review.author, review.date]) if (value) meta.append(text('span', value));
  article.append(meta);
  const translated = language !== 'original' && review.translations?.[language];
  const body = text('p', translated || review.text || '본문 없이 등록된 후기');
  if (review.text) body.lang = translated ? language : (review.textLang || 'ko');
  article.append(body);
  if (translated && translated !== review.text) {
    const detail = document.createElement('details');
    const original = text('p', review.text);
    original.lang = review.textLang || 'ko';
    detail.append(text('summary', '원문 보기'), original);
    article.append(detail);
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
    article.append(photos);
  }
  if (review.source === 'etsy' && /^\d+$/.test(review.listing || '')) {
    const link = text('a', 'Etsy 상품 보기 ↗');
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
  $('status').textContent = '구매 후기 ' + visible.length.toLocaleString('ko-KR') + '건';
  $('reviews').replaceChildren(...visible.slice(0, limit).map(review => card(review, language)));
  $('more').hidden = visible.length <= limit;
  for (const button of $('sources').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.source === source));
  }
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
      button.addEventListener('click', () => { source = key; limit = PAGE_SIZE; render(); });
      $('sources').append(button);
    }
    $('controls').hidden = false;
    render();
  } catch {
    $('status').textContent = '후기를 불러오지 못했어요. 잠시 뒤 이 페이지를 새로고침해 주세요.';
  }
}

$('language').addEventListener('change', render);
$('more').addEventListener('click', () => { limit += PAGE_SIZE; render(); });
void init();
