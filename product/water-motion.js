import * as THREE from 'three';

// Keep the STL geometry, but move the surface and its normals on the GPU. The
// same animation is used in the standalone viewer and in the sports island.
// Interactive waves, in the water mesh's local units (body width 1):
//  - movers: a continuous wake that travels outward from something moving in
//    the water (the swimming puppy, the paddling bear); xy = position, z = strength.
//  - ripples: one-off splash rings that expand and fade (jumping in, climbing
//    out, a hop landing); xy = origin, z = start time, w = strength.
const MOVERS = 2, RIPPLES = 8;
const WAKE = { amp: .0065, k: 90, omega: 10, falloff: 12 };
const RING = { amp: .013, k: 80, speed: .13, width2: .0022, damping: .95, life: 4.5 };
const WAVE_GLSL = /* glsl */`
  vec2 ripplePos = position.xz; vec2 rippleSlope = vec2(0.0);
  for (int i = 0; i < ${MOVERS}; i++) {
    vec3 m = uMovers[i];
    if (m.z <= 0.0) continue;
    vec2 dv = ripplePos - m.xy; float d = length(dv) + 1e-5;
    float e = exp(-d * ${WAKE.falloff.toFixed(1)}) * m.z, ph = d * ${WAKE.k.toFixed(1)} - uFlowTime * ${WAKE.omega.toFixed(1)};
    flowY += sin(ph) * ${WAKE.amp} * e;
    rippleSlope += ${WAKE.amp} * e * (${WAKE.k.toFixed(1)} * cos(ph) - ${WAKE.falloff.toFixed(1)} * sin(ph)) * dv / d;
  }
  for (int i = 0; i < ${RIPPLES}; i++) {
    vec4 r = uRipples[i]; float age = uFlowTime - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > ${RING.life.toFixed(1)}) continue;
    vec2 dv = ripplePos - r.xy; float d = length(dv) + 1e-5, u = d - age * ${RING.speed};
    float g = exp(-u * u / ${RING.width2}) * exp(-age * ${RING.damping}) * r.w, ph = u * ${RING.k.toFixed(1)};
    flowY += sin(ph) * ${RING.amp} * g;
    rippleSlope += ${RING.amp} * g * (${RING.k.toFixed(1)} * cos(ph) - 2.0 * u / ${RING.width2} * sin(ph)) * dv / d;
  }
`;
export function createWaterMotion(water, floor = null) {
  const movers = Array.from({ length: MOVERS }, () => new THREE.Vector3(99, 99, 0));
  const ripples = Array.from({ length: RIPPLES }, () => new THREE.Vector4(99, 99, -99, 0));
  const uniforms = { time: { value: 0 }, movers: { value: movers }, ripples: { value: ripples } };
  let nextRipple = 0;
  const mat = water.material;
  // Product-viewer defaults (documented in product/README.md); the sports island
  // applies its own clearer water settings after this call.
  mat.ior = 1.333; mat.roughness = .035; mat.transmission = .98; mat.clearcoat = .5; mat.clearcoatRoughness = .045;
  mat.onBeforeCompile = shader => {
    shader.uniforms.uFlowTime = uniforms.time; shader.uniforms.uMovers = uniforms.movers; shader.uniforms.uRipples = uniforms.ripples;
    shader.vertexShader = `uniform float uFlowTime; uniform vec3 uMovers[${MOVERS}]; uniform vec4 uRipples[${RIPPLES}];\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      #include <beginnormal_vertex>
      float waterMask = smoothstep(0.07, 0.16, position.y);
      float a = position.x * 14.0 + position.z * 5.0 + uFlowTime * 1.9;
      float b = position.z * 11.0 - position.x * 4.0 - uFlowTime * 1.3;
      float c = position.x * 29.0 + position.z * 18.0 - uFlowTime * 3.0;
      float flowY = sin(a) * cos(b) * 0.009 + sin(c) * 0.003;
      vec2 waveSlope = vec2(cos(a)*cos(b)*0.126 + sin(a)*sin(b)*0.036 + cos(c)*0.087,
        cos(a)*cos(b)*0.045 - sin(a)*sin(b)*0.099 + cos(c)*0.054);
      ${WAVE_GLSL}
      objectNormal = normalize(objectNormal + vec3(-waveSlope.x - rippleSlope.x, 0.0, -waveSlope.y - rippleSlope.y) * waterMask);
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += flowY * waterMask;');
  };
  mat.customProgramCacheKey = () => 'alltaglich-living-water-v2'; mat.needsUpdate = true;
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
    update(time, reducedMotion = false) {
      uniforms.time.value = reducedMotion ? 0 : time;
      // Reduced motion: no wakes or splash rings, just the calm static surface.
      if (reducedMotion) { movers.forEach(m => { m.z = 0; }); ripples.forEach(r => { r.w = 0; }); }
    },
    setSwimmer(x, z, active) { this.setMover(0, x, z, active ? 1 : 0); },
    setMover(index, x, z, strength) { movers[index]?.set(x, z, strength); },
    addRipple(x, z, strength = 1) { ripples[nextRipple].set(x, z, uniforms.time.value, strength); nextRipple = (nextRipple + 1) % RIPPLES; },
    heightAt(x, z) {
      const fx = Math.max(0, Math.min(size - 1.001, (x + .5) * (size - 1))), fz = Math.max(0, Math.min(size - 1.001, (z / 1.5453255 + .5) * (size - 1)));
      const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
      const a = THREE.MathUtils.lerp(heights[iz * size + ix], heights[iz * size + ix + 1], tx);
      const b = THREE.MathUtils.lerp(heights[(iz + 1) * size + ix], heights[(iz + 1) * size + ix + 1], tx);
      const time = uniforms.time.value;
      let flow = Math.sin(x * 14 + z * 5 + time * 1.9) * Math.cos(z * 11 - x * 4 - time * 1.3) * .009 + Math.sin(x * 29 + z * 18 - time * 3) * .003;
      // Same wakes and rings as the shader, so floating things ride them.
      for (const m of movers) {
        if (m.z <= 0) continue;
        const d = Math.hypot(x - m.x, z - m.y);
        flow += Math.sin(d * WAKE.k - time * WAKE.omega) * WAKE.amp * Math.exp(-d * WAKE.falloff) * m.z;
      }
      for (const r of ripples) {
        const age = time - r.z;
        if (r.w <= 0 || age < 0 || age > RING.life) continue;
        const u = Math.hypot(x - r.x, z - r.y) - age * RING.speed;
        flow += Math.sin(u * RING.k) * RING.amp * Math.exp(-u * u / RING.width2) * Math.exp(-age * RING.damping) * r.w;
      }
      return THREE.MathUtils.lerp(a, b, tz) + flow;
    },
  };
}
