import * as THREE from 'three';

// The keyring hardware from the product photo, laid flat on the deck behind the
// pool block as if the keychain had been put down on a table. From the block
// outwards: a screw eye in the back wall, a small jump ring, a ring, a swivel
// clasp, two linked rings (the Alltäglich tag hangs off the first one on its own
// little ring), then the swivel snap hook with its screw housing.
// `d` is the distance behind the back wall, `x` the sideways offset.
export function createKeyringHardware(root, { wallZ, deckY, eyeY }) {
  const group = new THREE.Group(); group.name = 'KeyringHardware'; root.add(group);
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xdfe2e5, metalness: 1, roughness: .14, clearcoat: .35, clearcoatRoughness: .08 });
  const satin = new THREE.MeshPhysicalMaterial({ color: 0xcfd2d6, metalness: 1, roughness: .3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3d4146, metalness: .8, roughness: .45 });
  const Z = d => -wallZ - d;
  const add = (geo, mat, x, y, d, rx = 0, ry = 0, rz = 0) => {
    const object = new THREE.Mesh(geo, mat); object.position.set(x, y, Z(d));
    object.rotation.set(rx, ry, rz, 'YXZ'); object.castShadow = true; object.receiveShadow = true;
    group.add(object); return object;
  };
  // Rings: `flat` lie on the deck (optionally tilted about x); `standing` eyes
  // stand upright with the chain running through them.
  const flat = (x, d, R, r, lift = 0, tilt = 0, yaw = 0) => add(new THREE.TorusGeometry(R, r, 16, 72), chrome, x, deckY + r + lift, d, -Math.PI / 2 + tilt, yaw);
  const standing = (x, y, d, R, r, yaw = Math.PI / 2) => add(new THREE.TorusGeometry(R, r, 14, 56), chrome, x, y, d, 0, yaw);
  const rod = (x, y, d0, d1, r, mat = chrome) => add(new THREE.CylinderGeometry(r, r, Math.abs(d1 - d0), 24), mat, x, y, (d0 + d1) / 2, Math.PI / 2);

  // Screw eye set into the back wall, low in the clear base.
  rod(0, eyeY, -.6, .2, .1);
  add(new THREE.CylinderGeometry(.17, .17, .08, 24), chrome, 0, eyeY, .05, Math.PI / 2);
  standing(0, eyeY, .5, .3, .08);
  // Small jump ring sloping down from the eye, then the first full ring.
  const slope = Math.atan2(eyeY - (deckY + .26), 1.44);
  add(new THREE.TorusGeometry(.72, .09, 16, 64), chrome, 0, (eyeY + deckY + .26) / 2, 1.2, -Math.PI / 2 - slope);
  flat(0, 3.15, 1.3, .14);
  // Swivel clasp: lower eye, collar, flattened barrel with its side lever, upper eye.
  const clasp = deckY + .4;
  standing(0, clasp, 4.45, .34, .08);
  rod(0, clasp, 4.75, 5.35, .12);
  rod(0, clasp, 5.3, 5.52, .34);
  const barrel = add(new THREE.CapsuleGeometry(.42, 2.1, 8, 28), chrome, 0, clasp, 6.75, Math.PI / 2);
  barrel.scale.set(1, 1, .9);
  add(new THREE.BoxGeometry(.2, .2, 2), satin, .5, clasp + .05, 6.85);
  rod(.5, clasp + .05, 7.85, 8, .14, dark);
  rod(0, clasp, 8.05, 8.3, .14);
  standing(0, deckY + .5, 8.8, .48, .1);
  // Two linked rings; the second rests across the first.
  flat(0, 10.6, 1.35, .14);
  flat(0, 13.25, 1.4, .14, .22, -.16);
  // Tag ring and the thin rounded Alltäglich plate.
  // Like the photo: the tag ring sits on the side of the ring, the plate trails
  // off diagonally towards the pool. Directions are (x, d).
  const attach = new THREE.Vector2(.9, -.43).normalize(), trail = new THREE.Vector2(.67, -.74).normalize();
  const tagRing = new THREE.Vector2(0, 10.6).addScaledVector(attach, 1.35);
  standing(tagRing.x, deckY + .24, tagRing.y, .3, .06, Math.atan2(-attach.y, -attach.x));
  createTag(group, satin, dark, tagRing, trail, deckY, Z);
  // Swivel snap hook: eye, shaft with washers, screw housing, hook and gate.
  standing(0, deckY + .42, 14.55, .42, .1);
  rod(0, deckY + .42, 14.85, 15.4, .15);
  for (const d of [15, 15.25]) rod(0, deckY + .42, d, d + .06, .3);
  add(roundedSlab(2.3, 2.1, .7, .3), chrome, 0, deckY + .07, 16.5);
  add(new THREE.CylinderGeometry(.4, .4, .1, 28), satin, .35, deckY + .8, 16.4);
  add(new THREE.BoxGeometry(.62, .05, .1), dark, .35, deckY + .86, 16.4, 0, .7);
  const hookPath = [[-.75, 17.4], [-1.05, 18.6], [-1.15, 19.9], [-.95, 21.05], [-.4, 21.7], [.3, 21.75], [.9, 21.25], [1.12, 20.4], [1.02, 19.75]]
    .map(([x, d]) => new THREE.Vector3(x, deckY + .3, Z(d)));
  const hook = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hookPath), 80, .3, 18), chrome);
  hook.castShadow = true; hook.receiveShadow = true; group.add(hook);
  add(new THREE.SphereGeometry(.3, 18, 12), chrome, 1.02, deckY + .3, 19.75);
  const gate = [[.82, 17.45], [.9, 18.4], [1.0, 19.55]].map(([x, d]) => new THREE.Vector3(x, deckY + .3, Z(d)));
  const gateMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gate), 24, .18, 14), satin);
  gateMesh.castShadow = true; group.add(gateMesh);
  add(new THREE.BoxGeometry(.32, .2, .5), satin, .95, deckY + .32, 17.85);
  rod(.82, deckY + .3, 17.3, 17.55, .2, satin);

  const materials = [chrome, satin, dark];
  return { object: group, materials };
}

// Rounded rectangle slab, centred on x and d, resting on y = 0.
function roundedSlab(width, depth, height, radius) {
  const shape = roundedRect(width, depth, radius);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height - .1, bevelEnabled: true, bevelSize: .06, bevelThickness: .05, bevelSegments: 3, curveSegments: 10 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, .05, 0);
  return geo;
}
function roundedRect(width, depth, radius) {
  const w = width / 2, d = depth / 2, shape = new THREE.Shape();
  shape.moveTo(-w + radius, -d); shape.lineTo(w - radius, -d); shape.quadraticCurveTo(w, -d, w, -d + radius);
  shape.lineTo(w, d - radius); shape.quadraticCurveTo(w, d, w - radius, d);
  shape.lineTo(-w + radius, d); shape.quadraticCurveTo(-w, d, -w, d - radius);
  shape.lineTo(-w, -d + radius); shape.quadraticCurveTo(-w, -d, -w + radius, -d);
  return shape;
}

// Thin rounded metal tag with a hanging hole and the engraved wordmark.
function createTag(group, metal, ink, ring, outward, deckY, Z) {
  const W = 2.2, L = 4.9, T = .12, holeFromEnd = .45;
  const shape = roundedRect(W, L, .55), hole = new THREE.Path();
  hole.absarc(0, L / 2 - holeFromEnd, .2, 0, Math.PI * 2, true); shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: T - .04, bevelEnabled: true, bevelSize: .03, bevelThickness: .02, bevelSegments: 2, curveSegments: 14 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, .02, 0);
  const tag = new THREE.Group();
  const plate = new THREE.Mesh(geo, metal); plate.castShadow = true; plate.receiveShadow = true; tag.add(plate);
  // Engraving: dark letters along the long axis, just above the top face.
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.font = '500 70px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Alltäglich', 256, 66);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  const engraving = new THREE.Mesh(new THREE.PlaneGeometry(3.3, .82), new THREE.MeshStandardMaterial({ color: ink.color, metalness: .6, roughness: .55, alphaMap: texture, transparent: true, depthWrite: false }));
  engraving.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); engraving.position.set(0, T + .005, .3); tag.add(engraving);
  // Shape +y (after rotateX: -z) points to the hole end; aim that end at the ring.
  const along = new THREE.Vector2(-outward.x, -outward.y);
  const center = ring.clone().addScaledVector(outward, L / 2 - holeFromEnd);
  tag.position.set(center.x, deckY, Z(center.y));
  // Local -z must point (in world x/z) towards the ring: world dir = (along.x, -along.y).
  tag.rotation.y = Math.atan2(-along.x, along.y);
  group.add(tag);
}
