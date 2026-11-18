import * as THREE from 'three';

// Alltäglich climbing hold: a black foam volume (a wedge with a five-sided footprint, low at
// the front point, its sloping face rising to a straight back edge) with three small holds on
// the face: a green crescent, a white round one and a grey round one, both with a bolt.
// Built in millimetres, the footprint centred on the origin, y up, the front point toward +z.
// From the product photos (about 60 mm across, 24 mm high at the back).

const FOOT = [[-29.7, -12], [29.2, -15.8], [30.3, -2.8], [1.4, 21.4], [-22.8, 12.2]];   // x, z (mm), going round
const BACK_Z = -15.8, FRONT_Z = 21.4, LOW = 3, HIGH = 24;   // face height at the front point and along the back
export const HOLD_SIZE = { w: 60, d: 37, h: HIGH };

// height of the sloping face above the floor at (x, z), mm (the back edge runs from TL to TR)
function backZ(x) { const [a, b] = [FOOT[0], FOOT[1]]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
export function faceHeight(x, z) {
  const zb = backZ(x), t = Math.min(1, Math.max(0, (z - zb) / (FRONT_Z - zb)));
  return HIGH + (LOW - HIGH) * t;
}
export function insideFoot(x, z) {
  let inside = false;
  for (let i = 0, j = FOOT.length - 1; i < FOOT.length; j = i++) {
    const [xi, zi] = FOOT[i], [xj, zj] = FOOT[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// foam: tiny pores over a flat colour (colour map and a matching bump map)
function foamTextures(base, poreDark, seed = 1) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const b = document.createElement('canvas'); b.width = b.height = S;
  const g = c.getContext('2d'), h = b.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S); h.fillStyle = '#808080'; h.fillRect(0, 0, S, S);
  let r = seed * 9301 + 49297; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * S, y = rnd() * S, rad = .6 + rnd() * rnd() * 3.4;
    g.fillStyle = poreDark; g.globalAlpha = .25 + rnd() * .5; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    h.fillStyle = '#000'; h.globalAlpha = .55 + rnd() * .45; h.beginPath(); h.arc(x, y, rad, 0, Math.PI * 2); h.fill();
  }
  for (let i = 0; i < 2500; i++) { const x = rnd() * S, y = rnd() * S; h.fillStyle = '#fff'; h.globalAlpha = .25; h.fillRect(x, y, 1.5, 1.5); }   // the foam's specks
  const map = new THREE.CanvasTexture(c), bump = new THREE.CanvasTexture(b);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return { map, bump };
}
function foam(base, pore, seed, repeat = .05) {
  const { map, bump } = foamTextures(base, pore, seed);
  map.repeat.set(repeat, repeat); bump.repeat.set(repeat, repeat);
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: .6, roughness: .97, metalness: 0, side: THREE.DoubleSide });
}
// planar UVs in mm (so the pores stay the same size on every face)
function boxUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// the volume: the footprint, walls up to the sloping face, the face itself
function volumeGeometry() {
  const pos = [], idx = [], n = FOOT.length;
  const add = (x, y, z) => { pos.push(x, y, z); return pos.length / 3 - 1; };
  // face (fan from the centre), walls, base — each face with its own vertices (flat shading)
  const cx = FOOT.reduce((s, p) => s + p[0], 0) / n, cz = FOOT.reduce((s, p) => s + p[1], 0) / n;
  const SUB = 10;   // the face is subdivided so the light falls on it smoothly
  for (let i = 0; i < n; i++) {
    const [ax, az] = FOOT[i], [bx, bz] = FOOT[(i + 1) % n];
    for (let s = 0; s < SUB; s++) for (let t = 0; t < SUB - s; t++) {
      const P = (u, v) => { const x = cx + (ax - cx) * u + (bx - cx) * v, z = cz + (az - cz) * u + (bz - cz) * v; return add(x, faceHeight(x, z), z); };
      const k = 1 / SUB, a = P(s * k, t * k), b = P((s + 1) * k, t * k), c = P(s * k, (t + 1) * k);
      idx.push(a, c, b);
      if (t < SUB - s - 1) { const d = P((s + 1) * k, (t + 1) * k); idx.push(b, c, d); }
    }
    // the wall under this edge
    const a0 = add(ax, 0, az), b0 = add(bx, 0, bz), a1 = add(ax, faceHeight(ax, az), az), b1 = add(bx, faceHeight(bx, bz), bz);
    idx.push(a0, b0, a1, a1, b0, b1);
  }
  const base = FOOT.map(([x, z]) => add(x, 0, z));
  for (let i = 1; i < n - 1; i++) idx.push(base[0], base[i], base[i + 1]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  // the walls face outward: make sure (the winding depends on the footprint's direction)
  return g.toNonIndexed();
}

// a small hold: a 2D outline pushed up into a soft pillow (big rounded bevel)
function pillow(shape, height, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(.2, height - bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .9, bevelSegments: 6, curveSegments: 40 });
  g.rotateX(-Math.PI / 2);   // lying on the face, rising along +y
  g.translate(0, bevel * .2, 0);
  return g;
}
function bolt(steel, r = 1.6) {
  const b = new THREE.Group();
  const washer = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.45, r * 1.45, .5, 28), steel); b.add(washer);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .9, 28), steel); head.position.y = .45; b.add(head);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(r * .5, r * .5, .3, 6), new THREE.MeshStandardMaterial({ color: 0x303236, roughness: .5, metalness: .8 })); socket.position.y = .8; b.add(socket);
  return b;
}

export function createHoldModel() {
  const group = new THREE.Group(); group.name = 'ClimbingHold';
  const black = foam('#1c1c1e', '#050505', 3, .045), green = foam('#7bc13a', '#3f6e15', 5, .07), white = foam('#f4f3ef', '#c9c7bf', 7, .07), grey = foam('#9a9a9a', '#5f5f60', 9, .07);
  black.envMapIntensity = .55;
  const steel = new THREE.MeshStandardMaterial({ color: 0xd9dcdf, roughness: .22, metalness: 1 });
  const vol = volumeGeometry(); vol.computeVertexNormals(); boxUV(vol);
  const body = new THREE.Mesh(vol, black); body.castShadow = body.receiveShadow = true; group.add(body);
  // the face's tilt (normal), for setting the holds on it
  const nrm = new THREE.Vector3(0, 1, (HIGH - LOW) / (FRONT_Z - BACK_Z)).normalize();
  const onFace = (obj, x, z, yaw = 0) => {
    obj.position.set(x, faceHeight(x, z) - .4, z);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    group.add(obj);
  };
  // green crescent (a curved sloper) on the right
  const cres = new THREE.Shape();
  cres.absarc(0, 0, 15, Math.PI * .12, Math.PI * .88, false);
  cres.absarc(0, 6, 10.5, Math.PI * .8, Math.PI * .2, true);
  const gGeo = pillow(cres, 6.5, 2.6); boxUV(gGeo);
  const g = new THREE.Mesh(gGeo, green); g.castShadow = true;
  const gHold = new THREE.Group(); gHold.add(g); g.position.set(0, 0, 9.5); onFace(gHold, 11, 1, Math.PI + .75);
  // round holds with a bolt: the white one on the face, the grey one on the steep left wall
  const roundHold = (r, h, mat) => {
    const c = new THREE.Shape(); c.absarc(0, 0, r - 1.6, 0, Math.PI * 2, false);
    const geo = pillow(c, h, 2); boxUV(geo);
    const hold = new THREE.Group(); hold.add(new THREE.Mesh(geo, mat));
    const b = bolt(steel); b.position.y = h - 1.2; hold.add(b);   // sunk into a little dip at the top
    return hold;
  };
  onFace(roundHold(6.4, 6, white), -13, -6, 0);
  {
    const [A, B] = [FOOT[4], FOOT[0]], u = .62;
    const x = A[0] + (B[0] - A[0]) * u, z = A[1] + (B[1] - A[1]) * u;
    const wn = new THREE.Vector3(-(B[1] - A[1]), 0, B[0] - A[0]).normalize();
    if (wn.x > 0) wn.negate();   // outward (toward -x)
    const hold = roundHold(5.6, 4.2, grey);
    hold.position.set(x - wn.x * .4, faceHeight(x, z) * .5, z - wn.z * .4);
    hold.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), wn);
    group.add(hold);
  }
  group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return {
    group,
    // where a bear can stand on it (mm): the face height, or null off the footprint
    surface(x, z) { return insideFoot(x, z) ? faceHeight(x, z) : null; },
    front: [FOOT[3][0], FOOT[3][1]], backZ: BACK_Z, size: HOLD_SIZE,
    // the three holds on the face, for a bear's paws (mm, on the face)
    grips: [[-14, -5], [-19, 9.5], [11, 2], [6, -6], [16, -9]].map(([x, z]) => new THREE.Vector3(x, faceHeight(x, z) + 3, z)),
  };
}
