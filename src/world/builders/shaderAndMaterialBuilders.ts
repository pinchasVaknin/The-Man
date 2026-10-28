import * as THREE from 'three';
import { fbm2D, hash2D } from '../domain/noiseAndMath';

/**
 * Shader & Procedural Geometry/Texture Builders (Builder Pattern).
 * Encapsulates reusable GPU vertex-sway shaders, flag wave shaders, organic vertex perturbation,
 * and procedural bark canvas textures.
 */
export function perturbGeometryVertices(
  geo: THREE.BufferGeometry,
  amount: number,
  freq: number
): void {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const n = fbm2D(vx * freq + vy * 1.7, vz * freq - vy * 1.3, 2);
    const scale = 1.0 + n * amount;
    pos.setXYZ(i, vx * scale, vy * (1.0 + n * amount * 0.5), vz * scale);
  }
  geo.computeVertexNormals();
}

export function attachWindSwayShader(
  mat: THREE.MeshStandardMaterial,
  strength: number,
  frequency: number,
  swayMaterials: THREE.MeshStandardMaterial[]
): void {
  mat.userData.uTime = { value: 0 };
  mat.userData.uWindScale = { value: 1.0 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = mat.userData.uTime;
    shader.uniforms.uWindScale = mat.userData.uWindScale;
    shader.vertexShader =
      `uniform float uTime;\nuniform float uWindScale;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float heightFactor = max(0.0, position.y - 2.5);
        float worldPhase = transformed.x * 0.35 + transformed.z * 0.35;
        #ifdef USE_INSTANCING
          worldPhase += instanceMatrix[3][0] * 0.25 + instanceMatrix[3][2] * 0.25;
        #endif
        float sway = sin(uTime * ${frequency.toFixed(2)} + worldPhase) * ${strength.toFixed(4)} * heightFactor * uWindScale;
        transformed.x += sway;
        transformed.z += cos(uTime * ${(frequency * 0.83).toFixed(2)} + worldPhase) * ${(strength * 0.7).toFixed(4)} * heightFactor * uWindScale;
        `
      );
  };
  swayMaterials.push(mat);
}

/**
 * Horizontal flag wave shader: keeps the left edge (position.x == 0, attached to the flagpole)
 * completely stationary while the right edge (position.x == flagWidth) waves freely in the wind.
 */
export function attachFlagHorizontalWaveShader(
  mat: THREE.MeshStandardMaterial,
  flagWidth: number,
  strength: number,
  frequency: number,
  swayMaterials: THREE.MeshStandardMaterial[]
): void {
  mat.userData.uTime = { value: 0 };
  mat.userData.uWindScale = { value: 1.0 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = mat.userData.uTime;
    shader.uniforms.uWindScale = mat.userData.uWindScale;
    shader.vertexShader =
      `uniform float uTime;\nuniform float uWindScale;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float horizFactor = clamp(position.x / ${flagWidth.toFixed(3)}, 0.0, 1.0);
        float wavePhase = uTime * ${frequency.toFixed(2)} - position.x * 4.2 + position.y * 0.65;
        float flutter = sin(wavePhase) * ${strength.toFixed(4)} * horizFactor * uWindScale;
        transformed.z += flutter;
        transformed.y += cos(wavePhase * 0.85) * ${(strength * 0.22).toFixed(4)} * horizFactor * horizFactor * uWindScale;
        `
      );
  };
  swayMaterials.push(mat);
}

/**
 * Generates a procedural Silver Birch bark texture (pale silver-white bark with dark horizontal lenticel markings).
 */
export function createBirchBarkTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e5e0d5';
  ctx.fillRect(0, 0, w, h);

  // Subtle vertical grain
  for (let x = 0; x < w; x += 2) {
    const shade = 220 + Math.floor(hash2D(x, 11) * 22);
    ctx.fillStyle = `rgb(${shade}, ${shade - 4}, ${shade - 10})`;
    ctx.fillRect(x, 0, 2, h);
  }
  // Dark horizontal birch lenticel dashes & knots
  for (let i = 0; i < 95; i++) {
    const bx = Math.floor(hash2D(i, 31) * w);
    const by = Math.floor(hash2D(i, 47) * h);
    const bw = 10 + Math.floor(hash2D(i, 59) * 28);
    const bh = 2 + Math.floor(hash2D(i, 73) * 4);
    ctx.fillStyle = i % 5 === 0 ? '#2b2622' : '#4a433c';
    ctx.fillRect(bx, by, bw, bh);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
