import * as THREE from 'three';

// A big poolside floor lamp, designed for the swimming island: the stand is a
// polished stainless tube bent like a pool-ladder handrail, rising from a heavy
// round base and curving out over the water, where it ends in a wide, shallow
// shade shaped like a swim cap (white with a pool-blue rim band). The warm
// diffuser glows and throws a soft pool of light onto the water below.
export function createPoolLamp(parent, { x, z, groundY, reach = 5, height = 7.6, yaw = 0, scale = 1 }) {
  const lamp = new THREE.Group(); lamp.name = 'PoolsideLamp'; lamp.position.set(x, groundY, z); lamp.rotation.y = yaw; lamp.scale.setScalar(scale); parent.add(lamp);
  const steel = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 1, roughness: .18 });
  const enamel = new THREE.MeshPhysicalMaterial({ color: 0xf7f6f1, roughness: .32, clearcoat: .6, clearcoatRoughness: .2 });
  const band = new THREE.MeshPhysicalMaterial({ color: 0x5fa8b8, roughness: .35, clearcoat: .5 });
  const base = new THREE.MeshPhysicalMaterial({ color: 0x5fa8b8, roughness: .45, clearcoat: .3 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
  const add = (geo, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; lamp.add(m); return m; };

  // heavy round base with a rubber foot ring and a steel collar for the tube
  const plinth = add(new THREE.CylinderGeometry(1.15, 1.25, .26, 56), base); plinth.position.y = .17;
  const foot = add(new THREE.TorusGeometry(1.18, .05, 10, 56), new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: .9 })); foot.rotation.x = Math.PI / 2; foot.position.y = .05;
  const collar = add(new THREE.CylinderGeometry(.2, .26, .32, 32), steel); collar.position.y = .46;

  // the handrail tube: straight up, a big bend over, a straight run out, and a
  // short bend down to the shade
  const r1 = 1.3, r2 = .7, run = Math.max(.5, reach - r1 - r2), up = height - r1;
  const pts = [];
  for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(0, .3 + (up - .3) * i / 8, 0));
  for (let i = 1; i <= 16; i++) { const a = i / 16 * Math.PI / 2; pts.push(new THREE.Vector3(r1 - Math.cos(a) * r1, up + Math.sin(a) * r1, 0)); }
  for (let i = 1; i <= 6; i++) pts.push(new THREE.Vector3(r1 + run * i / 6, height, 0));
  for (let i = 1; i <= 10; i++) { const a = i / 10 * Math.PI / 2; pts.push(new THREE.Vector3(r1 + run + Math.sin(a) * r2, height - r2 + Math.cos(a) * r2, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  add(new THREE.TubeGeometry(curve, 160, .13, 20, false), steel);

  // shade: a shallow cap with a rolled rim and a blue band
  const tip = new THREE.Vector3(r1 + run + r2, height - r2, 0);
  const shade = new THREE.Group(); shade.position.copy(tip); lamp.add(shade);
  const capProfile = [];
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; capProfile.push(new THREE.Vector2(Math.max(.001, Math.sin(a) * 1.55), (Math.cos(a) - 1) * .72)); }
  const capGeo = new THREE.LatheGeometry(capProfile, 72);
  const cap = new THREE.Mesh(capGeo, enamel); cap.castShadow = true; cap.position.y = .02; shade.add(cap);
  enamel.side = THREE.DoubleSide;
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.565, 1.59, .2, 72, 1, true), band); stripe.position.y = -.62; stripe.castShadow = true; shade.add(stripe);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.575, .045, 10, 72), enamel); lip.rotation.x = Math.PI / 2; lip.position.y = -.73; shade.add(lip);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(.24, .28, .3, 24), steel); socket.position.y = .1; shade.add(socket);
  // frosted diffuser inside the cap, glowing warm
  const diffuser = new THREE.Mesh(new THREE.CircleGeometry(1.32, 64), glow); diffuser.rotation.x = Math.PI / 2; diffuser.position.y = -.5; shade.add(diffuser);

  // a soft pool of warm light on the water below (additive, so it brightens only)
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.45, 'rgba(255,255,255,.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const poolLight = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffd9a0, map: new THREE.CanvasTexture(c), transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false }));
  poolLight.rotation.x = -Math.PI / 2; poolLight.renderOrder = 5; parent.add(poolLight);
  lamp.updateMatrixWorld(true);
  const tipWorld = shade.getWorldPosition(new THREE.Vector3());
  return {
    object: lamp,
    materials: [steel, enamel, band, base],
    tip: tipWorld,
    // keep the light pool on the moving water surface
    update(surfaceAt) {
      const y = surfaceAt(tipWorld.x, tipWorld.z);
      poolLight.position.set(tipWorld.x, y + .03, tipWorld.z); poolLight.scale.setScalar(6.2 * scale);
    },
    setMood(mood) {
      const dark = mood === 'dark';
      poolLight.material.opacity = dark ? .6 : .26;
      glow.color.setHex(dark ? 0xffe9c4 : 0xfff1d6);
    },
  };
}
