import * as THREE from 'three';

// Wet spots on the ground: soft-edged, slightly darker patches that dry out (fade)
// over half a minute or so. A fixed pool of decals, recycled oldest first.
export function createWetMarks(parent, groundY) {
  const COUNT = 90, LIFE = 38;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  // an irregular blob: a few overlapping soft circles
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, r = i ? 22 + Math.random() * 10 : 40, x = 64 + (i ? Math.cos(a) * 22 : 0), y = 64 + (i ? Math.sin(a) * 22 : 0);
    const grad = g.createRadialGradient(x, y, r * .3, x, y, r); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.75, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
  const marks = Array.from({ length: COUNT }, (_, i) => {
    const material = new THREE.MeshBasicMaterial({ color: 0x7a6f5c, alphaMap: tex, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const mesh = new THREE.Mesh(geo, material); mesh.visible = false; mesh.renderOrder = 1; parent.add(mesh);
    // a faint wet sheen on the bigger puddles
    return { mesh, age: LIFE, peak: 0, grow: 0, size: 1 };
  });
  // paw prints: a wide heel pad and four toe beans, damp and darker, drying like the spots
  const pc = document.createElement('canvas'); pc.width = pc.height = 128;
  { const q = pc.getContext('2d'), blob = (x, y, rx, ry) => { const gr = q.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.7, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); q.save(); q.translate(x, y); q.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); q.translate(-x, -y); q.fillStyle = gr; q.beginPath(); q.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2); q.fill(); q.restore(); };
    blob(64, 82, 30, 25);                                              // heel pad (toward the back of the paw)
    for (const [x, y] of [[34, 44], [52, 33], [76, 33], [94, 44]]) blob(x, y, 11, 13); }   // toes, ahead
  const pawTex = new THREE.CanvasTexture(pc);
  const PAWS = 60, paws = Array.from({ length: PAWS }, () => {
    const material = new THREE.MeshBasicMaterial({ color: 0x6f6553, alphaMap: pawTex, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const mesh = new THREE.Mesh(geo, material); mesh.visible = false; mesh.renderOrder = 1; parent.add(mesh);
    return { mesh, age: LIFE };
  });
  let nextPaw = 0;
  let next = 0;
  return {
    add(x, z, r, big = false, y = groundY) {
      // merge into an existing fresh spot that it lands on, so puddles grow instead of stacking
      for (const m of marks) if (m.age < LIFE * .5 && Math.hypot(m.mesh.position.x - x, m.mesh.position.z - z) < m.size * .35 && m.size > r) { m.age = Math.min(m.age, 2); m.peak = Math.min(.42, m.peak + .03); return; }
      const m = marks[next++ % COUNT];
      m.mesh.position.set(x, y + .005 + (next % 7) * .0006, z); m.mesh.rotation.y = Math.random() * Math.PI * 2;
      m.size = r; m.grow = big ? .35 : .08; m.age = 0; m.peak = big ? .34 : .24; m.mesh.visible = true;
    },
    // a wet paw print at (x, z), toes pointing along yaw (radians, as rotation.y), `size` across
    paw(x, z, yaw, size, wetness = 1, y = groundY) {
      const p = paws[nextPaw++ % PAWS];
      p.mesh.position.set(x, y + .006 + (nextPaw % 5) * .0005, z); p.mesh.rotation.y = yaw + Math.PI;
      p.mesh.scale.set(size * .5, 1, size * .5); p.peak = .40 * Math.min(1, .35 + wetness); p.age = 0; p.mesh.visible = true;
    },
    update(dt) {
      if (!dt) return;
      for (const p of paws) {
        if (!p.mesh.visible) continue;
        p.age += dt; if (p.age >= LIFE * .7) { p.mesh.visible = false; continue; }
        const dry = Math.max(0, (p.age - LIFE * .2) / (LIFE * .5)); p.mesh.material.opacity = p.peak * (1 - dry * dry);
      }
      for (const m of marks) {
        if (!m.mesh.visible) continue;
        m.age += dt;
        if (m.age >= LIFE) { m.mesh.visible = false; continue; }
        const spread = Math.min(1, m.age / m.grow), s = m.size * (.55 + .45 * (1 - Math.pow(1 - spread, 3)));
        m.mesh.scale.set(s, 1, s * .86);
        // stays dark while fresh, then dries from the edges in
        const dry = Math.max(0, (m.age - LIFE * .35) / (LIFE * .65));
        m.mesh.material.opacity = m.peak * (1 - dry * dry);
        if (dry > 0) m.mesh.scale.multiplyScalar(1 - dry * .35);
      }
    },
  };
}
