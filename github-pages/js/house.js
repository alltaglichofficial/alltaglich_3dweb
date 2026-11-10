import * as THREE from 'three';
import { box, roundedPad, sphere } from './geometry.js';

// A genuine doorway; only the wall sections block navigation.
export function createDogHouse(root, obstacles, { x, z, y = .08, facing = 1, color = 0xa3b596 }) {
  const house = new THREE.Group(); house.name = 'SpitzHouse'; house.position.set(x, y, z); house.rotation.y = facing === 1 ? 0 : Math.PI; root.add(house);
  roundedPad(house, 2.8, 2.5, .08, 0, -.06, 0, 0xe0ceb0, .18);
  box(house, .12, 1.65, 2.2, -1.25, .82, 0, 0xf2e5cd);
  box(house, .12, 1.65, 2.2, 1.25, .82, 0, 0xf2e5cd);
  box(house, 2.5, 1.65, .12, 0, .82, -1.1, 0xe0d0b6);
  for (const side of [-1, 1]) box(house, .35, 1.65, .12, side * 1.075, .82, 1.1, 0xf2e5cd);
  box(house, 1.8, .19, .14, 0, 1.56, 1.1, 0xf2e5cd);
  for (const side of [-1, 1]) { const roof = box(house, 1.65, .14, 2.65, side * .69, 1.97, 0, color); roof.rotation.z = -side * .38; }
  roundedPad(house, 1.5, 1.5, .10, 0, .015, -.15, 0xbaa78d, .3);
  sphere(house, .22, .52, .2, -.7, 0xf5e4c8, [1.5, .5, 1]);
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f2e5cd'; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = '#617356'; ctx.font = '24px Georgia'; ctx.textAlign = 'center'; ctx.fillText('SPITZ HOME', 128, 42);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .27), new THREE.MeshBasicMaterial({ map: texture })); sign.position.set(0, 1.69, 1.18); house.add(sign);
  for (const [dx, dz, w, d] of [[-1.25, 0, .12, 2.2], [1.25, 0, .12, 2.2], [0, -1.1, 2.5, .12], [-1.075, 1.1, .35, .12], [1.075, 1.1, .35, .12]]) obstacles.push({ type: 'rect', x: x + dx * facing, z: z + dz * facing, w, d });
  return { object: house, approach: { x, z: z + 2.5 * facing }, bed: { x, z: z + .1 * facing }, facing };
}

export function createFetchToy(root, point, returnTo) {
  const ball = new THREE.Group(); ball.name = 'FetchBall'; ball.position.set(point.x, point.y, point.z); root.add(ball);
  sphere(ball, .16, 0, 0, 0, 0xdbe888);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(.155, .008, 4, 24), new THREE.MeshStandardMaterial({ color: 0xfffae8 })); ball.add(seam); seam.rotation.x = .7;
  return { type: 'fetch', ball, ballHome: { ...point }, returnTo };
}
