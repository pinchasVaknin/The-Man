// ============================================================================
// MODULE: World / Controllers / Atmosphere Render Controller
// DESIGN: Synchronizes Three.js scene lighting, sky, and fog with solar/weather state (SRP)
// SUMMARY: Applies solar cycle, Preetham sky shader uniforms, dynamic fog density,
//          directional sunlight, hemisphere ambient, and lantern intensities.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import {
  IDynamicAtmosphereState,
  IWeatherStateSnapshot,
  computeDynamicSolarCycle,
  isInsideSouthernMine,
} from '../terrainMath';

const _stormFogColor = new THREE.Color(0x3a4759);
const _sandFogColor = new THREE.Color(0xc9a87a);
const _denseFogColor = new THREE.Color(0xc2d1dc);
const _lightningColor = new THREE.Color(0xdbeafe);
// #endregion

// ======================== CONTEXT & TYPES ======================== \\
// #region Context & Types
/**
 * Summary: Rendering context for dynamic atmosphere and celestial lighting updates.
 * Design: Bundles sky dome, sun light, ambient light, fog, and water shader uniforms.
 */
export interface IAtmosphereRenderContext {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  sky: Sky;
  sunDiscMesh: THREE.Mesh;
  sunDiscMat: THREE.MeshBasicMaterial;
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  fog: THREE.FogExp2;
  bgColor: THREE.Color;
  sunVec: THREE.Vector3;
  waterMaterial: THREE.MeshPhysicalMaterial;
  lanternLights: THREE.PointLight[];
}
// #endregion

// ======================== MINE LIGHT POOL ======================== \\
// #region Mine Light Pool
/**
 * Summary: A fixed pool of point lights that light the mine from its nearest lanterns.
 * Design: The mine has dozens of lanterns, and every point light a material can see adds work per pixel. Instead, the
 *         mine's lanterns are hidden and MINE_LIGHT_POOL_SIZE pooled lights copy the nearest ones each frame. The pool
 *         size is fixed, so the shader is compiled once and does not recompile as the player moves (audit P3).
 */
export const MINE_LIGHT_POOL_SIZE = 6;
const minePools = new WeakMap<THREE.Scene, THREE.PointLight[]>();
const poolScratch = new THREE.Vector3();

/** Summary: True when the object and all its ancestors are visible (a lantern inside a culled group is not drawn). */
function isVisibleInHierarchy(obj: THREE.Object3D): boolean {
  for (let cur: THREE.Object3D | null = obj; cur; cur = cur.parent) {
    if (!cur.visible) return false;
  }
  return true;
}

/** Summary: True when a lantern belongs to the southern mine group (named in the model). */
function isMineLantern(obj: THREE.Object3D): boolean {
  for (let cur: THREE.Object3D | null = obj; cur; cur = cur.parent) {
    if (cur.name === 'southern-mine') return true;
  }
  return false;
}

function updateMineLightPool(
  scene: THREE.Scene,
  lanterns: readonly THREE.PointLight[],
  playerPos?: { readonly x: number; readonly y: number; readonly z: number },
  isPlayerUndergroundInMine = false
): void {
  const isSoftwareGl = Boolean(scene.userData?.isSoftwareGl);
  if (isSoftwareGl) {
    for (let i = 0; i < lanterns.length; i++) {
      lanterns[i].visible = false;
    }
    const existingPool = minePools.get(scene);
    if (existingPool) {
      for (let i = 0; i < existingPool.length; i++) {
        existingPool[i].visible = false;
        existingPool[i].intensity = 0;
      }
    }
    return;
  }

  let pool = minePools.get(scene);
  if (!pool) {
    pool = Array.from({ length: MINE_LIGHT_POOL_SIZE }, () => {
      const light = new THREE.PointLight(0xffffff, 0, 0.01, 1);
      light.visible = true;
      scene.add(light);
      return light;
    });
    minePools.set(scene, pool);
  }

  const candidates: Array<{ light: THREE.PointLight; dist2: number; wx: number; wy: number; wz: number }> = [];
  const maxSurfaceDistSq = 75 * 75;
  for (let i = 0; i < lanterns.length; i++) {
    const src = lanterns[i];
    const inMine = Boolean(src.userData.isUndergroundMineLight) || isMineLantern(src);
    src.userData.isUndergroundMineLight = inMine;
    // Source lanterns never light the scene directly; only the fixed pool does so NUM_POINT_LIGHTS never changes.
    src.visible = false;
    if (!playerPos || src.intensity <= 0.01) continue;
    if (isPlayerUndergroundInMine !== inMine) continue;
    if (src.parent && !isVisibleInHierarchy(src.parent)) continue;
    src.getWorldPosition(poolScratch);
    const dx = poolScratch.x - playerPos.x;
    const dy = poolScratch.y - playerPos.y;
    const dz = poolScratch.z - playerPos.z;
    const dist2 = dx * dx + dy * dy + dz * dz;
    if (!inMine && dist2 > maxSurfaceDistSq) continue;
    candidates.push({ light: src, dist2, wx: poolScratch.x, wy: poolScratch.y, wz: poolScratch.z });
  }
  candidates.sort((a, b) => a.dist2 - b.dist2);

  for (let i = 0; i < pool.length; i++) {
    const slot = pool[i];
    const pick = candidates[i];
    if (!pick) {
      slot.intensity = 0;
      slot.distance = 0.01;
      continue;
    }
    slot.position.set(pick.wx, pick.wy, pick.wz);
    slot.color.copy(pick.light.color);
    slot.intensity = pick.light.intensity;
    slot.distance = pick.light.distance;
    slot.decay = pick.light.decay;
  }
}
// #endregion

// ======================== CONTROLLER LOGIC ======================== \\
// #region Controller Logic
/**
 * Summary: Controller Pattern: Applies dynamic solar cycle and weather state to the Three.js scene,
 * Preetham sky shader, directional/hemisphere lights, exponential fog, water material, and lanterns.
 * @param ctx Shared build context (scene, textures, disposal lists).
 * @param hours Hour of day, 0-24.
 * @param weather Current weather snapshot (optional).
 * @param playerPos Current player world position (optional) to isolate subterranean mine lighting.
 * @returns The atmosphere state that was applied (sun, sky and fog values).
 */
export function applyDynamicAtmosphereToScene(
  ctx: IAtmosphereRenderContext,
  hours: number,
  weather?: IWeatherStateSnapshot,
  playerPos?: { readonly x: number; readonly y: number; readonly z: number }
): IDynamicAtmosphereState {
  const {
    scene,
    renderer,
    sky,
    sunDiscMesh,
    sunDiscMat,
    sunLight,
    hemiLight,
    fog,
    bgColor,
    sunVec,
    waterMaterial,
    lanternLights,
  } = ctx;

  const atmo = computeDynamicSolarCycle(hours);
  sunVec.set(atmo.sunDirX, atmo.sunDirY, atmo.sunDirZ);

  const isPlayerUndergroundInMine = Boolean(
    playerPos && playerPos.y < -1.4 && isInsideSouthernMine(playerPos.x, playerPos.z)
  );

  const stormDark = weather ? weather.cloudDarkness : 0;
  const sandHaze = weather ? weather.sandWindIntensity : 0;
  const fogStrength = weather ? weather.fogIntensity : 0;
  const flash = weather ? weather.lightningFlash : 0;

  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value =
    atmo.skyTurbidity + stormDark * 8.0 + sandHaze * 6.0 + fogStrength * 7.5;
  skyUniforms['rayleigh'].value = atmo.skyRayleigh * (1.0 - stormDark * 0.45);
  skyUniforms['mieCoefficient'].value =
    atmo.mieCoefficient + sandHaze * 0.018 + fogStrength * 0.025;
  skyUniforms['mieDirectionalG'].value = atmo.mieDirectionalG;
  skyUniforms['sunPosition'].value.copy(sunVec);

  if (isPlayerUndergroundInMine) {
    // Subterranean Mine Lighting: warm torchlit ambient illumination with deep slate shadows
    // so the entire mine is clearly visible while preserving an authentic underground cavern atmosphere.
    sky.visible = false;
    sunDiscMesh.visible = false;
    sunLight.intensity = 0;
    // The sun contributes nothing underground, so skip re-rendering its shadow map until the player surfaces.
    renderer.shadowMap.autoUpdate = false;

    hemiLight.color.setHex(0x52607a);
    hemiLight.groundColor.setHex(0x332214);
    hemiLight.intensity = 0.92;
    scene.environmentIntensity = 0.28;

    fog.color.setHex(0x0d1017);
    fog.density = 0.0022;
    bgColor.setHex(0x0d1017);
    renderer.toneMappingExposure = 1.26;
  } else {
    renderer.shadowMap.autoUpdate = true;
    // Hide Preetham sky dome during deep night, heavy storm clouds, or dense fog so atmospheric color shows
    sky.visible = atmo.nightFactor < 0.72 && stormDark < 0.75 && fogStrength < 0.65;
    sunDiscMesh.visible = stormDark < 0.65 && fogStrength < 0.55;
    sunDiscMat.color.setHex(atmo.isNight ? 0xdbeafe : 0xfff7d6);

    sunLight.color.setHex(atmo.sunColorHex);
    if (flash > 0.1) {
      sunLight.color.lerp(_lightningColor, flash);
    }
    sunLight.intensity =
      atmo.sunIntensity * (1.0 - stormDark * 0.55) * (1.0 - fogStrength * 0.42) + flash * 4.2;

    hemiLight.color.setHex(atmo.hemiSkyHex);
    hemiLight.groundColor.setHex(atmo.hemiGroundHex);
    hemiLight.intensity = atmo.hemiIntensity * (1.0 - stormDark * 0.35) + flash * 2.2;

    const wetnessBoost = weather ? weather.wetness * 0.14 : 0;
    scene.environmentIntensity = Math.max(
      0.08,
      (0.45 + wetnessBoost) * (1 - atmo.nightFactor * 0.82) * (1 - stormDark * 0.45) + flash * 0.35
    );

    fog.color.setHex(atmo.fogColorHex);
    if (stormDark > 0.05) {
      fog.color.lerp(_stormFogColor, stormDark * (1 - atmo.nightFactor * 0.7));
    }
    if (sandHaze > 0.05) {
      fog.color.lerp(_sandFogColor, sandHaze * 0.65 * (1 - atmo.nightFactor * 0.7));
    }
    if (fogStrength > 0.05) {
      fog.color.lerp(_denseFogColor, fogStrength * 0.78 * (1 - atmo.nightFactor * 0.65));
    }
    if (flash > 0.1) {
      fog.color.lerp(_lightningColor, flash * 0.55);
    }
    fog.density =
      atmo.fogDensity +
      (weather
        ? weather.rainIntensity * 0.0045 +
          sandHaze * 0.0065 +
          weather.snowIntensity * 0.0035 +
          fogStrength * 0.022
        : 0);
    bgColor.copy(fog.color);

    waterMaterial.color.setHex(atmo.waterDeepHex);
    renderer.toneMappingExposure = atmo.exposure + flash * 0.35;
  }

  const outdoorLanternStrength =
    atmo.isNight || stormDark > 0.6 || fogStrength > 0.6
      ? 6.5
      : atmo.sunElevationDeg < 16
        ? 3.2
        : 0;
  for (const pl of lanternLights) {
    const inMine = Boolean(pl.userData.isUndergroundMineLight) || isMineLantern(pl);
    pl.userData.isUndergroundMineLight = inMine;
    if (inMine) {
      pl.intensity = (pl.userData.baseIntensity as number) ?? 4.2;
    } else {
      const base = (pl.userData.baseIntensity as number | undefined);
      pl.intensity = base !== undefined ? Math.max(base, outdoorLanternStrength) : outdoorLanternStrength;
    }
  }
  updateMineLightPool(scene, lanternLights, playerPos, isPlayerUndergroundInMine);

  return atmo;
}
// #endregion
