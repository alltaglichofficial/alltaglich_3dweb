import * as THREE from 'three';

// Two more Alltäglich swim goods, shown as their own screens on the swimming island:
//  · the round grip (syl_model) on a MagSafe ring on the back of a phone in a clear case
//  · the fridge-magnet set — rectangular pool (rec_model), ladder and lane rope — on an
//    A-shaped stainless stand with a memo
// The resin pieces are rebuilt from the sculpted models' top surfaces (height maps in
// product/assets), over the pool print with its lane "T".
const MM = .14;   // world units per millimetre

// ---------------------------------------------------------------- shared pieces
function loadHeights(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data, w = c.width, h = c.height;
      // bilinear sample, u/v in 0..1
      resolve((u, v) => {
        const x = Math.min(w - 1.001, Math.max(0, u * (w - 1))), y = Math.min(h - 1.001, Math.max(0, v * (h - 1)));
        const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, p = (a, b) => d[(b * w + a) * 4] / 255;
        return (p(x0, y0) * (1 - fx) + p(x0 + 1, y0) * fx) * (1 - fy) + (p(x0, y0 + 1) * (1 - fx) + p(x0 + 1, y0 + 1) * fx) * fy;
      });
    };
    img.onerror = reject; img.src = url;
  });
}

// The pool print: bright water-blue tiles, a dark grid bent by the water, light caustics
// and the navy lane mark. `lane(c, r)` says which tiles are navy (r counts from the top).
function poolPrint(width, height, cols, rows, lane, seed = 1) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const g = canvas.getContext('2d'), tw = width / cols, th = height / rows;
  let s = seed * 9301 + 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // the water bends the print: every point is nudged by a couple of slow waves
  const bend = (x, y) => [x + Math.sin(y / height * 9 + seed) * tw * .16 + Math.sin(y / height * 23 + x / width * 5) * tw * .07, y + Math.sin(x / width * 8 + seed * 2) * th * .16 + Math.cos(x / width * 21 + y / height * 6) * th * .07];
  const base = g.createLinearGradient(0, 0, width, height); base.addColorStop(0, '#5fb9e6'); base.addColorStop(.5, '#74c6ec'); base.addColorStop(1, '#4fa9dc');
  g.fillStyle = base; g.fillRect(0, 0, width, height);
  const quad = (c, r) => { g.beginPath(); const N = 6; const pts = [];
    for (let i = 0; i <= N; i++) pts.push(bend((c + i / N) * tw, r * th));
    for (let i = 0; i <= N; i++) pts.push(bend((c + 1) * tw, (r + i / N) * th));
    for (let i = N; i >= 0; i--) pts.push(bend((c + i / N) * tw, (r + 1) * th));
    for (let i = N; i >= 0; i--) pts.push(bend(c * tw, (r + i / N) * th));
    pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
  for (let r = -1; r <= rows; r++) for (let c = -1; c <= cols; c++) {
    const navy = lane(c, r), j = (rnd() - .5) * 18;
    g.fillStyle = navy ? `rgb(${28 + j * .3},${52 + j * .4},${104 + j})` : `rgba(${90 + j},${185 + j},${232 + j * .5},${.35 + rnd() * .3})`;
    quad(c, r); g.fill();
  }
  // caustics: a soft net of light
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    let x = rnd() * width, y = rnd() * height, a = rnd() * 6.28;
    g.strokeStyle = `rgba(200,240,255,${.05 + rnd() * .09})`; g.lineWidth = tw * (.1 + rnd() * .22);
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 7; k++) { a += (rnd() - .5) * 1.7; x += Math.cos(a) * tw * .9; y += Math.sin(a) * tw * .9; g.lineTo(x, y); }
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  // grid
  g.strokeStyle = 'rgba(20,36,62,.9)'; g.lineWidth = Math.max(1.5, tw * .06);
  const line = (x0, y0, x1, y1) => { g.beginPath(); for (let i = 0; i <= 40; i++) { const [x, y] = bend(x0 + (x1 - x0) * i / 40, y0 + (y1 - y0) * i / 40); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
  for (let c = 0; c <= cols; c++) line(c * tw, -th, c * tw, height + th);
  for (let r = 0; r <= rows; r++) line(-tw, r * th, width + tw, r * th);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

const resin = () => new THREE.MeshPhysicalMaterial({ color: 0xe2f5fd, transmission: 1, thickness: 2.2 * MM, ior: 1.45, roughness: .02, attenuationColor: new THREE.Color(0x8fd0ee), attenuationDistance: 5, clearcoat: 1, clearcoatRoughness: .04, specularIntensity: 1 });
const chrome = () => new THREE.MeshStandardMaterial({ color: 0xe6e8ea, metalness: 1, roughness: .12 });
const shadowed = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = w / 2, y = h / 2;
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}
// a slab lying flat (in XZ), bottom at y = 0
const slab = (w, d, r, t, mat, bevel = .12) => { const b = Math.min(bevel, t * .45); const g = new THREE.ExtrudeGeometry(roundedRect(w, d, r), { depth: t - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 20 }); g.rotateX(-Math.PI / 2); g.translate(0, b, 0); return new THREE.Mesh(g, mat); };

// Round resin piece (the grip head), radius R, flat part `body` thick with the sculpted
// waves (up to `relief`) on top. Origin at the middle of its underside.
function roundResin(sample, R, body, relief, material) {
  const rings = 40, segs = 96, pos = [], idx = [];
  const yAt = (x, z) => { const r = Math.hypot(x, z) / R, h = sample(.5 + x / R * .5, .5 + z / R * .5); return body + relief * h * (1 - THREE.MathUtils.smoothstep(r, .9, 1)) - body * .16 * THREE.MathUtils.smoothstep(r, .93, 1); };
  pos.push(0, yAt(0, 0), 0);
  for (let i = 1; i <= rings; i++) for (let j = 0; j < segs; j++) { const r = R * i / rings, a = j / segs * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r; pos.push(x, yAt(x, z), z); }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + (j + 1) % segs, 1 + j);
  for (let i = 1; i < rings; i++) for (let j = 0; j < segs; j++) { const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + (j + 1) % segs, c = a + segs, d = b + segs; idx.push(a, b, c, b, d, c); }
  // wall and underside
  const top = 1 + (rings - 1) * segs, w0 = pos.length / 3;
  for (let j = 0; j < segs; j++) { const a = j / segs * Math.PI * 2; pos.push(Math.cos(a) * R, 0, Math.sin(a) * R); }
  for (let j = 0; j < segs; j++) { const a = top + j, b = top + (j + 1) % segs, c = w0 + j, d = w0 + (j + 1) % segs; idx.push(a, b, c, b, d, c); }
  const centre = pos.length / 3; pos.push(0, 0, 0);
  for (let j = 0; j < segs; j++) idx.push(centre, w0 + j, w0 + (j + 1) % segs);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}
// Rectangular resin piece W × D (x × z), same idea.
function rectResin(sample, W, D, body, relief, material) {
  const nx = 110, nz = 62, pos = [], idx = [], edge = 1.4 * MM;
  const yAt = (u, v) => { const d = Math.min(u * W, (1 - u) * W, v * D, (1 - v) * D), k = THREE.MathUtils.smoothstep(d, 0, edge); return body * (.86 + .14 * k) + relief * sample(u, v) * k; };
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const u = i / nx, v = j / nz; pos.push((u - .5) * W, yAt(u, v), (v - .5) * D); }
  const at = (i, j) => j * (nx + 1) + i;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) idx.push(at(i, j), at(i, j + 1), at(i + 1, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1));
  // walls: the border of the top, dropped to the underside
  const border = [];
  for (let i = 0; i <= nx; i++) border.push(at(i, 0)); for (let j = 1; j <= nz; j++) border.push(at(nx, j));
  for (let i = nx - 1; i >= 0; i--) border.push(at(i, nz)); for (let j = nz - 1; j >= 1; j--) border.push(at(0, j));
  const b0 = pos.length / 3;
  for (const k of border) pos.push(pos[k * 3], 0, pos[k * 3 + 2]);
  for (let k = 0; k < border.length; k++) { const a = border[k], b = border[(k + 1) % border.length], c = b0 + k, d = b0 + (k + 1) % border.length; idx.push(a, b, c, b, d, c); }
  const c0 = pos.length / 3; pos.push(-W / 2, 0, -D / 2, W / 2, 0, -D / 2, W / 2, 0, D / 2, -W / 2, 0, D / 2); idx.push(c0, c0 + 1, c0 + 2, c0, c0 + 2, c0 + 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}

// ---------------------------------------------------------------- the two screens
export function createGoodsScenes(parent, { groundY }) {
  const metals = [];   // materials that want the studio reflections
  let env = null, envLevel = 1;
  const steel = m => { metals.push(m); if (env) { m.envMap = env; m.envMapIntensity = envLevel; } return m; };

  // ============ grip on a phone ============
  const grip = new THREE.Group(); grip.name = 'GripPhone'; grip.visible = false; parent.add(grip);
  grip.position.y = groundY;
  const PW = 71.5 * MM, PL = 146.7 * MM, PT = 7.8 * MM, CASE = 1.6 * MM;
  {
    const body = slab(PW, PL, 11 * MM, PT, new THREE.MeshPhysicalMaterial({ color: 0xf4f4f1, roughness: .32, clearcoat: .8, clearcoatRoughness: .12 }), .16);
    body.position.y = CASE * .6; grip.add(body);
    // clear case: a slightly larger shell, with a lip round the cameras
    const caseMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .22, roughness: .05, clearcoat: 1, depthWrite: false });
    const shell = slab(PW + CASE * 2, PL + CASE * 2, 12.5 * MM, PT + CASE * 1.6, caseMat, .2); shell.renderOrder = 2; grip.add(shell);
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry((() => { const o = roundedRect(PW + CASE * 2, PL + CASE * 2, 12.5 * MM); o.holes.push(new THREE.Path(roundedRect(PW + CASE * .3, PL + CASE * .3, 11.2 * MM).getPoints(48).reverse())); return o; })(), { depth: PT + CASE * 1.6, bevelEnabled: false, curveSegments: 20 }), new THREE.MeshPhysicalMaterial({ color: 0xf2f6f8, transparent: true, opacity: .5, roughness: .08, clearcoat: 1, depthWrite: false }));
    rim.geometry.rotateX(-Math.PI / 2); rim.renderOrder = 2; grip.add(rim);
    const top = PT + CASE * .6;
    // camera island, top left as seen from the back
    const isle = slab(31 * MM, 31 * MM, 8.5 * MM, 1.7 * MM, new THREE.MeshPhysicalMaterial({ color: 0xeeeeeb, roughness: .2, clearcoat: 1, transparent: true, opacity: .96 }), .1);
    const ix = -PW / 2 + 20.5 * MM, iz = -PL / 2 + 20.5 * MM; isle.position.set(ix, top, iz); grip.add(isle);
    const lensRing = steel(new THREE.MeshStandardMaterial({ color: 0xd9dcdf, metalness: 1, roughness: .2 }));
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x08090c, roughness: .05, clearcoat: 1 });
    for (const [dx, dz] of [[-7, -7], [7, 7]]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(7.4 * MM, 7.4 * MM, 1.9 * MM, 40), lensRing); ring.position.set(ix + dx * MM, top + 1.7 * MM + .95 * MM, iz + dz * MM); grip.add(ring);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(6.3 * MM, 6.3 * MM, 2 * MM, 40), glass); lens.position.copy(ring.position); lens.position.y += .06 * MM; grip.add(lens);
      const eye = new THREE.Mesh(new THREE.CircleGeometry(2.6 * MM, 24), new THREE.MeshPhysicalMaterial({ color: 0x1a2030, roughness: .1, clearcoat: 1 })); eye.rotation.x = -Math.PI / 2; eye.position.copy(lens.position); eye.position.y += 1.02 * MM; grip.add(eye);
    }
    const flash = new THREE.Mesh(new THREE.CylinderGeometry(3 * MM, 3 * MM, .5 * MM, 24), new THREE.MeshStandardMaterial({ color: 0xf3ead2, roughness: .4 })); flash.position.set(ix + 7.5 * MM, top + 1.75 * MM, iz - 7.5 * MM); grip.add(flash);
    const mic = new THREE.Mesh(new THREE.CylinderGeometry(.8 * MM, .8 * MM, .3 * MM, 12), glass); mic.position.set(ix - 7.5 * MM, top + 1.75 * MM, iz + 8.5 * MM); grip.add(mic);
    shadowed(body); shadowed(isle);
  }
  // MagSafe ring plate, a little below the middle of the phone
  const mag = new THREE.Group(); mag.position.set(0, PT + CASE * 1.6 + .02, 8 * MM); grip.add(mag);
  {
    const ring = new THREE.Mesh(new THREE.RingGeometry(23.5 * MM, 28.5 * MM, 72), new THREE.MeshPhysicalMaterial({ color: 0xfafaf8, roughness: .35, clearcoat: .5 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .5 * MM; mag.add(ring);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(29.5 * MM, 29.5 * MM, .9 * MM, 72), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .35, roughness: .06, clearcoat: 1, depthWrite: false })); plate.position.y = .45 * MM; plate.renderOrder = 2; mag.add(plate);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(29.3 * MM, .35 * MM, 8, 96), steel(chrome())); edge.rotation.x = Math.PI / 2; edge.position.y = .5 * MM; mag.add(edge);
    ring.receiveShadow = true;
  }
  // the grip itself: clear folding stem and the resin head with the print under it
  const head = new THREE.Group(); mag.add(head);
  const stemMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .32, roughness: .05, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(9.5 * MM, 13 * MM, 1, 48, 3, true), stemMat); stem.renderOrder = 2; mag.add(stem);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(15 * MM, 15.5 * MM, 1.2 * MM, 48), stemMat); foot.position.y = 1.4 * MM; foot.renderOrder = 2; mag.add(foot);
  const R = 21.5 * MM, headMat = steel(resin());
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R * .985, R * .985, .5 * MM, 72), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6 })); disc.position.y = .25 * MM; head.add(disc);
  // the T: a wide bar near the top and a stem down to the edge
  const printMat = new THREE.MeshStandardMaterial({ map: poolPrint(768, 768, 13, 13, (c, r) => (r === 3 && c >= 3 && c <= 9) || (c === 6 && r >= 3) || (c === 5 && r >= 4 && r <= 5) || (c === 7 && r >= 4 && r <= 5), 3), roughness: .5 });
  const printDisc = new THREE.Mesh(new THREE.CircleGeometry(R * .985, 72), printMat); printDisc.rotation.x = -Math.PI / 2; printDisc.position.y = .56 * MM; head.add(printDisc);
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 10 * MM, 24), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 5 * MM; head.add(hit);
  let popped = 1, popGoal = 1;
  const POP_UP = 7.5 * MM, POP_DOWN = 1.6 * MM;
  const setPop = k => { const h = POP_DOWN + (POP_UP - POP_DOWN) * k; stem.scale.y = h; stem.position.y = 2 * MM + h / 2; head.position.y = 2 * MM + h; };
  setPop(1);

  // ============ magnets on the A stand ============
  const K = .7;   // the stand is shown a little smaller than the phone, so both fill the screen alike
  const magnetRoot = new THREE.Group(); magnetRoot.name = 'MagnetStand'; magnetRoot.visible = false; parent.add(magnetRoot);
  magnetRoot.position.y = groundY;
  const magnet = new THREE.Group(); magnet.scale.setScalar(K); magnetRoot.add(magnet);
  const SW = 150 * MM, SH = 210 * MM, LEAN = .21, ST = 1.2 * MM;
  // brushed stainless: fine horizontal streaks
  const brushed = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5200; i++) { const y = Math.random() * 512, x = Math.random() * 512 - 100, l = 60 + Math.random() * 380, v = 112 + Math.random() * 34; g.strokeStyle = `rgba(${v},${v},${v},.3)`; g.lineWidth = .5 + Math.random() * .6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.5, 5); return t;
  })();
  const steelMat = steel(new THREE.MeshStandardMaterial({ color: 0xc3c6c9, metalness: 1, roughness: .46, roughnessMap: brushed, bumpMap: brushed, bumpScale: .08 }));
  const panel = new THREE.Group(); magnet.add(panel);   // the front face: x across, y up the face, z out of it
  panel.rotation.x = -LEAN; panel.position.set(0, 0, SH * Math.sin(LEAN));
  {
    const front = new THREE.Mesh(new THREE.BoxGeometry(SW, SH, ST), steelMat); front.position.set(0, SH / 2, -ST / 2); panel.add(front);
    const back = new THREE.Mesh(new THREE.BoxGeometry(SW, SH, ST), steelMat); back.rotation.x = LEAN; back.position.set(0, SH * Math.cos(LEAN) / 2, -SH * Math.sin(LEAN) / 2); magnet.add(back);
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(ST * .9, ST * .9, SW, 16), steelMat); ridge.rotation.z = Math.PI / 2; ridge.position.set(0, SH * Math.cos(LEAN), 0); magnet.add(ridge);
    shadowed(front); shadowed(back);
  }
  const items = [];   // things that stick to the panel and can be slid about
  const stick = (name, x, y, tilt, build, radius) => {
    const g = new THREE.Group(); g.name = name; g.position.set(x, y, 0); g.rotation.z = tilt; build(g); shadowed(g); panel.add(g);
    const it = { group: g, radius, lift: 0, held: false }; items.push(it); return it;
  };
  // memo paper under a little round magnet
  stick('Memo', -14 * MM, 128 * MM, .09, g => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#fdfdfb'; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = '#8fc4e6'; x.lineWidth = 2; for (let i = 0; i < 9; i++) { const y = 96 + i * 44; x.beginPath(); x.moveTo(34, y); x.lineTo(478, y); x.stroke(); }
    x.lineWidth = 5; x.beginPath(); x.moveTo(34, 60); x.lineTo(478, 60); x.stroke();
    x.strokeStyle = '#e2574c'; x.lineWidth = 3; x.beginPath(); x.moveTo(120, 34); x.lineTo(120, 478); x.stroke();
    x.fillStyle = '#74b4dc'; x.font = '22px Georgia, serif'; x.fillText('Alltäglich', 372, 492);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(76 * MM, 76 * MM, 8, 8), new THREE.MeshStandardMaterial({ map: tex, roughness: .85, side: THREE.DoubleSide }));
    // a sheet of paper never lies quite flat: the lower corners lift a touch
    const p = paper.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (38 * MM), v = p.getY(i) / (38 * MM); p.setZ(i, .25 * MM + Math.max(0, -v) * Math.abs(u) * 1.6 * MM); } paper.geometry.computeVertexNormals();
    g.add(paper);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(4 * MM, 4 * MM, 3 * MM, 32), steel(chrome())); pin.rotation.x = Math.PI / 2; pin.position.set(0, 29 * MM, 1.8 * MM); g.add(pin);
  }, 40 * MM);
  // ladder: two rails that bend back into round feet, three rungs
  stick('Ladder', 44 * MM, 172 * MM, -.42, g => {
    const m = steel(chrome()), half = 13 * MM, L = 56 * MM, out = 7 * MM, r = 1.7 * MM;
    for (const sx of [-1, 1]) {
      const pts = [new THREE.Vector3(sx * half, -L / 2, 0), new THREE.Vector3(sx * half, -L / 2 + 3 * MM, out * .8), new THREE.Vector3(sx * half, -L / 2 + 9 * MM, out), new THREE.Vector3(sx * half, L / 2 - 9 * MM, out), new THREE.Vector3(sx * half, L / 2 - 3 * MM, out * .8), new THREE.Vector3(sx * half, L / 2, 0)];
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 60, r, 12), m));
      for (const sy of [-1, 1]) { const foot = new THREE.Mesh(new THREE.CylinderGeometry(4.2 * MM, 4.2 * MM, 2.4 * MM, 28), m); foot.rotation.x = Math.PI / 2; foot.position.set(sx * half, sy * L / 2, 1.2 * MM); g.add(foot); }
    }
    for (const y of [-12, 1, 14]) { const rung = new THREE.Mesh(new THREE.CylinderGeometry(r * .95, r * .95, half * 2, 12), m); rung.rotation.z = Math.PI / 2; rung.position.set(0, y * MM, out); g.add(rung); }
  }, 30 * MM);
  // lane rope: red ends, then white and blue floats, between two chrome magnets
  stick('LaneRope', -24 * MM, 52 * MM, -.3, g => {
    const m = steel(chrome()), n = 21, pitch = 3.5 * MM, span = (n - 1) * pitch;
    const colours = { r: 0xe8483f, w: 0xf6f6f2, b: 0x5cc0ee }, order = 'rrrwwbbwwbbwwbbwwbrrr'.split('');
    order.forEach((k, i) => {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(2 * MM, 18, 14), new THREE.MeshPhysicalMaterial({ color: colours[k], roughness: .35, clearcoat: .5 }));
      const u = i / (n - 1) - .5; bead.scale.x = .86; bead.position.set(u * span, -Math.cos(u * Math.PI) * 1.2 * MM, 3 * MM); g.add(bead);
    });
    for (const sx of [-1, 1]) {
      const end = new THREE.Mesh(new THREE.CylinderGeometry(4.2 * MM, 4.2 * MM, 2.6 * MM, 28), m); end.rotation.x = Math.PI / 2; end.position.set(sx * (span / 2 + 7 * MM), 0, 1.3 * MM); g.add(end);
      const loop = new THREE.Mesh(new THREE.TorusGeometry(2.4 * MM, .6 * MM, 8, 20), m); loop.position.set(sx * (span / 2 + 3.4 * MM), 0, 3 * MM); loop.rotation.y = Math.PI / 2; g.add(loop);
    }
  }, 46 * MM);
  // the rectangular pool magnet (print + resin are added when the height map has loaded)
  const poolMagnet = stick('PoolMagnet', 36 * MM, 92 * MM, -.12, g => {
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(25 * MM, 45 * MM, 8 * MM), new THREE.MeshBasicMaterial({ visible: false })); hitBox.position.z = 4 * MM; g.add(hitBox);
  }, 24 * MM);

  // resin pieces, once their height maps are in
  const ready = Promise.all([loadHeights('product/assets/grip-round-height.png'), loadHeights('product/assets/magnet-rect-height.png')]).then(([round, rect]) => {
    const h = roundResin(round, R, 5.4 * MM, 3.4 * MM, headMat); h.position.y = .6 * MM; h.castShadow = true; head.add(h);
    // 25 × 45 portrait on the stand; the sculpt is 45 × 25, so it is turned a quarter
    const g = poolMagnet.group, mat = steel(resin());
    const back = new THREE.Mesh(new THREE.BoxGeometry(25 * MM, 45 * MM, .8 * MM), new THREE.MeshStandardMaterial({ color: 0xf5f5f2, roughness: .6 })); back.position.z = .4 * MM; g.add(back);
    const print = new THREE.Mesh(new THREE.PlaneGeometry(25 * MM, 45 * MM), new THREE.MeshStandardMaterial({ map: poolPrint(512, 920, 10, 18, (c, r) => (r === 3 && c >= 2 && c <= 7) || ((c === 4 || c === 5) && r >= 3), 5), roughness: .5 })); print.position.z = .82 * MM; g.add(print);
    const body = rectResin((u, v) => rect(v, 1 - u), 25 * MM, 45 * MM, 4.2 * MM, 2.6 * MM, mat);
    body.rotation.x = Math.PI / 2; body.position.z = .85 * MM; g.add(body);
    back.castShadow = true;
  }).catch(() => {});

  // sliding a magnet over the steel
  const plane = new THREE.Plane(), hitP = new THREE.Vector3(), local = new THREE.Vector3(), off = new THREE.Vector3(), n = new THREE.Vector3();
  const magnetTargets = items.map(it => ({
    get meshes() { const list = []; it.group.traverse(m => { if (m.isMesh) list.push(m); }); return list; },
    grab(point) {
      panel.updateWorldMatrix(true, false); n.set(0, 0, 1).transformDirection(panel.matrixWorld);
      plane.setFromNormalAndCoplanarPoint(n, point); panel.worldToLocal(local.copy(point)); off.set(it.group.position.x - local.x, it.group.position.y - local.y, 0); it.held = true;
    },
    drag(ray) {
      if (!it.held || !ray.intersectPlane(plane, hitP)) return;
      panel.worldToLocal(local.copy(hitP));
      it.group.position.x = THREE.MathUtils.clamp(local.x + off.x, -SW / 2 + it.radius * .6, SW / 2 - it.radius * .6);
      it.group.position.y = THREE.MathUtils.clamp(local.y + off.y, it.radius * .6, SH - it.radius * .6);
    },
    release() { it.held = false; },
  }));
  const gripTargets = [{ object: hit, grab() {}, drag() {}, release() {}, tap() { popGoal = popGoal ? 0 : 1; } }];

  const cx = 0;
  return {
    ready,
    scenes: {
      grip: {
        root: grip, grabTargets: gripTargets,
        view: { center: { x: cx, y: groundY + 1, z: 0 }, min: [-PW / 2 - 1, groundY, -PL / 2 - 1], max: [PW / 2 + 1, groundY + 3.4, PL / 2 + 1] },
        viewDirection: new THREE.Vector3(9, 26, 15).normalize(),
      },
      magnet: {
        root: magnetRoot, grabTargets: magnetTargets,
        view: { center: { x: 0, y: groundY + SH * Math.cos(LEAN) * K * .5, z: 0 }, min: [-SW * K / 2 - .6, groundY - 2.5, -SH * Math.sin(LEAN) * K - .5], max: [SW * K / 2 + .6, groundY + SH * Math.cos(LEAN) * K + .4, SH * Math.sin(LEAN) * K + .8] },
        viewDirection: new THREE.Vector3(9, 7, 26).normalize(),
      },
    },
    update(dt) {
      if (grip.visible && popped !== popGoal) { popped += Math.sign(popGoal - popped) * Math.min(Math.abs(popGoal - popped), dt * 5); setPop(popped * popped * (3 - 2 * popped)); }
      if (magnetRoot.visible) for (const it of items) { it.lift += ((it.held ? 1 : 0) - it.lift) * Math.min(1, dt * 12); it.group.position.z = it.lift * 2.2 * MM; }
    },
    // studio reflections for the chrome and steel
    setEnvironment(texture) { env = texture; for (const m of metals) { m.envMap = texture; m.envMapIntensity = envLevel; m.needsUpdate = true; } },
    setMood(reflections) { envLevel = .35 + .65 * Math.min(1, reflections); for (const m of metals) m.envMapIntensity = envLevel; },
  };
}
