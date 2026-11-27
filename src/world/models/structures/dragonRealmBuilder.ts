// ============================================================================
// MODULE: World / Models / Structures / Dragon Realm Builder
// DESIGN: Constructs the Surface Dragon Mirror Gate and the isolated Dragon
//         Mirror Sanctum dimension (Astral Nebula Sky, Obsidian Sanctuary Plaza,
//         Bone & Crystal Dragon Daises, Floating Islands & Portal Shaders) (SRP)
// SUMMARY: Builds distance-culled surface portal shrine meshes + GLSL portal
//          vortex and the full otherworldly Dragon Realm environment with pooled
//          lighting and zero-GC per-frame updates.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  DRAGON_PORTAL_SHRINE_POS,
  DRAGON_REALM_ARRIVAL_DAIS,
  DRAGON_REALM_CAUSEWAY,
  DRAGON_REALM_EAST_DAIS,
  DRAGON_REALM_FLOATING_ISLANDS,
  DRAGON_REALM_NORTH_THRONE,
  DRAGON_REALM_ORIGIN,
  DRAGON_REALM_PLAZA,
  DRAGON_REALM_RETURN_GATE,
  DRAGON_REALM_WEST_DAIS,
} from '../../domain/landmarks/dragonRealm/dragonRealmLayout';
import {
  dragonRealmWalkableHeightAt,
  isInsideDragonRealm,
  isSurfaceDragonPortalActive,
} from '../../domain/landmarks/dragonRealm/dragonRealmWorld';
import { getActiveWorldAnimals } from '../../systems/boidsAndWildlifeSystem';
import { VIEW_DISTANCE, isWithinViewDistance } from '../../terrainMath';
import type { IWorldModelBuildContext } from '../types';
import {
  createDragonRealmModelInstance,
  isDragonRealmModelLoaded,
  loadDragonRealmModel,
  type IDragonRealmModelAsset,
} from './dragonRealmAssets';
// #endregion

// ======================== SHADERS & TEXTURES ======================== \\
// #region Shaders & Textures
function createRadialGlowSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.28, 'rgba(216, 180, 254, 0.85)');
    grad.addColorStop(0.65, 'rgba(99, 102, 241, 0.28)');
    grad.addColorStop(1.0, 'rgba(15, 10, 30, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSanctuarySigilTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;

    // Dark obsidian slate base
    const baseGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, cx);
    baseGrad.addColorStop(0, '#1e1635');
    baseGrad.addColorStop(0.55, '#131024');
    baseGrad.addColorStop(1, '#0b0915');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // Subtle radial stone tile joints
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.14)';
    ctx.lineWidth = 3;
    for (const r of [140, 240, 340, 440, 488]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 140, cy + Math.sin(a) * 140);
      ctx.lineTo(cx + Math.cos(a) * 488, cy + Math.sin(a) * 488);
      ctx.stroke();
    }

    // Glowing arcane octagram
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.72)';
    ctx.lineWidth = 4;
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + k * (Math.PI / 4);
        const px = Math.cos(ang) * 320;
        const py = Math.sin(ang) * 320;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Inner rune circles
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 210, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 118, 0, Math.PI * 2);
    ctx.stroke();

    // Glyph ticks along ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const r0 = i % 3 === 0 ? 226 : 232;
      const r1 = 256;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPortalVortexShaderMaterial(
  colorCoreHex: number,
  colorEdgeHex: number
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorCore: { value: new THREE.Color(colorCoreHex) },
      uColorEdge: { value: new THREE.Color(colorEdgeHex) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorCore;
      uniform vec3 uColorEdge;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;

        float angle = atan(p.y, p.x);
        float swirl = angle + 4.8 * (1.0 - r) - uTime * 2.4;
        float spiral1 = sin(swirl * 3.0 + noise(p * 4.5 + uTime * 0.45) * 4.2);
        float spiral2 = cos(swirl * 5.0 - uTime * 1.6 + r * 8.0);
        float energy = smoothstep(-0.35, 0.95, spiral1 * 0.55 + spiral2 * 0.45);

        float rim = smoothstep(0.62, 0.98, r) * (1.0 - smoothstep(0.95, 1.0, r));
        float abyssCore = 1.0 - smoothstep(0.0, 0.42, r);

        vec3 col = mix(vec3(0.02, 0.01, 0.06), uColorEdge, energy * 0.78);
        col = mix(col, uColorCore, rim * 1.15 + smoothstep(0.25, 0.78, energy) * 0.65);
        col += vec3(0.65, 0.92, 1.0) * pow(max(0.0, spiral1 * spiral2), 3.0) * (1.0 - r) * 0.8;
        col *= (1.0 - abyssCore * 0.52);

        float alpha = clamp((0.76 + energy * 0.24 + rim * 0.4) * (1.0 - smoothstep(0.94, 1.0, r)), 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createNebulaSkyDomeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vDir;

      float hash3(vec3 p) {
        p = fract(p * vec3(443.8975, 397.2973, 491.1871));
        p += dot(p, p.yxz + 19.19);
        return fract((p.x + p.y) * p.z);
      }

      float noise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(
            mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
            mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x),
            f.y
          ),
          mix(
            mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
            mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x),
            f.y
          ),
          f.z
        );
      }

      float fbm3(vec3 p) {
        float v = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          v += amp * noise3(p);
          p = p * 2.05 + vec3(1.7, 3.1, 2.3);
          amp *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 d = normalize(vDir);
        float horizonGlow = exp(-abs(d.y) * 3.6);
        float upper = smoothstep(-0.2, 0.85, d.y);

        vec3 skyCol = mix(vec3(0.07, 0.03, 0.16), vec3(0.02, 0.01, 0.07), upper);
        skyCol += vec3(0.14, 0.05, 0.28) * horizonGlow;

        float nebA = fbm3(d * 2.8 + vec3(uTime * 0.008, 0.0, -uTime * 0.006));
        float nebB = fbm3(d * 4.4 - vec3(0.0, uTime * 0.006, uTime * 0.009));
        float auroraBand = exp(-pow((d.y - 0.18 + sin(d.x * 3.2 + uTime * 0.12) * 0.12) * 3.4, 2.0));

        skyCol += vec3(0.32, 0.11, 0.54) * smoothstep(0.42, 0.85, nebA) * 0.72;
        skyCol += vec3(0.06, 0.45, 0.58) * smoothstep(0.48, 0.88, nebB) * auroraBand * 0.95;

        // Smooth circular starfield (two octaves of twinkling cosmic pinpoints)
        vec3 starCoordA = d * 155.0;
        float starValA = hash3(floor(starCoordA));
        float starGlowA = smoothstep(0.42, 0.04, length(fract(starCoordA) - 0.5));
        float starMaskA = smoothstep(0.985, 0.999, starValA) * starGlowA;
        float twinkleA = 0.6 + 0.4 * sin(uTime * 2.2 + starValA * 90.0);

        vec3 starCoordB = d * 245.0;
        float starValB = hash3(floor(starCoordB));
        float starGlowB = smoothstep(0.38, 0.03, length(fract(starCoordB) - 0.5));
        float starMaskB = smoothstep(0.989, 0.9995, starValB) * starGlowB;
        float twinkleB = 0.55 + 0.45 * cos(uTime * 1.7 + starValB * 75.0);

        skyCol += vec3(0.84, 0.92, 1.0) * starMaskA * twinkleA * 1.65;
        skyCol += vec3(0.95, 0.80, 1.0) * starMaskB * twinkleB * 1.25;

        gl_FragColor = vec4(skyCol, 1.0);
      }
    `,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
}

function createVoidMistPlaneMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 c = vUv * 2.0 - 1.0;
        float dist = length(c);
        float edgeFade = 1.0 - smoothstep(0.55, 1.0, dist);
        float w1 = noise(vUv * 12.0 + vec2(uTime * 0.04, -uTime * 0.03));
        float w2 = noise(vUv * 24.0 - vec2(uTime * 0.06, uTime * 0.05));
        float cloud = smoothstep(0.32, 0.85, w1 * 0.65 + w2 * 0.35);

        vec3 col = mix(vec3(0.04, 0.02, 0.10), vec3(0.16, 0.08, 0.34), cloud);
        col += vec3(0.05, 0.28, 0.42) * smoothstep(0.62, 0.92, w2) * 0.55;
        gl_FragColor = vec4(col, edgeFade * (0.42 + cloud * 0.38));
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}
// #endregion

// ======================== PORTAL VORTEX HELPER ======================== \\
// #region Portal Vortex Helper
interface IPortalVortexRig {
  readonly group: THREE.Group;
  readonly vortexMat: THREE.ShaderMaterial;
  readonly haloRing: THREE.Mesh;
  readonly ovalScaleY: number;
  readonly embers: THREE.Points;
  readonly emberPhase: Float32Array;
  readonly emberBaseRadius: Float32Array;
}

function buildMirrorPortalVortexRig(
  ctx: IWorldModelBuildContext,
  radius: number,
  ovalScaleY: number,
  colorCoreHex: number,
  colorEdgeHex: number,
  glowSpriteTex: THREE.CanvasTexture
): IPortalVortexRig {
  const { disposableGeometries, disposableMaterials } = ctx;
  const group = new THREE.Group();

  // Solid opaque abyss disc completely concealing the statue's black circle behind the portal
  const backGeo = new THREE.CircleGeometry(radius * 1.005, 56);
  const backMat = new THREE.MeshBasicMaterial({
    color: 0x04020b,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  disposableGeometries.push(backGeo);
  disposableMaterials.push(backMat);
  const backDisc = new THREE.Mesh(backGeo, backMat);
  backDisc.scale.set(1, ovalScaleY, 1);
  backDisc.position.z = 0;
  group.add(backDisc);

  // Swirling cosmic shader portal facing outward (+Z) and inward (-Z) flush over the statue's black circle
  const vortexGeo = new THREE.CircleGeometry(radius, 56);
  const vortexMat = createPortalVortexShaderMaterial(colorCoreHex, colorEdgeHex);
  disposableGeometries.push(vortexGeo);
  disposableMaterials.push(vortexMat);
  const vortexMeshFront = new THREE.Mesh(vortexGeo, vortexMat);
  vortexMeshFront.scale.set(1, ovalScaleY, 1);
  vortexMeshFront.position.z = 0.045;
  group.add(vortexMeshFront);

  const vortexMeshBack = new THREE.Mesh(vortexGeo, vortexMat);
  vortexMeshBack.scale.set(1, ovalScaleY, 1);
  vortexMeshBack.rotation.y = Math.PI;
  vortexMeshBack.position.z = -0.045;
  group.add(vortexMeshBack);

  // Outer glowing rune halo torus framing the mirror circle
  const haloTube = Math.max(0.045, radius * 0.036);
  const haloGeo = new THREE.TorusGeometry(radius * 1.015, haloTube, 12, 56);
  const haloMat = new THREE.MeshBasicMaterial({
    color: colorCoreHex,
    transparent: true,
    opacity: 0.88,
  });
  disposableGeometries.push(haloGeo);
  disposableMaterials.push(haloMat);
  const haloRing = new THREE.Mesh(haloGeo, haloMat);
  haloRing.scale.set(1, ovalScaleY, 1);
  haloRing.position.z = 0.055;
  group.add(haloRing);

  // Orbiting portal embers scaled with aperture radius
  const count = ctx.isSoftwareGl ? 40 : 88;
  const positions = new Float32Array(count * 3);
  const emberPhase = new Float32Array(count);
  const emberBaseRadius = new Float32Array(count);
  const depthScale = Math.max(1.0, radius * 0.45);
  for (let i = 0; i < count; i++) {
    emberPhase[i] = (i / count) * Math.PI * 2;
    emberBaseRadius[i] = radius * (0.48 + ((i * 17) % 19) / 28);
    positions[i * 3] = Math.cos(emberPhase[i]) * emberBaseRadius[i];
    positions[i * 3 + 1] = Math.sin(emberPhase[i]) * emberBaseRadius[i] * ovalScaleY;
    positions[i * 3 + 2] = (0.06 + (i % 7) * 0.035) * depthScale;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const emberMat = new THREE.PointsMaterial({
    size: Math.max(0.24, radius * 0.16),
    map: glowSpriteTex,
    color: colorCoreHex,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposableGeometries.push(emberGeo);
  disposableMaterials.push(emberMat);
  const embers = new THREE.Points(emberGeo, emberMat);
  group.add(embers);

  return { group, vortexMat, haloRing, ovalScaleY, embers, emberPhase, emberBaseRadius };
}

function updatePortalVortexRig(rig: IPortalVortexRig, elapsedTime: number): void {
  rig.vortexMat.uniforms.uTime.value = elapsedTime;
  rig.haloRing.rotation.z = elapsedTime * 0.35;
  const pulse = 1.0 + Math.sin(elapsedTime * 2.6) * 0.025;
  rig.haloRing.scale.set(pulse, pulse * rig.ovalScaleY, 1);

  const posAttr = rig.embers.geometry.getAttribute('position') as THREE.BufferAttribute;
  const arr = posAttr.array as Float32Array;
  const count = rig.emberPhase.length;
  for (let i = 0; i < count; i++) {
    const baseR = rig.emberBaseRadius[i];
    const wobble = Math.max(0.16, baseR * 0.08);
    const a = rig.emberPhase[i] + elapsedTime * (0.65 + (i % 5) * 0.14);
    const r = baseR + Math.sin(elapsedTime * 2.2 + i) * wobble;
    arr[i * 3] = Math.cos(a) * r;
    arr[i * 3 + 1] = Math.sin(a) * r * rig.ovalScaleY;
    arr[i * 3 + 2] = 0.16 + Math.sin(elapsedTime * 3.1 + i * 0.7) * wobble * 0.8;
  }
  posAttr.needsUpdate = true;
}
// #endregion

// ======================== PUBLIC ORCHESTRATOR ======================== \\
// #region Builder Entrypoint
export interface IDragonRealmHandles {
  readonly surfaceShrineGroup: THREE.Group;
  readonly dragonRealmGroup: THREE.Group;
  readonly updateDragonRealm: (elapsedTime: number, playerX: number, playerY: number, playerZ: number) => void;
}

/**
 * Summary: Builds the Surface Dragon Mirror Gate + swirling portal AND the entire
 *          isolated Dragon Mirror Sanctum dimension ("Other World").
 */
export function buildDragonRealmModels(ctx: IWorldModelBuildContext): IDragonRealmHandles {
  const {
    scene,
    isSoftwareGl,
    disposableGeometries,
    disposableMaterials,
    disposableTextures,
    distanceCulledObjects,
    lanternLights,
  } = ctx;

  const glowSpriteTex = createRadialGlowSpriteTexture();
  const sigilTex = createSanctuarySigilTexture();
  disposableTextures.push(glowSpriteTex, sigilTex);

  // Shared materials for the Surface Altar & Dragon Realm obsidian architecture
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x161224,
    roughness: 0.48,
    metalness: 0.28,
  });
  const slateFloorMat = new THREE.MeshStandardMaterial({
    color: 0x26203a,
    roughness: 0.62,
    metalness: 0.18,
  });
  const sigilFloorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sigilTex,
    emissive: 0x4c1d95,
    emissiveMap: sigilTex,
    emissiveIntensity: 0.55,
    roughness: 0.52,
    metalness: 0.24,
  });
  const boneSpireMat = new THREE.MeshStandardMaterial({
    color: 0xbcb3a1,
    roughness: 0.78,
    metalness: 0.06,
  });
  const runeGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd4a448,
    emissive: 0x7c2d12,
    emissiveIntensity: 0.22,
    roughness: 0.34,
    metalness: 0.72,
  });
  const cyanCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.15,
    roughness: 0.18,
    metalness: 0.35,
  });
  const violetCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x9333ea,
    emissiveIntensity: 1.25,
    roughness: 0.18,
    metalness: 0.35,
  });
  const emeraldVenomCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x059669,
    emissiveIntensity: 1.15,
    roughness: 0.2,
    metalness: 0.32,
  });
  disposableMaterials.push(
    obsidianMat,
    slateFloorMat,
    sigilFloorMat,
    boneSpireMat,
    runeGoldMat,
    cyanCrystalMat,
    violetCrystalMat,
    emeraldVenomCrystalMat
  );

  const registerPortalLight = (
    parent: THREE.Object3D,
    lx: number,
    ly: number,
    lz: number,
    colorHex: number,
    intensity: number,
    distance: number,
    isRealmLight: boolean
  ) => {
    const pl = new THREE.PointLight(colorHex, intensity, distance, 1.4);
    pl.position.set(lx, ly, lz);
    pl.userData.baseIntensity = intensity;
    if (isRealmLight) {
      pl.userData.isDragonRealmLight = true;
    }
    parent.add(pl);
    lanternLights.push(pl);
    return pl;
  };

  // =========================================================================
  // 1. SURFACE DRAGON MIRROR SHRINE (at DRAGON_PORTAL_SHRINE_POS)
  // =========================================================================
  const surfaceShrineGroup = new THREE.Group();
  surfaceShrineGroup.name = 'dragon-mirror-shrine';
  surfaceShrineGroup.position.set(
    DRAGON_PORTAL_SHRINE_POS.x,
    DRAGON_PORTAL_SHRINE_POS.targetH,
    DRAGON_PORTAL_SHRINE_POS.z
  );
  surfaceShrineGroup.rotation.y = DRAGON_PORTAL_SHRINE_POS.shrineYaw;
  scene.add(surfaceShrineGroup);

  // Outer carved rune stone ring + smooth climbable stepped obsidian plinth
  const outerPadGeo = new THREE.CylinderGeometry(
    DRAGON_PORTAL_SHRINE_POS.plinthTopRadius,
    DRAGON_PORTAL_SHRINE_POS.plinthRadius,
    DRAGON_PORTAL_SHRINE_POS.plinthHeight,
    12
  );
  disposableGeometries.push(outerPadGeo);
  const outerPad = new THREE.Mesh(outerPadGeo, obsidianMat);
  outerPad.position.y = DRAGON_PORTAL_SHRINE_POS.plinthHeight * 0.5;
  outerPad.receiveShadow = true;
  surfaceShrineGroup.add(outerPad);

  const sigilTopGeo = new THREE.CircleGeometry(DRAGON_PORTAL_SHRINE_POS.plinthTopRadius - 0.12, 32);
  sigilTopGeo.rotateX(-Math.PI * 0.5);
  disposableGeometries.push(sigilTopGeo);
  const sigilTop = new THREE.Mesh(sigilTopGeo, sigilFloorMat);
  sigilTop.position.y = DRAGON_PORTAL_SHRINE_POS.plinthHeight + 0.015;
  sigilTop.receiveShadow = true;
  surfaceShrineGroup.add(sigilTop);

  // 4 colossal outer obsidian rune obelisk pillars framing the 80m plateau (matching collider boxes)
  const shrinePillarGeo = new THREE.CylinderGeometry(0.88, 1.45, 16.5, 6);
  const shrineCrystalGeo = new THREE.OctahedronGeometry(1.18, 0);
  disposableGeometries.push(shrinePillarGeo, shrineCrystalGeo);
  const surfaceCrystals: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pMesh = new THREE.Mesh(shrinePillarGeo, obsidianMat);
      pMesh.position.set(sx * 24.5, 8.25, sz * 20.5);
      pMesh.castShadow = !isSoftwareGl;
      pMesh.receiveShadow = true;
      surfaceShrineGroup.add(pMesh);

      const cMesh = new THREE.Mesh(
        shrineCrystalGeo,
        sx + sz === 0 ? cyanCrystalMat : violetCrystalMat
      );
      cMesh.position.set(sx * 24.5, 18.2, sz * 20.5);
      surfaceShrineGroup.add(cMesh);
      surfaceCrystals.push(cMesh);
    }
  }

  // Astral Wind Thermal updraft sigil & rising wind ribbons in front of the colossal monument (Wind Glider access)
  const thermalSigilGeo = new THREE.RingGeometry(
    DRAGON_PORTAL_SHRINE_POS.thermalLocal.radius * 0.52,
    DRAGON_PORTAL_SHRINE_POS.thermalLocal.radius * 0.88,
    40
  );
  thermalSigilGeo.rotateX(-Math.PI * 0.5);
  const thermalSigilMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const thermalRibbonGeo = new THREE.TorusGeometry(
    DRAGON_PORTAL_SHRINE_POS.thermalLocal.radius * 0.62,
    0.16,
    8,
    36
  );
  thermalRibbonGeo.rotateX(Math.PI * 0.5);
  const thermalRibbonMat = new THREE.MeshBasicMaterial({
    color: 0xa5f3fc,
    transparent: true,
    opacity: 0.46,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposableGeometries.push(thermalSigilGeo, thermalRibbonGeo);
  disposableMaterials.push(thermalSigilMat, thermalRibbonMat);

  const thermalSigilMesh = new THREE.Mesh(thermalSigilGeo, thermalSigilMat);
  thermalSigilMesh.position.set(
    DRAGON_PORTAL_SHRINE_POS.thermalLocal.lx,
    DRAGON_PORTAL_SHRINE_POS.plinthHeight + 0.08,
    DRAGON_PORTAL_SHRINE_POS.thermalLocal.lz
  );
  surfaceShrineGroup.add(thermalSigilMesh);

  const thermalRibbons: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const rMesh = new THREE.Mesh(thermalRibbonGeo, thermalRibbonMat);
    rMesh.position.set(
      DRAGON_PORTAL_SHRINE_POS.thermalLocal.lx,
      4.0 + i * 8.5,
      DRAGON_PORTAL_SHRINE_POS.thermalLocal.lz
    );
    rMesh.scale.setScalar(0.85 + (i % 3) * 0.12);
    surfaceShrineGroup.add(rMesh);
    thermalRibbons.push(rMesh);
  }

  // Animated cosmic Mirror Portal Vortex positioned flush on the colossal 80m statue's central black mirror circle
  const surfacePortalRig = buildMirrorPortalVortexRig(
    ctx,
    DRAGON_PORTAL_SHRINE_POS.mirrorRadius,
    DRAGON_PORTAL_SHRINE_POS.mirrorOvalScaleY,
    0x38bdf8,
    0x9333ea,
    glowSpriteTex
  );
  surfacePortalRig.group.position.set(
    DRAGON_PORTAL_SHRINE_POS.mirrorCenterLocal.x,
    DRAGON_PORTAL_SHRINE_POS.plinthHeight + DRAGON_PORTAL_SHRINE_POS.mirrorCenterLocal.y,
    DRAGON_PORTAL_SHRINE_POS.mirrorCenterLocal.z
  );
  surfacePortalRig.group.rotation.y = DRAGON_PORTAL_SHRINE_POS.mirrorYawOffset;
  surfacePortalRig.group.visible = false;
  surfaceShrineGroup.add(surfacePortalRig.group);

  const surfacePortalLight = registerPortalLight(
    surfaceShrineGroup,
    DRAGON_PORTAL_SHRINE_POS.mirrorCenterLocal.x,
    DRAGON_PORTAL_SHRINE_POS.plinthHeight + DRAGON_PORTAL_SHRINE_POS.mirrorCenterLocal.y,
    DRAGON_PORTAL_SHRINE_POS.mirrorCenterLocal.z + 2.5,
    0xa855f7,
    0,
    85,
    false
  );
  surfacePortalLight.userData.isSurfaceDragonPortalLight = true;

  // =========================================================================
  // 2. ISOLATED DRAGON MIRROR SANCTUM ("OTHER WORLD") AT DRAGON_REALM_ORIGIN
  // =========================================================================
  const sanctumDimensionGroup = new THREE.Group();
  sanctumDimensionGroup.name = 'dragon-realm-root';
  sanctumDimensionGroup.position.set(
    DRAGON_REALM_ORIGIN.x,
    DRAGON_REALM_ORIGIN.y,
    DRAGON_REALM_ORIGIN.z
  );
  sanctumDimensionGroup.visible = false;
  scene.add(sanctumDimensionGroup);

  // Cosmic Nebula Sky Dome (follows player or wraps whole realm cleanly at radius 240m)
  const skyDomeGeo = new THREE.SphereGeometry(240, 48, 32);
  const skyDomeMat = createNebulaSkyDomeMaterial();
  disposableGeometries.push(skyDomeGeo);
  disposableMaterials.push(skyDomeMat);
  const skyDomeMesh = new THREE.Mesh(skyDomeGeo, skyDomeMat);
  skyDomeMesh.position.set(0, 12, -10);
  sanctumDimensionGroup.add(skyDomeMesh);

  // Swirling Astral Void Mist Sea far below the islands
  const voidSeaGeo = new THREE.PlaneGeometry(420, 420);
  voidSeaGeo.rotateX(-Math.PI * 0.5);
  const voidSeaMat = createVoidMistPlaneMaterial();
  disposableGeometries.push(voidSeaGeo);
  disposableMaterials.push(voidSeaMat);
  const voidSeaMesh = new THREE.Mesh(voidSeaGeo, voidSeaMat);
  voidSeaMesh.position.set(0, -18, -10);
  sanctumDimensionGroup.add(voidSeaMesh);

  // Helper to build a sculpted obsidian floating platform with faceted crystal underside spire
  const buildFloatingObsidianDais = (
    lx: number,
    ly: number,
    lz: number,
    radius: number,
    spireDepth: number,
    useSigilFloor = false,
    rimColorMat: THREE.Material = violetCrystalMat
  ) => {
    const grp = new THREE.Group();
    grp.position.set(lx, ly, lz);

    const capGeo = new THREE.CylinderGeometry(radius, radius * 0.94, 1.35, 32);
    const spireGeo = new THREE.ConeGeometry(radius * 0.88, spireDepth, 12);
    spireGeo.rotateX(Math.PI);
    const trimGeo = new THREE.TorusGeometry(radius * 0.985, 0.14, 8, 48);
    trimGeo.rotateX(Math.PI * 0.5);
    disposableGeometries.push(capGeo, spireGeo, trimGeo);

    const cap = new THREE.Mesh(capGeo, slateFloorMat);
    cap.position.y = -0.675;
    cap.receiveShadow = true;
    grp.add(cap);

    if (useSigilFloor) {
      const topDiscGeo = new THREE.CircleGeometry(radius - 0.35, 48);
      topDiscGeo.rotateX(-Math.PI * 0.5);
      disposableGeometries.push(topDiscGeo);
      const topDisc = new THREE.Mesh(topDiscGeo, sigilFloorMat);
      topDisc.position.y = 0.015;
      topDisc.receiveShadow = true;
      grp.add(topDisc);
    }

    const spire = new THREE.Mesh(spireGeo, obsidianMat);
    spire.position.y = -1.35 - spireDepth * 0.5;
    grp.add(spire);

    const trim = new THREE.Mesh(trimGeo, rimColorMat);
    trim.position.y = -0.08;
    grp.add(trim);

    sanctumDimensionGroup.add(grp);
    return grp;
  };

  // A. Arrival & Return Mirror Dais (south entrance pad)
  buildFloatingObsidianDais(
    DRAGON_REALM_ARRIVAL_DAIS.lx,
    DRAGON_REALM_ARRIVAL_DAIS.topLy,
    DRAGON_REALM_ARRIVAL_DAIS.lz,
    DRAGON_REALM_ARRIVAL_DAIS.radius,
    11.5,
    true,
    cyanCrystalMat
  );

  // Return Mirror Gate & Portal Vortex behind the Arrival Pad facing -Z (north toward player)
  const realmReturnGateGroup = new THREE.Group();
  realmReturnGateGroup.position.set(
    DRAGON_REALM_RETURN_GATE.lx,
    DRAGON_REALM_RETURN_GATE.ly,
    DRAGON_REALM_RETURN_GATE.lz
  );
  realmReturnGateGroup.rotation.y = Math.PI; // Faces -Z (toward plaza & arrival spawn)
  sanctumDimensionGroup.add(realmReturnGateGroup);

  const returnPortalRig = buildMirrorPortalVortexRig(
    ctx,
    DRAGON_REALM_RETURN_GATE.mirrorRadius,
    DRAGON_REALM_RETURN_GATE.mirrorOvalScaleY,
    0x38bdf8,
    0xc084fc,
    glowSpriteTex
  );
  returnPortalRig.group.position.set(
    DRAGON_REALM_RETURN_GATE.mirrorCenterLx,
    DRAGON_REALM_RETURN_GATE.mirrorCenterLy,
    DRAGON_REALM_RETURN_GATE.mirrorCenterLz
  );
  returnPortalRig.group.rotation.y = DRAGON_REALM_RETURN_GATE.mirrorYawOffset;
  realmReturnGateGroup.add(returnPortalRig.group);

  // Flanking Return Gate Pillars & Arch (wide enough around 16m statue, matching collider boxes)
  const gatePillarGeo = new THREE.CylinderGeometry(0.55, 0.85, 10.5, 6);
  const gateArchBeamGeo = new THREE.TorusGeometry(4.2, 0.35, 8, 28, Math.PI);
  disposableGeometries.push(gatePillarGeo, gateArchBeamGeo);
  for (const side of [-1, 1]) {
    const p = new THREE.Mesh(gatePillarGeo, obsidianMat);
    p.position.set(side * 4.2, 5.25, 0);
    realmReturnGateGroup.add(p);

    const flameCrystal = new THREE.Mesh(shrineCrystalGeo, cyanCrystalMat);
    flameCrystal.position.set(side * 4.2, 11.4, 0);
    realmReturnGateGroup.add(flameCrystal);
    surfaceCrystals.push(flameCrystal);
  }
  const gateArchBeam = new THREE.Mesh(gateArchBeamGeo, runeGoldMat);
  gateArchBeam.position.set(0, 10.2, 0);
  realmReturnGateGroup.add(gateArchBeam);

  // Walkable Glowing Astral Return Ramp & Upper Deck leading up into the Return Mirror Gate
  const returnRampSteps = 12;
  const returnRampSpan = DRAGON_REALM_RETURN_GATE.rampTopLz - DRAGON_REALM_RETURN_GATE.rampStartLz;
  const returnStepDepth = returnRampSpan / returnRampSteps + 0.25;
  const returnStepGeo = new THREE.BoxGeometry(
    DRAGON_REALM_RETURN_GATE.bridgeHalfWidth * 2,
    0.7,
    returnStepDepth
  );
  const returnCurbGeo = new THREE.BoxGeometry(0.32, 0.36, returnStepDepth);
  const returnDeckLen = DRAGON_REALM_RETURN_GATE.deckEndLz - DRAGON_REALM_RETURN_GATE.rampTopLz;
  const returnDeckGeo = new THREE.BoxGeometry(
    DRAGON_REALM_RETURN_GATE.bridgeHalfWidth * 2,
    0.85,
    returnDeckLen + 0.4
  );
  const returnPierGeo = new THREE.BoxGeometry(0.9, DRAGON_REALM_RETURN_GATE.bridgeTopLy, 1.1);
  disposableGeometries.push(returnStepGeo, returnCurbGeo, returnDeckGeo, returnPierGeo);

  for (let i = 0; i < returnRampSteps; i++) {
    const t = (i + 0.5) / returnRampSteps;
    const lz = DRAGON_REALM_RETURN_GATE.rampStartLz + t * returnRampSpan;
    const stepTopY = DRAGON_REALM_RETURN_GATE.bridgeTopLy * t;

    const rStep = new THREE.Mesh(returnStepGeo, slateFloorMat);
    rStep.position.set(0, stepTopY - 0.35, lz);
    rStep.receiveShadow = true;
    sanctumDimensionGroup.add(rStep);

    for (const side of [-1, 1]) {
      const rCurb = new THREE.Mesh(returnCurbGeo, cyanCrystalMat);
      rCurb.position.set(
        side * (DRAGON_REALM_RETURN_GATE.bridgeHalfWidth + 0.14),
        stepTopY + 0.14,
        lz
      );
      sanctumDimensionGroup.add(rCurb);
    }
  }

  const returnDeck = new THREE.Mesh(returnDeckGeo, slateFloorMat);
  returnDeck.position.set(
    0,
    DRAGON_REALM_RETURN_GATE.bridgeTopLy - 0.425,
    (DRAGON_REALM_RETURN_GATE.rampTopLz + DRAGON_REALM_RETURN_GATE.deckEndLz) * 0.5
  );
  returnDeck.receiveShadow = true;
  sanctumDimensionGroup.add(returnDeck);

  for (const side of [-1, 1]) {
    const rPier = new THREE.Mesh(returnPierGeo, obsidianMat);
    rPier.position.set(
      side * (DRAGON_REALM_RETURN_GATE.bridgeHalfWidth - 0.4),
      DRAGON_REALM_RETURN_GATE.bridgeTopLy * 0.5,
      DRAGON_REALM_RETURN_GATE.rampTopLz
    );
    sanctumDimensionGroup.add(rPier);
  }

  // Attach user's Dragon Mirror Statue GLB to BOTH the Colossal Surface Shrine and Realm Return Gate
  const attachDragonMirrorStatue = (asset: IDragonRealmModelAsset) => {
    const surfaceStatue = createDragonRealmModelInstance(asset, {
      scale: DRAGON_PORTAL_SHRINE_POS.statueScale,
      castShadow: !isSoftwareGl,
      receiveShadow: true,
      yawOffset: DRAGON_PORTAL_SHRINE_POS.statueLocalYawOffset,
    });
    surfaceStatue.position.y = DRAGON_PORTAL_SHRINE_POS.plinthHeight;
    surfaceShrineGroup.add(surfaceStatue);

    const realmStatue = createDragonRealmModelInstance(asset, {
      scale: DRAGON_REALM_RETURN_GATE.statueScale,
      castShadow: false,
      receiveShadow: true,
      yawOffset: DRAGON_PORTAL_SHRINE_POS.statueLocalYawOffset,
    });
    realmReturnGateGroup.add(realmStatue);
  };

  if (isDragonRealmModelLoaded('dragon_mirror_statue')) {
    void loadDragonRealmModel('dragon_mirror_statue').then(attachDragonMirrorStatue);
  } else {
    void loadDragonRealmModel('dragon_mirror_statue')
      .then(attachDragonMirrorStatue)
      .catch(() => {
        // Fallback arch already frames the glowing vortex cleanly if GLB unavailable
      });
  }

  // B. Grand Astral Causeway Bridge (matching dragonRealmWalkableHeightAt curve)
  const bridgeSegCount = 14;
  const bridgeSpan = DRAGON_REALM_CAUSEWAY.maxLz - DRAGON_REALM_CAUSEWAY.minLz;
  const segLen = bridgeSpan / bridgeSegCount + 0.16;
  const segDeckGeo = new THREE.BoxGeometry(DRAGON_REALM_CAUSEWAY.halfWidth * 2, 0.85, segLen);
  const segRailGeo = new THREE.BoxGeometry(0.45, 0.72, segLen);
  const ribPillarGeo = new THREE.TorusGeometry(6.8, 0.42, 8, 24, Math.PI);
  disposableGeometries.push(segDeckGeo, segRailGeo, ribPillarGeo);

  for (let i = 0; i < bridgeSegCount; i++) {
    const lz = DRAGON_REALM_CAUSEWAY.minLz + (i + 0.5) * (bridgeSpan / bridgeSegCount);
    const topY =
      (dragonRealmWalkableHeightAt(DRAGON_REALM_ORIGIN.x, DRAGON_REALM_ORIGIN.z + lz) ??
        DRAGON_REALM_ORIGIN.y) - DRAGON_REALM_ORIGIN.y;

    const slab = new THREE.Mesh(segDeckGeo, slateFloorMat);
    slab.position.set(0, topY - 0.425, lz);
    slab.receiveShadow = true;
    sanctumDimensionGroup.add(slab);

    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(segRailGeo, obsidianMat);
      curb.position.set(side * (DRAGON_REALM_CAUSEWAY.halfWidth + 0.15), topY + 0.32, lz);
      sanctumDimensionGroup.add(curb);
    }
  }

  // 3 Colossal Curving Obsidian Rib Arches spanning overhead along the Causeway
  for (const ribLz of [22.0, 28.0, 34.0]) {
    const topY =
      (dragonRealmWalkableHeightAt(DRAGON_REALM_ORIGIN.x, DRAGON_REALM_ORIGIN.z + ribLz) ??
        DRAGON_REALM_ORIGIN.y) - DRAGON_REALM_ORIGIN.y;
    const rib = new THREE.Mesh(ribPillarGeo, obsidianMat);
    rib.position.set(0, topY + 0.4, ribLz);
    sanctumDimensionGroup.add(rib);

    for (const side of [-1, 1]) {
      const brazierCrystal = new THREE.Mesh(shrineCrystalGeo, cyanCrystalMat);
      brazierCrystal.position.set(side * 4.35, topY + 1.45, ribLz);
      sanctumDimensionGroup.add(brazierCrystal);
      surfaceCrystals.push(brazierCrystal);
    }
  }

  // C. Colossal Central Sanctuary Plaza (radius 32m, inlaid arcane sigil)
  buildFloatingObsidianDais(
    DRAGON_REALM_PLAZA.lx,
    DRAGON_REALM_PLAZA.topLy,
    DRAGON_REALM_PLAZA.lz,
    DRAGON_REALM_PLAZA.radius,
    24.0,
    true,
    violetCrystalMat
  );

  // 8 Outer Sanctuary Obelisk Pillars with floating glowing crystals
  const obeliskGeo = new THREE.CylinderGeometry(0.45, 1.05, 8.2, 6);
  const obeliskCapCrystalGeo = new THREE.OctahedronGeometry(0.95, 0);
  disposableGeometries.push(obeliskGeo, obeliskCapCrystalGeo);
  for (let idx = 0; idx < 8; idx++) {
    const angle = (idx / 8) * Math.PI * 2 + Math.PI / 8;
    const ox = Math.cos(angle) * 29.2;
    const oz = DRAGON_REALM_PLAZA.lz + Math.sin(angle) * 29.2;

    const ob = new THREE.Mesh(obeliskGeo, obsidianMat);
    ob.position.set(ox, DRAGON_REALM_PLAZA.topLy + 4.1, oz);
    sanctumDimensionGroup.add(ob);

    const cr = new THREE.Mesh(
      obeliskCapCrystalGeo,
      idx % 2 === 0 ? cyanCrystalMat : violetCrystalMat
    );
    cr.position.set(ox, DRAGON_REALM_PLAZA.topLy + 9.4, oz);
    sanctumDimensionGroup.add(cr);
    surfaceCrystals.push(cr);
  }

  // D. Western Necropolis Bone Dais (Skeleton Dragon Arena)
  buildFloatingObsidianDais(
    DRAGON_REALM_WEST_DAIS.lx,
    DRAGON_REALM_WEST_DAIS.topLy,
    DRAGON_REALM_WEST_DAIS.lz,
    DRAGON_REALM_WEST_DAIS.radius,
    13.5,
    true,
    cyanCrystalMat
  );
  // Smooth stepped collar connecting plaza -> West Dais
  const collarGeo = new THREE.CylinderGeometry(
    DRAGON_REALM_WEST_DAIS.radius - 0.1,
    DRAGON_REALM_WEST_DAIS.rampOuterRadius,
    DRAGON_REALM_WEST_DAIS.topLy - DRAGON_REALM_PLAZA.topLy,
    32
  );
  disposableGeometries.push(collarGeo);
  const westCollar = new THREE.Mesh(collarGeo, slateFloorMat);
  westCollar.position.set(
    DRAGON_REALM_WEST_DAIS.lx,
    (DRAGON_REALM_WEST_DAIS.topLy + DRAGON_REALM_PLAZA.topLy) * 0.5,
    DRAGON_REALM_WEST_DAIS.lz
  );
  sanctumDimensionGroup.add(westCollar);

  // Sculpted Dragon-Bone Rib Spires arching behind the Western Dais
  const boneHornGeo = new THREE.ConeGeometry(0.55, 6.2, 6);
  disposableGeometries.push(boneHornGeo);
  for (let b = 0; b < 5; b++) {
    const ang = Math.PI * 0.65 + (b / 4) * Math.PI * 0.7;
    const bx = DRAGON_REALM_WEST_DAIS.lx + Math.cos(ang) * (DRAGON_REALM_WEST_DAIS.radius - 0.6);
    const bz = DRAGON_REALM_WEST_DAIS.lz + Math.sin(ang) * (DRAGON_REALM_WEST_DAIS.radius - 0.6);
    const horn = new THREE.Mesh(boneHornGeo, boneSpireMat);
    horn.position.set(bx, DRAGON_REALM_WEST_DAIS.topLy + 2.6, bz);
    horn.rotation.z = Math.cos(ang) * -0.35;
    horn.rotation.x = Math.sin(ang) * 0.35;
    sanctumDimensionGroup.add(horn);
  }

  // E. Eastern Abyssal Crystal Basin Dais (Hydra Dragon Arena)
  buildFloatingObsidianDais(
    DRAGON_REALM_EAST_DAIS.lx,
    DRAGON_REALM_EAST_DAIS.topLy,
    DRAGON_REALM_EAST_DAIS.lz,
    DRAGON_REALM_EAST_DAIS.radius,
    13.5,
    true,
    emeraldVenomCrystalMat
  );
  const eastCollar = new THREE.Mesh(collarGeo, slateFloorMat);
  eastCollar.position.set(
    DRAGON_REALM_EAST_DAIS.lx,
    (DRAGON_REALM_EAST_DAIS.topLy + DRAGON_REALM_PLAZA.topLy) * 0.5,
    DRAGON_REALM_EAST_DAIS.lz
  );
  sanctumDimensionGroup.add(eastCollar);

  // Emerald-Violet Crystal Clusters jutting behind the Eastern Dais
  const shardGeo = new THREE.ConeGeometry(0.65, 4.8, 5);
  disposableGeometries.push(shardGeo);
  for (let c = 0; c < 7; c++) {
    const ang = -Math.PI * 0.35 + (c / 6) * Math.PI * 0.7;
    const cx = DRAGON_REALM_EAST_DAIS.lx + Math.cos(ang) * (DRAGON_REALM_EAST_DAIS.radius - 0.5);
    const cz = DRAGON_REALM_EAST_DAIS.lz + Math.sin(ang) * (DRAGON_REALM_EAST_DAIS.radius - 0.5);
    const shard = new THREE.Mesh(
      shardGeo,
      c % 2 === 0 ? emeraldVenomCrystalMat : violetCrystalMat
    );
    shard.position.set(cx, DRAGON_REALM_EAST_DAIS.topLy + 2.0, cz);
    shard.scale.setScalar(0.8 + (c % 3) * 0.35);
    shard.rotation.z = Math.cos(ang) * -0.28;
    shard.rotation.x = Math.sin(ang) * 0.28;
    sanctumDimensionGroup.add(shard);
  }

  // F. Northern Astral Crown Spire & Grand Ceremonial Staircase
  buildFloatingObsidianDais(
    DRAGON_REALM_NORTH_THRONE.lx,
    DRAGON_REALM_NORTH_THRONE.topLy,
    DRAGON_REALM_NORTH_THRONE.lz,
    DRAGON_REALM_NORTH_THRONE.radius,
    18.0,
    true,
    runeGoldMat
  );

  const numSteps = 12;
  const stairGeo = new THREE.BoxGeometry(
    DRAGON_REALM_NORTH_THRONE.stairHalfWidth * 2,
    0.45,
    1.1
  );
  disposableGeometries.push(stairGeo);
  for (let s = 0; s < numSteps; s++) {
    const t = (s + 0.5) / numSteps;
    const lz =
      DRAGON_REALM_NORTH_THRONE.stairStartLz +
      (DRAGON_REALM_NORTH_THRONE.stairEndLz - DRAGON_REALM_NORTH_THRONE.stairStartLz) * t;
    const sy =
      DRAGON_REALM_PLAZA.topLy +
      (DRAGON_REALM_NORTH_THRONE.topLy - DRAGON_REALM_PLAZA.topLy) * t;
    const step = new THREE.Mesh(stairGeo, slateFloorMat);
    step.position.set(0, sy - 0.22, lz);
    sanctumDimensionGroup.add(step);
  }

  // Rotating Astrolabe Rings + Astral Starlight Beacon Pillar on North Spire
  const throneBeaconPedestalGeo = new THREE.CylinderGeometry(1.4, 1.9, 2.2, 8);
  const astroOuterGeo = new THREE.TorusGeometry(4.4, 0.16, 10, 48);
  const astroInnerGeo = new THREE.TorusGeometry(3.1, 0.14, 10, 40);
  const beamGeo = new THREE.CylinderGeometry(0.65, 1.15, 78, 16, 1, true);
  disposableGeometries.push(throneBeaconPedestalGeo, astroOuterGeo, astroInnerGeo, beamGeo);

  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposableMaterials.push(beamMat);

  const pedestal = new THREE.Mesh(throneBeaconPedestalGeo, obsidianMat);
  pedestal.position.set(0, DRAGON_REALM_NORTH_THRONE.topLy + 1.1, DRAGON_REALM_NORTH_THRONE.lz - 5.2);
  sanctumDimensionGroup.add(pedestal);

  const astroOuterRing = new THREE.Mesh(astroOuterGeo, runeGoldMat);
  astroOuterRing.position.set(0, DRAGON_REALM_NORTH_THRONE.topLy + 6.4, DRAGON_REALM_NORTH_THRONE.lz - 5.2);
  sanctumDimensionGroup.add(astroOuterRing);

  const astroInnerRing = new THREE.Mesh(astroInnerGeo, cyanCrystalMat);
  astroInnerRing.position.copy(astroOuterRing.position);
  sanctumDimensionGroup.add(astroInnerRing);

  const throneCoreCrystal = new THREE.Mesh(obeliskCapCrystalGeo, violetCrystalMat);
  throneCoreCrystal.scale.setScalar(1.45);
  throneCoreCrystal.position.copy(astroOuterRing.position);
  sanctumDimensionGroup.add(throneCoreCrystal);

  const skyBeam = new THREE.Mesh(beamGeo, beamMat);
  skyBeam.position.set(0, DRAGON_REALM_NORTH_THRONE.topLy + 40, DRAGON_REALM_NORTH_THRONE.lz - 5.2);
  sanctumDimensionGroup.add(skyBeam);

  // G. 7 Scenic Floating Crystal Islands orbiting the outer sky
  const floatingIslandGroups: Array<{
    group: THREE.Group;
    baseY: number;
    phase: number;
  }> = [];
  for (let i = 0; i < DRAGON_REALM_FLOATING_ISLANDS.length; i++) {
    const isl = DRAGON_REALM_FLOATING_ISLANDS[i];
    const islGroup = new THREE.Group();
    islGroup.position.set(isl.lx, isl.ly, isl.lz);

    const iCapGeo = new THREE.CylinderGeometry(isl.radius, isl.radius * 0.85, 1.8, 12);
    const iSpireGeo = new THREE.ConeGeometry(isl.radius * 0.84, isl.height, 9);
    iSpireGeo.rotateX(Math.PI);
    disposableGeometries.push(iCapGeo, iSpireGeo);

    const iCap = new THREE.Mesh(iCapGeo, obsidianMat);
    iCap.position.y = -0.9;
    const iSpire = new THREE.Mesh(iSpireGeo, obsidianMat);
    iSpire.position.y = -1.8 - isl.height * 0.5;
    islGroup.add(iCap, iSpire);

    for (let s = 0; s < 3; s++) {
      const ang = (s / 3) * Math.PI * 2 + isl.phase;
      const cr = new THREE.Mesh(
        shardGeo,
        (i + s) % 2 === 0 ? violetCrystalMat : cyanCrystalMat
      );
      cr.position.set(Math.cos(ang) * isl.radius * 0.48, 1.8, Math.sin(ang) * isl.radius * 0.48);
      cr.scale.setScalar(0.85 + s * 0.25);
      islGroup.add(cr);
    }

    sanctumDimensionGroup.add(islGroup);
    floatingIslandGroups.push({ group: islGroup, baseY: isl.ly, phase: isl.phase });
  }

  // H. Cosmic Floating Embers Particle Cloud inside the Dragon Realm (zero-GC buffer update)
  const realmEmberCount = isSoftwareGl ? 120 : 320;
  const realmEmberPos = new Float32Array(realmEmberCount * 3);
  const realmEmberSeed = new Float32Array(realmEmberCount * 2);
  for (let i = 0; i < realmEmberCount; i++) {
    const angle = ((i * 137.5) * Math.PI) / 180;
    const rad = 6 + ((i * 29) % 72);
    realmEmberPos[i * 3] = Math.cos(angle) * rad;
    realmEmberPos[i * 3 + 1] = -6 + ((i * 7) % 34);
    realmEmberPos[i * 3 + 2] = -12 + Math.sin(angle) * rad;
    realmEmberSeed[i * 2] = angle;
    realmEmberSeed[i * 2 + 1] = rad;
  }
  const realmEmberGeo = new THREE.BufferGeometry();
  realmEmberGeo.setAttribute('position', new THREE.BufferAttribute(realmEmberPos, 3));
  const realmEmberMat = new THREE.PointsMaterial({
    size: 0.48,
    map: glowSpriteTex,
    color: 0xd8b4fe,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposableGeometries.push(realmEmberGeo);
  disposableMaterials.push(realmEmberMat);
  const realmEmbers = new THREE.Points(realmEmberGeo, realmEmberMat);
  sanctumDimensionGroup.add(realmEmbers);

  // I. Pooled Realm PointLights (handled seamlessly by atmosphereRenderController)
  registerPortalLight(sanctumDimensionGroup, 0, 5.5, 48, 0x38bdf8, 5.5, 42, true);
  registerPortalLight(sanctumDimensionGroup, 0, 6.0, 28, 0xa855f7, 5.2, 42, true);
  registerPortalLight(sanctumDimensionGroup, 0, 9.5, -10, 0xc084fc, 6.2, 58, true);
  registerPortalLight(
    sanctumDimensionGroup,
    DRAGON_REALM_WEST_DAIS.lx,
    7.5,
    DRAGON_REALM_WEST_DAIS.lz,
    0x38bdf8,
    6.4,
    46,
    true
  );
  registerPortalLight(
    sanctumDimensionGroup,
    DRAGON_REALM_EAST_DAIS.lx,
    7.5,
    DRAGON_REALM_EAST_DAIS.lz,
    0x34d399,
    6.4,
    46,
    true
  );
  registerPortalLight(
    sanctumDimensionGroup,
    DRAGON_REALM_NORTH_THRONE.lx,
    11.5,
    DRAGON_REALM_NORTH_THRONE.lz,
    0xf59e0b,
    6.5,
    52,
    true
  );

  // Keep the colossal 80m northern monument visible from across the snowy tundra horizon (560m)
  distanceCulledObjects.push({
    obj: surfaceShrineGroup,
    cx: DRAGON_PORTAL_SHRINE_POS.x,
    cz: DRAGON_PORTAL_SHRINE_POS.z,
    radius: 90,
    maxDist: 560,
  });

  // =========================================================================
  // 3. PER-FRAME ANIMATION TICK
  // =========================================================================
  const updateDragonRealm = (
    elapsedTime: number,
    playerX: number,
    playerY: number,
    playerZ: number
  ) => {
    const inRealm = isInsideDragonRealm(playerX, playerZ, playerY);

    // Distance-cull + layer-isolate Surface Shrine
    if (inRealm) {
      surfaceShrineGroup.visible = false;
    } else {
      surfaceShrineGroup.visible = isWithinViewDistance(
        DRAGON_PORTAL_SHRINE_POS.x,
        DRAGON_PORTAL_SHRINE_POS.z,
        playerX,
        playerZ,
        90,
        560
      );
    }

    const portalActive = isSurfaceDragonPortalActive(getActiveWorldAnimals());
    surfacePortalRig.group.visible = portalActive;
    surfacePortalLight.userData.baseIntensity = portalActive ? 11.0 : 0;
    surfacePortalLight.intensity = portalActive ? 11.0 : 0;

    if (surfaceShrineGroup.visible) {
      if (portalActive) {
        updatePortalVortexRig(surfacePortalRig, elapsedTime);
      }
      for (let i = 0; i < thermalRibbons.length; i++) {
        const rib = thermalRibbons[i];
        const phase = (elapsedTime * 0.22 + i / thermalRibbons.length) % 1;
        rib.position.y = 3.0 + phase * 52.0;
        rib.rotation.z = elapsedTime * 1.4 + i;
      }
      thermalSigilMesh.rotation.y = elapsedTime * 0.6;
    }

    // Isolate the Other World entirely when player is on the surface
    sanctumDimensionGroup.visible = inRealm;
    if (!inRealm) {
      return;
    }

    skyDomeMat.uniforms.uTime.value = elapsedTime;
    voidSeaMat.uniforms.uTime.value = elapsedTime;
    updatePortalVortexRig(returnPortalRig, elapsedTime);

    // Spin crystals and astrolabe rings
    for (let i = 0; i < surfaceCrystals.length; i++) {
      const cr = surfaceCrystals[i];
      cr.rotation.y = elapsedTime * 0.9 + i * 0.6;
    }
    astroOuterRing.rotation.y = elapsedTime * 0.42;
    astroOuterRing.rotation.x = Math.sin(elapsedTime * 0.35) * 0.35;
    astroInnerRing.rotation.x = elapsedTime * 0.68;
    astroInnerRing.rotation.z = elapsedTime * 0.25;
    throneCoreCrystal.rotation.y = -elapsedTime * 1.1;

    for (let i = 0; i < floatingIslandGroups.length; i++) {
      const fi = floatingIslandGroups[i];
      fi.group.position.y = fi.baseY + Math.sin(elapsedTime * 0.55 + fi.phase) * 1.05;
    }

    // Drift cosmic embers upward
    const posAttr = realmEmbers.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < realmEmberCount; i++) {
      let y = arr[i * 3 + 1] + 0.018;
      if (y > 28) y = -6;
      arr[i * 3 + 1] = y;
      const baseAngle = realmEmberSeed[i * 2] + elapsedTime * 0.05;
      const rad = realmEmberSeed[i * 2 + 1];
      arr[i * 3] = Math.cos(baseAngle) * rad;
      arr[i * 3 + 2] = -12 + Math.sin(baseAngle) * rad;
    }
    posAttr.needsUpdate = true;
  };

  return {
    surfaceShrineGroup,
    dragonRealmGroup: sanctumDimensionGroup,
    updateDragonRealm,
  };
}
// #endregion
