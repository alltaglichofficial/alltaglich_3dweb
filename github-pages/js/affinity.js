export const AFFINITY_KEY = 'alltaglich.affinity.v1';
export const AFFINITY_GAINS = Object.freeze({ feed: 15, pet: 5, play: 10 });
export const ISLAND_IDS = Object.freeze(['tennis', 'pool', 'climb']);

// Progress belongs to this browser. Actual store coupon benefits can be configured
// later; unlocking a card never invents a redeemable code or discount.
export const COUPONS = Object.freeze({
  tennis: { title: '테니스 섬의 작은 선물', benefit: '혜택 공개 예정' },
  pool: { title: '수영 섬의 작은 선물', benefit: '혜택 공개 예정' },
  climb: { title: '클라이밍 섬의 작은 선물', benefit: '혜택 공개 예정' },
});

export function createAffinityStore(storage = null, now = () => Date.now()) {
  const state = Object.fromEntries(ISLAND_IDS.map(id => [id, { value: 0, unlockedAt: null, announced: false }]));
  try {
    const saved = JSON.parse(storage?.getItem(AFFINITY_KEY) || 'null');
    if (saved?.version === 1 && saved.islands) for (const id of ISLAND_IDS) {
      const item = saved.islands[id];
      if (!item || !Number.isFinite(item.value)) continue;
      state[id].value = Math.max(0, Math.min(100, Math.floor(item.value)));
      if (state[id].value === 100) {
        state[id].unlockedAt = Number.isFinite(item.unlockedAt) && item.unlockedAt > 0 ? item.unlockedAt : now();
        state[id].announced = item.announced === true;
      }
    }
  } catch { /* Private browsing and invalid saved data use the in-memory state. */ }
  const save = () => { try { storage?.setItem(AFFINITY_KEY, JSON.stringify({ version: 1, islands: state })); } catch { /* Session progress still works if storage is unavailable. */ } };
  return {
    get(id) { if (!state[id]) throw new Error('Unknown island'); return { ...state[id] }; },
    snapshot() { return Object.fromEntries(ISLAND_IDS.map(id => [id, { ...state[id] }])); },
    award(id, action) {
      const item = state[id], amount = AFFINITY_GAINS[action];
      if (!item || !amount) return { gained: 0, newlyUnlocked: false };
      const before = item.value;
      item.value = Math.min(100, before + amount);
      const newlyUnlocked = before < 100 && item.value === 100;
      if (newlyUnlocked) { item.unlockedAt = now(); item.announced = false; }
      if (item.value !== before) save();
      return { gained: item.value - before, newlyUnlocked };
    },
    markAnnounced(id) { if (state[id]?.value === 100) { state[id].announced = true; save(); } },
  };
}
