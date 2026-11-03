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
  VOLCANO_SANCTUM_POS,
  groundHeightAt,
  getSurfaceNormalAt,
  trailFactorAt,
  birchGroveFactorAt,
  regionalForestDensityAt,
  southwestOasisBiomeFactorAt,
  northernSnowZoneFactorAt,
  fbm2D,
} from '../terrainMath';
import { volcanicBadlandsFactorAt } from '../systems/terrainAndBiomeSystem';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== SHADER HELPERS ======================== \\
// #region Shader Helpers
/**
 * Summary: Attaches a dynamic vertex wave and fragment normal ripple deformation shader to water materials.
 * @param mat Material to patch in place.
 * @param waveHeight Wave amplitude in meters.
 * @param rippleStrength Normal ripple strength.
 * @param animatedWaterMaterials List that collects the material for per-frame time updates.
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
/**
 * Summary: Meshes and material uniforms generated for ground terrain and water planes.
 * Design: Supplies terrain mesh, custom shader uniforms, and swimmable water surfaces.
 */
export interface ITerrainAndWaterResult {
  readonly waterMaterial: THREE.MeshPhysicalMaterial;
  readonly terrainMaterial: THREE.MeshStandardMaterial;
}

/**
 * Summary: Builds the 7x7 spatially chunked terrain grid and the animated central water surface mesh.
 * @param ctx Shared build context (scene, textures, disposal lists).
 * @returns Terrain material and water meshes for later updates.
 */
export function buildTerrainAndWaterModel(ctx: IWorldModelBuildContext): ITerrainAndWaterResult {
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
          // Carve arched ground-level tunnel portal openings at the 3 Mountain Bear Caves while keeping the floor intact and mountain peak solid above
          {
            // Cave 0: (-85, -76), facingYaw = 0 (+Z entrance), floorY = 2.2
            float c0x = vTerrainWorldPos.x - (-85.0);
            float c0z = vTerrainWorldPos.z - (-76.0);
            float c0y = vTerrainWorldPos.y - 2.2;
            if (c0z > -9.0 && c0z < 6.45 && c0y > 0.05 && ((c0x * c0x) / 19.5 + ((c0y - 0.35) * (c0y - 0.35)) / 22.5) < 1.0) {
              discard;
            }
            // Cave 1: (-186, -45), facingYaw = PI/2 (+X entrance), floorY = 2.25
            float c1x = -(vTerrainWorldPos.z - (-45.0));
            float c1z = vTerrainWorldPos.x - (-186.0);
            float c1y = vTerrainWorldPos.y - 2.25;
            if (c1z > -9.0 && c1z < 6.45 && c1y > 0.05 && ((c1x * c1x) / 19.5 + ((c1y - 0.35) * (c1y - 0.35)) / 22.5) < 1.0) {
              discard;
            }
            // Cave 2: (38, 294), facingYaw = PI (-Z entrance), floorY = 2.25 (unpopulated deep Southern Forest hill)
            float c2x = -(vTerrainWorldPos.x - 38.0);
            float c2z = -(vTerrainWorldPos.z - 294.0);
            float c2y = vTerrainWorldPos.y - 2.25;
            if (c2z > -9.0 && c2z < 6.45 && c2y > 0.05 && ((c2x * c2x) / 19.5 + ((c2y - 0.35) * (c2y - 0.35)) / 22.5) < 1.0) {
              discard;
            }
            // Colossal Volcano Sanctum: (-620, 115), 3 Cardinal Baffled Corridors (East +X, North -Z, South +Z), floorY = 3.2
            float vkx = vTerrainWorldPos.x - (${VOLCANO_SANCTUM_POS.x.toFixed(1)});
            float vkz = vTerrainWorldPos.z - (${VOLCANO_SANCTUM_POS.z.toFixed(1)});
            float vky = vTerrainWorldPos.y - (${VOLCANO_SANCTUM_POS.floorY.toFixed(1)});
            if (vky > 0.06 && vky < 9.8) {
              float eastHalfW = (vkx > 44.5 && vkx < 69.5) ? 11.4 : 5.1;
              if (vkx > 26.0 && vkx < 96.5 && abs(vkz) < eastHalfW) {
                discard;
              }
              float northHalfW = (vkz < -44.5 && vkz > -69.5) ? 11.4 : 5.1;
              if (vkz < -26.0 && vkz > -96.5 && abs(vkx) < northHalfW) {
                discard;
              }
              float southHalfW = (vkz > 44.5 && vkz < 69.5) ? 11.4 : 5.1;
              if (vkz > 26.0 && vkz < 96.5 && abs(vkx) < southHalfW) {
                discard;
              }
            }
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
          // Animated glowing magma veins & lava fissures on the Colossal Western Volcano Sanctum cone & Badlands
          {
            vec2 volDelta = vTerrainWorldPos.xz - vec2(${VOLCANO_SANCTUM_POS.x.toFixed(1)}, ${VOLCANO_SANCTUM_POS.z.toFixed(1)});
            float volR = length(volDelta);
            if (volR < 240.0) {
              float volAng = atan(volDelta.y, volDelta.x);
              float veinWave = abs(sin(volAng * 9.0 + volR * 0.085 + sin(volR * 0.18) * 0.7));
              float coneVeinMask = (1.0 - smoothstep(0.0, 0.19, veinWave))
                * smoothstep(${(VOLCANO_SANCTUM_POS.floorY + 6.0).toFixed(1)}, ${(VOLCANO_SANCTUM_POS.floorY + 20.0).toFixed(1)}, vTerrainWorldPos.y)
                * (1.0 - smoothstep(${(VOLCANO_SANCTUM_POS.outerRadius - 12.0).toFixed(1)}, ${(VOLCANO_SANCTUM_POS.outerRadius - 2.0).toFixed(1)}, volR));
              float badlandsCrackWave = abs(sin(volAng * 6.0 + volR * 0.055 + cos(volR * 0.12) * 0.5));
              float badlandsFissure = (1.0 - smoothstep(0.0, 0.085, badlandsCrackWave))
                * smoothstep(102.0, 118.0, volR)
                * (1.0 - smoothstep(190.0, 235.0, volR));
              float craterGlow = (1.0 - smoothstep(24.0, 36.5, volR)) * smoothstep(42.0, 58.0, vTerrainWorldPos.y);
              float lavaPulse = 0.78 + 0.22 * sin(uTime * 3.4 - volR * 0.28);
              float totalLava = clamp(max(max(coneVeinMask * 0.92, badlandsFissure * 0.75), craterGlow), 0.0, 1.0) * lavaPulse;
              vec3 moltenColor = mix(vec3(0.95, 0.22, 0.02), vec3(1.0, 0.68, 0.12), totalLava);
              diffuseColor.rgb = mix(diffuseColor.rgb, moltenColor, totalLava * 0.88);
            }
          }
          `
        )
        .replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          {
            vec2 volDeltaE = vTerrainWorldPos.xz - vec2(${VOLCANO_SANCTUM_POS.x.toFixed(1)}, ${VOLCANO_SANCTUM_POS.z.toFixed(1)});
            float volRE = length(volDeltaE);
            if (volRE < 240.0) {
              float volAngE = atan(volDeltaE.y, volDeltaE.x);
              float veinWaveE = abs(sin(volAngE * 9.0 + volRE * 0.085 + sin(volRE * 0.18) * 0.7));
              float coneVeinMaskE = (1.0 - smoothstep(0.0, 0.18, veinWaveE))
                * smoothstep(${(VOLCANO_SANCTUM_POS.floorY + 6.5).toFixed(1)}, ${(VOLCANO_SANCTUM_POS.floorY + 21.0).toFixed(1)}, vTerrainWorldPos.y)
                * (1.0 - smoothstep(${(VOLCANO_SANCTUM_POS.outerRadius - 12.0).toFixed(1)}, ${(VOLCANO_SANCTUM_POS.outerRadius - 2.0).toFixed(1)}, volRE));
              float badlandsCrackWaveE = abs(sin(volAngE * 6.0 + volRE * 0.055 + cos(volRE * 0.12) * 0.5));
              float badlandsFissureE = (1.0 - smoothstep(0.0, 0.08, badlandsCrackWaveE))
                * smoothstep(102.0, 118.0, volRE)
                * (1.0 - smoothstep(190.0, 235.0, volRE));
              float craterGlowE = (1.0 - smoothstep(24.5, 36.0, volRE)) * smoothstep(42.0, 58.0, vTerrainWorldPos.y);
              float lavaPulseE = 0.8 + 0.2 * sin(uTime * 3.4 - volRE * 0.28);
              float lavaStrength = max(max(coneVeinMaskE, badlandsFissureE * 0.7), craterGlowE) * lavaPulseE;
              totalEmissiveRadiance += vec3(1.35, 0.36, 0.04) * lavaStrength;
            }
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
  const cVolcanoBasalt = new THREE.Color(0x1d1716);
  const cVolcanoAsh = new THREE.Color(0x382e2b);
  const cVolcanoMagma = new THREE.Color(0xf24c13);
  const tmpColor = new THREE.Color();
  const tmpDesertColor = new THREE.Color();

  const chunkSize = 220;
  const chunkSegs = isSoftwareGl ? 38 : 54;
  const gridRadius = 4;

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
          const forestDensity = regionalForestDensityAt(wx, wz);
          if (bf > 0.05) {
            tmpColor.lerp(cBirchFloor, bf * 0.72);
          } else if (forestDensity > 0.35 && swDesert < 0.25) {
            const forestFloorWeight = smoothstepLocal(0.35, 0.85, forestDensity) * 0.68 * (1.0 - swDesert * 4.0);
            tmpColor.lerp(cForest, forestFloorWeight);
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

        // Blend scorched volcanic ashlands across the Western Volcanic Badlands and dark basalt on the Volcano cone
        const volBadlands = volcanicBadlandsFactorAt(wx, wz);
        if (volBadlands > 0.02) {
          tmpColor.lerp(cVolcanoAsh, Math.min(0.94, volBadlands * 0.92));
        }
        const volDist = Math.hypot(wx - VOLCANO_SANCTUM_POS.x, wz - VOLCANO_SANCTUM_POS.z);
        if (volDist < VOLCANO_SANCTUM_POS.outerRadius + 12.0) {
          const volMix = smoothstepLocal(VOLCANO_SANCTUM_POS.outerRadius + 12.0, VOLCANO_SANCTUM_POS.outerRadius - 6.0, volDist);
          tmpColor.lerp(cVolcanoBasalt, volMix * 0.96);
          if (volDist < 24.5 && y > 26.0) {
            const magmaGlow = smoothstepLocal(24.5, 16.5, volDist) * (0.5 + 0.5 * macroNoise);
            tmpColor.lerp(cVolcanoMagma, magmaGlow * 0.9);
          }
        }

        colors[i * 3] = tmpColor.r;
        colors[i * 3 + 1] = tmpColor.g;
        colors[i * 3 + 2] = tmpColor.b;
      }

      chunkGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      chunkGeo.computeVertexNormals();
      chunkGeo.computeBoundingSphere();

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
  waterGeo.computeBoundingSphere();
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
  distanceCulledObjects.push({
    obj: waterMesh,
    cx: 0,
    cz: 0,
    radius: 300,
  });

  // Southern River, Crocodile Lagoon & Mountain Gorge Pass water surface (flowing from Sea at z=330 through Gorge down to z=805)
  const southRiverWaterSegs = isSoftwareGl ? 44 : 78;
  const southRiverWaterGeo = new THREE.PlaneGeometry(290, 520, southRiverWaterSegs, southRiverWaterSegs);
  southRiverWaterGeo.rotateX(-Math.PI / 2);
  southRiverWaterGeo.computeBoundingSphere();
  disposableGeometries.push(southRiverWaterGeo);

  const southRiverWaterMesh = new THREE.Mesh(southRiverWaterGeo, waterMat);
  southRiverWaterMesh.position.set(172, WATER_LEVEL, 565);
  southRiverWaterMesh.receiveShadow = !isSoftwareGl;
  scene.add(southRiverWaterMesh);
  distanceCulledObjects.push({
    obj: southRiverWaterMesh,
    cx: 172,
    cz: 565,
    radius: 340,
  });

  return { waterMaterial: waterMat, terrainMaterial: terrainMat };
}
// #endregion
