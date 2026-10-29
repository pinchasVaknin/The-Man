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
export type AtmosphereRenderContext = IAtmosphereRenderContext;
// #endregion

// ======================== CONTROLLER LOGIC ======================== \\
// #region Controller Logic
/**
 * Summary: Apply dynamic atmosphere to scene.
 * Design: Standard domain component following SRP and clean architectural contracts.
 * Controller Pattern: Applies dynamic solar cycle and weather state to the Three.js scene,
 * Preetham sky shader, directional/hemisphere lights, exponential fog, water material, and lanterns.
 * @param ctx Input parameter ctx.
 * @param hours Input parameter hours.
 * @param weather Input parameter weather.
 * @returns Computed result for applyDynamicAtmosphereToScene.
 */
export function applyDynamicAtmosphereToScene(
  ctx: IAtmosphereRenderContext,
  hours: number,
  weather?: IWeatherStateSnapshot
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

  const lanternStrength =
    atmo.isNight || stormDark > 0.6 || fogStrength > 0.6
      ? 6.5
      : atmo.sunElevationDeg < 16
        ? 3.2
        : 1.1;
  for (const pl of lanternLights) {
    pl.intensity = lanternStrength;
  }

  return atmo;
}
// #endregion
