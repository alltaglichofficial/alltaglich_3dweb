import * as THREE from 'three';
import { createAffinityStore, COUPONS } from './affinity.js';
import { ISLANDS } from './islands.js';

export function createBondInteractions({ puppy, canvas, camera, controls, getWorld, focusDog, resetView, stopCamera, notify }) {
  let storage = null;
  try { storage = localStorage; } catch { /* Session-only progress still works. */ }
  const affinity = createAffinityStore(storage);
  const feedButton = document.querySelector('#feedDog'), petButton = document.querySelector('#petDog');
  const couponButton = document.querySelector('#showCoupon'), dialog = document.querySelector('#coupon-dialog');
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let petMode = false, stroke = null, pendingReward = null, feedbackTimer;
  function refresh() {
    const island = getWorld().island, value = affinity.get(island.id).value;
    document.querySelector('#affinity-value').textContent = `${value}%`;
    document.querySelector('#affinity-fill').style.width = `${value}%`;
    const meter = document.querySelector('#affinity-meter'); meter.setAttribute('aria-valuenow', value); meter.setAttribute('aria-label', `${island.label} 호감도`);
    couponButton.disabled = value < 100; couponButton.title = value < 100 ? '이 섬의 호감도 100%에 열려요' : '이 섬에서 받은 쿠폰 보기';
    document.querySelector('#bond-panel').setAttribute('aria-label', `${island.label}에서 스피츠 돌보기`);
  }
  function feedback(message, point) {
    const p = point || puppy.root.localToWorld(new THREE.Vector3(0, 1.4, 0)).project(camera);
    const x = point ? p.x : (p.x + 1) / 2 * innerWidth, y = point ? p.y : (1 - p.y) / 2 * innerHeight;
    const el = document.querySelector('#care-feedback'); el.textContent = message;
    el.style.left = `${Math.max(35, Math.min(innerWidth - 35, x))}px`; el.style.top = `${Math.max(50, Math.min(innerHeight - 80, y - 20))}px`;
    el.classList.remove('visible'); void el.offsetWidth; el.classList.add('visible'); clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => el.classList.remove('visible'), 1250);
  }
  function award(id, action, point) {
    const result = affinity.award(id, action);
    if (result.gained) { feedback(`♥ +${result.gained}`, point); refresh(); }
    if (result.newlyUnlocked) pendingReward = id;
  }
  function showCoupon(id) {
    if (affinity.get(id).value < 100 || dialog.open) return;
    const island = ISLANDS.find(item => item.id === id), coupon = COUPONS[id];
    document.querySelector('#coupon-title').textContent = coupon.title;
    document.querySelector('#coupon-benefit').textContent = coupon.benefit;
    document.querySelector('#coupon-island').textContent = `${island.label} · 호감도 100% 달성`;
    dialog.showModal(); affinity.markAnnounced(id);
    notify(`${island.label} 호감도 100%를 달성했어요. 쿠폰 혜택은 공개 예정이에요.`);
  }
  function hitDog(event) {
    if (!puppy.root.visible) return false;
    const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(getWorld().root, true)[0];
    let object = hit?.object; while (object && object !== puppy.root) object = object.parent;
    return object === puppy.root;
  }
  function finishStroke(cancelled = false) {
    if (!stroke) return;
    const saved = stroke; stroke = null;
    controls.enabled = saved.controlsEnabled; controls.enableDamping = saved.damping;
    if (canvas.hasPointerCapture(saved.id)) canvas.releasePointerCapture(saved.id);
    canvas.style.cursor = 'grab';
    if (!petMode) puppy.endPet();
    if (!cancelled) { puppy.greet(); notify(saved.total >= 12 ? '쓰다듬어 줘서 좋아해요. 꼬리를 흔들어요!' : '반가워요! 강아지가 꼬리를 흔들어요.'); }
  }
  function endPetting() { finishStroke(true); petMode = false; puppy.endPet(); petButton.setAttribute('aria-pressed', 'false'); }
  feedButton.addEventListener('click', () => {
    endPetting();
    if (puppy.execute('feed')) { focusDog(getWorld().island.spawn); notify('밥을 준비했어요. 스피츠가 다 먹으면 호감도가 올라요.'); }
  });
  petButton.addEventListener('click', () => {
    if (petMode) { endPetting(); resetView(); return; }
    petMode = true; puppy.beginPet(); petButton.setAttribute('aria-pressed', 'true'); focusDog();
    notify('강아지 위에서 누른 채 좌우로 움직여 쓰다듬어 주세요.');
  });
  couponButton.addEventListener('click', () => showCoupon(getWorld().island.id));
  document.querySelector('#closeCoupon').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });

  // Capture before OrbitControls sees the pointer: touching the puppy pets it,
  // while a gesture beginning on the background continues to orbit the camera.
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || stroke || !hitDog(event)) return;
    event.preventDefault(); event.stopImmediatePropagation(); stopCamera(); puppy.beginPet();
    stroke = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0, total: 0, started: performance.now(), lastReward: performance.now(), island: getWorld().island.id, controlsEnabled: controls.enabled, damping: controls.enableDamping };
    controls.enabled = false; controls.enableDamping = false; controls.update(); canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
  }, { capture: true });
  canvas.addEventListener('pointermove', event => {
    if (!stroke || stroke.id !== event.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const distance = Math.hypot(event.clientX - stroke.x, event.clientY - stroke.y); stroke.x = event.clientX; stroke.y = event.clientY;
    if (distance > 120 || !hitDog(event) || !puppy.petStroke()) return;
    stroke.distance += Math.min(distance, 40); stroke.total += distance;
    const now = performance.now();
    if (now - stroke.started >= 300 && now - stroke.lastReward >= 800 && stroke.distance >= 35) {
      award(stroke.island, 'pet', { x: event.clientX, y: event.clientY }); stroke.distance = 0; stroke.lastReward = now;
    }
  }, { capture: true });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, event => {
    if (stroke?.id !== event.pointerId) return;
    event.stopImmediatePropagation(); finishStroke(type !== 'pointerup');
  }, { capture: true });
  refresh();
  return {
    affinity, endPetting,
    onIslandChange() {
      refresh(); const saved = affinity.get(getWorld().island.id); if (saved.value === 100 && !saved.announced) pendingReward = getWorld().island.id;
    },
    update(dog) {
      for (const event of puppy.drainEvents()) award(event.island, event.kind);
      feedButton.disabled = dog.command === 'feed';
      feedButton.textContent = dog.command === 'feed' ? '먹는 중…' : '밥 주기';
      if (petMode && dog.command !== 'pet' && dog.pendingCommand !== 'pet') petMode = false;
      petButton.setAttribute('aria-pressed', String(petMode || dog.care.mode === 'pet'));
      if (!stroke && pendingReward && !dialog.open) { const id = pendingReward; pendingReward = null; showCoupon(id); }
    },
  };
}
