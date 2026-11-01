// ============================================================================
// MODULE: World / Builders / World Scene Builder
// DESIGN: Builder for the three.js renderer, scene, sky, lights and world geometry
// SUMMARY: Creates everything the world needs before the first frame: software-GL
//          detection, renderer, environment reflections, fog, camera, sky with sun disc,
//          lighting rig and the procedural world. dispose() frees GPU resources in order.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { createWorldTextures } from '../proceduralTextures';
import { buildRealisticWorld } from '../proceduralModels';
import { generateWorldObstacles } from '../terrainMath';
import type { ILogger } from '../../core/ILogger';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Renderer, scene graph and world handles shared by the frame loop. */
export interface IWorldScene {
  /** True for SwiftShader/llvmpipe-style rasterizers; disables shadows and antialiasing. */
  readonly isSoftwareGl: boolean;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly fog: THREE.FogExp2;
  readonly bgColor: THREE.Color;
  readonly camera: THREE.PerspectiveCamera;
  readonly sky: Sky;
  readonly sunDiscMesh: THREE.Mesh;
  readonly sunDiscMat: THREE.MeshBasicMaterial;
  readonly sunLight: THREE.DirectionalLight;
  readonly hemiLight: THREE.HemisphereLight;
  readonly obstacles: ReturnType<typeof generateWorldObstacles>;
  readonly worldHandles: ReturnType<typeof buildRealisticWorld>;
  /** Frees world, textures, sun disc, environment map and renderer, in that order. */
  dispose(): void;
}
// #endregion

// ======================== BUILDER ======================== \\
// #region Builder
/**
 * Summary: Builds the world scene and mounts the renderer canvas into `container`.
 * Design: Replaces the container's children with the canvas (one canvas per mount).
 */
export function createWorldScene(container: HTMLElement, logger: ILogger): IWorldScene {
  // 1. Software WebGL detection from GPU renderer string
  const isSoftwareGl = (() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  })();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.dataset.testid = 'world-canvas';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // 2. Scene & Studio RoomEnvironment Reflection
  const scene = new THREE.Scene();
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  pmremGenerator.dispose();

  const fog = new THREE.FogExp2(0xd8e3e8, 0.013);
  scene.fog = fog;
  const bgColor = new THREE.Color(0xd8e3e8);
  scene.background = bgColor;

  // 3. Camera (reasonable sight distance for optimal rendering)
  const camera = new THREE.PerspectiveCamera(
    68,
    (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
    0.12,
    250
  );

  // 4. Physical Sky & Sun/Moon Disc
  const sky = new Sky();
  sky.scale.setScalar(420);
  scene.add(sky);

  const sunDiscGeo = new THREE.SphereGeometry(5.5, 20, 20);
  const sunDiscMat = new THREE.MeshBasicMaterial({
    color: 0xfff7d6,
    fog: false,
  });
  const sunDiscMesh = new THREE.Mesh(sunDiscGeo, sunDiscMat);
  scene.add(sunDiscMesh);

  // 5. Balanced Outdoor Lighting Rig (Warm Sun / Silver Moon + Hemisphere Fill)
  const sunLight = new THREE.DirectionalLight(0xffcf87, 2.8);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  const shadowRange = 56;
  sunLight.shadow.camera.left = -shadowRange;
  sunLight.shadow.camera.right = shadowRange;
  sunLight.shadow.camera.top = shadowRange;
  sunLight.shadow.camera.bottom = -shadowRange;
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 195;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.025;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const hemiLight = new THREE.HemisphereLight(0x9ac0df, 0x524532, 0.85);
  hemiLight.position.set(0, 60, 0);
  scene.add(hemiLight);

  const rimLight = new THREE.DirectionalLight(0xa3c9e8, 0.42);
  rimLight.position.set(-40, 28, -40);
  scene.add(rimLight);

  // 6. Build Procedural Textures, Obstacles, and Composite 3D World
  const textures = createWorldTextures(renderer);
  const obstacles = generateWorldObstacles();
  const worldHandles = buildRealisticWorld(scene, textures, obstacles, isSoftwareGl, logger);

  return {
    isSoftwareGl,
    renderer,
    scene,
    fog,
    bgColor,
    camera,
    sky,
    sunDiscMesh,
    sunDiscMat,
    sunLight,
    hemiLight,
    obstacles,
    worldHandles,
    dispose() {
      worldHandles.dispose();
      textures.dispose();
      sunDiscGeo.dispose();
      sunDiscMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    },
  };
}
// #endregion
