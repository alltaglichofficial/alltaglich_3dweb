import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

// Shared integration helper for the viewer and the sports world.
// Body width is 1 normalized unit; choose an appropriate scene scale explicitly.
export async function loadSwimmingPoolKeyring({ url = new URL('./assets/swimming-pool-body.glb', import.meta.url).href, scale = 1, environment = null } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  model.scale.setScalar(scale);
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = !object.material.transmission;
    object.receiveShadow = true;
    if (environment) { object.material.envMap = environment; object.material.needsUpdate = true; }
  });
  return {
    model,
    floor: model.getObjectByName('Body_Floor_20pct'),
    water: model.getObjectByName('Body_ClearWater_80pct_STL_Waves'),
    gate: model.getObjectByName('Carabiner_MovingGate'),
    tag: model.getObjectByName('Tag_ThinRoundedMetalPlate'),
  };
}
