import * as THREE from 'three';

// Keep the STL geometry, but move the surface and its normals on the GPU. The
// same animation is used in the standalone viewer and in the sports island.
export function createWaterMotion(water, floor = null) {
  const uniforms = { time: { value: 0 }, swimmer: { value: new THREE.Vector2(99, 99) }, swimming: { value: 0 } };
  const mat = water.material;
  mat.ior = 1.5; mat.roughness = .02; mat.transmission = 1; mat.clearcoat = 1; mat.clearcoatRoughness = .03;
  mat.onBeforeCompile = shader => {
    shader.uniforms.uFlowTime = uniforms.time; shader.uniforms.uSwimmer = uniforms.swimmer; shader.uniforms.uSwimming = uniforms.swimming;
    shader.vertexShader = `uniform float uFlowTime; uniform vec2 uSwimmer; uniform float uSwimming;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      #include <beginnormal_vertex>
      float waterMask = smoothstep(0.07, 0.16, position.y);
      float a = position.x * 14.0 + position.z * 5.0 + uFlowTime * 1.9;
      float b = position.z * 11.0 - position.x * 4.0 - uFlowTime * 1.3;
      float c = position.x * 29.0 + position.z * 18.0 - uFlowTime * 3.0;
      float flowY = sin(a) * cos(b) * 0.009 + sin(c) * 0.003;
      vec2 waveSlope = vec2(cos(a)*cos(b)*0.126 + sin(a)*sin(b)*0.036 + cos(c)*0.087,
        cos(a)*cos(b)*0.045 - sin(a)*sin(b)*0.099 + cos(c)*0.054);
      float splashDistance = length(position.xz - uSwimmer);
      flowY += sin(splashDistance*95.0-uFlowTime*10.0)*0.0028*exp(-splashDistance*15.0)*uSwimming;
      objectNormal = normalize(objectNormal + vec3(-waveSlope.x,0.0,-waveSlope.y) * waterMask);
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += flowY * waterMask;');
  };
  mat.customProgramCacheKey = () => 'alltaglich-living-water-v1'; mat.needsUpdate = true;
  if (floor) floor.traverse(object => {
    if (!object.isMesh || !object.material.map) return;
    object.material = object.material.clone();
    object.material.onBeforeCompile = shader => {
      shader.uniforms.uFlowTime = uniforms.time;
      shader.fragmentShader = 'uniform float uFlowTime;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        #ifdef USE_MAP
        float caustic = pow(0.5+0.5*sin(vMapUv.x*78.0+sin(vMapUv.y*57.0+uFlowTime)*2.0-uFlowTime*1.6),14.0);
        float secondCaustic = pow(0.5+0.5*cos(vMapUv.y*92.0+sin(vMapUv.x*43.0-uFlowTime)*1.8+uFlowTime*1.3),16.0);
        diffuseColor.rgb *= 0.96 + 0.18*caustic + 0.13*secondCaustic;
        #endif
      `);
    };
    object.material.customProgramCacheKey = () => 'alltaglich-caustics-v1'; object.material.needsUpdate = true;
  });
  // A coarse height field follows the actual STL top, without raycasting the
  // high-resolution mesh each frame. Used to keep the swimming puppy afloat.
  const size = 65, heights = new Float32Array(size * size).fill(.22);
  const counts = new Uint16Array(size * size), positions = water.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    if (positions.getY(i) < .15) continue;
    const x = Math.max(0, Math.min(size - 1, Math.round((positions.getX(i) + .5) * (size - 1))));
    const z = Math.max(0, Math.min(size - 1, Math.round((positions.getZ(i) / 1.5453255 + .5) * (size - 1))));
    const index = z * size + x;
    if (!counts[index]) heights[index] = 0;
    heights[index] += positions.getY(i); counts[index]++;
  }
  for (let i = 0; i < heights.length; i++) if (counts[i]) heights[i] /= counts[i];
  return {
    uniforms,
    update(time, reducedMotion = false) { uniforms.time.value = reducedMotion ? 0 : time; },
    setSwimmer(x, z, active) { uniforms.swimmer.value.set(x, z); uniforms.swimming.value = active ? 1 : 0; },
    heightAt(x, z) {
      const fx = Math.max(0, Math.min(size - 1.001, (x + .5) * (size - 1))), fz = Math.max(0, Math.min(size - 1.001, (z / 1.5453255 + .5) * (size - 1)));
      const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
      const a = THREE.MathUtils.lerp(heights[iz * size + ix], heights[iz * size + ix + 1], tx);
      const b = THREE.MathUtils.lerp(heights[(iz + 1) * size + ix], heights[(iz + 1) * size + ix + 1], tx);
      const time = uniforms.time.value;
      const flow = Math.sin(x * 14 + z * 5 + time * 1.9) * Math.cos(z * 11 - x * 4 - time * 1.3) * .009 + Math.sin(x * 29 + z * 18 - time * 3) * .003;
      return THREE.MathUtils.lerp(a, b, tz) + flow;
    },
  };
}
