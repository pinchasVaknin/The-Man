import * as THREE from 'three';
import {
  WATER_LEVEL,
  VIEW_DISTANCE,
  HUNTER_LODGE_POS,
  WATERFALL_CLIFF_POS,
  WATERFALL_POOL_POS,
  RIVERSIDE_WINDMILLS,
  FORTRESS_Z_OFFSET,
  FORTRESS_Y_OFFSET,
  SAKURA_SANCTUARY_POS,
  SAKURA_SANCTUARY_YAW,
  LAKESIDE_TEA_PAVILION_POS,
  VALLEY_FARMS,
  HILL_WATCHTOWERS,
  ROPE_BRIDGE_DEF,
  ropeBridgePointInfoAt,
  SOUTHERN_MINE_POS,
  DWARVEN_GUARDIAN_STATUES,
  DWARVEN_STONE_HOUSES,
  DWARVEN_MINERS_COUNT,
  computeDwarvenMinerCaravanState,
  SOUTHEAST_HARBOR_POS,
  SOUTHWEST_OASIS_POS,
  MAGIC_STONE_CIRCLE_POS,
  CHINESE_FORTRESS_POS,
  CORNER_WATCHTOWERS,
  FORTRESS_DOORS,
  RIDEABLE_HORSES,
  ARCHERY_TARGETS,
  ArrowProjectile,
  ArrowElementKind,
  PlayerState,
  PLAYER_EYE_HEIGHT,
  RideableHorseState,
  ObstacleCylinder,
  WeatherStateSnapshot,
  ARROW_TRAIL_MAX_AGE,
  groundHeightAt,
  walkableHeightAt,
  getRoofHeightAt,
  chineseFortressStairHeightAt,
  trailFactorAt,
  getSurfaceNormalAt,
  birchGroveFactorAt,
  southwestOasisBiomeFactorAt,
  northernSnowZoneFactorAt,
  isWithinViewDistance,
  fbm2D,
  hash2D,
  computeHorseBiomechanicalPose,
} from './terrainMath';
import { WorldTextureSet } from './proceduralTextures';
import {
  attachFlagHorizontalWaveShader,
  attachWindSwayShader,
  createBirchBarkTexture,
  perturbGeometryVertices,
} from './builders/shaderAndMaterialBuilders';
import { buildDwarvenKingdomAndMiners } from './builders/dwarvenKingdomBuilder';
import { buildPlayerAndCombatSystems } from './builders/playerAndCombatBuilder';
import { buildWildlifeAndFootprintsLayer } from './builders/wildlifeAndFootprintsBuilder';

export interface AnimatedWorldHandles {
  waterMaterial: THREE.MeshPhysicalMaterial;
  swayMaterials: THREE.MeshStandardMaterial[];
  rowboatGroup: THREE.Group;
  birdsGroup: THREE.Group;
  pollenPoints: THREE.Points;
  starsMaterial: THREE.PointsMaterial;
  lanternLights: THREE.PointLight[];
  cloudMesh: THREE.Mesh;
  mistMaterials: THREE.MeshBasicMaterial[];
  playerCharacterGroup: THREE.Group;
  update: (
    elapsedTime: number,
    playerX: number,
    playerZ: number,
    morningMistOpacity: number,
    nightFactor?: number,
    weather?: WeatherStateSnapshot,
    openDoorIds?: ReadonlySet<string>,
    rideableHorses?: readonly RideableHorseState[],
    mountedHorseId?: string | null,
    playerState?: PlayerState,
    activeArrows?: readonly ArrowProjectile[],
    worldHours?: number,
    wildlifeSoundCallbacks?: {
      onBirdFlockStartled?: (distance: number, count: number) => void;
      onCritterScampered?: (distance: number, species: 'rabbit' | 'squirrel') => void;
      onAmbientWildlifeProximity?: (nearestBirdDist: number, nearestCritterDist: number) => void;
    }
  ) => void;
  dispose: () => void;
}

export function buildRealisticWorld(
  scene: THREE.Scene,
  textures: WorldTextureSet,
  obstacles: ObstacleCylinder[],
  isSoftwareGl: boolean
): AnimatedWorldHandles {
  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];
  const swayMaterials: THREE.MeshStandardMaterial[] = [];
  const animatedWaterMaterials: THREE.MeshPhysicalMaterial[] = [];
  const lanternLights: THREE.PointLight[] = [];
  const mistMaterials: THREE.MeshBasicMaterial[] = [];
  const distanceCulledObjects: { obj: THREE.Object3D; cx: number; cz: number; radius: number }[] = [];

  const attachAnimatedWaterWaveShader = (
    mat: THREE.MeshPhysicalMaterial,
    waveHeight = 0.045,
    rippleStrength = 0.085
  ) => {
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
    animatedWaterMaterials.push(mat);
  };

  textures.terrainAlbedo.repeat.set(28, 28);
  textures.terrainBump.repeat.set(28, 28);

  const birchBarkTex = createBirchBarkTexture();

  // ============================================================================
  // 1. SPATIALLY CHUNKED TERRAIN MESH (7x7 Grid of 220m Chunks = 1,540m x 1,540m)
  // ============================================================================
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

  function smoothstepLocal(edge0: number, edge1: number, val: number): number {
    const t = Math.max(0, Math.min(1, (val - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // ============================================================================
  // 2. REALISTIC ANIMATED WATER SURFACE (MOVING WAVES & SURFACE RIPPLES)
  // ============================================================================
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
  attachAnimatedWaterWaveShader(waterMat, 0.048, 0.085);
  disposableMaterials.push(waterMat);

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, WATER_LEVEL, 0);
  waterMesh.receiveShadow = !isSoftwareGl;
  scene.add(waterMesh);

  // ============================================================================
  // 3. TALL REALISTIC FOREST TREES (TALL EXPOSED TRUNKS + OVERHEAD CANOPY SHADE)
  //    + SILVER BIRCH, DESERT DATE PALMS ('palm') & SAVANNA UMBRELLA ACACIAS ('acacia')
  // ============================================================================
  const pines = obstacles.filter((o) => o.kind === 'pine');
  const oaks = obstacles.filter((o) => o.kind === 'oak');
  const birches = obstacles.filter((o) => o.kind === 'birch');
  const palms = obstacles.filter((o) => o.kind === 'palm');
  const acacias = obstacles.filter((o) => o.kind === 'acacia');
  const boulders = obstacles.filter((o) => o.kind === 'boulder');

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.barkAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.07,
    roughness: 0.88,
    metalness: 0.03,
  });
  const birchBarkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: birchBarkTex,
    bumpMap: textures.barkBump,
    bumpScale: 0.04,
    roughness: 0.78,
    metalness: 0.02,
  });
  const pineNeedleMat1 = new THREE.MeshStandardMaterial({
    color: 0x295423,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.58,
    metalness: 0.02,
  });
  const pineNeedleMat2 = new THREE.MeshStandardMaterial({
    color: 0x33662b,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.48,
    metalness: 0.02,
  });
  const oakLeafMat1 = new THREE.MeshStandardMaterial({
    color: 0x3d6b28,
    bumpMap: textures.foliageBump,
    bumpScale: 0.06,
    roughness: 0.62,
    metalness: 0.02,
  });
  const oakLeafMat2 = new THREE.MeshStandardMaterial({
    color: 0x4f7f33,
    bumpMap: textures.foliageBump,
    bumpScale: 0.06,
    roughness: 0.46,
    metalness: 0.02,
  });
  // New Birch & Autumn-Gold / Copper Canopy Materials
  const birchLeafMat1 = new THREE.MeshStandardMaterial({
    color: 0xd98a2b,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.54,
    metalness: 0.02,
  });
  const birchLeafMat2 = new THREE.MeshStandardMaterial({
    color: 0xe8a838,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.48,
    metalness: 0.02,
  });

  attachWindSwayShader(pineNeedleMat1, 0.011, 1.35, swayMaterials);
  attachWindSwayShader(pineNeedleMat2, 0.014, 1.45, swayMaterials);
  attachWindSwayShader(oakLeafMat1, 0.012, 1.2, swayMaterials);
  attachWindSwayShader(oakLeafMat2, 0.015, 1.3, swayMaterials);
  attachWindSwayShader(birchLeafMat1, 0.014, 1.4, swayMaterials);
  attachWindSwayShader(birchLeafMat2, 0.017, 1.5, swayMaterials);

  disposableMaterials.push(
    barkMat,
    birchBarkMat,
    pineNeedleMat1,
    pineNeedleMat2,
    oakLeafMat1,
    oakLeafMat2,
    birchLeafMat1,
    birchLeafMat2
  );

  // Broad canopy shade disc on the forest floor beneath every tall tree
  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  disposableMaterials.push(contactShadowMat);

  const shadowDiscGeo = new THREE.PlaneGeometry(5.8, 5.8);
  shadowDiscGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(shadowDiscGeo);

  // --- A. TALL FOREST PINE GEOMETRIES (Tall 12.5m Trunk + High Overhead Canopy y=6.2m..15.5m) ---
  const pineRootGeo = new THREE.CylinderGeometry(0.32, 0.54, 1.4, 8);
  pineRootGeo.translate(0, 0.7, 0);
  // Tall exposed trunk so walking in the forest shows a cathedral of tall trunks at eye level!
  const pineTrunkGeo = new THREE.CylinderGeometry(0.12, 0.34, 11.6, 9);
  pineTrunkGeo.translate(0, 6.8, 0);
  const pineTier1Geo = new THREE.ConeGeometry(2.85, 3.2, 9);
  perturbGeometryVertices(pineTier1Geo, 0.14, 1.5);
  pineTier1Geo.translate(0, 7.6, 0);
  const pineTier2Geo = new THREE.ConeGeometry(2.35, 3.0, 9);
  perturbGeometryVertices(pineTier2Geo, 0.14, 1.8);
  pineTier2Geo.translate(0, 9.7, 0);
  const pineTier3Geo = new THREE.ConeGeometry(1.75, 2.7, 8);
  perturbGeometryVertices(pineTier3Geo, 0.12, 2.1);
  pineTier3Geo.translate(0, 11.7, 0);
  const pineCrownGeo = new THREE.ConeGeometry(1.15, 2.4, 8);
  perturbGeometryVertices(pineCrownGeo, 0.1, 2.4);
  pineCrownGeo.translate(0, 13.6, 0);

  disposableGeometries.push(
    pineRootGeo,
    pineTrunkGeo,
    pineTier1Geo,
    pineTier2Geo,
    pineTier3Geo,
    pineCrownGeo
  );

  const maxPineInstances = Math.max(1, pines.length);
  const mRoot = new THREE.InstancedMesh(pineRootGeo, barkMat, maxPineInstances);
  const mTrunk = new THREE.InstancedMesh(pineTrunkGeo, barkMat, maxPineInstances);
  const mTier1 = new THREE.InstancedMesh(pineTier1Geo, pineNeedleMat1, maxPineInstances);
  const mTier2 = new THREE.InstancedMesh(pineTier2Geo, pineNeedleMat2, maxPineInstances);
  const mTier3 = new THREE.InstancedMesh(pineTier3Geo, pineNeedleMat1, maxPineInstances);
  const mCrown = new THREE.InstancedMesh(pineCrownGeo, pineNeedleMat2, maxPineInstances);
  const mShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxPineInstances);

  for (const im of [mRoot, mTrunk, mTier1, mTier2, mTier3, mCrown, mShadow]) {
    im.frustumCulled = false;
    if (im !== mShadow) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  // --- B. TALL MATURE OAK GEOMETRIES (Tall 7.2m Trunk + High Spreading Boughs & Canopy y=6.5m..13.5m) ---
  const oakBaseGeo = new THREE.CylinderGeometry(0.38, 0.66, 1.6, 8);
  oakBaseGeo.translate(0, 0.8, 0);
  const oakTrunkGeo = new THREE.CylinderGeometry(0.26, 0.42, 6.2, 8);
  oakTrunkGeo.translate(0, 4.4, 0);
  const oakLobe1Geo = new THREE.IcosahedronGeometry(2.45, 2);
  perturbGeometryVertices(oakLobe1Geo, 0.18, 1.2);
  oakLobe1Geo.scale(1.2, 0.78, 1.15);
  oakLobe1Geo.translate(-1.1, 7.8, 0.5);
  const oakLobe2Geo = new THREE.IcosahedronGeometry(2.35, 2);
  perturbGeometryVertices(oakLobe2Geo, 0.18, 1.4);
  oakLobe2Geo.scale(1.15, 0.82, 1.2);
  oakLobe2Geo.translate(1.15, 8.1, -0.55);
  const oakCrownGeo = new THREE.IcosahedronGeometry(2.75, 2);
  perturbGeometryVertices(oakCrownGeo, 0.16, 1.1);
  oakCrownGeo.scale(1.25, 0.88, 1.25);
  oakCrownGeo.translate(0, 9.6, 0);

  disposableGeometries.push(oakBaseGeo, oakTrunkGeo, oakLobe1Geo, oakLobe2Geo, oakCrownGeo);

  const maxOakInstances = Math.max(1, oaks.length);
  const oBase = new THREE.InstancedMesh(oakBaseGeo, barkMat, maxOakInstances);
  const oTrunk = new THREE.InstancedMesh(oakTrunkGeo, barkMat, maxOakInstances);
  const oLobe1 = new THREE.InstancedMesh(oakLobe1Geo, oakLeafMat1, maxOakInstances);
  const oLobe2 = new THREE.InstancedMesh(oakLobe2Geo, oakLeafMat2, maxOakInstances);
  const oCrown = new THREE.InstancedMesh(oakCrownGeo, oakLeafMat2, maxOakInstances);
  const oShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxOakInstances);

  for (const im of [oBase, oTrunk, oLobe1, oLobe2, oCrown, oShadow]) {
    im.frustumCulled = false;
    if (im !== oShadow) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  // --- C. NEW SPECIES: TALL SILVER BIRCH & GOLDEN-MAPLE GROVE TREES ---
  const birchBaseGeo = new THREE.CylinderGeometry(0.24, 0.42, 1.4, 8);
  birchBaseGeo.translate(0, 0.7, 0);
  const birchTrunkGeo = new THREE.CylinderGeometry(0.14, 0.26, 8.4, 8);
  birchTrunkGeo.translate(0, 5.2, 0);
  const birchBranchGeo = new THREE.CylinderGeometry(0.06, 0.12, 3.4, 6);
  birchBranchGeo.rotateZ(0.48);
  birchBranchGeo.translate(-0.75, 6.8, 0);
  const birchCanopy1Geo = new THREE.IcosahedronGeometry(2.1, 2);
  perturbGeometryVertices(birchCanopy1Geo, 0.16, 1.3);
  birchCanopy1Geo.scale(1.15, 0.85, 1.15);
  birchCanopy1Geo.translate(-0.85, 8.6, 0.35);
  const birchCanopy2Geo = new THREE.IcosahedronGeometry(2.35, 2);
  perturbGeometryVertices(birchCanopy2Geo, 0.15, 1.2);
  birchCanopy2Geo.scale(1.2, 0.92, 1.2);
  birchCanopy2Geo.translate(0.55, 10.2, -0.25);

  disposableGeometries.push(
    birchBaseGeo,
    birchTrunkGeo,
    birchBranchGeo,
    birchCanopy1Geo,
    birchCanopy2Geo
  );

  const maxBirchInstances = Math.max(1, birches.length);
  const brBase = new THREE.InstancedMesh(birchBaseGeo, birchBarkMat, maxBirchInstances);
  const brTrunk = new THREE.InstancedMesh(birchTrunkGeo, birchBarkMat, maxBirchInstances);
  const brBranch = new THREE.InstancedMesh(birchBranchGeo, birchBarkMat, maxBirchInstances);
  const brCanopy1 = new THREE.InstancedMesh(birchCanopy1Geo, birchLeafMat1, maxBirchInstances);
  const brCanopy2 = new THREE.InstancedMesh(birchCanopy2Geo, birchLeafMat2, maxBirchInstances);
  const brShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxBirchInstances);

  for (const im of [brBase, brTrunk, brBranch, brCanopy1, brCanopy2, brShadow]) {
    im.frustumCulled = false;
    if (im !== brShadow) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  // --- D. BOULDER 3-PART GEOMETRIES ---
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.09,
    roughness: 0.65,
    metalness: 0.06,
  });
  const mossCapMat = new THREE.MeshStandardMaterial({
    color: 0x4a7531,
    bumpMap: textures.terrainBump,
    bumpScale: 0.07,
    roughness: 0.92,
    metalness: 0.01,
  });
  disposableMaterials.push(rockMat, mossCapMat);

  const boulderMainGeo = new THREE.DodecahedronGeometry(0.95, 1);
  perturbGeometryVertices(boulderMainGeo, 0.22, 1.6);
  boulderMainGeo.scale(1.15, 0.78, 1.05);
  boulderMainGeo.translate(0, 0.45, 0);

  const boulderSideGeo = new THREE.DodecahedronGeometry(0.62, 1);
  perturbGeometryVertices(boulderSideGeo, 0.2, 2.0);
  boulderSideGeo.scale(1.1, 0.7, 0.95);
  boulderSideGeo.translate(0.55, 0.28, 0.25);

  const boulderMossGeo = new THREE.SphereGeometry(0.76, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45);
  perturbGeometryVertices(boulderMossGeo, 0.12, 2.5);
  boulderMossGeo.scale(1.12, 0.65, 1.0);
  boulderMossGeo.translate(0, 0.52, 0);

  disposableGeometries.push(boulderMainGeo, boulderSideGeo, boulderMossGeo);

  const maxBoulderInstances = Math.max(1, boulders.length);
  const bMain = new THREE.InstancedMesh(boulderMainGeo, rockMat, maxBoulderInstances);
  const bSide = new THREE.InstancedMesh(boulderSideGeo, rockMat, maxBoulderInstances);
  const bMoss = new THREE.InstancedMesh(boulderMossGeo, mossCapMat, maxBoulderInstances);
  const bShadow = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxBoulderInstances);

  for (const im of [bMain, bSide, bMoss, bShadow]) {
    im.frustumCulled = false;
    if (im !== bShadow) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  const pineHeights = pines.map((p) => groundHeightAt(p.x, p.z));
  const oakHeights = oaks.map((o) => groundHeightAt(o.x, o.z));
  const birchHeights = birches.map((b) => groundHeightAt(b.x, b.z));
  const boulderHeights = boulders.map((b) => groundHeightAt(b.x, b.z));

  const _cullDummy = new THREE.Object3D();
  const _cullTint = new THREE.Color();

  // Populate all tree & boulder InstancedMeshes ONCE at startup so walking into new regions never triggers GPU buffer re-uploads!
  // 1. Pines
  for (let i = 0; i < pines.length; i++) {
    const p = pines[i];
    const gy = pineHeights[i];
    _cullDummy.position.set(p.x, gy - 0.1, p.z);
    _cullDummy.rotation.set((p.seed - 0.5) * 0.05, p.seed * Math.PI * 2, (p.seed - 0.5) * 0.05);
    _cullDummy.scale.setScalar(p.scale);
    _cullDummy.updateMatrix();

    mRoot.setMatrixAt(i, _cullDummy.matrix);
    mTrunk.setMatrixAt(i, _cullDummy.matrix);
    mTier1.setMatrixAt(i, _cullDummy.matrix);
    mTier2.setMatrixAt(i, _cullDummy.matrix);
    mTier3.setMatrixAt(i, _cullDummy.matrix);
    mCrown.setMatrixAt(i, _cullDummy.matrix);

    _cullTint.setHSL(
      0.28 + (p.seed - 0.5) * 0.05,
      0.44 + (p.seed - 0.5) * 0.1,
      0.42 + (p.seed - 0.5) * 0.1
    );
    mTier1.setColorAt(i, _cullTint);
    mTier2.setColorAt(i, _cullTint);
    mTier3.setColorAt(i, _cullTint);
    mCrown.setColorAt(i, _cullTint);

    _cullDummy.position.set(p.x, gy + 0.03, p.z);
    _cullDummy.rotation.set(0, 0, 0);
    _cullDummy.scale.setScalar(p.scale * 1.35);
    _cullDummy.updateMatrix();
    mShadow.setMatrixAt(i, _cullDummy.matrix);
  }
  for (const im of [mRoot, mTrunk, mTier1, mTier2, mTier3, mCrown, mShadow]) {
    im.count = pines.length;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
  }

  // 2. Oaks
  for (let i = 0; i < oaks.length; i++) {
    const o = oaks[i];
    const gy = oakHeights[i];
    _cullDummy.position.set(o.x, gy - 0.1, o.z);
    _cullDummy.rotation.set(0, o.seed * Math.PI * 2, 0);
    _cullDummy.scale.setScalar(o.scale);
    _cullDummy.updateMatrix();

    oBase.setMatrixAt(i, _cullDummy.matrix);
    oTrunk.setMatrixAt(i, _cullDummy.matrix);
    oLobe1.setMatrixAt(i, _cullDummy.matrix);
    oLobe2.setMatrixAt(i, _cullDummy.matrix);
    oCrown.setMatrixAt(i, _cullDummy.matrix);

    _cullTint.setHSL(0.24 + (o.seed - 0.5) * 0.08, 0.48, 0.44 + (o.seed - 0.5) * 0.12);
    oLobe1.setColorAt(i, _cullTint);
    oLobe2.setColorAt(i, _cullTint);
    oCrown.setColorAt(i, _cullTint);

    _cullDummy.position.set(o.x, gy + 0.03, o.z);
    _cullDummy.rotation.set(0, 0, 0);
    _cullDummy.scale.setScalar(o.scale * 1.55);
    _cullDummy.updateMatrix();
    oShadow.setMatrixAt(i, _cullDummy.matrix);
  }
  for (const im of [oBase, oTrunk, oLobe1, oLobe2, oCrown, oShadow]) {
    im.count = oaks.length;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
  }

  // 3. Silver Birches (in Birch & Squirrel Grove)
  for (let i = 0; i < birches.length; i++) {
    const br = birches[i];
    const gy = birchHeights[i];
    _cullDummy.position.set(br.x, gy - 0.1, br.z);
    _cullDummy.rotation.set(0, br.seed * Math.PI * 2, 0);
    _cullDummy.scale.setScalar(br.scale);
    _cullDummy.updateMatrix();

    brBase.setMatrixAt(i, _cullDummy.matrix);
    brTrunk.setMatrixAt(i, _cullDummy.matrix);
    brBranch.setMatrixAt(i, _cullDummy.matrix);
    brCanopy1.setMatrixAt(i, _cullDummy.matrix);
    brCanopy2.setMatrixAt(i, _cullDummy.matrix);

    _cullTint.setHSL(0.08 + br.seed * 0.11, 0.72, 0.48 + (br.seed - 0.5) * 0.1);
    brCanopy1.setColorAt(i, _cullTint);
    brCanopy2.setColorAt(i, _cullTint);

    _cullDummy.position.set(br.x, gy + 0.03, br.z);
    _cullDummy.rotation.set(0, 0, 0);
    _cullDummy.scale.setScalar(br.scale * 1.35);
    _cullDummy.updateMatrix();
    brShadow.setMatrixAt(i, _cullDummy.matrix);
  }
  for (const im of [brBase, brTrunk, brBranch, brCanopy1, brCanopy2, brShadow]) {
    im.count = birches.length;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
  }

  // 4. Boulders
  for (let i = 0; i < boulders.length; i++) {
    const b = boulders[i];
    const gy = boulderHeights[i];
    _cullDummy.position.set(b.x, gy - 0.08, b.z);
    _cullDummy.rotation.set(0, b.seed * Math.PI * 2, 0);
    _cullDummy.scale.setScalar(b.scale);
    _cullDummy.updateMatrix();

    bMain.setMatrixAt(i, _cullDummy.matrix);
    bSide.setMatrixAt(i, _cullDummy.matrix);
    bMoss.setMatrixAt(i, _cullDummy.matrix);

    _cullDummy.position.set(b.x, gy + 0.025, b.z);
    _cullDummy.rotation.set(0, 0, 0);
    _cullDummy.scale.setScalar(b.scale * 0.55);
    _cullDummy.updateMatrix();
    bShadow.setMatrixAt(i, _cullDummy.matrix);
  }
  for (const im of [bMain, bSide, bMoss, bShadow]) {
    im.count = boulders.length;
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
  }

  // --- E. SOUTH-WEST DESERT DATE PALMS ('palm') & SAVANNA UMBRELLA ACACIAS ('acacia') ---
  const palmCrownMat = new THREE.MeshStandardMaterial({
    color: 0x2e6f40,
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.56,
  });
  const acaciaCanopyMat = new THREE.MeshStandardMaterial({
    color: 0x6b7f32, // Sun-baked olive-gold savanna acacia foliage
    bumpMap: textures.foliageBump,
    bumpScale: 0.05,
    roughness: 0.62,
  });
  attachWindSwayShader(palmCrownMat, 0.022, 1.55, swayMaterials);
  attachWindSwayShader(acaciaCanopyMat, 0.015, 1.35, swayMaterials);
  disposableMaterials.push(palmCrownMat, acaciaCanopyMat);

  const instPalmTrunkGeo = new THREE.CylinderGeometry(0.18, 0.36, 9.2, 8);
  instPalmTrunkGeo.translate(0, 4.6, 0);
  const instPalmCrownGeo = new THREE.ConeGeometry(3.4, 2.2, 7);
  perturbGeometryVertices(instPalmCrownGeo, 0.22, 1.8);
  instPalmCrownGeo.scale(1.25, 0.55, 1.25);
  instPalmCrownGeo.translate(0, 9.1, 0);
  const instPalmLowerCrownGeo = new THREE.ConeGeometry(3.8, 1.8, 7);
  perturbGeometryVertices(instPalmLowerCrownGeo, 0.22, 2.1);
  instPalmLowerCrownGeo.scale(1.3, 0.45, 1.3);
  instPalmLowerCrownGeo.rotateY(0.45);
  instPalmLowerCrownGeo.translate(0, 8.4, 0);

  const instAcaciaTrunkGeo = new THREE.CylinderGeometry(0.22, 0.44, 6.4, 8);
  instAcaciaTrunkGeo.translate(0, 3.2, 0);
  const instAcaciaBranchLGeo = new THREE.CylinderGeometry(0.10, 0.18, 3.6, 6);
  instAcaciaBranchLGeo.rotateZ(0.62);
  instAcaciaBranchLGeo.translate(-1.1, 5.8, 0);
  const instAcaciaBranchRGeo = new THREE.CylinderGeometry(0.10, 0.18, 3.6, 6);
  instAcaciaBranchRGeo.rotateZ(-0.58);
  instAcaciaBranchRGeo.translate(1.1, 6.0, 0);
  // Characteristic wide, flat-topped savanna umbrella canopy tiers
  const instAcaciaTier1Geo = new THREE.CylinderGeometry(4.2, 3.2, 1.1, 9);
  perturbGeometryVertices(instAcaciaTier1Geo, 0.16, 1.4);
  instAcaciaTier1Geo.translate(-0.8, 7.1, 0.2);
  const instAcaciaTier2Geo = new THREE.CylinderGeometry(4.6, 3.5, 1.15, 9);
  perturbGeometryVertices(instAcaciaTier2Geo, 0.16, 1.6);
  instAcaciaTier2Geo.translate(0.6, 7.8, -0.2);

  disposableGeometries.push(
    instPalmTrunkGeo,
    instPalmCrownGeo,
    instPalmLowerCrownGeo,
    instAcaciaTrunkGeo,
    instAcaciaBranchLGeo,
    instAcaciaBranchRGeo,
    instAcaciaTier1Geo,
    instAcaciaTier2Geo
  );

  const maxPalmInst = Math.max(1, palms.length);
  const pTrunkIM = new THREE.InstancedMesh(instPalmTrunkGeo, barkMat, maxPalmInst);
  const pCrown1IM = new THREE.InstancedMesh(instPalmCrownGeo, palmCrownMat, maxPalmInst);
  const pCrown2IM = new THREE.InstancedMesh(instPalmLowerCrownGeo, palmCrownMat, maxPalmInst);
  const pShadowIM = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxPalmInst);
  for (let i = 0; i < palms.length; i++) {
    const p = palms[i];
    const gy = groundHeightAt(p.x, p.z);
    _cullDummy.position.set(p.x, gy - 0.1, p.z);
    _cullDummy.rotation.set((p.seed - 0.5) * 0.12, p.seed * Math.PI * 2, (p.seed - 0.5) * 0.12);
    _cullDummy.scale.setScalar(p.scale);
    _cullDummy.updateMatrix();
    pTrunkIM.setMatrixAt(i, _cullDummy.matrix);
    pCrown1IM.setMatrixAt(i, _cullDummy.matrix);
    pCrown2IM.setMatrixAt(i, _cullDummy.matrix);

    _cullDummy.position.set(p.x, gy + 0.03, p.z);
    _cullDummy.rotation.set(0, 0, 0);
    _cullDummy.scale.setScalar(p.scale * 1.25);
    _cullDummy.updateMatrix();
    pShadowIM.setMatrixAt(i, _cullDummy.matrix);
  }
  for (const im of [pTrunkIM, pCrown1IM, pCrown2IM, pShadowIM]) {
    im.count = palms.length;
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    if (im !== pShadowIM) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  const maxAcaciaInst = Math.max(1, acacias.length);
  const acTrunkIM = new THREE.InstancedMesh(instAcaciaTrunkGeo, barkMat, maxAcaciaInst);
  const acBrLIM = new THREE.InstancedMesh(instAcaciaBranchLGeo, barkMat, maxAcaciaInst);
  const acBrRIM = new THREE.InstancedMesh(instAcaciaBranchRGeo, barkMat, maxAcaciaInst);
  const acTier1IM = new THREE.InstancedMesh(instAcaciaTier1Geo, acaciaCanopyMat, maxAcaciaInst);
  const acTier2IM = new THREE.InstancedMesh(instAcaciaTier2Geo, acaciaCanopyMat, maxAcaciaInst);
  const acShadowIM = new THREE.InstancedMesh(shadowDiscGeo, contactShadowMat, maxAcaciaInst);
  for (let i = 0; i < acacias.length; i++) {
    const ac = acacias[i];
    const gy = groundHeightAt(ac.x, ac.z);
    _cullDummy.position.set(ac.x, gy - 0.1, ac.z);
    _cullDummy.rotation.set(0, ac.seed * Math.PI * 2, 0);
    _cullDummy.scale.setScalar(ac.scale);
    _cullDummy.updateMatrix();
    acTrunkIM.setMatrixAt(i, _cullDummy.matrix);
    acBrLIM.setMatrixAt(i, _cullDummy.matrix);
    acBrRIM.setMatrixAt(i, _cullDummy.matrix);
    acTier1IM.setMatrixAt(i, _cullDummy.matrix);
    acTier2IM.setMatrixAt(i, _cullDummy.matrix);

    _cullDummy.position.set(ac.x, gy + 0.03, ac.z);
    _cullDummy.rotation.set(0, 0, 0);
    _cullDummy.scale.setScalar(ac.scale * 1.55);
    _cullDummy.updateMatrix();
    acShadowIM.setMatrixAt(i, _cullDummy.matrix);
  }
  for (const im of [acTrunkIM, acBrLIM, acBrRIM, acTier1IM, acTier2IM, acShadowIM]) {
    im.count = acacias.length;
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    if (im !== acShadowIM) {
      im.castShadow = !isSoftwareGl;
      im.receiveShadow = !isSoftwareGl;
    }
    scene.add(im);
  }

  // ============================================================================
  // 4. ARCHITECTURAL LANDMARKS (ON 100% FLAT LEVELED TERRACES)
  // ============================================================================
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.timberAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.05,
    roughness: 0.76,
    metalness: 0.04,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x26292e,
    roughness: 0.35,
    metalness: 0.82,
  });
  const warmLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfff3cc,
    emissive: new THREE.Color(0xffaa33),
    emissiveIntensity: 2.6,
    roughness: 0.2,
  });
  const hayMat = new THREE.MeshStandardMaterial({
    color: 0xd9b24c,
    roughness: 0.9,
  });
  disposableMaterials.push(timberMat, darkIronMat, warmLanternMat, hayMat);

  function createLanternAssembly(x: number, y: number, z: number, _addLight: boolean): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.45, 8);
    postGeo.translate(0, 0.72, 0);
    const armGeo = new THREE.BoxGeometry(0.38, 0.06, 0.06);
    armGeo.translate(0.14, 1.42, 0);
    const cageGeo = new THREE.CylinderGeometry(0.13, 0.1, 0.28, 6);
    cageGeo.translate(0.28, 1.24, 0);
    const capGeo = new THREE.ConeGeometry(0.17, 0.12, 6);
    capGeo.translate(0.28, 1.41, 0);

    disposableGeometries.push(postGeo, armGeo, cageGeo, capGeo);

    g.add(new THREE.Mesh(postGeo, timberMat));
    g.add(new THREE.Mesh(armGeo, darkIronMat));
    g.add(new THREE.Mesh(cageGeo, warmLanternMat));
    g.add(new THREE.Mesh(capGeo, darkIronMat));
    return g;
  }

  // Interactive Door Pivot Registry for smooth opening/closing when player presses [E]
  interface DoorPivotHandle {
    id: string;
    leftPivot: THREE.Group;
    rightPivot: THREE.Group;
    currentAngle: number;
  }
  const doorPivotHandles: DoorPivotHandle[] = [];

  // Shared materials & geometries for Interior House Furniture (Tables, Chairs, Wardrobes, Beds/Sleeping Bags, Farmer Supplies)
  const furnitureWoodMat = new THREE.MeshStandardMaterial({
    color: 0x8a562d,
    map: textures.timberAlbedo,
    roughness: 0.68,
    metalness: 0.05,
  });
  const blanketClothMat = new THREE.MeshStandardMaterial({
    color: 0x992b24, // Warm quilted crimson-rust blanket / sleeping bag
    roughness: 0.85,
  });
  const pillowClothMat = new THREE.MeshStandardMaterial({
    color: 0xf3ede0,
    roughness: 0.82,
  });
  const burlapSackMat = new THREE.MeshStandardMaterial({
    color: 0xc29e63,
    roughness: 0.92,
  });
  disposableMaterials.push(furnitureWoodMat, blanketClothMat, pillowClothMat, burlapSackMat);

  const tableTopGeo = new THREE.BoxGeometry(2.1, 0.1, 1.25);
  const tableLegGeo = new THREE.BoxGeometry(0.1, 0.76, 0.1);
  const chairSeatGeo = new THREE.BoxGeometry(0.52, 0.07, 0.52);
  const chairLegGeo = new THREE.BoxGeometry(0.06, 0.45, 0.06);
  const chairBackGeo = new THREE.BoxGeometry(0.52, 0.52, 0.06);
  const wardrobeBodyGeo = new THREE.BoxGeometry(1.45, 2.25, 0.72);
  const wardrobeDoorSeamGeo = new THREE.BoxGeometry(0.04, 2.05, 0.75);
  const bedFrameGeo = new THREE.BoxGeometry(1.45, 0.34, 2.25);
  const bedHeadboardGeo = new THREE.BoxGeometry(1.45, 0.88, 0.12);
  const mattressGeo = new THREE.BoxGeometry(1.34, 0.2, 2.1);
  const pillowGeo = new THREE.BoxGeometry(0.88, 0.14, 0.42);
  const chestBodyGeo = new THREE.BoxGeometry(1.1, 0.58, 0.62);
  const grainSackGeo = new THREE.SphereGeometry(0.42, 8, 8);
  grainSackGeo.scale(1.0, 1.28, 0.85);
  const barrelGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.92, 10);
  const toolShaftGeo = new THREE.CylinderGeometry(0.025, 0.028, 1.85, 6);
  disposableGeometries.push(
    tableTopGeo,
    tableLegGeo,
    chairSeatGeo,
    chairLegGeo,
    chairBackGeo,
    wardrobeBodyGeo,
    wardrobeDoorSeamGeo,
    bedFrameGeo,
    bedHeadboardGeo,
    mattressGeo,
    pillowGeo,
    chestBodyGeo,
    grainSackGeo,
    barrelGeo,
    toolShaftGeo
  );

  type HouseInteriorKind = 'hunter' | 'farm_bakery' | 'farm_dairy' | 'farm_weaver';

  const breadLoafMat = new THREE.MeshStandardMaterial({
    color: 0xd98a2b,
    roughness: 0.72,
  });
  const cheeseWheelMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.58,
  });
  const brickOvenMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.88,
  });
  const furRugMat = new THREE.MeshStandardMaterial({
    color: 0x452715,
    roughness: 0.94,
  });
  disposableMaterials.push(breadLoafMat, cheeseWheelMat, brickOvenMat, furRugMat);

  /**
   * Builds a logical, role-specific interior furniture & workshop set for each cabin and farmhouse:
   * - 'hunter': Stone hearth fireplace with cauldron, fur rug, hunting bow/antler rack, map table & bed.
   * - 'farm_bakery': Brick bread oven with glowing embers, baker's counter with golden bread loaves & flour sacks.
   * - 'farm_dairy': Two-tier cheese aging rack with golden cheese wheels, butter churn, oak casks & dining table.
   * - 'farm_weaver': Timber weaving loom with colorful tapestry cloth, rolled silk/linen bolts & tea table.
   */
  function createInteriorFurnitureSet(interiorKind: HouseInteriorKind = 'hunter'): THREE.Group {
    const fGroup = new THREE.Group();

    // 1) Wooden Dining / Work Table + 2 Chairs (on the left side of the room at x = -2.35, z = -1.2)
    const tableGroup = new THREE.Group();
    tableGroup.position.set(-2.35, 0, -1.2);
    const tTop = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
    tTop.position.y = 0.78;
    tTop.castShadow = !isSoftwareGl;
    tableGroup.add(tTop);
    for (const [lx, lz] of [
      [-0.92, -0.5],
      [0.92, -0.5],
      [-0.92, 0.5],
      [0.92, 0.5],
    ]) {
      const leg = new THREE.Mesh(tableLegGeo, furnitureWoodMat);
      leg.position.set(lx, 0.38, lz);
      tableGroup.add(leg);
    }
    const tableLantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 0.24, 6),
      warmLanternMat
    );
    tableLantern.position.set(0.15, 0.95, 0);
    tableGroup.add(tableLantern);

    // Table-top role-specific accessories (Bread loaf / Cheese platter / Teapot / Hunter's map scroll)
    const platter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.24, 0.05, 10),
      interiorKind === 'farm_dairy' ? cheeseWheelMat : pillowClothMat
    );
    platter.position.set(-0.42, 0.86, 0.1);
    tableGroup.add(platter);
    if (interiorKind === 'farm_bakery') {
      const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), breadLoafMat);
      loaf.scale.set(1.4, 0.65, 0.85);
      loaf.position.set(-0.42, 0.93, 0.1);
      tableGroup.add(loaf);
    }

    // 2 Chairs facing the table
    for (const sideZ of [-0.92, 0.92]) {
      const chair = new THREE.Group();
      chair.position.set(0, 0, sideZ);
      if (sideZ > 0) chair.rotation.y = Math.PI;
      const seat = new THREE.Mesh(chairSeatGeo, furnitureWoodMat);
      seat.position.y = 0.45;
      const back = new THREE.Mesh(chairBackGeo, furnitureWoodMat);
      back.position.set(0, 0.74, -0.23);
      chair.add(seat, back);
      for (const [clx, clz] of [
        [-0.21, -0.21],
        [0.21, -0.21],
        [-0.21, 0.21],
        [0.21, 0.21],
      ]) {
        const cLeg = new THREE.Mesh(chairLegGeo, furnitureWoodMat);
        cLeg.position.set(clx, 0.225, clz);
        chair.add(cLeg);
      }
      tableGroup.add(chair);
    }
    fGroup.add(tableGroup);

    // 2) Tall Wooden Wardrobe / Storage Cabinet against the back-left wall (x = -3.2, z = -3.05)
    const wardrobe = new THREE.Group();
    wardrobe.position.set(-3.2, 0, -3.05);
    const wBody = new THREE.Mesh(wardrobeBodyGeo, furnitureWoodMat);
    wBody.position.y = 1.125;
    wBody.castShadow = !isSoftwareGl;
    const wSeam = new THREE.Mesh(wardrobeDoorSeamGeo, darkIronMat);
    wSeam.position.y = 1.125;
    wardrobe.add(wBody, wSeam);
    fGroup.add(wardrobe);

    // 3) Cozy Wooden Bed & Quilted Sleeping Bag with Pillow against the right wall (x = +3.15, z = -2.15)
    const bedGroup = new THREE.Group();
    bedGroup.position.set(3.15, 0, -2.15);
    const bFrame = new THREE.Mesh(bedFrameGeo, furnitureWoodMat);
    bFrame.position.y = 0.17;
    const bHead = new THREE.Mesh(bedHeadboardGeo, furnitureWoodMat);
    bHead.position.set(0, 0.44, -1.08);
    const bMattress = new THREE.Mesh(mattressGeo, blanketClothMat);
    bMattress.position.set(0, 0.38, 0.04);
    const bPillow = new THREE.Mesh(pillowGeo, pillowClothMat);
    bPillow.position.set(0, 0.5, -0.74);
    bedGroup.add(bFrame, bHead, bMattress, bPillow);
    fGroup.add(bedGroup);

    // 4) Wooden Storage Chest at the foot of the bed (x = +3.15, z = -0.55)
    const chest = new THREE.Mesh(chestBodyGeo, furnitureWoodMat);
    chest.position.set(3.15, 0.29, -0.55);
    fGroup.add(chest);

    // 5) Role-Specific Logical Craft & Livelihood Accessories along the Back Wall (z = -3.0..-3.25) & Center Floor!
    if (interiorKind === 'hunter') {
      // Stone Hearth Fireplace with glowing embers, iron cauldron & center bearskin fur rug
      const hearthBase = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.45, 0.82), rockMat);
      hearthBase.position.set(0.15, 0.72, -3.12);
      const hearthFlue = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.65, 0.58), rockMat);
      hearthFlue.position.set(0.15, 2.15, -3.18);
      const fireGlow = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), warmLanternMat);
      fireGlow.scale.set(1.3, 0.65, 0.75);
      fireGlow.position.set(0.15, 0.35, -2.85);
      const cauldron = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), darkIronMat);
      cauldron.position.set(0.15, 0.68, -2.82);
      const furRug = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.28, 0.04, 12), furRugMat);
      furRug.scale.set(1.25, 1.0, 0.88);
      furRug.position.set(0.1, 0.02, -1.05);
      const weaponRack = new THREE.Mesh(toolShaftGeo, timberMat);
      weaponRack.position.set(1.55, 0.92, -3.18);
      weaponRack.rotation.z = -0.22;
      fGroup.add(hearthBase, hearthFlue, fireGlow, cauldron, furRug, weaponRack);
    } else if (interiorKind === 'farm_bakery') {
      // Brick Bread Oven + Baker's Counter with golden bread loaves & flour sacks
      const ovenBase = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.1, 1.05), brickOvenMat);
      ovenBase.position.set(0.55, 0.55, -3.05);
      const ovenDome = new THREE.Mesh(new THREE.SphereGeometry(0.76, 10, 8), brickOvenMat);
      ovenDome.scale.set(1.05, 0.75, 0.9);
      ovenDome.position.set(0.55, 1.15, -3.05);
      const ovenEmbers = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.18), warmLanternMat);
      ovenEmbers.position.set(0.55, 1.12, -2.42);
      fGroup.add(ovenBase, ovenDome, ovenEmbers);
      for (const lx of [-1.15, -0.68, -0.22]) {
        const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), breadLoafMat);
        loaf.scale.set(1.35, 0.65, 0.85);
        loaf.position.set(lx, 0.88, -3.12);
        fGroup.add(loaf);
      }
      const bakerCounter = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.78, 0.65), furnitureWoodMat);
      bakerCounter.position.set(-0.68, 0.39, -3.12);
      const flourSack1 = new THREE.Mesh(grainSackGeo, pillowClothMat);
      flourSack1.position.set(1.75, 0.42, -3.12);
      const flourSack2 = new THREE.Mesh(grainSackGeo, burlapSackMat);
      flourSack2.position.set(1.55, 0.92, -3.15);
      fGroup.add(bakerCounter, flourSack1, flourSack2);
    } else if (interiorKind === 'farm_dairy') {
      // Cheese Aging Shelves + Golden Cheese Wheels + Wooden Butter Churn & Oak Cask
      const rackPostL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.75, 0.58), furnitureWoodMat);
      rackPostL.position.set(-0.95, 0.88, -3.12);
      const rackPostR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.75, 0.58), furnitureWoodMat);
      rackPostR.position.set(0.95, 0.88, -3.12);
      fGroup.add(rackPostL, rackPostR);
      for (const sy of [0.55, 1.15, 1.68]) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.56), furnitureWoodMat);
        shelf.position.set(0, sy, -3.12);
        fGroup.add(shelf);
        for (const cx of [-0.55, 0.0, 0.55]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10), cheeseWheelMat);
          wheel.position.set(cx, sy + 0.12, -3.12);
          fGroup.add(wheel);
        }
      }
      const butterChurn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.78, 8), timberMat);
      butterChurn.position.set(1.45, 0.39, -3.05);
      const churnRod = new THREE.Mesh(toolShaftGeo, furnitureWoodMat);
      churnRod.scale.y = 0.72;
      churnRod.position.set(1.45, 0.75, -3.05);
      const cask = new THREE.Mesh(barrelGeo, barkMat);
      cask.position.set(-1.55, 0.46, -3.12);
      fGroup.add(butterChurn, churnRod, cask);
    } else {
      // 'farm_weaver': Timber Weaving Loom with Colorful Woven Tapestry + Silk/Linen Bolts
      const loomPostL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.95, 0.65), furnitureWoodMat);
      loomPostL.position.set(-0.85, 0.98, -3.08);
      const loomPostR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.95, 0.65), furnitureWoodMat);
      loomPostR.position.set(0.85, 0.98, -3.08);
      const loomTopBeam = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.16), barkMat);
      loomTopBeam.position.set(0, 1.88, -3.08);
      const wovenTapestry = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.25, 0.04), blanketClothMat);
      wovenTapestry.position.set(0, 1.15, -3.08);
      const silkBolt1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.85, 8), cheeseWheelMat);
      silkBolt1.position.set(1.45, 0.42, -3.12);
      silkBolt1.rotation.z = 0.18;
      const silkBolt2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.85, 8), blanketClothMat);
      silkBolt2.position.set(1.72, 0.42, -3.12);
      silkBolt2.rotation.z = -0.12;
      fGroup.add(loomPostL, loomPostR, loomTopBeam, wovenTapestry, silkBolt1, silkBolt2);
    }

    return fGroup;
  }

  // --- A. CENTRAL LAKESIDE TIMBER PIER & MOORED WOODEN ROWBOAT ---
  const pierGroup = new THREE.Group();
  pierGroup.position.set(-11.5, 0, 15.5);
  pierGroup.rotation.y = Math.atan2(-8.0, 6.0);

  const plankGeo = new THREE.BoxGeometry(0.36, 0.09, 2.5);
  const beamGeo = new THREE.BoxGeometry(11.0, 0.14, 0.16);
  const pilingGeo = new THREE.CylinderGeometry(0.13, 0.15, 2.6, 8);
  disposableGeometries.push(plankGeo, beamGeo, pilingGeo);

  for (let p = -5.2; p <= 5.2; p += 0.42) {
    const plank = new THREE.Mesh(plankGeo, timberMat);
    plank.position.set(p, 0.51, 0);
    plank.castShadow = !isSoftwareGl;
    plank.receiveShadow = !isSoftwareGl;
    pierGroup.add(plank);
  }
  for (const zSide of [-1.05, 1.05]) {
    const beam = new THREE.Mesh(beamGeo, timberMat);
    beam.position.set(0, 0.42, zSide);
    pierGroup.add(beam);
  }
  for (let px = -5.0; px <= 5.0; px += 2.5) {
    for (const pz of [-1.05, 1.05]) {
      const piling = new THREE.Mesh(pilingGeo, barkMat);
      piling.position.set(px, -0.35, pz);
      piling.castShadow = !isSoftwareGl;
      pierGroup.add(piling);
    }
  }
  pierGroup.add(createLanternAssembly(4.9, 0.55, 1.05, true));
  scene.add(pierGroup);
  distanceCulledObjects.push({ obj: pierGroup, cx: -11.5, cz: 15.5, radius: 15 });

  // Moored Wooden Rowboat
  const rowboatGroup = new THREE.Group();
  rowboatGroup.position.set(-6.5, WATER_LEVEL + 0.05, 10.2);
  rowboatGroup.rotation.y = 0.65;

  const hullBottomGeo = new THREE.BoxGeometry(2.7, 0.14, 1.05);
  const hullSideGeo = new THREE.BoxGeometry(2.85, 0.36, 0.08);
  const benchGeo = new THREE.BoxGeometry(0.32, 0.06, 0.98);
  const oarGeo = new THREE.CylinderGeometry(0.025, 0.035, 2.1, 6);
  oarGeo.rotateZ(Math.PI / 2);
  disposableGeometries.push(hullBottomGeo, hullSideGeo, benchGeo, oarGeo);

  rowboatGroup.add(new THREE.Mesh(hullBottomGeo, timberMat));
  const sideL = new THREE.Mesh(hullSideGeo, timberMat);
  sideL.position.set(0, 0.18, 0.52);
  sideL.rotation.x = -0.15;
  const sideR = new THREE.Mesh(hullSideGeo, timberMat);
  sideR.position.set(0, 0.18, -0.52);
  sideR.rotation.x = 0.15;
  rowboatGroup.add(sideL, sideR);

  for (const bx of [-0.65, 0.0, 0.65]) {
    const bench = new THREE.Mesh(benchGeo, timberMat);
    bench.position.set(bx, 0.22, 0);
    rowboatGroup.add(bench);
  }
  const oar1 = new THREE.Mesh(oarGeo, timberMat);
  oar1.position.set(-0.1, 0.32, 0.65);
  oar1.rotation.y = 0.35;
  oar1.rotation.z = 0.15;
  const oar2 = new THREE.Mesh(oarGeo, timberMat);
  oar2.position.set(-0.1, 0.32, -0.65);
  oar2.rotation.y = -0.35;
  oar2.rotation.z = 0.15;
  rowboatGroup.add(oar1, oar2);
  scene.add(rowboatGroup);
  distanceCulledObjects.push({ obj: rowboatGroup, cx: -6.5, cz: 10.2, radius: 10 });

  // --- B. CENTRAL ARCHED STONE FOOTBRIDGE at (18.0, 2.0) ---
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(18.0, 0, 2.0);

  const segGeo = new THREE.BoxGeometry(3.2, 0.28, 1.05);
  const postStoneGeo = new THREE.BoxGeometry(0.32, 0.85, 0.32);
  const railStoneGeo = new THREE.BoxGeometry(0.22, 0.18, 1.15);
  disposableGeometries.push(segGeo, postStoneGeo, railStoneGeo);

  for (let i = -7; i <= 7; i++) {
    const zLocal = i * 0.96;
    const normZ = zLocal / 7.2;
    const archY = 0.52 + (1.0 - normZ * normZ) * 1.45;
    const slopeAngle = Math.atan((2 * normZ * 1.45) / 7.2);

    const deckSeg = new THREE.Mesh(segGeo, rockMat);
    deckSeg.position.set(0, archY, zLocal);
    deckSeg.rotation.x = slopeAngle;
    deckSeg.castShadow = !isSoftwareGl;
    deckSeg.receiveShadow = !isSoftwareGl;
    bridgeGroup.add(deckSeg);

    if (i % 2 === 0) {
      for (const xSide of [-1.42, 1.42]) {
        const post = new THREE.Mesh(postStoneGeo, rockMat);
        post.position.set(xSide, archY + 0.45, zLocal);
        post.castShadow = !isSoftwareGl;
        bridgeGroup.add(post);
      }
    }
    for (const xSide of [-1.42, 1.42]) {
      const rail = new THREE.Mesh(railStoneGeo, rockMat);
      rail.position.set(xSide, archY + 0.82, zLocal);
      rail.rotation.x = slopeAngle;
      bridgeGroup.add(rail);
    }
  }
  bridgeGroup.add(createLanternAssembly(1.42, 2.02, 0, true));
  scene.add(bridgeGroup);
  distanceCulledObjects.push({ obj: bridgeGroup, cx: 18.0, cz: 2.0, radius: 18 });

  // --- C. NORTHERN TIMBER & STONE WATCHTOWER PAVILION at (30.0, -26.0) ---
  const towerGroup = new THREE.Group();
  const towerBaseY = groundHeightAt(30.0, -26.0);
  towerGroup.position.set(30.0, towerBaseY, -26.0);

  const plinthGeo = new THREE.CylinderGeometry(3.8, 4.3, 0.7, 8);
  plinthGeo.translate(0, 0.25, 0);
  const deckPlatformGeo = new THREE.BoxGeometry(5.8, 0.18, 5.8);
  deckPlatformGeo.translate(0, 0.52, 0);
  const postTimberGeo = new THREE.CylinderGeometry(0.18, 0.22, 3.6, 8);
  postTimberGeo.translate(0, 2.35, 0);
  const roofConeGeo = new THREE.ConeGeometry(4.6, 2.2, 8);
  roofConeGeo.translate(0, 5.15, 0);
  const finialGeo = new THREE.CylinderGeometry(0.05, 0.12, 0.8, 6);
  finialGeo.translate(0, 6.45, 0);

  disposableGeometries.push(plinthGeo, deckPlatformGeo, postTimberGeo, roofConeGeo, finialGeo);

  towerGroup.add(new THREE.Mesh(plinthGeo, rockMat));
  towerGroup.add(new THREE.Mesh(deckPlatformGeo, timberMat));
  const roofMesh = new THREE.Mesh(roofConeGeo, barkMat);
  roofMesh.castShadow = !isSoftwareGl;
  towerGroup.add(roofMesh);
  towerGroup.add(new THREE.Mesh(finialGeo, darkIronMat));

  const cornerCoords = [
    [-2.5, -2.5],
    [2.5, -2.5],
    [-2.5, 2.5],
    [2.5, 2.5],
  ];
  for (const [cx, cz] of cornerCoords) {
    const post = new THREE.Mesh(postTimberGeo, barkMat);
    post.position.set(cx, 0, cz);
    post.castShadow = !isSoftwareGl;
    towerGroup.add(post);
  }
  towerGroup.add(createLanternAssembly(2.2, 0.55, 2.2, true));
  scene.add(towerGroup);
  distanceCulledObjects.push({ obj: towerGroup, cx: 30.0, cz: -26.0, radius: 16 });

  // --- D. ANCIENT OAK SANCTUARY CAIRN & BENCH at (-34.0, -16.0) ---
  const sanctuaryGroup = new THREE.Group();
  const sancY = groundHeightAt(-34.0, -16.0);
  sanctuaryGroup.position.set(-34.0, sancY, -16.0);

  for (let s = 0; s < 5; s++) {
    const r = 1.05 - s * 0.17;
    const h = 0.34 - s * 0.03;
    const cairnStoneGeo = new THREE.DodecahedronGeometry(r, 1);
    cairnStoneGeo.scale(1.1, h / r, 1.0);
    disposableGeometries.push(cairnStoneGeo);
    const m = new THREE.Mesh(cairnStoneGeo, rockMat);
    m.position.set(0, 0.2 + s * 0.34, 0);
    m.rotation.y = s * 1.1;
    m.castShadow = !isSoftwareGl;
    sanctuaryGroup.add(m);
  }
  const benchSeatGeo = new THREE.BoxGeometry(2.4, 0.12, 0.55);
  disposableGeometries.push(benchSeatGeo);
  const benchSeat = new THREE.Mesh(benchSeatGeo, timberMat);
  benchSeat.position.set(0, 0.48, 3.2);
  sanctuaryGroup.add(benchSeat);
  scene.add(sanctuaryGroup);
  distanceCulledObjects.push({ obj: sanctuaryGroup, cx: -34.0, cz: -16.0, radius: 14 });

  // --- E. NORTHEASTERN RIVER TIMBER BRIDGE at (78.0, -42.0) ---
  const riverBridgeGroup = new THREE.Group();
  riverBridgeGroup.position.set(78.0, 0, -42.0);
  riverBridgeGroup.rotation.y = -0.52;

  for (let i = -7; i <= 7; i++) {
    const zLocal = i * 1.02;
    const norm = zLocal / 7.5;
    const deckY = 0.85 + (1.0 - norm * norm) * 0.95;
    const slopeAngle = Math.atan((2 * norm * 0.95) / 7.5);

    const seg = new THREE.Mesh(segGeo, timberMat);
    seg.position.set(0, deckY, zLocal);
    seg.rotation.x = slopeAngle;
    seg.castShadow = !isSoftwareGl;
    seg.receiveShadow = !isSoftwareGl;
    riverBridgeGroup.add(seg);

    if (i % 2 === 0) {
      for (const xSide of [-1.45, 1.45]) {
        const post = new THREE.Mesh(postStoneGeo, barkMat);
        post.position.set(xSide, deckY + 0.45, zLocal);
        riverBridgeGroup.add(post);
      }
    }
  }
  riverBridgeGroup.add(createLanternAssembly(1.45, 1.82, 0, true));
  scene.add(riverBridgeGroup);
  distanceCulledObjects.push({ obj: riverBridgeGroup, cx: 78.0, cz: -42.0, radius: 18 });

  // ============================================================================
  // 5. LARGE REALISTIC DESIGNED HUNTER'S LODGE, WATER TROUGH & HORSE STABLE
  //    Moved south off the trail crossroads to (-92, 72), lowered onto the ground,
  //    and rotated (rotation.y = Math.PI) so the front entrance faces the trail!
  // ============================================================================
  const lodgeBaseY = HUNTER_LODGE_POS.height;
  const hunterCompound = new THREE.Group();
  // Lowered by 0.28m so the lodge porch & floor sit low and flush on the ground (only a 0.20m threshold step),
  // and rotated 180 degrees so its front veranda and door face North (-Z) directly toward the trail!
  hunterCompound.position.set(HUNTER_LODGE_POS.x, lodgeBaseY - 0.28, HUNTER_LODGE_POS.z);
  hunterCompound.rotation.y = Math.PI;

  // 1) Heavy River-Stone Plinth & Wide Covered Front Veranda Deck
  const lodgePlinthGeo = new THREE.BoxGeometry(11.4, 0.48, 9.2);
  lodgePlinthGeo.translate(0, 0.24, 0);
  const porchStepsGeo = new THREE.BoxGeometry(3.2, 0.24, 1.1);
  porchStepsGeo.translate(0, 0.12, 4.95);
  const lodgeFloorGeo = new THREE.BoxGeometry(11.0, 0.12, 8.8);
  lodgeFloorGeo.translate(0, 0.48, 0);
  disposableGeometries.push(lodgePlinthGeo, porchStepsGeo, lodgeFloorGeo);

  hunterCompound.add(
    new THREE.Mesh(lodgePlinthGeo, rockMat),
    new THREE.Mesh(porchStepsGeo, rockMat),
    new THREE.Mesh(lodgeFloorGeo, timberMat)
  );

  // 2) Stacked Horizontal Hollow Log Walls (Enterable via interactive door 'hunter-lodge-door'!)
  const horizLogBackGeo = new THREE.CylinderGeometry(0.19, 0.19, 9.8, 8);
  horizLogBackGeo.rotateZ(Math.PI / 2);
  const horizLogFrontFlankGeo = new THREE.CylinderGeometry(0.19, 0.19, 3.8, 8);
  horizLogFrontFlankGeo.rotateZ(Math.PI / 2);
  const horizLogSideGeo = new THREE.CylinderGeometry(0.19, 0.19, 6.2, 8);
  horizLogSideGeo.rotateX(Math.PI / 2);
  const windowPaneGeo = new THREE.BoxGeometry(1.45, 1.05, 0.42);
  disposableGeometries.push(horizLogBackGeo, horizLogFrontFlankGeo, horizLogSideGeo, windowPaneGeo);

  for (let row = 0; row < 10; row++) {
    const ly = 0.65 + row * 0.34;
    // Back log wall (z = -3.8)
    const backLog = new THREE.Mesh(horizLogBackGeo, barkMat);
    backLog.position.set(0, ly, -3.8);
    backLog.castShadow = !isSoftwareGl;
    hunterCompound.add(backLog);

    // Front log wall flanks (z = +1.8, leaving doorway open at x in [-0.95, +0.95] for rows 0..6!)
    if (row >= 7) {
      const topFrontLog = new THREE.Mesh(horizLogBackGeo, barkMat);
      topFrontLog.position.set(0, ly, 1.8);
      hunterCompound.add(topFrontLog);
    } else {
      for (const fx of [-2.9, 2.9]) {
        const flankLog = new THREE.Mesh(horizLogFrontFlankGeo, barkMat);
        flankLog.position.set(fx, ly, 1.8);
        hunterCompound.add(flankLog);
      }
    }

    // Left & Right side log walls (x = -4.6 and x = +4.6)
    for (const sx of [-4.6, 4.6]) {
      const sideLog = new THREE.Mesh(horizLogSideGeo, barkMat);
      sideLog.position.set(sx, ly, -1.0);
      sideLog.castShadow = !isSoftwareGl;
      hunterCompound.add(sideLog);
    }
  }

  // Interactive Hinged Double Door for Hunter's Lodge ('hunter-lodge-door')
  const lodgeDoorGroup = new THREE.Group();
  lodgeDoorGroup.position.set(0, 0.48, 1.8);
  const lodgeLeafGeo = new THREE.BoxGeometry(0.92, 2.35, 0.12);
  lodgeLeafGeo.translate(0.46, 1.175, 0);
  disposableGeometries.push(lodgeLeafGeo);
  const lodgeLeftPivot = new THREE.Group();
  lodgeLeftPivot.position.set(-0.95, 0, 0);
  lodgeLeftPivot.add(new THREE.Mesh(lodgeLeafGeo, timberMat));
  const lodgeRightPivot = new THREE.Group();
  lodgeRightPivot.position.set(0.95, 0, 0);
  const lodgeRightLeaf = new THREE.Mesh(lodgeLeafGeo, timberMat);
  lodgeRightLeaf.scale.x = -1;
  lodgeRightPivot.add(lodgeRightLeaf);
  lodgeDoorGroup.add(lodgeLeftPivot, lodgeRightPivot);
  hunterCompound.add(lodgeDoorGroup);
  doorPivotHandles.push({
    id: 'hunter-lodge-door',
    leftPivot: lodgeLeftPivot,
    rightPivot: lodgeRightPivot,
    currentAngle: 0,
  });

  // Interior Furniture inside the Hunter's Lodge (Stone Fireplace, Fur Rug, Table, Wardrobe, Bed, Storage Chest)
  const lodgeFurniture = createInteriorFurnitureSet('hunter');
  lodgeFurniture.position.set(0, 0.54, 0);
  hunterCompound.add(lodgeFurniture);

  // Glowing front windows
  for (const wx of [-2.85, 2.85]) {
    const win = new THREE.Mesh(windowPaneGeo, warmLanternMat);
    win.position.set(wx, 2.25, 1.82);
    hunterCompound.add(win);
  }

  // 3) Steep Pitched A-Frame Timber Roof & Veranda Columns
  const roofSlopeGeo = new THREE.BoxGeometry(11.8, 0.24, 6.2);
  const verandaColGeo = new THREE.CylinderGeometry(0.16, 0.19, 3.3, 8);
  verandaColGeo.translate(0, 2.1, 0);
  const porchRailGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6);
  porchRailGeo.rotateZ(Math.PI / 2);
  disposableGeometries.push(roofSlopeGeo, verandaColGeo, porchRailGeo);

  const roofFront = new THREE.Mesh(roofSlopeGeo, barkMat);
  roofFront.position.set(0, 4.85, 1.55);
  roofFront.rotation.x = 0.52;
  roofFront.castShadow = !isSoftwareGl;
  const roofBack = new THREE.Mesh(roofSlopeGeo, barkMat);
  roofBack.position.set(0, 4.85, -3.15);
  roofBack.rotation.x = -0.52;
  roofBack.castShadow = !isSoftwareGl;
  hunterCompound.add(roofFront, roofBack);

  for (const vx of [-4.8, -1.8, 1.8, 4.8]) {
    const col = new THREE.Mesh(verandaColGeo, barkMat);
    col.position.set(vx, 0, 4.1);
    col.castShadow = !isSoftwareGl;
    hunterCompound.add(col);
  }
  for (const rx of [-3.3, 3.3]) {
    const rail = new THREE.Mesh(porchRailGeo, timberMat);
    rail.position.set(rx, 1.25, 4.1);
    hunterCompound.add(rail);
  }

  // 4) Tall River-Stone Fireplace Chimney on East Wall
  const lodgeChimneyGeo = new THREE.BoxGeometry(1.5, 6.8, 1.6);
  lodgeChimneyGeo.translate(5.1, 3.4, -1.2);
  disposableGeometries.push(lodgeChimneyGeo);
  const chimneyMesh = new THREE.Mesh(lodgeChimneyGeo, rockMat);
  chimneyMesh.castShadow = !isSoftwareGl;
  hunterCompound.add(chimneyMesh);

  // 5) Mounted Hunter's Trophy Stag Antlers Plaque above Main Entrance
  const plaqueGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 8);
  plaqueGeo.rotateX(Math.PI / 2);
  const trophyHornGeo = new THREE.CylinderGeometry(0.03, 0.06, 1.15, 6);
  disposableGeometries.push(plaqueGeo, trophyHornGeo);

  const trophyGroup = new THREE.Group();
  trophyGroup.position.set(0, 3.65, 2.05);
  trophyGroup.add(new THREE.Mesh(plaqueGeo, timberMat));
  const hornL = new THREE.Mesh(trophyHornGeo, birchBarkMat);
  hornL.position.set(-0.42, 0.35, 0.1);
  hornL.rotation.z = 0.68;
  const hornR = new THREE.Mesh(trophyHornGeo, birchBarkMat);
  hornR.position.set(0.42, 0.35, 0.1);
  hornR.rotation.z = -0.68;
  trophyGroup.add(hornL, hornR);
  hunterCompound.add(trophyGroup);

  hunterCompound.add(createLanternAssembly(-2.1, 0.48, 4.2, true));

  // --- WATER TROUGH (שוקת מים) right beside the Hunter's Lodge (offset +9.5, +3.5) ---
  const troughGroup = new THREE.Group();
  troughGroup.position.set(9.5, 0.28, 3.5);

  const troughBaseGeo = new THREE.BoxGeometry(0.45, 0.45, 0.95);
  troughBaseGeo.translate(0, 0.22, 0);
  const troughSideLGeo = new THREE.BoxGeometry(2.8, 0.52, 0.12);
  const troughEndGeo = new THREE.BoxGeometry(0.12, 0.52, 0.88);
  const troughWaterGeo = new THREE.PlaneGeometry(2.56, 0.68);
  troughWaterGeo.rotateX(-Math.PI / 2);
  const pumpPostGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.55, 8);
  pumpPostGeo.translate(-1.55, 0.77, 0);
  const spoutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6);
  spoutGeo.rotateZ(Math.PI / 2);
  spoutGeo.translate(-1.3, 1.18, 0);
  disposableGeometries.push(
    troughBaseGeo,
    troughSideLGeo,
    troughEndGeo,
    troughWaterGeo,
    pumpPostGeo,
    spoutGeo
  );

  for (const tx of [-1.0, 1.0]) {
    const sup = new THREE.Mesh(troughBaseGeo, rockMat);
    sup.position.x = tx;
    troughGroup.add(sup);
  }
  for (const tz of [-0.38, 0.38]) {
    const side = new THREE.Mesh(troughSideLGeo, timberMat);
    side.position.set(0, 0.62, tz);
    troughGroup.add(side);
  }
  for (const tx of [-1.34, 1.34]) {
    const end = new THREE.Mesh(troughEndGeo, timberMat);
    end.position.set(tx, 0.62, 0);
    troughGroup.add(end);
  }
  const troughWater = new THREE.Mesh(troughWaterGeo, waterMat);
  troughWater.position.set(0, 0.78, 0);
  troughGroup.add(troughWater);
  troughGroup.add(new THREE.Mesh(pumpPostGeo, barkMat));
  troughGroup.add(new THREE.Mesh(spoutGeo, darkIronMat));
  hunterCompound.add(troughGroup);

  // --- HORSE STABLE (אורווה מקורה) & CORRAL right beside the Water Trough (offset +12.5, -3.5) ---
  const stableGroup = new THREE.Group();
  stableGroup.position.set(12.5, 0.28, -3.5);

  const stableFloorGeo = new THREE.BoxGeometry(7.8, 0.18, 5.4);
  stableFloorGeo.translate(0, 0.09, 0);
  const stableBackWallGeo = new THREE.BoxGeometry(7.6, 3.1, 0.25);
  stableBackWallGeo.translate(0, 1.65, -2.5);
  const stableDividerGeo = new THREE.BoxGeometry(0.18, 1.8, 4.6);
  stableDividerGeo.translate(0, 1.0, -0.2);
  const stableRoofGeo = new THREE.BoxGeometry(8.4, 0.22, 6.4);
  const hayBaleGeo = new THREE.BoxGeometry(0.95, 0.58, 0.65);
  hayBaleGeo.translate(0, 0.29, 0);
  disposableGeometries.push(
    stableFloorGeo,
    stableBackWallGeo,
    stableDividerGeo,
    stableRoofGeo,
    hayBaleGeo
  );

  stableGroup.add(new THREE.Mesh(stableFloorGeo, rockMat));
  stableGroup.add(new THREE.Mesh(stableBackWallGeo, timberMat));

  // 4 Front & 4 Back Timber Posts + 3 Stall Dividers
  for (const sx of [-3.6, -1.2, 1.2, 3.6]) {
    const postF = new THREE.Mesh(verandaColGeo, barkMat);
    postF.position.set(sx, 0, 2.3);
    const postB = new THREE.Mesh(verandaColGeo, barkMat);
    postB.position.set(sx, 0, -2.5);
    stableGroup.add(postF, postB);

    const div = new THREE.Mesh(stableDividerGeo, timberMat);
    div.position.x = sx;
    stableGroup.add(div);
  }

  const stableRoof = new THREE.Mesh(stableRoofGeo, barkMat);
  stableRoof.position.set(0, 3.55, 0);
  stableRoof.rotation.x = 0.16;
  stableRoof.castShadow = !isSoftwareGl;
  stableGroup.add(stableRoof);

  // Stacked golden hay bales inside & beside the stable
  for (const [hx, hy, hz, rot] of [
    [-2.4, 0.18, -1.6, 0.1],
    [-2.4, 0.76, -1.7, -0.2],
    [0.0, 0.18, -1.6, 0.05],
    [2.4, 0.18, -1.6, -0.15],
  ]) {
    const bale = new THREE.Mesh(hayBaleGeo, hayMat);
    bale.position.set(hx, hy, hz);
    bale.rotation.y = rot;
    stableGroup.add(bale);
  }

  // Wooden Paddock Corral Fence in front of the stable
  for (const fx of [-3.6, 0, 3.6]) {
    const fPost = new THREE.Mesh(postStoneGeo, barkMat);
    fPost.position.set(fx, 0.55, 5.6);
    stableGroup.add(fPost);
  }
  for (const rx of [-1.8, 1.8]) {
    const fRail = new THREE.Mesh(porchRailGeo, timberMat);
    fRail.position.set(rx, 0.85, 5.6);
    stableGroup.add(fRail);
  }

  hunterCompound.add(stableGroup);
  scene.add(hunterCompound);
  distanceCulledObjects.push({
    obj: hunterCompound,
    cx: HUNTER_LODGE_POS.x,
    cz: HUNTER_LODGE_POS.z,
    radius: 30,
  });

  // ============================================================================
  // 5B. 3 ENTERABLE VALLEY FARMHOUSES, INTERIOR FURNITURE & GOLDEN WHEAT FIELDS
  //     (חוות חקלאיות בעמק עם שדות חיטה מוזהבים, ללא עצים, ובתים מרוהטים שניתן להיכנס אליהם!)
  // ============================================================================
  const farmWallBackGeo = new THREE.BoxGeometry(10.0, 3.4, 0.42);
  const farmWallSideGeo = new THREE.BoxGeometry(0.42, 3.4, 8.6);
  const farmWallSideGableGeo = new THREE.BoxGeometry(0.42, 1.45, 5.2);
  const farmWallFrontFlankGeo = new THREE.BoxGeometry(4.0, 3.4, 0.42);
  const farmWallFrontHeaderGeo = new THREE.BoxGeometry(2.0, 0.95, 0.42);
  const farmFloorGeo = new THREE.BoxGeometry(10.4, 0.18, 10.6);
  const farmRoofSlopeGeo = new THREE.BoxGeometry(11.2, 0.24, 6.8);
  const plowedSoilFurrowGeo = new THREE.BoxGeometry(11.6, 0.08, 15.6);
  const farmFenceRailGeo = new THREE.BoxGeometry(3.8, 0.1, 0.1);
  const wheatStalkGeo = new THREE.ConeGeometry(0.085, 0.92, 5);
  wheatStalkGeo.translate(0, 0.46, 0);
  disposableGeometries.push(
    farmWallBackGeo,
    farmWallSideGeo,
    farmWallSideGableGeo,
    farmWallFrontFlankGeo,
    farmWallFrontHeaderGeo,
    farmFloorGeo,
    farmRoofSlopeGeo,
    plowedSoilFurrowGeo,
    farmFenceRailGeo,
    wheatStalkGeo
  );

  const plowedSoilMat = new THREE.MeshStandardMaterial({
    color: 0x4a3520,
    roughness: 0.95,
  });
  const goldenWheatMat = new THREE.MeshStandardMaterial({
    color: 0xeab308, // Rich golden-amber ripe wheat
    roughness: 0.65,
    metalness: 0.05,
  });
  attachWindSwayShader(goldenWheatMat, 0.045, 2.2, swayMaterials);
  disposableMaterials.push(plowedSoilMat, goldenWheatMat);

  // Instanced Golden Wheat Stalks across all 3 Valley Farms (6 wheat fields total = 2,160 swaying stalks!)
  const wheatStalksPerFarm = 720;
  const totalWheatStalks = VALLEY_FARMS.length * wheatStalksPerFarm;
  const wheatInstanced = new THREE.InstancedMesh(wheatStalkGeo, goldenWheatMat, totalWheatStalks);
  const wDummy = new THREE.Object3D();
  const wTint = new THREE.Color();
  let wIdx = 0;

  for (let f = 0; f < VALLEY_FARMS.length; f++) {
    const farm = VALLEY_FARMS[f];
    const farmGroup = new THREE.Group();
    farmGroup.position.set(farm.x, farm.height, farm.z);
    farmGroup.rotation.y = farm.dirZ === 1 ? 0 : Math.PI;

    // 1) Wooden Floor & Porch Deck (x in [-5.2, +5.2], z in [-6.2, +4.4])
    const floorMesh = new THREE.Mesh(farmFloorGeo, timberMat);
    floorMesh.position.set(0, 0.09, -0.9);
    floorMesh.receiveShadow = !isSoftwareGl;
    farmGroup.add(floorMesh);

    // 2) Hollow Timber Walls (x in [-5.0, +5.0], z in [-6.15, +2.2]) with Front Doorway at z = +2.2
    const backWall = new THREE.Mesh(farmWallBackGeo, timberMat);
    backWall.position.set(0, 1.88, -6.15);
    backWall.castShadow = !isSoftwareGl;
    const westWall = new THREE.Mesh(farmWallSideGeo, timberMat);
    westWall.position.set(-4.95, 1.88, -1.95);
    westWall.castShadow = !isSoftwareGl;
    const eastWall = new THREE.Mesh(farmWallSideGeo, timberMat);
    eastWall.position.set(4.95, 1.88, -1.95);
    eastWall.castShadow = !isSoftwareGl;
    const frontLeft = new THREE.Mesh(farmWallFrontFlankGeo, timberMat);
    frontLeft.position.set(-3.0, 1.88, 2.2);
    const frontRight = new THREE.Mesh(farmWallFrontFlankGeo, timberMat);
    frontRight.position.set(3.0, 1.88, 2.2);
    const frontHeader = new THREE.Mesh(farmWallFrontHeaderGeo, timberMat);
    frontHeader.position.set(0, 3.1, 2.2);
    const westGable = new THREE.Mesh(farmWallSideGableGeo, timberMat);
    westGable.position.set(-4.95, 4.15, -1.55);
    const eastGable = new THREE.Mesh(farmWallSideGableGeo, timberMat);
    eastGable.position.set(4.95, 4.15, -1.55);
    farmGroup.add(backWall, westWall, eastWall, westGable, eastGable, frontLeft, frontRight, frontHeader);

    // Glowing Farmhouse Windows on the Front Wall
    for (const wx of [-3.0, 3.0]) {
      const win = new THREE.Mesh(windowPaneGeo, warmLanternMat);
      win.position.set(wx, 2.0, 2.22);
      farmGroup.add(win);
    }

    // Interactive Hinged Double Door [E] ('farm-west-door', 'farm-south-door', 'farm-east-door')
    const fDoorGroup = new THREE.Group();
    fDoorGroup.position.set(0, 0.18, 2.2);
    const fLeftPivot = new THREE.Group();
    fLeftPivot.position.set(-0.95, 0, 0);
    fLeftPivot.add(new THREE.Mesh(lodgeLeafGeo, timberMat));
    const fRightPivot = new THREE.Group();
    fRightPivot.position.set(0.95, 0, 0);
    const fRightLeaf = new THREE.Mesh(lodgeLeafGeo, timberMat);
    fRightLeaf.scale.x = -1;
    fRightPivot.add(fRightLeaf);
    fDoorGroup.add(fLeftPivot, fRightPivot);
    farmGroup.add(fDoorGroup);
    doorPivotHandles.push({
      id: farm.doorId,
      leftPivot: fLeftPivot,
      rightPivot: fRightPivot,
      currentAngle: 0,
    });

    // 3) Pitched Timber Roof & Covered Front Porch Columns
    const fRoofFront = new THREE.Mesh(farmRoofSlopeGeo, barkMat);
    fRoofFront.position.set(0, 4.35, 1.15);
    fRoofFront.rotation.x = 0.48;
    fRoofFront.castShadow = !isSoftwareGl;
    const fRoofBack = new THREE.Mesh(farmRoofSlopeGeo, barkMat);
    fRoofBack.position.set(0, 4.35, -3.95);
    fRoofBack.rotation.x = -0.48;
    fRoofBack.castShadow = !isSoftwareGl;
    farmGroup.add(fRoofFront, fRoofBack);

    for (const vx of [-4.6, -1.6, 1.6, 4.6]) {
      const col = new THREE.Mesh(verandaColGeo, barkMat);
      col.position.set(vx, 0, 4.1);
      farmGroup.add(col);
    }
    farmGroup.add(createLanternAssembly(-1.9, 0.18, 4.15, false));

    // 4) Role-Specific Interior Farmhouse Furniture (Bakery & Oven / Cheese Dairy / Weaving Loom)
    const farmInteriorKinds: HouseInteriorKind[] = ['farm_bakery', 'farm_dairy', 'farm_weaver'];
    const farmFurniture = createInteriorFurnitureSet(farmInteriorKinds[f % farmInteriorKinds.length]);
    farmFurniture.position.set(0, 0.18, -2.0);
    farmGroup.add(farmFurniture);

    // 5) Cultivated Golden Wheat Fields on BOTH sides of the Farmhouse (x = -12.5 and x = +12.5)
    for (const fieldSide of [-1, 1]) {
      const fieldCenterX = fieldSide * 12.6;
      const soilPlot = new THREE.Mesh(plowedSoilFurrowGeo, plowedSoilMat);
      soilPlot.position.set(fieldCenterX, 0.04, -0.5);
      soilPlot.receiveShadow = !isSoftwareGl;
      farmGroup.add(soilPlot);

      // Low Wooden Split-Rail Farm Fence around the outer edge of the wheat plots + Hay Bales
      for (const fz of [-8.6, 7.6]) {
        for (const fxOff of [-3.6, 0, 3.6]) {
          const rail = new THREE.Mesh(farmFenceRailGeo, timberMat);
          rail.position.set(fieldCenterX + fxOff, 0.55, fz);
          farmGroup.add(rail);
        }
      }
      const hayBale = new THREE.Mesh(hayBaleGeo, hayMat);
      hayBale.position.set(fieldSide * 6.4, 0.15, 3.2);
      hayBale.rotation.y = fieldSide * 0.25;
      farmGroup.add(hayBale);

      // Populate dense rows of Golden Wheat Stalks in this field plot (360 stalks per side = 720 per farm)
      for (let row = 0; row < 18; row++) {
        for (let col = 0; col < 20; col++) {
          if (wIdx >= totalWheatStalks) break;
          const jitterX = (hash2D(wIdx, 701) - 0.5) * 0.22;
          const jitterZ = (hash2D(wIdx, 709) - 0.5) * 0.22;
          const localWx = fieldCenterX - 5.1 + (col / 19) * 10.2 + jitterX;
          const localWz = -7.6 + (row / 17) * 14.2 + jitterZ;
          const wx = farm.x + localWx * farm.dirZ;
          const wz = farm.z + localWz * farm.dirZ;
          const wy = farm.height + 0.05;

          wDummy.position.set(wx, wy, wz);
          wDummy.rotation.set(
            (hash2D(wIdx, 719) - 0.5) * 0.12,
            hash2D(wIdx, 727) * Math.PI * 2,
            (hash2D(wIdx, 733) - 0.5) * 0.12
          );
          const sc = 0.85 + hash2D(wIdx, 739) * 0.38;
          wDummy.scale.set(sc, sc * (0.95 + hash2D(wIdx, 743) * 0.25), sc);
          wDummy.updateMatrix();
          wheatInstanced.setMatrixAt(wIdx, wDummy.matrix);

          wTint.setHSL(0.11 + (hash2D(wIdx, 751) - 0.5) * 0.03, 0.86, 0.52 + (hash2D(wIdx, 757) - 0.5) * 0.08);
          wheatInstanced.setColorAt(wIdx, wTint);
          wIdx++;
        }
      }
    }

    // 6) Large Wooden Perimeter Fence (גדר עץ גדולה מסביב לכל אזור החווה: 44m x 23m) + Rustic Entrance Gate Archway
    const fHalfW = farm.fenceHalfW; // 22.0m
    const fHalfD = farm.fenceHalfD; // 11.5m
    const fGateHalfW = farm.gateHalfW; // 3.2m
    const perimPostGeo = new THREE.CylinderGeometry(0.14, 0.17, 1.35, 7);
    perimPostGeo.translate(0, 0.67, 0);
    const perimGatePostGeo = new THREE.CylinderGeometry(0.22, 0.26, 3.6, 8);
    perimGatePostGeo.translate(0, 1.8, 0);
    const perimGateCrossbeamGeo = new THREE.BoxGeometry(fGateHalfW * 2 + 1.4, 0.28, 0.36);
    const perimBackRailGeo = new THREE.BoxGeometry(fHalfW * 2, 0.12, 0.1);
    const perimSideRailGeo = new THREE.BoxGeometry(0.1, 0.12, fHalfD * 2);
    const perimFrontWingLen = fHalfW - fGateHalfW; // 18.8m
    const perimFrontWingRailGeo = new THREE.BoxGeometry(perimFrontWingLen, 0.12, 0.1);
    disposableGeometries.push(
      perimPostGeo,
      perimGatePostGeo,
      perimGateCrossbeamGeo,
      perimBackRailGeo,
      perimSideRailGeo,
      perimFrontWingRailGeo
    );

    // Horizontal double split-rails on Back (z = -11.5), West (x = -22), East (x = +22), and Front Wings (z = +11.5)
    for (const railY of [0.48, 0.96]) {
      const backRail = new THREE.Mesh(perimBackRailGeo, timberMat);
      backRail.position.set(0, railY, -fHalfD);
      const westRail = new THREE.Mesh(perimSideRailGeo, timberMat);
      westRail.position.set(-fHalfW, railY, 0);
      const eastRail = new THREE.Mesh(perimSideRailGeo, timberMat);
      eastRail.position.set(fHalfW, railY, 0);
      const frontLeftRail = new THREE.Mesh(perimFrontWingRailGeo, timberMat);
      frontLeftRail.position.set(-(fGateHalfW + perimFrontWingLen * 0.5), railY, fHalfD);
      const frontRightRail = new THREE.Mesh(perimFrontWingRailGeo, timberMat);
      frontRightRail.position.set(fGateHalfW + perimFrontWingLen * 0.5, railY, fHalfD);
      farmGroup.add(backRail, westRail, eastRail, frontLeftRail, frontRightRail);
    }

    // Fence posts along Back & Front perimeter
    for (let px = -fHalfW; px <= fHalfW + 0.01; px += 4.4) {
      const bPost = new THREE.Mesh(perimPostGeo, barkMat);
      bPost.position.set(px, 0, -fHalfD);
      farmGroup.add(bPost);
      if (Math.abs(px) > fGateHalfW + 0.5) {
        const fPost = new THREE.Mesh(perimPostGeo, barkMat);
        fPost.position.set(px, 0, fHalfD);
        farmGroup.add(fPost);
      }
    }
    // Fence posts along West & East perimeter
    for (let pz = -fHalfD + 3.8; pz <= fHalfD - 3.0; pz += 3.8) {
      for (const sx of [-fHalfW, fHalfW]) {
        const sPost = new THREE.Mesh(perimPostGeo, barkMat);
        sPost.position.set(sx, 0, pz);
        farmGroup.add(sPost);
      }
    }

    // Tall Rustic Timber Ranch Entrance Gate Archway at (0, fHalfD) with Hanging Lanterns
    for (const gx of [-fGateHalfW, fGateHalfW]) {
      const gPost = new THREE.Mesh(perimGatePostGeo, barkMat);
      gPost.position.set(gx, 0, fHalfD);
      farmGroup.add(gPost);
    }
    const gBeam = new THREE.Mesh(perimGateCrossbeamGeo, timberMat);
    gBeam.position.set(0, 3.45, fHalfD);
    farmGroup.add(
      gBeam,
      createLanternAssembly(-fGateHalfW + 0.15, 1.85, fHalfD + 0.25, false),
      createLanternAssembly(fGateHalfW - 0.65, 1.85, fHalfD + 0.25, false)
    );

    scene.add(farmGroup);
    distanceCulledObjects.push({
      obj: farmGroup,
      cx: farm.x,
      cz: farm.z,
      radius: 44,
    });
  }

  wheatInstanced.count = wIdx;
  wheatInstanced.instanceMatrix.needsUpdate = true;
  if (wheatInstanced.instanceColor) wheatInstanced.instanceColor.needsUpdate = true;
  wheatInstanced.computeBoundingSphere();
  scene.add(wheatInstanced);

  // Western Lagoon Wooden Pier at (-120.0, 48.0) + SURPRISE NEW AREA: LAKESIDE CHINESE TEA PAVILION, LOTUS LANTERNS & GOLDEN KOI!
  const westPierGroup = new THREE.Group();
  westPierGroup.position.set(-120.0, 0, 48.0);
  for (let p = -6.0; p <= 6.0; p += 0.45) {
    const plank = new THREE.Mesh(plankGeo, timberMat);
    plank.position.set(p, 0.51, 0);
    westPierGroup.add(plank);
  }
  for (let px = -5.5; px <= 5.5; px += 2.75) {
    for (const pz of [-1.05, 1.05]) {
      const piling = new THREE.Mesh(pilingGeo, barkMat);
      piling.position.set(px, -0.35, pz);
      westPierGroup.add(piling);
    }
  }

  // Over-Water Chinese Tea Pavilion at (-126.0, 48.0) — Local offset (-6.0, 0, 0) from westPierGroup
  const teaDeckGeo = new THREE.BoxGeometry(7.6, 0.18, 7.6);
  const teaPillarGeo = new THREE.CylinderGeometry(0.18, 0.2, 3.6, 8);
  teaPillarGeo.translate(0, 1.8, 0);
  const teaRailLongGeo = new THREE.BoxGeometry(0.14, 0.78, 7.4);
  const teaRailFrontGeo = new THREE.BoxGeometry(7.4, 0.78, 0.14);
  const teaRoofConeGeo = new THREE.ConeGeometry(6.2, 2.35, 8);
  teaRoofConeGeo.rotateY(Math.PI / 8);
  const teaRoofRimGeo = new THREE.CylinderGeometry(5.6, 6.4, 0.32, 8);
  teaRoofRimGeo.rotateY(Math.PI / 8);
  const teaTableLowGeo = new THREE.CylinderGeometry(1.15, 1.05, 0.48, 12);
  teaTableLowGeo.translate(0, 0.24, 0);
  const teaCushionGeo = new THREE.CylinderGeometry(0.42, 0.45, 0.14, 10);
  teaCushionGeo.translate(0, 0.07, 0);
  const teapotGeo = new THREE.SphereGeometry(0.16, 8, 8);
  const teacupGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.09, 8);
  const lotusLanternBaseGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.08, 8);
  const lotusLanternCoreGeo = new THREE.SphereGeometry(0.16, 8, 8);
  const koiBodyGeo = new THREE.ConeGeometry(0.14, 0.62, 7);
  koiBodyGeo.rotateX(Math.PI / 2);
  const koiTailGeo = new THREE.ConeGeometry(0.16, 0.26, 4);
  koiTailGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(
    teaDeckGeo,
    teaPillarGeo,
    teaRailLongGeo,
    teaRailFrontGeo,
    teaRoofConeGeo,
    teaRoofRimGeo,
    teaTableLowGeo,
    teaCushionGeo,
    teapotGeo,
    teacupGeo,
    lotusLanternBaseGeo,
    lotusLanternCoreGeo,
    koiBodyGeo,
    koiTailGeo
  );

  const teaCrimsonMat = new THREE.MeshStandardMaterial({ color: 0x9e241b, roughness: 0.48 });
  const teaGoldMat = new THREE.MeshStandardMaterial({ color: 0xd9a838, roughness: 0.35, metalness: 0.65 });
  const teaRoofMat = new THREE.MeshStandardMaterial({ color: 0x1f6b5c, roughness: 0.52, metalness: 0.15 });
  const koiGoldMat = new THREE.MeshStandardMaterial({
    color: 0xff6b1a,
    emissive: 0x9a3412,
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });
  const koiWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xfff7ed,
    emissive: 0xea580c,
    emissiveIntensity: 0.25,
    roughness: 0.25,
  });
  disposableMaterials.push(teaCrimsonMat, teaGoldMat, teaRoofMat, koiGoldMat, koiWhiteMat);

  const teaPavGroup = new THREE.Group();
  teaPavGroup.position.set(LAKESIDE_TEA_PAVILION_POS.x - -120.0, 0, LAKESIDE_TEA_PAVILION_POS.z - 48.0); // (-6.0, 0, 0)
  const teaDeck = new THREE.Mesh(teaDeckGeo, timberMat);
  teaDeck.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight - 0.08, 0);
  teaPavGroup.add(teaDeck);

  // Support pilings under the Tea Pavilion deck
  for (const px of [-3.3, 0, 3.3]) {
    for (const pz of [-3.3, 3.3]) {
      const tpiling = new THREE.Mesh(pilingGeo, barkMat);
      tpiling.position.set(px, -0.68, pz);
      teaPavGroup.add(tpiling);
    }
  }
  // 4 Crimson Corner Pillars + Balustrade Railings (open on East side x = +3.6 where pier connects)
  for (const px of [-3.4, 3.4]) {
    for (const pz of [-3.4, 3.4]) {
      const col = new THREE.Mesh(teaPillarGeo, teaCrimsonMat);
      col.position.set(px, LAKESIDE_TEA_PAVILION_POS.deckHeight, pz);
      teaPavGroup.add(col);
    }
  }
  const westTeaRail = new THREE.Mesh(teaRailLongGeo, teaCrimsonMat);
  westTeaRail.position.set(-3.5, LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.39, 0);
  const northTeaRail = new THREE.Mesh(teaRailFrontGeo, teaCrimsonMat);
  northTeaRail.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.39, -3.5);
  const southTeaRail = new THREE.Mesh(teaRailFrontGeo, teaCrimsonMat);
  southTeaRail.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.39, 3.5);
  teaPavGroup.add(westTeaRail, northTeaRail, southTeaRail);

  // Jade-Glazed Octagonal Pagoda Roof + Golden Finial
  const teaRoofRim = new THREE.Mesh(teaRoofRimGeo, teaGoldMat);
  teaRoofRim.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight + 3.65, 0);
  const teaRoofCone = new THREE.Mesh(teaRoofConeGeo, teaRoofMat);
  teaRoofCone.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight + 4.85, 0);
  teaPavGroup.add(teaRoofRim, teaRoofCone);

  // Low Carved Tea Table, 4 Silk Floor Cushions & Golden Teapot Set in the center of the Pavilion
  const lowTeaTable = new THREE.Mesh(teaTableLowGeo, furnitureWoodMat);
  lowTeaTable.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight, 0);
  const teapotMesh = new THREE.Mesh(teapotGeo, teaGoldMat);
  teapotMesh.position.set(0, LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.6, 0);
  teaPavGroup.add(lowTeaTable, teapotMesh);
  for (let c = 0; c < 4; c++) {
    const cAng = (c * Math.PI) / 2 + Math.PI / 4;
    const cushion = new THREE.Mesh(teaCushionGeo, blanketClothMat);
    cushion.position.set(Math.cos(cAng) * 1.65, LAKESIDE_TEA_PAVILION_POS.deckHeight, Math.sin(cAng) * 1.65);
    const cup = new THREE.Mesh(teacupGeo, pillowClothMat);
    cup.position.set(Math.cos(cAng) * 0.65, LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.52, Math.sin(cAng) * 0.65);
    teaPavGroup.add(cushion, cup);
  }
  westPierGroup.add(teaPavGroup);

  // 14 Glowing Floating Lotus Water Lanterns (עששיות לוטוס צפות על המים) around the Lagoon & Tea Pavilion
  for (let l = 0; l < 14; l++) {
    const lang = (l / 14) * Math.PI * 2;
    const lrad = 5.6 + (l % 3) * 2.4;
    const lx = -6.0 + Math.cos(lang) * lrad;
    const lz = Math.sin(lang) * lrad;
    const lPad = new THREE.Mesh(lotusLanternBaseGeo, teaRoofMat);
    lPad.position.set(lx, WATER_LEVEL + 0.03, lz);
    const lGlow = new THREE.Mesh(lotusLanternCoreGeo, warmLanternMat);
    lGlow.position.set(lx, WATER_LEVEL + 0.16, lz);
    westPierGroup.add(lPad, lGlow);
  }

  // 12 Swimming Golden & White Koi Fish (דגי קוי מוזהבים שוחים במים)
  interface SwimmingKoi {
    mesh: THREE.Group;
    orbitCenterX: number;
    orbitCenterZ: number;
    orbitRadius: number;
    speed: number;
    phase: number;
  }
  const swimmingKoiList: SwimmingKoi[] = [];
  for (let k = 0; k < 12; k++) {
    const koiGroup = new THREE.Group();
    const kMat = k % 2 === 0 ? koiGoldMat : koiWhiteMat;
    const kBody = new THREE.Mesh(koiBodyGeo, kMat);
    const kTail = new THREE.Mesh(koiTailGeo, teaCrimsonMat);
    kTail.position.set(0, 0, -0.36);
    koiGroup.add(kBody, kTail);
    westPierGroup.add(koiGroup);
    swimmingKoiList.push({
      mesh: koiGroup,
      orbitCenterX: -6.0 + ((k % 3) - 1) * 3.2,
      orbitCenterZ: ((k % 4) - 1.5) * 2.8,
      orbitRadius: 4.8 + (k % 4) * 1.4,
      speed: 0.42 + (k % 3) * 0.14,
      phase: k * 0.95,
    });
  }

  scene.add(westPierGroup);
  distanceCulledObjects.push({ obj: westPierGroup, cx: -123.0, cz: 48.0, radius: 28 });

  // --- G. MAGICAL STONE CIRCLE RELOCATED ATOP THE WOODED HILL at (-58.0, 128.0, y=14.5m) ---
  //     Surrounded by dense trees & ~140 woodland bushes with 1 single ordered stone-stepped path ascending from (-16, 112)!
  const circleY = MAGIC_STONE_CIRCLE_POS.height;
  const stoneCircleGroup = new THREE.Group();
  stoneCircleGroup.position.set(MAGIC_STONE_CIRCLE_POS.x, circleY, MAGIC_STONE_CIRCLE_POS.z);

  const monolithGeo = new THREE.BoxGeometry(1.25, 4.2, 0.78);
  perturbGeometryVertices(monolithGeo, 0.08, 1.5);
  monolithGeo.translate(0, 2.0, 0);
  const lintelGeo = new THREE.BoxGeometry(3.4, 0.75, 0.95);
  perturbGeometryVertices(lintelGeo, 0.06, 1.5);
  const altarGeo = new THREE.CylinderGeometry(1.5, 1.75, 0.72, 8);
  altarGeo.translate(0, 0.36, 0);
  const magicRuneRingGeo = new THREE.RingGeometry(0.85, 1.25, 24);
  magicRuneRingGeo.rotateX(-Math.PI / 2);
  const magicCrystalGeo = new THREE.OctahedronGeometry(0.45, 0);
  const magicRuneStripGeo = new THREE.BoxGeometry(0.18, 2.2, 0.82);
  const magicRuneMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  disposableGeometries.push(monolithGeo, lintelGeo, altarGeo, magicRuneRingGeo, magicCrystalGeo, magicRuneStripGeo);
  disposableMaterials.push(magicRuneMat);

  stoneCircleGroup.add(new THREE.Mesh(altarGeo, rockMat));
  const runeRingMesh = new THREE.Mesh(magicRuneRingGeo, magicRuneMat);
  runeRingMesh.position.set(0, 0.74, 0);
  const altarCrystalMesh = new THREE.Mesh(magicCrystalGeo, magicRuneMat);
  altarCrystalMesh.position.set(0, 1.35, 0);
  stoneCircleGroup.add(runeRingMesh, altarCrystalMesh);

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const mx = Math.cos(ang) * 6.5;
    const mz = Math.sin(ang) * 6.5;
    const mono = new THREE.Mesh(monolithGeo, rockMat);
    mono.position.set(mx, 0, mz);
    mono.rotation.y = -ang + Math.PI / 2;
    mono.castShadow = !isSoftwareGl;
    mono.receiveShadow = !isSoftwareGl;
    const runeStrip = new THREE.Mesh(magicRuneStripGeo, magicRuneMat);
    runeStrip.position.set(mx, 2.1, mz);
    runeStrip.rotation.y = -ang + Math.PI / 2;
    stoneCircleGroup.add(mono, runeStrip);

    if (i % 2 === 0) {
      const lintel = new THREE.Mesh(lintelGeo, rockMat);
      lintel.position.set(mx, 4.15, mz);
      lintel.rotation.y = -ang + Math.PI / 2;
      lintel.castShadow = !isSoftwareGl;
      stoneCircleGroup.add(lintel);
    }
  }

  // Ordered Stone Steps & Stone Lanterns along the single path ascending from (-16, 112) to (-58, 128)
  const hillStepGeo = new THREE.BoxGeometry(2.8, 0.28, 1.15);
  disposableGeometries.push(hillStepGeo);
  const pathAngle = Math.atan2(
    MAGIC_STONE_CIRCLE_POS.x - MAGIC_STONE_CIRCLE_POS.entryStartX,
    MAGIC_STONE_CIRCLE_POS.z - MAGIC_STONE_CIRCLE_POS.entryStartZ
  );
  const numHillSteps = 22;
  for (let s = 1; s <= numHillSteps; s++) {
    const t = s / (numHillSteps + 1);
    const sx =
      MAGIC_STONE_CIRCLE_POS.entryStartX +
      t * (MAGIC_STONE_CIRCLE_POS.x - MAGIC_STONE_CIRCLE_POS.entryStartX);
    const sz =
      MAGIC_STONE_CIRCLE_POS.entryStartZ +
      t * (MAGIC_STONE_CIRCLE_POS.z - MAGIC_STONE_CIRCLE_POS.entryStartZ);
    const sy = groundHeightAt(sx, sz);
    const stepMesh = new THREE.Mesh(hillStepGeo, rockMat);
    stepMesh.position.set(
      sx - MAGIC_STONE_CIRCLE_POS.x,
      sy - circleY + 0.04,
      sz - MAGIC_STONE_CIRCLE_POS.z
    );
    stepMesh.rotation.y = pathAngle;
    stoneCircleGroup.add(stepMesh);

    if (s % 5 === 0) {
      const perpX = Math.cos(pathAngle) * 1.85;
      const perpZ = -Math.sin(pathAngle) * 1.85;
      for (const side of [-1, 1]) {
        stoneCircleGroup.add(
          createLanternAssembly(
            sx - MAGIC_STONE_CIRCLE_POS.x + perpX * side,
            sy - circleY,
            sz - MAGIC_STONE_CIRCLE_POS.z + perpZ * side,
            false
          )
        );
      }
    }
  }

  // ~140 Dense Woodland Bushes (InstancedMesh = 1 draw call!) blanketing the Stone Circle Hill slopes,
  // leaving ONLY the single ordered stone-stepped path open!
  const hillBushGeo = new THREE.DodecahedronGeometry(1.05, 1);
  hillBushGeo.scale(1.25, 0.85, 1.25);
  hillBushGeo.translate(0, 0.65, 0);
  const hillBushMat = new THREE.MeshStandardMaterial({
    color: 0x2d5a27,
    roughness: 0.88,
  });
  disposableGeometries.push(hillBushGeo);
  disposableMaterials.push(hillBushMat);

  const maxHillBushes = 150;
  const hillBushInstanced = new THREE.InstancedMesh(hillBushGeo, hillBushMat, maxHillBushes);
  const bDummy = new THREE.Object3D();
  const bTint = new THREE.Color();
  let bIdx = 0;
  const bushRadii = [11.8, 15.2, 18.8, 22.5, 26.5, 30.5, 34.2];
  for (let rIdx = 0; rIdx < bushRadii.length; rIdx++) {
    const rad = bushRadii[rIdx];
    const count = 16 + rIdx * 3;
    for (let i = 0; i < count; i++) {
      if (bIdx >= maxHillBushes) break;
      const ang = (i / count) * Math.PI * 2 + rIdx * 0.51;
      const bx = MAGIC_STONE_CIRCLE_POS.x + Math.cos(ang) * rad;
      const bz = MAGIC_STONE_CIRCLE_POS.z + Math.sin(ang) * rad;
      // Check distance from the ordered ascent path segment (-16, 112) -> (-58, 128)
      const abx = MAGIC_STONE_CIRCLE_POS.x - MAGIC_STONE_CIRCLE_POS.entryStartX;
      const abz = MAGIC_STONE_CIRCLE_POS.z - MAGIC_STONE_CIRCLE_POS.entryStartZ;
      const tSeg = Math.max(
        0,
        Math.min(
          1,
          ((bx - MAGIC_STONE_CIRCLE_POS.entryStartX) * abx +
            (bz - MAGIC_STONE_CIRCLE_POS.entryStartZ) * abz) /
            (abx * abx + abz * abz)
        )
      );
      const distToPath = Math.hypot(
        bx - (MAGIC_STONE_CIRCLE_POS.entryStartX + tSeg * abx),
        bz - (MAGIC_STONE_CIRCLE_POS.entryStartZ + tSeg * abz)
      );
      if (distToPath < 3.6) continue; // Keep the single ordered path up the hill wide open!

      const by = groundHeightAt(bx, bz);
      bDummy.position.set(
        bx - MAGIC_STONE_CIRCLE_POS.x,
        by - circleY - 0.1,
        bz - MAGIC_STONE_CIRCLE_POS.z
      );
      bDummy.rotation.set(0, (i * 1.7 + rIdx) % (Math.PI * 2), 0);
      const sc = 0.85 + ((i * 11 + rIdx * 7) % 6) * 0.12;
      bDummy.scale.set(sc, sc * 0.92, sc);
      bDummy.updateMatrix();
      hillBushInstanced.setMatrixAt(bIdx, bDummy.matrix);
      bTint.setHSL(0.3 + ((i % 3) - 1) * 0.02, 0.52, 0.24 + (i % 4) * 0.03);
      hillBushInstanced.setColorAt(bIdx, bTint);
      bIdx++;
    }
  }
  hillBushInstanced.count = bIdx;
  hillBushInstanced.instanceMatrix.needsUpdate = true;
  if (hillBushInstanced.instanceColor) hillBushInstanced.instanceColor.needsUpdate = true;
  hillBushInstanced.computeBoundingSphere();
  stoneCircleGroup.add(hillBushInstanced);

  scene.add(stoneCircleGroup);
  distanceCulledObjects.push({
    obj: stoneCircleGroup,
    cx: MAGIC_STONE_CIRCLE_POS.x,
    cz: MAGIC_STONE_CIRCLE_POS.z,
    radius: 42,
  });

  // --- G2. UPGRADED SOUTHERN MOUNTAIN MINE & DEEP SUBTERRANEAN CRYSTAL CAVERN ---
  //     Real portal carved into the steep face of the 34.5m Southern Mountain at (-58, 232),
  //     30.5m sloping underground shaft descending 12m below ground (y = +2.65m -> -9.35m),
  //     opening into a Colossal 32m x 36m Subterranean Crystal & Gold Cavern Hall (z = 266..302, y = -9.35m)!
  const mineGroup = new THREE.Group();
  const mineX = SOUTHERN_MINE_POS.x; // -58.0
  const mineEntY = SOUTHERN_MINE_POS.entranceY; // +2.65
  const mineEntZ = SOUTHERN_MINE_POS.entranceZ; // 232.0
  const shaftStartZ = SOUTHERN_MINE_POS.shaftStartZ; // 235.5
  const shaftEndZ = SOUTHERN_MINE_POS.shaftEndZ; // 266.0
  const cavernBackZ = SOUTHERN_MINE_POS.cavernBackZ; // 302.0
  const cavernFloorY = SOUTHERN_MINE_POS.cavernFloorY; // -9.35
  const shaftLen = shaftEndZ - shaftStartZ; // 30.5m
  const shaftDrop = mineEntY - cavernFloorY; // 12.0m
  const shaftSlopeLen = Math.hypot(shaftLen, shaftDrop); // ~32.78m
  const shaftAngle = Math.atan2(shaftDrop, shaftLen); // ~0.3748 rad
  // Position mineGroup at (mineX = -58, y = 0, z = mineEntZ = 232.0) so localY == worldY and localZ == worldZ - 232.0
  mineGroup.position.set(mineX, 0, mineEntZ);

  const mineDarkRockMat = new THREE.MeshStandardMaterial({
    color: 0x36332f,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.12,
    roughness: 0.9,
  });
  const mineDeepSlateMat = new THREE.MeshStandardMaterial({
    color: 0x262422,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.14,
    roughness: 0.94,
  });
  const mineGoldOreMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.24,
    metalness: 0.88,
  });
  const mineEmeraldCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x059669,
    emissiveIntensity: 1.45,
    roughness: 0.18,
  });
  const mineAmethystCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x7e22ce,
    emissiveIntensity: 1.45,
    roughness: 0.18,
  });
  const mineSapphireCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.45,
    roughness: 0.18,
  });
  const mineMoltenCoalMat = new THREE.MeshStandardMaterial({
    color: 0xff5500,
    emissive: 0xff3300,
    emissiveIntensity: 2.8,
    roughness: 0.4,
  });
  disposableMaterials.push(
    mineDarkRockMat,
    mineDeepSlateMat,
    mineGoldOreMat,
    mineEmeraldCrystalMat,
    mineAmethystCrystalMat,
    mineSapphireCrystalMat,
    mineMoltenCoalMat
  );

  // --- 1) MOUNTAIN CLIFF PORTAL & VESTIBULE (z = 231.0..235.5, localZ = -1.0..+3.5, y = 2.65m) ---
  const portalVestibuleFloorGeo = new THREE.BoxGeometry(6.8, 0.4, 5.8);
  const portalSideWallGeo = new THREE.BoxGeometry(0.45, 4.5, 4.6);
  const portalHeadwallRockGeo = new THREE.BoxGeometry(6.8, 0.45, 4.8);
  const portalTimberPillarGeo = new THREE.BoxGeometry(0.58, 4.5, 0.58);
  portalTimberPillarGeo.translate(0, 2.25, 0);
  const portalTimberLintelGeo = new THREE.BoxGeometry(7.2, 0.62, 0.72);
  const portalSignBoardGeo = new THREE.BoxGeometry(3.6, 0.72, 0.18);

  // --- 2) 30.5m DESCENDING UNDERGROUND SHAFT GEOMETRIES (localZ = 3.5..34.0, y = +2.65 -> -9.35) ---
  const shaftSlopeFloorGeo = new THREE.BoxGeometry(6.8, 0.45, shaftSlopeLen + 1.2);
  const shaftSlopeCeilingGeo = new THREE.BoxGeometry(8.6, 1.8, shaftSlopeLen + 2.4);
  const shaftSlopeWallGeo = new THREE.BoxGeometry(1.4, 6.2, shaftSlopeLen + 1.8);
  const shaftStepPlankGeo = new THREE.BoxGeometry(2.6, 0.22, 0.68);
  const shaftSlopeRailGeo = new THREE.BoxGeometry(0.11, 0.12, shaftSlopeLen + 3.2);
  const mineSleeperGeo = new THREE.BoxGeometry(1.85, 0.09, 0.26);
  const mineTimberPostGeo = new THREE.BoxGeometry(0.42, 4.65, 0.42);
  mineTimberPostGeo.translate(0, 2.325, 0);
  const mineTimberBeamGeo = new THREE.BoxGeometry(6.7, 0.46, 0.46);

  // --- 3) COLOSSAL EXPANDED 64m x 76m 3-WING SUBTERRANEAN CAVERN COMPLEX (localZ = 34.0..110.0, world z = 266..342, y = -9.35m) ---
  //     - West Wing (localX in [-30, -14]): Subterranean Bioluminescent Crystal Lake, Waterfall Grotto & Miner's Pier
  //     - Central Hall (localX in [-14, +14]): Grand Mining Cathedral, Walkable Elevated Timber Catwalk (y = -5.15m), Rotating Ore-Crusher Wheel & 8-Cart Railway
  //     - East Wing & Deep South Vault (localX in [+14, +30] & localZ in [94, 109]): Twin Molten Gold Blast Furnaces, Smelting Foundry & Royal Treasure Vault!
  const cavernLen = cavernBackZ - shaftEndZ; // 76.0m (localZ = 34.0..110.0)
  const cavernWidth = SOUTHERN_MINE_POS.cavernHalfW * 2; // 64.0m (localX in [-32, +32])
  const cavernHeight = SOUTHERN_MINE_POS.cavernHeight; // 10.2m (y = -9.35m to +0.85m, completely below the mountain surface!)
  const cavernFloorGeo = new THREE.BoxGeometry(cavernWidth + 4.0, 0.8, cavernLen + 4.0);
  const cavernCeilingGeo = new THREE.BoxGeometry(cavernWidth + 5.0, 1.4, cavernLen + 5.0);
  const cavernSideWallGeo = new THREE.BoxGeometry(2.4, cavernHeight + 1.2, cavernLen + 4.0);
  const cavernBackWallGeo = new THREE.BoxGeometry(cavernWidth + 5.0, cavernHeight + 1.2, 2.6);
  const cavernNorthFlankWallGeo = new THREE.BoxGeometry(29.8, cavernHeight + 1.2, 2.4);
  const cavernNorthUpperWallGeo = new THREE.BoxGeometry(7.2, 5.6, 2.4);
  const cavernStonePillarGeo = new THREE.CylinderGeometry(1.15, 1.45, cavernHeight, 8);
  cavernStonePillarGeo.translate(0, cavernHeight * 0.5, 0);
  const cavernPillarCapGeo = new THREE.BoxGeometry(3.1, 0.68, 3.1);
  const cavernRoofArchBeamGeo = new THREE.BoxGeometry(28.5, 0.58, 0.68);
  const cavernStalactiteGeo = new THREE.ConeGeometry(0.82, 3.1, 6);
  cavernStalactiteGeo.rotateX(Math.PI);
  const cavernRailStraightGeo = new THREE.BoxGeometry(0.11, 0.11, 66.0);
  const cavernRailBranchGeo = new THREE.BoxGeometry(0.11, 0.11, 22.0);
  const mineCartBodyGeo = new THREE.BoxGeometry(1.42, 0.88, 2.05);
  const mineCartWheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.12, 10);
  mineCartWheelGeo.rotateZ(Math.PI / 2);
  const crystalSpireGeo = new THREE.ConeGeometry(0.56, 2.8, 6);
  crystalSpireGeo.translate(0, 1.3, 0);
  const mineCrystalClusterGeo = new THREE.OctahedronGeometry(0.46, 0);
  const mineGoldOreGeo = new THREE.DodecahedronGeometry(0.32, 0);
  const forgeBrazierBaseGeo = new THREE.CylinderGeometry(1.35, 1.55, 0.95, 10);
  forgeBrazierBaseGeo.translate(0, 0.475, 0);
  const forgeCoalMoundGeo = new THREE.SphereGeometry(1.12, 10, 8);
  forgeCoalMoundGeo.scale(1.0, 0.45, 1.0);
  const scaffoldDeckGeo = new THREE.BoxGeometry(4.5, 0.24, 18.0);
  const crossBridgeDeckGeo = new THREE.BoxGeometry(27.0, 0.24, 4.5);
  const scaffoldLegGeo = new THREE.CylinderGeometry(0.18, 0.22, 4.2, 8);
  scaffoldLegGeo.translate(0, 2.1, 0);
  const craneArmGeo = new THREE.BoxGeometry(3.6, 0.30, 0.30);
  const goldIngotGeo = new THREE.BoxGeometry(0.46, 0.18, 0.24);
  const blastFurnaceBodyGeo = new THREE.CylinderGeometry(2.2, 2.8, 8.6, 10);
  blastFurnaceBodyGeo.translate(0, 4.3, 0);
  const moltenCrucibleGeo = new THREE.CylinderGeometry(1.6, 1.2, 1.4, 12);
  moltenCrucibleGeo.translate(0, 0.7, 0);
  const subLakeWaterGeo = new THREE.PlaneGeometry(14.5, 50.0);
  subLakeWaterGeo.rotateX(-Math.PI / 2);
  const subWaterfallGeo = new THREE.PlaneGeometry(3.6, 9.2);
  const oreWheelRimGeo = new THREE.TorusGeometry(2.6, 0.22, 8, 20);

  disposableGeometries.push(
    portalVestibuleFloorGeo,
    portalSideWallGeo,
    portalHeadwallRockGeo,
    portalTimberPillarGeo,
    portalTimberLintelGeo,
    portalSignBoardGeo,
    shaftSlopeFloorGeo,
    shaftSlopeCeilingGeo,
    shaftSlopeWallGeo,
    shaftStepPlankGeo,
    shaftSlopeRailGeo,
    mineSleeperGeo,
    mineTimberPostGeo,
    mineTimberBeamGeo,
    cavernFloorGeo,
    cavernCeilingGeo,
    cavernSideWallGeo,
    cavernBackWallGeo,
    cavernNorthFlankWallGeo,
    cavernNorthUpperWallGeo,
    cavernStonePillarGeo,
    cavernPillarCapGeo,
    cavernRoofArchBeamGeo,
    cavernStalactiteGeo,
    cavernRailStraightGeo,
    cavernRailBranchGeo,
    mineCartBodyGeo,
    mineCartWheelGeo,
    crystalSpireGeo,
    mineCrystalClusterGeo,
    mineGoldOreGeo,
    forgeBrazierBaseGeo,
    forgeCoalMoundGeo,
    scaffoldDeckGeo,
    crossBridgeDeckGeo,
    scaffoldLegGeo,
    craneArmGeo,
    goldIngotGeo,
    blastFurnaceBodyGeo,
    moltenCrucibleGeo,
    subLakeWaterGeo,
    subWaterfallGeo,
    oreWheelRimGeo
  );

  // Build 1: Mountain Cliff Portal & Vestibule (localZ = 0.0..+4.2, y = 2.65m..7.05m — 100% flush inside the mountain cutout!)
  const vestibuleFloor = new THREE.Mesh(portalVestibuleFloorGeo, mineDarkRockMat);
  vestibuleFloor.position.set(0, mineEntY - 0.2, 1.8);
  const portalWestWall = new THREE.Mesh(portalSideWallGeo, mineDarkRockMat);
  portalWestWall.position.set(-3.22, mineEntY + 2.15, 2.3);
  const portalEastWall = new THREE.Mesh(portalSideWallGeo, mineDarkRockMat);
  portalEastWall.position.set(3.22, mineEntY + 2.15, 2.3);
  const portalHeadwall = new THREE.Mesh(portalHeadwallRockGeo, mineDarkRockMat);
  portalHeadwall.position.set(0, mineEntY + 4.38, 2.4);
  mineGroup.add(vestibuleFloor, portalWestWall, portalEastWall, portalHeadwall);

  // Monumental Double-Timber Mine Entrance Frame (ח-frame) flush with the hole in the mountain face (localZ = 0.2 & +2.0)
  for (const pz of [0.2, 2.0]) {
    for (const px of [-3.05, 3.05]) {
      const pPost = new THREE.Mesh(portalTimberPillarGeo, barkMat);
      pPost.position.set(px, mineEntY, pz);
      mineGroup.add(pPost);
    }
    const pLintel = new THREE.Mesh(portalTimberLintelGeo, timberMat);
    pLintel.position.set(0, mineEntY + 4.35, pz);
    mineGroup.add(pLintel);
  }
  const portalSign = new THREE.Mesh(portalSignBoardGeo, mineGoldOreMat);
  portalSign.position.set(0, mineEntY + 4.38, -0.18);
  mineGroup.add(
    portalSign,
    createLanternAssembly(-2.55, mineEntY + 3.1, 0.0, true),
    createLanternAssembly(2.55, mineEntY + 3.1, 0.0, false)
  );

  // Build 2: 30.5m Sloping Underground Mine Shaft descending 12m (localZ = 3.5..34.0, y = +2.65 -> -9.35)
  const shaftMidLocalZ = (3.5 + 34.0) * 0.5; // 18.75
  const shaftMidY = (mineEntY + cavernFloorY) * 0.5; // -3.35

  const shaftFloorMesh = new THREE.Mesh(shaftSlopeFloorGeo, mineDarkRockMat);
  shaftFloorMesh.position.set(0, shaftMidY - 0.24, shaftMidLocalZ);
  shaftFloorMesh.rotation.x = shaftAngle;

  const shaftCeilingMesh = new THREE.Mesh(shaftSlopeCeilingGeo, mineDarkRockMat);
  shaftCeilingMesh.position.set(0, shaftMidY + 5.15, shaftMidLocalZ);
  shaftCeilingMesh.rotation.x = shaftAngle;

  const shaftWestWallMesh = new THREE.Mesh(shaftSlopeWallGeo, mineDarkRockMat);
  shaftWestWallMesh.position.set(-3.65, shaftMidY + 2.35, shaftMidLocalZ);
  shaftWestWallMesh.rotation.x = shaftAngle;

  const shaftEastWallMesh = new THREE.Mesh(shaftSlopeWallGeo, mineDarkRockMat);
  shaftEastWallMesh.position.set(3.65, shaftMidY + 2.35, shaftMidLocalZ);
  shaftEastWallMesh.rotation.x = shaftAngle;

  mineGroup.add(shaftFloorMesh, shaftCeilingMesh, shaftWestWallMesh, shaftEastWallMesh);

  // Sloped Iron Minecart Rails down the center of the shaft + Flanking Wooden Walkway Steps on both sides!
  for (const rx of [-0.55, 0.55]) {
    const sRail = new THREE.Mesh(shaftSlopeRailGeo, darkIronMat);
    sRail.position.set(rx, shaftMidY + 0.08, shaftMidLocalZ - 0.4);
    sRail.rotation.x = shaftAngle;
    mineGroup.add(sRail);
  }
  const numShaftSteps = 44;
  for (let s = 0; s <= numShaftSteps; s++) {
    const t = s / numShaftSteps;
    const sz = 3.5 + t * shaftLen;
    const sy = mineEntY - t * shaftDrop;
    const sleeper = new THREE.Mesh(mineSleeperGeo, barkMat);
    sleeper.position.set(0, sy + 0.03, sz);
    sleeper.rotation.x = shaftAngle;
    mineGroup.add(sleeper);

    if (s % 2 === 0) {
      for (const sideX of [-1.85, 1.85]) {
        const stepMesh = new THREE.Mesh(shaftStepPlankGeo, timberMat);
        stepMesh.position.set(sideX, sy - 0.04, sz);
        mineGroup.add(stepMesh);
      }
    }
  }

  // 9 Heavy Timber Support Frames (ח-frames) + Hanging Lanterns descending the shaft (clean stone & timber ramp with zero gem clutter!)
  for (let f = 0; f < 9; f++) {
    const t = f / 8;
    const fz = 3.8 + t * (shaftLen - 0.8);
    const fy = mineEntY - t * (shaftDrop - 0.3);
    const postL = new THREE.Mesh(mineTimberPostGeo, barkMat);
    postL.position.set(-2.9, fy, fz);
    const postR = new THREE.Mesh(mineTimberPostGeo, barkMat);
    postR.position.set(2.9, fy, fz);
    const beamTop = new THREE.Mesh(mineTimberBeamGeo, timberMat);
    beamTop.position.set(0, fy + 4.55, fz);
    mineGroup.add(postL, postR, beamTop);

    if (f % 2 === 0) {
      mineGroup.add(
        createLanternAssembly(f % 4 === 0 ? -2.35 : 2.35, fy + 3.25, fz, f === 4)
      );
    }
  }

  // Build 3: MULTI-ROOM & CORRIDOR SUBTERRANEAN COMPLEX (104m x 76m: 4 Distinct Rooms Connected by 5 Framed Corridors!)
  //   - Room 1 (Central Junction Hall): lx in [-14, +14], lz in [34, 64]
  //   - Corridor 1 (West Timber Tunnel): lx in [-26, -14], lz in [45, 53] -> Room 2 (West Crystal Lake Chamber: lx in [-52, -26], lz in [36, 96])
  //   - Corridor 2 (East Stone Foundry Passage): lx in [+14, +26], lz in [45, 53] -> Room 3 (East Smelting Foundry Hall: lx in [+26, +52], lz in [36, 96])
  //   - Corridor 3 (Central South Pillared Corridor): lx in [-4.5, +4.5], lz in [64, 78] -> Room 4 (Deep South Treasure Vault: lx in [-16, +16], lz in [78, 110])
  //   - Corridors 4 & 5 (SW & SE Loop Passages): lx in [-26, -16] & [+16, +26], lz in [85, 93]
  const cavernStartLocalZ = 34.0; // world z = 266.0
  const cavernEndLocalZ = 110.0;  // world z = 342.0
  const cavernMidLocalZ = (cavernStartLocalZ + cavernEndLocalZ) * 0.5; // 72.0 (world z = 304.0)

  // Floor & Ceiling spanning the full 104m-wide multi-room complex (with a carved 2.0m-deep basin in Room 2 for the swimmable Crystal Lake!)
  const mainEastFloorMesh = new THREE.Mesh(new THREE.BoxGeometry(79.0, 0.8, 78.0), mineDeepSlateMat);
  mainEastFloorMesh.position.set(13.5, cavernFloorY - 0.4, 72.0);
  const westRoomSouthFloorMesh = new THREE.Mesh(new THREE.BoxGeometry(28.0, 0.8, 13.0), mineDeepSlateMat);
  westRoomSouthFloorMesh.position.set(-39.0, cavernFloorY - 0.4, 90.5);
  const westRoomNorthFloorMesh = new THREE.Mesh(new THREE.BoxGeometry(28.0, 0.8, 6.0), mineDeepSlateMat);
  westRoomNorthFloorMesh.position.set(-39.0, cavernFloorY - 0.4, 38.0);
  const westRoomEastWalkwayMesh = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.8, 44.0), mineDeepSlateMat);
  westRoomEastWalkwayMesh.position.set(-29.5, cavernFloorY - 0.4, 62.5);
  const westLakeBasinFloorMesh = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.8, 46.0), mineDeepSlateMat);
  westLakeBasinFloorMesh.position.set(-42.0, cavernFloorY - 2.25, 62.5);

  const cCeiling = new THREE.Mesh(new THREE.BoxGeometry(108.0, 1.4, 80.0), mineDeepSlateMat);
  cCeiling.position.set(0, cavernFloorY + cavernHeight + 0.65, cavernMidLocalZ);

  // Outer perimeter walls of Room 1, Room 2 (-52.8), Room 3 (+52.8), and Room 4 (lz = 110.8)
  const cWestWall = new THREE.Mesh(new THREE.BoxGeometry(2.4, cavernHeight + 1.2, 64.0), mineDeepSlateMat);
  cWestWall.position.set(-53.0, cavernFloorY + cavernHeight * 0.5, 66.0);
  const cEastWall = new THREE.Mesh(new THREE.BoxGeometry(2.4, cavernHeight + 1.2, 64.0), mineDeepSlateMat);
  cEastWall.position.set(53.0, cavernFloorY + cavernHeight * 0.5, 66.0);
  const r2NorthWall = new THREE.Mesh(new THREE.BoxGeometry(28.0, cavernHeight + 1.2, 2.2), mineDeepSlateMat);
  r2NorthWall.position.set(-39.0, cavernFloorY + cavernHeight * 0.5, 35.0);
  const r2SouthWall = new THREE.Mesh(new THREE.BoxGeometry(28.0, cavernHeight + 1.2, 2.2), mineDeepSlateMat);
  r2SouthWall.position.set(-39.0, cavernFloorY + cavernHeight * 0.5, 97.0);
  const r3NorthWall = new THREE.Mesh(new THREE.BoxGeometry(28.0, cavernHeight + 1.2, 2.2), mineDeepSlateMat);
  r3NorthWall.position.set(39.0, cavernFloorY + cavernHeight * 0.5, 35.0);
  const r3SouthWall = new THREE.Mesh(new THREE.BoxGeometry(28.0, cavernHeight + 1.2, 2.2), mineDeepSlateMat);
  r3SouthWall.position.set(39.0, cavernFloorY + cavernHeight * 0.5, 97.0);
  const cBackWall = new THREE.Mesh(new THREE.BoxGeometry(36.0, cavernHeight + 1.2, 2.6), mineDeepSlateMat);
  cBackWall.position.set(0, cavernFloorY + cavernHeight * 0.5, cavernEndLocalZ + 1.0);
  const cNorthWestWall = new THREE.Mesh(new THREE.BoxGeometry(11.6, cavernHeight + 1.2, 2.4), mineDeepSlateMat);
  cNorthWestWall.position.set(-9.0, cavernFloorY + cavernHeight * 0.5, cavernStartLocalZ);
  const cNorthEastWall = new THREE.Mesh(new THREE.BoxGeometry(11.6, cavernHeight + 1.2, 2.4), mineDeepSlateMat);
  cNorthEastWall.position.set(9.0, cavernFloorY + cavernHeight * 0.5, cavernStartLocalZ);
  const cNorthUpperWall = new THREE.Mesh(cavernNorthUpperWallGeo, mineDeepSlateMat);
  cNorthUpperWall.position.set(0, cavernFloorY + cavernHeight - 2.4, cavernStartLocalZ);

  mineGroup.add(
    mainEastFloorMesh,
    westRoomSouthFloorMesh,
    westRoomNorthFloorMesh,
    westRoomEastWalkwayMesh,
    westLakeBasinFloorMesh,
    cCeiling,
    cWestWall,
    cEastWall,
    r2NorthWall,
    r2SouthWall,
    r3NorthWall,
    r3SouthWall,
    cBackWall,
    cNorthWestWall,
    cNorthEastWall,
    cNorthUpperWall
  );

  // SOLID ROCK PARTITION MASSES SEPARATING THE 4 ROOMS & FORMING THE 5 CONNECTING CORRIDORS
  // (Matches SOLID_BUILDING_BOXES in terrainMath.ts 100%!)
  const partitionBlocks: Array<[number, number, number, number]> = [
    // West Partition Blocks between Room 1 (x = -14) & Room 2 (x = -26), leaving Corridor 1 (lz 45..53) & Corridor 4 (lz 85..93) open
    [-20.0, 39.5, 12.0, 11.0],
    [-20.0, 69.0, 12.0, 32.0],
    [-21.0, 101.8, 10.0, 17.5],
    // East Partition Blocks between Room 1 (x = +14) & Room 3 (x = +26), leaving Corridor 2 (lz 45..53) & Corridor 5 (lz 85..93) open
    [20.0, 39.5, 12.0, 11.0],
    [20.0, 69.0, 12.0, 32.0],
    [21.0, 101.8, 10.0, 17.5],
    // Central Partition Blocks between Room 1 (lz = 64) & Room 4 (lz = 78), leaving Central South Corridor 3 (lx in [-4.5, +4.5]) open
    [-10.25, 71.0, 11.5, 14.0],
    [10.25, 71.0, 11.5, 14.0],
  ];
  for (const [px, pz, pw, pd] of partitionBlocks) {
    const pGeo = new THREE.BoxGeometry(pw, cavernHeight + 0.6, pd);
    disposableGeometries.push(pGeo);
    const pMesh = new THREE.Mesh(pGeo, mineDarkRockMat);
    pMesh.position.set(px, cavernFloorY + cavernHeight * 0.5, pz);
    mineGroup.add(pMesh);
  }

  // Lowered 5.4m Corridor Ceilings & Timber/Stone Shoring Frames inside all 5 Connecting Corridors!
  const corrHeaderH = cavernHeight - SOUTHERN_MINE_POS.corridorHeight; // 4.8m rock header above 5.4m corridor ceiling
  const corridorHeaders: Array<[number, number, number, number]> = [
    [-20.0, 49.0, 12.4, 8.2], // Corridor 1 (Room 1 -> Room 2 West Crystal Lake)
    [20.0, 49.0, 12.4, 8.2],  // Corridor 2 (Room 1 -> Room 3 East Smelting Foundry)
    [0.0, 71.0, 9.2, 14.4],   // Corridor 3 (Room 1 -> Room 4 Deep South Treasure Vault)
    [-21.0, 89.0, 10.4, 8.2], // Corridor 4 (Room 2 -> Room 4 SW Loop Passage)
    [21.0, 89.0, 10.4, 8.2],  // Corridor 5 (Room 3 -> Room 4 SE Loop Passage)
  ];
  for (const [cx, cz, cw, cd] of corridorHeaders) {
    const hGeo = new THREE.BoxGeometry(cw, corrHeaderH, cd);
    disposableGeometries.push(hGeo);
    const hMesh = new THREE.Mesh(hGeo, mineDeepSlateMat);
    hMesh.position.set(cx, cavernFloorY + SOUTHERN_MINE_POS.corridorHeight + corrHeaderH * 0.5, cz);
    mineGroup.add(hMesh);
  }

  // Timber & Stone Shoring Arch Frames + Warm Hanging Lanterns along Corridors 1, 2, 3, 4 & 5
  const corrPostGeo = new THREE.BoxGeometry(0.55, 5.4, 0.55);
  corrPostGeo.translate(0, 2.7, 0);
  const corrBeamEWGeo = new THREE.BoxGeometry(0.58, 0.58, 8.0);
  const corrBeamNSGeo = new THREE.BoxGeometry(9.0, 0.58, 0.58);
  disposableGeometries.push(corrPostGeo, corrBeamEWGeo, corrBeamNSGeo);

  // East-West Corridors 1, 2, 4, 5 frames
  for (const [cz, xList] of [
    [49.0, [-25.2, -20.0, -14.8, 14.8, 20.0, 25.2]],
    [89.0, [-25.2, -21.0, -16.8, 16.8, 21.0, 25.2]],
  ] as const) {
    for (const fx of xList) {
      const pN = new THREE.Mesh(corrPostGeo, barkMat);
      pN.position.set(fx, cavernFloorY, cz - 3.7);
      const pS = new THREE.Mesh(corrPostGeo, barkMat);
      pS.position.set(fx, cavernFloorY, cz + 3.7);
      const bTop = new THREE.Mesh(corrBeamEWGeo, timberMat);
      bTop.position.set(fx, cavernFloorY + 5.2, cz);
      mineGroup.add(
        pN,
        pS,
        bTop,
        createLanternAssembly(fx, cavernFloorY + 3.8, cz - 3.2, Math.abs(fx) === 20.0)
      );
    }
  }
  // North-South Central Corridor 3 frames (lx in [-4.5, +4.5], lz in [64, 78])
  for (const fz of [64.6, 68.8, 73.2, 77.4]) {
    const pW = new THREE.Mesh(corrPostGeo, barkMat);
    pW.position.set(-4.15, cavernFloorY, fz);
    const pE = new THREE.Mesh(corrPostGeo, barkMat);
    pE.position.set(4.15, cavernFloorY, fz);
    const bTop = new THREE.Mesh(corrBeamNSGeo, timberMat);
    bTop.position.set(0, cavernFloorY + 5.2, fz);
    mineGroup.add(
      pW,
      pE,
      bTop,
      createLanternAssembly(fz % 2 > 1 ? -3.6 : 3.6, cavernFloorY + 3.8, fz, fz === 68.8)
    );
  }

  // Cathedral Stone Pillars inside Room 1 (Central Hall) & Room 4 (Royal Treasure Vault)
  for (const pzLocal of [39.0, 58.0, 84.0, 98.0]) {
    const archBeam = new THREE.Mesh(cavernRoofArchBeamGeo, timberMat);
    archBeam.position.set(0, cavernFloorY + cavernHeight - 0.35, pzLocal);
    mineGroup.add(archBeam);
    for (const px of [-12.6, 12.6]) {
      const pillar = new THREE.Mesh(cavernStonePillarGeo, mineDarkRockMat);
      pillar.position.set(px, cavernFloorY, pzLocal);
      const baseCap = new THREE.Mesh(cavernPillarCapGeo, timberMat);
      baseCap.position.set(px, cavernFloorY + 0.34, pzLocal);
      const topCap = new THREE.Mesh(cavernPillarCapGeo, timberMat);
      topCap.position.set(px, cavernFloorY + cavernHeight - 0.35, pzLocal);
      mineGroup.add(
        pillar,
        baseCap,
        topCap,
        createLanternAssembly(px + (px < 0 ? 1.35 : -1.35), cavernFloorY + 3.4, pzLocal, false)
      );
    }
  }

  // 42 Hanging Rock Stalactites & Glowing Crystal Stalactites across all 4 Rooms
  for (let st = 0; st < 42; st++) {
    const stX = ((st * 19) % 94) - 47.0;
    const stZ = cavernStartLocalZ + 4.0 + ((st * 17) % 70);
    if (Math.abs(stX) < 5.0 && stZ < cavernStartLocalZ + 9.0) continue;
    if (Math.abs(stX) >= 13.0 && Math.abs(stX) <= 27.0) continue;
    const isCrystalStal = st % 4 === 0;
    const stalactite = new THREE.Mesh(
      cavernStalactiteGeo,
      isCrystalStal
        ? st % 8 === 0
          ? mineSapphireCrystalMat
          : mineAmethystCrystalMat
        : mineDarkRockMat
    );
    const sc = 0.85 + (st % 4) * 0.35;
    stalactite.position.set(stX, cavernFloorY + cavernHeight - 0.95 * sc, stZ);
    stalactite.scale.set(sc, sc * 1.2, sc);
    mineGroup.add(stalactite);
  }

  // --- ROOM 2 (WEST CHAMBER, lx in [-52, -26], lz in [36, 96]):
  //     SWIMMABLE BIOLUMINESCENT CRYSTAL LAKE (with animated waves!), WATERFALL GROTTO & MINER'S PIER ---
  const subLakeMat = new THREE.MeshPhysicalMaterial({
    color: 0x0ea5e9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.55,
    roughness: 0.06,
    metalness: 0.15,
    clearcoat: isSoftwareGl ? 0 : 0.92,
    transparent: true,
    opacity: 0.86,
  });
  attachAnimatedWaterWaveShader(subLakeMat, 0.042, 0.085);
  const subWaterfallMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.15,
    roughness: 0.2,
    transparent: true,
    opacity: 0.84,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(subLakeMat, subWaterfallMat);

  const subLakeAnimGeo = new THREE.PlaneGeometry(18.5, 44.0, 24, 36);
  subLakeAnimGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(subLakeAnimGeo);
  const subLakeMesh = new THREE.Mesh(subLakeAnimGeo, subLakeMat);
  subLakeMesh.position.set(-41.5, cavernFloorY + 0.05, 62.5);
  mineGroup.add(subLakeMesh);

  // Basalt stone shoreline rim around the Underground Crystal Lake in Room 2
  for (let r = 0; r < 26; r++) {
    const ang = (r / 26) * Math.PI * 2;
    const rx = -41.5 + Math.cos(ang) * 8.6;
    const rz = 62.5 + Math.sin(ang) * 21.8;
    const rimRock = new THREE.Mesh(mineGoldOreGeo, mineDarkRockMat);
    rimRock.scale.set(3.2, 1.2, 3.2);
    rimRock.position.set(rx, cavernFloorY + 0.15, rz);
    mineGroup.add(rimRock);
  }

  // Subterranean Waterfall cascading down the Far-West Room 2 Wall at localX = -51.2, localZ = 62.5
  const subWaterfallMesh = new THREE.Mesh(subWaterfallGeo, subWaterfallMat);
  subWaterfallMesh.position.set(-51.2, cavernFloorY + 4.6, 62.5);
  subWaterfallMesh.rotation.y = Math.PI / 2;
  subWaterfallMesh.rotation.z = -0.12;
  const subPlungeFoam = new THREE.Mesh(forgeCoalMoundGeo, subWaterfallMat);
  subPlungeFoam.scale.set(2.4, 0.35, 3.2);
  subPlungeFoam.position.set(-49.6, cavernFloorY + 0.14, 62.5);
  const subLakeLight = new THREE.PointLight(0x38bdf8, 3.2, 38, 1.35);
  subLakeLight.position.set(-40.5, cavernFloorY + 4.2, 62.5);
  lanternLights.push(subLakeLight);
  mineGroup.add(subWaterfallMesh, subPlungeFoam, subLakeLight);

  // Wooden Miner's Dock Pier jutting into the Room 2 Crystal Lake at localX = -32.5, localZ = 49.0 (right across from Corridor 1!)
  const subPierDeck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.22, 3.6), timberMat);
  subPierDeck.position.set(-32.2, cavernFloorY + 0.32, 49.0);
  mineGroup.add(
    subPierDeck,
    createLanternAssembly(-35.0, cavernFloorY + 1.6, 47.4, false),
    createLanternAssembly(-35.0, cavernFloorY + 1.6, 50.6, false)
  );

  // --- WING B (CENTER ROOM 1): WALKABLE ELEVATED TIMBER CATWALK RING & OVERLOOK BRIDGE (y = -5.15m = cavernFloorY + 4.2m!) ---
  //     100% contained inside Room 1 (localZ in [44.5, 62.5], matching southernMineWalkableHeightAt in terrainMath.ts with zero wall clipping!)
  const catwalkLocalY = 4.2; // cavernFloorY + 4.2 = -5.15m
  // 1) Walkable Timber Staircase ascending from cavernFloorY (at localZ = 35.5) to catwalkY (at localZ = 44.5) along localX = -10.9
  for (let s = 0; s <= 18; s++) {
    const t = s / 18;
    const stepMesh = new THREE.Mesh(shaftStepPlankGeo, timberMat);
    stepMesh.scale.x = 1.22;
    stepMesh.position.set(-10.9, cavernFloorY + t * catwalkLocalY - 0.08, 35.5 + t * 9.0);
    mineGroup.add(stepMesh);
  }
  // 2) West Overlook Catwalk (localX = -11.25, localZ in [44.5, 62.5], length 18.0m cleanly inside Room 1!)
  const westCatwalkDeck = new THREE.Mesh(scaffoldDeckGeo, timberMat);
  westCatwalkDeck.position.set(-11.25, cavernFloorY + catwalkLocalY - 0.12, 53.5);
  // 3) East Overlook Catwalk (localX = +11.25, localZ in [44.5, 62.5], length 18.0m cleanly inside Room 1!)
  const eastCatwalkDeck = new THREE.Mesh(scaffoldDeckGeo, timberMat);
  eastCatwalkDeck.position.set(11.25, cavernFloorY + catwalkLocalY - 0.12, 53.5);
  // 4) South Cross-Cavern Suspension Bridge (localX in [-13.5, +13.5], localZ = 60.5 cleanly inside Room 1!)
  const southCrossBridge = new THREE.Mesh(crossBridgeDeckGeo, timberMat);
  southCrossBridge.position.set(0, cavernFloorY + catwalkLocalY - 0.12, 60.5);
  mineGroup.add(westCatwalkDeck, eastCatwalkDeck, southCrossBridge);

  // Support legs, wooden safety handrails, and lanterns along the Room 1 Elevated Catwalks & Cross-Bridge
  const catwalkRailLongGeo = new THREE.BoxGeometry(0.14, 0.95, 18.0);
  const catwalkRailCrossGeo = new THREE.BoxGeometry(22.0, 0.95, 0.14);
  disposableGeometries.push(catwalkRailLongGeo, catwalkRailCrossGeo);
  for (const side of [-1, 1]) {
    const outerRail = new THREE.Mesh(catwalkRailLongGeo, barkMat);
    outerRail.position.set(side * 13.35, cavernFloorY + catwalkLocalY + 0.45, 53.5);
    mineGroup.add(outerRail);
    for (const lz of [45.5, 53.5, 61.5]) {
      for (const lxOff of [-1.8, 1.8]) {
        const leg = new THREE.Mesh(scaffoldLegGeo, barkMat);
        leg.position.set(side * 11.25 + lxOff, cavernFloorY, lz);
        mineGroup.add(leg);
      }
      if (lz === 53.5) {
        mineGroup.add(createLanternAssembly(side * 9.3, cavernFloorY + catwalkLocalY + 1.2, lz, false));
      }
    }
  }
  const bridgeNorthRail = new THREE.Mesh(catwalkRailCrossGeo, barkMat);
  bridgeNorthRail.position.set(0, cavernFloorY + catwalkLocalY + 0.45, 58.35);
  const bridgeSouthRail = new THREE.Mesh(catwalkRailCrossGeo, barkMat);
  bridgeSouthRail.position.set(0, cavernFloorY + catwalkLocalY + 0.45, 62.65);
  mineGroup.add(bridgeNorthRail, bridgeSouthRail);

  // Giant Rotating Timber & Iron Hydro-Powered Waterwheel in Room 2 (West Crystal Lake Chamber)
  // Positioned logically at localX = -48.2, localZ = 62.5 directly beneath the subterranean waterfall (localX = -51.2, localZ = 62.5) with zero wall overlap!
  const waterwheelStandGroup = new THREE.Group();
  waterwheelStandGroup.position.set(-48.2, cavernFloorY, 62.5);
  for (const sideX of [-0.75, 0.75]) {
    const standPost = new THREE.Mesh(scaffoldLegGeo, barkMat);
    standPost.position.set(sideX, -1.2, 0);
    waterwheelStandGroup.add(standPost);
  }
  const wheelAxleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.8, 10), darkIronMat);
  wheelAxleMesh.rotation.z = Math.PI / 2;
  wheelAxleMesh.position.set(0, 3.0, 0);
  waterwheelStandGroup.add(wheelAxleMesh);
  mineGroup.add(waterwheelStandGroup);

  const mineOreWheelGroup = new THREE.Group();
  mineOreWheelGroup.position.set(-48.2, cavernFloorY + 3.0, 62.5);
  mineOreWheelGroup.rotation.y = Math.PI / 2;
  const wheelRim1 = new THREE.Mesh(oreWheelRimGeo, barkMat);
  wheelRim1.position.z = -0.45;
  const wheelRim2 = new THREE.Mesh(oreWheelRimGeo, barkMat);
  wheelRim2.position.z = 0.45;
  mineOreWheelGroup.add(wheelRim1, wheelRim2);
  for (let sp = 0; sp < 8; sp++) {
    const ang = (sp / 8) * Math.PI * 2;
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 1.1), timberMat);
    paddle.position.set(Math.cos(ang) * 2.6, Math.sin(ang) * 2.6, 0);
    paddle.rotation.z = ang;
    mineOreWheelGroup.add(paddle);
  }
  mineGroup.add(mineOreWheelGroup);

  // --- ROOM 3 (EAST FOUNDRY CHAMBER, lx in [+26, +52], lz in [36, 96]):
  //     TWIN MOLTEN GOLD BLAST FURNACES, SMELTING FOUNDRY & BULLION PYRAMIDS ---
  for (const fz of [52.0, 78.0]) {
    const furnaceGroup = new THREE.Group();
    furnaceGroup.position.set(44.5, cavernFloorY, fz);
    const fBody = new THREE.Mesh(blastFurnaceBodyGeo, mineDarkRockMat);
    const fBand1 = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.7, 0.45, 10), darkIronMat);
    fBand1.position.y = 2.4;
    const fBand2 = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.45, 0.45, 10), darkIronMat);
    fBand2.position.y = 5.8;
    const fCoreGlow = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
    fCoreGlow.scale.set(1.5, 1.2, 1.5);
    fCoreGlow.position.set(-1.6, 1.1, 0);
    // Molten Gold Spout pouring liquid gold into a glowing Crucible Vat
    const crucible = new THREE.Mesh(moltenCrucibleGeo, darkIronMat);
    crucible.position.set(-3.8, 0, 0);
    const moltenGoldPool = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.25, 12), mineGoldOreMat);
    moltenGoldPool.position.set(-3.8, 1.32, 0);
    const moltenStream = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.8, 8), mineMoltenCoalMat);
    moltenStream.position.set(-2.9, 1.45, 0);
    moltenStream.rotation.z = 0.65;
    furnaceGroup.add(fBody, fBand1, fBand2, fCoreGlow, crucible, moltenGoldPool, moltenStream);

    // Stacked Gold Bullion Pyramids beside each Blast Furnace
    for (let g = 0; g < 18; g++) {
      const ingot = new THREE.Mesh(goldIngotGeo, mineGoldOreMat);
      ingot.position.set(
        -4.2 + (g % 3) * 0.55,
        0.09 + Math.floor(g / 6) * 0.19,
        2.6 + (Math.floor(g / 3) % 2) * 0.36
      );
      furnaceGroup.add(ingot);
    }
    mineGroup.add(furnaceGroup);
  }
  const foundryLight = new THREE.PointLight(0xff7b00, 3.6, 42, 1.35);
  foundryLight.position.set(36.0, cavernFloorY + 4.5, 65.0);
  lanternLights.push(foundryLight);
  mineGroup.add(foundryLight);

  // Room 1 Central Miner's Smelting Brazier at (0, 50.0) + Room 4 Deep South Royal Treasure Vault at (0, 102.0)
  const forgeGroup = new THREE.Group();
  forgeGroup.position.set(0, cavernFloorY, 50.0);
  const brazierBase = new THREE.Mesh(forgeBrazierBaseGeo, darkIronMat);
  const coalMound = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
  coalMound.position.y = 0.92;
  forgeGroup.add(brazierBase, coalMound);
  for (let g = 0; g < 12; g++) {
    const ingot = new THREE.Mesh(goldIngotGeo, mineGoldOreMat);
    ingot.position.set(-2.1 + (g % 4) * 0.52, 0.09 + Math.floor(g / 4) * 0.18, -0.85);
    forgeGroup.add(ingot);
  }
  const cavernPointLight = new THREE.PointLight(0xff9933, 3.4, 42, 1.35);
  cavernPointLight.position.set(0, 4.2, 0);
  forgeGroup.add(cavernPointLight);
  lanternLights.push(cavernPointLight);
  mineGroup.add(forgeGroup);

  // Room 4: Deep South Royal Treasure Vault & Mother-Lode Dragon-Vein Sanctuary (lx in [-16, +16], lz in [78, 110])
  const vaultLight = new THREE.PointLight(0xfbbf24, 3.4, 38, 1.35);
  vaultLight.position.set(0, cavernFloorY + 4.8, 98.0);
  lanternLights.push(vaultLight);
  mineGroup.add(vaultLight);
  for (const vx of [-10.5, -5.5, 5.5, 10.5]) {
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.05, 1.1), barkMat);
    chest.position.set(vx, cavernFloorY + 0.52, 103.5);
    const chestGold = new THREE.Mesh(forgeCoalMoundGeo, mineGoldOreMat);
    chestGold.position.set(vx, cavernFloorY + 1.05, 103.5);
    mineGroup.add(chest, chestGold);
  }

  // Extended 66m Main Minecart Rail Track (through Room 1 -> Corridor 3 -> Room 4) + East-West Track through Corridors 1 & 2!
  for (const rx of [-0.55, 0.55]) {
    const cRail = new THREE.Mesh(cavernRailStraightGeo, darkIronMat);
    cRail.position.set(rx, cavernFloorY + 0.06, 67.0);
    mineGroup.add(cRail);
  }
  for (let sz = 34.5; sz <= 99.5; sz += 1.3) {
    const sleeper = new THREE.Mesh(mineSleeperGeo, barkMat);
    sleeper.position.set(0, cavernFloorY + 0.03, sz);
    mineGroup.add(sleeper);
  }
  const ewTrackGeo = new THREE.BoxGeometry(62.0, 0.11, 0.11);
  disposableGeometries.push(ewTrackGeo);
  for (const rz of [48.45, 49.55]) {
    const ewRail = new THREE.Mesh(ewTrackGeo, darkIronMat);
    ewRail.position.set(2.0, cavernFloorY + 0.06, rz);
    mineGroup.add(ewRail);
  }

  // 8 Loaded Ore Minecarts across the 4 Rooms & 5 Corridors
  const cartConfigs: Array<[number, number, number, THREE.Material]> = [
    [0, 40.5, 0, mineGoldOreMat],
    [0, 60.0, 0, mineEmeraldCrystalMat],
    [0, 72.0, 0, mineGoldOreMat], // Inside Central Corridor 3
    [0, 96.5, 0, mineSapphireCrystalMat],
    [-20.0, 49.0, Math.PI / 2, mineAmethystCrystalMat], // Inside West Corridor 1
    [20.0, 49.0, Math.PI / 2, mineSapphireCrystalMat],  // Inside East Corridor 2
    [32.5, 62.0, 0, mineEmeraldCrystalMat],             // Inside Room 3 Foundry
    [32.5, 76.0, 0, mineGoldOreMat],                    // Inside Room 3 Foundry
  ];
  for (let c = 0; c < cartConfigs.length; c++) {
    const [cx, cz, cyaw, oreMat] = cartConfigs[c];
    const cartGroup = new THREE.Group();
    cartGroup.position.set(cx, cavernFloorY, cz);
    cartGroup.rotation.y = cyaw;
    const body = new THREE.Mesh(mineCartBodyGeo, darkIronMat);
    body.position.set(0, 0.64, 0);
    cartGroup.add(body);
    for (const wx of [-0.7, 0.7]) {
      for (const wz of [-0.65, 0.65]) {
        const wheel = new THREE.Mesh(mineCartWheelGeo, darkIronMat);
        wheel.position.set(wx, 0.25, wz);
        cartGroup.add(wheel);
      }
    }
    for (let o = 0; o < 7; o++) {
      const ore = new THREE.Mesh(
        o % 2 === 0 ? mineGoldOreGeo : mineCrystalClusterGeo,
        o % 3 === 0 ? mineGoldOreMat : oreMat
      );
      ore.position.set(
        ((o % 3) - 1) * 0.36,
        1.12 + (o % 2) * 0.14,
        (Math.floor(o / 3) - 0.5) * 0.62
      );
      ore.scale.setScalar(0.82);
      cartGroup.add(ore);
    }
    mineGroup.add(cartGroup);
  }

  // 22 Colossal Glowing Crystal Spire Clusters across Room 1, Room 2 (Crystal Lake), Room 3 (Foundry) & Room 4 (Treasure Vault)!
  const crystalMats = [
    mineEmeraldCrystalMat,
    mineAmethystCrystalMat,
    mineSapphireCrystalMat,
    mineGoldOreMat,
  ];
  const crystalSpots: Array<[number, number, number]> = [
    [-49.5, 39.0, 1.85],
    [-49.5, 52.0, 2.05],
    [-49.5, 76.0, 2.15],
    [-49.5, 92.0, 1.95],
    [-28.5, 39.0, 1.65],
    [-28.5, 93.0, 1.75],
    [49.5, 39.0, 1.75],
    [49.5, 65.0, 1.95],
    [49.5, 92.0, 1.85],
    [-12.5, 82.0, 1.95],
    [12.5, 82.0, 1.95],
    [-13.5, 106.5, 2.25],
    [-7.0, 107.6, 2.55],
    [0.0, 107.8, 3.10], // Colossal 9m Mother-Lode Dragon-Vein Monolith at the center of Room 4 Back Wall!
    [7.0, 107.6, 2.55],
    [13.5, 106.5, 2.25],
  ];
  for (let i = 0; i < crystalSpots.length; i++) {
    const [cx, cz, scaleBase] = crystalSpots[i];
    const cMat = crystalMats[i % crystalMats.length];
    const cluster = new THREE.Group();
    cluster.position.set(cx, cavernFloorY, cz);
    for (let s = 0; s < 5; s++) {
      const spire = new THREE.Mesh(crystalSpireGeo, s === 4 ? mineGoldOreMat : cMat);
      const ang = (s / 5) * Math.PI * 2 + i * 0.7;
      const tilt = s === 0 ? 0.06 : 0.28 + (s % 2) * 0.14;
      spire.position.set(Math.cos(ang) * 0.55, 0, Math.sin(ang) * 0.55);
      spire.rotation.set(Math.sin(ang) * tilt, ang, Math.cos(ang) * tilt);
      const hScale = scaleBase * (s === 0 ? 1.38 : 0.78 + (s % 3) * 0.18);
      spire.scale.set(scaleBase * 0.75, hScale, scaleBase * 0.75);
      cluster.add(spire);
    }
    mineGroup.add(cluster);
  }

  const { updateDwarvenMiners } = buildDwarvenKingdomAndMiners({
    scene,
    mineGroup,
    mineX,
    mineEntY,
    mineEntZ,
    cavernBackZ,
    stonePatternTex: textures.stonePattern,
    mineGoldOreMat,
    mineMoltenCoalMat,
    barkMat,
    timberMat,
    darkIronMat,
    forgeBrazierBaseGeo,
    forgeCoalMoundGeo,
    createLanternAssembly,
    disposableGeometries,
    disposableMaterials,
    distanceCulledObjects,
    doorPivotHandles,
  });

  // ============================================================================
  // 6. RIVERSIDE WINDMILLS ON FLAT RIVERBANKS & GRAND MULTI-TIER WATERFALL
  // ============================================================================
  const sailClothMat = new THREE.MeshStandardMaterial({
    color: 0xf4ead5,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(sailClothMat);

  const millBaseGeo = new THREE.CylinderGeometry(2.3, 2.9, 4.2, 8);
  millBaseGeo.translate(0, 2.1, 0);
  const millUpperGeo = new THREE.CylinderGeometry(1.75, 2.25, 4.6, 8);
  millUpperGeo.translate(0, 6.4, 0);
  const millCapGeo = new THREE.ConeGeometry(2.2, 2.1, 8);
  millCapGeo.translate(0, 9.65, 0);
  const hubGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.8, 8);
  hubGeo.rotateX(Math.PI / 2);
  const sparGeo = new THREE.BoxGeometry(0.14, 11.2, 0.14);
  const sailPanelGeo = new THREE.PlaneGeometry(1.15, 4.2);
  disposableGeometries.push(
    millBaseGeo,
    millUpperGeo,
    millCapGeo,
    hubGeo,
    sparGeo,
    sailPanelGeo
  );

  const windmillRotors: THREE.Group[] = [];

  for (const wm of RIVERSIDE_WINDMILLS) {
    const millGroup = new THREE.Group();
    millGroup.position.set(wm.x, wm.height, wm.z);
    millGroup.rotation.y = wm.rotY;

    millGroup.add(
      new THREE.Mesh(millBaseGeo, rockMat),
      new THREE.Mesh(millUpperGeo, timberMat),
      new THREE.Mesh(millCapGeo, barkMat)
    );

    const rotor = new THREE.Group();
    rotor.position.set(0, 7.6, 2.05);
    rotor.add(new THREE.Mesh(hubGeo, darkIronMat));
    for (let s = 0; s < 2; s++) {
      const spar = new THREE.Mesh(sparGeo, timberMat);
      spar.rotation.z = (s * Math.PI) / 2;
      rotor.add(spar);
    }
    for (let b = 0; b < 4; b++) {
      const bladeHolder = new THREE.Group();
      bladeHolder.rotation.z = (b * Math.PI) / 2;
      const sail = new THREE.Mesh(sailPanelGeo, sailClothMat);
      sail.position.set(0.62, 3.2, 0.04);
      sail.rotation.y = 0.18;
      bladeHolder.add(sail);
      rotor.add(bladeHolder);
    }
    millGroup.add(rotor);
    windmillRotors.push(rotor);
    scene.add(millGroup);
    distanceCulledObjects.push({ obj: millGroup, cx: wm.x, cz: wm.z, radius: 22 });
  }

  // --- GRAND MULTI-TIERED WATERFALL at (-52, -42) -> Plunge Pool (-42, -30) ---
  const waterfallGroup = new THREE.Group();
  waterfallGroup.position.set(WATERFALL_POOL_POS.x, 0, WATERFALL_POOL_POS.z);
  waterfallGroup.rotation.y = Math.atan2(
    WATERFALL_POOL_POS.x - WATERFALL_CLIFF_POS.x,
    WATERFALL_POOL_POS.z - WATERFALL_CLIFF_POS.z
  );

  const waterfallMat = new THREE.MeshBasicMaterial({
    color: 0xdcf4ff,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
  });
  waterfallMat.userData.uTime = { value: 0 };
  waterfallMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterfallMat.userData.uTime;
    shader.vertexShader =
      `uniform float uTime;\nvarying vec2 vWfUv;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vWfUv = uv;
        transformed.z += sin(uv.y * 18.0 + uTime * 9.0 + uv.x * 6.0) * 0.14;
        `
      );
    shader.fragmentShader =
      `uniform float uTime;\nvarying vec2 vWfUv;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        float streak = sin(vWfUv.x * 24.0) * 0.5 + 0.5;
        float flow = sin(vWfUv.y * 28.0 + uTime * 12.0 + streak * 3.0) * 0.5 + 0.5;
        diffuseColor.rgb = mix(vec3(0.55, 0.84, 0.96), vec3(0.98, 0.99, 1.0), flow * 0.65 + 0.25);
        `
      );
  };

  const foamRingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposableMaterials.push(waterfallMat, foamRingMat);

  // Unobstructed Continuous Waterfall Curtain emerging directly out of a Mountain Cave
  const cascadeSheetGeo = new THREE.PlaneGeometry(5.2, 16.5, 12, 28);
  const caveWaterTongueGeo = new THREE.PlaneGeometry(4.8, 4.5, 8, 8);
  caveWaterTongueGeo.rotateX(-Math.PI / 2);
  const foamRingGeo = new THREE.RingGeometry(1.5, 4.0, 24);
  foamRingGeo.rotateX(-Math.PI / 2);
  const caveInteriorGeo = new THREE.BoxGeometry(6.4, 5.2, 5.6);
  // Low-subdivision angular cliff-rock geometry (no smooth spherical balls)
  const caveArchTopGeo = new THREE.DodecahedronGeometry(1.8, 0);
  disposableGeometries.push(
    cascadeSheetGeo,
    caveWaterTongueGeo,
    foamRingGeo,
    caveInteriorGeo,
    caveArchTopGeo
  );

  const caveDarkMat = new THREE.MeshBasicMaterial({ color: 0x05070a });
  disposableMaterials.push(caveDarkMat);

  // 1) Dark Mountain Cave Chamber recessed into the mountain face at (0, 14.4, -13.0)
  const caveChamberMesh = new THREE.Mesh(caveInteriorGeo, caveDarkMat);
  caveChamberMesh.position.set(0, 14.4, -13.0);
  waterfallGroup.add(caveChamberMesh);

  // Water emerging horizontally from inside the dark cave mouth before plunging down
  const caveWaterTongue = new THREE.Mesh(caveWaterTongueGeo, waterfallMat);
  caveWaterTongue.position.set(0, 14.3, -11.2);
  caveWaterTongue.rotation.x = 0.12;
  waterfallGroup.add(caveWaterTongue);

  // Main continuous, 100% unobstructed waterfall curtain pouring from the cave mouth (y=14.3) to pool (y=0)
  const mainCascade = new THREE.Mesh(cascadeSheetGeo, waterfallMat);
  mainCascade.position.set(0, 7.2, -7.2);
  mainCascade.rotation.x = -0.44;
  waterfallGroup.add(mainCascade);

  const foamRing1 = new THREE.Mesh(foamRingGeo, foamRingMat);
  foamRing1.position.set(0, WATER_LEVEL + 0.06, -2.2);
  const foamRing2 = new THREE.Mesh(foamRingGeo, foamRingMat);
  foamRing2.position.set(0, WATER_LEVEL + 0.07, -2.2);
  waterfallGroup.add(foamRing1, foamRing2);

  // 2) Craggy Mountain Cave Mouth Rim at the top of the cliff (y = 12.6..17.4) — zero rocks on the waterfall!
  for (const [rx, ry, rz, sx, sy, sz] of [
    // Overhanging rock brow / lintel of the mountain cave mouth
    [-2.5, 16.9, -11.6, 1.5, 0.85, 1.3],
    [0.0, 17.3, -11.4, 1.9, 0.95, 1.4],
    [2.5, 16.9, -11.6, 1.5, 0.85, 1.3],
    // Upper-left & upper-right cave entrance rock jambs framing the dark cave interior
    [-3.9, 14.4, -11.5, 1.15, 1.65, 1.35],
    [3.9, 14.4, -11.5, 1.15, 1.65, 1.35],
  ]) {
    const archStone = new THREE.Mesh(caveArchTopGeo, rockMat);
    archStone.position.set(rx, ry, rz);
    archStone.scale.set(sx, sy, sz);
    archStone.rotation.set(rx * 0.15, ry * 0.25, 0.08);
    archStone.castShadow = !isSoftwareGl;
    archStone.receiveShadow = !isSoftwareGl;
    waterfallGroup.add(archStone);
  }

  scene.add(waterfallGroup);
  distanceCulledObjects.push({
    obj: waterfallGroup,
    cx: WATERFALL_POOL_POS.x,
    cz: WATERFALL_POOL_POS.z,
    radius: 34,
  });

  // ============================================================================
  // 6B. NORTHERN CHINESE MOUNTAIN FORTRESS (מבצר סיני קיסרי על ההר בצפון)
  //     1) Clean Full-Width Stone Staircase (NO central slab/ramp!)
  //     2) Fenced Intermediate Terrace (רחבת ביניים עם גדר) + Paifang Gate + Upper Steps
  //     3) Grand Courtyard Plaza + Thick Walkable Great-Wall Ramparts & Wall Staircases
  //     4) Huge Accessible 2-Story Buildings with Wooden Floors, Interior Stairs & [E] Doors
  //     5) Left-Pole-Anchored Horizontal Fluttering Red Imperial Flags
  // ============================================================================
  const fortressGroup = new THREE.Group();

  const fortressStoneMat = new THREE.MeshStandardMaterial({
    color: 0x9c9891,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.08,
    roughness: 0.86,
    metalness: 0.05,
  });
  const carvedMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xd8d4cc,
    map: textures.rockAlbedo,
    roughness: 0.68,
    metalness: 0.06,
  });
  const imperialCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0x9e241b, // Traditional Chinese Imperial Vermilion-Crimson
    roughness: 0.52,
    metalness: 0.08,
  });
  // Procedural wooden floorboard texture with distinct plank seams & warm grain
  const woodPlankCanvas = document.createElement('canvas');
  woodPlankCanvas.width = 256;
  woodPlankCanvas.height = 256;
  const wpCtx = woodPlankCanvas.getContext('2d')!;
  wpCtx.fillStyle = '#9c6234';
  wpCtx.fillRect(0, 0, 256, 256);
  const plankRows = 8;
  const rowH = 256 / plankRows;
  for (let r = 0; r < plankRows; r++) {
    const shade = 140 + ((r * 19) % 30);
    wpCtx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.63)}, ${Math.floor(shade * 0.34)})`;
    wpCtx.fillRect(0, r * rowH + 2, 256, rowH - 3);
    wpCtx.fillStyle = '#3b210e';
    wpCtx.fillRect(0, r * rowH, 256, 2);
    const jointX = ((r * 97 + 40) % 220) + 18;
    wpCtx.fillRect(jointX, r * rowH, 2, rowH);
  }
  const woodPlankTex = new THREE.CanvasTexture(woodPlankCanvas);
  woodPlankTex.wrapS = THREE.RepeatWrapping;
  woodPlankTex.wrapT = THREE.RepeatWrapping;
  woodPlankTex.repeat.set(8, 8);
  woodPlankTex.colorSpace = THREE.SRGBColorSpace;

  const imperialWoodFloorMat = new THREE.MeshStandardMaterial({
    color: 0xd99b66, // Warm lacquered Chinese cedar wood planks
    map: woodPlankTex,
    bumpMap: textures.barkBump,
    bumpScale: 0.03,
    roughness: 0.55,
    metalness: 0.06,
  });
  const imperialDoorWoodMat = new THREE.MeshStandardMaterial({
    color: 0x871d15, // Deep lacquered vermilion-mahogany palace doors
    roughness: 0.44,
    metalness: 0.12,
  });
  const imperialGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd9a838, // Imperial Gold trim & roof ridge ornaments
    roughness: 0.35,
    metalness: 0.65,
  });
  const jadeBeamMat = new THREE.MeshStandardMaterial({
    color: 0x1f6b5c, // Painted emerald-turquoise beamwork (Fangzhang彩画)
    roughness: 0.6,
    metalness: 0.1,
  });
  const pagodaTileMat = new THREE.MeshStandardMaterial({
    color: 0x2c3036, // Dark grey-slate glazed Chinese roof tiles
    roughness: 0.58,
    metalness: 0.18,
  });
  const redLanternMat = new THREE.MeshStandardMaterial({
    color: 0xe62217,
    emissive: new THREE.Color(0xff3b1f),
    emissiveIntensity: 1.9,
    roughness: 0.4,
  });
  const redFlagMat = new THREE.MeshStandardMaterial({
    color: 0xc91e14,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const flagWidth = 1.35;
  attachFlagHorizontalWaveShader(redFlagMat, flagWidth, 0.24, 5.2, swayMaterials);

  disposableMaterials.push(
    fortressStoneMat,
    carvedMarbleMat,
    imperialCrimsonMat,
    imperialWoodFloorMat,
    imperialDoorWoodMat,
    imperialGoldMat,
    jadeBeamMat,
    pagodaTileMat,
    redLanternMat,
    redFlagMat
  );

  const doorStudGeo = new THREE.SphereGeometry(0.055, 6, 6);
  const doorRingGeo = new THREE.TorusGeometry(0.11, 0.025, 6, 12);
  disposableGeometries.push(doorStudGeo, doorRingGeo);

  function createInteractiveDoubleDoor(
    doorId: string,
    centerX: number,
    baseY: number,
    centerZ: number,
    openingWidth: number,
    doorHeight: number
  ): THREE.Group {
    const doorRoot = new THREE.Group();
    doorRoot.position.set(centerX, baseY, centerZ);

    const leafW = openingWidth * 0.5 - 0.02;
    const leafGeo = new THREE.BoxGeometry(leafW, doorHeight, 0.14);
    leafGeo.translate(leafW * 0.5, doorHeight * 0.5, 0);
    const framePostGeo = new THREE.BoxGeometry(0.22, doorHeight + 0.2, 0.62);
    framePostGeo.translate(0, (doorHeight + 0.2) * 0.5, 0);
    const frameLintelGeo = new THREE.BoxGeometry(openingWidth + 0.5, 0.28, 0.66);
    disposableGeometries.push(leafGeo, framePostGeo, frameLintelGeo);

    // Ornate Gold-Trimmed Door Frame
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(framePostGeo, imperialGoldMat);
      post.position.set(sx * (openingWidth * 0.5 + 0.08), 0, 0);
      doorRoot.add(post);
    }
    const lintel = new THREE.Mesh(frameLintelGeo, imperialGoldMat);
    lintel.position.set(0, doorHeight + 0.12, 0);
    doorRoot.add(lintel);

    // Left Hinged Door Leaf (anchored at left jamb x = -openingWidth/2)
    const leftPivot = new THREE.Group();
    leftPivot.position.set(-openingWidth * 0.5, 0, 0);
    const leftLeaf = new THREE.Mesh(leafGeo, imperialDoorWoodMat);
    leftLeaf.castShadow = !isSoftwareGl;
    leftPivot.add(leftLeaf);

    // Right Hinged Door Leaf (anchored at right jamb x = +openingWidth/2, mirrored inward)
    const rightPivot = new THREE.Group();
    rightPivot.position.set(openingWidth * 0.5, 0, 0);
    const rightLeaf = new THREE.Mesh(leafGeo, imperialDoorWoodMat);
    rightLeaf.scale.x = -1;
    rightLeaf.castShadow = !isSoftwareGl;
    rightPivot.add(rightLeaf);

    // Golden Palace Door Boss Bars & Brass Knockers on both front and back faces (single bar per row instead of 48 separate spheres)
    const studRowBarGeo = new THREE.BoxGeometry(Math.max(0.2, leafW - 0.36), 0.06, 0.04);
    disposableGeometries.push(studRowBarGeo);
    for (const faceZ of [-0.08, 0.08]) {
      for (const rowY of [0.65, 1.2, doorHeight - 0.65, doorHeight - 0.35]) {
        const barL = new THREE.Mesh(studRowBarGeo, imperialGoldMat);
        barL.position.set(leafW * 0.5, rowY, faceZ);
        leftPivot.add(barL);
        const barR = new THREE.Mesh(studRowBarGeo, imperialGoldMat);
        barR.position.set(-leafW * 0.5, rowY, faceZ);
        rightPivot.add(barR);
      }
      const ringL = new THREE.Mesh(doorRingGeo, imperialGoldMat);
      ringL.position.set(leafW - 0.22, doorHeight * 0.46, faceZ);
      leftPivot.add(ringL);
      const ringR = new THREE.Mesh(doorRingGeo, imperialGoldMat);
      ringR.position.set(-(leafW - 0.22), doorHeight * 0.46, faceZ);
      rightPivot.add(ringR);
    }

    doorRoot.add(leftPivot, rightPivot);
    doorPivotHandles.push({ id: doorId, leftPivot, rightPivot, currentAngle: 0 });
    return doorRoot;
  }

  // Helper to build a traditional Chinese curved-eave pagoda roof tier with upturned golden corner horns (for top roofs)
  const roofHornGeo = new THREE.ConeGeometry(0.24, 1.05, 5);
  disposableGeometries.push(roofHornGeo);

  function createChinesePagodaRoof(width: number, depth: number, height: number): THREE.Group {
    const rGroup = new THREE.Group();
    const mainRoofGeo = new THREE.ConeGeometry(1.0, height, 4);
    mainRoofGeo.rotateY(Math.PI / 4);
    mainRoofGeo.scale(width * 0.74, 1.0, depth * 0.74);

    const lowerFlangeGeo = new THREE.BoxGeometry(width * 1.06, 0.26, depth * 1.06);
    const ridgeBarGeo = new THREE.BoxGeometry(width * 0.62, 0.34, 0.38);
    disposableGeometries.push(mainRoofGeo, lowerFlangeGeo, ridgeBarGeo);

    const roofMesh = new THREE.Mesh(mainRoofGeo, pagodaTileMat);
    roofMesh.position.y = height * 0.5;
    roofMesh.castShadow = !isSoftwareGl;
    roofMesh.receiveShadow = !isSoftwareGl;
    rGroup.add(roofMesh);

    const flangeMesh = new THREE.Mesh(lowerFlangeGeo, pagodaTileMat);
    flangeMesh.position.y = 0.13;
    rGroup.add(flangeMesh);

    const ridgeMesh = new THREE.Mesh(ridgeBarGeo, imperialGoldMat);
    ridgeMesh.position.y = height * 0.92;
    rGroup.add(ridgeMesh);

    // 4 Upturned Chinese Eave Corners (Flying Eaves / 飞檐)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const horn = new THREE.Mesh(roofHornGeo, imperialGoldMat);
        horn.position.set(sx * width * 0.52, 0.4, sz * depth * 0.52);
        horn.rotation.z = -sx * 0.55;
        horn.rotation.x = sz * 0.55;
        rGroup.add(horn);
      }
    }
    return rGroup;
  }

  /**
   * Builds a HOLLOW Perimeter Eave Skirt Roof (גג היקפי חלול מסביב למבנה בלבד) for intermediate floors!
   * - Its TOP inner ring (at local y = 0) is embedded 0.18m inside the [innerWidth x innerDepth] exterior walls
   *   so there is ZERO gap between the wall and the roof.
   * - It slopes DOWNWARD from local y = 0 to local y = -skirtHeight around the exterior perimeter,
   *   with a closed horizontal under-eave soffit plate at y = -skirtHeight.
   * - Because the entire skirt sits at or BELOW the upper floor deck (y <= floor2Y), it NEVER rises in front
   *   of 2nd-floor windows or watchtower lookouts and NEVER blocks the view!
   */
  function createChinesePerimeterSkirtRoof(
    innerWidth: number,
    innerDepth: number,
    overhang = 2.2,
    skirtHeight = 1.1
  ): THREE.Group {
    const sGroup = new THREE.Group();
    const inW = Math.max(1.0, innerWidth - 0.36);
    const inD = Math.max(1.0, innerDepth - 0.36);
    const outerW = innerWidth + overhang * 2;
    const outerD = innerDepth + overhang * 2;

    // 1. Sloped 4-sided frustum from top inner ring (y = 0) DOWN to outer eave ring (y = -skirtHeight)
    const frustumGeo = new THREE.CylinderGeometry(1, 1, skirtHeight, 4, 1, true);
    frustumGeo.rotateY(Math.PI / 4);
    const posAttr = frustumGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      if (vy > 0) {
        posAttr.setXYZ(
          i,
          (vx >= 0 ? 1 : -1) * (inW * 0.5),
          0,
          (vz >= 0 ? 1 : -1) * (inD * 0.5)
        );
      } else {
        posAttr.setXYZ(
          i,
          (vx >= 0 ? 1 : -1) * (outerW * 0.5),
          -skirtHeight,
          (vz >= 0 ? 1 : -1) * (outerD * 0.5)
        );
      }
    }
    frustumGeo.computeVertexNormals();

    // 2. Horizontal under-eave soffit plate closing the bottom of the overhang into the wall (zero floating look!)
    const soffitGeo = new THREE.CylinderGeometry(1, 1, 0.08, 4, 1, true);
    soffitGeo.rotateY(Math.PI / 4);
    const sofAttr = soffitGeo.attributes.position;
    for (let i = 0; i < sofAttr.count; i++) {
      const vx = sofAttr.getX(i);
      const vy = sofAttr.getY(i);
      const vz = sofAttr.getZ(i);
      const halfW = vy > 0 ? outerW * 0.5 : inW * 0.5;
      const halfD = vy > 0 ? outerD * 0.5 : inD * 0.5;
      sofAttr.setXYZ(
        i,
        (vx >= 0 ? 1 : -1) * halfW,
        -skirtHeight + 0.04,
        (vz >= 0 ? 1 : -1) * halfD
      );
    }
    soffitGeo.computeVertexNormals();

    const fbFlangeGeo = new THREE.BoxGeometry(outerW + 0.36, 0.22, 0.42);
    const weFlangeGeo = new THREE.BoxGeometry(0.42, 0.22, outerD + 0.36);
    disposableGeometries.push(frustumGeo, soffitGeo, fbFlangeGeo, weFlangeGeo);

    const skirtMat = pagodaTileMat.clone();
    skirtMat.side = THREE.DoubleSide;
    disposableMaterials.push(skirtMat);

    const frustumMesh = new THREE.Mesh(frustumGeo, skirtMat);
    frustumMesh.castShadow = !isSoftwareGl;
    frustumMesh.receiveShadow = !isSoftwareGl;
    const soffitMesh = new THREE.Mesh(soffitGeo, imperialCrimsonMat);
    sGroup.add(frustumMesh, soffitMesh);

    for (const sz of [-1, 1]) {
      const flangeMesh = new THREE.Mesh(fbFlangeGeo, pagodaTileMat);
      flangeMesh.position.set(0, -skirtHeight + 0.11, sz * (outerD * 0.5));
      sGroup.add(flangeMesh);
    }
    for (const sx of [-1, 1]) {
      const flangeMesh = new THREE.Mesh(weFlangeGeo, pagodaTileMat);
      flangeMesh.position.set(sx * (outerW * 0.5), -skirtHeight + 0.11, 0);
      sGroup.add(flangeMesh);
    }

    // 4 Upturned Golden Corner Horns (Flying Eaves / 飞檐) at the outer bottom eave corners
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const horn = new THREE.Mesh(roofHornGeo, imperialGoldMat);
        horn.position.set(sx * outerW * 0.5, -skirtHeight + 0.34, sz * outerD * 0.5);
        horn.rotation.z = -sx * 0.55;
        horn.rotation.x = sz * 0.55;
        sGroup.add(horn);
      }
    }

    return sGroup;
  }

  // Helper to build a glowing Red Chinese Hanging Lantern with gold caps
  const cLanternSphereGeo = new THREE.SphereGeometry(0.36, 12, 10);
  cLanternSphereGeo.scale(1.15, 0.88, 1.15);
  const cLanternCapGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8);
  const cLanternTasselGeo = new THREE.CylinderGeometry(0.03, 0.08, 0.42, 6);
  disposableGeometries.push(cLanternSphereGeo, cLanternCapGeo, cLanternTasselGeo);

  function createRedChineseLantern(lx: number, ly: number, lz: number): THREE.Group {
    const lg = new THREE.Group();
    lg.position.set(lx, ly, lz);
    lg.add(new THREE.Mesh(cLanternSphereGeo, redLanternMat));
    const topCap = new THREE.Mesh(cLanternCapGeo, imperialGoldMat);
    topCap.position.y = 0.32;
    const botCap = new THREE.Mesh(cLanternCapGeo, imperialGoldMat);
    botCap.position.y = -0.32;
    const tassel = new THREE.Mesh(cLanternTasselGeo, imperialGoldMat);
    tassel.position.y = -0.56;
    lg.add(topCap, botCap, tassel);
    return lg;
  }

  // Helper to build a fluttering Red Imperial Flag anchored on its left side (x=0) to the flagpole
  const flagPoleGeo = new THREE.CylinderGeometry(0.048, 0.058, 3.9, 8);
  flagPoleGeo.translate(0, 1.95, 0);
  const flagFinialGeo = new THREE.SphereGeometry(0.1, 8, 8);
  flagFinialGeo.translate(0, 3.95, 0);
  // 14 horizontal segments so the left edge (position.x = 0) stays locked to the pole while the right edge ripples
  const flagBannerGeo = new THREE.PlaneGeometry(flagWidth, 1.65, 14, 4);
  flagBannerGeo.translate(flagWidth * 0.5, 2.88, 0);
  disposableGeometries.push(flagPoleGeo, flagFinialGeo, flagBannerGeo);

  function createImperialFlag(fx: number, fy: number, fz: number): THREE.Group {
    const fg = new THREE.Group();
    fg.position.set(fx, fy, fz);
    fg.add(
      new THREE.Mesh(flagPoleGeo, imperialGoldMat),
      new THREE.Mesh(flagFinialGeo, imperialGoldMat),
      new THREE.Mesh(flagBannerGeo, redFlagMat)
    );
    return fg;
  }

  // Helper to build an ANGLED Watchtower Flag projecting diagonally outward from a corner pillar (הדגלים במגדל באלכסון תלויים מהעמוד הצידה)
  // so it hangs out to the side and NEVER clips into the overhanging Chinese Pagoda Roof!
  const angledPoleLen = 2.85;
  const angledPoleGeo = new THREE.CylinderGeometry(0.042, 0.055, angledPoleLen, 8);
  angledPoleGeo.rotateZ(-Math.PI / 2); // Points along +X
  angledPoleGeo.translate(angledPoleLen * 0.5, 0, 0);
  const angledFinialGeo = new THREE.SphereGeometry(0.095, 8, 8);
  angledFinialGeo.translate(angledPoleLen + 0.05, 0, 0);
  const angledBracketGeo = new THREE.BoxGeometry(0.24, 0.34, 0.24);
  const angledBannerGeo = new THREE.PlaneGeometry(1.85, 1.35, 14, 4);
  angledBannerGeo.translate(1.32, -0.74, 0);
  disposableGeometries.push(angledPoleGeo, angledFinialGeo, angledBracketGeo, angledBannerGeo);

  function createAngledWatchtowerFlag(
    fx: number,
    fy: number,
    fz: number,
    outwardYaw: number
  ): THREE.Group {
    const fg = new THREE.Group();
    fg.position.set(fx, fy, fz);
    fg.rotation.y = outwardYaw;
    const bracket = new THREE.Mesh(angledBracketGeo, imperialGoldMat);
    const polePivot = new THREE.Group();
    // Tilt pole 22 degrees above horizontal so it projects diagonally outward from the pillar, clear of the roof!
    polePivot.rotation.z = 0.38;
    polePivot.add(
      new THREE.Mesh(angledPoleGeo, imperialGoldMat),
      new THREE.Mesh(angledFinialGeo, imperialGoldMat),
      new THREE.Mesh(angledBannerGeo, redFlagMat)
    );
    fg.add(bracket, polePivot);
    return fg;
  }

  // Shared Geometries & Builder for Ornate Three-Bay Paifang Imperial Entrance Gates
  const paifangDrumGeo = new THREE.CylinderGeometry(0.56, 0.64, 1.1, 12);
  paifangDrumGeo.translate(0, 0.55, 0);
  const paifangColMainGeo = new THREE.CylinderGeometry(0.36, 0.38, 7.8, 12);
  paifangColMainGeo.translate(0, 3.9, 0);
  const paifangColSideGeo = new THREE.CylinderGeometry(0.32, 0.34, 6.4, 12);
  paifangColSideGeo.translate(0, 3.2, 0);
  const paifangBeamCenterGeo = new THREE.BoxGeometry(5.6, 1.15, 0.85);
  const paifangBeamSideGeo = new THREE.BoxGeometry(3.4, 0.95, 0.78);
  const paifangPlaqueGeo = new THREE.BoxGeometry(2.8, 1.25, 0.96);
  const guardianPedestalGeo = new THREE.BoxGeometry(0.95, 0.95, 1.15);
  guardianPedestalGeo.translate(0, 0.47, 0);
  const guardianLionBodyGeo = new THREE.DodecahedronGeometry(0.48, 1);
  disposableGeometries.push(
    paifangDrumGeo,
    paifangColMainGeo,
    paifangColSideGeo,
    paifangBeamCenterGeo,
    paifangBeamSideGeo,
    paifangPlaqueGeo,
    guardianPedestalGeo,
    guardianLionBodyGeo
  );

  function createOrnatePaifangGate(gateZ: number, gateY: number): THREE.Group {
    const paifangGroup = new THREE.Group();
    paifangGroup.position.set(0, gateY, gateZ);

    for (const px of [-2.6, 2.6]) {
      const drum = new THREE.Mesh(paifangDrumGeo, carvedMarbleMat);
      drum.position.x = px;
      const col = new THREE.Mesh(paifangColMainGeo, imperialCrimsonMat);
      col.position.x = px;
      col.castShadow = !isSoftwareGl;
      paifangGroup.add(drum, col);
    }
    for (const px of [-5.6, 5.6]) {
      const drum = new THREE.Mesh(paifangDrumGeo, carvedMarbleMat);
      drum.position.x = px;
      const col = new THREE.Mesh(paifangColSideGeo, imperialCrimsonMat);
      col.position.x = px;
      col.castShadow = !isSoftwareGl;
      paifangGroup.add(drum, col);
    }

    const centerBeam = new THREE.Mesh(paifangBeamCenterGeo, jadeBeamMat);
    centerBeam.position.set(0, 6.35, 0);
    const plaque = new THREE.Mesh(paifangPlaqueGeo, imperialGoldMat);
    plaque.position.set(0, 6.95, 0);
    paifangGroup.add(centerBeam, plaque);

    for (const sx of [-4.1, 4.1]) {
      const sideBeam = new THREE.Mesh(paifangBeamSideGeo, jadeBeamMat);
      sideBeam.position.set(sx, 5.2, 0);
      paifangGroup.add(sideBeam);
    }

    const centerGateRoof = createChinesePagodaRoof(7.2, 3.5, 2.3);
    centerGateRoof.position.set(0, 7.65, 0);
    paifangGroup.add(centerGateRoof);

    for (const sx of [-4.1, 4.1]) {
      const sideGateRoof = createChinesePagodaRoof(4.4, 3.0, 1.8);
      sideGateRoof.position.set(sx, 5.9, 0);
      paifangGroup.add(sideGateRoof);
    }

    for (const lx of [-4.1, -1.3, 1.3, 4.1]) {
      paifangGroup.add(createRedChineseLantern(lx, lx === -1.3 || lx === 1.3 ? 5.35 : 4.35, 0));
    }

    for (const lx of [-3.1, 3.1]) {
      const ped = new THREE.Mesh(guardianPedestalGeo, carvedMarbleMat);
      ped.position.set(lx, 0, 1.35);
      const lion = new THREE.Mesh(guardianLionBodyGeo, carvedMarbleMat);
      lion.position.set(lx, 1.35, 1.35);
      lion.scale.set(0.9, 1.35, 1.15);
      paifangGroup.add(ped, lion);
    }
    return paifangGroup;
  }

  const FZ = FORTRESS_Z_OFFSET; // -170m deep North shift so the Fortress is hidden far in the northern mountains

  // --- 1) CLEAN LOWER GRAND STONE STAIRCASE (z = -78+FZ to -104+FZ, y = 9.0m to 22.0m — NO middle slab!) ---
  const lowerStairLen = CHINESE_FORTRESS_POS.stairFootZ - CHINESE_FORTRESS_POS.stairMidZ; // 26m
  const lowerStairRise = CHINESE_FORTRESS_POS.midLandingHeight - CHINESE_FORTRESS_POS.stairBaseHeight; // 13m
  const lowerStairAngle = Math.atan2(lowerStairRise, lowerStairLen);
  const numLowerSteps = 46;
  const lowerStepDepth = lowerStairLen / numLowerSteps;
  const lowerStepHeight = lowerStairRise / numLowerSteps;

  const stepBlockGeo = new THREE.BoxGeometry(7.2, lowerStepHeight + 0.36, lowerStepDepth + 0.12);
  const balustradePostGeo = new THREE.BoxGeometry(0.4, 1.38, 0.4);
  balustradePostGeo.translate(0, 0.69, 0);
  const balustradeCapGeo = new THREE.SphereGeometry(0.24, 8, 8);
  balustradeCapGeo.translate(0, 1.48, 0);
  const lowerStairSideWallGeo = new THREE.BoxGeometry(0.58, 3.8, lowerStairLen + 0.8);
  disposableGeometries.push(
    stepBlockGeo,
    balustradePostGeo,
    balustradeCapGeo,
    lowerStairSideWallGeo
  );

  for (let s = 0; s <= numLowerSteps; s++) {
    const sz = CHINESE_FORTRESS_POS.stairFootZ - s * lowerStepDepth;
    const sy = chineseFortressStairHeightAt(sz);
    const stepMesh = new THREE.Mesh(stepBlockGeo, fortressStoneMat);
    stepMesh.position.set(0, sy - (lowerStepHeight + 0.36) * 0.5, sz);
    stepMesh.receiveShadow = !isSoftwareGl;
    fortressGroup.add(stepMesh);
  }

  for (const sideX of [-3.85, 3.85]) {
    const sideSlopeWall = new THREE.Mesh(lowerStairSideWallGeo, carvedMarbleMat);
    sideSlopeWall.position.set(
      sideX,
      (CHINESE_FORTRESS_POS.stairBaseHeight + CHINESE_FORTRESS_POS.midLandingHeight) * 0.5 - 0.65,
      (CHINESE_FORTRESS_POS.stairFootZ + CHINESE_FORTRESS_POS.stairMidZ) * 0.5
    );
    sideSlopeWall.rotation.x = lowerStairAngle;
    fortressGroup.add(sideSlopeWall);

    for (let p = 0; p <= 7; p++) {
      const pz = CHINESE_FORTRESS_POS.stairFootZ - (p / 7) * lowerStairLen;
      const py = chineseFortressStairHeightAt(pz);
      const post = new THREE.Mesh(balustradePostGeo, carvedMarbleMat);
      post.position.set(sideX, py, pz);
      const cap = new THREE.Mesh(balustradeCapGeo, carvedMarbleMat);
      cap.position.set(sideX, py, pz);
      fortressGroup.add(post, cap);

      if (p % 2 === 1) {
        fortressGroup.add(createImperialFlag(sideX + (sideX < 0 ? -0.25 : 0.25), py + 0.85, pz));
      }
    }
  }

  // --- 2) FENCED INTERMEDIATE TERRACE (רחבת ביניים עם גדר at z = -104+FZ..-114+FZ, y = 22.0m) + 2 PAIFANG GATES + UPPER STAIRS ---
  const midY = CHINESE_FORTRESS_POS.midLandingHeight; // 22.0m
  const summitY = CHINESE_FORTRESS_POS.summitHeight; // 26.0m
  const midLandingBaseGeo = new THREE.BoxGeometry(27.4, 9.5, 10.4);
  const midLandingPavingGeo = new THREE.BoxGeometry(27.0, 0.36, 10.0);
  const midFenceRailSGeo = new THREE.BoxGeometry(9.2, 1.15, 0.45);
  const midFenceRailWEGeo = new THREE.BoxGeometry(0.45, 1.15, 10.0);
  disposableGeometries.push(
    midLandingBaseGeo,
    midLandingPavingGeo,
    midFenceRailSGeo,
    midFenceRailWEGeo
  );

  const midBaseMesh = new THREE.Mesh(midLandingBaseGeo, fortressStoneMat);
  midBaseMesh.position.set(0, midY - 4.85, -109.0 + FZ);
  fortressGroup.add(midBaseMesh);

  const midPavingMesh = new THREE.Mesh(midLandingPavingGeo, carvedMarbleMat);
  midPavingMesh.position.set(0, midY - 0.16, -109.0 + FZ);
  midPavingMesh.receiveShadow = !isSoftwareGl;
  fortressGroup.add(midPavingMesh);

  // Carved Stone Fence / Balustrade enclosing the Intermediate Landing (South & North wings + West & East sides)
  for (const sx of [-8.8, 8.8]) {
    const sFence = new THREE.Mesh(midFenceRailSGeo, carvedMarbleMat);
    sFence.position.set(sx, midY + 0.58, -104.2 + FZ);
    const nFence = new THREE.Mesh(midFenceRailSGeo, carvedMarbleMat);
    nFence.position.set(sx, midY + 0.58, -113.8 + FZ);
    fortressGroup.add(sFence, nFence);

    for (const px of [sx - 4.3, sx, sx + 4.3]) {
      for (const pz of [-104.2 + FZ, -113.8 + FZ]) {
        const post = new THREE.Mesh(balustradePostGeo, carvedMarbleMat);
        post.position.set(px, midY, pz);
        const cap = new THREE.Mesh(balustradeCapGeo, carvedMarbleMat);
        cap.position.set(px, midY, pz);
        fortressGroup.add(post, cap);
      }
    }
  }
  for (const wx of [-13.3, 13.3]) {
    const weFence = new THREE.Mesh(midFenceRailWEGeo, carvedMarbleMat);
    weFence.position.set(wx, midY + 0.58, -109.0 + FZ);
    fortressGroup.add(weFence);
    for (const pz of [-106.5 + FZ, -109.0 + FZ, -111.5 + FZ]) {
      const post = new THREE.Mesh(balustradePostGeo, carvedMarbleMat);
      post.position.set(wx, midY, pz);
      const cap = new THREE.Mesh(balustradeCapGeo, carvedMarbleMat);
      cap.position.set(wx, midY, pz);
      fortressGroup.add(post, cap);
    }
    fortressGroup.add(createImperialFlag(wx, midY + 0.9, -104.2 + FZ));
  }

  // PAIFANG GATE #1: Pushed right to the front edge of the lower stairs (z = -104.8 + FZ, y = 22.0m)
  // so you pass through Gate #1 directly into the Fenced Intermediate Terrace!
  fortressGroup.add(createOrnatePaifangGate(CHINESE_FORTRESS_POS.lowerGateZ, midY));

  // Upper Flight of Clean Stone Stairs (z = -114+FZ to -122+FZ, y = 22.0m to 26.0m — NO middle slab!)
  const upperStairLen = CHINESE_FORTRESS_POS.upperStairFootZ - CHINESE_FORTRESS_POS.upperStairTopZ; // 8m
  const upperStairRise = summitY - midY; // 4m
  const upperStairAngle = Math.atan2(upperStairRise, upperStairLen);
  const numUpperSteps = 16;
  const upperStepDepth = upperStairLen / numUpperSteps;
  const upperStepHeight = upperStairRise / numUpperSteps;
  const upperStairSideWallGeo = new THREE.BoxGeometry(0.58, 2.8, upperStairLen + 0.6);
  disposableGeometries.push(upperStairSideWallGeo);

  for (let s = 0; s <= numUpperSteps; s++) {
    const sz = CHINESE_FORTRESS_POS.upperStairFootZ - s * upperStepDepth;
    const sy = chineseFortressStairHeightAt(sz);
    const stepMesh = new THREE.Mesh(stepBlockGeo, fortressStoneMat);
    stepMesh.position.set(0, sy - (upperStepHeight + 0.36) * 0.5, sz);
    stepMesh.receiveShadow = !isSoftwareGl;
    fortressGroup.add(stepMesh);
  }

  for (const sideX of [-3.85, 3.85]) {
    const sideSlopeWall = new THREE.Mesh(upperStairSideWallGeo, carvedMarbleMat);
    sideSlopeWall.position.set(
      sideX,
      (midY + summitY) * 0.5 - 0.5,
      (CHINESE_FORTRESS_POS.upperStairFootZ + CHINESE_FORTRESS_POS.upperStairTopZ) * 0.5
    );
    sideSlopeWall.rotation.x = upperStairAngle;
    fortressGroup.add(sideSlopeWall);

    for (let p = 0; p <= 3; p++) {
      const pz = CHINESE_FORTRESS_POS.upperStairFootZ - (p / 3) * upperStairLen;
      const py = chineseFortressStairHeightAt(pz);
      const post = new THREE.Mesh(balustradePostGeo, carvedMarbleMat);
      post.position.set(sideX, py, pz);
      const cap = new THREE.Mesh(balustradeCapGeo, carvedMarbleMat);
      cap.position.set(sideX, py, pz);
      fortressGroup.add(post, cap);
    }
  }

  // PAIFANG GATE #2: Framing the top of the upper staircase at the South Fortress Wall entrance (z = -122.4 + FZ, y = 26.0m)
  // so you climb the upper stairs from the small terrace and pass through a 2nd ornate gate into the Grand Courtyard!
  fortressGroup.add(createOrnatePaifangGate(CHINESE_FORTRESS_POS.upperGateZ, summitY));

  // --- 3) MASSIVE EXPANDED GRAND COURTYARD PLAZA (104m x 98m, y = 42.0m) + UNBROKEN THICK GREAT-WALL RAMPARTS (y = 47.2m) ---
  const rampartY = CHINESE_FORTRESS_POS.rampartHeight; // 47.2m
  const rampartH = rampartY - summitY; // 5.2m

  // Tall 28m stone citadel mountain bastion anchoring the fortress into the high mountain peak
  const fortressFoundationGeo = new THREE.BoxGeometry(108.0, 28.0, 100.0);
  const courtyardPavingGeo = new THREE.BoxGeometry(105.6, 0.42, 98.4);
  const imperialSpiritWayGeo = new THREE.BoxGeometry(8.8, 0.12, 65.0);
  // Thick 4.2m walkable Great-Wall ramparts trimmed to terminate cleanly at the 4 Corner Watchtower walls
  // so they NEVER overlap the watchtower floors or walls (100% zero Z-fighting!)
  const thickWallWEGeo = new THREE.BoxGeometry(4.2, rampartH, 74.0); // z = -134.0+FZ to -208.0+FZ
  const thickWallNGeo = new THREE.BoxGeometry(80.0, rampartH, 4.2); // x = -40.0 to +40.0
  const thickWallSFlankGeo = new THREE.BoxGeometry(35.6, rampartH, 4.2); // x = ±4.4 to ±40.0 (center ±22.2)
  const merlonGeo = new THREE.BoxGeometry(1.2, 0.95, 0.65);
  const rampartStepGeo = new THREE.BoxGeometry(3.4, 0.34, 0.62);
  // Top standing platform & safety fence at the top of the rampart staircases (z = -152.0+FZ to -156.6+FZ)
  const rampartLandingDeckGeo = new THREE.BoxGeometry(3.6, rampartH, 4.6);
  const rampartLandingTopPavingGeo = new THREE.BoxGeometry(3.7, 0.24, 4.7);
  const rampartLandingFenceNorthGeo = new THREE.BoxGeometry(3.6, 1.15, 0.38);
  const rampartLandingFenceInnerGeo = new THREE.BoxGeometry(0.38, 1.15, 4.6);
  const rampartStairRailSideGeo = new THREE.BoxGeometry(0.32, 1.05, 10.4);
  disposableGeometries.push(
    fortressFoundationGeo,
    courtyardPavingGeo,
    imperialSpiritWayGeo,
    thickWallWEGeo,
    thickWallNGeo,
    thickWallSFlankGeo,
    merlonGeo,
    rampartStepGeo,
    rampartLandingDeckGeo,
    rampartLandingTopPavingGeo,
    rampartLandingFenceNorthGeo,
    rampartLandingFenceInnerGeo,
    rampartStairRailSideGeo
  );

  // Massive stone masonry bastion supporting the 104m x 98m upper citadel & 4 corner watchtowers
  const foundationMesh = new THREE.Mesh(fortressFoundationGeo, fortressStoneMat);
  foundationMesh.position.set(0, summitY - 14.1, -171.0 + FZ);
  foundationMesh.receiveShadow = !isSoftwareGl;
  fortressGroup.add(foundationMesh);

  // Paved stone courtyard floor at y = summitY (42.0m)
  const courtyardMesh = new THREE.Mesh(courtyardPavingGeo, carvedMarbleMat);
  courtyardMesh.position.set(0, summitY - 0.19, -171.0 + FZ);
  courtyardMesh.receiveShadow = !isSoftwareGl;
  fortressGroup.add(courtyardMesh);

  // Raised Carved Imperial Spirit Procession Way down the center of the Grand Courtyard (z = -124+FZ to -189+FZ)
  const spiritWayMesh = new THREE.Mesh(imperialSpiritWayGeo, carvedMarbleMat);
  spiritWayMesh.position.set(0, summitY + 0.03, -156.5 + FZ);
  spiritWayMesh.receiveShadow = !isSoftwareGl;
  fortressGroup.add(spiritWayMesh);

  // Unbroken West & East Thick Walkable Rampart Walls between the South & North Corner Watchtowers (x = ±49.9, z = -134.0+FZ to -208.0+FZ)
  for (const wx of [-49.9, 49.9]) {
    const isWest = wx < 0;
    const wallWE = new THREE.Mesh(thickWallWEGeo, fortressStoneMat);
    wallWE.position.set(wx, summitY + rampartH * 0.5, -171.0 + FZ);
    wallWE.castShadow = !isSoftwareGl;
    wallWE.receiveShadow = !isSoftwareGl;
    fortressGroup.add(wallWE);

    // Outer Crenellated Battlements along the 4.2m-wide wall top (between watchtowers)
    const outerEdgeX = wx + (isWest ? -1.75 : 1.75);
    for (let mz = -206.0 + FZ; mz <= -136.0 + FZ; mz += 2.8) {
      const merlon = new THREE.Mesh(merlonGeo, fortressStoneMat);
      merlon.position.set(outerEdgeX, rampartY + 0.47, mz);
      merlon.rotation.y = Math.PI / 2;
      fortressGroup.add(merlon);
    }

    // Inner Courtyard Stone Staircase climbing from Courtyard Plaza (z=-142+FZ) onto Rampart Top (z=-152+FZ)
    const stairCenterX = isWest ? -46.1 : 46.1;
    const wallSteps = 18;
    for (let s = 0; s <= wallSteps; s++) {
      const t = s / wallSteps;
      const sz = -142.0 + FZ - t * 10.0;
      const sy = summitY + t * rampartH;
      const wStep = new THREE.Mesh(rampartStepGeo, fortressStoneMat);
      wStep.position.set(stairCenterX, sy - 0.15, sz);
      wStep.receiveShadow = !isSoftwareGl;
      fortressGroup.add(wStep);
    }

    // Sloped inner handrail along the rampart stairs so you don't slip off the side while climbing
    const innerRailX = isWest ? -44.3 : 44.3;
    const stairRail = new THREE.Mesh(rampartStairRailSideGeo, carvedMarbleMat);
    stairRail.position.set(innerRailX, summitY + rampartH * 0.5 + 0.45, -147.0 + FZ);
    stairRail.rotation.x = Math.atan2(rampartH, 10.0);
    fortressGroup.add(stairRail);

    // FENCED STANDING PLATFORM AT THE TOP OF THE RAMPART STAIRS (נקודת עמידה קטנה עם גדר בסוף המדרגות לחומה)
    const landingCenterZ = -154.3 + FZ;
    const landingBlock = new THREE.Mesh(rampartLandingDeckGeo, fortressStoneMat);
    landingBlock.position.set(stairCenterX, summitY + rampartH * 0.5, landingCenterZ);
    landingBlock.receiveShadow = !isSoftwareGl;
    const landingPaving = new THREE.Mesh(rampartLandingTopPavingGeo, carvedMarbleMat);
    landingPaving.position.set(stairCenterX, rampartY - 0.1, landingCenterZ);
    landingPaving.receiveShadow = !isSoftwareGl;

    const northFence = new THREE.Mesh(rampartLandingFenceNorthGeo, carvedMarbleMat);
    northFence.position.set(stairCenterX, rampartY + 0.58, -156.5 + FZ);
    const innerFence = new THREE.Mesh(rampartLandingFenceInnerGeo, carvedMarbleMat);
    innerFence.position.set(innerRailX, rampartY + 0.58, landingCenterZ);
    fortressGroup.add(landingBlock, landingPaving, northFence, innerFence);

    for (const [postX, postZ] of [
      [innerRailX, -152.1 + FZ],
      [innerRailX, -154.3 + FZ],
      [innerRailX, -156.5 + FZ],
      [isWest ? -47.7 : 47.7, -156.5 + FZ],
    ]) {
      const post = new THREE.Mesh(balustradePostGeo, carvedMarbleMat);
      post.position.set(postX, rampartY, postZ);
      const cap = new THREE.Mesh(balustradeCapGeo, carvedMarbleMat);
      cap.position.set(postX, rampartY, postZ);
      fortressGroup.add(post, cap);
    }
  }

  // Unbroken North Thick Walkable Rampart Wall between NW & NE Watchtowers (z = -217.9 + FZ, x = -40.0..+40.0)
  const wallNorth = new THREE.Mesh(thickWallNGeo, fortressStoneMat);
  wallNorth.position.set(0, summitY + rampartH * 0.5, -217.9 + FZ);
  wallNorth.receiveShadow = !isSoftwareGl;
  fortressGroup.add(wallNorth);
  for (let mx = -38.5; mx <= 38.5; mx += 2.8) {
    const merlon = new THREE.Mesh(merlonGeo, fortressStoneMat);
    merlon.position.set(mx, rampartY + 0.47, -219.6 + FZ);
    fortressGroup.add(merlon);
  }

  // Unbroken South-Flanking Thick Walkable Rampart Walls between South Gate & SW/SE Watchtowers (z = -124.1 + FZ, x = ±22.2, spanning [-40.0..-4.4] and [+4.4..+40.0])
  for (const sx of [-22.2, 22.2]) {
    const wallS = new THREE.Mesh(thickWallSFlankGeo, fortressStoneMat);
    wallS.position.set(sx, summitY + rampartH * 0.5, -124.1 + FZ);
    wallS.castShadow = !isSoftwareGl;
    wallS.receiveShadow = !isSoftwareGl;
    fortressGroup.add(wallS);
    for (let mx = sx - 16.5; mx <= sx + 16.5; mx += 2.8) {
      const merlon = new THREE.Mesh(merlonGeo, fortressStoneMat);
      merlon.position.set(mx, rampartY + 0.47, -122.4 + FZ);
      fortressGroup.add(merlon);
    }
    fortressGroup.add(createImperialFlag(sx < 0 ? -7.2 : 7.2, rampartY, -122.5 + FZ));
  }

  // Ceremonial Carved White-Marble Huabiao Dragon Pillars (华表) & Bronze Cauldrons flanking the Courtyard Procession Way
  const huabiaoBaseGeo = new THREE.CylinderGeometry(0.95, 1.15, 1.2, 8);
  huabiaoBaseGeo.translate(0, 0.6, 0);
  const huabiaoShaftGeo = new THREE.CylinderGeometry(0.42, 0.48, 7.2, 12);
  huabiaoShaftGeo.translate(0, 4.2, 0);
  const huabiaoCloudBarGeo = new THREE.BoxGeometry(2.1, 0.32, 0.42);
  huabiaoCloudBarGeo.translate(0, 7.1, 0);
  const huabiaoCapGeo = new THREE.CylinderGeometry(0.65, 0.52, 0.45, 10);
  huabiaoCapGeo.translate(0, 7.9, 0);
  const burnerCauldronGeo = new THREE.CylinderGeometry(0.95, 0.72, 1.05, 12);
  burnerCauldronGeo.translate(0, 1.05, 0);
  const burnerLegGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.78, 6);
  burnerLegGeo.translate(0, 0.39, 0);
  disposableGeometries.push(
    huabiaoBaseGeo,
    huabiaoShaftGeo,
    huabiaoCloudBarGeo,
    huabiaoCapGeo,
    burnerCauldronGeo,
    burnerLegGeo
  );

  for (const hx of [-9.5, 9.5]) {
    for (const hz of [-138.0 + FZ, -176.0 + FZ]) {
      const hbGroup = new THREE.Group();
      hbGroup.position.set(hx, summitY, hz);
      hbGroup.add(
        new THREE.Mesh(huabiaoBaseGeo, carvedMarbleMat),
        new THREE.Mesh(huabiaoShaftGeo, carvedMarbleMat),
        new THREE.Mesh(huabiaoCloudBarGeo, carvedMarbleMat),
        new THREE.Mesh(huabiaoCapGeo, imperialGoldMat),
        createRedChineseLantern(0, 6.6, 0)
      );
      fortressGroup.add(hbGroup);
    }

    const bGroup = new THREE.Group();
    bGroup.position.set(hx, summitY, -152.0 + FZ);
    bGroup.add(new THREE.Mesh(burnerCauldronGeo, darkIronMat));
    for (const [lx, lz] of [
      [-0.48, -0.48],
      [0.48, -0.48],
      [-0.48, 0.48],
      [0.48, 0.48],
    ]) {
      const leg = new THREE.Mesh(burnerLegGeo, darkIronMat);
      leg.position.set(lx, 0, lz);
      bGroup.add(leg);
    }
    fortressGroup.add(bGroup);
  }

  // --- 4) COLOSSAL TWO-STORY MAIN IMPERIAL CITADEL HALL FLUSH AGAINST THE BACK WALL ---
  //     Footprint: 44m wide x 26m deep (x in [-22, +22], z in [-215.8+FZ, -189.8+FZ], center at z = -202.8+FZ)
  //     Attached flush to the inner face of the North Back Rampart Wall (z = -215.8+FZ)!
  //     Uses a DOWNWARD-SLOPING HOLLOW PERIMETER SKIRT ROOF below Story 2 so ZERO roof blocks the 2nd floor window!
  const hallCenterZ = -202.8 + FZ;
  const hallFrontZ = -189.8 + FZ;
  const hallBackZ = -215.8 + FZ;
  const hallFloor1Y = CHINESE_FORTRESS_POS.mainHallFloor1Y; // 26.35m
  const hallFloor2Y = CHINESE_FORTRESS_POS.mainHallFloor2Y; // 32.20m
  const hallH1 = hallFloor2Y - hallFloor1Y; // 5.85m
  const hallH2 = 5.2;

  const hallPlinthGeo = new THREE.BoxGeometry(44.8, 0.35, 26.4);
  const hallEntryStepsGeo = new THREE.BoxGeometry(8.4, 0.24, 2.0);
  const hallWoodFloor1Geo = new THREE.BoxGeometry(43.4, 0.14, 25.4);
  // 2nd floor wooden deck split around the interior stairwell (x in [13.5, 18.5], z in [-206+FZ, -194+FZ])
  const hallWoodFloor2MainGeo = new THREE.BoxGeometry(35.2, 0.22, 25.8); // x = -21.7..+13.5, flush to front & back walls
  const hallWoodFloor2RightGeo = new THREE.BoxGeometry(3.2, 0.22, 25.8); // x = +18.5..+21.7
  const hallWoodFloor2FrontPatchGeo = new THREE.BoxGeometry(5.0, 0.22, 4.2); // x = 13.5..18.5, z = -194.0+FZ..-189.8+FZ
  const hallWoodFloor2BackPatchGeo = new THREE.BoxGeometry(5.0, 0.22, 9.6); // x = 13.5..18.5, z = -215.6+FZ..-206.0+FZ

  const hallWallBackGeo = new THREE.BoxGeometry(44.0, hallH1 + hallH2, 0.6);
  const hallWallSideGeo = new THREE.BoxGeometry(0.6, hallH1 + hallH2, 26.0);
  const hallWallFrontFlankGeo = new THREE.BoxGeometry(20.0, hallH1, 0.6);
  const hallWallFrontUpperFlankGeo = new THREE.BoxGeometry(17.5, hallH2, 0.6);
  // 2nd-floor panoramic front window sill wall + golden balustrade bar (x in [-4.5, +4.5], bridging down to 1st floor door header)
  const hallWindowSillWallGeo = new THREE.BoxGeometry(9.0, 2.4, 0.6);
  const hallWindowSillCapGeo = new THREE.BoxGeometry(9.2, 0.14, 0.72);
  const hallWindowHeaderGeo = new THREE.BoxGeometry(9.0, 0.85, 0.6);
  const hallPillarGeo = new THREE.CylinderGeometry(0.4, 0.44, hallH1 + hallH2, 12);
  const hallStairStepGeo = new THREE.BoxGeometry(4.8, 0.28, 0.62);
  const hallThroneDaisGeo = new THREE.BoxGeometry(9.6, 0.72, 5.4);
  const hallThroneScreenGeo = new THREE.BoxGeometry(8.2, 4.0, 0.4);
  disposableGeometries.push(
    hallPlinthGeo,
    hallEntryStepsGeo,
    hallWoodFloor1Geo,
    hallWoodFloor2MainGeo,
    hallWoodFloor2RightGeo,
    hallWoodFloor2FrontPatchGeo,
    hallWoodFloor2BackPatchGeo,
    hallWallBackGeo,
    hallWallSideGeo,
    hallWallFrontFlankGeo,
    hallWallFrontUpperFlankGeo,
    hallWindowSillWallGeo,
    hallWindowSillCapGeo,
    hallWindowHeaderGeo,
    hallPillarGeo,
    hallStairStepGeo,
    hallThroneDaisGeo,
    hallThroneScreenGeo
  );

  // Marble Plinth + Front Entry Steps + Wooden 1st Floor at y = 26.35m
  const hallPlinth = new THREE.Mesh(hallPlinthGeo, carvedMarbleMat);
  hallPlinth.position.set(0, summitY + 0.175, hallCenterZ);
  const hallEntrySteps = new THREE.Mesh(hallEntryStepsGeo, carvedMarbleMat);
  hallEntrySteps.position.set(0, summitY + 0.12, hallFrontZ + 1.0);
  const hallFloor1 = new THREE.Mesh(hallWoodFloor1Geo, imperialWoodFloorMat);
  hallFloor1.position.set(0, hallFloor1Y - 0.05, hallCenterZ);
  hallFloor1.receiveShadow = !isSoftwareGl;
  fortressGroup.add(hallPlinth, hallEntrySteps, hallFloor1);

  // 2nd Story Wooden Floor Deck at y = 32.20m (leaving stairwell opening at x=13.5..18.5, z=-194+FZ..-206+FZ)
  const f2Main = new THREE.Mesh(hallWoodFloor2MainGeo, imperialWoodFloorMat);
  f2Main.position.set(-4.1, hallFloor2Y - 0.11, hallCenterZ);
  const f2Right = new THREE.Mesh(hallWoodFloor2RightGeo, imperialWoodFloorMat);
  f2Right.position.set(20.1, hallFloor2Y - 0.11, hallCenterZ);
  const f2Front = new THREE.Mesh(hallWoodFloor2FrontPatchGeo, imperialWoodFloorMat);
  f2Front.position.set(16.0, hallFloor2Y - 0.11, -191.9 + FZ);
  const f2Back = new THREE.Mesh(hallWoodFloor2BackPatchGeo, imperialWoodFloorMat);
  f2Back.position.set(16.0, hallFloor2Y - 0.11, -210.8 + FZ);
  fortressGroup.add(f2Main, f2Right, f2Front, f2Back);

  // Hollow Crimson Walls of the 44m x 26m Main Imperial Hall (flush against North Wall at z = -215.8+FZ)
  const hallBackWall = new THREE.Mesh(hallWallBackGeo, imperialCrimsonMat);
  hallBackWall.position.set(0, hallFloor1Y + (hallH1 + hallH2) * 0.5, hallBackZ);
  fortressGroup.add(hallBackWall);

  for (const sx of [-22.0, 22.0]) {
    const sideWall = new THREE.Mesh(hallWallSideGeo, imperialCrimsonMat);
    sideWall.position.set(sx, hallFloor1Y + (hallH1 + hallH2) * 0.5, hallCenterZ);
    fortressGroup.add(sideWall);
  }

  for (const fx of [-12.0, 12.0]) {
    const frontFlank = new THREE.Mesh(hallWallFrontFlankGeo, imperialCrimsonMat);
    frontFlank.position.set(fx, hallFloor1Y + hallH1 * 0.5, hallFrontZ);
    fortressGroup.add(frontFlank);
  }
  for (const fx of [-13.25, 13.25]) {
    const frontUpperFlank = new THREE.Mesh(hallWallFrontUpperFlankGeo, imperialCrimsonMat);
    frontUpperFlank.position.set(fx, hallFloor2Y + hallH2 * 0.5, hallFrontZ);
    fortressGroup.add(frontUpperFlank);
  }

  // Panoramic 2nd-Floor Front Window Sill & Header (x in [-4.5, +4.5], unobstructed view over the courtyard!)
  const hallWinSill = new THREE.Mesh(hallWindowSillWallGeo, imperialCrimsonMat);
  hallWinSill.position.set(0, hallFloor2Y - 0.25, hallFrontZ);
  const hallWinCap = new THREE.Mesh(hallWindowSillCapGeo, imperialGoldMat);
  hallWinCap.position.set(0, hallFloor2Y + 0.95, hallFrontZ);
  const hallWinHeader = new THREE.Mesh(hallWindowHeaderGeo, jadeBeamMat);
  hallWinHeader.position.set(0, hallFloor2Y + hallH2 - 0.42, hallFrontZ);
  fortressGroup.add(hallWinSill, hallWinCap, hallWinHeader);

  // Interactive Double Palace Door on the Main Hall Front Entrance (x=0, z=-189.8+FZ, width=4.0m)
  fortressGroup.add(createInteractiveDoubleDoor('main-hall-door', 0, hallFloor1Y, hallFrontZ, 4.0, 4.4));

  // Grand Interior Wooden Staircase climbing from 1st Floor (26.35m, z=-194+FZ) to 2nd Floor (32.20m, z=-206+FZ)
  const numHallSteps = 22;
  for (let s = 0; s <= numHallSteps; s++) {
    const t = s / numHallSteps;
    const sz = -194.0 + FZ - t * 12.0;
    const sy = hallFloor1Y + t * hallH1;
    const hStep = new THREE.Mesh(hallStairStepGeo, imperialWoodFloorMat);
    hStep.position.set(16.0, sy - 0.14, sz);
    fortressGroup.add(hStep);
  }

  // Interior Golden-Crimson Colonnade Pillars & Imperial Throne Dais inside the Main Hall
  for (const px of [-14.0, -7.0, 7.0]) {
    for (const pz of [-196.5 + FZ, -209.0 + FZ]) {
      const col = new THREE.Mesh(hallPillarGeo, imperialCrimsonMat);
      col.position.set(px, hallFloor1Y + (hallH1 + hallH2) * 0.5, pz);
      fortressGroup.add(col);
    }
  }
  const throneDais = new THREE.Mesh(hallThroneDaisGeo, imperialGoldMat);
  throneDais.position.set(0, hallFloor1Y + 0.36, -210.8 + FZ);
  const throneScreen = new THREE.Mesh(hallThroneScreenGeo, imperialGoldMat);
  throneScreen.position.set(0, hallFloor1Y + 2.5, -213.2 + FZ);
  fortressGroup.add(throneDais, throneScreen);

  // Exterior Colonnade Pillars
  for (let px = -21.0; px <= 21.0; px += 5.25) {
    if (Math.abs(px) < 2.5) continue; // Keep front doorway & 2nd floor center window clear
    const extCol = new THREE.Mesh(hallPillarGeo, imperialCrimsonMat);
    extCol.position.set(px, hallFloor1Y + (hallH1 + hallH2) * 0.5, hallFrontZ + 0.45);
    fortressGroup.add(extCol);
  }

  // Story 1 Roof: Downward-sloping Hollow Perimeter Eave Skirt positioned at y = hallFloor2Y + 0.05 (32.25m -> 31.10m)
  // Sits 100% below the 2nd floor window and embedded into the walls so there is ZERO gap and ZERO view obstruction!
  const hallLowerSkirtRoof = createChinesePerimeterSkirtRoof(44.0, 26.0, 2.5, 1.15);
  hallLowerSkirtRoof.position.set(0, hallFloor2Y + 0.05, hallCenterZ);
  // Story 2 Top Roof: Monumental Chinese Pagoda Roof crowning the upper hall
  const hallUpperRoof = createChinesePagodaRoof(47.8, 29.8, 5.2);
  hallUpperRoof.position.set(0, hallFloor2Y + hallH2 - 0.15, hallCenterZ);
  fortressGroup.add(hallLowerSkirtRoof, hallUpperRoof);

  // Hanging Red Lanterns inside and outside the Main Hall (1st & 2nd stories)
  for (const lx of [-8.0, 8.0]) {
    fortressGroup.add(
      createRedChineseLantern(lx, hallFloor1Y + 4.4, hallFrontZ + 0.8),
      createRedChineseLantern(lx, hallFloor1Y + 4.8, hallCenterZ),
      createRedChineseLantern(lx, hallFloor2Y + 4.0, hallCenterZ)
    );
  }

  // --- MAIN IMPERIAL CITADEL HALL:
  //     1F (קומה למטה): GRAND CHINESE BANQUET DINING TABLE + TRADITIONAL CHINESE KITCHEN (שולחן אוכל גדול ומטבח בוויב סיני!)
  //     2F (קומה למעלה): CHINESE MARTIAL ARTS TRAINING DOJO (דוג'ו של אימון לחימה סיני, לא מיטות!) ---
  const dojoMatGeo = new THREE.BoxGeometry(9.8, 0.05, 17.6);
  const dojoMatBorderGeo = new THREE.BoxGeometry(10.3, 0.035, 18.1);
  const pavCarpetGeo = new THREE.BoxGeometry(9.4, 0.04, 9.6);
  const pavCarpetBorderGeo = new THREE.BoxGeometry(9.9, 0.03, 10.1);
  const fSleepingBagGeo = new THREE.BoxGeometry(1.15, 0.16, 2.05);
  fSleepingBagGeo.translate(0, 0.08, 0);
  const fSleepingPillowGeo = new THREE.BoxGeometry(0.76, 0.14, 0.38);
  fSleepingPillowGeo.translate(0, 0.21, 0);

  // Dojo equipment geometries (2F Main Hall)
  const sandbagBodyGeo = new THREE.CylinderGeometry(0.32, 0.34, 1.65, 12);
  const sandbagChainGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6);
  const weaponRackPostGeo = new THREE.BoxGeometry(0.14, 1.85, 0.45);
  weaponRackPostGeo.translate(0, 0.92, 0);
  const weaponRackBarGeo = new THREE.BoxGeometry(2.6, 0.1, 0.12);
  const weaponStaffGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.35, 7);
  const weaponBladeGeo = new THREE.ConeGeometry(0.12, 0.48, 4);
  const balancePoleGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.75, 10);
  balancePoleGeo.translate(0, 0.375, 0);
  const gongFramePostGeo = new THREE.CylinderGeometry(0.09, 0.1, 2.5, 8);
  gongFramePostGeo.translate(0, 1.25, 0);
  const gongFrameTopGeo = new THREE.BoxGeometry(2.4, 0.16, 0.18);
  const gongDiscGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.08, 20);
  gongDiscGeo.rotateX(Math.PI / 2);

  // Wall Painting / Calligraphy Scroll geometries (used in Side Pavilions 1F & Main Hall Dojo)
  const wallPaintingFrameGeo = new THREE.BoxGeometry(2.4, 1.45, 0.07);
  const wallPaintingCanvasGeo = new THREE.BoxGeometry(2.16, 1.22, 0.08);

  // Grand Banquet Dining Table & Chinese Kitchen geometries (1F Main Hall)
  const banquetTableTopGeo = new THREE.BoxGeometry(13.6, 0.14, 2.35);
  const banquetRunnerGeo = new THREE.BoxGeometry(13.2, 0.02, 0.78);
  const banquetPedestalGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.76, 10);
  banquetPedestalGeo.translate(0, 0.38, 0);
  const bambooSteamerGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12);
  bambooSteamerGeo.translate(0, 0.12, 0);
  const porcelainBowlGeo = new THREE.CylinderGeometry(0.14, 0.09, 0.11, 10);
  porcelainBowlGeo.translate(0, 0.055, 0);
  const feastPlatterGeo = new THREE.CylinderGeometry(0.42, 0.36, 0.06, 12);
  feastPlatterGeo.translate(0, 0.03, 0);
  const roastDuckGeo = new THREE.SphereGeometry(0.22, 8, 8);
  roastDuckGeo.scale(1.35, 0.75, 0.95);
  const wokStoveBrickGeo = new THREE.BoxGeometry(5.6, 0.96, 1.85);
  wokStoveBrickGeo.translate(0, 0.48, 0);
  const wokPanGeo = new THREE.SphereGeometry(0.68, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
  const wokFireGlowGeo = new THREE.BoxGeometry(0.65, 0.38, 0.12);
  const kitchenHoodGeo = new THREE.ConeGeometry(2.8, 1.4, 4);
  kitchenHoodGeo.rotateY(Math.PI / 4);
  const kitchenPrepCounterGeo = new THREE.BoxGeometry(1.35, 0.9, 6.4);
  kitchenPrepCounterGeo.translate(0, 0.45, 0);
  const cuttingBoardGeo = new THREE.BoxGeometry(0.55, 0.05, 0.75);
  const cleaverBladeGeo = new THREE.BoxGeometry(0.28, 0.02, 0.14);
  const wineJarGeo = new THREE.SphereGeometry(0.32, 10, 8);
  wineJarGeo.scale(1.0, 1.28, 1.0);
  const wineJarLidGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.12, 8);

  disposableGeometries.push(
    dojoMatGeo,
    dojoMatBorderGeo,
    pavCarpetGeo,
    pavCarpetBorderGeo,
    fSleepingBagGeo,
    fSleepingPillowGeo,
    sandbagBodyGeo,
    sandbagChainGeo,
    weaponRackPostGeo,
    weaponRackBarGeo,
    weaponStaffGeo,
    weaponBladeGeo,
    balancePoleGeo,
    gongFramePostGeo,
    gongFrameTopGeo,
    gongDiscGeo,
    wallPaintingFrameGeo,
    wallPaintingCanvasGeo,
    banquetTableTopGeo,
    banquetRunnerGeo,
    banquetPedestalGeo,
    bambooSteamerGeo,
    porcelainBowlGeo,
    feastPlatterGeo,
    roastDuckGeo,
    wokStoveBrickGeo,
    wokPanGeo,
    wokFireGlowGeo,
    kitchenHoodGeo,
    kitchenPrepCounterGeo,
    cuttingBoardGeo,
    cleaverBladeGeo,
    wineJarGeo,
    wineJarLidGeo
  );

  // Procedural Chinese Ink-Wash Landscape Painting Texture (ציור נוף סיני מסורתי לתמונות על הקיר)
  const paintingCanvasEl = document.createElement('canvas');
  paintingCanvasEl.width = 256;
  paintingCanvasEl.height = 144;
  const pCtx = paintingCanvasEl.getContext('2d')!;
  pCtx.fillStyle = '#f3ead6'; // Warm silk parchment
  pCtx.fillRect(0, 0, 256, 144);
  // Red seal stamp in top-left corner
  pCtx.fillStyle = '#b91c1c';
  pCtx.fillRect(18, 16, 18, 24);
  // Distant misty ink mountains
  pCtx.fillStyle = 'rgba(45, 55, 65, 0.35)';
  pCtx.beginPath();
  pCtx.moveTo(0, 110);
  pCtx.lineTo(55, 42);
  pCtx.lineTo(115, 88);
  pCtx.lineTo(180, 32);
  pCtx.lineTo(256, 95);
  pCtx.lineTo(256, 144);
  pCtx.lineTo(0, 144);
  pCtx.fill();
  // Foreground dark ink mountains & pine silhouette
  pCtx.fillStyle = 'rgba(20, 26, 32, 0.78)';
  pCtx.beginPath();
  pCtx.moveTo(0, 128);
  pCtx.lineTo(85, 58);
  pCtx.lineTo(148, 108);
  pCtx.lineTo(212, 52);
  pCtx.lineTo(256, 118);
  pCtx.lineTo(256, 144);
  pCtx.lineTo(0, 144);
  pCtx.fill();
  // Crimson sun disc
  pCtx.fillStyle = '#dc2626';
  pCtx.beginPath();
  pCtx.arc(138, 38, 13, 0, Math.PI * 2);
  pCtx.fill();
  const chinesePaintingTex = new THREE.CanvasTexture(paintingCanvasEl);
  chinesePaintingTex.colorSpace = THREE.SRGBColorSpace;
  const chinesePaintingMat = new THREE.MeshStandardMaterial({
    map: chinesePaintingTex,
    roughness: 0.72,
  });

  const dojoTatamiMat = new THREE.MeshStandardMaterial({ color: 0xc8b273, roughness: 0.86 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0xd4a857, roughness: 0.75 });
  const roastDuckMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.38 });
  const ceramicJarMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45 });
  const sleepingBagColors = [
    new THREE.MeshStandardMaterial({ color: 0x992b24, roughness: 0.85 }), // Imperial Crimson
    new THREE.MeshStandardMaterial({ color: 0x1e4d3b, roughness: 0.85 }), // Jade Forest Green
    new THREE.MeshStandardMaterial({ color: 0x243b6b, roughness: 0.85 }), // Indigo Blue
    new THREE.MeshStandardMaterial({ color: 0xb87324, roughness: 0.85 }), // Saffron Amber
  ];
  disposableMaterials.push(
    chinesePaintingMat,
    dojoTatamiMat,
    bambooMat,
    roastDuckMat,
    ceramicJarMat,
    ...sleepingBagColors
  );

  const createFramedChineseWallPainting = (
    wx: number,
    wy: number,
    wz: number,
    rotY: number
  ): THREE.Group => {
    const pGroup = new THREE.Group();
    pGroup.position.set(wx, wy, wz);
    pGroup.rotation.y = rotY;
    const frame = new THREE.Mesh(wallPaintingFrameGeo, furnitureWoodMat);
    const canvas = new THREE.Mesh(wallPaintingCanvasGeo, chinesePaintingMat);
    pGroup.add(frame, canvas);
    return pGroup;
  };

  // ============================================================================
  // A) MAIN IMPERIAL HALL 1ST FLOOR (y = hallFloor1Y = 42.35m):
  //    GRAND CHINESE BANQUET DINING TABLE (שולחן אוכל גדול) + TRADITIONAL CHINESE KITCHEN (מטבח סיני)
  // ============================================================================
  const banquetCenterZ = hallCenterZ + 1.5; // -201.3 + FZ (clear of central pillars at z = -207.8+FZ & -197.8+FZ!)
  const banquetCenterX = 0.5;
  const bTableTop = new THREE.Mesh(banquetTableTopGeo, imperialCrimsonMat);
  bTableTop.position.set(banquetCenterX, hallFloor1Y + 0.78, banquetCenterZ);
  const bRunner = new THREE.Mesh(banquetRunnerGeo, imperialGoldMat);
  bRunner.position.set(banquetCenterX, hallFloor1Y + 0.855, banquetCenterZ);
  fortressGroup.add(bTableTop, bRunner);

  for (const pedX of [-5.2, -1.8, 1.8, 5.2]) {
    const ped = new THREE.Mesh(banquetPedestalGeo, furnitureWoodMat);
    ped.position.set(banquetCenterX + pedX, hallFloor1Y, banquetCenterZ);
    fortressGroup.add(ped);
  }

  // 18 Carved Chinese Banquet Chairs around the Grand Table + Porcelain Bowls, Dim-Sum Steamers, Teapots & Roast Duck Platters
  const buildBanquetChair = (cx: number, cz: number, rotY: number) => {
    const ch = new THREE.Group();
    ch.position.set(cx, hallFloor1Y, cz);
    ch.rotation.y = rotY;
    const seat = new THREE.Mesh(chairSeatGeo, imperialCrimsonMat);
    seat.position.y = 0.45;
    const back = new THREE.Mesh(chairBackGeo, furnitureWoodMat);
    back.position.set(0, 0.74, -0.22);
    ch.add(seat, back);
    for (const lx of [-0.21, 0.21]) {
      for (const lz of [-0.21, 0.21]) {
        const leg = new THREE.Mesh(chairLegGeo, furnitureWoodMat);
        leg.position.set(lx, 0.225, lz);
        ch.add(leg);
      }
    }
    fortressGroup.add(ch);
  };

  for (let i = 0; i < 8; i++) {
    const seatX = banquetCenterX - 5.6 + i * 1.6;
    // North side chairs facing South (0) & South side chairs facing North (Math.PI)
    buildBanquetChair(seatX, banquetCenterZ - 1.55, 0);
    buildBanquetChair(seatX, banquetCenterZ + 1.55, Math.PI);

    // Porcelain rice bowls on the table in front of each seat
    const bowlN = new THREE.Mesh(porcelainBowlGeo, pillowClothMat);
    bowlN.position.set(seatX, hallFloor1Y + 0.85, banquetCenterZ - 0.78);
    const bowlS = new THREE.Mesh(porcelainBowlGeo, pillowClothMat);
    bowlS.position.set(seatX, hallFloor1Y + 0.85, banquetCenterZ + 0.78);
    fortressGroup.add(bowlN, bowlS);
  }
  // 2 Head-of-Table Imperial Host Chairs (West & East ends)
  buildBanquetChair(banquetCenterX - 7.35, banquetCenterZ, Math.PI / 2);
  buildBanquetChair(banquetCenterX + 7.35, banquetCenterZ, -Math.PI / 2);

  // Stacked Bamboo Dim-Sum Steamers, Golden Teapots & Feast Platters along the center of the Grand Table
  for (let s = 0; s < 6; s++) {
    const sx = banquetCenterX - 5.0 + s * 2.0;
    if (s % 2 === 0) {
      // 2-tier Bamboo Dim-Sum Steamer stack
      const tier1 = new THREE.Mesh(bambooSteamerGeo, bambooMat);
      tier1.position.set(sx, hallFloor1Y + 0.86, banquetCenterZ);
      const tier2 = new THREE.Mesh(bambooSteamerGeo, bambooMat);
      tier2.position.set(sx, hallFloor1Y + 1.1, banquetCenterZ);
      const teapot = new THREE.Mesh(teapotGeo, imperialGoldMat);
      teapot.position.set(sx + 0.58, hallFloor1Y + 0.98, banquetCenterZ + 0.18);
      fortressGroup.add(tier1, tier2, teapot);
    } else {
      // Feast platter with Glazed Roast Duck
      const platter = new THREE.Mesh(feastPlatterGeo, carvedMarbleMat);
      platter.position.set(sx, hallFloor1Y + 0.86, banquetCenterZ);
      const duck = new THREE.Mesh(roastDuckGeo, roastDuckMat);
      duck.position.set(sx, hallFloor1Y + 1.02, banquetCenterZ);
      fortressGroup.add(platter, duck);
    }
  }

  // TRADITIONAL CHINESE KITCHEN on the West Wing of 1F (x in [-20.8, -12.5], z in [-214.8+FZ, -193.5+FZ]):
  // 1) Brick & Stone Wok Range flush against the Back Wall at (-16.6, -214.2+FZ)
  const stoveX = -16.6;
  const stoveZ = hallBackZ + 1.25; // -214.55 + FZ (flush against back wall!)
  const wokStove = new THREE.Mesh(wokStoveBrickGeo, fortressStoneMat);
  wokStove.position.set(stoveX, hallFloor1Y, stoveZ);
  const exhaustHood = new THREE.Mesh(kitchenHoodGeo, darkIronMat);
  exhaustHood.position.set(stoveX, hallFloor1Y + 3.45, stoveZ);
  fortressGroup.add(wokStove, exhaustHood);

  for (const wxOff of [-1.45, 1.45]) {
    const wokPan = new THREE.Mesh(wokPanGeo, darkIronMat);
    wokPan.position.set(stoveX + wxOff, hallFloor1Y + 1.12, stoveZ);
    const fireGlow = new THREE.Mesh(wokFireGlowGeo, warmLanternMat);
    fireGlow.position.set(stoveX + wxOff, hallFloor1Y + 0.34, stoveZ + 0.92);
    fortressGroup.add(wokPan, fireGlow);
  }
  // Stacked Bamboo Steamers on the center of the Wok Stove
  for (let tier = 0; tier < 3; tier++) {
    const kSteamer = new THREE.Mesh(bambooSteamerGeo, bambooMat);
    kSteamer.position.set(stoveX, hallFloor1Y + 0.96 + tier * 0.24, stoveZ);
    fortressGroup.add(kSteamer);
  }

  // 2) Long Wooden Chef Prep Counter flush against the West Wall (x = -20.4, z = -204.5+FZ)
  const prepX = -20.4;
  const prepZ = hallCenterZ - 1.5;
  const prepCounter = new THREE.Mesh(kitchenPrepCounterGeo, furnitureWoodMat);
  prepCounter.position.set(prepX, hallFloor1Y, prepZ);
  fortressGroup.add(prepCounter);
  for (const bzOff of [-1.8, 0, 1.8]) {
    const cBoard = new THREE.Mesh(cuttingBoardGeo, bambooMat);
    cBoard.position.set(prepX + 0.1, hallFloor1Y + 0.93, prepZ + bzOff);
    const cleaver = new THREE.Mesh(cleaverBladeGeo, darkIronMat);
    cleaver.position.set(prepX + 0.18, hallFloor1Y + 0.97, prepZ + bzOff + 0.18);
    cleaver.rotation.y = 0.35;
    fortressGroup.add(cBoard, cleaver);
  }

  // 3) Sealed Red-Cloth Ceramic Chinese Wine & Soy Jars + Rice Sacks along the West-Front Kitchen Corner
  for (let j = 0; j < 5; j++) {
    const jx = -20.3 + (j % 2) * 0.78;
    const jz = hallFrontZ + 2.2 + j * 1.1;
    const jar = new THREE.Mesh(wineJarGeo, ceramicJarMat);
    jar.position.set(jx, hallFloor1Y + 0.38, jz);
    const jarLid = new THREE.Mesh(wineJarLidGeo, imperialCrimsonMat);
    jarLid.position.set(jx, hallFloor1Y + 0.78, jz);
    fortressGroup.add(jar, jarLid);
  }

  // Framed Chinese Landscape Paintings on the 1F Back Wall behind the Grand Banquet Table
  for (const px of [-9.5, 0, 9.5]) {
    fortressGroup.add(
      createFramedChineseWallPainting(px, hallFloor1Y + 2.85, hallBackZ + 0.36, 0)
    );
  }

  // ============================================================================
  // B) MAIN IMPERIAL HALL 2ND FLOOR (y = hallFloor2Y = 48.20m):
  //    CHINESE MARTIAL ARTS TRAINING DOJO (דוג'ו של אימון לחימה סיני, לא מיטות!)
  // ============================================================================
  // 3 Large Woven Tatami / Wushu Training Mats with Crimson Borders (x = -15.5, -5.0, +5.5)
  for (const matX of [-15.5, -5.0, 5.5]) {
    const mBorder = new THREE.Mesh(dojoMatBorderGeo, imperialCrimsonMat);
    mBorder.position.set(matX, hallFloor2Y + 0.015, hallCenterZ);
    const mInner = new THREE.Mesh(dojoMatGeo, dojoTatamiMat);
    mInner.position.set(matX, hallFloor2Y + 0.028, hallCenterZ);
    fortressGroup.add(mBorder, mInner);
  }

  // 6 Wing-Chun Wooden Martial Arts Training Dummies (בובות עץ לאימון קונג־פו בדוג'ו)
  const dojoDummyBaseGeo = new THREE.CylinderGeometry(0.52, 0.58, 0.14, 10);
  dojoDummyBaseGeo.translate(0, 0.07, 0);
  const dojoDummyTrunkGeo = new THREE.CylinderGeometry(0.18, 0.2, 1.72, 10);
  dojoDummyTrunkGeo.translate(0, 0.86, 0);
  const dojoDummyArmGeo = new THREE.CylinderGeometry(0.042, 0.035, 0.56, 7);
  dojoDummyArmGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(dojoDummyBaseGeo, dojoDummyTrunkGeo, dojoDummyArmGeo);

  for (const [dx, dz, dyaw] of [
    [-17.8, hallCenterZ - 3.5, Math.PI * 0.5],
    [-17.8, hallCenterZ + 3.5, Math.PI * 0.5],
    [-7.5, hallCenterZ - 3.5, 0],
    [-2.5, hallCenterZ - 3.5, 0],
    [3.2, hallCenterZ - 3.5, 0],
    [8.0, hallCenterZ - 3.5, 0],
  ]) {
    const dGroup = new THREE.Group();
    dGroup.position.set(dx, hallFloor2Y + 0.04, dz);
    dGroup.rotation.y = dyaw;
    dGroup.add(
      new THREE.Mesh(dojoDummyBaseGeo, fortressStoneMat),
      new THREE.Mesh(dojoDummyTrunkGeo, furnitureWoodMat)
    );
    for (const [ax, ay, az, ayaw] of [
      [-0.14, 1.3, 0.25, -0.2],
      [0.14, 1.3, 0.25, 0.2],
      [0, 0.96, 0.28, 0],
    ]) {
      const arm = new THREE.Mesh(dojoDummyArmGeo, imperialGoldMat);
      arm.position.set(ax, ay, az);
      arm.rotation.y = ayaw;
      dGroup.add(arm);
    }
    fortressGroup.add(dGroup);
  }

  // 4 Heavy Canvas Striking Sandbags (שקי אגרוף תלויים) suspended from the 2F dojo rafters
  for (const [sbX, sbZ] of [
    [-13.0, hallCenterZ - 3.2],
    [-13.0, hallCenterZ + 3.2],
    [3.2, hallCenterZ + 3.5],
    [8.0, hallCenterZ + 3.5],
  ]) {
    const bagMesh = new THREE.Mesh(sandbagBodyGeo, blanketClothMat);
    bagMesh.position.set(sbX, hallFloor2Y + 1.85, sbZ);
    const chainMesh = new THREE.Mesh(sandbagChainGeo, darkIronMat);
    chainMesh.position.set(sbX, hallFloor2Y + 3.45, sbZ);
    fortressGroup.add(bagMesh, chainMesh);
  }

  // 9 Shaolin Plum-Blossom Balance Poles (עמודי שיווי משקל של שאולין) in the center dojo mat
  for (let p = 0; p < 9; p++) {
    const px = -7.2 + (p % 3) * 2.2;
    const pz = hallCenterZ + 1.4 + Math.floor(p / 3) * 2.1;
    const pScaleY = 0.75 + ((p * 3) % 4) * 0.25;
    const pole = new THREE.Mesh(balancePoleGeo, furnitureWoodMat);
    pole.position.set(px, hallFloor2Y + 0.04, pz);
    pole.scale.set(1, pScaleY, 1);
    fortressGroup.add(pole);
  }

  // 4 Chinese Weapon Racks (מעמדי נשק סיניים - חניתות ומקלות קונג־פו) flush against the Back Wall!
  for (const wrX of [-16.0, -9.5, 0.5, 7.0]) {
    const wrGroup = new THREE.Group();
    wrGroup.position.set(wrX, hallFloor2Y, hallBackZ + 0.55); // Flush against the back wall!
    const postL = new THREE.Mesh(weaponRackPostGeo, furnitureWoodMat);
    postL.position.x = -1.1;
    const postR = new THREE.Mesh(weaponRackPostGeo, furnitureWoodMat);
    postR.position.x = 1.1;
    const barLow = new THREE.Mesh(weaponRackBarGeo, imperialCrimsonMat);
    barLow.position.y = 0.55;
    const barHigh = new THREE.Mesh(weaponRackBarGeo, imperialCrimsonMat);
    barHigh.position.y = 1.35;
    wrGroup.add(postL, postR, barLow, barHigh);
    for (let w = -2; w <= 2; w++) {
      const staff = new THREE.Mesh(weaponStaffGeo, bambooMat);
      staff.position.set(w * 0.42, 1.22, 0.06);
      const blade = new THREE.Mesh(weaponBladeGeo, imperialGoldMat);
      blade.position.set(w * 0.42, 2.52, 0.06);
      wrGroup.add(staff, blade);
    }
    fortressGroup.add(wrGroup);
  }

  // Ceremonial Golden Dojo Gong & Framed Wall Scrolls flush against the 2F Back Wall
  const gongGroup = new THREE.Group();
  gongGroup.position.set(-5.0, hallFloor2Y, hallBackZ + 0.85);
  const gPostL = new THREE.Mesh(gongFramePostGeo, imperialCrimsonMat);
  gPostL.position.x = -1.0;
  const gPostR = new THREE.Mesh(gongFramePostGeo, imperialCrimsonMat);
  gPostR.position.x = 1.0;
  const gTop = new THREE.Mesh(gongFrameTopGeo, imperialCrimsonMat);
  gTop.position.y = 2.45;
  const gDisc = new THREE.Mesh(gongDiscGeo, imperialGoldMat);
  gDisc.position.y = 1.45;
  gongGroup.add(gPostL, gPostR, gTop, gDisc);
  fortressGroup.add(
    gongGroup,
    createFramedChineseWallPainting(-12.8, hallFloor2Y + 2.45, hallBackZ + 0.36, 0),
    createFramedChineseWallPainting(3.8, hallFloor2Y + 2.45, hallBackZ + 0.36, 0)
  );

  // --- 5) ENLARGED WEST & EAST TWO-STORY PAGODA PAVILIONS (18m x 15m at x=±30.0, z=-164.0+FZ) ---
  //     Features: Wooden 1st Floor (42.30m), Swinging Doors [E], Interior Wooden Stairs (z=-159.5+FZ..-167.5+FZ),
  //     3-piece Walkable 2nd Floor (47.40m) with a solid Top-of-Stairs Landing (zero cut-off or hole!),
  //     and Downward-Sloping Perimeter Skirt Roof on Story 1!
  const pavCenterZ = -164.0 + FZ;
  const pavFrontZ = -156.5 + FZ;
  const pavBackZ = -171.5 + FZ;
  const pavFloor1Y = CHINESE_FORTRESS_POS.pavilionFloor1Y; // 42.30m
  const pavFloor2Y = CHINESE_FORTRESS_POS.pavilionFloor2Y; // 47.40m
  const pavH1 = pavFloor2Y - pavFloor1Y; // 5.1m
  const pavH2 = 4.2;

  const pavPlinthGeo = new THREE.BoxGeometry(18.6, 0.3, 15.6);
  const pavFloor1Geo = new THREE.BoxGeometry(17.6, 0.14, 14.6);
  // 3 non-overlapping 2nd-floor wooden deck sections surrounding the 3.8m x 8.0m stairwell opening (z = -167.5+FZ..-159.5+FZ):
  const pavFloor2MainGeo = new THREE.BoxGeometry(13.8, 0.2, 14.6); // Main 13.8m x 14.6m hall deck
  const pavFloor2TopLandingGeo = new THREE.BoxGeometry(3.8, 0.2, 3.8); // Solid landing deck at the top of the stairs (z = -171.3+FZ..-167.5+FZ)
  const pavFloor2FrontPatchGeo = new THREE.BoxGeometry(3.8, 0.2, 2.8); // Solid front corner deck before the foot of the stairs (z = -159.5+FZ..-156.7+FZ)
  const pavStairGuardRailGeo = new THREE.BoxGeometry(0.18, 0.95, 8.0);
  const pavWallBackGeo = new THREE.BoxGeometry(18.0, pavH1 + pavH2, 0.5);
  const pavWallSideGeo = new THREE.BoxGeometry(0.5, pavH1 + pavH2, 14.5);
  const pavWallFrontFlankGeo = new THREE.BoxGeometry(7.5, pavH1, 0.5);
  const pavWallFrontUpperGeo = new THREE.BoxGeometry(18.0, pavH2, 0.5);
  const pavStairStepGeo = new THREE.BoxGeometry(3.55, 0.26, 0.54);
  disposableGeometries.push(
    pavPlinthGeo,
    pavFloor1Geo,
    pavFloor2MainGeo,
    pavFloor2TopLandingGeo,
    pavFloor2FrontPatchGeo,
    pavStairGuardRailGeo,
    pavWallBackGeo,
    pavWallSideGeo,
    pavWallFrontFlankGeo,
    pavWallFrontUpperGeo,
    pavStairStepGeo
  );

  const wardrobeCrownGeo = new THREE.BoxGeometry(1.56, 0.14, 0.8);
  const wardrobeHandleGeo = new THREE.BoxGeometry(0.05, 0.22, 0.06);
  disposableGeometries.push(wardrobeCrownGeo, wardrobeHandleGeo);

  // Helper to build a tall carved Chinese wooden wardrobe (ארון עץ סיני) at (wx, wy, wz, rotY)
  const buildPavilionWardrobe = (wx: number, wy: number, wz: number, rotY: number) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(wx, wy, wz);
    wGroup.rotation.y = rotY;
    const body = new THREE.Mesh(wardrobeBodyGeo, furnitureWoodMat);
    body.position.y = 1.125;
    const crown = new THREE.Mesh(wardrobeCrownGeo, imperialCrimsonMat);
    crown.position.y = 2.3;
    const seam = new THREE.Mesh(wardrobeDoorSeamGeo, darkIronMat);
    seam.position.set(0, 1.125, 0.02);
    const handleL = new THREE.Mesh(wardrobeHandleGeo, imperialGoldMat);
    handleL.position.set(-0.12, 1.15, 0.39);
    const handleR = new THREE.Mesh(wardrobeHandleGeo, imperialGoldMat);
    handleR.position.set(0.12, 1.15, 0.39);
    wGroup.add(body, crown, seam, handleL, handleR);
    fortressGroup.add(wGroup);
  };

  // Helper to build a wooden table with chairs on the open room side (שולחן צמוד לקיר והכיסאות בצד הפתוח)
  const buildWallFlushTableAndChairs = (tx: number, ty: number, tz: number, rotY: number) => {
    const tGroup = new THREE.Group();
    tGroup.position.set(tx, ty, tz);
    tGroup.rotation.y = rotY;
    const top = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
    top.position.y = 0.78;
    tGroup.add(top);
    for (const lx of [-0.95, 0.95]) {
      for (const lz of [-0.45, 0.45]) {
        const leg = new THREE.Mesh(tableLegGeo, furnitureWoodMat);
        leg.position.set(lx, 0.38, lz);
        tGroup.add(leg);
      }
    }
    // 2 chairs placed on the OPEN side of the table (local +Z = +0.78m) facing the wall-flush table (rotY = Math.PI)!
    for (const cx of [-0.58, 0.58]) {
      const ch = new THREE.Group();
      ch.position.set(cx, 0, 0.78);
      ch.rotation.y = Math.PI;
      const seat = new THREE.Mesh(chairSeatGeo, furnitureWoodMat);
      seat.position.y = 0.45;
      const back = new THREE.Mesh(chairBackGeo, furnitureWoodMat);
      back.position.set(0, 0.74, -0.22);
      ch.add(seat, back);
      for (const clx of [-0.21, 0.21]) {
        for (const clz of [-0.21, 0.21]) {
          const cleg = new THREE.Mesh(chairLegGeo, furnitureWoodMat);
          cleg.position.set(clx, 0.225, clz);
          ch.add(cleg);
        }
      }
      tGroup.add(ch);
    }
    fortressGroup.add(tGroup);
  };

  for (const px of [-30.0, 30.0]) {
    const isWest = px < 0;
    const innerDir = isWest ? 1 : -1; // +1 for West Pavilion (inner wall at px + 9.0 = -21.0), -1 for East Pavilion (inner wall at px - 9.0 = +21.0)
    const doorId = isWest ? 'west-pavilion-door' : 'east-pavilion-door';

    const plinth = new THREE.Mesh(pavPlinthGeo, carvedMarbleMat);
    plinth.position.set(px, summitY + 0.15, pavCenterZ);
    const floor1 = new THREE.Mesh(pavFloor1Geo, imperialWoodFloorMat);
    floor1.position.set(px, pavFloor1Y - 0.05, pavCenterZ);
    floor1.receiveShadow = !isSoftwareGl;

    // 3-piece 2nd story wooden floor at y = pavFloor2Y (47.40m) with a solid landing at the top of the stairs (zero hole!)
    const floor2Main = new THREE.Mesh(pavFloor2MainGeo, imperialWoodFloorMat);
    floor2Main.position.set(px + (isWest ? 1.9 : -1.9), pavFloor2Y - 0.1, pavCenterZ);
    const outerStripX = px + (isWest ? -6.9 : 6.9); // -36.9 for West, +36.9 for East
    const floor2TopLanding = new THREE.Mesh(pavFloor2TopLandingGeo, imperialWoodFloorMat);
    floor2TopLanding.position.set(outerStripX, pavFloor2Y - 0.1, -169.4 + FZ);
    const floor2FrontPatch = new THREE.Mesh(pavFloor2FrontPatchGeo, imperialWoodFloorMat);
    floor2FrontPatch.position.set(outerStripX, pavFloor2Y - 0.1, -158.1 + FZ);
    const stairGuardRail = new THREE.Mesh(pavStairGuardRailGeo, imperialCrimsonMat);
    stairGuardRail.position.set(px + (isWest ? -4.95 : 4.95), pavFloor2Y + 0.47, -163.5 + FZ);
    fortressGroup.add(plinth, floor1, floor2Main, floor2TopLanding, floor2FrontPatch, stairGuardRail);

    // Hollow Crimson Walls
    const backW = new THREE.Mesh(pavWallBackGeo, imperialCrimsonMat);
    backW.position.set(px, pavFloor1Y + (pavH1 + pavH2) * 0.5, pavBackZ);
    const westW = new THREE.Mesh(pavWallSideGeo, imperialCrimsonMat);
    westW.position.set(px - 9.0, pavFloor1Y + (pavH1 + pavH2) * 0.5, pavCenterZ);
    const eastW = new THREE.Mesh(pavWallSideGeo, imperialCrimsonMat);
    eastW.position.set(px + 9.0, pavFloor1Y + (pavH1 + pavH2) * 0.5, pavCenterZ);
    fortressGroup.add(backW, westW, eastW);

    for (const fx of [px - 5.25, px + 5.25]) {
      const fFlank = new THREE.Mesh(pavWallFrontFlankGeo, imperialCrimsonMat);
      fFlank.position.set(fx, pavFloor1Y + pavH1 * 0.5, pavFrontZ);
      fortressGroup.add(fFlank);
    }
    const fUpper = new THREE.Mesh(pavWallFrontUpperGeo, imperialCrimsonMat);
    fUpper.position.set(px, pavFloor2Y + pavH2 * 0.5, pavFrontZ);
    fortressGroup.add(fUpper);

    // Interactive Double Door (width 3.0m at z = -156.5 + FZ)
    fortressGroup.add(createInteractiveDoubleDoor(doorId, px, pavFloor1Y, pavFrontZ, 3.0, 3.8));

    // Interior Wooden Staircase to 2nd Floor (z = -159.5+FZ to -167.5+FZ, meeting the solid top landing at -167.5+FZ!)
    const pavSteps = 20;
    for (let s = 0; s <= pavSteps; s++) {
      const t = s / pavSteps;
      const sz = -159.5 + FZ - t * 8.0;
      const sy = pavFloor1Y + t * pavH1;
      const pStep = new THREE.Mesh(pavStairStepGeo, imperialWoodFloorMat);
      pStep.position.set(outerStripX, sy - 0.13, sz);
      fortressGroup.add(pStep);
    }

    // ============================================================================
    // 1ST FLOOR OF SIDE PAVILION (y = pavFloor1Y = 42.30m):
    // - Tables & Wardrobes FLUSH AGAINST THE WALLS (צמוד לקיר השולחן והארון)
    // - Chairs moved to the open side facing the tables (ושהכיסא יזוז בהתאם)
    // - Bed completely REMOVED (ולהעלים את המיטה)
    // - Framed Chinese Wall Paintings hung on the walls (תמונה על הקיר)
    // ============================================================================
    // Table #1 flush against the Back Wall (z = pavBackZ + 0.85) with 2 chairs on the open South side
    buildWallFlushTableAndChairs(px + innerDir * 1.2, pavFloor1Y, pavBackZ + 0.85, 0);
    // Table #2 flush against the Inner Side Wall (x = px + innerDir * 8.05) with 2 chairs on the open inner room side
    buildWallFlushTableAndChairs(
      px + innerDir * 8.05,
      pavFloor1Y,
      pavCenterZ + 0.8,
      isWest ? -Math.PI / 2 : Math.PI / 2
    );
    // Wardrobe #1 flush against the Back Wall (z = pavBackZ + 0.68)
    buildPavilionWardrobe(px + innerDir * 5.6, pavFloor1Y, pavBackZ + 0.68, 0);
    // Wardrobe #2 flush against the Inner Side Wall (x = px + innerDir * 8.22)
    buildPavilionWardrobe(
      px + innerDir * 8.22,
      pavFloor1Y,
      pavBackZ + 3.8,
      isWest ? -Math.PI / 2 : Math.PI / 2
    );

    // 2 Framed Chinese Landscape Paintings mounted flush on the 1st Floor Back Wall & Inner Side Wall (תמונה על הקיר!)
    fortressGroup.add(
      createFramedChineseWallPainting(px + innerDir * 1.2, pavFloor1Y + 2.45, pavBackZ + 0.3, 0),
      createFramedChineseWallPainting(
        px + innerDir * 8.7,
        pavFloor1Y + 2.45,
        pavCenterZ + 0.8,
        isWest ? -Math.PI / 2 : Math.PI / 2
      )
    );

    // ============================================================================
    // 2ND FLOOR OF SIDE PAVILION (y = pavFloor2Y = 47.40m):
    // - Sleeping Bags FLUSH AGAINST THE WALLS IN NEAT ROWS (שקי שינה צמודים לקירות בשורה)
    // - Dedicated Wardrobe Section (וחלק בחדר שיש ארונות) along the Front Wall
    // - Ornate Chinese Carpet in the open center of the room
    // ============================================================================
    const pavCarpetCenterX = px + innerDir * 2.2;
    const pBorder = new THREE.Mesh(pavCarpetBorderGeo, imperialGoldMat);
    pBorder.position.set(pavCarpetCenterX, pavFloor2Y + 0.015, pavCenterZ);
    const pInner = new THREE.Mesh(pavCarpetGeo, imperialCrimsonMat);
    pInner.position.set(pavCarpetCenterX, pavFloor2Y + 0.025, pavCenterZ);
    fortressGroup.add(pBorder, pInner);

    // Row 1: 5 Quilted Sleeping Bags in a neat row FLUSH AGAINST THE BACK WALL (z = pavBackZ + 1.32, pillows against back wall!)
    for (let r = 0; r < 5; r++) {
      const sbX = px + innerDir * (-2.6 + r * 2.1);
      const sbZ = pavBackZ + 1.32;
      const bagMat = sleepingBagColors[(r + (isWest ? 0 : 1)) % sleepingBagColors.length];
      const sbBody = new THREE.Mesh(fSleepingBagGeo, bagMat);
      sbBody.position.set(sbX, pavFloor2Y + 0.03, sbZ);
      const sbPillow = new THREE.Mesh(fSleepingPillowGeo, pillowClothMat);
      sbPillow.position.set(sbX, pavFloor2Y + 0.03, sbZ - 0.65);
      fortressGroup.add(sbBody, sbPillow);
    }

    // Row 2: 4 Quilted Sleeping Bags in a neat row FLUSH AGAINST THE INNER SIDE WALL (x = px + innerDir * 7.62, rotated so heads rest against the wall!)
    for (let r = 0; r < 4; r++) {
      const sbX = px + innerDir * 7.62;
      const sbZ = pavCenterZ - 2.6 + r * 1.95;
      const bagMat = sleepingBagColors[(r + (isWest ? 2 : 3)) % sleepingBagColors.length];
      const sbBody = new THREE.Mesh(fSleepingBagGeo, bagMat);
      sbBody.position.set(sbX, pavFloor2Y + 0.03, sbZ);
      sbBody.rotation.y = isWest ? -Math.PI / 2 : Math.PI / 2;
      const sbPillow = new THREE.Mesh(fSleepingPillowGeo, pillowClothMat);
      sbPillow.position.set(sbX + innerDir * 0.65, pavFloor2Y + 0.03, sbZ);
      sbPillow.rotation.y = isWest ? -Math.PI / 2 : Math.PI / 2;
      fortressGroup.add(sbBody, sbPillow);
    }

    // Dedicated Wardrobe Section (חלק בחדר שיש ארונות): 4 Tall Chinese Wardrobes flush against the Front Wall (z = pavFrontZ - 0.72, facing North into the room)
    for (let w = 0; w < 4; w++) {
      const wx = px + innerDir * (-1.2 + w * 2.6);
      buildPavilionWardrobe(wx, pavFloor2Y, pavFrontZ - 0.72, Math.PI);
    }

    // Story 1 Roof: Downward-sloping Hollow Perimeter Eave Skirt embedded into the 18m x 15m walls!
    const pavSkirtRoof1 = createChinesePerimeterSkirtRoof(18.0, 15.0, 2.0, 1.05);
    pavSkirtRoof1.position.set(px, pavFloor2Y + 0.05, pavCenterZ);
    // Story 2 Top Roof: Full Pagoda Roof crowning the 2nd floor
    const pavRoof2 = createChinesePagodaRoof(20.4, 17.4, 3.4);
    pavRoof2.position.set(px, pavFloor2Y + pavH2 - 0.15, pavCenterZ);
    fortressGroup.add(
      pavSkirtRoof1,
      pavRoof2,
      createRedChineseLantern(px, pavFloor1Y + 4.2, pavCenterZ),
      createRedChineseLantern(px, pavFloor2Y + 3.4, pavCenterZ)
    );
  }

  // --- 6) 4 TALL TWO-STORY CORNER WATCHTOWERS (SW, SE, NW, NE at x=±45.5, z=-128.5+FZ & -213.5+FZ) ---
  //     - Placed at all 4 corners where the trimmed rampart walls meet (100% ZERO Z-fighting!).
  //     - Interactive [E] Open doors face INSIDE the courtyard.
  //     - 2 upper floors above ground floor: Floor 1 (42.25m), Floor 2 (47.20m), Floor 3 High Lookout (52.00m).
  //     - Floor 2 has direct 3.6m-wide OPEN PASSAGES onto both the West/East and North/South Rampart Walls!
  //     - Climbable vertical corner ladder (סולם טיפוס) in the inner courtyard corner of each tower!
  const wtFloor1Y = CHINESE_FORTRESS_POS.watchtowerFloor1Y; // 42.25m
  const wtFloor2Y = CHINESE_FORTRESS_POS.watchtowerFloor2Y; // 47.20m
  const wtFloor3Y = CHINESE_FORTRESS_POS.watchtowerFloor3Y; // 52.00m
  const wtH1 = wtFloor2Y - wtFloor1Y; // 4.95m
  const wtH2 = wtFloor3Y - wtFloor2Y; // 4.80m
  const wtH3 = 4.30; // 52.00m -> 56.30m

  const wtFloor1Geo = new THREE.BoxGeometry(10.2, 0.25, 10.2);
  // Non-overlapping upper floor decks leaving a 2.0m x 2.0m corner hatch for the climbable corner ladder:
  // Main strip (8.2m wide x 10.2m deep) + side strip (2.0m wide x 8.2m deep) -> zero overlap!
  const wtUpperDeckMainGeo = new THREE.BoxGeometry(8.2, 0.24, 10.2);
  const wtUpperDeckSideGeo = new THREE.BoxGeometry(2.0, 0.24, 8.2);
  const wtWallSolidZGeo = new THREE.BoxGeometry(11.65, wtH1, 0.65);
  const wtWallSolidXGeo = new THREE.BoxGeometry(0.65, wtH1, 10.35);
  const wtWallDoorFlankGeo = new THREE.BoxGeometry(4.1, wtH1, 0.65);
  const wtCornerPillarGeo = new THREE.CylinderGeometry(0.32, 0.36, wtH2 + wtH3, 10);
  const wtParapetRailZGeo = new THREE.BoxGeometry(9.6, 1.05, 0.36);
  const wtParapetRailXGeo = new THREE.BoxGeometry(0.36, 1.05, 9.6);
  // Shortened 6.2m Floor-2 inner parapet rails that protect the ladder corner while leaving a 3.6m OPEN PASSAGE onto the Rampart Walls!
  const wtFloor2InnerParapetZGeo = new THREE.BoxGeometry(6.2, 1.05, 0.36);
  const wtFloor2InnerParapetXGeo = new THREE.BoxGeometry(0.36, 1.05, 6.2);
  const supplyCrateGeo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
  const ladderRailGeo = new THREE.CylinderGeometry(0.055, 0.055, wtH1 + wtH2 + 1.1, 8);
  const ladderRungGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.78, 8);
  ladderRungGeo.rotateZ(Math.PI / 2);
  disposableGeometries.push(
    wtFloor1Geo,
    wtUpperDeckMainGeo,
    wtUpperDeckSideGeo,
    wtWallSolidZGeo,
    wtWallSolidXGeo,
    wtWallDoorFlankGeo,
    wtCornerPillarGeo,
    wtParapetRailZGeo,
    wtParapetRailXGeo,
    wtFloor2InnerParapetZGeo,
    wtFloor2InnerParapetXGeo,
    supplyCrateGeo,
    ladderRailGeo,
    ladderRungGeo
  );

  for (let i = 0; i < CORNER_WATCHTOWERS.length; i++) {
    const tw = CORNER_WATCHTOWERS[i];
    const isWest = tw.cx < 0;
    const isSouth = tw.cz > -170 + FZ; // SW & SE towers at z = -128.5+FZ; NW & NE towers at z = -213.5+FZ

    // 1) Ground Floor Wooden Deck (42.25m)
    const wtFloor1 = new THREE.Mesh(wtFloor1Geo, imperialWoodFloorMat);
    wtFloor1.position.set(tw.cx, wtFloor1Y - 0.12, tw.cz);
    wtFloor1.receiveShadow = !isSoftwareGl;
    fortressGroup.add(wtFloor1);

    // 2) Floor 2 (47.20m) & Floor 3 (52.00m) Non-Overlapping Wooden Decks with a 2.0m x 2.0m Corner Ladder Hatch
    const mainDeckOffsetX = isWest ? -1.0 : 1.0;
    const sideDeckOffsetX = isWest ? 4.1 : -4.1;
    const sideDeckOffsetZ = isSouth ? 1.0 : -1.0;

    for (const deckY of [wtFloor2Y, wtFloor3Y]) {
      const mainDeck = new THREE.Mesh(wtUpperDeckMainGeo, imperialWoodFloorMat);
      mainDeck.position.set(tw.cx + mainDeckOffsetX, deckY - 0.12, tw.cz);
      mainDeck.receiveShadow = !isSoftwareGl;

      const sideDeck = new THREE.Mesh(wtUpperDeckSideGeo, imperialWoodFloorMat);
      sideDeck.position.set(tw.cx + sideDeckOffsetX, deckY - 0.12, tw.cz + sideDeckOffsetZ);
      sideDeck.receiveShadow = !isSoftwareGl;
      fortressGroup.add(mainDeck, sideDeck);
    }

    // 3) Ground Story Hollow Stone Walls (Solid on the 3 non-door sides; Doorway on the courtyard-facing Z wall!)
    const solidZWallPos = isSouth ? tw.cz + 5.5 : tw.cz - 5.5;
    const solidZWall = new THREE.Mesh(wtWallSolidZGeo, fortressStoneMat);
    solidZWall.position.set(tw.cx, wtFloor1Y + wtH1 * 0.5, solidZWallPos);
    const westWall = new THREE.Mesh(wtWallSolidXGeo, fortressStoneMat);
    westWall.position.set(tw.cx - 5.5, wtFloor1Y + wtH1 * 0.5, tw.cz);
    const eastWall = new THREE.Mesh(wtWallSolidXGeo, fortressStoneMat);
    eastWall.position.set(tw.cx + 5.5, wtFloor1Y + wtH1 * 0.5, tw.cz);
    fortressGroup.add(solidZWall, westWall, eastWall);

    for (const fx of [tw.cx - 3.45, tw.cx + 3.45]) {
      const fFlank = new THREE.Mesh(wtWallDoorFlankGeo, fortressStoneMat);
      fFlank.position.set(fx, wtFloor1Y + wtH1 * 0.5, tw.doorZ);
      fortressGroup.add(fFlank);
    }

    // Interactive Courtyard-Facing Double Door [E]
    fortressGroup.add(createInteractiveDoubleDoor(tw.doorId, tw.cx, wtFloor1Y, tw.doorZ, 2.8, 3.6));

    // 4) Climbable Corner Ladder (סולם טיפוס בפינה הפנימית) rising from Floor 1 -> Floor 2 -> Floor 3
    const ladderGroup = new THREE.Group();
    ladderGroup.position.set(tw.ladderX, wtFloor1Y + (wtH1 + wtH2 + 1.1) * 0.5, tw.ladderZ);
    ladderGroup.rotation.y = (isWest ? -1 : 1) * (isSouth ? 1 : -1) * (Math.PI * 0.25);
    const railL = new THREE.Mesh(ladderRailGeo, imperialCrimsonMat);
    railL.position.x = -0.38;
    const railR = new THREE.Mesh(ladderRailGeo, imperialCrimsonMat);
    railR.position.x = 0.38;
    ladderGroup.add(railL, railR);

    const numRungs = 28;
    const totalLadderH = wtH1 + wtH2 + 0.8;
    for (let r = 0; r <= numRungs; r++) {
      const rung = new THREE.Mesh(ladderRungGeo, imperialGoldMat);
      rung.position.y = -(wtH1 + wtH2 + 1.1) * 0.5 + 0.35 + (r / numRungs) * totalLadderH;
      ladderGroup.add(rung);
    }
    fortressGroup.add(ladderGroup);

    // 5) Wooden Supply Crates stacked in the outer corner of Floor 1 (opposite the inner ladder)
    const crateCornerX = tw.cx + (isWest ? -3.4 : 3.4);
    const crateCornerZ = tw.cz + (isSouth ? 3.4 : -3.4);
    for (const [ox, oy, oz] of [
      [0, 0.58, 0],
      [isWest ? 1.25 : -1.25, 0.58, 0.1],
      [isWest ? 0.5 : -0.5, 1.72, 0.05],
    ]) {
      const crate = new THREE.Mesh(supplyCrateGeo, imperialWoodFloorMat);
      crate.position.set(crateCornerX + ox, wtFloor1Y + oy, crateCornerZ + oz);
      fortressGroup.add(crate);
    }

    // 6) Upper Stories (Floor 2 & Floor 3): Tall Crimson Corner Pillars on outer wall corners (±5.15m)
    for (const cx of [tw.cx - 5.15, tw.cx + 5.15]) {
      for (const cz of [tw.cz - 5.15, tw.cz + 5.15]) {
        const col = new THREE.Mesh(wtCornerPillarGeo, imperialCrimsonMat);
        col.position.set(cx, wtFloor2Y + (wtH2 + wtH3) * 0.5, cz);
        fortressGroup.add(col);
      }
    }

    // Floor 2 Outer Perimeter Parapets (preventing falling off the outer cliff of the watchtower)
    const outerZWallFloor2 = new THREE.Mesh(wtParapetRailZGeo, fortressStoneMat);
    outerZWallFloor2.position.set(tw.cx, wtFloor2Y + 0.52, isSouth ? tw.cz + 5.2 : tw.cz - 5.2);
    const outerXWallFloor2 = new THREE.Mesh(wtParapetRailXGeo, fortressStoneMat);
    outerXWallFloor2.position.set(isWest ? tw.cx - 5.2 : tw.cx + 5.2, wtFloor2Y + 0.52, tw.cz);
    fortressGroup.add(outerZWallFloor2, outerXWallFloor2);

    // Floor 2 Inner Courtyard Parapet Rails (shortened to 6.2m so they guard the ladder corner while leaving a wide 3.6m OPEN PASSAGE onto the West/East and North/South Rampart Walls!)
    const innerZRail = new THREE.Mesh(wtFloor2InnerParapetZGeo, imperialCrimsonMat);
    innerZRail.position.set(
      tw.cx + (isWest ? 1.7 : -1.7),
      wtFloor2Y + 0.52,
      isSouth ? tw.cz - 5.2 : tw.cz + 5.2
    );
    const innerXRail = new THREE.Mesh(wtFloor2InnerParapetXGeo, imperialCrimsonMat);
    innerXRail.position.set(
      isWest ? tw.cx + 5.2 : tw.cx - 5.2,
      wtFloor2Y + 0.52,
      tw.cz + (isSouth ? -1.7 : 1.7)
    );
    fortressGroup.add(innerZRail, innerXRail);

    // Protective crimson parapet railings on all 4 sides of Floor 3 High Lookout (52.0m)
    for (const rz of [tw.cz - 5.2, tw.cz + 5.2]) {
      const railZ = new THREE.Mesh(wtParapetRailZGeo, imperialCrimsonMat);
      railZ.position.set(tw.cx, wtFloor3Y + 0.52, rz);
      fortressGroup.add(railZ);
    }
    for (const rx of [tw.cx - 5.2, tw.cx + 5.2]) {
      const railX = new THREE.Mesh(wtParapetRailXGeo, imperialCrimsonMat);
      railX.position.set(rx, wtFloor3Y + 0.52, tw.cz);
      fortressGroup.add(railX);
    }

    // Downward-sloping Hollow Perimeter Eave Skirt Roof below Floor 3 + Crowning Pagoda Roof!
    const wtSkirtRoof2 = createChinesePerimeterSkirtRoof(10.8, 10.8, 1.75, 1.05);
    wtSkirtRoof2.position.set(tw.cx, wtFloor3Y + 0.05, tw.cz);
    const wtTopRoof = createChinesePagodaRoof(13.6, 13.6, 3.5);
    wtTopRoof.position.set(tw.cx, wtFloor3Y + wtH3 - 0.1, tw.cz);

    fortressGroup.add(
      wtSkirtRoof2,
      wtTopRoof,
      createRedChineseLantern(tw.cx, wtFloor1Y + 4.1, tw.cz),
      createRedChineseLantern(tw.cx, wtFloor2Y + 3.9, tw.cz),
      createRedChineseLantern(tw.cx, wtFloor3Y + 3.5, tw.cz),
      createAngledWatchtowerFlag(
        tw.cx + (isWest ? -5.15 : 5.15),
        wtFloor3Y + 2.15,
        tw.cz + (isSouth ? 5.15 : -5.15),
        Math.atan2(isSouth ? -1 : 1, isWest ? -1 : 1)
      )
    );
  }

  // --- 7) SURPRISE COURTYARD UPGRADE: IMPERIAL KUNG-FU TRAINING GROUNDS (מתחם אימוני קונג־פו בחצר המבצר) ---
  //     Wing-Chun Wooden Dummies (בובות עץ לאימון), Halberd Weapon Racks & Bullseye Archery Targets!
  const dummyTrunkGeo = new THREE.CylinderGeometry(0.18, 0.2, 1.75, 10);
  dummyTrunkGeo.translate(0, 0.88, 0);
  const dummyBaseGeo = new THREE.CylinderGeometry(0.55, 0.62, 0.14, 10);
  dummyBaseGeo.translate(0, 0.07, 0);
  const dummyArmPegGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.58, 7);
  dummyArmPegGeo.rotateX(Math.PI / 2);
  const archeryStandGeo = new THREE.BoxGeometry(0.12, 1.85, 0.12);
  archeryStandGeo.translate(0, 0.92, 0);
  const archeryDiscOuterGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.12, 16);
  archeryDiscOuterGeo.rotateX(Math.PI / 2);
  const archeryDiscInnerGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.14, 14);
  archeryDiscInnerGeo.rotateX(Math.PI / 2);
  const archeryBullseyeGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.16, 12);
  archeryBullseyeGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(
    dummyTrunkGeo,
    dummyBaseGeo,
    dummyArmPegGeo,
    archeryStandGeo,
    archeryDiscOuterGeo,
    archeryDiscInnerGeo,
    archeryBullseyeGeo
  );

  // 4 Wing-Chun Wooden Training Dummies in front of the Shaolin Monks in the courtyard
  for (const [dx, dz, dyaw] of [
    [-14.5, -143.5 + FZ, Math.PI],
    [14.5, -143.5 + FZ, Math.PI],
    [-14.5, -159.5 + FZ, Math.PI],
    [14.5, -159.5 + FZ, Math.PI],
  ]) {
    const dummyGroup = new THREE.Group();
    dummyGroup.position.set(dx, summitY, dz);
    dummyGroup.rotation.y = dyaw;
    dummyGroup.add(new THREE.Mesh(dummyBaseGeo, fortressStoneMat), new THREE.Mesh(dummyTrunkGeo, furnitureWoodMat));
    for (const [ax, ay, az, ayaw] of [
      [-0.14, 1.32, 0.25, -0.2],
      [0.14, 1.32, 0.25, 0.2],
      [0, 0.98, 0.28, 0],
    ]) {
      const armPeg = new THREE.Mesh(dummyArmPegGeo, imperialGoldMat);
      armPeg.position.set(ax, ay, az);
      armPeg.rotation.y = ayaw;
      dummyGroup.add(armPeg);
    }
    fortressGroup.add(dummyGroup);
  }

  // 4 Imperial Archery Bullseye Targets along the North-East and North-West courtyard flanks
  for (const [tx, tz] of [
    [-18.0, -182.0 + FZ],
    [-12.5, -182.0 + FZ],
    [12.5, -182.0 + FZ],
    [18.0, -182.0 + FZ],
  ]) {
    const targetGroup = new THREE.Group();
    targetGroup.position.set(tx, summitY, tz);
    const standL = new THREE.Mesh(archeryStandGeo, furnitureWoodMat);
    standL.position.set(-0.42, 0, 0);
    const standR = new THREE.Mesh(archeryStandGeo, furnitureWoodMat);
    standR.position.set(0.42, 0, 0);
    const discOuter = new THREE.Mesh(archeryDiscOuterGeo, carvedMarbleMat);
    discOuter.position.set(0, 1.25, 0.06);
    const discInner = new THREE.Mesh(archeryDiscInnerGeo, imperialCrimsonMat);
    discInner.position.set(0, 1.25, 0.06);
    const bullseye = new THREE.Mesh(archeryBullseyeGeo, imperialGoldMat);
    bullseye.position.set(0, 1.25, 0.06);
    targetGroup.add(standL, standR, discOuter, discInner, bullseye);
    fortressGroup.add(targetGroup);
  }

  // ============================================================================
  // 8) 3 TALL TWO-STORY CHINESE HILL WATCHTOWERS ON THE MOUNTAIN SUMMITS
  //    + ASCENDING WALKABLE ROPE & WOODEN-PLANK SUSPENSION BRIDGE
  //    - Taller (deckH = 9.0m above summit), Enclosed 1st floor with interactive [E] doors
  //    - Placed on the true summit of each hill (zero crater!)
  //    - Angled flags projecting diagonally outward from the corner pillars (zero roof clipping!)
  //    - Rotated to align 100% with the Rope Bridge for a completely clear, unobstructed gateway!
  // ============================================================================
  const hwBasePlinthGeo = new THREE.BoxGeometry(7.8, 1.4, 7.8);
  const hwGroundFloorWoodGeo = new THREE.BoxGeometry(7.0, 0.22, 7.0);
  const hwFloor1WallH = 9.0;
  const hwWallSolidZGeo = new THREE.BoxGeometry(7.2, hwFloor1WallH, 0.46);
  const hwWallSolidXGeo = new THREE.BoxGeometry(0.46, hwFloor1WallH, 7.2);
  const hwWallDoorFlankGeo = new THREE.BoxGeometry(2.5, hwFloor1WallH, 0.46);
  const hwWallDoorLintelGeo = new THREE.BoxGeometry(2.3, hwFloor1WallH - 3.2, 0.48);
  // Non-overlapping upper deck at y = 9.0m leaving a 1.8m x 1.8m corner hatch around (+2.2, +2.2)
  const hwDeckMainGeo = new THREE.BoxGeometry(7.2, 0.24, 5.2);
  const hwDeckSideStripGeo = new THREE.BoxGeometry(4.9, 0.24, 2.0);
  const hwUpperPillarGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.2, 8);
  hwUpperPillarGeo.translate(0, 2.1, 0);
  const hwRailFullZGeo = new THREE.BoxGeometry(7.2, 0.98, 0.2);
  const hwRailFullXGeo = new THREE.BoxGeometry(0.2, 0.98, 7.2);
  // Shortened 1.90m side parapet segments leaving a wide 3.30m (lx in [-1.65, +1.65]) unobstructed bridge gateway!
  const hwRailBridgeFlankGeo = new THREE.BoxGeometry(1.9, 0.98, 0.2);
  const hwBridgeGatePostGeo = new THREE.BoxGeometry(0.26, 1.28, 0.26);
  const hwLadderRailGeo = new THREE.BoxGeometry(0.11, 9.2, 0.11);
  const hwLadderRungGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.74, 6);
  hwLadderRungGeo.rotateZ(Math.PI / 2);
  disposableGeometries.push(
    hwBasePlinthGeo,
    hwGroundFloorWoodGeo,
    hwWallSolidZGeo,
    hwWallSolidXGeo,
    hwWallDoorFlankGeo,
    hwWallDoorLintelGeo,
    hwDeckMainGeo,
    hwDeckSideStripGeo,
    hwUpperPillarGeo,
    hwRailFullZGeo,
    hwRailFullXGeo,
    hwRailBridgeFlankGeo,
    hwBridgeGatePostGeo,
    hwLadderRailGeo,
    hwLadderRungGeo
  );

  for (let i = 0; i < HILL_WATCHTOWERS.length; i++) {
    const hw = HILL_WATCHTOWERS[i];
    const hwGroup = new THREE.Group();
    hwGroup.position.set(hw.x, hw.baseY, hw.z);
    hwGroup.rotation.y = hw.yaw;
    const deckH = hw.deckY - hw.baseY; // 9.0m above summit!

    // 1) Stone summit plinth + 1st floor wooden deck + Upper lookout wooden deck (with 1.8m x 1.8m corner hatch at (+2.2, +2.2))
    const plinth = new THREE.Mesh(hwBasePlinthGeo, fortressStoneMat);
    plinth.position.set(0, -0.62, 0);
    const groundWoodFloor = new THREE.Mesh(hwGroundFloorWoodGeo, imperialWoodFloorMat);
    groundWoodFloor.position.set(0, 0.04, 0);
    const deckMain = new THREE.Mesh(hwDeckMainGeo, imperialWoodFloorMat);
    deckMain.position.set(0, deckH - 0.12, -1.0); // covers lz in [-3.6, +1.6]
    const deckStrip = new THREE.Mesh(hwDeckSideStripGeo, imperialWoodFloorMat);
    deckStrip.position.set(-1.15, deckH - 0.12, 2.6); // covers lx in [-3.6, +1.3], lz in [+1.6, +3.6]
    hwGroup.add(plinth, groundWoodFloor, deckMain, deckStrip);

    // 2) Enclosed 1st Floor Walls (סגורים בקומה הראשונה, y = 0..5.05m) + Interactive Double Door [E]
    const nonDoorZ = -hw.doorSideLocalZ * 3.45;
    const doorZ = hw.doorSideLocalZ * 3.45;
    const solidZWall = new THREE.Mesh(hwWallSolidZGeo, fortressStoneMat);
    solidZWall.position.set(0, hwFloor1WallH * 0.5, nonDoorZ);
    const westWall1F = new THREE.Mesh(hwWallSolidXGeo, fortressStoneMat);
    westWall1F.position.set(-3.45, hwFloor1WallH * 0.5, 0);
    const eastWall1F = new THREE.Mesh(hwWallSolidXGeo, fortressStoneMat);
    eastWall1F.position.set(3.45, hwFloor1WallH * 0.5, 0);
    hwGroup.add(solidZWall, westWall1F, eastWall1F);

    for (const fx of [-2.35, 2.35]) {
      const flank = new THREE.Mesh(hwWallDoorFlankGeo, fortressStoneMat);
      flank.position.set(fx, hwFloor1WallH * 0.5, doorZ);
      hwGroup.add(flank);
    }
    const doorLintel = new THREE.Mesh(hwWallDoorLintelGeo, imperialCrimsonMat);
    doorLintel.position.set(0, (3.2 + hwFloor1WallH) * 0.5, doorZ);
    const hwDoorGroup = createInteractiveDoubleDoor(hw.doorId, 0, 0.08, doorZ, 2.2, 3.2);
    if (hw.doorSideLocalZ === -1) {
      hwDoorGroup.rotation.y = Math.PI;
    }
    hwGroup.add(doorLintel, hwDoorGroup);

    // 1st Floor Interior Guardroom Furniture (Table & Chair flush against the West wall + Hanging Red Lantern)
    const guardTable = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
    guardTable.position.set(-2.45, 0.82, -1.2);
    guardTable.rotation.y = Math.PI / 2;
    const guardCrate = new THREE.Mesh(supplyCrateGeo, imperialWoodFloorMat);
    guardCrate.position.set(-2.45, 0.62, 1.8);
    hwGroup.add(
      guardTable,
      guardCrate,
      createRedChineseLantern(0, 4.25, 0)
    );

    // Intermediate Perimeter Eave Skirt Roof crowning the enclosed 1st floor (y = 5.15m)
    const hwSkirtRoof1 = createChinesePerimeterSkirtRoof(7.6, 7.6, 1.55, 0.95);
    hwSkirtRoof1.position.set(0, hwFloor1WallH + 0.12, 0);
    hwGroup.add(hwSkirtRoof1);

    // 3) 4 Tall Crimson Corner Pillars rising from the 1st-floor roof to the Upper Pagoda Roof (at ±3.25m, outside the bridge gateway!)
    for (const px of [-3.25, 3.25]) {
      for (const pz of [-3.25, 3.25]) {
        const col = new THREE.Mesh(hwUpperPillarGeo, imperialCrimsonMat);
        col.position.set(px, hwFloor1WallH, pz);
        hwGroup.add(col);
      }
    }

    // 4) Climbable Vertical Wooden & Gold Ladder rising 9.0m from baseY to deckY in the corner hatch (+2.2, +2.2)
    const lGroup = new THREE.Group();
    lGroup.position.set(hw.localLadderX, deckH * 0.5, hw.localLadderZ);
    const lRail1 = new THREE.Mesh(hwLadderRailGeo, imperialCrimsonMat);
    lRail1.position.x = -0.35;
    const lRail2 = new THREE.Mesh(hwLadderRailGeo, imperialCrimsonMat);
    lRail2.position.x = 0.35;
    lGroup.add(lRail1, lRail2);
    const numHwRungs = 24;
    for (let r = 0; r <= numHwRungs; r++) {
      const rung = new THREE.Mesh(hwLadderRungGeo, imperialGoldMat);
      rung.position.y = -deckH * 0.5 + 0.35 + (r / numHwRungs) * (deckH - 0.5);
      lGroup.add(rung);
    }
    hwGroup.add(lGroup);

    // 5) Upper Lookout Deck Parapet Railings (with a wide 3.30m UNOBSTRUCTED gateway on hw.bridgeSideLocalZ!)
    for (const sideZ of [-1, 1] as const) {
      const rz = sideZ * 3.5;
      if (hw.bridgeSideLocalZ === sideZ) {
        // Leave lx in [-1.65, +1.65] 100% open for the 2.65m-wide Rope Bridge!
        for (const sideX of [-1, 1]) {
          const rFlank = new THREE.Mesh(hwRailBridgeFlankGeo, imperialCrimsonMat);
          rFlank.position.set(sideX * 2.6, deckH + 0.49, rz);
          const gatePost = new THREE.Mesh(hwBridgeGatePostGeo, imperialGoldMat);
          gatePost.position.set(sideX * 1.65, deckH + 0.64, rz);
          hwGroup.add(rFlank, gatePost);
        }
      } else {
        const rFullZ = new THREE.Mesh(hwRailFullZGeo, imperialCrimsonMat);
        rFullZ.position.set(0, deckH + 0.49, rz);
        hwGroup.add(rFullZ);
      }
    }

    const rW = new THREE.Mesh(hwRailFullXGeo, imperialCrimsonMat);
    rW.position.set(-3.5, deckH + 0.49, 0);
    const rE = new THREE.Mesh(hwRailFullXGeo, imperialCrimsonMat);
    rE.position.set(3.5, deckH + 0.49, 0);
    hwGroup.add(rW, rE);

    // 6) Upturned Chinese Pagoda Roof + Hanging Red Lantern + 2 ANGLED Outward-Projecting Watchtower Flags (הדגלים באלכסון תלויים מהעמוד הצידה!)
    const hwRoof = createChinesePagodaRoof(9.6, 9.6, 3.0);
    hwRoof.position.set(0, deckH + 4.1, 0);
    hwGroup.add(
      hwRoof,
      createRedChineseLantern(0, deckH + 3.5, 0),
      createAngledWatchtowerFlag(-3.25, deckH + 2.15, -3.25, Math.atan2(1, -1)),
      createAngledWatchtowerFlag(3.25, deckH + 2.15, -3.25, Math.atan2(1, 1))
    );
    scene.add(hwGroup);
    distanceCulledObjects.push({
      obj: hwGroup,
      cx: hw.x,
      cz: hw.z,
      radius: 30,
    });
  }

  // WALKABLE ASCENDING ROPE & WOODEN-PLANK SUSPENSION BRIDGE (גשר חוטים בעלייה עם מוטות עץ ונקודת תמיכה אחת באמצע!)
  // Ascends high above the mountains from SW Hill Watchtower (y=62.5m) -> Midpoint Support Tower (y=69.5m) -> West Hill Watchtower (y=75.5m)
  const ropeBridgeGroup = new THREE.Group();
  const rbBridgeYaw = Math.atan2(
    ROPE_BRIDGE_DEF.bx - ROPE_BRIDGE_DEF.ax,
    ROPE_BRIDGE_DEF.bz - ROPE_BRIDGE_DEF.az
  );

  // 1) Central Support Pylon/Tower at (-115.0, -253.5) rising from ground (y ≈ 28.25m) to y = 73.5m
  //    - 4 support legs widened to lx = ±1.75m, lz = ±1.85m (outside the 2.65m bridge walkway!)
  //    - Structural crossbars placed strictly BELOW the bridge deck (hOff < saddleLocalY - 1.2m) so ZERO crossbars block the walkway!
  //    - High overhead Chinese archway beam at saddleLocalY + 3.85m with 2 hanging red Chinese lanterns!
  const midGroundY = groundHeightAt(ROPE_BRIDGE_DEF.mx, ROPE_BRIDGE_DEF.mz);
  const saddleLocalY = ROPE_BRIDGE_DEF.my - midGroundY;
  const pylonHeight = saddleLocalY + 4.0;
  const pylonBaseGeo = new THREE.BoxGeometry(5.6, 2.2, 5.6);
  const pylonLegGeo = new THREE.CylinderGeometry(0.28, 0.38, pylonHeight, 8);
  pylonLegGeo.translate(0, pylonHeight * 0.5, 0);
  const pylonCrossbarGeo = new THREE.BoxGeometry(3.8, 0.32, 3.9);
  const pylonOverheadArchGeo = new THREE.BoxGeometry(4.3, 0.42, 0.48);
  const pylonSaddleDeckGeo = new THREE.BoxGeometry(3.3, 0.3, 4.4);
  const bridgePlankGeo = new THREE.BoxGeometry(2.65, 0.11, 0.42);
  const bridgeVertRopeGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.18, 5);
  bridgeVertRopeGeo.translate(0, 0.59, 0);
  const bridgeRopeMat = new THREE.MeshStandardMaterial({ color: 0xa87c4f, roughness: 0.92 });
  disposableGeometries.push(
    pylonBaseGeo,
    pylonLegGeo,
    pylonCrossbarGeo,
    pylonOverheadArchGeo,
    pylonSaddleDeckGeo,
    bridgePlankGeo,
    bridgeVertRopeGeo
  );
  disposableMaterials.push(bridgeRopeMat);

  const midPylonGroup = new THREE.Group();
  midPylonGroup.position.set(ROPE_BRIDGE_DEF.mx, midGroundY, ROPE_BRIDGE_DEF.mz);
  midPylonGroup.rotation.y = rbBridgeYaw;
  const pylonBase = new THREE.Mesh(pylonBaseGeo, fortressStoneMat);
  pylonBase.position.set(0, 0.6, 0);
  midPylonGroup.add(pylonBase);
  for (const lx of [-1.75, 1.75]) {
    for (const lz of [-1.85, 1.85]) {
      const leg = new THREE.Mesh(pylonLegGeo, barkMat);
      leg.position.set(lx, 0, lz);
      midPylonGroup.add(leg);
    }
  }
  // Crossbars stop strictly BELOW the bridge deck (saddleLocalY - 1.2m) so the bridge deck is 100% clear!
  for (let hOff = 6.0; hOff < saddleLocalY - 1.2; hOff += 6.5) {
    const crossbar = new THREE.Mesh(pylonCrossbarGeo, timberMat);
    crossbar.position.set(0, hOff, 0);
    midPylonGroup.add(crossbar);
  }
  // High overhead archway beams 3.85m ABOVE the bridge deck (plenty of headroom!)
  for (const lz of [-1.85, 1.85]) {
    const overheadBeam = new THREE.Mesh(pylonOverheadArchGeo, imperialCrimsonMat);
    overheadBeam.position.set(0, saddleLocalY + 3.85, lz);
    midPylonGroup.add(overheadBeam);
  }
  const saddleDeck = new THREE.Mesh(pylonSaddleDeckGeo, imperialWoodFloorMat);
  saddleDeck.position.set(0, saddleLocalY - 0.14, 0);
  midPylonGroup.add(
    saddleDeck,
    createRedChineseLantern(-1.75, saddleLocalY + 3.15, 0),
    createRedChineseLantern(1.75, saddleLocalY + 3.15, 0)
  );
  ropeBridgeGroup.add(midPylonGroup);

  // 2) 116 Wooden Planks (מוטות עץ) + 4 Continuous Catenary Ropes (2 under-deck support cables + 2 waist-high handrail ropes) + Vertical Suspender Ropes
  //    Spanning from tStart = ROPE_BRIDGE_DEF.deckEdgeT to tEnd = 1 - deckEdgeT so the bridge meets both rotated watchtower decks flush!
  const numBridgePlanks = 116;
  const tStart = ROPE_BRIDGE_DEF.deckEdgeT;
  const tEnd = 1.0 - ROPE_BRIDGE_DEF.deckEdgeT;
  const perpRightX = Math.cos(rbBridgeYaw);
  const perpRightZ = -Math.sin(rbBridgeYaw);
  const leftHandPoints: THREE.Vector3[] = [];
  const rightHandPoints: THREE.Vector3[] = [];
  const leftBottomPoints: THREE.Vector3[] = [];
  const rightBottomPoints: THREE.Vector3[] = [];

  for (let p = 0; p <= numBridgePlanks; p++) {
    const t = tStart + (p / numBridgePlanks) * (tEnd - tStart);
    const bx = ROPE_BRIDGE_DEF.ax + t * (ROPE_BRIDGE_DEF.bx - ROPE_BRIDGE_DEF.ax);
    const bz = ROPE_BRIDGE_DEF.az + t * (ROPE_BRIDGE_DEF.bz - ROPE_BRIDGE_DEF.az);
    const info = ropeBridgePointInfoAt(bx, bz);
    const by = info ? info.height : ROPE_BRIDGE_DEF.my;

    const plank = new THREE.Mesh(bridgePlankGeo, timberMat);
    plank.position.set(bx, by - 0.05, bz);
    plank.rotation.y = rbBridgeYaw;
    ropeBridgeGroup.add(plank);

    const railOffset = 1.24;
    const lx = bx - perpRightX * railOffset;
    const lz = bz - perpRightZ * railOffset;
    const rx = bx + perpRightX * railOffset;
    const rz = bz + perpRightZ * railOffset;

    leftBottomPoints.push(new THREE.Vector3(lx, by - 0.08, lz));
    rightBottomPoints.push(new THREE.Vector3(rx, by - 0.08, rz));
    leftHandPoints.push(new THREE.Vector3(lx, by + 1.12, lz));
    rightHandPoints.push(new THREE.Vector3(rx, by + 1.12, rz));

    if (p % 3 === 0) {
      const vRopeL = new THREE.Mesh(bridgeVertRopeGeo, bridgeRopeMat);
      vRopeL.position.set(lx, by - 0.04, lz);
      const vRopeR = new THREE.Mesh(bridgeVertRopeGeo, bridgeRopeMat);
      vRopeR.position.set(rx, by - 0.04, rz);
      ropeBridgeGroup.add(vRopeL, vRopeR);
    }
  }

  for (const pts of [leftHandPoints, rightHandPoints, leftBottomPoints, rightBottomPoints]) {
    const curve = new THREE.CatmullRomCurve3(pts);
    const ropeGeo = new THREE.TubeGeometry(curve, 64, 0.045, 6, false);
    disposableGeometries.push(ropeGeo);
    ropeBridgeGroup.add(new THREE.Mesh(ropeGeo, bridgeRopeMat));
  }

  scene.add(ropeBridgeGroup);
  distanceCulledObjects.push({
    obj: ropeBridgeGroup,
    cx: ROPE_BRIDGE_DEF.mx,
    cz: ROPE_BRIDGE_DEF.mz,
    radius: 120,
  });

  // ============================================================================
  // 6B. SURPRISE #1: ARTICULATED FLYING IMPERIAL GOLDEN SKY DRAGON (דרקון קיסרי מוזהב מעופף בשמיים)
  //     Soars gracefully across the northern skies above the Chinese Fortress & Eastern Sanctuary!
  // ============================================================================
  const skyDragonGroup = new THREE.Group();
  const dragonHeadGroup = new THREE.Group();
  const dragonSnoutGeo = new THREE.BoxGeometry(1.35, 0.95, 2.2);
  const dragonJawGeo = new THREE.BoxGeometry(1.15, 0.42, 1.85);
  const dragonHornGeo = new THREE.ConeGeometry(0.18, 1.9, 7);
  dragonHornGeo.rotateX(-Math.PI * 0.32);
  const dragonEyeGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const dragonWhiskerGeo = new THREE.CylinderGeometry(0.04, 0.02, 2.6, 6);
  dragonWhiskerGeo.rotateZ(Math.PI * 0.38);
  const dragonSegGeo = new THREE.SphereGeometry(0.82, 10, 10);
  dragonSegGeo.scale(1.0, 0.88, 1.35);
  const dragonSpineFinGeo = new THREE.ConeGeometry(0.26, 0.95, 5);
  const dragonLegGeo = new THREE.CylinderGeometry(0.18, 0.1, 1.6, 6);
  disposableGeometries.push(
    dragonSnoutGeo,
    dragonJawGeo,
    dragonHornGeo,
    dragonEyeGeo,
    dragonWhiskerGeo,
    dragonSegGeo,
    dragonSpineFinGeo,
    dragonLegGeo
  );

  const dSnout = new THREE.Mesh(dragonSnoutGeo, imperialGoldMat);
  dSnout.position.set(0, 0.2, 0.6);
  const dJaw = new THREE.Mesh(dragonJawGeo, imperialCrimsonMat);
  dJaw.position.set(0, -0.35, 0.5);
  dragonHeadGroup.add(dSnout, dJaw);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(dragonHornGeo, carvedMarbleMat);
    horn.position.set(side * 0.48, 0.95, -0.35);
    horn.rotation.z = side * -0.22;
    const eye = new THREE.Mesh(dragonEyeGeo, redLanternMat);
    eye.position.set(side * 0.58, 0.38, 1.15);
    const whisker = new THREE.Mesh(dragonWhiskerGeo, imperialGoldMat);
    whisker.position.set(side * 1.35, -0.1, 1.45);
    whisker.rotation.y = side * 0.35;
    dragonHeadGroup.add(horn, eye, whisker);
  }
  skyDragonGroup.add(dragonHeadGroup);

  const dragonSegments: THREE.Group[] = [];
  const numDragonSegments = 22;
  for (let s = 0; s < numDragonSegments; s++) {
    const segGroup = new THREE.Group();
    const taper = Math.max(0.25, 1.0 - (s / numDragonSegments) * 0.72);
    const segBody = new THREE.Mesh(dragonSegGeo, imperialGoldMat);
    segBody.scale.setScalar(taper);
    const segFin = new THREE.Mesh(dragonSpineFinGeo, imperialCrimsonMat);
    segFin.position.set(0, 0.85 * taper, 0);
    segFin.scale.setScalar(taper);
    segGroup.add(segBody, segFin);

    // 4 Royal Clawed Dragon Legs at segments 3 and 11
    if (s === 3 || s === 11) {
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(dragonLegGeo, imperialGoldMat);
        leg.position.set(side * 0.85 * taper, -0.85 * taper, 0);
        leg.rotation.z = side * 0.35;
        leg.rotation.x = 0.4;
        segGroup.add(leg);
      }
    }
    skyDragonGroup.add(segGroup);
    dragonSegments.push(segGroup);
  }
  scene.add(skyDragonGroup);

  // ============================================================================
  // 6C. SURPRISE #2: MYSTIC SAKURA HOT-SPRING & GIANT GOLDEN BUDDHA SANCTUARY (x=142, z=-148, y=11.5m)
  //     Oriented directly along SAKURA_SANCTUARY_YAW so the Paifang Gate, Stone Walkway, Hot-Spring Pool,
  //     Rim Stones, Sakura Trees, and Golden Buddha align 100% with the approaching trail!
  // ============================================================================
  const sCx = SAKURA_SANCTUARY_POS.x; // 142
  const sCz = SAKURA_SANCTUARY_POS.z; // -148
  const sY = SAKURA_SANCTUARY_POS.height; // 11.5m
  const sakuraSanctuaryGroup = new THREE.Group();
  sakuraSanctuaryGroup.position.set(sCx, sY, sCz);
  sakuraSanctuaryGroup.rotation.y = SAKURA_SANCTUARY_YAW;

  const sakuraBlossomMat = new THREE.MeshStandardMaterial({
    color: 0xffb7d5, // Soft glowing cherry blossom pink
    roughness: 0.55,
    emissive: 0x4a152b,
    emissiveIntensity: 0.22,
  });
  // Optimized Hot-Spring Water Material (no transmission pass, preventing full-scene double rendering!)
  const hotSpringWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // Glowing mineral turquoise hot spring
    emissive: 0x075985,
    emissiveIntensity: 0.42,
    roughness: 0.14,
    metalness: 0.12,
    transparent: true,
    opacity: 0.88,
  });
  const monkRobeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c, // Saffron Shaolin monk robe orange-gold
    roughness: 0.65,
  });
  const monkSkinMat = new THREE.MeshStandardMaterial({
    color: 0xf1c27d,
    roughness: 0.55,
  });
  disposableMaterials.push(sakuraBlossomMat, hotSpringWaterMat, monkRobeMat, monkSkinMat);

  // 1) Steaming Turquoise Geothermal Hot-Spring Pools & Jade Stone Plaza (in local sanctuary coordinates)
  const hotSpringPoolGeo = new THREE.CylinderGeometry(13.5, 14.5, 0.22, 28);
  const hotSpringRimRockGeo = new THREE.DodecahedronGeometry(1.65, 1);
  const lotusPadGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.05, 10);
  const lotusFlowerGeo = new THREE.ConeGeometry(0.32, 0.42, 7);
  const steppingSlabGeo = new THREE.CylinderGeometry(1.45, 1.55, 0.14, 8);
  // 2) Colossal 14m-Tall Seated Golden Buddha on a 3-Tiered Carved White-Marble Lotus Pedestal (at local (0, 0, -14.0))
  const buddhaLotusTier1Geo = new THREE.CylinderGeometry(5.6, 6.2, 1.3, 16);
  const buddhaLotusTier2Geo = new THREE.CylinderGeometry(4.5, 5.1, 1.1, 16);
  const buddhaLotusTier3Geo = new THREE.CylinderGeometry(3.8, 4.3, 0.9, 16);
  const buddhaLegsGeo = new THREE.CylinderGeometry(2.6, 3.3, 1.8, 14);
  const buddhaTorsoGeo = new THREE.CylinderGeometry(1.75, 2.35, 4.4, 14);
  const buddhaShouldersGeo = new THREE.SphereGeometry(2.25, 14, 12);
  buddhaShouldersGeo.scale(1.25, 0.55, 0.82);
  const buddhaHeadGeo = new THREE.SphereGeometry(1.38, 14, 14);
  const buddhaUshnishaGeo = new THREE.SphereGeometry(0.55, 10, 10);
  const buddhaHaloRingGeo = new THREE.TorusGeometry(3.4, 0.22, 10, 32);
  const buddhaArmGeo = new THREE.CylinderGeometry(0.46, 0.42, 2.8, 10);
  // 3) Blooming Pink Sakura Trees
  const sakuraTrunkGeo = new THREE.CylinderGeometry(0.28, 0.48, 4.6, 8);
  sakuraTrunkGeo.translate(0, 2.3, 0);
  const sakuraCrownGeo = new THREE.DodecahedronGeometry(2.8, 1);
  sakuraCrownGeo.scale(1.35, 0.72, 1.35);

  disposableGeometries.push(
    hotSpringPoolGeo,
    hotSpringRimRockGeo,
    lotusPadGeo,
    lotusFlowerGeo,
    steppingSlabGeo,
    buddhaLotusTier1Geo,
    buddhaLotusTier2Geo,
    buddhaLotusTier3Geo,
    buddhaLegsGeo,
    buddhaTorsoGeo,
    buddhaShouldersGeo,
    buddhaHeadGeo,
    buddhaUshnishaGeo,
    buddhaHaloRingGeo,
    buddhaArmGeo,
    sakuraTrunkGeo,
    sakuraCrownGeo
  );

  // Geothermal Turquoise Hot-Spring Pool at local (0, 0.04, +1.5)
  const localPoolZ = 1.5;
  const hotPoolMesh = new THREE.Mesh(hotSpringPoolGeo, hotSpringWaterMat);
  hotPoolMesh.position.set(0, 0.04, localPoolZ);
  sakuraSanctuaryGroup.add(hotPoolMesh);

  // Ring of natural volcanic boulders around the Hot-Spring Pool + wide welcoming entrance gap facing the Paifang Gate (+localZ)!
  for (let r = 0; r < 24; r++) {
    // r = 5, 6, 7 correspond to sin(ang) ≈ +1 (+localZ direction toward the Paifang gate at localZ = +22.5)
    if (r === 4 || r === 5 || r === 6 || r === 7 || r === 8) continue;
    const ang = (r / 24) * Math.PI * 2;
    const rx = Math.cos(ang) * 14.2;
    const rz = localPoolZ + Math.sin(ang) * 14.2;
    const rimRock = new THREE.Mesh(hotSpringRimRockGeo, fortressStoneMat);
    const sc = 0.75 + hash2D(r, 91) * 0.65;
    rimRock.scale.set(sc * 1.2, sc * 0.7, sc);
    rimRock.position.set(rx, 0.25, rz);
    rimRock.rotation.y = ang;
    sakuraSanctuaryGroup.add(rimRock);
  }

  // Carved Stone Stepping Walkway leading straight from the Trail & Paifang Gate (localZ = +25.5) to the Pool Edge (localZ = +15.0)
  for (let sz = 15.5; sz <= 25.5; sz += 2.0) {
    const stepSlab = new THREE.Mesh(steppingSlabGeo, carvedMarbleMat);
    stepSlab.position.set(0, 0.04, sz);
    sakuraSanctuaryGroup.add(stepSlab);
  }

  for (let l = 0; l < 12; l++) {
    const lang = l * 1.9 + 0.4;
    const lrad = 3.2 + (l % 4) * 2.4;
    const lx = Math.cos(lang) * lrad;
    const lz = localPoolZ + Math.sin(lang) * lrad;
    const pad = new THREE.Mesh(lotusPadGeo, jadeBeamMat);
    pad.position.set(lx, 0.16, lz);
    const blossom = new THREE.Mesh(lotusFlowerGeo, sakuraBlossomMat);
    blossom.position.set(lx, 0.36, lz);
    sakuraSanctuaryGroup.add(pad, blossom);
  }

  // Colossal Seated Golden Buddha Statue at local (0, 0, -14.0), facing straight down the trail (+localZ)!
  const buddhaGroup = new THREE.Group();
  buddhaGroup.position.set(0, 0, -14.0);

  const bTier1 = new THREE.Mesh(buddhaLotusTier1Geo, carvedMarbleMat);
  bTier1.position.y = 0.65;
  const bTier2 = new THREE.Mesh(buddhaLotusTier2Geo, imperialCrimsonMat);
  bTier2.position.y = 1.85;
  const bTier3 = new THREE.Mesh(buddhaLotusTier3Geo, carvedMarbleMat);
  bTier3.position.y = 2.85;

  const bLegs = new THREE.Mesh(buddhaLegsGeo, imperialGoldMat);
  bLegs.position.y = 4.2;
  const bTorso = new THREE.Mesh(buddhaTorsoGeo, imperialGoldMat);
  bTorso.position.y = 6.9;
  const bShoulders = new THREE.Mesh(buddhaShouldersGeo, imperialGoldMat);
  bShoulders.position.y = 8.6;
  const bHead = new THREE.Mesh(buddhaHeadGeo, imperialGoldMat);
  bHead.position.y = 10.35;
  const bUshnisha = new THREE.Mesh(buddhaUshnishaGeo, imperialGoldMat);
  bUshnisha.position.y = 11.75;
  const bHalo = new THREE.Mesh(buddhaHaloRingGeo, imperialGoldMat);
  bHalo.position.set(0, 9.6, -1.35);

  for (const side of [-1, 1]) {
    const bArm = new THREE.Mesh(buddhaArmGeo, imperialGoldMat);
    bArm.position.set(side * 2.05, 6.7, 0.55);
    bArm.rotation.z = side * 0.42;
    bArm.rotation.x = -0.35;
    buddhaGroup.add(bArm);
  }

  buddhaGroup.add(
    bTier1,
    bTier2,
    bTier3,
    bLegs,
    bTorso,
    bShoulders,
    bHead,
    bUshnisha,
    bHalo,
    createRedChineseLantern(-4.8, 3.8, 3.2),
    createRedChineseLantern(4.8, 3.8, 3.2)
  );
  sakuraSanctuaryGroup.add(buddhaGroup);

  // Ornate Entrance Paifang Gate at local (0, 0, +22.5), 100% perpendicular to the approaching trail!
  const sanctuaryGate = createOrnatePaifangGate(22.5, 0);
  sakuraSanctuaryGroup.add(sanctuaryGate);

  // Symmetric Blooming Pink Sakura Trees framing the Paifang Gate & encircling the Sanctuary (never blocking the trail!)
  for (let t = 0; t < 14; t++) {
    const tang = (t / 14) * Math.PI * 2 + 0.22;
    const trad = 21.0 + (t % 2) * 2.8;
    const ltx = Math.cos(tang) * trad;
    const ltz = Math.sin(tang) * trad;
    // Leave a wide 18m corridor open around the front entrance gate (+localZ)
    if (ltz > 10.0 && Math.abs(ltx) < 9.5) continue;

    const sTree = new THREE.Group();
    sTree.position.set(ltx, 0, ltz);
    const trunk = new THREE.Mesh(sakuraTrunkGeo, darkIronMat);
    sTree.add(trunk);

    for (const [cx, cy, cz, sc] of [
      [0, 5.2, 0, 1.15],
      [-1.8, 4.6, 0.9, 0.85],
      [1.8, 4.7, -0.8, 0.88],
      [0.4, 5.8, 1.4, 0.78],
    ]) {
      const crown = new THREE.Mesh(sakuraCrownGeo, sakuraBlossomMat);
      crown.position.set(cx, cy, cz);
      crown.scale.setScalar(sc);
      sTree.add(crown);
    }
    sakuraSanctuaryGroup.add(sTree);
  }

  scene.add(sakuraSanctuaryGroup);
  distanceCulledObjects.push({
    obj: sakuraSanctuaryGroup,
    cx: sCx,
    cz: sCz,
    radius: 54,
  });

  // ============================================================================
  // 6D. GRAND FAR SOUTH-EAST WALLED COASTAL HARBOR TOWN, VAST OPEN EASTERN OCEAN,
  //     BAZAAR, TAVERN, CARGO WAREHOUSE DISTRICT, MARBLE AMPHITHEATER,
  //     ENLARGED 42m 3-MASTED TREASURE GALLEON SHIP (WITH ENTERABLE CAPTAIN'S CABIN
  //     & RAISED HELM QUARTERDECK) & CLIMBABLE 26m IMPERIAL LIGHTHOUSE
  // ============================================================================
  const harborGroup = new THREE.Group();
  const hPlazaY = SOUTHEAST_HARBOR_POS.plazaY; // 3.20m
  const hWaterY = SOUTHEAST_HARBOR_POS.waterY; // 1.25m

  // 1) Paved Stone Harbor Quay Plaza (x in [200, 255.5], z in [214, 312]), Sea-Wall & Vast Open Eastern Ocean!
  const harborQuayGeo = new THREE.BoxGeometry(55.5, 0.36, 98.0);
  const harborSeaWallGeo = new THREE.BoxGeometry(1.6, 5.2, 100.0);
  const harborParapetBlockGeo = new THREE.BoxGeometry(1.1, 0.78, 2.6);
  // Vast 680m x 680m Open Ocean Surface stretching from x = 254.5 all the way East to the horizon (x = 934.5)!
  const oceanWaterGeo = new THREE.PlaneGeometry(680.0, 680.0, isSoftwareGl ? 32 : 56, isSoftwareGl ? 32 : 56);
  oceanWaterGeo.rotateX(-Math.PI / 2);
  const cannonCarriageGeo = new THREE.BoxGeometry(1.35, 0.52, 0.72);
  const cannonBarrelGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.85, 10);
  cannonBarrelGeo.rotateZ(Math.PI / 2);
  const cannonBallGeo = new THREE.SphereGeometry(0.18, 8, 8);
  disposableGeometries.push(
    harborQuayGeo,
    harborSeaWallGeo,
    harborParapetBlockGeo,
    oceanWaterGeo,
    cannonCarriageGeo,
    cannonBarrelGeo,
    cannonBallGeo
  );

  const quayMesh = new THREE.Mesh(harborQuayGeo, carvedMarbleMat);
  quayMesh.position.set(227.75, hPlazaY - 0.16, 263.0);
  quayMesh.receiveShadow = !isSoftwareGl;
  const seaWallMesh = new THREE.Mesh(harborSeaWallGeo, fortressStoneMat);
  seaWallMesh.position.set(255.2, hPlazaY - 2.3, 263.0);
  const openOceanMesh = new THREE.Mesh(oceanWaterGeo, waterMat);
  openOceanMesh.position.set(594.5, hWaterY, 420.0);
  harborGroup.add(quayMesh, seaWallMesh, openOceanMesh);

  // Dramatic Distant Rocky Sea-Stack Islands & Foam Rings out in the Open Eastern Ocean
  const seaStackRockGeo = new THREE.DodecahedronGeometry(6.5, 1);
  const seaStackFoamGeo = new THREE.RingGeometry(6.2, 11.5, 24);
  seaStackFoamGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(seaStackRockGeo, seaStackFoamGeo);
  for (const [isx, isz, isScale, isH] of [
    [358.0, 224.0, 1.35, 14.5],
    [392.0, 286.0, 1.65, 18.0],
    [342.0, 328.0, 1.15, 11.5],
  ]) {
    const stackGroup = new THREE.Group();
    stackGroup.position.set(isx, hWaterY, isz);
    const mainSpire = new THREE.Mesh(seaStackRockGeo, fortressStoneMat);
    mainSpire.scale.set(isScale, isH / 6.5, isScale * 0.9);
    mainSpire.position.y = isH * 0.32;
    const subSpire = new THREE.Mesh(seaStackRockGeo, fortressStoneMat);
    subSpire.scale.set(isScale * 0.75, (isH * 0.55) / 6.5, isScale * 0.7);
    subSpire.position.set(-4.5 * isScale, isH * 0.18, 3.8 * isScale);
    const sFoam = new THREE.Mesh(seaStackFoamGeo, foamRingMat);
    sFoam.scale.setScalar(isScale * 1.15);
    sFoam.position.y = 0.08;
    stackGroup.add(mainSpire, subSpire, sFoam);
    harborGroup.add(stackGroup);
  }

  // Sea-wall crenellations, Mooring Bollards & 5 Coastal Iron Harbor Cannons overlooking the Open Eastern Sea
  for (let bz = 218; bz <= 308; bz += 6.0) {
    if (Math.abs(bz - SOUTHEAST_HARBOR_POS.pierZ) < 4.8) continue;
    const merlon = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
    merlon.position.set(255.1, hPlazaY + 0.39, bz);
    harborGroup.add(merlon);
  }
  for (const cz of [224.0, 238.0, 264.0, 278.0, 294.0]) {
    const cGroup = new THREE.Group();
    cGroup.position.set(253.8, hPlazaY, cz);
    const carriage = new THREE.Mesh(cannonCarriageGeo, timberMat);
    carriage.position.y = 0.26;
    const barrel = new THREE.Mesh(cannonBarrelGeo, darkIronMat);
    barrel.position.set(0.45, 0.62, 0);
    cGroup.add(carriage, barrel);
    for (let b = 0; b < 4; b++) {
      const ball = new THREE.Mesh(cannonBallGeo, darkIronMat);
      ball.position.set(-0.35 + (b % 2) * 0.36, 0.18 + Math.floor(b / 2) * 0.28, 0.72);
      cGroup.add(ball);
    }
    harborGroup.add(cGroup);
  }

  // 2) FORTIFIED HARBOR PERIMETER STONE WALL, CORNER BASTIONS & MONUMENTAL GATEHOUSE (enclosing x in [200, 255.2], z in [214, 312])
  const gateTowerGeo = new THREE.BoxGeometry(5.0, 11.2, 5.0);
  gateTowerGeo.translate(0, 5.6, 0);
  const gateTowerRoofGeo = new THREE.ConeGeometry(4.0, 3.4, 4);
  gateTowerRoofGeo.rotateY(Math.PI / 4);
  const gateArchBridgeGeo = new THREE.BoxGeometry(4.6, 2.8, 8.6);
  const wallWestNorthGeo = new THREE.BoxGeometry(1.8, 6.2, 22.0); // z = 214..236
  const wallWestSouthGeo = new THREE.BoxGeometry(1.8, 6.2, 60.0); // z = 252..312
  const wallNorthWestGeo = new THREE.BoxGeometry(34.2, 6.2, 1.8); // x = 200..234.2
  const wallNorthEastGeo = new THREE.BoxGeometry(13.6, 6.2, 1.8); // x = 241.8..255.4
  const wallNorthArchGeo = new THREE.BoxGeometry(8.4, 1.8, 2.1);  // Arch lintel over Lighthouse ramp gate at x = 238.0
  const wallSouthGeo = new THREE.BoxGeometry(55.4, 6.2, 1.8);     // x = 200..255.4 at z = 312.0
  const cornerBastionGeo = new THREE.CylinderGeometry(2.8, 3.2, 8.2, 8);
  cornerBastionGeo.translate(0, 4.1, 0);
  const cornerBastionCapGeo = new THREE.ConeGeometry(3.4, 2.6, 8);
  disposableGeometries.push(
    gateTowerGeo,
    gateTowerRoofGeo,
    gateArchBridgeGeo,
    wallWestNorthGeo,
    wallWestSouthGeo,
    wallNorthWestGeo,
    wallNorthEastGeo,
    wallNorthArchGeo,
    wallSouthGeo,
    cornerBastionGeo,
    cornerBastionCapGeo
  );

  // Twin Gatehouse Towers at (200, 238) & (200, 250) + Overhead Gate Arch Bridge
  for (const gz of [238.0, 250.0]) {
    const gTower = new THREE.Mesh(gateTowerGeo, fortressStoneMat);
    gTower.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY, gz);
    const gRoof = new THREE.Mesh(gateTowerRoofGeo, pagodaTileMat);
    gRoof.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 12.9, gz);
    harborGroup.add(
      gTower,
      gRoof,
      createImperialFlag(SOUTHEAST_HARBOR_POS.gateX - 2.3, hPlazaY + 9.2, gz)
    );
  }
  const gateBridge = new THREE.Mesh(gateArchBridgeGeo, carvedMarbleMat);
  gateBridge.position.set(SOUTHEAST_HARBOR_POS.gateX, hPlazaY + 8.2, SOUTHEAST_HARBOR_POS.gateZ);
  harborGroup.add(
    gateBridge,
    createRedChineseLantern(SOUTHEAST_HARBOR_POS.gateX - 2.1, hPlazaY + 6.4, SOUTHEAST_HARBOR_POS.gateZ - 2.4),
    createRedChineseLantern(SOUTHEAST_HARBOR_POS.gateX - 2.1, hPlazaY + 6.4, SOUTHEAST_HARBOR_POS.gateZ + 2.4)
  );

  // Continuous Perimeter Walls (West, North with Lighthouse Archway, and South)
  const wWestN = new THREE.Mesh(wallWestNorthGeo, fortressStoneMat);
  wWestN.position.set(200.0, hPlazaY + 3.1, 225.0);
  const wWestS = new THREE.Mesh(wallWestSouthGeo, fortressStoneMat);
  wWestS.position.set(200.0, hPlazaY + 3.1, 282.0);
  const wNorthW = new THREE.Mesh(wallNorthWestGeo, fortressStoneMat);
  wNorthW.position.set(217.1, hPlazaY + 3.1, 214.0);
  const wNorthE = new THREE.Mesh(wallNorthEastGeo, fortressStoneMat);
  wNorthE.position.set(248.6, hPlazaY + 3.1, 214.0);
  const wNorthArch = new THREE.Mesh(wallNorthArchGeo, imperialCrimsonMat);
  wNorthArch.position.set(238.0, hPlazaY + 5.6, 214.0);
  const wSouth = new THREE.Mesh(wallSouthGeo, fortressStoneMat);
  wSouth.position.set(227.7, hPlazaY + 3.1, 312.0);
  harborGroup.add(wWestN, wWestS, wNorthW, wNorthE, wNorthArch, wSouth);

  // Crenellated Merlons along the West, North & South Harbor Perimeter Walls
  for (let wz = 218.0; wz <= 308.0; wz += 4.5) {
    if (wz >= 234.5 && wz <= 253.5) continue;
    const mW = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
    mW.position.set(200.0, hPlazaY + 6.55, wz);
    harborGroup.add(mW);
  }
  for (let wx = 204.5; wx <= 251.5; wx += 4.5) {
    const mS = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
    mS.rotation.y = Math.PI / 2;
    mS.position.set(wx, hPlazaY + 6.55, 312.0);
    harborGroup.add(mS);
    if (wx < 233.5 || wx > 242.5) {
      const mN = new THREE.Mesh(harborParapetBlockGeo, fortressStoneMat);
      mN.rotation.y = Math.PI / 2;
      mN.position.set(wx, hPlazaY + 6.55, 214.0);
      harborGroup.add(mN);
    }
  }

  // 4 Stone Corner Bastion Watch-Turrets at (200, 214), (200, 312), (255.2, 214), and (255.2, 312)
  for (const [bx, bz] of [
    [200.0, 214.0],
    [200.0, 312.0],
    [255.2, 214.0],
    [255.2, 312.0],
  ]) {
    const bastion = new THREE.Mesh(cornerBastionGeo, fortressStoneMat);
    bastion.position.set(bx, hPlazaY, bz);
    const bCap = new THREE.Mesh(cornerBastionCapGeo, pagodaTileMat);
    bCap.position.set(bx, hPlazaY + 9.5, bz);
    harborGroup.add(bastion, bCap, createImperialFlag(bx, hPlazaY + 8.2, bz));
  }

  // 3) THE MARINER'S HARBOR TAVERN & INN at (224, 230, y = 3.35m) — Enterable via [E] door 'harbor-tavern-door'!
  const tavX = SOUTHEAST_HARBOR_POS.tavernX; // 224.0
  const tavZ = SOUTHEAST_HARBOR_POS.tavernZ; // 230.0
  const tavY = SOUTHEAST_HARBOR_POS.tavernFloorY; // 3.35m
  const tavernGroup = new THREE.Group();
  tavernGroup.position.set(tavX, tavY, tavZ);

  const tavFloorGeo = new THREE.BoxGeometry(16.2, 0.3, 14.8);
  const tavBackWallGeo = new THREE.BoxGeometry(16.0, 5.2, 0.45);
  const tavSideWallGeo = new THREE.BoxGeometry(0.45, 5.2, 12.0);
  const tavFrontFlankGeo = new THREE.BoxGeometry(6.7, 5.2, 0.45);
  const tavFrontLintelGeo = new THREE.BoxGeometry(2.6, 1.8, 0.48);
  const tavRoofGeo = new THREE.ConeGeometry(12.2, 4.2, 4);
  tavRoofGeo.rotateY(Math.PI / 4);
  tavRoofGeo.scale(1.05, 1.0, 0.88);
  const tavBarCounterGeo = new THREE.BoxGeometry(9.6, 1.12, 1.1);
  const aleBarrelGeo = new THREE.CylinderGeometry(0.42, 0.48, 1.05, 10);
  aleBarrelGeo.rotateZ(Math.PI / 2);
  const tavHearthGeo = new THREE.BoxGeometry(2.8, 4.8, 1.2);
  disposableGeometries.push(
    tavFloorGeo,
    tavBackWallGeo,
    tavSideWallGeo,
    tavFrontFlankGeo,
    tavFrontLintelGeo,
    tavRoofGeo,
    tavBarCounterGeo,
    aleBarrelGeo,
    tavHearthGeo
  );

  const tavFloor = new THREE.Mesh(tavFloorGeo, imperialWoodFloorMat);
  tavFloor.position.set(0, -0.15, 1.2);
  const tavBackW = new THREE.Mesh(tavBackWallGeo, timberMat);
  tavBackW.position.set(0, 2.6, -6.0);
  const tavWestW = new THREE.Mesh(tavSideWallGeo, timberMat);
  tavWestW.position.set(-8.0, 2.6, 0);
  const tavEastW = new THREE.Mesh(tavSideWallGeo, timberMat);
  tavEastW.position.set(8.0, 2.6, 0);
  const tavFrontL = new THREE.Mesh(tavFrontFlankGeo, timberMat);
  tavFrontL.position.set(-4.65, 2.6, 6.0);
  const tavFrontR = new THREE.Mesh(tavFrontFlankGeo, timberMat);
  tavFrontR.position.set(4.65, 2.6, 6.0);
  const tavLintel = new THREE.Mesh(tavFrontLintelGeo, imperialCrimsonMat);
  tavLintel.position.set(0, 4.3, 6.0);
  const tavRoof = new THREE.Mesh(tavRoofGeo, barkMat);
  tavRoof.position.set(0, 7.1, 0.5);
  tavernGroup.add(
    tavFloor,
    tavBackW,
    tavWestW,
    tavEastW,
    tavFrontL,
    tavFrontR,
    tavLintel,
    tavRoof,
    createInteractiveDoubleDoor('harbor-tavern-door', 0, 0, 6.0, 2.6, 3.4)
  );

  // Tavern Interior Details: Long Bar Counter, 8 Stacked Oak Ale Barrels, Glowing Hearth Fireplace, Framed Ship Painting & 4 Dining Tables!
  const barCounter = new THREE.Mesh(tavBarCounterGeo, furnitureWoodMat);
  barCounter.position.set(-2.5, 0.56, -3.2);
  tavernGroup.add(barCounter);
  for (let b = 0; b < 8; b++) {
    const barrel = new THREE.Mesh(aleBarrelGeo, barkMat);
    barrel.position.set(-6.2 + (b % 4) * 1.85, 0.52 + Math.floor(b / 4) * 0.92, -5.1);
    tavernGroup.add(barrel);
  }
  const hearthMesh = new THREE.Mesh(tavHearthGeo, fortressStoneMat);
  hearthMesh.position.set(4.8, 2.4, -5.2);
  const hearthFire = new THREE.Mesh(forgeCoalMoundGeo, mineMoltenCoalMat);
  hearthFire.position.set(4.8, 0.35, -4.6);
  tavernGroup.add(
    hearthMesh,
    hearthFire,
    createFramedChineseWallPainting(4.8, 2.8, -4.55, 0),
    createFramedChineseWallPainting(-2.5, 2.8, -5.7, 0),
    createRedChineseLantern(-3.2, 4.2, 0),
    createRedChineseLantern(3.2, 4.2, 0)
  );
  for (const [tx, tz] of [
    [-4.5, 1.2],
    [-4.5, 3.8],
    [4.2, 1.2],
    [4.2, 3.8],
  ]) {
    const tTop = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
    tTop.position.set(tx, 0.78, tz);
    const platter = new THREE.Mesh(feastPlatterGeo, imperialGoldMat);
    platter.position.set(tx, 0.86, tz);
    const roast = new THREE.Mesh(roastDuckGeo, roastDuckMat);
    roast.position.set(tx, 1.0, tz);
    tavernGroup.add(tTop, platter, roast);
  }
  harborGroup.add(tavernGroup);

  // 4) ENCLOSED TWO-TIER MARBLE COMPASS FOUNTAIN (ZERO Z-FIGHTING!) & 6 COLORFUL HARBOR BAZAAR STALLS around (232, 252..268)
  const fountainBaseSlabGeo = new THREE.CylinderGeometry(4.45, 4.65, 0.24, 16);
  const fountainWallSegGeo = new THREE.BoxGeometry(1.78, 1.06, 0.52);
  const fountainCopingSegGeo = new THREE.BoxGeometry(1.88, 0.14, 0.66);
  // Deep water disc placed at y = 0.74m (top at 0.80m -> 0.56m above the 0.24m base slab so ZERO flickering, and 0.26m below the 1.06m stone curb so water never escapes!)
  const fountainWaterGeo = new THREE.CylinderGeometry(3.88, 3.88, 0.12, 24);
  const fountainPillarGeo = new THREE.CylinderGeometry(0.62, 0.88, 2.4, 12);
  const fountainUpperBowlGeo = new THREE.CylinderGeometry(1.85, 0.72, 0.48, 16);
  const fountainUpperWaterGeo = new THREE.CylinderGeometry(1.62, 1.62, 0.08, 16);
  const fountainJetStreamGeo = new THREE.CylinderGeometry(0.06, 0.14, 1.38, 8);
  const anchorShankGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8);
  const anchorFlukeGeo = new THREE.TorusGeometry(0.95, 0.16, 8, 16, Math.PI);
  const stallCanopyGeo = new THREE.BoxGeometry(4.4, 0.18, 3.4);
  const stallCounterGeo = new THREE.BoxGeometry(3.8, 0.88, 1.2);
  const spiceBasketGeo = new THREE.CylinderGeometry(0.38, 0.3, 0.45, 8);
  disposableGeometries.push(
    fountainBaseSlabGeo,
    fountainWallSegGeo,
    fountainCopingSegGeo,
    fountainWaterGeo,
    fountainPillarGeo,
    fountainUpperBowlGeo,
    fountainUpperWaterGeo,
    fountainJetStreamGeo,
    anchorShankGeo,
    anchorFlukeGeo,
    stallCanopyGeo,
    stallCounterGeo,
    spiceBasketGeo
  );

  const fntGroup = new THREE.Group();
  fntGroup.position.set(SOUTHEAST_HARBOR_POS.fountainX, hPlazaY, SOUTHEAST_HARBOR_POS.fountainZ);
  const fBaseSlab = new THREE.Mesh(fountainBaseSlabGeo, fortressStoneMat);
  fBaseSlab.position.y = 0.12; // top at y = 0.24m
  fntGroup.add(fBaseSlab);

  // 16-Sided Enclosed Raised Marble Basin Wall (y = 0..1.06m) holding the water securely inside!
  for (let w = 0; w < 16; w++) {
    const ang = (w / 16) * Math.PI * 2;
    const wx = Math.sin(ang) * 4.12;
    const wz = Math.cos(ang) * 4.12;
    const wallSeg = new THREE.Mesh(fountainWallSegGeo, carvedMarbleMat);
    wallSeg.position.set(wx, 0.53, wz);
    wallSeg.rotation.y = ang;
    const copingSeg = new THREE.Mesh(fountainCopingSegGeo, imperialCrimsonMat);
    copingSeg.position.set(wx, 1.08, wz);
    copingSeg.rotation.y = ang;
    fntGroup.add(wallSeg, copingSeg);
  }

  const fWat = new THREE.Mesh(fountainWaterGeo, waterMat);
  fWat.position.y = 0.74; // Cleanly separated from the 0.24m bottom and enclosed by the 1.15m stone rim!
  const fCol = new THREE.Mesh(fountainPillarGeo, carvedMarbleMat);
  fCol.position.y = 1.35;
  const fUpperBowl = new THREE.Mesh(fountainUpperBowlGeo, carvedMarbleMat);
  fUpperBowl.position.y = 2.15;
  const fUpperWat = new THREE.Mesh(fountainUpperWaterGeo, waterMat);
  fUpperWat.position.y = 2.38;
  // 4 Cascading Water Streams pouring from the upper bowl into the lower enclosed basin
  for (let j = 0; j < 4; j++) {
    const jAng = (j / 4) * Math.PI * 2 + Math.PI / 4;
    const jet = new THREE.Mesh(fountainJetStreamGeo, waterfallMat);
    jet.position.set(Math.cos(jAng) * 1.45, 1.48, Math.sin(jAng) * 1.45);
    jet.rotation.z = -Math.cos(jAng) * 0.22;
    jet.rotation.x = Math.sin(jAng) * 0.22;
    fntGroup.add(jet);
  }
  const aShank = new THREE.Mesh(anchorShankGeo, imperialGoldMat);
  aShank.position.y = 3.55;
  const aFluke = new THREE.Mesh(anchorFlukeGeo, imperialGoldMat);
  aFluke.position.y = 3.05;
  aFluke.rotation.z = Math.PI;
  fntGroup.add(fWat, fCol, fUpperBowl, fUpperWat, aShank, aFluke);
  harborGroup.add(fntGroup);

  // 6 Harbor Market Stalls with 3D Merchant NPCs, Weapon Racks & Building Material Displays
  const merchantSkinMat = new THREE.MeshStandardMaterial({ color: 0xe6b891, roughness: 0.65 });
  const merchantBeardMat = new THREE.MeshStandardMaterial({ color: 0x3b281e, roughness: 0.85 });
  const merchantApronMat = new THREE.MeshStandardMaterial({ color: 0xf5ebd6, roughness: 0.78 });
  const merchantTorsoGeo = new THREE.CapsuleGeometry(0.22, 0.56, 8, 12);
  const merchantHeadGeo = new THREE.SphereGeometry(0.17, 14, 12);
  const merchantHatGeo = new THREE.CylinderGeometry(0.19, 0.23, 0.16, 12);
  const merchantArmGeo = new THREE.CapsuleGeometry(0.065, 0.38, 6, 8);
  disposableMaterials.push(merchantSkinMat, merchantBeardMat, merchantApronMat);
  disposableGeometries.push(merchantTorsoGeo, merchantHeadGeo, merchantHatGeo, merchantArmGeo);

  const stallPlacements: Array<[number, number, number, THREE.Material]> = [
    [212.0, 254.0, 0, imperialCrimsonMat],
    [212.0, 263.0, 0, sleepingBagColors[2]],
    [224.0, 263.0, 0, sleepingBagColors[1]],
    [240.0, 263.0, 0, sleepingBagColors[3]],
    [246.0, 238.0, -Math.PI / 2, imperialCrimsonMat],
    [246.0, 246.0, -Math.PI / 2, jadeBeamMat],
  ];
  for (let s = 0; s < stallPlacements.length; s++) {
    const [sx, sz, syaw, canopyMat] = stallPlacements[s];
    const stGroup = new THREE.Group();
    stGroup.position.set(sx, hPlazaY, sz);
    stGroup.rotation.y = syaw;
    const counter = new THREE.Mesh(stallCounterGeo, furnitureWoodMat);
    counter.position.set(0, 0.44, 0);
    const canopy = new THREE.Mesh(stallCanopyGeo, canopyMat);
    canopy.position.set(0, 2.75, 0);
    canopy.rotation.x = 0.12;
    stGroup.add(counter, canopy);
    for (const px of [-1.9, 1.9]) {
      for (const pz of [-1.4, 1.4]) {
        const post = new THREE.Mesh(balustradePostGeo, barkMat);
        post.scale.set(0.55, 2.0, 0.55);
        post.position.set(px, 0, pz);
        stGroup.add(post);
      }
    }

    // Stock stalls with weapons racks (stalls 0, 1, 4) and building materials / ore chests (stalls 2, 3, 5)
    if (s === 0 || s === 1 || s === 4) {
      const displayRack = new THREE.Mesh(weaponRackBarGeo, imperialGoldMat);
      displayRack.scale.set(0.85, 1, 1);
      displayRack.position.set(-0.65, 1.18, -0.10);
      const goldChest = new THREE.Mesh(chestBodyGeo, imperialGoldMat);
      goldChest.scale.setScalar(0.55);
      goldChest.position.set(0.95, 1.04, 0.05);
      stGroup.add(displayRack, goldChest);
    } else {
      for (let b = 0; b < 3; b++) {
        const basket = new THREE.Mesh(
          spiceBasketGeo,
          sleepingBagColors[(s + b) % sleepingBagColors.length]
        );
        basket.position.set(-1.15 + b * 0.85, 1.05, 0);
        stGroup.add(basket);
      }
      const goldChest = new THREE.Mesh(chestBodyGeo, imperialGoldMat);
      goldChest.scale.setScalar(0.52);
      goldChest.position.set(1.15, 1.04, 0);
      stGroup.add(goldChest);
    }

    // 3D Harbor Merchant NPC standing behind the counter welcoming customers
    const merchantNpc = new THREE.Group();
    merchantNpc.position.set(0, 0, -0.92);
    const mRobes = new THREE.Mesh(merchantTorsoGeo, canopyMat);
    mRobes.position.set(0, 0.92, 0);
    const mApron = new THREE.Mesh(
      new THREE.CylinderGeometry(0.225, 0.24, 0.58, 10, 1, false, -0.9, 1.8),
      merchantApronMat
    );
    mApron.position.set(0, 0.88, 0.02);
    const mHead = new THREE.Mesh(merchantHeadGeo, merchantSkinMat);
    mHead.position.set(0, 1.48, 0);
    const mHat = new THREE.Mesh(merchantHatGeo, imperialGoldMat);
    mHat.position.set(0, 1.62, 0);
    const mBeard = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 8), merchantBeardMat);
    mBeard.rotation.x = Math.PI;
    mBeard.position.set(0, 1.35, 0.12);
    const mArmL = new THREE.Mesh(merchantArmGeo, canopyMat);
    mArmL.position.set(-0.29, 1.08, 0.14);
    mArmL.rotation.set(-0.55, 0.2, 0.22);
    const mArmR = new THREE.Mesh(merchantArmGeo, canopyMat);
    mArmR.position.set(0.29, 1.08, 0.14);
    mArmR.rotation.set(-0.55, -0.2, -0.22);
    merchantNpc.add(mRobes, mApron, mHead, mHat, mBeard, mArmL, mArmR);
    stGroup.add(merchantNpc);

    const crate = new THREE.Mesh(supplyCrateGeo, imperialWoodFloorMat);
    crate.position.set(2.4, 0.58, -0.6);
    stGroup.add(crate, createLanternAssembly(-1.85, 2.25, 1.35, false));
    harborGroup.add(stGroup);
  }

  // 4B) HARBOR CUSTOMS & CARGO WAREHOUSE DISTRICT at (218, 277) & DOCKSIDE STORAGE SHED at (243, 277)
  const whX = SOUTHEAST_HARBOR_POS.warehouseX; // 218.0
  const whZ = SOUTHEAST_HARBOR_POS.warehouseZ; // 277.0
  const whY = SOUTHEAST_HARBOR_POS.warehouseFloorY; // 3.35m
  const warehouseGroup = new THREE.Group();
  warehouseGroup.position.set(whX, whY, whZ);

  const whFloorGeo = new THREE.BoxGeometry(17.4, 0.3, 12.2);
  const whSouthWallGeo = new THREE.BoxGeometry(17.0, 5.6, 0.48);
  const whSideWallGeo = new THREE.BoxGeometry(0.48, 5.6, 11.0);
  const whNorthFlankGeo = new THREE.BoxGeometry(7.1, 5.6, 0.48);
  const whNorthLintelGeo = new THREE.BoxGeometry(2.8, 2.2, 0.5);
  const whRoofGeo = new THREE.ConeGeometry(12.6, 4.4, 4);
  whRoofGeo.rotateY(Math.PI / 4);
  whRoofGeo.scale(1.08, 1.0, 0.78);
  const whHoistBeamGeo = new THREE.BoxGeometry(0.32, 0.32, 3.2);
  const whRackShelfGeo = new THREE.BoxGeometry(4.8, 0.16, 1.4);
  disposableGeometries.push(
    whFloorGeo,
    whSouthWallGeo,
    whSideWallGeo,
    whNorthFlankGeo,
    whNorthLintelGeo,
    whRoofGeo,
    whHoistBeamGeo,
    whRackShelfGeo
  );

  const whFloor = new THREE.Mesh(whFloorGeo, imperialWoodFloorMat);
  whFloor.position.set(0, -0.15, -0.3);
  const whSouthW = new THREE.Mesh(whSouthWallGeo, fortressStoneMat);
  whSouthW.position.set(0, 2.8, 5.5);
  const whWestW = new THREE.Mesh(whSideWallGeo, fortressStoneMat);
  whWestW.position.set(-8.5, 2.8, 0);
  const whEastW = new THREE.Mesh(whSideWallGeo, fortressStoneMat);
  whEastW.position.set(8.5, 2.8, 0);
  const whNorthL = new THREE.Mesh(whNorthFlankGeo, timberMat);
  whNorthL.position.set(-4.95, 2.8, -5.5);
  const whNorthR = new THREE.Mesh(whNorthFlankGeo, timberMat);
  whNorthR.position.set(4.95, 2.8, -5.5);
  const whLintel = new THREE.Mesh(whNorthLintelGeo, imperialCrimsonMat);
  whLintel.position.set(0, 4.5, -5.5);
  const whRoof = new THREE.Mesh(whRoofGeo, pagodaTileMat);
  whRoof.position.set(0, 7.6, 0);
  // Overhanging Gable Hoist Beam & Hanging Cargo Crate above the Warehouse North Entrance
  const whHoistBeam = new THREE.Mesh(whHoistBeamGeo, barkMat);
  whHoistBeam.position.set(0, 5.8, -6.4);
  const whHangingCrate = new THREE.Mesh(supplyCrateGeo, furnitureWoodMat);
  whHangingCrate.position.set(0, 4.4, -7.4);
  // North-facing interactive double door (rotated Math.PI so it swings cleanly inward!)
  const whDoorGroup = createInteractiveDoubleDoor(
    SOUTHEAST_HARBOR_POS.warehouseDoorId,
    0,
    0,
    -5.5,
    2.8,
    3.4
  );
  whDoorGroup.position.set(0, 0, -5.5);
  whDoorGroup.rotation.y = Math.PI;
  // Reset internal Z offset of door group children since we positioned whDoorGroup at z = -5.5
  for (const child of whDoorGroup.children) {
    child.position.z = 0;
  }

  warehouseGroup.add(
    whFloor,
    whSouthW,
    whWestW,
    whEastW,
    whNorthL,
    whNorthR,
    whLintel,
    whRoof,
    whHoistBeam,
    whHangingCrate,
    whDoorGroup,
    createRedChineseLantern(-2.4, 3.8, -5.9),
    createRedChineseLantern(2.4, 3.8, -5.9)
  );

  // Warehouse Interior: Heavy Wooden Storage Racks, Stacked Cargo Crates, Wine/Rum Barrels, Grain Sacks, Quartermaster Desk & Gold Bullion Chests!
  for (const side of [-1, 1]) {
    for (const sy of [1.4, 2.8]) {
      const shelf = new THREE.Mesh(whRackShelfGeo, barkMat);
      shelf.position.set(side * 5.4, sy, 2.2);
      warehouseGroup.add(shelf);
    }
    for (let c = 0; c < 6; c++) {
      const crate = new THREE.Mesh(supplyCrateGeo, c % 2 === 0 ? furnitureWoodMat : imperialWoodFloorMat);
      crate.position.set(
        side * (4.2 + (c % 2) * 1.4),
        0.58 + Math.floor(c / 2) * 1.15,
        -2.2 + (c % 3) * 1.6
      );
      warehouseGroup.add(crate);
    }
  }
  // Stacked Oak Rum/Spice Barrels & Burlap Grain Sacks along the South Back Wall
  for (let b = 0; b < 10; b++) {
    const barrel = new THREE.Mesh(aleBarrelGeo, barkMat);
    barrel.position.set(-4.5 + (b % 5) * 2.2, 0.52 + Math.floor(b / 5) * 0.92, 4.3);
    warehouseGroup.add(barrel);
  }
  for (let g = 0; g < 8; g++) {
    const sack = new THREE.Mesh(grainSackGeo, sleepingBagColors[1]);
    sack.position.set(-2.4 + (g % 4) * 1.1, 0.32 + Math.floor(g / 4) * 0.52, 1.8);
    warehouseGroup.add(sack);
  }
  // Harbor Quartermaster's Ledger Desk & Lantern
  const qmDesk = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
  qmDesk.position.set(0, 0.78, -1.2);
  warehouseGroup.add(
    qmDesk,
    createRedChineseLantern(-3.8, 4.4, 0),
    createRedChineseLantern(3.8, 4.4, 0)
  );
  harborGroup.add(warehouseGroup);

  // Adjacent East Dockside Open-Sided Timber Cargo Shed & Harbor Loading Crane at (243, 277)
  const shedGroup = new THREE.Group();
  shedGroup.position.set(SOUTHEAST_HARBOR_POS.cargoShedX, hPlazaY, SOUTHEAST_HARBOR_POS.cargoShedZ);
  const shedDeckGeo = new THREE.BoxGeometry(12.0, 0.24, 9.0);
  const shedRoofGeo = new THREE.BoxGeometry(12.6, 0.36, 9.6);
  disposableGeometries.push(shedDeckGeo, shedRoofGeo);
  const shedDeck = new THREE.Mesh(shedDeckGeo, timberMat);
  shedDeck.position.y = 0.12;
  const shedRoof = new THREE.Mesh(shedRoofGeo, barkMat);
  shedRoof.position.y = 4.2;
  shedRoof.rotation.x = 0.08;
  shedGroup.add(shedDeck, shedRoof);
  for (const sx of [-5.4, 0, 5.4]) {
    for (const sz of [-3.9, 3.9]) {
      const post = new THREE.Mesh(scaffoldLegGeo, barkMat);
      post.position.set(sx, 0, sz);
      shedGroup.add(post);
    }
  }
  for (let c = 0; c < 6; c++) {
    const cx = -3.6 + (c % 3) * 3.6;
    const cz = -1.6 + Math.floor(c / 3) * 2.8;
    const cr = new THREE.Mesh(supplyCrateGeo, c % 2 === 0 ? imperialWoodFloorMat : furnitureWoodMat);
    cr.position.set(cx, 0.7, cz);
    shedGroup.add(cr);
    if (c < 3) {
      const topCr = new THREE.Mesh(supplyCrateGeo, c % 2 === 1 ? imperialWoodFloorMat : furnitureWoodMat);
      topCr.position.set(cx, 1.82, cz);
      shedGroup.add(topCr);
    }
  }
  // Dockside Wooden Cargo Hoist Crane next to the Shed
  const craneMast = new THREE.Mesh(scaffoldLegGeo, barkMat);
  craneMast.scale.set(1.4, 1.6, 1.4);
  craneMast.position.set(7.8, 0, -2.5);
  const craneJib = new THREE.Mesh(craneArmGeo, timberMat);
  craneJib.position.set(9.4, 6.2, -2.5);
  craneJib.rotation.z = 0.28;
  shedGroup.add(craneMast, craneJib);
  harborGroup.add(shedGroup);

  // 5) ANCIENT MARBLE AMPHITHEATER & COLONNADE at (226, 294, y = 3.2m..6.8m)
  const amphGroup = new THREE.Group();
  amphGroup.position.set(SOUTHEAST_HARBOR_POS.amphitheaterX, hPlazaY, SOUTHEAST_HARBOR_POS.amphitheaterZ);
  const amphStageGeo = new THREE.CylinderGeometry(6.4, 6.8, 0.36, 24);
  const amphBenchSegGeo = new THREE.BoxGeometry(2.6, 1.0, 1.65);
  const amphColGeo = new THREE.CylinderGeometry(0.36, 0.42, 5.6, 12);
  amphColGeo.translate(0, 2.8, 0);
  const amphArchBeamGeo = new THREE.BoxGeometry(5.2, 0.48, 0.65);
  disposableGeometries.push(amphStageGeo, amphBenchSegGeo, amphColGeo, amphArchBeamGeo);

  const stageMesh = new THREE.Mesh(amphStageGeo, carvedMarbleMat);
  stageMesh.position.y = 0.18;
  amphGroup.add(stageMesh);

  // 5 Concentric Semicircular Stepped Marble Seating Tiers (hollow arcs around the central stage!)
  for (let tier = 0; tier < 5; tier++) {
    const rad = 7.8 + tier * 1.65;
    const tierH = 0.55 + tier * 0.56;
    const numSegs = 12 + tier * 2;
    for (let s = 0; s < numSegs; s++) {
      const ang = -Math.PI * 0.44 + (s / (numSegs - 1)) * (Math.PI * 0.88);
      const bx = Math.sin(ang) * rad;
      const bz = Math.cos(ang) * rad;
      const bench = new THREE.Mesh(amphBenchSegGeo, tier % 2 === 0 ? carvedMarbleMat : fortressStoneMat);
      bench.scale.set(1.0 + tier * 0.1, tierH, 1.0);
      bench.position.set(bx, tierH * 0.5, bz);
      bench.rotation.y = ang;
      amphGroup.add(bench);
    }
  }
  for (let c = 0; c < 6; c++) {
    const ang = -Math.PI * 0.4 + (c / 5) * (Math.PI * 0.8);
    const cx = Math.sin(ang) * 15.6;
    const cz = Math.cos(ang) * 15.6;
    const col = new THREE.Mesh(amphColGeo, carvedMarbleMat);
    col.position.set(cx, 2.8, cz);
    amphGroup.add(col, createRedChineseLantern(cx, 8.2, cz));
    if (c < 5) {
      const nextAng = -Math.PI * 0.4 + ((c + 1) / 5) * (Math.PI * 0.8);
      const nx = Math.sin(nextAng) * 15.6;
      const nz = Math.cos(nextAng) * 15.6;
      const beam = new THREE.Mesh(amphArchBeamGeo, imperialCrimsonMat);
      beam.position.set((cx + nx) * 0.5, 8.4, (cz + nz) * 0.5);
      beam.rotation.y = (ang + nextAng) * 0.5;
      amphGroup.add(beam);
    }
  }
  harborGroup.add(amphGroup);

  // 6) WALKABLE WOODEN HARBOR PIER & ENLARGED 42m x 12.8m BOARDABLE 3-MASTED TREASURE GALLEON SHIP at (282, 252)
  //    - All 3 Masts + Bowsprit are positioned FORWARD of the Raised Stern Quarterdeck (ZERO sails behind or near the helm!)
  //    - Ship's Wheel is mounted on the aft face of the oak helm stand facing the Captain looking forward toward the bow!
  //    - Raised Stern Quarterdeck (y = 6.65m) with Port & Starboard Exterior Companionway Stairs
  //    - Enterable Captain's Sleeping & Command Cabin Underneath (y = 3.65m, door 'galleon-captain-door' at z = 259.5)!
  const pierLen = SOUTHEAST_HARBOR_POS.pierEndX - SOUTHEAST_HARBOR_POS.pierStartX; // 17.5m
  const hPierDeckGeo = new THREE.BoxGeometry(pierLen, 0.28, SOUTHEAST_HARBOR_POS.pierHalfW * 2);
  const gangplankGeo = new THREE.BoxGeometry(5.4, 0.2, 3.8);
  disposableGeometries.push(hPierDeckGeo, gangplankGeo);

  const hPierDeck = new THREE.Mesh(hPierDeckGeo, timberMat);
  hPierDeck.position.set(
    (SOUTHEAST_HARBOR_POS.pierStartX + SOUTHEAST_HARBOR_POS.pierEndX) * 0.5,
    SOUTHEAST_HARBOR_POS.pierY - 0.14,
    SOUTHEAST_HARBOR_POS.pierZ
  );
  harborGroup.add(hPierDeck);

  for (let px = 256.0; px <= 271.0; px += 3.5) {
    for (const pz of [249.4, 254.6]) {
      const piling = new THREE.Mesh(pilingGeo, barkMat);
      piling.scale.y = 3.2;
      piling.position.set(px, 0.9, pz);
      harborGroup.add(piling);
    }
  }
  const gangplank = new THREE.Mesh(gangplankGeo, imperialWoodFloorMat);
  gangplank.position.set(273.5, 3.45, SOUTHEAST_HARBOR_POS.pierZ);
  gangplank.rotation.z = Math.atan2(
    SOUTHEAST_HARBOR_POS.shipDeckY - SOUTHEAST_HARBOR_POS.pierY,
    5.0
  );
  harborGroup.add(gangplank);

  // Colossal 42m-Long x 12.8m-Wide Boardable 3-Masted Treasure Galleon Ship at (282, 252)
  const shipGroup = new THREE.Group();
  shipGroup.position.set(
    SOUTHEAST_HARBOR_POS.shipX,
    SOUTHEAST_HARBOR_POS.shipDeckY,
    SOUTHEAST_HARBOR_POS.shipZ
  );

  const hullMainGeo = new THREE.BoxGeometry(12.8, 4.2, 37.0);
  const hullBowConeGeo = new THREE.ConeGeometry(6.4, 9.5, 4);
  hullBowConeGeo.rotateX(-Math.PI / 2);
  hullBowConeGeo.rotateZ(Math.PI / 4);
  const bowspritSparGeo = new THREE.CylinderGeometry(0.14, 0.28, 11.5, 8);
  bowspritSparGeo.rotateX(Math.PI * 0.36);
  const shipMainDeckGeo = new THREE.BoxGeometry(12.6, 0.26, 41.6);
  // Raised Quarterdeck Roof / Helm Deck Slab (localZ in [+7.5, +20.8], localY = +3.0m -> world y = 6.65m!)
  const shipQuarterdeckSlabGeo = new THREE.BoxGeometry(12.6, 0.28, 13.4);
  // Hollow Captain's Cabin Walls underneath the Quarterdeck (localY = 0..3.0m)
  const cabinSideWallGeo = new THREE.BoxGeometry(0.38, 3.0, 13.3);
  const cabinSternWallGeo = new THREE.BoxGeometry(12.6, 3.0, 0.42);
  const cabinFrontFlankGeo = new THREE.BoxGeometry(2.2, 3.0, 0.42);
  const cabinFrontLintelGeo = new THREE.BoxGeometry(2.6, 0.65, 0.44);
  const sternWindowPaneGeo = new THREE.BoxGeometry(2.2, 1.35, 0.52);
  const shipBulwarkSideGeo = new THREE.BoxGeometry(0.34, 1.1, 17.6);
  const shipBulwarkEndGeo = new THREE.BoxGeometry(12.6, 1.15, 0.38);
  const shipMastGeo = new THREE.CylinderGeometry(0.24, 0.4, 23.5, 10);
  shipMastGeo.translate(0, 11.75, 0);
  const shipYardarmGeo = new THREE.CylinderGeometry(0.11, 0.14, 10.6, 8);
  shipYardarmGeo.rotateZ(Math.PI / 2);
  const shipSailGeo = new THREE.PlaneGeometry(9.8, 5.4, 8, 4);
  const sailPos = shipSailGeo.attributes.position;
  for (let i = 0; i < sailPos.count; i++) {
    const sx = sailPos.getX(i);
    const sy = sailPos.getY(i);
    const billow = Math.cos((sx / 9.8) * Math.PI) * Math.cos((sy / 5.4) * Math.PI) * 1.25;
    sailPos.setZ(i, -billow);
  }
  shipSailGeo.computeVertexNormals();
  const shipWheelRimGeo = new THREE.TorusGeometry(0.78, 0.075, 8, 20);
  const shipWheelSpokeGeo = new THREE.CylinderGeometry(0.032, 0.032, 1.88, 6);
  const shipHelmStandGeo = new THREE.BoxGeometry(0.46, 1.32, 0.38);
  const binnacleStandGeo = new THREE.CylinderGeometry(0.22, 0.28, 1.05, 10);
  const treasureChestGeo = new THREE.BoxGeometry(1.5, 0.95, 1.05);
  const captainBedGeo = new THREE.BoxGeometry(2.6, 0.68, 3.4);
  const captainPillowGeo = new THREE.BoxGeometry(2.2, 0.24, 0.65);
  disposableGeometries.push(
    hullMainGeo,
    hullBowConeGeo,
    bowspritSparGeo,
    shipMainDeckGeo,
    shipQuarterdeckSlabGeo,
    cabinSideWallGeo,
    cabinSternWallGeo,
    cabinFrontFlankGeo,
    cabinFrontLintelGeo,
    sternWindowPaneGeo,
    shipBulwarkSideGeo,
    shipBulwarkEndGeo,
    shipMastGeo,
    shipYardarmGeo,
    shipSailGeo,
    shipWheelRimGeo,
    shipWheelSpokeGeo,
    shipHelmStandGeo,
    binnacleStandGeo,
    treasureChestGeo,
    captainBedGeo,
    captainPillowGeo
  );

  const hullMesh = new THREE.Mesh(hullMainGeo, barkMat);
  hullMesh.position.set(0, -1.95, 0);
  const bowCone = new THREE.Mesh(hullBowConeGeo, barkMat);
  bowCone.position.set(0, -1.25, -21.5);
  const bowsprit = new THREE.Mesh(bowspritSparGeo, timberMat);
  bowsprit.position.set(0, 1.45, -23.5);
  const mainDeckMesh = new THREE.Mesh(shipMainDeckGeo, imperialWoodFloorMat);
  mainDeckMesh.position.set(0, -0.12, 0);
  const qDeckSlab = new THREE.Mesh(shipQuarterdeckSlabGeo, imperialWoodFloorMat);
  qDeckSlab.position.set(0, 3.0 - 0.14, 14.15); // localZ = +7.45..+20.85, top at localY = +3.0m (world y = 6.65m)!
  shipGroup.add(hullMesh, bowCone, bowsprit, mainDeckMesh, qDeckSlab);

  // ENTERABLE CAPTAIN'S SLEEPING & COMMAND CABIN UNDERNEATH THE QUARTERDECK (localZ = +7.5..+20.8, localY = 0..3.0m)
  const cabWallPort = new THREE.Mesh(cabinSideWallGeo, timberMat);
  cabWallPort.position.set(-6.1, 1.5, 14.15);
  const cabWallStbd = new THREE.Mesh(cabinSideWallGeo, timberMat);
  cabWallStbd.position.set(6.1, 1.5, 14.15);
  const cabWallStern = new THREE.Mesh(cabinSternWallGeo, timberMat);
  cabWallStern.position.set(0, 1.5, 20.65);
  // Front Bulkhead Wall at localZ = +7.5 (world z = 259.5) between the Port & Starboard exterior staircases, with central [E] door!
  const cabFrontL = new THREE.Mesh(cabinFrontFlankGeo, timberMat);
  cabFrontL.position.set(-2.3, 1.5, 7.5);
  const cabFrontR = new THREE.Mesh(cabinFrontFlankGeo, timberMat);
  cabFrontR.position.set(2.3, 1.5, 7.5);
  const cabFrontLintel = new THREE.Mesh(cabinFrontLintelGeo, imperialCrimsonMat);
  cabFrontLintel.position.set(0, 2.68, 7.5);
  const captainDoor = createInteractiveDoubleDoor(
    SOUTHEAST_HARBOR_POS.shipCaptainDoorId,
    0,
    0,
    7.5,
    2.4,
    2.35
  );
  shipGroup.add(cabWallPort, cabWallStbd, cabWallStern, cabFrontL, cabFrontR, cabFrontLintel, captainDoor);

  // Panoramic Gold-Framed Stern Gallery Windows overlooking the Open Sea
  for (const wx of [-3.6, 0, 3.6]) {
    const winMesh = new THREE.Mesh(sternWindowPaneGeo, warmLanternMat);
    winMesh.position.set(wx, 1.75, 20.68);
    const winFrame = new THREE.Mesh(sternWindowPaneGeo, imperialGoldMat);
    winFrame.scale.set(1.12, 1.15, 0.85);
    winFrame.position.set(wx, 1.75, 20.68);
    shipGroup.add(winFrame, winMesh);
  }

  // Captain's Cabin Interior Furnishings: Ornate Four-Poster Bed, Navigation Sea-Chart Table, Gold Treasure Chests, Bookcase & Lanterns!
  const cBedMattress = new THREE.Mesh(captainBedGeo, imperialCrimsonMat);
  cBedMattress.position.set(3.8, 0.42, 16.8);
  const cBedPillow = new THREE.Mesh(captainPillowGeo, imperialGoldMat);
  cBedPillow.position.set(3.8, 0.86, 18.0);
  shipGroup.add(cBedMattress, cBedPillow);
  for (const [bpx, bpz] of [
    [2.6, 15.2],
    [5.0, 15.2],
    [2.6, 18.4],
    [5.0, 18.4],
  ]) {
    const bPost = new THREE.Mesh(balustradePostGeo, furnitureWoodMat);
    bPost.scale.set(0.65, 2.1, 0.65);
    bPost.position.set(bpx, 0, bpz);
    shipGroup.add(bPost);
  }
  // Captain's Sea-Chart & Tactical Navigation Table in center of cabin
  const navTable = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
  navTable.scale.set(1.3, 1.0, 1.4);
  navTable.position.set(-0.6, 0.78, 13.8);
  const seaChart = new THREE.Mesh(feastPlatterGeo, carvedMarbleMat);
  seaChart.scale.set(1.8, 0.3, 1.4);
  seaChart.position.set(-0.6, 0.86, 13.8);
  // Captain's Private Treasure Chests & Wine Barrels on the Port side of the cabin
  const capChest1 = new THREE.Mesh(treasureChestGeo, barkMat);
  capChest1.position.set(-4.2, 0.48, 16.5);
  const capGold1 = new THREE.Mesh(forgeCoalMoundGeo, mineGoldOreMat);
  capGold1.position.set(-4.2, 0.96, 16.5);
  const capChest2 = new THREE.Mesh(treasureChestGeo, imperialCrimsonMat);
  capChest2.position.set(-4.2, 0.48, 11.8);
  shipGroup.add(
    navTable,
    seaChart,
    capChest1,
    capGold1,
    capChest2,
    createRedChineseLantern(-2.2, 2.35, 11.5),
    createRedChineseLantern(2.2, 2.35, 16.5)
  );

  // Two Symmetric Exterior Companionway Staircases on Port (localX = -4.6) & Starboard (localX = +4.6), localZ in [+2.5, +7.5] climbing 0 -> +3.0m!
  const shipStepGeo = new THREE.BoxGeometry(2.4, 0.22, 0.52);
  disposableGeometries.push(shipStepGeo);
  for (const stairSide of [-1, 1]) {
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      const step = new THREE.Mesh(shipStepGeo, imperialWoodFloorMat);
      step.position.set(stairSide * 4.55, t * 3.0 - 0.08, 2.5 + t * 5.0);
      shipGroup.add(step);
    }
  }

  // Ship Bulwark Railings & Deck Cannons (leaving the Port-side Gangplank opening at x = -6.2, localZ in [-2.4, +2.4] clear!)
  const portBowRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  portBowRail.position.set(-6.15, 0.55, -11.4);
  const portSternRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  portSternRail.position.set(-6.15, 3.55, 14.1);
  const stbdBowRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  stbdBowRail.position.set(6.15, 0.55, -11.4);
  const stbdMidRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  stbdMidRail.scale.z = 0.65;
  stbdMidRail.position.set(6.15, 0.55, 1.5);
  const stbdSternRail = new THREE.Mesh(shipBulwarkSideGeo, imperialCrimsonMat);
  stbdSternRail.position.set(6.15, 3.55, 14.1);
  const bowRail = new THREE.Mesh(shipBulwarkEndGeo, imperialCrimsonMat);
  bowRail.position.set(0, 0.55, -20.6);
  const sternRail = new THREE.Mesh(shipBulwarkEndGeo, imperialCrimsonMat);
  sternRail.position.set(0, 3.55, 20.6);
  // Front balustrade across the Raised Quarterdeck between the two side staircases (localX in [-3.3, +3.3], localZ = +7.55, localY = +3.55)
  const qDeckFrontRailGeo = new THREE.BoxGeometry(6.6, 0.95, 0.28);
  disposableGeometries.push(qDeckFrontRailGeo);
  const qDeckFrontRail = new THREE.Mesh(qDeckFrontRailGeo, imperialCrimsonMat);
  qDeckFrontRail.position.set(0, 3.48, 7.55);
  shipGroup.add(
    portBowRail,
    portSternRail,
    stbdBowRail,
    stbdMidRail,
    stbdSternRail,
    bowRail,
    sternRail,
    qDeckFrontRail
  );

  // 6 Naval Broadside Iron Cannons on the Main Deck
  for (const cz of [-13.5, -7.5, 4.5]) {
    for (const side of [-1, 1]) {
      if (side === -1 && Math.abs(cz) < 3.5) continue;
      const scGroup = new THREE.Group();
      scGroup.position.set(side * 5.2, 0, cz);
      if (side === -1) scGroup.rotation.y = Math.PI;
      const scCarriage = new THREE.Mesh(cannonCarriageGeo, timberMat);
      scCarriage.position.y = 0.26;
      const scBarrel = new THREE.Mesh(cannonBarrelGeo, darkIronMat);
      scBarrel.position.set(0.45, 0.62, 0);
      scGroup.add(scCarriage, scBarrel);
      shipGroup.add(scGroup);
    }
  }

  // 3 Towering Masts Positioned Strictly FORWARD of the Quarterdeck & Stairs (Foremast at -16.2m, Mainmast at -8.2m, Mizzenmast at -0.6m — ZERO sails near or behind the helm!)
  for (const [mz, mScale] of [
    [-16.2, 0.92],
    [-8.2, 1.08],
    [-0.6, 0.90],
  ]) {
    const mast = new THREE.Mesh(shipMastGeo, barkMat);
    mast.position.set(0, 0, mz);
    mast.scale.y = mScale;
    shipGroup.add(mast);
    for (const sy of [8.2 * mScale, 15.0 * mScale]) {
      const yard = new THREE.Mesh(shipYardarmGeo, timberMat);
      yard.position.set(0, sy + 2.5, mz);
      const sail = new THREE.Mesh(shipSailGeo, sailClothMat);
      sail.position.set(0, sy, mz - 0.28);
      shipGroup.add(yard, sail);
    }
    shipGroup.add(createImperialFlag(0, 22.8 * mScale, mz));
  }

  // CAPTAIN'S SHIP WHEEL HELM & BINNACLE COMPASS ON THE RAISED QUARTERDECK (localY = 3.0m -> world y = 6.65m):
  // - Binnacle compass stand at localZ = +8.5m
  // - Carved oak helm support post at localZ = +9.2m
  // - 8-Spoked Brass & Teak Ship's Wheel mounted on the AFT (+Z) face (localZ = +9.48m), facing the Captain standing at localZ = +10.2m looking forward (-Z) toward the bow!
  // - ZERO sails or masts anywhere behind the wheel!
  const binnacleStand = new THREE.Mesh(binnacleStandGeo, furnitureWoodMat);
  binnacleStand.position.set(0, 3.52, 8.45);
  const binnacleCompass = new THREE.Mesh(cannonBallGeo, imperialGoldMat);
  binnacleCompass.scale.setScalar(1.35);
  binnacleCompass.position.set(0, 4.12, 8.45);
  const helmStand = new THREE.Mesh(shipHelmStandGeo, furnitureWoodMat);
  helmStand.position.set(0, 3.66, 9.2);
  const wheelAssembly = new THREE.Group();
  wheelAssembly.position.set(0, 4.18, 9.48); // Mounted on the aft (+Z) side of the helm stand, facing the helmsman!
  const wheelRim = new THREE.Mesh(shipWheelRimGeo, furnitureWoodMat);
  const wheelHub = new THREE.Mesh(cannonBallGeo, imperialGoldMat);
  wheelHub.scale.set(0.9, 0.9, 1.4);
  wheelAssembly.add(wheelRim, wheelHub);
  for (let sp = 0; sp < 4; sp++) {
    const spoke = new THREE.Mesh(shipWheelSpokeGeo, imperialGoldMat);
    spoke.rotation.z = (sp / 4) * Math.PI;
    wheelAssembly.add(spoke);
  }

  const sternChest = new THREE.Mesh(treasureChestGeo, barkMat);
  sternChest.position.set(3.8, 3.48, 17.5);
  const sternGold = new THREE.Mesh(forgeCoalMoundGeo, mineGoldOreMat);
  sternGold.position.set(3.8, 3.98, 17.5);
  shipGroup.add(
    binnacleStand,
    binnacleCompass,
    helmStand,
    wheelAssembly,
    sternChest,
    sternGold,
    createRedChineseLantern(-5.2, 5.2, 20.2),
    createRedChineseLantern(5.2, 5.2, 20.2),
    createImperialFlag(0, 5.5, 20.5)
  );
  harborGroup.add(shipGroup);

  // 7) COLOSSAL CLIMBABLE 26m IMPERIAL LIGHTHOUSE on the Northern Headland Promontory at (252, 202, baseY = 9.5m, topDeckY = 25.5m)
  //    - Exterior-only red trim strips (ZERO red boxes protruding into the hollow interior!)
  const lhX = SOUTHEAST_HARBOR_POS.lighthouseX; // 252.0
  const lhZ = SOUTHEAST_HARBOR_POS.lighthouseZ; // 202.0
  const lhBaseY = SOUTHEAST_HARBOR_POS.lighthouseBaseY; // 9.5m
  const lhTopY = SOUTHEAST_HARBOR_POS.lighthouseTopDeckY; // 25.5m
  const lhH = lhTopY - lhBaseY; // 16.0m
  const lighthouseGroup = new THREE.Group();
  lighthouseGroup.position.set(lhX, lhBaseY, lhZ);

  const lhPlinthGeo = new THREE.BoxGeometry(9.2, 1.2, 9.2);
  const lhWallNGeo = new THREE.BoxGeometry(8.0, lhH, 0.55);
  const lhWallSideGeo = new THREE.BoxGeometry(0.55, lhH, 8.0);
  const lhWallDoorFlankGeo = new THREE.BoxGeometry(2.8, lhH, 0.55);
  const lhWallDoorLintelGeo = new THREE.BoxGeometry(2.4, lhH - 3.2, 0.55);
  // Exterior-only decorative crimson stripes (thin 0.16m strips on the OUTER faces at ±4.16m -> 100% hollow interior!)
  const lhStripeOuterZGeo = new THREE.BoxGeometry(8.48, 1.25, 0.16);
  const lhStripeOuterXGeo = new THREE.BoxGeometry(0.16, 1.25, 8.48);
  // Top gallery deck with a 1.6m x 1.6m ladder hatch at local (0, -2.9) (world (252, 199.1))
  const lhDeckSouthGeo = new THREE.BoxGeometry(9.2, 0.32, 6.2);
  const lhDeckNorthSideGeo = new THREE.BoxGeometry(3.6, 0.32, 3.0);
  const lhLanternGlassGeo = new THREE.CylinderGeometry(2.2, 2.2, 3.6, 12);
  const lhDomeRoofGeo = new THREE.ConeGeometry(3.2, 2.8, 12);
  const lhSearchBeamGeo = new THREE.ConeGeometry(3.8, 28.0, 12, 1, true);
  lhSearchBeamGeo.translate(0, -14.0, 0);
  lhSearchBeamGeo.rotateX(Math.PI / 2);
  const lhBeamMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.26,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const lhLadderRailGeo = new THREE.BoxGeometry(0.11, lhH + 1.0, 0.11);
  disposableGeometries.push(
    lhPlinthGeo,
    lhWallNGeo,
    lhWallSideGeo,
    lhWallDoorFlankGeo,
    lhWallDoorLintelGeo,
    lhStripeOuterZGeo,
    lhStripeOuterXGeo,
    lhDeckSouthGeo,
    lhDeckNorthSideGeo,
    lhLanternGlassGeo,
    lhDomeRoofGeo,
    lhSearchBeamGeo,
    lhLadderRailGeo
  );
  disposableMaterials.push(lhBeamMat);

  const lhPlinth = new THREE.Mesh(lhPlinthGeo, carvedMarbleMat);
  lhPlinth.position.set(0, -0.45, 0);
  const lhWallN = new THREE.Mesh(lhWallNGeo, carvedMarbleMat);
  lhWallN.position.set(0, lhH * 0.5, -3.85);
  const lhWallW = new THREE.Mesh(lhWallSideGeo, carvedMarbleMat);
  lhWallW.position.set(-3.85, lhH * 0.5, 0);
  const lhWallE = new THREE.Mesh(lhWallSideGeo, carvedMarbleMat);
  lhWallE.position.set(3.85, lhH * 0.5, 0);
  const lhFlankL = new THREE.Mesh(lhWallDoorFlankGeo, carvedMarbleMat);
  lhFlankL.position.set(-2.6, lhH * 0.5, 3.85);
  const lhFlankR = new THREE.Mesh(lhWallDoorFlankGeo, carvedMarbleMat);
  lhFlankR.position.set(2.6, lhH * 0.5, 3.85);
  const lhLintel = new THREE.Mesh(lhWallDoorLintelGeo, carvedMarbleMat);
  lhLintel.position.set(0, (3.2 + lhH) * 0.5, 3.85);

  // Exterior-only Crimson Horizontal Lighthouse Stripes at y = 5.2m, 10.4m, 15.2m (strictly on the outer wall faces ±4.16m!)
  for (const sy of [5.2, 10.4, 15.2]) {
    for (const sz of [-4.16, 4.16]) {
      const stripZ = new THREE.Mesh(lhStripeOuterZGeo, imperialCrimsonMat);
      stripZ.position.set(0, sy, sz);
      lighthouseGroup.add(stripZ);
    }
    for (const sx of [-4.16, 4.16]) {
      const stripX = new THREE.Mesh(lhStripeOuterXGeo, imperialCrimsonMat);
      stripX.position.set(sx, sy, 0);
      lighthouseGroup.add(stripX);
    }
  }

  // Top Observation Gallery Deck at y = lhH (16.0m above base = 25.5m world Y!) leaving hatch at (0, -2.9) open
  const lhDeckS = new THREE.Mesh(lhDeckSouthGeo, carvedMarbleMat);
  lhDeckS.position.set(0, lhH - 0.16, 1.5); // covers lz in [-1.6, +4.6]
  const lhDeckNW = new THREE.Mesh(lhDeckNorthSideGeo, carvedMarbleMat);
  lhDeckNW.position.set(-2.8, lhH - 0.16, -3.1);
  const lhDeckNE = new THREE.Mesh(lhDeckNorthSideGeo, carvedMarbleMat);
  lhDeckNE.position.set(2.8, lhH - 0.16, -3.1);

  lighthouseGroup.add(
    lhPlinth,
    lhWallN,
    lhWallW,
    lhWallE,
    lhFlankL,
    lhFlankR,
    lhLintel,
    lhDeckS,
    lhDeckNW,
    lhDeckNE,
    createInteractiveDoubleDoor(SOUTHEAST_HARBOR_POS.lighthouseDoorId, 0, 0.08, 3.85, 2.2, 3.2)
  );

  // Climbable 16m Vertical Lighthouse Ladder at local (0, -2.9) (world (252, 199.1))
  const lhLadderGroup = new THREE.Group();
  lhLadderGroup.position.set(0, lhH * 0.5, -2.9);
  const lhRailL = new THREE.Mesh(lhLadderRailGeo, imperialCrimsonMat);
  lhRailL.position.x = -0.35;
  const lhRailR = new THREE.Mesh(lhLadderRailGeo, imperialCrimsonMat);
  lhRailR.position.x = 0.35;
  lhLadderGroup.add(lhRailL, lhRailR);
  const numLhRungs = 38;
  for (let r = 0; r <= numLhRungs; r++) {
    const rung = new THREE.Mesh(hwLadderRungGeo, imperialGoldMat);
    rung.position.y = -lhH * 0.5 + 0.35 + (r / numLhRungs) * (lhH - 0.4);
    lhLadderGroup.add(rung);
  }
  lighthouseGroup.add(lhLadderGroup);

  // Top Gallery Parapet Railings + Glowing Beacon Lantern Core + Rotating Twin Searchlight Beams!
  const lhTopRailZGeo = new THREE.BoxGeometry(9.0, 0.96, 0.24);
  const lhTopRailXGeo = new THREE.BoxGeometry(0.24, 0.96, 9.0);
  disposableGeometries.push(lhTopRailZGeo, lhTopRailXGeo);
  for (const sz of [-4.4, 4.4]) {
    const rZ = new THREE.Mesh(lhTopRailZGeo, imperialCrimsonMat);
    rZ.position.set(0, lhH + 0.48, sz);
    lighthouseGroup.add(rZ);
  }
  for (const sx of [-4.4, 4.4]) {
    const rX = new THREE.Mesh(lhTopRailXGeo, imperialCrimsonMat);
    rX.position.set(sx, lhH + 0.48, 0);
    lighthouseGroup.add(rX);
  }

  const lhBeaconCore = new THREE.Mesh(lhLanternGlassGeo, warmLanternMat);
  lhBeaconCore.position.set(0, lhH + 2.4, 0);
  const lhDomeRoof = new THREE.Mesh(lhDomeRoofGeo, imperialGoldMat);
  lhDomeRoof.position.set(0, lhH + 5.4, 0);
  const lighthouseBeaconGroup = new THREE.Group();
  lighthouseBeaconGroup.position.set(0, lhH + 2.6, 0);
  const beam1 = new THREE.Mesh(lhSearchBeamGeo, lhBeamMat);
  const beam2 = new THREE.Mesh(lhSearchBeamGeo, lhBeamMat);
  beam2.rotation.y = Math.PI;
  lighthouseBeaconGroup.add(beam1, beam2);
  lighthouseGroup.add(lhBeaconCore, lhDomeRoof, lighthouseBeaconGroup);
  harborGroup.add(lighthouseGroup);

  scene.add(harborGroup);
  distanceCulledObjects.push({
    obj: harborGroup,
    cx: 255.0,
    cz: 255.0,
    radius: 145,
  });

  // ============================================================================
  // 6E. GRAND SOUTH-WEST TERRACED OASIS, ANCIENT SUNKEN COLONNADE, ALCHEMIST PAVILION
  //     & CLIMBABLE 24m CELESTIAL OBSERVATORY TOWER at (-218, 232, y = 5.5m)
  // ============================================================================
  const swOasisGroup = new THREE.Group();
  const swCx = SOUTHWEST_OASIS_POS.x; // -218.0
  const swCz = SOUTHWEST_OASIS_POS.z; // 232.0
  const swY = SOUTHWEST_OASIS_POS.terraceY; // 5.5m

  const oasisSandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xe6ccb2,
    map: textures.rockAlbedo,
    bumpMap: textures.rockBump,
    bumpScale: 0.06,
    roughness: 0.74,
  });
  const oasisLapisMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.28,
    metalness: 0.35,
  });
  const oasisTurquoiseWaterMat = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.28,
    roughness: 0.06,
    metalness: 0.14,
    clearcoat: isSoftwareGl ? 0 : 0.92,
    transparent: true,
    opacity: 0.86,
  });
  attachAnimatedWaterWaveShader(oasisTurquoiseWaterMat, 0.042, 0.085);
  const palmFrondMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });
  attachWindSwayShader(palmFrondMat, 0.14, 1.8, swayMaterials);
  disposableMaterials.push(oasisSandstoneMat, oasisLapisMat, oasisTurquoiseWaterMat, palmFrondMat);

  // 1) Oasis Courtyard Sandstone & Lapis-Lazuli Plaza Floor (shifted north of the swimmable Lagoon so the Lagoon basin is open!) + Central 8-Pointed Star Fountain at (-310, 300)
  const oasisPlazaDiscGeo = new THREE.CylinderGeometry(34.0, 36.0, 0.34, 32);
  const oasisInnerMosaicGeo = new THREE.CylinderGeometry(14.5, 14.5, 0.38, 16);
  const starFntWallSegGeo = new THREE.BoxGeometry(1.65, 0.96, 0.44);
  const starFntWaterGeo = new THREE.CylinderGeometry(3.15, 3.15, 0.12, 16);
  const obeliskShaftGeo = new THREE.CylinderGeometry(0.45, 0.88, 9.6, 4);
  obeliskShaftGeo.translate(0, 4.8, 0);
  const obeliskTipGeo = new THREE.ConeGeometry(0.64, 1.6, 4);
  obeliskTipGeo.translate(0, 10.4, 0);
  disposableGeometries.push(
    oasisPlazaDiscGeo,
    oasisInnerMosaicGeo,
    starFntWallSegGeo,
    starFntWaterGeo,
    obeliskShaftGeo,
    obeliskTipGeo
  );

  const oasisPlazaMesh = new THREE.Mesh(oasisPlazaDiscGeo, oasisSandstoneMat);
  oasisPlazaMesh.position.set(swCx, swY - 0.15, swCz - 15.0);
  const oasisMosaicMesh = new THREE.Mesh(oasisInnerMosaicGeo, oasisLapisMat);
  oasisMosaicMesh.position.set(swCx, swY - 0.14, swCz);
  swOasisGroup.add(oasisPlazaMesh, oasisMosaicMesh);

  // Central Sandstone & Lapis Star-Fountain at (-218, 232) (Enclosed basin with zero z-fighting!)
  const swFntGroup = new THREE.Group();
  swFntGroup.position.set(SOUTHWEST_OASIS_POS.fountainX, swY, SOUTHWEST_OASIS_POS.fountainZ);
  for (let w = 0; w < 12; w++) {
    const ang = (w / 12) * Math.PI * 2;
    const seg = new THREE.Mesh(starFntWallSegGeo, oasisSandstoneMat);
    seg.position.set(Math.sin(ang) * 3.35, 0.48, Math.cos(ang) * 3.35);
    seg.rotation.y = ang;
    swFntGroup.add(seg);
  }
  const swFntWater = new THREE.Mesh(starFntWaterGeo, oasisTurquoiseWaterMat);
  swFntWater.position.y = 0.68;
  const swFntPillar = new THREE.Mesh(fountainPillarGeo, oasisLapisMat);
  swFntPillar.position.y = 1.25;
  const swFntBowl = new THREE.Mesh(fountainUpperBowlGeo, imperialGoldMat);
  swFntBowl.position.y = 2.15;
  const swFntSunOrb = new THREE.Mesh(mineCrystalClusterGeo, mineGoldOreMat);
  swFntSunOrb.scale.setScalar(1.45);
  swFntSunOrb.position.y = 3.15;
  swFntGroup.add(swFntWater, swFntPillar, swFntBowl, swFntSunOrb);
  swOasisGroup.add(swFntGroup);

  // 2) CLIMBABLE 24m ANCIENT CELESTIAL OBSERVATORY & GOLDEN ASTROLABE TOWER at (-218, 212, baseY = 5.5m, topDeckY = 21.5m)
  const obsX = SOUTHWEST_OASIS_POS.observatoryX; // -218.0
  const obsZ = SOUTHWEST_OASIS_POS.observatoryZ; // 212.0
  const obsBaseY = SOUTHWEST_OASIS_POS.observatoryBaseY; // 5.5m
  const obsTopY = SOUTHWEST_OASIS_POS.observatoryTopDeckY; // 21.5m
  const obsH = obsTopY - obsBaseY; // 16.0m
  const obsTowerGroup = new THREE.Group();
  obsTowerGroup.position.set(obsX, obsBaseY, obsZ);

  const obsWallNGeo = new THREE.BoxGeometry(9.6, obsH, 0.58);
  const obsWallSideGeo = new THREE.BoxGeometry(0.58, obsH, 9.6);
  const obsWallDoorFlankGeo = new THREE.BoxGeometry(3.55, obsH, 0.58);
  const obsWallDoorLintelGeo = new THREE.BoxGeometry(2.5, obsH - 3.2, 0.58);
  const obsOuterTrimZGeo = new THREE.BoxGeometry(10.1, 0.85, 0.16);
  const obsOuterTrimXGeo = new THREE.BoxGeometry(0.16, 0.85, 10.1);
  const obsDeckSouthGeo = new THREE.BoxGeometry(10.4, 0.34, 7.2);
  const obsDeckNorthSideGeo = new THREE.BoxGeometry(4.2, 0.34, 3.2);
  const astrolabeRing1Geo = new THREE.TorusGeometry(2.85, 0.14, 10, 28);
  const astrolabeRing2Geo = new THREE.TorusGeometry(2.25, 0.12, 10, 24);
  const astrolabeRing3Geo = new THREE.TorusGeometry(1.65, 0.10, 8, 20);
  const telescopeTubeGeo = new THREE.CylinderGeometry(0.18, 0.28, 3.2, 10);
  telescopeTubeGeo.rotateX(Math.PI * 0.32);
  disposableGeometries.push(
    obsWallNGeo,
    obsWallSideGeo,
    obsWallDoorFlankGeo,
    obsWallDoorLintelGeo,
    obsOuterTrimZGeo,
    obsOuterTrimXGeo,
    obsDeckSouthGeo,
    obsDeckNorthSideGeo,
    astrolabeRing1Geo,
    astrolabeRing2Geo,
    astrolabeRing3Geo,
    telescopeTubeGeo
  );

  const obsWallN = new THREE.Mesh(obsWallNGeo, oasisSandstoneMat);
  obsWallN.position.set(0, obsH * 0.5, -4.85);
  const obsWallW = new THREE.Mesh(obsWallSideGeo, oasisSandstoneMat);
  obsWallW.position.set(-4.85, obsH * 0.5, 0);
  const obsWallE = new THREE.Mesh(obsWallSideGeo, oasisSandstoneMat);
  obsWallE.position.set(4.85, obsH * 0.5, 0);
  const obsFlankL = new THREE.Mesh(obsWallDoorFlankGeo, oasisSandstoneMat);
  obsFlankL.position.set(-3.02, obsH * 0.5, 4.85);
  const obsFlankR = new THREE.Mesh(obsWallDoorFlankGeo, oasisSandstoneMat);
  obsFlankR.position.set(3.02, obsH * 0.5, 4.85);
  const obsLintel = new THREE.Mesh(obsWallDoorLintelGeo, oasisLapisMat);
  obsLintel.position.set(0, (3.2 + obsH) * 0.5, 4.85);

  // Exterior-only Lapis-Lazuli & Gold Astronomical Frieze Bands at y = 5.0m, 10.2m, 15.2m (strictly on the outer wall faces ±5.18m!)
  for (const [sy, bandMat] of [
    [5.0, oasisLapisMat],
    [10.2, imperialGoldMat],
    [15.2, oasisLapisMat],
  ] as const) {
    for (const sz of [-5.18, 5.18]) {
      const bz = new THREE.Mesh(obsOuterTrimZGeo, bandMat);
      bz.position.set(0, sy, sz);
      obsTowerGroup.add(bz);
    }
    for (const sx of [-5.18, 5.18]) {
      const bx = new THREE.Mesh(obsOuterTrimXGeo, bandMat);
      bx.position.set(sx, sy, 0);
      obsTowerGroup.add(bx);
    }
  }

  // Top Celestial Observation Deck at y = obsH (16.0m above base = 21.5m world Y!) leaving ladder hatch at (0, -3.7) open!
  const obsDeckS = new THREE.Mesh(obsDeckSouthGeo, oasisSandstoneMat);
  obsDeckS.position.set(0, obsH - 0.17, 1.6);
  const obsDeckNW = new THREE.Mesh(obsDeckNorthSideGeo, oasisSandstoneMat);
  obsDeckNW.position.set(-3.1, obsH - 0.17, -3.6);
  const obsDeckNE = new THREE.Mesh(obsDeckNorthSideGeo, oasisSandstoneMat);
  obsDeckNE.position.set(3.1, obsH - 0.17, -3.6);

  obsTowerGroup.add(
    obsWallN,
    obsWallW,
    obsWallE,
    obsFlankL,
    obsFlankR,
    obsLintel,
    obsDeckS,
    obsDeckNW,
    obsDeckNE,
    createInteractiveDoubleDoor(SOUTHWEST_OASIS_POS.observatoryDoorId, 0, 0.08, 4.85, 2.4, 3.2)
  );

  // Observatory 1st Floor Interior: Astronomer's Star-Chart Table, Glowing Celestial Globe, Scroll Shelves & Lanterns!
  const astroTable = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
  astroTable.scale.set(1.3, 1.0, 1.3);
  astroTable.position.set(0, 0.78, 0.4);
  const starGlobe = new THREE.Mesh(mineCrystalClusterGeo, mineSapphireCrystalMat);
  starGlobe.scale.setScalar(1.15);
  starGlobe.position.set(0, 1.35, 0.4);
  const scrollShelfW = new THREE.Mesh(whRackShelfGeo, furnitureWoodMat);
  scrollShelfW.rotation.y = Math.PI / 2;
  scrollShelfW.position.set(-3.8, 1.8, 0);
  const scrollShelfE = new THREE.Mesh(whRackShelfGeo, furnitureWoodMat);
  scrollShelfE.rotation.y = Math.PI / 2;
  scrollShelfE.position.set(3.8, 1.8, 0);
  obsTowerGroup.add(
    astroTable,
    starGlobe,
    scrollShelfW,
    scrollShelfE,
    createRedChineseLantern(-2.8, 3.8, 1.5),
    createRedChineseLantern(2.8, 3.8, 1.5)
  );

  // Climbable 16m Vertical Observatory Ladder at local (0, -3.7) (world (-218, 208.3))
  const obsLadderGroup = new THREE.Group();
  obsLadderGroup.position.set(0, obsH * 0.5, -3.7);
  const obsRailL = new THREE.Mesh(lhLadderRailGeo, oasisLapisMat);
  obsRailL.position.x = -0.35;
  const obsRailR = new THREE.Mesh(lhLadderRailGeo, oasisLapisMat);
  obsRailR.position.x = 0.35;
  obsLadderGroup.add(obsRailL, obsRailR);
  for (let r = 0; r <= 38; r++) {
    const rung = new THREE.Mesh(hwLadderRungGeo, imperialGoldMat);
    rung.position.y = -obsH * 0.5 + 0.35 + (r / 38) * (obsH - 0.4);
    obsLadderGroup.add(rung);
  }
  obsTowerGroup.add(obsLadderGroup);

  // Top Observation Deck Parapet Railings + Brass Stargazing Telescope + Colossal Rotating Golden Armillary Sphere (swAstrolabeGroup)!
  for (const sz of [-5.0, 5.0]) {
    const rZ = new THREE.Mesh(lhTopRailZGeo, imperialGoldMat);
    rZ.scale.x = 1.12;
    rZ.position.set(0, obsH + 0.48, sz);
    obsTowerGroup.add(rZ);
  }
  for (const sx of [-5.0, 5.0]) {
    const rX = new THREE.Mesh(lhTopRailXGeo, imperialGoldMat);
    rX.scale.z = 1.12;
    rX.position.set(sx, obsH + 0.48, 0);
    obsTowerGroup.add(rX);
  }
  // Brass Telescope on the South-East corner of the top deck aimed at the stars
  const telescopeMount = new THREE.Mesh(binnacleStandGeo, furnitureWoodMat);
  telescopeMount.position.set(3.2, obsH + 0.52, 3.2);
  const telescopeTube = new THREE.Mesh(telescopeTubeGeo, imperialGoldMat);
  telescopeTube.position.set(3.2, obsH + 1.45, 3.4);
  obsTowerGroup.add(telescopeMount, telescopeTube);

  // Colossal Rotating Golden Armillary Sphere / Celestial Astrolabe atop the Observatory Deck
  const swAstrolabeGroup = new THREE.Group();
  swAstrolabeGroup.position.set(0, obsH + 3.6, 0.8);
  const astroOuterRing = new THREE.Mesh(astrolabeRing1Geo, imperialGoldMat);
  const astroMidRing = new THREE.Mesh(astrolabeRing2Geo, oasisLapisMat);
  astroMidRing.rotation.x = Math.PI / 3;
  const astroInnerRing = new THREE.Mesh(astrolabeRing3Geo, imperialGoldMat);
  astroInnerRing.rotation.y = Math.PI / 4;
  const astroCoreSun = new THREE.Mesh( new THREE.SphereGeometry(0.68, 14, 14), mineGoldOreMat);
  swAstrolabeGroup.add(astroOuterRing, astroMidRing, astroInnerRing, astroCoreSun);
  obsTowerGroup.add(swAstrolabeGroup);
  swOasisGroup.add(obsTowerGroup);

  // 3) ENTERABLE OASIS ALCHEMIST & SILK WEAVER'S PAVILION at (-244, 232, floorY = 5.68m)
  const pavGroup = new THREE.Group();
  pavGroup.position.set(
    SOUTHWEST_OASIS_POS.pavilionX,
    SOUTHWEST_OASIS_POS.pavilionFloorY,
    SOUTHWEST_OASIS_POS.pavilionZ
  );
  const pavFloorGeo = new THREE.BoxGeometry(10.8, 0.32, 13.2);
  const pavWestWallGeo = new THREE.BoxGeometry(0.45, 5.2, 12.8);
  const pavSideWallGeo = new THREE.BoxGeometry(10.4, 5.2, 0.45);
  const pavEastFlankGeo = new THREE.BoxGeometry(0.45, 5.2, 5.15);
  const pavEastLintelGeo = new THREE.BoxGeometry(0.48, 2.0, 2.5);
  const pavDomeGeo = new THREE.SphereGeometry(4.6, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  disposableGeometries.push(
    pavFloorGeo,
    pavWestWallGeo,
    pavSideWallGeo,
    pavEastFlankGeo,
    pavEastLintelGeo,
    pavDomeGeo
  );

  const pavFloor = new THREE.Mesh(pavFloorGeo, oasisSandstoneMat);
  pavFloor.position.y = -0.16;
  const pavWestW = new THREE.Mesh(pavWestWallGeo, oasisSandstoneMat);
  pavWestW.position.set(-5.2, 2.6, 0);
  const pavNorthW = new THREE.Mesh(pavSideWallGeo, oasisSandstoneMat);
  pavNorthW.position.set(0, 2.6, -6.4);
  const pavSouthW = new THREE.Mesh(pavSideWallGeo, oasisSandstoneMat);
  pavSouthW.position.set(0, 2.6, 6.4);
  const pavEastN = new THREE.Mesh(pavEastFlankGeo, oasisSandstoneMat);
  pavEastN.position.set(5.2, 2.6, -3.82);
  const pavEastS = new THREE.Mesh(pavEastFlankGeo, oasisSandstoneMat);
  pavEastS.position.set(5.2, 2.6, 3.82);
  const pavLintel = new THREE.Mesh(pavEastLintelGeo, oasisLapisMat);
  pavLintel.position.set(5.2, 4.2, 0);
  const pavRoofSlab = new THREE.Mesh(pavFloorGeo, oasisLapisMat);
  pavRoofSlab.position.y = 5.3;
  const pavGoldenDome = new THREE.Mesh(pavDomeGeo, imperialGoldMat);
  pavGoldenDome.position.y = 5.2;

  // East-facing interactive double door ('sw-alchemist-door') rotated by +Math.PI/2
  const alchDoor = createInteractiveDoubleDoor(
    SOUTHWEST_OASIS_POS.pavilionDoorId,
    0,
    0,
    0,
    2.4,
    3.2
  );
  alchDoor.position.set(5.2, 0, 0);
  alchDoor.rotation.y = Math.PI / 2;
  for (const ch of alchDoor.children) {
    ch.position.z = 0;
  }

  // Alchemist Pavilion Interior: Distillation Table with Glowing Potion Flasks, Woven Silk Rugs, Spice Jars & Lanterns
  const alchTable = new THREE.Mesh(tableTopGeo, furnitureWoodMat);
  alchTable.scale.set(1.1, 1.0, 1.8);
  alchTable.position.set(-2.2, 0.78, 0);
  const potion1 = new THREE.Mesh(mineCrystalClusterGeo, mineEmeraldCrystalMat);
  potion1.scale.setScalar(0.65);
  potion1.position.set(-2.2, 1.15, -1.1);
  const potion2 = new THREE.Mesh(mineCrystalClusterGeo, mineAmethystCrystalMat);
  potion2.scale.setScalar(0.72);
  potion2.position.set(-2.2, 1.18, 0);
  const potion3 = new THREE.Mesh(mineCrystalClusterGeo, mineSapphireCrystalMat);
  potion3.scale.setScalar(0.65);
  potion3.position.set(-2.2, 1.15, 1.1);
  const silkRug = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.04, 7.8), imperialCrimsonMat);
  silkRug.position.set(0.4, 0.03, 0);

  pavGroup.add(
    pavFloor,
    pavWestW,
    pavNorthW,
    pavSouthW,
    pavEastN,
    pavEastS,
    pavLintel,
    pavRoofSlab,
    pavGoldenDome,
    alchDoor,
    alchTable,
    potion1,
    potion2,
    potion3,
    silkRug,
    createRedChineseLantern(0, 4.2, -2.8),
    createRedChineseLantern(0, 4.2, 2.8)
  );
  swOasisGroup.add(pavGroup);

  // 4) SWIMMABLE TURQUOISE OASIS LAGOON (WITH ANIMATED WAVES!), WALKABLE ARCHED CEDAR BRIDGE & OVER-WATER LOTUS GAZEBO at (-310, 324)
  const oasisLagoonGeo = new THREE.PlaneGeometry(2.0, 2.0, 28, 28);
  oasisLagoonGeo.rotateX(-Math.PI / 2);
  const lagPosAttr = oasisLagoonGeo.attributes.position;
  for (let i = 0; i < lagPosAttr.count; i++) {
    const u = lagPosAttr.getX(i);
    const v = lagPosAttr.getZ(i);
    // Map square grid onto elliptical disc so vertex waves animate across the entire lagoon surface!
    const ex = u * Math.sqrt(Math.max(0, 1.0 - (v * v) * 0.5)) * SOUTHWEST_OASIS_POS.lagoonRadiusX;
    const ez = v * Math.sqrt(Math.max(0, 1.0 - (u * u) * 0.5)) * SOUTHWEST_OASIS_POS.lagoonRadiusZ;
    lagPosAttr.setXYZ(i, ex, 0, ez);
  }
  oasisLagoonGeo.computeVertexNormals();
  const oasisBridgeDeckGeo = new THREE.BoxGeometry(4.4, 0.28, 27.0);
  const oasisGazeboFloorGeo = new THREE.BoxGeometry(8.8, 0.32, 8.8);
  const oasisGazeboDomeGeo = new THREE.ConeGeometry(6.4, 3.6, 8);
  disposableGeometries.push(
    oasisLagoonGeo,
    oasisBridgeDeckGeo,
    oasisGazeboFloorGeo,
    oasisGazeboDomeGeo
  );

  const oasisLagoonWater = new THREE.Mesh(oasisLagoonGeo, oasisTurquoiseWaterMat);
  oasisLagoonWater.position.set(
    SOUTHWEST_OASIS_POS.lagoonX,
    SOUTHWEST_OASIS_POS.lagoonWaterY,
    SOUTHWEST_OASIS_POS.lagoonZ
  );
  const oasisBridgeDeck = new THREE.Mesh(oasisBridgeDeckGeo, timberMat);
  oasisBridgeDeck.position.set(
    SOUTHWEST_OASIS_POS.gazeboX,
    SOUTHWEST_OASIS_POS.gazeboDeckY - 0.14,
    SOUTHWEST_OASIS_POS.lagoonZ
  );
  const oasisGazeboFloor = new THREE.Mesh(oasisGazeboFloorGeo, imperialWoodFloorMat);
  oasisGazeboFloor.position.set(
    SOUTHWEST_OASIS_POS.gazeboX,
    SOUTHWEST_OASIS_POS.gazeboDeckY - 0.12,
    SOUTHWEST_OASIS_POS.gazeboZ
  );
  const oasisGazeboRoof = new THREE.Mesh(oasisGazeboDomeGeo, imperialGoldMat);
  oasisGazeboRoof.position.set(
    SOUTHWEST_OASIS_POS.gazeboX,
    SOUTHWEST_OASIS_POS.gazeboDeckY + 4.8,
    SOUTHWEST_OASIS_POS.gazeboZ
  );
  swOasisGroup.add(oasisLagoonWater, oasisBridgeDeck, oasisGazeboFloor, oasisGazeboRoof);

  for (const gxOff of [-3.8, 3.8]) {
    for (const gzOff of [-3.8, 3.8]) {
      const gCol = new THREE.Mesh(amphColGeo, oasisSandstoneMat);
      gCol.scale.set(0.85, 0.62, 0.85);
      gCol.position.set(
        SOUTHWEST_OASIS_POS.gazeboX + gxOff,
        SOUTHWEST_OASIS_POS.gazeboDeckY,
        SOUTHWEST_OASIS_POS.gazeboZ + gzOff
      );
      swOasisGroup.add(gCol);
    }
  }

  // 5) ANCIENT SUNKEN MARBLE COLONNADE & TWIN 11m GOLDEN SUN-OBELISKS at (-286, 300) & (-274, 296)
  for (let c = 0; c < 6; c++) {
    const cz = SOUTHWEST_OASIS_POS.z - 14.0 + c * 5.6;
    const col = new THREE.Mesh(amphColGeo, oasisSandstoneMat);
    col.position.set(SOUTHWEST_OASIS_POS.colonnadeX, swY, cz);
    swOasisGroup.add(col);
    if (c < 5) {
      const lintel = new THREE.Mesh(amphArchBeamGeo, oasisSandstoneMat);
      lintel.rotation.y = Math.PI / 2;
      lintel.position.set(SOUTHWEST_OASIS_POS.colonnadeX, swY + 5.6, cz + 2.8);
      swOasisGroup.add(lintel);
    }
  }
  for (const oz of [SOUTHWEST_OASIS_POS.gateZ - 5.5, SOUTHWEST_OASIS_POS.gateZ + 5.5]) {
    const obShaft = new THREE.Mesh(obeliskShaftGeo, oasisSandstoneMat);
    obShaft.position.set(SOUTHWEST_OASIS_POS.gateX, swY, oz);
    const obTip = new THREE.Mesh(obeliskTipGeo, mineGoldOreMat);
    obTip.position.set(SOUTHWEST_OASIS_POS.gateX, swY, oz);
    swOasisGroup.add(obShaft, obTip);
  }

  // 6) 14 LUSH OASIS DATE-PALM TREES around the Turquoise Lagoon & Relocated Oasis Courtyard Perimeter (-310, 300)
  const palmTrunkGeo = new THREE.CylinderGeometry(0.24, 0.42, 8.8, 8);
  palmTrunkGeo.translate(0, 4.4, 0);
  const palmFrondGeo = new THREE.BoxGeometry(0.65, 0.08, 3.6);
  palmFrondGeo.translate(0, 0, 1.8);
  disposableGeometries.push(palmTrunkGeo, palmFrondGeo);

  const palmOffsets: Array<[number, number, number]> = [
    [-20, 20, 1.05],
    [-18, 30, 0.95],
    [-10, 37, 1.12],
    [10, 37, 1.08],
    [18, 30, 0.98],
    [20, 20, 1.10],
    [-16, -16, 1.04],
    [16, -16, 1.02],
    [-34, 12, 0.96],
    [-34, -12, 1.06],
    [30, 12, 1.0],
    [30, -16, 0.95],
  ];
  for (let p = 0; p < palmOffsets.length; p++) {
    const [dx, dz, pScale] = palmOffsets[p];
    const px = swCx + dx;
    const pz = swCz + dz;
    const pGroup = new THREE.Group();
    pGroup.position.set(px, groundHeightAt(px, pz), pz);
    pGroup.scale.setScalar(pScale);
    const trunk = new THREE.Mesh(palmTrunkGeo, barkMat);
    trunk.rotation.z = Math.sin(p * 1.7) * 0.08;
    pGroup.add(trunk);
    for (let f = 0; f < 7; f++) {
      const fAng = (f / 7) * Math.PI * 2 + p * 0.4;
      const frond = new THREE.Mesh(palmFrondGeo, palmFrondMat);
      frond.position.set(0, 8.6, 0);
      frond.rotation.y = fAng;
      frond.rotation.x = 0.38;
      pGroup.add(frond);
    }
    swOasisGroup.add(pGroup);
  }

  scene.add(swOasisGroup);
  distanceCulledObjects.push({
    obj: swOasisGroup,
    cx: swCx,
    cz: swCz,
    radius: 115,
  });

  // Animated Shaolin / Tai-Chi Martial-Arts Monks with Articulated Legs, Shin Wraps & Kung-Fu Shoes!
  const monkPantsMat = new THREE.MeshStandardMaterial({
    color: 0x27272a, // Dark charcoal Shaolin trousers
    roughness: 0.78,
  });
  const monkWrapMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5, // White cloth ankle/shin wraps
    roughness: 0.82,
  });
  disposableMaterials.push(monkPantsMat, monkWrapMat);

  const monkTorsoGeo = new THREE.CylinderGeometry(0.24, 0.31, 0.82, 8);
  monkTorsoGeo.translate(0, 1.08, 0);
  const monkHeadGeo = new THREE.SphereGeometry(0.2, 10, 10);
  monkHeadGeo.translate(0, 1.68, 0);
  const monkSashGeo = new THREE.BoxGeometry(0.54, 0.14, 0.54);
  const monkArmGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.68, 6);
  monkArmGeo.translate(0, -0.28, 0);
  const monkUpperLegGeo = new THREE.CylinderGeometry(0.105, 0.088, 0.46, 7);
  monkUpperLegGeo.translate(0, -0.22, 0);
  const monkLowerLegGeo = new THREE.CylinderGeometry(0.082, 0.068, 0.38, 7);
  monkLowerLegGeo.translate(0, -0.56, 0);
  const monkShoeGeo = new THREE.BoxGeometry(0.15, 0.1, 0.28);
  monkShoeGeo.translate(0, -0.74, 0.05);
  const monkStaffGeo = new THREE.CylinderGeometry(0.032, 0.032, 2.1, 6);
  disposableGeometries.push(
    monkTorsoGeo,
    monkHeadGeo,
    monkSashGeo,
    monkArmGeo,
    monkUpperLegGeo,
    monkLowerLegGeo,
    monkShoeGeo,
    monkStaffGeo
  );

  interface MartialArtsMonk {
    group: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
    homeX: number;
    homeY: number;
    homeZ: number;
    baseYaw: number;
    phase: number;
  }
  const martialMonks: MartialArtsMonk[] = [];

  // Helper to convert local Sakura Sanctuary coordinates (lx, lz) into world coordinates aligned with SAKURA_SANCTUARY_YAW
  const cosSakura = Math.cos(SAKURA_SANCTUARY_YAW);
  const sinSakura = Math.sin(SAKURA_SANCTUARY_YAW);
  const toSakuraWorld = (lx: number, lz: number): [number, number] => [
    sCx + lx * cosSakura + lz * sinSakura,
    sCz - lx * sinSakura + lz * cosSakura,
  ];
  const [m1x, m1z] = toSakuraWorld(-8.5, -6.5);
  const [m2x, m2z] = toSakuraWorld(8.5, -6.5);
  const [m3x, m3z] = toSakuraWorld(-6.5, 16.5);
  const [m4x, m4z] = toSakuraWorld(6.5, 16.5);

  const monkPlacements: Array<[number, number, number, number]> = [
    // 4 Shaolin Monks practicing synchronized Kung-Fu / Staff forms in the Grand Fortress Courtyard
    [-14.5, summitY, -146.0 + FZ, 0],
    [14.5, summitY, -146.0 + FZ, 0],
    [-14.5, summitY, -162.0 + FZ, 0],
    [14.5, summitY, -162.0 + FZ, 0],
    // 4 Monks practicing Tai-Chi around the aligned Steaming Hot-Spring & Golden Buddha Sanctuary
    [m1x, sY, m1z, SAKURA_SANCTUARY_YAW],
    [m2x, sY, m2z, SAKURA_SANCTUARY_YAW],
    [m3x, sY, m3z, SAKURA_SANCTUARY_YAW + Math.PI],
    [m4x, sY, m4z, SAKURA_SANCTUARY_YAW + Math.PI],
  ];

  for (let m = 0; m < monkPlacements.length; m++) {
    const [mx, my, mz, myaw] = monkPlacements[m];
    const mGroup = new THREE.Group();
    mGroup.position.set(mx, my, mz);
    mGroup.rotation.y = myaw;

    const torso = new THREE.Mesh(monkTorsoGeo, monkRobeMat);
    const head = new THREE.Mesh(monkHeadGeo, monkSkinMat);
    const sash = new THREE.Mesh(monkSashGeo, imperialCrimsonMat);
    sash.position.y = 0.88;

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.32, 1.38, 0);
    leftArm.add(new THREE.Mesh(monkArmGeo, monkRobeMat));

    const rightArm = new THREE.Group();
    rightArm.position.set(0.32, 1.38, 0);
    rightArm.add(new THREE.Mesh(monkArmGeo, monkRobeMat));
    const staff = new THREE.Mesh(monkStaffGeo, imperialGoldMat);
    staff.position.set(0, -0.52, 0.18);
    staff.rotation.x = Math.PI * 0.35;
    rightArm.add(staff);

    // Articulated Left & Right Legs with Shaolin Trousers, White Shin Wraps & Kung-Fu Shoes
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.14, 0.78, 0);
    leftLeg.add(
      new THREE.Mesh(monkUpperLegGeo, monkPantsMat),
      new THREE.Mesh(monkLowerLegGeo, monkWrapMat),
      new THREE.Mesh(monkShoeGeo, monkPantsMat)
    );

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.14, 0.78, 0);
    rightLeg.add(
      new THREE.Mesh(monkUpperLegGeo, monkPantsMat),
      new THREE.Mesh(monkLowerLegGeo, monkWrapMat),
      new THREE.Mesh(monkShoeGeo, monkPantsMat)
    );

    mGroup.add(torso, head, sash, leftArm, rightArm, leftLeg, rightLeg);
    scene.add(mGroup);
    martialMonks.push({
      group: mGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      homeX: mx,
      homeY: my,
      homeZ: mz,
      baseYaw: myaw,
      phase: m * 0.85,
    });
  }

  scene.add(fortressGroup);
  distanceCulledObjects.push({
    obj: fortressGroup,
    cx: CHINESE_FORTRESS_POS.x,
    cz: -155 + FZ,
    radius: 125,
  });

  // ============================================================================
  // 7. AUTONOMOUS MULTI-TREE SQUIRRELS IN THE DISTANT ORANGE FOREST + DEER HERD
  //    (Smart random tree-to-tree leaps, ground foraging wanders, and climbing
  //     all the way into the treetop crown to disappear & sleep at night!)
  // ============================================================================
  const squirrelMat = new THREE.MeshStandardMaterial({
    color: 0xb85228, // Russet red-brown squirrel coat
    roughness: 0.75,
  });
  const squirrelTailMat = new THREE.MeshStandardMaterial({
    color: 0x993d18,
    roughness: 0.85,
  });
  disposableMaterials.push(squirrelMat, squirrelTailMat);

  const sqBodyGeo = new THREE.BoxGeometry(0.18, 0.16, 0.34);
  const sqHeadGeo = new THREE.BoxGeometry(0.14, 0.14, 0.16);
  sqHeadGeo.translate(0, 0.08, 0.2);
  const sqTailGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.38, 6);
  sqTailGeo.rotateX(-0.75);
  sqTailGeo.translate(0, 0.16, -0.24);
  disposableGeometries.push(sqBodyGeo, sqHeadGeo, sqTailGeo);

  type SquirrelActionState =
    | 'perched'
    | 'canopy_jump'
    | 'climb_down'
    | 'ground_wander'
    | 'climb_up'
    | 'climb_to_sleep'
    | 'sleeping_in_crown';

  interface ForestSquirrel {
    root: THREE.Group;
    tailMesh: THREE.Mesh;
    currentTreeIdx: number;
    targetTreeIdx: number;
    state: SquirrelActionState;
    stateStartTime: number;
    stateDuration: number;
    wanderStartX: number;
    wanderStartZ: number;
    wanderTargetX: number;
    wanderTargetZ: number;
    wanderLegsRemaining: number;
    decisionCounter: number;
  }

  // Helper to pick a random neighboring birch tree within [4.2m .. 14.5m] of treeIdx
  function pickRandomNeighborBirch(fromIdx: number, seedStep: number): number {
    if (birches.length < 2) return 0;
    const origin = birches[fromIdx];
    const candidates: number[] = [];
    for (let j = 0; j < birches.length; j++) {
      if (j === fromIdx) continue;
      const d = Math.hypot(birches[j].x - origin.x, birches[j].z - origin.z);
      if (d >= 4.2 && d <= 14.5) {
        candidates.push(j);
      }
    }
    if (candidates.length === 0) {
      return (fromIdx + 1) % birches.length;
    }
    const pick = Math.floor(hash2D(fromIdx + seedStep * 13, seedStep * 29 + 7) * candidates.length);
    return candidates[Math.min(candidates.length - 1, Math.max(0, pick))];
  }

  const jumpingSquirrels: ForestSquirrel[] = [];
  if (birches.length >= 2) {
    // Select up to 14 well-spaced initial home trees across the 216m-diameter Orange Forest (min 24m apart)
    const selectedHomeIndices: number[] = [];
    for (let i = 0; i < birches.length && selectedHomeIndices.length < 14; i++) {
      const candIdx = (i * 7) % birches.length;
      const cand = birches[candIdx];
      let tooClose = false;
      for (let s = 0; s < selectedHomeIndices.length; s++) {
        const other = birches[selectedHomeIndices[s]];
        if (Math.hypot(cand.x - other.x, cand.z - other.z) < 24.0) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        selectedHomeIndices.push(candIdx);
      }
    }

    for (let i = 0; i < selectedHomeIndices.length; i++) {
      const startIdx = selectedHomeIndices[i];
      const nextIdx = pickRandomNeighborBirch(startIdx, i + 1);
      const tA = birches[startIdx];

      const root = new THREE.Group();
      const body = new THREE.Mesh(sqBodyGeo, squirrelMat);
      const head = new THREE.Mesh(sqHeadGeo, squirrelMat);
      const tailMesh = new THREE.Mesh(sqTailGeo, squirrelTailMat);
      root.add(body, head, tailMesh);
      root.scale.setScalar(1.25);
      scene.add(root);

      jumpingSquirrels.push({
        root,
        tailMesh,
        currentTreeIdx: startIdx,
        targetTreeIdx: nextIdx,
        state: 'perched',
        stateStartTime: -i * 1.7,
        stateDuration: 3.5 + (i % 4) * 1.4,
        wanderStartX: tA.x,
        wanderStartZ: tA.z,
        wanderTargetX: tA.x + 2.0,
        wanderTargetZ: tA.z + 2.0,
        wanderLegsRemaining: 0,
        decisionCounter: i * 11,
      });
    }
  }

  // --- ARTICULATED ANIMATED FOREST DEER HERD & STABLE HORSES ---
  const deerCoatMat = new THREE.MeshStandardMaterial({
    color: 0x8c5832,
    roughness: 0.78,
  });
  const antlerMat = new THREE.MeshStandardMaterial({
    color: 0xe6dac3,
    roughness: 0.65,
  });
  disposableMaterials.push(deerCoatMat, antlerMat);

  const deerBodyGeo = new THREE.BoxGeometry(0.52, 0.48, 1.25);
  const deerNeckGeo = new THREE.CylinderGeometry(0.13, 0.18, 0.62, 7);
  deerNeckGeo.translate(0, 0.25, 0);
  const deerHeadGeo = new THREE.BoxGeometry(0.24, 0.24, 0.44);
  deerHeadGeo.translate(0, 0.55, 0.14);
  const deerLegGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.78, 6);
  deerLegGeo.translate(0, -0.38, 0);
  const deerAntlerGeo = new THREE.CylinderGeometry(0.02, 0.035, 0.42, 5);
  deerAntlerGeo.translate(0, 0.82, 0.05);
  disposableGeometries.push(deerBodyGeo, deerNeckGeo, deerHeadGeo, deerLegGeo, deerAntlerGeo);

  interface AnimatedDeer {
    root: THREE.Group;
    bodyMesh: THREE.Mesh;
    neckPivot: THREE.Group;
    legs: [THREE.Mesh, THREE.Mesh, THREE.Mesh, THREE.Mesh];
    homeX: number;
    homeZ: number;
    orbitRadius: number;
    speed: number;
    phase: number;
    walkAngle: number;
  }

  const deerHerd: AnimatedDeer[] = [];
  const deerHomeSpots = [
    { x: -22, z: 22, r: 6.5, speed: 0.22 },
    { x: 26, z: 18, r: 7.0, speed: 0.24 },
    { x: -42, z: -10, r: 6.0, speed: 0.20 },
    { x: HUNTER_LODGE_POS.x - 12.5, z: HUNTER_LODGE_POS.z - 1.5, r: 1.8, speed: 0.12 }, // Horse/stag in rotated stable corral
    { x: 52, z: -28, r: 7.5, speed: 0.23 },
    { x: 18, z: 78, r: 8.5, speed: 0.22 },
  ];

  for (let i = 0; i < deerHomeSpots.length; i++) {
    const spot = deerHomeSpots[i];
    const root = new THREE.Group();

    const body = new THREE.Mesh(deerBodyGeo, deerCoatMat);
    body.position.set(0, 1.02, 0);
    body.castShadow = !isSoftwareGl;
    root.add(body);

    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 1.12, 0.52);
    const neck = new THREE.Mesh(deerNeckGeo, deerCoatMat);
    const head = new THREE.Mesh(deerHeadGeo, deerCoatMat);
    const antlerL = new THREE.Mesh(deerAntlerGeo, antlerMat);
    antlerL.position.x = 0.11;
    antlerL.rotation.z = -0.35;
    const antlerR = new THREE.Mesh(deerAntlerGeo, antlerMat);
    antlerR.position.x = -0.11;
    antlerR.rotation.z = 0.35;
    neckPivot.add(neck, head, antlerL, antlerR);
    root.add(neckPivot);

    const fl = new THREE.Mesh(deerLegGeo, deerCoatMat);
    fl.position.set(-0.18, 0.82, 0.44);
    const fr = new THREE.Mesh(deerLegGeo, deerCoatMat);
    fr.position.set(0.18, 0.82, 0.44);
    const bl = new THREE.Mesh(deerLegGeo, deerCoatMat);
    bl.position.set(-0.18, 0.82, -0.44);
    const br = new THREE.Mesh(deerLegGeo, deerCoatMat);
    br.position.set(0.18, 0.82, -0.44);
    root.add(fl, fr, bl, br);

    scene.add(root);
    deerHerd.push({
      root,
      bodyMesh: body,
      neckPivot,
      legs: [fl, fr, bl, br],
      homeX: spot.x,
      homeZ: spot.z,
      orbitRadius: spot.r,
      speed: spot.speed,
      phase: i * 1.35,
      walkAngle: i * 1.35,
    });
  }

  // --- 7B. 4 ANATOMICALLY SCULPTED MUSCULAR REALISTIC 3D HORSES (רכיבה על סוסים עם מקש [F]!) ---
  const horseBarrelGeo = new THREE.CapsuleGeometry(0.36, 0.94, 16, 24);
  horseBarrelGeo.rotateX(Math.PI / 2);
  const horseChestGeo = new THREE.SphereGeometry(0.38, 18, 16);
  horseChestGeo.scale(0.96, 1.12, 1.16);
  const horsePectoralGeo = new THREE.SphereGeometry(0.19, 14, 12);
  horsePectoralGeo.scale(0.88, 1.08, 1.25);
  const horseShoulderMuscleGeo = new THREE.SphereGeometry(0.24, 14, 12);
  horseShoulderMuscleGeo.scale(0.62, 1.28, 1.15);
  const horseCroupGeo = new THREE.SphereGeometry(0.39, 18, 16);
  horseCroupGeo.scale(0.98, 1.08, 1.18);
  const horseGluteMuscleGeo = new THREE.SphereGeometry(0.26, 14, 12);
  horseGluteMuscleGeo.scale(0.68, 1.22, 1.26);
  const horseWithersGeo = new THREE.SphereGeometry(0.29, 14, 12);
  horseWithersGeo.scale(0.84, 0.98, 1.38);

  const horseNeckGeo = new THREE.CylinderGeometry(0.15, 0.29, 0.9, 16);
  horseNeckGeo.translate(0, 0.39, 0.03);
  const horseNeckCrestGeo = new THREE.CapsuleGeometry(0.11, 0.62, 10, 14);
  const horseCraniumGeo = new THREE.SphereGeometry(0.168, 16, 14);
  horseCraniumGeo.scale(0.86, 0.92, 1.18);
  const horseJawCheekGeo = new THREE.SphereGeometry(0.105, 12, 10);
  horseJawCheekGeo.scale(0.55, 0.95, 1.05);
  const horseSnoutGeo = new THREE.CylinderGeometry(0.088, 0.145, 0.39, 14);
  horseSnoutGeo.rotateX(Math.PI / 2 + 0.14);
  const horseMuzzleGeo = new THREE.SphereGeometry(0.095, 14, 12);
  horseMuzzleGeo.scale(0.96, 0.88, 1.14);
  const horseEyeGeo = new THREE.SphereGeometry(0.026, 8, 8);
  const horseEarGeo = new THREE.ConeGeometry(0.044, 0.165, 8);
  const horseManeLockGeo = new THREE.CapsuleGeometry(0.042, 0.16, 6, 8);

  const horseTailUpperGeo = new THREE.CylinderGeometry(0.042, 0.085, 0.46, 10);
  horseTailUpperGeo.rotateX(0.32);
  horseTailUpperGeo.translate(0, -0.18, -0.06);
  const horseTailPlumeGeo = new THREE.ConeGeometry(0.095, 0.64, 10);
  horseTailPlumeGeo.rotateX(Math.PI + 0.18);
  horseTailPlumeGeo.translate(0, -0.58, -0.16);

  // 3-Segment Sculpted Muscular Equine Legs (Muscular Gaskin/Forearm + Knee/Hock Joint + Cannon + Fetlock/Pastern + Hoof)
  const horseUpperLegGeo = new THREE.CylinderGeometry(0.128, 0.076, 0.52, 14);
  horseUpperLegGeo.translate(0, -0.24, 0);
  const horseUpperMuscleBulgeGeo = new THREE.SphereGeometry(0.115, 12, 10);
  horseUpperMuscleBulgeGeo.scale(0.82, 1.45, 1.12);
  const horseJointSphereGeo = new THREE.SphereGeometry(0.076, 12, 10);
  const horseLowerLegGeo = new THREE.CylinderGeometry(0.066, 0.05, 0.46, 12);
  horseLowerLegGeo.translate(0, -0.22, 0);
  const horseHoofGeo = new THREE.CylinderGeometry(0.058, 0.076, 0.11, 12);
  horseHoofGeo.translate(0, -0.05, 0.018);

  // Sculpted Contoured Leather Saddle, Blanket, Pommel, Cantle & Stirrups
  const saddlePadGeo = new THREE.CylinderGeometry(0.382, 0.382, 0.78, 16, 1, false, -1.25, 2.5);
  saddlePadGeo.rotateZ(Math.PI / 2);
  saddlePadGeo.rotateY(Math.PI / 2);
  const saddleSeatGeo = new THREE.CapsuleGeometry(0.24, 0.34, 8, 12);
  saddleSeatGeo.rotateX(Math.PI / 2);
  saddleSeatGeo.scale(1.05, 0.42, 1.0);
  const saddlePommelGeo = new THREE.CapsuleGeometry(0.065, 0.24, 6, 10);
  saddlePommelGeo.rotateZ(Math.PI / 2);
  const stirrupStrapGeo = new THREE.BoxGeometry(0.025, 0.46, 0.045);
  const stirrupIronGeo = new THREE.TorusGeometry(0.055, 0.012, 6, 12);
  const hitchPostGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.35, 7);
  hitchPostGeo.translate(0, 0.67, 0);
  const horseHoofMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.42 });
  const horseEyeMat = new THREE.MeshStandardMaterial({ color: 0x0f0d0c, roughness: 0.14 });
  disposableMaterials.push(horseHoofMat, horseEyeMat);
  disposableGeometries.push(
    horseBarrelGeo,
    horseChestGeo,
    horsePectoralGeo,
    horseShoulderMuscleGeo,
    horseCroupGeo,
    horseGluteMuscleGeo,
    horseWithersGeo,
    horseNeckGeo,
    horseNeckCrestGeo,
    horseCraniumGeo,
    horseJawCheekGeo,
    horseSnoutGeo,
    horseMuzzleGeo,
    horseEyeGeo,
    horseEarGeo,
    horseManeLockGeo,
    horseTailUpperGeo,
    horseTailPlumeGeo,
    horseUpperLegGeo,
    horseUpperMuscleBulgeGeo,
    horseJointSphereGeo,
    horseLowerLegGeo,
    horseHoofGeo,
    saddlePadGeo,
    saddleSeatGeo,
    saddlePommelGeo,
    stirrupStrapGeo,
    stirrupIronGeo,
    hitchPostGeo
  );

  interface RideableHorseMeshHandle {
    id: string;
    root: THREE.Group;
    neckPivot: THREE.Group;
    headGroup: THREE.Group;
    tailPivot: THREE.Group;
    legs: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
    lowerLegs: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
    hooves: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
  }

  const rideableHorseHandles: RideableHorseMeshHandle[] = [];
  for (let hIdx = 0; hIdx < RIDEABLE_HORSES.length; hIdx++) {
    const hDef = RIDEABLE_HORSES[hIdx];
    const coatMat = new THREE.MeshStandardMaterial({
      color: hDef.coatColorHex,
      roughness: 0.36,
      metalness: 0.05,
    });
    const maneMat = new THREE.MeshStandardMaterial({
      color: hDef.maneColorHex,
      roughness: 0.72,
    });
    const saddleMat = new THREE.MeshStandardMaterial({
      color: hDef.saddleColorHex,
      roughness: 0.44,
    });
    disposableMaterials.push(coatMat, maneMat, saddleMat);

    // Hitching post at the horse's home spot
    const homeY = groundHeightAt(hDef.homeX, hDef.homeZ);
    const hitchGroup = new THREE.Group();
    hitchGroup.position.set(hDef.homeX + 1.15, homeY, hDef.homeZ + 0.85);
    const hPost1 = new THREE.Mesh(hitchPostGeo, barkMat);
    const hPost2 = new THREE.Mesh(hitchPostGeo, barkMat);
    hPost2.position.x = 1.35;
    const hCross = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.65, 6), timberMat);
    hCross.rotation.z = Math.PI / 2;
    hCross.position.set(0.67, 1.18, 0);
    hitchGroup.add(hPost1, hPost2, hCross);
    scene.add(hitchGroup);
    distanceCulledObjects.push({ obj: hitchGroup, cx: hDef.homeX, cz: hDef.homeZ, radius: 12 });

    const root = new THREE.Group();
    root.position.set(hDef.homeX, homeY, hDef.homeZ);
    root.rotation.y = hDef.homeYaw + Math.PI;

    // Smooth Anatomical Muscular Equine Torso: Ribcage Barrel + Sculpted Pectorals + Shoulder Deltoids + Withers + Gluteal Haunches
    const torso = new THREE.Mesh(horseBarrelGeo, coatMat);
    torso.position.set(0, 1.22, 0.0);
    torso.castShadow = !isSoftwareGl;
    const chest = new THREE.Mesh(horseChestGeo, coatMat);
    chest.position.set(0, 1.20, 0.52);
    const withers = new THREE.Mesh(horseWithersGeo, coatMat);
    withers.position.set(0, 1.45, 0.38);
    const croup = new THREE.Mesh(horseCroupGeo, coatMat);
    croup.position.set(0, 1.26, -0.54);
    root.add(torso, chest, withers, croup);

    // Sculpted Left/Right Pectoral, Shoulder Deltoid & Gluteal Haunch Muscle Groups
    for (const side of [-1, 1]) {
      const pec = new THREE.Mesh(horsePectoralGeo, coatMat);
      pec.position.set(side * 0.14, 1.12, 0.72);
      const deltoid = new THREE.Mesh(horseShoulderMuscleGeo, coatMat);
      deltoid.position.set(side * 0.25, 1.22, 0.48);
      deltoid.rotation.x = 0.28;
      deltoid.rotation.z = -side * 0.12;
      const glute = new THREE.Mesh(horseGluteMuscleGeo, coatMat);
      glute.position.set(side * 0.24, 1.24, -0.56);
      glute.rotation.x = -0.18;
      root.add(pec, deltoid, glute);
    }

    // Contoured Saddle Blanket, Leather Saddle Seat, Pommel, Cantle & Hanging Iron Stirrups
    const sPad = new THREE.Mesh(saddlePadGeo, saddleMat);
    sPad.position.set(0, 1.25, 0.0);
    const sSeat = new THREE.Mesh(saddleSeatGeo, furnitureWoodMat);
    sSeat.position.set(0, 1.56, -0.02);
    const sPommel = new THREE.Mesh(saddlePommelGeo, furnitureWoodMat);
    sPommel.position.set(0, 1.65, 0.24);
    const sCantle = new THREE.Mesh(saddlePommelGeo, furnitureWoodMat);
    sCantle.position.set(0, 1.66, -0.26);
    root.add(sPad, sSeat, sPommel, sCantle);

    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(stirrupStrapGeo, furnitureWoodMat);
      strap.position.set(side * 0.36, 1.30, 0.02);
      const iron = new THREE.Mesh(stirrupIronGeo, imperialGoldMat);
      iron.position.set(side * 0.37, 1.05, 0.02);
      iron.rotation.y = Math.PI / 2;
      root.add(strap, iron);
    }

    // Sculpted Arched Muscular Equine Neck, Crest, Head, Cheekbones, Snout, Muzzle, Eyes, Ears, Bridle & Flowing Mane
    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 1.32, 0.62);
    neckPivot.rotation.x = 0.34;
    const neckMesh = new THREE.Mesh(horseNeckGeo, coatMat);
    neckMesh.castShadow = !isSoftwareGl;
    const neckCrest = new THREE.Mesh(horseNeckCrestGeo, coatMat);
    neckCrest.position.set(0, 0.42, -0.06);
    neckCrest.rotation.x = -0.18;

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.78, 0.08);
    headGroup.rotation.x = -0.16;
    const cranium = new THREE.Mesh(horseCraniumGeo, coatMat);
    const snout = new THREE.Mesh(horseSnoutGeo, coatMat);
    snout.position.set(0, -0.06, 0.22);
    const muzzle = new THREE.Mesh(horseMuzzleGeo, horseHoofMat);
    muzzle.position.set(0, -0.11, 0.40);

    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(horseJawCheekGeo, coatMat);
      cheek.position.set(side * 0.095, -0.04, 0.02);
      headGroup.add(cheek);
    }

    // Glossy Equine Eyes on both sides of the head
    const eyeL = new THREE.Mesh(horseEyeGeo, horseEyeMat);
    eyeL.position.set(-0.125, 0.03, 0.08);
    const eyeR = new THREE.Mesh(horseEyeGeo, horseEyeMat);
    eyeR.position.set(0.125, 0.03, 0.08);

    // Pointed Equine Ears & Forelock
    const earL = new THREE.Mesh(horseEarGeo, coatMat);
    earL.position.set(-0.085, 0.19, -0.04);
    earL.rotation.set(0.18, 0, 0.18);
    const earR = new THREE.Mesh(horseEarGeo, coatMat);
    earR.position.set(0.085, 0.19, -0.04);
    earR.rotation.set(0.18, 0, -0.18);
    const forelock = new THREE.Mesh(horseManeLockGeo, maneMat);
    forelock.position.set(0, 0.13, 0.08);
    forelock.rotation.x = 0.65;

    // Leather Bridle Noseband, Headstall, Golden Bit Rings & Reins back to Saddle
    const noseband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.115, 0.045, 12),
      darkIronMat
    );
    noseband.rotation.x = Math.PI / 2 + 0.14;
    noseband.position.set(0, -0.08, 0.30);
    const bitRingL = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 6, 10), imperialGoldMat);
    bitRingL.rotation.y = Math.PI / 2;
    bitRingL.position.set(-0.10, -0.11, 0.33);
    const bitRingR = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 6, 10), imperialGoldMat);
    bitRingR.rotation.y = Math.PI / 2;
    bitRingR.position.set(0.10, -0.11, 0.33);

    headGroup.add(cranium, snout, muzzle, eyeL, eyeR, earL, earR, forelock, noseband, bitRingL, bitRingR);
    neckPivot.add(neckMesh, neckCrest, headGroup);

    // Layered Flowing Mane Locks along the crest of the neck
    for (let m = 0; m < 7; m++) {
      const lock = new THREE.Mesh(horseManeLockGeo, maneMat);
      lock.position.set(0, 0.10 + m * 0.11, -0.15 + m * 0.012);
      lock.rotation.x = -0.35;
      neckPivot.add(lock);
    }

    // Leather Reins connecting from the bridle bit back toward the saddle pommel
    for (const side of [-1, 1]) {
      const rein = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.72, 6), darkIronMat);
      rein.position.set(side * 0.13, 0.46, -0.02);
      rein.rotation.x = 0.82;
      neckPivot.add(rein);
    }
    root.add(neckPivot);

    // Multi-Part Flowing Equine Tail
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 1.34, -0.86);
    const tailUpper = new THREE.Mesh(horseTailUpperGeo, maneMat);
    const tailPlume = new THREE.Mesh(horseTailPlumeGeo, maneMat);
    tailPivot.add(tailUpper, tailPlume);
    root.add(tailPivot);

    // 4 Articulated 3-Segment Muscular Legs (Upper Forearm/Gaskin + Knee/Hock + Lower Cannon + Fetlock/Hoof Pivot)
    const buildArticulatedHorseLeg = (lx: number, lz: number, isHind: boolean) => {
      const upperPivot = new THREE.Group();
      upperPivot.position.set(lx, 1.02, lz);
      const upperMesh = new THREE.Mesh(horseUpperLegGeo, coatMat);
      upperMesh.castShadow = !isSoftwareGl;
      const muscleBulge = new THREE.Mesh(horseUpperMuscleBulgeGeo, coatMat);
      muscleBulge.position.set(0, -0.15, isHind ? -0.03 : 0.02);
      const jointMesh = new THREE.Mesh(horseJointSphereGeo, coatMat);
      jointMesh.position.set(0, -0.50, 0);

      const lowerPivot = new THREE.Group();
      lowerPivot.position.set(0, -0.50, 0);
      const lowerMesh = new THREE.Mesh(horseLowerLegGeo, coatMat);
      const fetlockMesh = new THREE.Mesh(horseJointSphereGeo, maneMat);
      fetlockMesh.scale.setScalar(0.76);
      fetlockMesh.position.set(0, -0.43, -0.01);

      const hoofPivot = new THREE.Group();
      hoofPivot.position.set(0, -0.43, 0);
      const hoofMesh = new THREE.Mesh(horseHoofGeo, horseHoofMat);
      hoofPivot.add(hoofMesh);

      lowerPivot.add(lowerMesh, fetlockMesh, hoofPivot);
      upperPivot.add(upperMesh, muscleBulge, jointMesh, lowerPivot);
      root.add(upperPivot);
      return { upperPivot, lowerPivot, hoofPivot };
    };

    const fl = buildArticulatedHorseLeg(-0.22, 0.58, false);
    const fr = buildArticulatedHorseLeg(0.22, 0.58, false);
    const bl = buildArticulatedHorseLeg(-0.23, -0.58, true);
    const br = buildArticulatedHorseLeg(0.23, -0.58, true);

    scene.add(root);
    rideableHorseHandles.push({
      id: hDef.id,
      root,
      neckPivot,
      headGroup,
      tailPivot,
      legs: [fl.upperPivot, fr.upperPivot, bl.upperPivot, br.upperPivot],
      lowerLegs: [fl.lowerPivot, fr.lowerPivot, bl.lowerPivot, br.lowerPivot],
      hooves: [fl.hoofPivot, fr.hoofPivot, bl.hoofPivot, br.hoofPivot],
    });
  }

  // --- 7C. GRAZING FLUFFY WHITE SHEEP FLOCK IN THE VALLEY PASTURES (עדר כבשים רועות) ---
  const sheepWoolMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f0,
    roughness: 0.92,
  });
  const sheepFaceMat = new THREE.MeshStandardMaterial({
    color: 0x292524,
    roughness: 0.82,
  });
  disposableMaterials.push(sheepWoolMat, sheepFaceMat);

  const sheepBodyGeo = new THREE.SphereGeometry(0.42, 8, 8);
  sheepBodyGeo.scale(0.95, 0.85, 1.35);
  const sheepHeadGeo = new THREE.BoxGeometry(0.22, 0.22, 0.34);
  sheepHeadGeo.translate(0, 0.08, 0.14);
  const sheepLegGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.42, 6);
  sheepLegGeo.translate(0, -0.21, 0);
  disposableGeometries.push(sheepBodyGeo, sheepHeadGeo, sheepLegGeo);

  interface GrazingSheep {
    root: THREE.Group;
    headPivot: THREE.Group;
    legs: [THREE.Mesh, THREE.Mesh, THREE.Mesh, THREE.Mesh];
    homeX: number;
    homeZ: number;
    orbitRadius: number;
    speed: number;
    phase: number;
  }

  const sheepFlock: GrazingSheep[] = [];
  const sheepSpots = [
    { x: -112, z: 142, r: 4.5, speed: 0.16 },
    { x: -108, z: 146, r: 5.2, speed: 0.14 },
    { x: -115, z: 148, r: 4.0, speed: 0.18 },
    { x: 24, z: 178, r: 5.0, speed: 0.15 },
    { x: 28, z: 182, r: 4.2, speed: 0.17 },
    { x: 21, z: 184, r: 4.8, speed: 0.14 },
    { x: 96, z: 34, r: 5.0, speed: 0.16 },
    { x: 92, z: 38, r: 4.4, speed: 0.15 },
  ];
  for (let s = 0; s < sheepSpots.length; s++) {
    const sp = sheepSpots[s];
    const sRoot = new THREE.Group();
    const fleece = new THREE.Mesh(sheepBodyGeo, sheepWoolMat);
    fleece.position.y = 0.56;
    sRoot.add(fleece);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.64, 0.46);
    const sHead = new THREE.Mesh(sheepHeadGeo, sheepFaceMat);
    headPivot.add(sHead);
    sRoot.add(headPivot);

    const sfl = new THREE.Mesh(sheepLegGeo, sheepFaceMat);
    sfl.position.set(-0.15, 0.42, 0.28);
    const sfr = new THREE.Mesh(sheepLegGeo, sheepFaceMat);
    sfr.position.set(0.15, 0.42, 0.28);
    const sbl = new THREE.Mesh(sheepLegGeo, sheepFaceMat);
    sbl.position.set(-0.15, 0.42, -0.28);
    const sbr = new THREE.Mesh(sheepLegGeo, sheepFaceMat);
    sbr.position.set(0.15, 0.42, -0.28);
    sRoot.add(sfl, sfr, sbl, sbr);

    scene.add(sRoot);
    sheepFlock.push({
      root: sRoot,
      headPivot,
      legs: [sfl, sfr, sbl, sbr],
      homeX: sp.x,
      homeZ: sp.z,
      orbitRadius: sp.r,
      speed: sp.speed,
      phase: s * 1.1,
    });
  }

  // --- 7D. SOARING WHITE COASTAL SEAGULLS ABOVE THE HARBOR & GALLEON SHIP ---
  const harborSeagullsGroup = new THREE.Group();
  const seagullMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.5,
  });
  const seagullWingGeo = new THREE.BoxGeometry(0.85, 0.04, 0.24);
  disposableMaterials.push(seagullMat);
  disposableGeometries.push(seagullWingGeo);
  for (let g = 0; g < 10; g++) {
    const gull = new THREE.Group();
    const lw = new THREE.Mesh(seagullWingGeo, seagullMat);
    lw.position.x = -0.38;
    const rw = new THREE.Mesh(seagullWingGeo, seagullMat);
    rw.position.x = 0.38;
    gull.add(lw, rw);
    gull.userData = {
      orbitRadius: 18 + (g % 4) * 9,
      orbitSpeed: 0.22 + (g % 3) * 0.05,
      phase: (g / 10) * Math.PI * 2,
      altitude: 19 + (g % 4) * 3.5,
    };
    harborSeagullsGroup.add(gull);
  }
  scene.add(harborSeagullsGroup);

  // --- FLUTTERING MEADOW BUTTERFLIES ---
  const butterfliesGroup = new THREE.Group();
  const bflyWingGeo = new THREE.PlaneGeometry(0.14, 0.18);
  disposableGeometries.push(bflyWingGeo);

  const bflyColors = [0xffb703, 0x38bdf8, 0xfb7185, 0xa7f3d0];
  const bflyMats = bflyColors.map((hex) => {
    const m = new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide });
    disposableMaterials.push(m);
    return m;
  });

  for (let i = 0; i < 16; i++) {
    const bfly = new THREE.Group();
    const mat = bflyMats[i % bflyMats.length];
    const wL = new THREE.Mesh(bflyWingGeo, mat);
    wL.position.x = -0.07;
    const wR = new THREE.Mesh(bflyWingGeo, mat);
    wR.position.x = 0.07;
    bfly.add(wL, wR);
    bfly.userData = {
      offsetX: (hash2D(i, 91) - 0.5) * 42,
      offsetZ: (hash2D(i, 97) - 0.5) * 42,
      phase: i * 0.9,
      speed: 0.9 + (i % 4) * 0.2,
    };
    butterfliesGroup.add(bfly);
  }
  scene.add(butterfliesGroup);

  // ============================================================================
  // 8. SWAYING MEADOW GRASS TUFTS & WATERSIDE REEDS (InstancedMesh)
  // ============================================================================
  const grassCount = isSoftwareGl ? 900 : 2200;
  const grassBladeGeo = new THREE.ConeGeometry(0.055, 0.26, 4);
  grassBladeGeo.translate(0, 0.13, 0);
  disposableGeometries.push(grassBladeGeo);

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x4b7d31,
    roughness: 0.75,
    metalness: 0.02,
  });
  attachWindSwayShader(grassMat, 0.05, 2.4, swayMaterials);
  disposableMaterials.push(grassMat);

  const grassInstanced = new THREE.InstancedMesh(grassBladeGeo, grassMat, grassCount);
  const gDummy = new THREE.Object3D();
  const gColor = new THREE.Color();
  let gIdx = 0;

  for (let i = 0; i < grassCount * 2 && gIdx < grassCount; i++) {
    const r1 = hash2D(i * 13, i * 29);
    const r2 = hash2D(i * 47 + 9, i * 71 - 3);
    const angle = r1 * Math.PI * 2;
    const dist = 6.0 + Math.sqrt(r2) * 220.0;
    const gx = Math.cos(angle) * dist;
    const gz = Math.sin(angle) * dist;

    const gy = groundHeightAt(gx, gz);
    if (gy < WATER_LEVEL + 0.12 || gy > 13.0) continue;
    if (trailFactorAt(gx, gz) > 0.28) continue;
    if (
      Math.abs(gx - SOUTHERN_MINE_POS.x) < 10.5 &&
      gz > SOUTHERN_MINE_POS.entranceZ - 8.0 &&
      gz < SOUTHERN_MINE_POS.entranceZ + 20.0
    )
      continue;

    const isShoreReed = gy < WATER_LEVEL + 0.42;
    gDummy.position.set(gx, gy - 0.02, gz);
    gDummy.rotation.set(0, r1 * Math.PI * 2, 0);
    if (isShoreReed) {
      gDummy.scale.set(0.75, 1.35 + r2 * 0.45, 0.75);
      gColor.setHex(0x5c7536);
    } else {
      gDummy.scale.set(0.85 + r1 * 0.45, 0.7 + r2 * 0.65, 0.85 + r1 * 0.45);
      gColor.setHSL(0.26 + (r1 - 0.5) * 0.06, 0.48, 0.38 + (r2 - 0.5) * 0.1);
    }
    gDummy.updateMatrix();
    grassInstanced.setMatrixAt(gIdx, gDummy.matrix);
    grassInstanced.setColorAt(gIdx, gColor);
    gIdx++;
  }
  grassInstanced.count = gIdx;
  grassInstanced.instanceMatrix.needsUpdate = true;
  if (grassInstanced.instanceColor) grassInstanced.instanceColor.needsUpdate = true;
  grassInstanced.computeBoundingSphere();
  scene.add(grassInstanced);

  // ============================================================================
  // 9. REAL MORNING MIST BANKS + NIGHT STARFIELD + 3D CLOUDS & FORCES OF NATURE
  // ============================================================================
  const mSize = 256;
  const mCanvas = document.createElement('canvas');
  mCanvas.width = mSize;
  mCanvas.height = mSize;
  const mCtx = mCanvas.getContext('2d')!;
  const mImg = mCtx.createImageData(mSize, mSize);
  for (let y = 0; y < mSize; y++) {
    for (let x = 0; x < mSize; x++) {
      const n = fbm2D(x * 0.03 + 7.1, y * 0.03 - 4.3, 4) * 0.5 + 0.5;
      const distCenter = Math.hypot(x - mSize / 2, y - mSize / 2) / (mSize / 2);
      const radialFade = Math.max(0, 1 - distCenter * distCenter);
      const alpha = Math.max(0, Math.min(1, (n - 0.35) * 1.8)) * radialFade;
      const idx = (y * mSize + x) * 4;
      mImg.data[idx] = 236;
      mImg.data[idx + 1] = 244;
      mImg.data[idx + 2] = 248;
      mImg.data[idx + 3] = Math.floor(alpha * 115);
    }
  }
  mCtx.putImageData(mImg, 0, 0);
  const mistTex = new THREE.CanvasTexture(mCanvas);
  mistTex.colorSpace = THREE.SRGBColorSpace;

  const mistGeo = new THREE.PlaneGeometry(380, 380, 1, 1);
  mistGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(mistGeo);

  const mistMat1 = new THREE.MeshBasicMaterial({
    map: mistTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mistMat2 = new THREE.MeshBasicMaterial({
    map: mistTex,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  mistMaterials.push(mistMat1, mistMat2);
  disposableMaterials.push(mistMat1, mistMat2);

  const mistLayer1 = new THREE.Mesh(mistGeo, mistMat1);
  mistLayer1.position.set(0, WATER_LEVEL + 0.85, 0);
  const mistLayer2 = new THREE.Mesh(mistGeo, mistMat2);
  mistLayer2.position.set(0, WATER_LEVEL + 2.35, 0);
  scene.add(mistLayer1, mistLayer2);

  // --- NIGHT STARFIELD DOME (900 Stars above Horizon) ---
  const starCount = 900;
  const starsGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = hash2D(i, 401);
    const v = hash2D(i, 409);
    const theta = u * Math.PI * 2;
    const phi = Math.acos(0.12 + v * 0.88);
    const rad = 215;
    starPositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = rad * Math.cos(phi);
    starPositions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  disposableGeometries.push(starsGeo);

  const starsMaterial = new THREE.PointsMaterial({
    color: 0xe8f1ff,
    size: 1.25,
    transparent: true,
    opacity: 0.0,
    fog: false,
    depthWrite: false,
  });
  disposableMaterials.push(starsMaterial);

  const starsPoints = new THREE.Points(starsGeo, starsMaterial);
  scene.add(starsPoints);

  // --- SOARING BIRDS FLOCK ---
  const birdsGroup = new THREE.Group();
  const birdMat = new THREE.MeshStandardMaterial({
    color: 0x24211e,
    roughness: 0.6,
  });
  disposableMaterials.push(birdMat);

  const wingGeo = new THREE.BoxGeometry(0.95, 0.04, 0.26);
  disposableGeometries.push(wingGeo);

  for (let b = 0; b < 16; b++) {
    const bird = new THREE.Group();
    const leftWing = new THREE.Mesh(wingGeo, birdMat);
    leftWing.position.set(-0.42, 0, 0);
    leftWing.rotation.z = 0.18;
    const rightWing = new THREE.Mesh(wingGeo, birdMat);
    rightWing.position.set(0.42, 0, 0);
    rightWing.rotation.z = -0.18;
    bird.add(leftWing, rightWing);
    bird.userData = {
      orbitRadius: 28 + (b % 5) * 18,
      orbitSpeed: 0.14 + (b % 3) * 0.03,
      phase: (b / 16) * Math.PI * 2,
      altitude: 26 + (b % 5) * 3.0,
    };
    birdsGroup.add(bird);
  }
  scene.add(birdsGroup);

  // --- SKY CLOUD LAYER + 3D VOLUMETRIC CUMULUS/STORM CLOUD CLUSTERS ---
  const cloudGeo = new THREE.PlaneGeometry(540, 540, 1, 1);
  cloudGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(cloudGeo);

  const cSize = 256;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = cSize;
  cCanvas.height = cSize;
  const cCtx = cCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(cSize, cSize);
  for (let y = 0; y < cSize; y++) {
    for (let x = 0; x < cSize; x++) {
      const n = fbm2D(x * 0.035 + 3.2, y * 0.035 - 1.7, 4) * 0.5 + 0.5;
      const distCenter = Math.hypot(x - cSize / 2, y - cSize / 2) / (cSize / 2);
      const edgeFade = Math.max(0, 1 - distCenter * distCenter);
      const alpha = Math.max(0, Math.min(1, (n - 0.42) * 2.4)) * edgeFade;
      const idx = (y * cSize + x) * 4;
      cImg.data[idx] = 255;
      cImg.data[idx + 1] = 252;
      cImg.data[idx + 2] = 246;
      cImg.data[idx + 3] = Math.floor(alpha * 155);
    }
  }
  cCtx.putImageData(cImg, 0, 0);
  const cloudTex = new THREE.CanvasTexture(cCanvas);
  cloudTex.colorSpace = THREE.SRGBColorSpace;
  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposableMaterials.push(cloudMat);
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  cloudMesh.position.set(0, 92, 0);
  scene.add(cloudMesh);

  // 3D Volumetric Multi-Puff Sky Clouds (Clearly visible drifting across the sky!)
  const volumetricCloudsGroup = new THREE.Group();
  const cloudPuffGeo = new THREE.DodecahedronGeometry(1.0, 1);
  cloudPuffGeo.scale(1.6, 0.62, 1.25);
  disposableGeometries.push(cloudPuffGeo);

  const volumetricCloudMat = new THREE.MeshStandardMaterial({
    color: 0xfbfaf7,
    roughness: 0.92,
    metalness: 0.0,
    transparent: true,
    opacity: 0.88,
  });
  disposableMaterials.push(volumetricCloudMat);

  for (let c = 0; c < 26; c++) {
    const cluster = new THREE.Group();
    const angle = (c / 26) * Math.PI * 2 + hash2D(c, 19) * 0.3;
    const dist = 35 + hash2D(c, 37) * 155;
    const baseAlt = 94 + (c % 5) * 5.5;
    cluster.userData = {
      baseX: Math.cos(angle) * dist,
      baseZ: Math.sin(angle) * dist,
      baseY: baseAlt,
      driftSpeed: 0.55 + (c % 4) * 0.16,
      scaleBase: 5.2 + (c % 4) * 1.5,
    };

    for (let p = 0; p < 4; p++) {
      const puff = new THREE.Mesh(cloudPuffGeo, volumetricCloudMat);
      puff.position.set(
        (p - 1.5) * 1.25,
        (p % 2) * 0.32,
        ((p * 7) % 3 - 1) * 0.65
      );
      const ps = 0.85 + ((p + c) % 3) * 0.25;
      puff.scale.setScalar(ps);
      cluster.add(puff);
    }
    cluster.scale.setScalar(cluster.userData.scaleBase);
    volumetricCloudsGroup.add(cluster);
  }
  scene.add(volumetricCloudsGroup);

  // --- FORCES OF NATURE PARTICLE SYSTEMS: RAIN, SNOW, SAND-WIND & LIGHTNING BOLT ---
  // 1) Regional Rain Streaks (LineSegments around player)
  const rainCount = isSoftwareGl ? 700 : 1300;
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    const rx = (hash2D(i, 501) - 0.5) * 90;
    const ry = hash2D(i, 509) * 36;
    const rz = (hash2D(i, 521) - 0.5) * 90;
    rainPositions[i * 6] = rx;
    rainPositions[i * 6 + 1] = ry;
    rainPositions[i * 6 + 2] = rz;
    rainPositions[i * 6 + 3] = rx + 0.22;
    rainPositions[i * 6 + 4] = ry - 1.35;
    rainPositions[i * 6 + 5] = rz + 0.1;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  disposableGeometries.push(rainGeo);

  const rainMat = new THREE.LineBasicMaterial({
    color: 0xa5d8ff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  disposableMaterials.push(rainMat);
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.visible = false;
  scene.add(rainLines);

  // 2) Mountain & Winter Snowflakes (Points around player)
  const snowCount = isSoftwareGl ? 800 : 1400;
  const snowGeo = new THREE.BufferGeometry();
  const snowPositions = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    snowPositions[i * 3] = (hash2D(i, 601) - 0.5) * 95;
    snowPositions[i * 3 + 1] = hash2D(i, 613) * 34;
    snowPositions[i * 3 + 2] = (hash2D(i, 619) - 0.5) * 95;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  disposableGeometries.push(snowGeo);

  const snowMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.24,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  disposableMaterials.push(snowMat);
  const snowPoints = new THREE.Points(snowGeo, snowMat);
  snowPoints.visible = false;
  scene.add(snowPoints);

  // 3) Strong Wind with Blowing Sand/Dust (Golden-tan particles streaking horizontally)
  const sandCount = isSoftwareGl ? 650 : 1100;
  const sandGeo = new THREE.BufferGeometry();
  const sandPositions = new Float32Array(sandCount * 3);
  for (let i = 0; i < sandCount; i++) {
    sandPositions[i * 3] = (hash2D(i, 701) - 0.5) * 90;
    sandPositions[i * 3 + 1] = 0.15 + hash2D(i, 709) * 7.5;
    sandPositions[i * 3 + 2] = (hash2D(i, 719) - 0.5) * 90;
  }
  sandGeo.setAttribute('position', new THREE.BufferAttribute(sandPositions, 3));
  disposableGeometries.push(sandGeo);

  const sandMat = new THREE.PointsMaterial({
    color: 0xd9b378,
    size: 0.22,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  disposableMaterials.push(sandMat);
  const sandPoints = new THREE.Points(sandGeo, sandMat);
  sandPoints.visible = false;
  scene.add(sandPoints);

  // 4) Sky-to-Ground Jagged Lightning Bolt Mesh for Lightning Storms
  const boltGeo = new THREE.BufferGeometry();
  const boltVerts: number[] = [];
  let bx = 0;
  let bz = 0;
  const segs = 14;
  for (let s = 0; s < segs; s++) {
    const y0 = 78 - (s / segs) * 76;
    const y1 = 78 - ((s + 1) / segs) * 76;
    const nx = bx + (hash2D(s, 809) - 0.5) * 6.5;
    const nz = bz + (hash2D(s, 821) - 0.5) * 6.5;
    boltVerts.push(bx, y0, bz, nx, y1, nz);
    // Side fork branch
    if (s % 3 === 1) {
      boltVerts.push(
        nx,
        y1,
        nz,
        nx + (hash2D(s, 829) - 0.5) * 12,
        y1 - 12,
        nz + (hash2D(s, 839) - 0.5) * 12
      );
    }
    bx = nx;
    bz = nz;
  }
  boltGeo.setAttribute('position', new THREE.Float32BufferAttribute(boltVerts, 3));
  disposableGeometries.push(boltGeo);

  const boltMat = new THREE.LineBasicMaterial({
    color: 0xe0f7ff,
    transparent: true,
    opacity: 0.0,
    fog: false,
  });
  disposableMaterials.push(boltMat);
  const lightningBoltLines = new THREE.LineSegments(boltGeo, boltMat);
  lightningBoltLines.visible = false;
  scene.add(lightningBoltLines);

  const pollenCount = 220;
  const pollenGeo = new THREE.BufferGeometry();
  const pollenPos = new Float32Array(pollenCount * 3);
  for (let i = 0; i < pollenCount; i++) {
    pollenPos[i * 3] = (hash2D(i, 1) - 0.5) * 120;
    pollenPos[i * 3 + 1] = 0.8 + hash2D(i, 2) * 7.5;
    pollenPos[i * 3 + 2] = (hash2D(i, 3) - 0.5) * 120;
  }
  pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
  disposableGeometries.push(pollenGeo);

  const pollenMat = new THREE.PointsMaterial({
    color: 0xfff2c2,
    size: 0.11,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  disposableMaterials.push(pollenMat);

  const pollenPoints = new THREE.Points(pollenGeo, pollenMat);
  scene.add(pollenPoints);

  // ============================================================================
  // 10. 3D ARCHERY BULLSEYE TARGET STANDS, 3D FEATHERED ARROWS &
  //     ARTICULATED 3D RANGER CHARACTER WITH PROPER RECURVE BOW GRIP
  // ============================================================================
  const { playerCharacterGroup, updatePlayerAndCombat } = buildPlayerAndCombatSystems({
    scene,
    furnitureWoodMat,
    disposableGeometries,
    disposableMaterials,
    distanceCulledObjects,
  });

  const wildlifeAndFootprintsLayer = buildWildlifeAndFootprintsLayer(scene);

  const cCloudWhite = new THREE.Color(0xfbfaf7);
  const cCloudStorm = new THREE.Color(0x283240);
  let lastCloudUpdateTime = 0;
  let accumCloudDrift = 0;
  let smoothCloudCov = 0.45;
  let smoothCloudDark = 0.1;
  let smoothWetness = 0.0;

  return {
    waterMaterial: waterMat,
    swayMaterials,
    rowboatGroup,
    birdsGroup,
    pollenPoints,
    starsMaterial,
    lanternLights,
    cloudMesh,
    mistMaterials,
    playerCharacterGroup,
    update: (
      elapsedTime: number,
      playerX: number,
      playerZ: number,
      morningMistOpacity: number,
      nightFactor = 0,
      weather?: WeatherStateSnapshot,
      openDoorIds?: ReadonlySet<string>,
      rideableHorses?: readonly RideableHorseState[],
      mountedHorseId?: string | null,
      playerState?: PlayerState,
      activeArrows?: readonly ArrowProjectile[],
      worldHours = 8.5,
      wildlifeSoundCallbacks?: {
        onBirdFlockStartled?: (distance: number, count: number) => void;
        onCritterScampered?: (distance: number, species: 'rabbit' | 'squirrel') => void;
        onAmbientWildlifeProximity?: (nearestBirdDist: number, nearestCritterDist: number) => void;
      }
    ) => {
      // 1. Distance-cull terrain chunks and landmarks to VIEW_DISTANCE
      for (let i = 0; i < distanceCulledObjects.length; i++) {
        const entry = distanceCulledObjects[i];
        entry.obj.visible = isWithinViewDistance(
          entry.cx,
          entry.cz,
          playerX,
          playerZ,
          entry.radius,
          VIEW_DISTANCE
        );
      }

      // 1B. Smoothly animate interactive double doors swinging on their hinges (skip when already settled)
      for (let i = 0; i < doorPivotHandles.length; i++) {
        const dh = doorPivotHandles[i];
        const isOpen = openDoorIds ? openDoorIds.has(dh.id) : false;
        const targetAngle = isOpen ? 1.52 : 0.0;
        if (Math.abs(targetAngle - dh.currentAngle) > 0.001) {
          dh.currentAngle += (targetAngle - dh.currentAngle) * 0.55;
          dh.leftPivot.rotation.y = dh.currentAngle;
          dh.rightPivot.rotation.y = -dh.currentAngle;
        }
      }

      // 2. Tree & boulder InstancedMeshes are pre-populated once at startup (zero per-frame GPU buffer uploads!)

      // 3. Keep water surface, stars dome, and sky clouds centered near player
      const dtCloud = Math.max(0, Math.min(0.1, elapsedTime - lastCloudUpdateTime));
      lastCloudUpdateTime = elapsedTime;

      const targetCloudDark = weather ? weather.cloudDarkness : 0.1;
      const targetCloudCov = weather ? weather.cloudCoverage : 0.45;
      const targetWetness = weather ? weather.wetness : 0.0;
      const windStr = weather ? weather.windStrength : 0.25;

      const blendRate = 1.0 - Math.exp(-1.5 * dtCloud);
      smoothCloudCov += (targetCloudCov - smoothCloudCov) * blendRate;
      smoothCloudDark += (targetCloudDark - smoothCloudDark) * blendRate;
      // Wetness builds up rapidly when raining or forced via toggle, and dries gradually when clear
      const wetRate = targetWetness > smoothWetness ? Math.min(1.0, dtCloud * 3.5 + 0.15) : 1.0 - Math.exp(-0.8 * dtCloud);
      smoothWetness += (targetWetness - smoothWetness) * wetRate;
      terrainMat.userData.uWetness.value = smoothWetness;
      terrainMat.userData.uTime.value = elapsedTime;
      accumCloudDrift += dtCloud * (0.42 + windStr * 0.28);

      waterMesh.position.x = Math.round(playerX / 16) * 16;
      // Clamp waterMesh Z <= -65 so the 420m water plane covers the central lake & northern river (z <= +145)
      // without ever reaching the Southern Underground Mine (z = 232..302, y = -9.35m)!
      waterMesh.position.z = Math.min(-65, Math.round(playerZ / 16) * 16);
      cloudMesh.position.x = playerX;
      cloudMesh.position.z = playerZ;
      cloudMesh.rotation.y = accumCloudDrift * 0.0025;

      cloudMat.opacity = Math.max(0.15, smoothCloudCov * (1.0 - nightFactor * 0.65));
      volumetricCloudMat.color.copy(cCloudWhite).lerp(cCloudStorm, Math.max(smoothCloudDark, nightFactor * 0.75));
      volumetricCloudMat.opacity = Math.min(0.92, 0.38 + smoothCloudCov * 0.5);

      const playerGroundY = groundHeightAt(playerX, playerZ);
      const vClouds = volumetricCloudsGroup.children;
      for (let i = 0; i < vClouds.length; i++) {
        const cl = vClouds[i];
        const ud = cl.userData;
        const span = 420;
        const driftX = (((ud.baseX + accumCloudDrift * ud.driftSpeed) % span) + span) % span - span * 0.5;
        cl.position.set(playerX + driftX, ud.baseY, playerZ + ud.baseZ);
      }

      starsPoints.position.set(playerX, 0, playerZ);
      starsPoints.rotation.y = elapsedTime * 0.0015;
      starsMaterial.opacity = nightFactor * (1.0 - smoothCloudDark * 0.7) * 0.92;
      starsPoints.visible = nightFactor > 0.02;

      for (let w = 0; w < animatedWaterMaterials.length; w++) {
        animatedWaterMaterials[w].userData.uTime.value = elapsedTime;
      }
      if (waterfallGroup.visible) {
        waterfallMat.userData.uTime.value = elapsedTime;
      }
      if (harborGroup.visible) {
        lighthouseBeaconGroup.rotation.y = elapsedTime * 0.65;
        shipGroup.rotation.z = Math.sin(elapsedTime * 1.1) * 0.012;
      }
      if (mineGroup.visible) {
        mineOreWheelGroup.rotation.z = elapsedTime * 0.85;
      }
      if (swOasisGroup.visible) {
        swAstrolabeGroup.rotation.y = elapsedTime * 0.55;
        astroMidRing.rotation.z = elapsedTime * 0.8;
        astroInnerRing.rotation.x = elapsedTime * 1.15;
      }

      const windScale = 0.8 + windStr * 2.4;
      for (let i = 0; i < swayMaterials.length; i++) {
        swayMaterials[i].userData.uTime.value = elapsedTime;
        if (swayMaterials[i].userData.uWindScale) {
          swayMaterials[i].userData.uWindScale.value = windScale;
        }
      }

      // 4. Update Weather Particle Systems (Rain & Snow are blocked by building roofs via getRoofHeightAt!)
      const rainAmt = weather ? weather.rainIntensity : 0;
      rainLines.visible = rainAmt > 0.02;
      if (rainLines.visible) {
        rainLines.position.set(playerX, playerGroundY, playerZ);
        rainMat.opacity = Math.min(0.75, rainAmt * 0.75);
        const rAttr = rainGeo.attributes.position as THREE.BufferAttribute;
        const fallStep = 1.15;
        const windShift = 0.16 * (1 + windStr);
        for (let i = 0; i < rainCount; i++) {
          let y0 = rAttr.getY(i * 2) - fallStep;
          let x0 = rAttr.getX(i * 2) + windShift;
          const z0 = rAttr.getZ(i * 2);
          if (y0 < 0) {
            y0 += 36;
            x0 = (hash2D(i, Math.floor(elapsedTime * 10)) - 0.5) * 90;
          }
          // Roof occlusion check: prevent rain from falling inside any roofed house, cabin, pavilion, or watchtower!
          const roofH = getRoofHeightAt(playerX + x0, playerZ + z0);
          if (roofH !== null) {
            const localRoofY = roofH - playerGroundY;
            if (y0 - 1.4 < localRoofY) {
              y0 = localRoofY + 1.5 + (Math.abs(y0) % 18);
            }
          }
          rAttr.setX(i * 2, x0);
          rAttr.setY(i * 2, y0);
          rAttr.setX(i * 2 + 1, x0 + windShift * 1.4);
          rAttr.setY(i * 2 + 1, y0 - 1.4);
        }
        rAttr.needsUpdate = true;
      }

      const snowAmt = weather ? weather.snowIntensity : 0;
      snowPoints.visible = snowAmt > 0.02;
      if (snowPoints.visible) {
        snowPoints.position.set(playerX, playerGroundY, playerZ);
        snowMat.opacity = Math.min(0.92, snowAmt * 0.92);
        const sAttr = snowGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < snowCount; i++) {
          let sy = sAttr.getY(i) - 0.18;
          let sx = sAttr.getX(i) + Math.sin(elapsedTime * 1.8 + i) * 0.05 + windStr * 0.06;
          const sz = sAttr.getZ(i);
          if (sy < 0) {
            sy += 34;
          }
          if (sx > 48) sx -= 96;
          const roofH = getRoofHeightAt(playerX + sx, playerZ + sz);
          if (roofH !== null) {
            const localRoofY = roofH - playerGroundY;
            if (sy < localRoofY) {
              sy = localRoofY + 0.8 + (Math.abs(sy) % 14);
            }
          }
          sAttr.setX(i, sx);
          sAttr.setY(i, sy);
        }
        sAttr.needsUpdate = true;
      }

      const sandAmt = weather ? weather.sandWindIntensity : 0;
      sandPoints.visible = sandAmt > 0.02;
      if (sandPoints.visible) {
        sandPoints.position.set(playerX, playerGroundY, playerZ);
        sandMat.opacity = Math.min(0.85, sandAmt * 0.85);
        const sdAttr = sandGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < sandCount; i++) {
          let sx = sdAttr.getX(i) + 0.95;
          let sy = sdAttr.getY(i) + Math.sin(elapsedTime * 5.0 + i) * 0.03;
          if (sx > 45) sx -= 90;
          if (sy < 0.15) sy = 0.15;
          if (sy > 7.5) sy = 1.5;
          sdAttr.setX(i, sx);
          sdAttr.setY(i, sy);
        }
        sdAttr.needsUpdate = true;
      }

      const flashAmt = weather ? weather.lightningFlash : 0;
      lightningBoltLines.visible = flashAmt > 0.12;
      if (lightningBoltLines.visible && weather) {
        lightningBoltLines.position.set(weather.boltOriginX, playerGroundY, weather.boltOriginZ);
        boltMat.opacity = Math.min(1.0, flashAmt * 1.2);
      }

      // 5. Rowboat gentle bobbing & Lakeside Swimming Golden Koi Fish (only update when within view distance)
      if (rowboatGroup.visible) {
        rowboatGroup.position.y = WATER_LEVEL + 0.04 + Math.sin(elapsedTime * 1.6) * 0.045;
        rowboatGroup.rotation.z = Math.sin(elapsedTime * 1.2) * 0.035;
        rowboatGroup.rotation.x = Math.cos(elapsedTime * 1.4) * 0.025;
      }
      if (westPierGroup.visible) {
        for (let k = 0; k < swimmingKoiList.length; k++) {
          const koi = swimmingKoiList[k];
          const kAng = elapsedTime * koi.speed + koi.phase;
          const kx = koi.orbitCenterX + Math.cos(kAng) * koi.orbitRadius;
          const kz = koi.orbitCenterZ + Math.sin(kAng) * koi.orbitRadius;
          koi.mesh.position.set(kx, WATER_LEVEL - 0.09, kz);
          koi.mesh.rotation.y = Math.atan2(-Math.sin(kAng), Math.cos(kAng)) + Math.sin(elapsedTime * 6.5 + k) * 0.12;
        }
      }

      // 6. Riverside Windmill rotors spinning (only update when the windmill is visible!)
      const rotorSpeed = 0.65 + windStr * 1.1;
      for (let i = 0; i < windmillRotors.length; i++) {
        if (windmillRotors[i].parent?.visible) {
          windmillRotors[i].rotation.z = elapsedTime * rotorSpeed + i;
        }
      }

      // 7. Grand Waterfall foam rings expanding (only when waterfall is visible)
      if (waterfallGroup.visible) {
        const fPhase1 = (elapsedTime * 0.65) % 1;
        const fPhase2 = (elapsedTime * 0.65 + 0.5) % 1;
        foamRing1.scale.setScalar(0.6 + fPhase1 * 1.65);
        foamRing2.scale.setScalar(0.6 + fPhase2 * 1.65);
      }

      const animalsSleepingAtNight = nightFactor > 0.5;

      // 8. Autonomous Multi-Tree Squirrels in the Orange Forest (fast early exit if player is far from Birch Grove!)
      const nearBirchGrove = isWithinViewDistance(
        158,
        118,
        playerX,
        playerZ,
        115,
        VIEW_DISTANCE
      );
      for (let i = 0; i < jumpingSquirrels.length; i++) {
        const sq = jumpingSquirrels[i];
        if (!nearBirchGrove) {
          sq.root.visible = false;
          continue;
        }
        const currTree = birches[sq.currentTreeIdx];
        const targTree = birches[sq.targetTreeIdx];
        const currTreeY = groundHeightAt(currTree.x, currTree.z);
        const targTreeY = groundHeightAt(targTree.x, targTree.z);

        const inRange = isWithinViewDistance(currTree.x, currTree.z, playerX, playerZ, 24, 140);
        if (!inRange) {
          sq.root.visible = false;
          continue;
        }

        if (animalsSleepingAtNight) {
          if (sq.state !== 'climb_to_sleep' && sq.state !== 'sleeping_in_crown') {
            sq.state = 'climb_to_sleep';
            sq.stateStartTime = elapsedTime;
            sq.stateDuration = 2.4;
          }
          if (sq.state === 'climb_to_sleep') {
            const p = Math.min(1.0, Math.max(0.0, (elapsedTime - sq.stateStartTime) / sq.stateDuration));
            if (p >= 1.0) {
              sq.state = 'sleeping_in_crown';
              sq.root.visible = false;
            } else {
              sq.root.visible = true;
              const ang = p * Math.PI * 1.5 + i;
              const sx = currTree.x + Math.cos(ang) * 0.28 * (1.0 - p * 0.5);
              const sz = currTree.z + Math.sin(ang) * 0.28 * (1.0 - p * 0.5);
              const sy = currTreeY + 5.2 + p * 4.4;
              sq.root.position.set(sx, sy, sz);
              sq.root.rotation.set(-0.85, -ang, 0);
              sq.root.scale.setScalar(1.25 * (1.0 - p * 0.85));
            }
          } else {
            sq.root.visible = false;
          }
          continue;
        }

        if (sq.state === 'sleeping_in_crown' || sq.state === 'climb_to_sleep') {
          sq.state = 'perched';
          sq.stateStartTime = elapsedTime;
          sq.stateDuration = 2.5 + (i % 4) * 1.2;
        }

        sq.root.visible = true;
        sq.root.scale.setScalar(1.25);

        const stateElapsed = elapsedTime - sq.stateStartTime;
        const p = Math.min(1.0, Math.max(0.0, stateElapsed / Math.max(0.1, sq.stateDuration)));

        if (sq.state === 'perched') {
          sq.root.position.set(currTree.x + 0.32, currTreeY + 5.4, currTree.z + 0.15);
          const headTurn = Math.sin(elapsedTime * 1.6 + i) * 0.42;
          sq.root.rotation.set(0, (i * 1.3) + headTurn, 0);
          sq.tailMesh.rotation.x = -0.65 + Math.sin(elapsedTime * 7.5 + i) * 0.18;

          if (p >= 1.0) {
            sq.decisionCounter += 1;
            const choice = hash2D(i * 23 + sq.decisionCounter, 107);
            if (choice < 0.56) {
              sq.targetTreeIdx = pickRandomNeighborBirch(sq.currentTreeIdx, sq.decisionCounter);
              sq.state = 'canopy_jump';
              sq.stateStartTime = elapsedTime;
              sq.stateDuration = 1.15;
            } else {
              sq.targetTreeIdx = pickRandomNeighborBirch(sq.currentTreeIdx, sq.decisionCounter + 5);
              sq.state = 'climb_down';
              sq.stateStartTime = elapsedTime;
              sq.stateDuration = 1.65;
            }
          }
        } else if (sq.state === 'canopy_jump') {
          const sx = currTree.x + (targTree.x - currTree.x) * p;
          const sz = currTree.z + (targTree.z - currTree.z) * p;
          const baseY = (currTreeY + 5.4) * (1.0 - p) + (targTreeY + 5.4) * p;
          const arcY = 4.0 * p * (1.0 - p) * 2.1;
          sq.root.position.set(sx, baseY + arcY, sz);
          const heading = Math.atan2(targTree.x - currTree.x, targTree.z - currTree.z);
          sq.root.rotation.set((0.5 - p) * 0.75, heading, 0);
          sq.tailMesh.rotation.x = -1.05 + Math.sin(elapsedTime * 20 + i) * 0.22;

          if (p >= 1.0) {
            sq.currentTreeIdx = sq.targetTreeIdx;
            sq.state = 'perched';
            sq.stateStartTime = elapsedTime;
            sq.stateDuration = 3.2 + hash2D(sq.decisionCounter, i + 19) * 4.5;
          }
        } else if (sq.state === 'climb_down') {
          const ang = p * Math.PI + i;
          const sx = currTree.x + Math.cos(ang) * 0.34;
          const sz = currTree.z + Math.sin(ang) * 0.34;
          const sy = currTreeY + 5.4 * (1.0 - p) + 0.22;
          sq.root.position.set(sx, sy, sz);
          sq.root.rotation.set(0.75, -ang, 0);
          sq.tailMesh.rotation.x = -0.5 + Math.sin(elapsedTime * 14 + i) * 0.25;

          if (p >= 1.0) {
            sq.state = 'ground_wander';
            sq.stateStartTime = elapsedTime;
            sq.stateDuration = 2.4;
            sq.wanderLegsRemaining = 2;
            sq.wanderStartX = currTree.x + 0.4;
            sq.wanderStartZ = currTree.z + 0.4;
            const wAngle = hash2D(sq.decisionCounter, i * 17) * Math.PI * 2;
            const wDist = 2.8 + hash2D(sq.decisionCounter + 3, i * 31) * 3.8;
            sq.wanderTargetX = currTree.x + Math.cos(wAngle) * wDist;
            sq.wanderTargetZ = currTree.z + Math.sin(wAngle) * wDist;
          }
        } else if (sq.state === 'ground_wander') {
          const sx = sq.wanderStartX + (sq.wanderTargetX - sq.wanderStartX) * p;
          const sz = sq.wanderStartZ + (sq.wanderTargetZ - sq.wanderStartZ) * p;
          const hop = Math.abs(Math.sin(p * Math.PI * 5)) * 0.15;
          const sy = groundHeightAt(sx, sz) + 0.12 + hop;
          sq.root.position.set(sx, sy, sz);
          const heading = Math.atan2(sq.wanderTargetX - sq.wanderStartX, sq.wanderTargetZ - sq.wanderStartZ);
          sq.root.rotation.set(0, heading, 0);
          sq.tailMesh.rotation.x = -0.95 + Math.sin(elapsedTime * 18 + i) * 0.2;

          if (p >= 1.0) {
            sq.wanderLegsRemaining -= 1;
            sq.decisionCounter += 1;
            if (sq.wanderLegsRemaining > 0) {
              sq.wanderStartX = sq.wanderTargetX;
              sq.wanderStartZ = sq.wanderTargetZ;
              sq.wanderTargetX = targTree.x;
              sq.wanderTargetZ = targTree.z;
              sq.stateStartTime = elapsedTime;
              sq.stateDuration = 2.3;
            } else {
              sq.currentTreeIdx = sq.targetTreeIdx;
              sq.state = 'climb_up';
              sq.stateStartTime = elapsedTime;
              sq.stateDuration = 1.65;
            }
          }
        } else if (sq.state === 'climb_up') {
          const ang = p * Math.PI + i;
          const sx = currTree.x + Math.cos(ang) * 0.34;
          const sz = currTree.z + Math.sin(ang) * 0.34;
          const sy = currTreeY + 0.22 + p * 5.2;
          sq.root.position.set(sx, sy, sz);
          sq.root.rotation.set(-0.75, -ang, 0);
          sq.tailMesh.rotation.x = -0.5 + Math.sin(elapsedTime * 16 + i) * 0.25;

          if (p >= 1.0) {
            sq.state = 'perched';
            sq.stateStartTime = elapsedTime;
            sq.stateDuration = 3.5 + hash2D(sq.decisionCounter, i + 43) * 4.5;
          }
        }
      }

      // 9. Articulated Forest Deer & Stable Horses (Only update when near the player!)
      for (let i = 0; i < deerHerd.length; i++) {
        const d = deerHerd[i];
        if (!isWithinViewDistance(d.homeX, d.homeZ, playerX, playerZ, 28, 150)) {
          d.root.visible = false;
          continue;
        }
        const cycle = (elapsedTime * 0.18 + d.phase) % (Math.PI * 2);
        const isGrazing = Math.sin(cycle * 2) > 0.45;
        if (!animalsSleepingAtNight && !isGrazing) {
          d.walkAngle = (d.walkAngle + dtCloud * d.speed) % (Math.PI * 2);
        }

        const dx = d.homeX + Math.cos(d.walkAngle) * d.orbitRadius;
        const dz = d.homeZ + Math.sin(d.walkAngle) * d.orbitRadius;
        d.root.visible = true;

        const dy = groundHeightAt(dx, dz);
        d.root.position.set(dx, dy, dz);
        d.root.rotation.y = Math.atan2(-Math.sin(d.walkAngle), Math.cos(d.walkAngle));

        if (animalsSleepingAtNight) {
          d.bodyMesh.position.y = 0.42;
          d.neckPivot.position.set(0, 0.52, 0.52);
          d.neckPivot.rotation.x = 0.92 + Math.sin(elapsedTime * 0.8 + i) * 0.03;
          for (const leg of d.legs) {
            leg.position.y = 0.25;
            leg.rotation.x = Math.PI / 2;
          }
          continue;
        }

        d.bodyMesh.position.y = 1.02;
        d.neckPivot.position.set(0, 1.12, 0.52);
        for (const leg of d.legs) {
          leg.position.y = 0.82;
        }

        if (isGrazing) {
          d.neckPivot.rotation.x = 0.85 + Math.sin(elapsedTime * 3.2 + i) * 0.08;
          for (const leg of d.legs) leg.rotation.x = 0;
        } else {
          d.neckPivot.rotation.x = 0.1 + Math.sin(elapsedTime * 2.2 + i) * 0.05;
          const swing = Math.sin(elapsedTime * 4.8 + i) * 0.36;
          d.legs[0].rotation.x = swing;
          d.legs[3].rotation.x = swing;
          d.legs[1].rotation.x = -swing;
          d.legs[2].rotation.x = -swing;
        }
      }

      // 10. Fluttering Butterflies (Only update when player is near the central lake/meadow!)
      const nearButterflies =
        !animalsSleepingAtNight && isWithinViewDistance(0, 0, playerX, playerZ, 45, 95);
      butterfliesGroup.visible = nearButterflies;
      if (nearButterflies) {
        const bflies = butterfliesGroup.children;
        for (let i = 0; i < bflies.length; i++) {
          const bf = bflies[i];
          const ud = bf.userData;
          const t = elapsedTime * ud.speed + ud.phase;
          const bx = ud.offsetX + Math.sin(t) * 4.5;
          const bz = ud.offsetZ + Math.cos(t * 0.8) * 4.5;
          const by = Math.max(
            WATER_LEVEL + 0.8,
            groundHeightAt(bx, bz) + 0.9 + Math.sin(t * 2.3) * 0.35
          );
          bf.position.set(bx, by, bz);
          bf.rotation.y = Math.atan2(Math.cos(t), -Math.sin(t * 0.8));
          const wingFlap = Math.sin(elapsedTime * 16 + ud.phase) * 0.65;
          bf.children[0].rotation.y = wingFlap;
          bf.children[1].rotation.y = -wingFlap;
        }
      }

      // 11. Morning mist banks & Dense Fog Weather Layer
      const fogWeatherAmt = weather ? weather.fogIntensity : 0;
      const effectiveMistOpacity = Math.max(morningMistOpacity, fogWeatherAmt);
      mistLayer1.visible = effectiveMistOpacity > 0.01;
      mistLayer2.visible = effectiveMistOpacity > 0.01;
      if (mistLayer1.visible) {
        mistLayer1.position.x = playerX + Math.sin(elapsedTime * 0.08) * 12;
        mistLayer1.position.y = fogWeatherAmt > 0.2 ? playerGroundY + 1.15 : WATER_LEVEL + 0.85;
        mistLayer1.position.z = playerZ + Math.cos(elapsedTime * 0.06) * 12;
        mistLayer1.rotation.y = elapsedTime * 0.012;
        mistMat1.opacity = effectiveMistOpacity * 0.65;

        mistLayer2.position.x = playerX - Math.cos(elapsedTime * 0.05) * 16;
        mistLayer2.position.y = fogWeatherAmt > 0.2 ? playerGroundY + 2.85 : WATER_LEVEL + 2.35;
        mistLayer2.position.z = playerZ + Math.sin(elapsedTime * 0.07) * 16;
        mistLayer2.rotation.y = -elapsedTime * 0.009;
        mistMat2.opacity = effectiveMistOpacity * 0.48;
      }

      // 11B. Animate the 4 Saddled Muscular Rideable Horses with Rational Biomechanical Gaits (4-beat walk, 2-beat trot, suspension gallop)
      if (rideableHorses) {
        for (let i = 0; i < rideableHorseHandles.length; i++) {
          const hMesh = rideableHorseHandles[i];
          const hState = rideableHorses[i];
          if (!hState) continue;
          const isMounted = mountedHorseId === hState.id;
          const vis = isMounted || isWithinViewDistance(hState.x, hState.z, playerX, playerZ, 12, 160);
          hMesh.root.visible = vis;
          if (!vis) continue;

          const pose = computeHorseBiomechanicalPose(hState.speed, hState.gaitPhase, elapsedTime, i);

          if (isMounted) {
            const fwdOffX = -Math.sin(hState.yaw) * 0.22;
            const fwdOffZ = -Math.cos(hState.yaw) * 0.22;
            hMesh.root.position.set(
              hState.x + fwdOffX,
              hState.y + pose.bodyLiftY,
              hState.z + fwdOffZ
            );
          } else {
            hMesh.root.position.set(hState.x, hState.y + pose.bodyLiftY, hState.z);
          }
          hMesh.root.rotation.y = hState.yaw + Math.PI;
          hMesh.root.rotation.x = pose.bodyPitch;

          hMesh.legs[0].rotation.x = pose.frontLeft.upperPitch;
          hMesh.legs[1].rotation.x = pose.frontRight.upperPitch;
          hMesh.legs[2].rotation.x = pose.backLeft.upperPitch;
          hMesh.legs[3].rotation.x = pose.backRight.upperPitch;

          hMesh.lowerLegs[0].rotation.x = pose.frontLeft.lowerPitch;
          hMesh.lowerLegs[1].rotation.x = pose.frontRight.lowerPitch;
          hMesh.lowerLegs[2].rotation.x = pose.backLeft.lowerPitch;
          hMesh.lowerLegs[3].rotation.x = pose.backRight.lowerPitch;

          hMesh.hooves[0].rotation.x = pose.frontLeft.hoofPitch;
          hMesh.hooves[1].rotation.x = pose.frontRight.hoofPitch;
          hMesh.hooves[2].rotation.x = pose.backLeft.hoofPitch;
          hMesh.hooves[3].rotation.x = pose.backRight.hoofPitch;

          hMesh.neckPivot.rotation.x = pose.neckPitch;
          hMesh.headGroup.rotation.x = pose.headPitch;
          hMesh.tailPivot.rotation.x = pose.tailPitch;
          hMesh.tailPivot.rotation.y = pose.tailSwayY;
        }
      }

      // Grazing Sheep Flock in the Valley Pastures
      for (let s = 0; s < sheepFlock.length; s++) {
        const sh = sheepFlock[s];
        const vis = isWithinViewDistance(sh.homeX, sh.homeZ, playerX, playerZ, 16, 135);
        sh.root.visible = vis;
        if (!vis) continue;
        const t = elapsedTime * sh.speed + sh.phase;
        const isGrazing = Math.sin(t * 3.0) > 0.1;
        const sx = sh.homeX + Math.cos(t) * sh.orbitRadius;
        const sz = sh.homeZ + Math.sin(t) * sh.orbitRadius;
        sh.root.position.set(sx, groundHeightAt(sx, sz), sz);
        sh.root.rotation.y = Math.atan2(-Math.sin(t), Math.cos(t));
        if (isGrazing) {
          sh.headPivot.rotation.x = 0.55 + Math.sin(elapsedTime * 4.5 + s) * 0.08;
          for (const leg of sh.legs) leg.rotation.x = 0;
        } else {
          sh.headPivot.rotation.x = 0.05;
          const sw = Math.sin(elapsedTime * 5.0 + s) * 0.28;
          sh.legs[0].rotation.x = sw;
          sh.legs[3].rotation.x = sw;
          sh.legs[1].rotation.x = -sw;
          sh.legs[2].rotation.x = -sw;
        }
      }

      // Coastal Harbor Seagulls wheeling above the Harbor Pier & Galleon Ship
      const nearHarborGulls = isWithinViewDistance(272, 252, playerX, playerZ, 65, 180);
      harborSeagullsGroup.visible = nearHarborGulls;
      if (nearHarborGulls) {
        const gulls = harborSeagullsGroup.children;
        for (let g = 0; g < gulls.length; g++) {
          const gull = gulls[g];
          const ud = gull.userData;
          const ang = elapsedTime * ud.orbitSpeed + ud.phase;
          const gx = 272 + Math.cos(ang) * ud.orbitRadius;
          const gz = 252 + Math.sin(ang) * ud.orbitRadius;
          gull.position.set(gx, ud.altitude + Math.sin(elapsedTime * 1.2 + ud.phase) * 1.4, gz);
          gull.rotation.y = -ang;
          const flap = Math.sin(elapsedTime * 6.0 + ud.phase * 2) * 0.26;
          gull.children[0].rotation.z = 0.12 + flap;
          gull.children[1].rotation.z = -0.12 - flap;
        }
      }

      // 11C. Animate the 8 LOTR-Style Dwarven Miners (Sunrise Caravan 06:00..07:36, Daytime Underground Mining 07:36..17:48, Sunset Caravan 17:48..19:30, Night Rest in Stone Houses)
      updateDwarvenMiners(worldHours, elapsedTime, playerX, playerZ);

      // 12. Reynolds Boids Bird Flocks, Proximity-Reactive Forest Animals, Fading Footprints/Hoofprints & Fireflies!
      birdsGroup.visible = false; // Replaced by dynamic Boids Bird Flocks in wildlifeAndFootprintsLayer
      if (playerState) {
        const daylightFactor = 1.0 - (nightFactor ?? 0);
        wildlifeAndFootprintsLayer.update(
          dtCloud,
          elapsedTime,
          playerState,
          rideableHorses ?? [],
          daylightFactor,
          wildlifeSoundCallbacks
        );
      }

      // 13. Articulated Flying Imperial Golden Sky Dragon (Only animate its 22 segments when within view distance!)
      const dTime = elapsedTime * 0.16;
      const dragonCenterX = Math.sin(dTime) * 78.0 + 22.0;
      const dragonCenterZ = -265.0 + Math.sin(dTime * 2.0) * 58.0;
      const dragonVis = isWithinViewDistance(
        dragonCenterX,
        dragonCenterZ,
        playerX,
        playerZ,
        90,
        VIEW_DISTANCE
      );
      skyDragonGroup.visible = dragonVis;
      if (dragonVis) {
        const dragonBaseY = 72.0 + FORTRESS_Y_OFFSET + Math.cos(dTime * 1.5) * 4.5;
        const dVelX = Math.cos(dTime) * 78.0 * 0.16;
        const dVelZ = Math.cos(dTime * 2.0) * 58.0 * 0.32;
        const dragonYaw = Math.atan2(dVelX, dVelZ);

        skyDragonGroup.position.set(dragonCenterX, dragonBaseY, dragonCenterZ);
        skyDragonGroup.rotation.y = dragonYaw;
        dragonHeadGroup.position.y = Math.sin(elapsedTime * 3.6) * 0.42;
        dragonHeadGroup.rotation.x = Math.cos(elapsedTime * 3.6) * 0.14;

        for (let s = 0; s < dragonSegments.length; s++) {
          const seg = dragonSegments[s];
          const wave = elapsedTime * 4.2 - (s + 1) * 0.42;
          seg.position.set(
            Math.sin(wave * 0.7) * 0.65,
            Math.sin(wave) * 0.78,
            -(s + 1) * 1.08
          );
          seg.rotation.x = Math.cos(wave) * 0.22;
          seg.rotation.y = Math.cos(wave * 0.7) * 0.18;
        }
      }

      // 14. Animated Shaolin / Tai-Chi Martial-Arts Monks (Only update when within 120m of the player!)
      for (let m = 0; m < martialMonks.length; m++) {
        const mk = martialMonks[m];
        const vis = isWithinViewDistance(mk.homeX, mk.homeZ, playerX, playerZ, 8, 125);
        mk.group.visible = vis;
        if (!vis) continue;
        const formT = elapsedTime * 1.85 + mk.phase;
        mk.group.position.y = mk.homeY + Math.abs(Math.sin(formT)) * 0.05;
        mk.group.rotation.y = mk.baseYaw + Math.sin(formT * 0.5) * 0.38;
        mk.leftArm.rotation.x = -0.65 + Math.sin(formT) * 0.75;
        mk.leftArm.rotation.z = 0.25 + Math.cos(formT * 0.7) * 0.25;
        mk.rightArm.rotation.x = -0.85 + Math.cos(formT) * 0.85;
        mk.rightArm.rotation.z = -0.25 + Math.sin(formT * 0.7) * 0.32;
        const legStance = Math.sin(formT * 0.5) * 0.26;
        mk.leftLeg.rotation.x = legStance;
        mk.rightLeg.rotation.x = -legStance;
      }

      // 15 & 16. Update Active 3D Feathered Arrow Projectiles + Fading Smoke Trails + 3rd/1st-Person Ranger & Combat Rigs!
      updatePlayerAndCombat(elapsedTime, playerState, activeArrows);
    },
    dispose: () => {
      birchBarkTex.dispose();
      cloudTex.dispose();
      mistTex.dispose();
      for (const g of disposableGeometries) g.dispose();
      for (const m of disposableMaterials) m.dispose();
    },
  };
}
