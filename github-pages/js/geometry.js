import * as THREE from 'three';

const materials = new Map();
const geometries = new Map();
export function material(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .88, flatShading: true }));
  return materials.get(color);
}
function geometry(key, create) {
  if (!geometries.has(key)) geometries.set(key, create());
  return geometries.get(key);
}
export function mesh(geo, color, position, parent, scale) {
  const object = new THREE.Mesh(geo, material(color));
  object.position.set(...position);
  if (scale) object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
export function box(parent, w, h, d, x, y, z, color) {
  return mesh(geometry('box', () => new THREE.BoxGeometry(1, 1, 1)), color, [x, y, z], parent, [w, h, d]);
}
export function sphere(parent, r, x, y, z, color, scale = [1, 1, 1]) {
  return mesh(geometry('sphere', () => new THREE.SphereGeometry(1, 12, 8)), color, [x, y, z], parent, scale.map(v => v * r));
}
export function ico(parent, r, x, y, z, color, scale = [1, 1, 1]) {
  return mesh(geometry('ico', () => new THREE.IcosahedronGeometry(1, 1)), color, [x, y, z], parent, scale.map(v => v * r));
}
export function cylinder(parent, rt, rb, height, x, y, z, color, segments = 12) {
  const key = `cyl-${rt}-${rb}-${height}-${segments}`;
  return mesh(geometry(key, () => new THREE.CylinderGeometry(rt, rb, height, segments)), color, [x, y, z], parent);
}
export function tube(parent, points, radius, color) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 6), radius, 6, false), color, [0, 0, 0], parent);
}
export function flatPath(parent, points, width, color) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const vertices = [], indices = [];
  for (let i = 0; i <= 64; i++) {
    const p = curve.getPoint(i / 64), tangent = curve.getTangent(i / 64);
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2);
    vertices.push(p.x + side.x, p.y, p.z + side.z, p.x - side.x, p.y, p.z - side.z);
    if (i < 64) { const k = i * 2; indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices); geo.computeVertexNormals();
  return mesh(geo, color, [0, 0, 0], parent);
}
export function roundedPad(parent, width, depth, height, x, y, z, color, radius = .2) {
  const w = width / 2 - radius, d = depth / 2 - radius;
  const shape = new THREE.Shape();
  shape.moveTo(-w, -depth / 2);
  shape.lineTo(w, -depth / 2);
  shape.quadraticCurveTo(width / 2, -depth / 2, width / 2, -d);
  shape.lineTo(width / 2, d);
  shape.quadraticCurveTo(width / 2, depth / 2, w, depth / 2);
  shape.lineTo(-w, depth / 2);
  shape.quadraticCurveTo(-width / 2, depth / 2, -width / 2, d);
  shape.lineTo(-width / 2, -d);
  shape.quadraticCurveTo(-width / 2, -depth / 2, -w, -depth / 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 5 });
  geo.rotateX(-Math.PI / 2);
  return mesh(geo, color, [x, y, z], parent);
}

// Bake static props by material, keeping separate shadow flags. Hundreds of little
// details become a few dozen draw calls; animated objects stay outside this group.
export function batchStatic(group) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  const objects = [];
  group.traverse(object => {
    if (!object.isMesh || object.material.map) return;
    const key = `${object.material.uuid}-${object.castShadow}-${object.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, { source: object, geos: [] });
    const geo = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geo.applyMatrix4(object.matrixWorld);
    batches.get(key).geos.push(geo);
    objects.push(object);
  });
  for (const object of objects) object.removeFromParent();
  for (const { source, geos } of batches.values()) {
    const combined = new THREE.BufferGeometry();
    for (const name of ['position', 'normal']) {
      const size = geos.reduce((sum, geo) => sum + geo.attributes[name].array.length, 0);
      const values = new Float32Array(size);
      let offset = 0;
      for (const geo of geos) { values.set(geo.attributes[name].array, offset); offset += geo.attributes[name].array.length; }
      combined.setAttribute(name, new THREE.BufferAttribute(values, 3));
    }
    combined.computeBoundingSphere();
    const object = new THREE.Mesh(combined, source.material);
    object.castShadow = source.castShadow;
    object.receiveShadow = source.receiveShadow;
    group.add(object);
    for (const geo of geos) geo.dispose();
  }
}
