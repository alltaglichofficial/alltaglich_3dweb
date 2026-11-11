// Pure navigation logic, shared by the browser and the node regression tests.
// Obstacles are inflated by the puppy's body radius, not just its centre point.
export class Navigation {
  constructor(obstacles, { step = .4, clearance = .8, radiusX = 12, radiusZ = 8.9, bounds = null, min = -12, size = 61 } = {}) {
    this.obstacles = obstacles;
    this.step = step;
    this.clearance = clearance;
    this.radiusX = radiusX;
    this.radiusZ = radiusZ;
    this.bounds = bounds;
    this.min = min; // square search grid: min .. min + (size - 1) * step on both axes
    this.size = size;
    this.cells = new Uint8Array(this.size ** 2);
    for (let z = 0; z < this.size; z++) for (let x = 0; x < this.size; x++) {
      this.cells[z * this.size + x] = Number(this.isWalkable(this.min + x * step, this.min + z * step));
    }
  }
  isWalkable(x, z) {
    const r = this.clearance;
    if (this.bounds) {
      if (x < this.bounds.minX + r || x > this.bounds.maxX - r || z < this.bounds.minZ + r || z > this.bounds.maxZ - r) return false;
    } else if ((x / (this.radiusX - r)) ** 2 + (z / (this.radiusZ - r)) ** 2 > 1) return false;
    return !this.obstacles.some(o => o.type === 'circle'
      ? Math.hypot(x - o.x, z - o.z) < o.r + r
      : Math.abs(x - o.x) < o.w / 2 + r && Math.abs(z - o.z) < o.d / 2 + r);
  }
  clearLine(a, b) {
    // Exact segment intersections catch very short crossings at wall corners
    // that evenly spaced samples can miss. The island ellipse is convex.
    if (!this.isWalkable(a.x, a.z) || !this.isWalkable(b.x, b.z)) return false;
    const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
    for (const o of this.obstacles) {
      const margin = this.clearance + .0001;
      if (o.type === 'circle') {
        const t = length2 ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / length2)) : 0;
        if (Math.hypot(a.x + dx * t - o.x, a.z + dz * t - o.z) < o.r + margin) return false;
      } else {
        let enter = 0, exit = 1, intersects = true;
        for (const [origin, delta, low, high] of [[a.x, dx, o.x - o.w / 2 - margin, o.x + o.w / 2 + margin], [a.z, dz, o.z - o.d / 2 - margin, o.z + o.d / 2 + margin]]) {
          if (Math.abs(delta) < 1e-10) { if (origin <= low || origin >= high) { intersects = false; break; } }
          else {
            const t1 = (low - origin) / delta, t2 = (high - origin) / delta;
            enter = Math.max(enter, Math.min(t1, t2)); exit = Math.min(exit, Math.max(t1, t2));
            if (enter >= exit) { intersects = false; break; }
          }
        }
        if (intersects && enter < exit) return false;
      }
    }
    return true;
  }
  point(index) { return { x: this.min + (index % this.size) * this.step, z: this.min + Math.floor(index / this.size) * this.step }; }
  nearest(point) {
    let best = -1, distance = Infinity;
    for (let i = 0; i < this.cells.length; i++) {
      if (!this.cells[i]) continue;
      const p = this.point(i), d = (p.x - point.x) ** 2 + (p.z - point.z) ** 2;
      if (d < distance && this.clearLine(point, p)) { distance = d; best = i; }
    }
    return best;
  }
  connectors(point) {
    // A smoothed route may pass between grid cells. Connect virtual endpoints to
    // several visible cells so a tiny isolated nearest cell cannot trap a recall.
    const candidates = [];
    for (let i = 0; i < this.cells.length; i++) {
      if (!this.cells[i]) continue;
      const p = this.point(i), distance = Math.hypot(p.x - point.x, p.z - point.z);
      if (distance <= this.step * 3 && this.clearLine(point, p)) candidates.push({ index: i, distance });
    }
    candidates.sort((a, b) => a.distance - b.distance);
    if (!candidates.length) { const index = this.nearest(point); if (index >= 0) candidates.push({ index, distance: Math.hypot(this.point(index).x - point.x, this.point(index).z - point.z) }); }
    return candidates.slice(0, 8);
  }
  findPath(start, goal) {
    if (!this.isWalkable(start.x, start.z) || !this.isWalkable(goal.x, goal.z)) return [];
    if (this.clearLine(start, goal)) return [{ ...goal }];
    const starts = this.connectors(start), targets = this.connectors(goal);
    if (!starts.length || !targets.length) return [];
    const ends = new Set(targets.map(p => p.index));
    const open = new Set(starts.map(p => p.index)), closed = new Set();
    const costs = new Float32Array(this.cells.length).fill(Infinity);
    const parents = new Int32Array(this.cells.length).fill(-1);
    for (const p of starts) costs[p.index] = p.distance;
    const heuristic = i => { const p = this.point(i); return Math.hypot(p.x - goal.x, p.z - goal.z); };
    while (open.size) {
      let current = -1, lowest = Infinity;
      for (const i of open) { const score = costs[i] + heuristic(i); if (score < lowest) { lowest = score; current = i; } }
      if (ends.has(current)) {
        const raw = [{ ...goal }];
        for (let i = current; i !== -1; i = parents[i]) raw.push(this.point(i));
        raw.push({ ...start }); raw.reverse();
        // Line-of-sight smoothing is checked against the same inflated obstacles.
        const path = []; let anchor = 0;
        while (anchor < raw.length - 1) {
          let next = raw.length - 1;
          while (next > anchor + 1 && !this.clearLine(raw[anchor], raw[next])) next--;
          path.push(raw[next]); anchor = next;
        }
        return path;
      }
      open.delete(current); closed.add(current);
      const cx = current % this.size, cz = Math.floor(current / this.size);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dz) || cx + dx < 0 || cx + dx >= this.size || cz + dz < 0 || cz + dz >= this.size) continue;
        const next = (cz + dz) * this.size + cx + dx;
        if (!this.cells[next] || closed.has(next)) continue;
        if (!this.clearLine(this.point(current), this.point(next))) continue;
        const cost = costs[current] + Math.hypot(dx, dz) * this.step;
        if (cost >= costs[next]) continue;
        costs[next] = cost; parents[next] = current; open.add(next);
      }
    }
    return [];
  }
}

