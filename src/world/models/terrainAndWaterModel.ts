// ============================================================================
// MODULE: World / Models / Terrain And Water Model
// DESIGN: 7x7 chunked procedural terrain mesh and animated physical water surface (SRP)
// SUMMARY: Constructs multi-biome terrain chunks with procedural shaders and puddles,
//          along with real-time wave-deformed reflective water surface mesh.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import {
  WATER_LEVEL,
  SOUTHERN_MINE_POS,
  groundHeightAt,
  getSurfaceNormalAt,
  trailFactorAt,
  birchGroveFactorAt,
  southwestOasisBiomeFactorAt,
  northernSnowZoneFactorAt,
  fbm2D,
} from '../terrainMath';
import type { WorldModelBuildContext } from './types';
// #endregion

// ======================== SHADER HELPERS ======================== \\
// #region Shader Helpers
/**
 * Attaches a dynamic vertex wave and fragment normal ripple deformation shader to water materials.
 */
export function attachAnimatedWaterWaveShader(
  mat: THREE.MeshPhysicalMaterial,
  waveHeight = 0.045,
  rippleStrength = 0.085,
  animatedWaterMaterials?: THREE.MeshPhysicalMaterial[]
): void {
  mat.userData.uTime = { value: 0 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = mat.userData.uTime;
    shader.vertexShader =
      `uniform float uTime;\nvarying vec3 vWaterWorldPos;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec4 wp = modelMatrix * vec4(transformed, 1.0);
        float w1 = sin(wp.x * 0.62 + uTime * 1.85) * cos(wp.z * 0.54 + uTime * 1.45) * ${waveHeight.toFixed(4)};
        float w2 = sin(wp.x * 1.45 - uTime * 2.45 + wp.z * 1.25) * ${(waveHeight * 0.55).toFixed(4)};
        transformed.y += w1 + w2;
        vWaterWorldPos = wp.xyz;
        `
      );
    shader.fragmentShader =
      `uniform float uTime;\nvarying vec3 vWaterWorldPos;\n` +
      shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
        #include <normal_fragment_maps>
        float rx = cos(vWaterWorldPos.x * 2.8 + uTime * 2.6) * ${rippleStrength.toFixed(4)} + sin(vWaterWorldPos.z * 3.5 - uTime * 2.1) * ${(rippleStrength * 0.68).toFixed(4)};
        float rz = sin(vWaterWorldPos.z * 3.0 + uTime * 2.3) * ${rippleStrength.toFixed(4)} + cos(vWaterWorldPos.x * 3.3 + uTime * 2.9) * ${(rippleStrength * 0.68).toFixed(4)};
        normal = normalize(normal + vec3(rx, 0.0, rz));
        `
      );
  };
  if (animatedWaterMaterials) {
    animatedWaterMaterials.push(mat);
  }
}

function smoothstepLocal(edge0: number, edge1: number, val: number): number {
  const t = Math.max(0, Math.min(1, (val - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
// #endregion

// ======================== BUILD TERRAIN & WATER ======================== \\
// #region Build Terrain & Water
export interface TerrainAndWaterResult {
  readonly waterMaterial: THREE.MeshPhysicalMaterial;
}

/**
 * Builds the 7x7 spatially chunked terrain grid and the animated central water surface mesh.
 */
export function buildTerrainAndWaterModel(ctx: WorldModelBuildContext): TerrainAndWaterResult {
  const { scene, textures, isSoftwareGl, disposableGeometries, disposableMaterials, animatedWaterMaterials, distanceCulledObjects } = ctx;

  textures.terrainAlbedo.repeat.set(28, 28);
  textures.terrainBump.repeat.set(28, 28);

  // 1. SPATIALLY CHUNKED TERRAIN MESH (7x7 Grid of 220m Chunks = 1,540m x 1,540m)
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    map: textures.terrainAlbedo,
    bumpMap: textures.terrainBump,
    bumpScale: 0.08,
    roughness: 0.88,
    metalness: 0.04,
  });
  terrainMat.userData.uWetness = { value: 0.0 };
  terrainMat.userData.uTime = { value: 0.0 };
  terrainMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWetness = terrainMat.userData.uWetness;
    shader.uniforms.uTime = terrainMat.userData.uTime;
    shader.vertexShader =
      `varying vec3 vTerrainWorldPos;\nvarying vec3 vTerrainWorldNormal;\n` +
      shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vTerrainWorldNormal = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);
        `
      );
    shader.fragmentShader =
      `uniform float uWetness;\nuniform float uTime;\nvarying vec3 vTerrainWorldPos;\nvarying vec3 vTerrainWorldNormal;\n` +
      shader.fragmentShader
        .replace(
          '#include <clipping_planes_fragment>',
          `
          #include <clipping_planes_fragment>
          // Carve a real tunnel entrance opening into the steep North face of the Far-South Dwarven Mine Mountain
          if (abs(vTerrainWorldPos.x - (${SOUTHERN_MINE_POS.x.toFixed(1)})) < 3.25 && vTerrainWorldPos.z > ${(SOUTHERN_MINE_POS.entranceZ - 0.9).toFixed(1)} && vTerrainWorldPos.z < ${(SOUTHERN_MINE_POS.entranceZ + 13.5).toFixed(1)} && vTerrainWorldPos.y < 7.05) {
            discard;
          }
          float pWave1 = sin(vTerrainWorldPos.x * 0.24 + cos(vTerrainWorldPos.z * 0.21) * 1.6);
          float pWave2 = cos(vTerrainWorldPos.z * 0.31 - sin(vTerrainWorldPos.x * 0.27) * 1.4);
          float pWave3 = sin((vTerrainWorldPos.x + vTerrainWorldPos.z) * 0.52);
          float puddleField = (pWave1 * 0.45 + pWave2 * 0.35 + pWave3 * 0.20) * 0.5 + 0.5;
          float flatGroundMask = smoothstep(0.90, 0.965, vTerrainWorldNormal.y)
            * smoothstep(0.35, 0.75, vTerrainWorldPos.y)
            * (1.0 - smoothstep(12.5, 15.5, vTerrainWorldPos.y));
          float puddleMask = smoothstep(0.54, 0.67, puddleField) * flatGroundMask * smoothstep(0.12, 0.82, uWetness);
          `
        )
        .replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          if (uWetness > 0.01) {
            // Dampen & darken soil, grass, trails, and rock when wet
            diffuseColor.rgb *= mix(1.0, 0.64, uWetness * 0.85);
            // Reflective sky-tinted standing water puddles in low flat basins
            vec3 puddleTint = vec3(0.20, 0.30, 0.42);
            diffuseColor.rgb = mix(diffuseColor.rgb, puddleTint, puddleMask * 0.84);
          }
          `
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          if (uWetness > 0.01) {
            roughnessFactor = mix(roughnessFactor, 0.20, uWetness * 0.78);
            roughnessFactor = mix(roughnessFactor, 0.03, puddleMask);
          }
          `
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `
          #include <metalnessmap_fragment>
          if (uWetness > 0.01) {
            metalnessFactor = mix(metalnessFactor, 0.16, uWetness * 0.5);
            metalnessFactor = mix(metalnessFactor, 0.58, puddleMask);
          }
          `
        )
        .replace(
          '#include <normal_fragment_maps>',
          `
          #include <normal_fragment_maps>
          if (puddleMask > 0.02) {
            vec2 cellUv = fract(vTerrainWorldPos.xz * 0.45) - 0.5;
            float ring = sin(length(cellUv) * 42.0 - uTime * 14.0) * exp(-length(cellUv) * 4.5);
            float ripple = ring * puddleMask * 0.09;
            normal = normalize(normal + vec3(ripple, 0.0, -ripple));
          }
          `
        );
  };
  disposableMaterials.push(terrainMat);

  const cSand = new THREE.Color(0xb8a47e);
  const cLakebed = new THREE.Color(0x2d3d35);
  const cMeadow = new THREE.Color(0x52823a);
  const cLush = new THREE.Color(0x3d692b);
  const cForest = new THREE.Color(0x2d4f20);
  const cBirchFloor = new THREE.Color(0x7a6532);
  const cSavannaDirt = new THREE.Color(0xb58852);
  const cDesertSand = new THREE.Color(0xdcb478);
  const cDesertTerracotta = new THREE.Color(0xc27d4e);
  const cTrail = new THREE.Color(0x8c7355);
  const cRock = new THREE.Color(0x706c66);
  const cPeak = new THREE.Color(0x9b9790);
  const cSnow = new THREE.Color(0xeef5fc);
  const tmpColor = new THREE.Color();
  const tmpDesertColor = new THREE.Color();

  const chunkSize = 220;
  const chunkSegs = isSoftwareGl ? 38 : 54;
  const gridRadius = 3;

  for (let gx = -gridRadius; gx <= gridRadius; gx++) {
    for (let gz = -gridRadius; gz <= gridRadius; gz++) {
      const cx = gx * chunkSize;
      const cz = gz * chunkSize;

      const chunkGeo = new THREE.PlaneGeometry(chunkSize, chunkSize, chunkSegs, chunkSegs);
      chunkGeo.rotateX(-Math.PI / 2);
      disposableGeometries.push(chunkGeo);

      const posAttr = chunkGeo.attributes.position;
      const colors = new Float32Array(posAttr.count * 3);

      for (let i = 0; i < posAttr.count; i++) {
        const lx = posAttr.getX(i);
        const lz = posAttr.getZ(i);
        const wx = cx + lx;
        const wz = cz + lz;
        const y = groundHeightAt(wx, wz);
        posAttr.setY(i, y);

        const normal = getSurfaceNormalAt(wx, wz);
        const tf = trailFactorAt(wx, wz);
        const bf = birchGroveFactorAt(wx, wz);
        const swDesert = southwestOasisBiomeFactorAt(wx, wz);
        const snowFactor = northernSnowZoneFactorAt(wx, wz);
        const macroNoise = fbm2D(wx * 0.035 + 2.1, wz * 0.035 - 6.3, 2) * 0.5 + 0.5;

        if (y < WATER_LEVEL - 0.6) {
          tmpColor.copy(cLakebed).lerp(cSand, Math.max(0, (y + 2.8) / 2.2));
        } else if (y < WATER_LEVEL + 0.42) {
          const shoreT = Math.max(0, Math.min(1, (y - (WATER_LEVEL - 0.6)) / 1.02));
          tmpColor.copy(cSand).lerp(cMeadow, shoreT * shoreT);
        } else {
          tmpColor.copy(cMeadow).lerp(cLush, macroNoise);
          if (bf > 0.05) {
            tmpColor.lerp(cBirchFloor, bf * 0.72);
          } else if (wx < -25 && swDesert < 0.25) {
            tmpColor.lerp(cForest, 0.45 * (1.0 - swDesert * 4.0));
          }
          // Vast South-West Savanna Dirt, Terracotta Canyon Soil & Golden Desert Sands
          if (swDesert > 0.02) {
            tmpDesertColor
              .copy(cSavannaDirt)
              .lerp(cDesertSand, smoothstepLocal(0.25, 0.85, swDesert))
              .lerp(cDesertTerracotta, macroNoise * 0.38);
            tmpColor.lerp(tmpDesertColor, Math.min(0.96, swDesert * 1.08));
          }
        }

        if (tf > 0.01 && y > WATER_LEVEL + 0.15) {
          tmpColor.lerp(cTrail, tf * 0.85);
        }

        if (normal.ny < 0.82 || y > 10.5) {
          const slopeFactor = Math.min(1, Math.max(0, (0.83 - normal.ny) * 5.5));
          const heightFactor = Math.min(1, Math.max(0, (y - 10.5) / 16.0));
          const rockMix = Math.max(slopeFactor, heightFactor);
          tmpColor.lerp(y > 20 ? cPeak : cRock, rockMix);
        }

        // Blend alpine snow frost onto high northern mountains & ridges
        if (snowFactor > 0.15 && normal.ny > 0.62) {
          tmpColor.lerp(cSnow, Math.min(0.92, (snowFactor - 0.15) * 1.1));
        }

        colors[i * 3] = tmpColor.r;
        colors[i * 3 + 1] = tmpColor.g;
        colors[i * 3 + 2] = tmpColor.b;
      }

      chunkGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      chunkGeo.computeVertexNormals();

      const chunkMesh = new THREE.Mesh(chunkGeo, terrainMat);
      chunkMesh.position.set(cx, 0, cz);
      chunkMesh.receiveShadow = !isSoftwareGl;
      scene.add(chunkMesh);

      distanceCulledObjects.push({
        obj: chunkMesh,
        cx,
        cz,
        radius: chunkSize * 0.72,
      });
    }
  }

  // 2. REALISTIC ANIMATED WATER SURFACE (MOVING WAVES & SURFACE RIPPLES)
  const waterSegs = isSoftwareGl ? 56 : 96;
  const waterGeo = new THREE.PlaneGeometry(420, 420, waterSegs, waterSegs);
  waterGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(waterGeo);

  const waterMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x1b566b),
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: isSoftwareGl ? 0 : 0.95,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.86,
    envMapIntensity: 1.35,
  });
  attachAnimatedWaterWaveShader(waterMat, 0.048, 0.085, animatedWaterMaterials);
  disposableMaterials.push(waterMat);

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, WATER_LEVEL, 0);
  waterMesh.receiveShadow = !isSoftwareGl;
  scene.add(waterMesh);

  return { waterMaterial: waterMat };
}
// #endregion
