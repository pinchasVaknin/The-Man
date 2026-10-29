// ============================================================================
// MODULE: Lab / 3D Studio Viewport Canvas
// DESIGN: Self-contained Three.js Studio Stage with Orbit Camera & Paced Loop
// SUMMARY: Renders the selected entity on a sculpted museum pedestal with
//          interactive orbit/zoom camera controls, lighting presets, and
//          real-time animation playback.
// ============================================================================

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  computeLabAnimationCycleProgress,
  type ILabAnimationDef,
  type ILabEntityDef,
  type ILabPoseOverrides,
  type ILabSkinDef,
  type LabCameraPreset,
  type LabStageEnvironment,
} from './labCatalog';
import { buildLabEntityRig, type ILabEntityRig } from './labModelFactory';

export interface ICharacterLabCanvasProps {
  readonly entity: ILabEntityDef;
  readonly animation: ILabAnimationDef;
  readonly skin: ILabSkinDef;
  readonly poseOverrides: ILabPoseOverrides;
  readonly playbackSpeed: number;
  readonly isPaused: boolean;
  readonly manualPhase: number;
  readonly autoTurntable: boolean;
  readonly showWireframe: boolean;
  readonly showFloorGrid: boolean;
  readonly showHeightRuler: boolean;
  readonly stageEnvironment: LabStageEnvironment;
  readonly cameraPreset: LabCameraPreset;
  readonly cameraResetNonce: number;
  readonly snapshotTriggerNonce: number;
  readonly onRigStatsChange?: (stats: { meshCount: number; triangleCount: number }) => void;
  readonly onLivePhaseUpdate?: (phase: number) => void;
}

export const CharacterLabCanvas: React.FC<ICharacterLabCanvasProps> = ({
  entity,
  animation,
  skin,
  poseOverrides,
  playbackSpeed,
  isPaused,
  manualPhase,
  autoTurntable,
  showWireframe,
  showFloorGrid,
  showHeightRuler,
  stageEnvironment,
  cameraPreset,
  cameraResetNonce,
  snapshotTriggerNonce,
  onRigStatsChange,
  onLivePhaseUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Refs for live props read inside the animation loop without recreating WebGL context
  const stateRef = useRef({
    entity,
    animation,
    skin,
    poseOverrides,
    playbackSpeed,
    isPaused,
    manualPhase,
    autoTurntable,
    showWireframe,
    showFloorGrid,
    showHeightRuler,
    stageEnvironment,
  });
  stateRef.current = {
    entity,
    animation,
    skin,
    poseOverrides,
    playbackSpeed,
    isPaused,
    manualPhase,
    autoTurntable,
    showWireframe,
    showFloorGrid,
    showHeightRuler,
    stageEnvironment,
  };

  const orbitRef = useRef({
    theta: 0.55,
    phi: 0.24,
    distance: entity.defaultCameraDistance,
    targetY: entity.defaultCameraTargetY,
    turntableAngle: 0,
  });

  const rigRef = useRef<ILabEntityRig | null>(null);
  const sceneObjectsRef = useRef<{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    pedestalGroup: THREE.Group;
    rulerGroup: THREE.Group;
    gridHelper: THREE.GridHelper;
    hemiLight: THREE.HemisphereLight;
    keyLight: THREE.DirectionalLight;
    rimLight: THREE.DirectionalLight;
    pedestalRingMat: THREE.MeshStandardMaterial;
    renderNow: () => void;
  } | null>(null);

  // Apply Camera Preset or Entity Camera framing when entity / preset changes
  useEffect(() => {
    const baseDist = entity.defaultCameraDistance;
    const baseTargetY = entity.defaultCameraTargetY;

    if (cameraPreset === 'front') {
      orbitRef.current.theta = 0;
      orbitRef.current.phi = 0.16;
      orbitRef.current.distance = baseDist;
      orbitRef.current.targetY = baseTargetY;
    } else if (cameraPreset === 'angle') {
      orbitRef.current.theta = 0.58;
      orbitRef.current.phi = 0.24;
      orbitRef.current.distance = baseDist;
      orbitRef.current.targetY = baseTargetY;
    } else if (cameraPreset === 'side') {
      orbitRef.current.theta = Math.PI / 2;
      orbitRef.current.phi = 0.18;
      orbitRef.current.distance = baseDist;
      orbitRef.current.targetY = baseTargetY;
    } else if (cameraPreset === 'back') {
      orbitRef.current.theta = Math.PI;
      orbitRef.current.phi = 0.2;
      orbitRef.current.distance = baseDist;
      orbitRef.current.targetY = baseTargetY;
    } else if (cameraPreset === 'closeup') {
      orbitRef.current.theta = 0.28;
      orbitRef.current.phi = 0.14;
      orbitRef.current.distance = Math.max(1.2, baseDist * 0.62);
      orbitRef.current.targetY = baseTargetY * 1.18;
    }
    sceneObjectsRef.current?.renderNow();
  }, [entity.id, entity.defaultCameraDistance, entity.defaultCameraTargetY, cameraPreset, cameraResetNonce]);

  // Rebuild 3D entity rig when entity.id changes
  useEffect(() => {
    const objs = sceneObjectsRef.current;
    if (!objs) return;

    if (rigRef.current) {
      objs.pedestalGroup.remove(rigRef.current.root);
      rigRef.current.dispose();
      rigRef.current = null;
    }

    const newRig = buildLabEntityRig(entity.id, skin);
    newRig.setWireframe(showWireframe);
    newRig.applyAnimation(animation.id, 0, 0, poseOverrides);
    objs.pedestalGroup.add(newRig.root);
    rigRef.current = newRig;
    orbitRef.current.turntableAngle = 0;
    objs.pedestalGroup.rotation.y = 0;
    onRigStatsChange?.(newRig.stats);
    objs.renderNow();
  }, [entity.id]);

  // Apply skin updates dynamically
  useEffect(() => {
    rigRef.current?.applySkin(skin);
    sceneObjectsRef.current?.renderNow();
  }, [skin]);

  // Apply animation selection changes immediately
  useEffect(() => {
    if (animation.id === 'none') {
      rigRef.current?.applyAnimation('none', 0, 0, poseOverrides);
      sceneObjectsRef.current?.renderNow();
    }
  }, [animation.id]);

  // Apply pose overrides immediately (e.g., sword rotation, limb tweaks, amplitude)
  useEffect(() => {
    const s = stateRef.current;
    const cycleProg = computeLabAnimationCycleProgress(
      s.animation,
      0,
      s.playbackSpeed,
      s.isPaused,
      s.manualPhase
    );
    rigRef.current?.applyAnimation(s.animation.id, 0, cycleProg, poseOverrides);
    sceneObjectsRef.current?.renderNow();
  }, [poseOverrides]);

  // Apply wireframe updates dynamically
  useEffect(() => {
    rigRef.current?.setWireframe(showWireframe);
    sceneObjectsRef.current?.renderNow();
  }, [showWireframe]);

  // Apply floor grid visibility
  useEffect(() => {
    if (sceneObjectsRef.current) {
      sceneObjectsRef.current.gridHelper.visible = showFloorGrid;
      sceneObjectsRef.current.renderNow();
    }
  }, [showFloorGrid]);

  // Apply 3D height reference ruler visibility
  useEffect(() => {
    if (sceneObjectsRef.current) {
      sceneObjectsRef.current.rulerGroup.visible = showHeightRuler;
      sceneObjectsRef.current.renderNow();
    }
  }, [showHeightRuler]);

  // Trigger PNG snapshot download when requested
  useEffect(() => {
    if (snapshotTriggerNonce <= 0) return;
    const objs = sceneObjectsRef.current;
    if (!objs) return;
    objs.renderNow();
    try {
      const dataUrl = objs.renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${entity.id}_${skin.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Ignore security/canvas export errors
    }
  }, [snapshotTriggerNonce]);

  // Apply stage environment lighting preset
  useEffect(() => {
    const objs = sceneObjectsRef.current;
    if (!objs) return;
    if (stageEnvironment === 'studio_day') {
      objs.scene.background = new THREE.Color(0x13161c);
      objs.scene.fog = new THREE.FogExp2(0x13161c, 0.045);
      objs.hemiLight.color.setHex(0xfff7ed);
      objs.hemiLight.groundColor.setHex(0x1e293b);
      objs.hemiLight.intensity = 0.95;
      objs.keyLight.color.setHex(0xfff1dc);
      objs.keyLight.intensity = 2.6;
      objs.rimLight.color.setHex(0x38bdf8);
      objs.rimLight.intensity = 1.45;
      objs.pedestalRingMat.color.setHex(0xf59e0b);
      objs.pedestalRingMat.emissive.setHex(0xd97706);
    } else if (stageEnvironment === 'golden_sunset') {
      objs.scene.background = new THREE.Color(0x1c1210);
      objs.scene.fog = new THREE.FogExp2(0x1c1210, 0.045);
      objs.hemiLight.color.setHex(0xfed7aa);
      objs.hemiLight.groundColor.setHex(0x3b1812);
      objs.hemiLight.intensity = 0.85;
      objs.keyLight.color.setHex(0xfb923c);
      objs.keyLight.intensity = 3.0;
      objs.rimLight.color.setHex(0xfacc15);
      objs.rimLight.intensity = 1.65;
      objs.pedestalRingMat.color.setHex(0xf97316);
      objs.pedestalRingMat.emissive.setHex(0xea580c);
    } else {
      objs.scene.background = new THREE.Color(0x090d16);
      objs.scene.fog = new THREE.FogExp2(0x090d16, 0.048);
      objs.hemiLight.color.setHex(0x93c5fd);
      objs.hemiLight.groundColor.setHex(0x0f172a);
      objs.hemiLight.intensity = 0.65;
      objs.keyLight.color.setHex(0x60a5fa);
      objs.keyLight.intensity = 2.1;
      objs.rimLight.color.setHex(0xc084fc);
      objs.rimLight.intensity = 1.8;
      objs.pedestalRingMat.color.setHex(0x38bdf8);
      objs.pedestalRingMat.emissive.setHex(0x0284c7);
    }
    objs.renderNow();
  }, [stageEnvironment]);

  // Main Three.js Setup & Paced Animation Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    const gl = renderer.getContext();
    const rendererInfo = String(gl.getParameter(gl.RENDERER) || '');
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software/i.test(rendererInfo);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x13161c);
    scene.fog = new THREE.FogExp2(0x13161c, 0.045);

    let envTex: THREE.Texture | null = null;
    if (!isSoftwareGl) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      envTex = pmremGenerator.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTex;
      roomEnv.dispose();
      pmremGenerator.dispose();
    }

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);

    // 3-Point Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x1e293b, 1.15);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.6);
    keyLight.position.set(4.5, 7.5, 5.5);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.45);
    rimLight.position.set(-5.0, 4.5, -5.0);
    scene.add(rimLight);

    // Sculpted Studio Pedestal & Contact Shadow
    const pedestalGroup = new THREE.Group();
    const baseDiscGeo = new THREE.CylinderGeometry(1.75, 1.95, 0.16, 48);
    baseDiscGeo.translate(0, -0.08, 0);
    const baseDiscMat = new THREE.MeshStandardMaterial({
      color: 0x1e232d,
      roughness: 0.45,
      metalness: 0.35,
    });
    const baseDisc = new THREE.Mesh(baseDiscGeo, baseDiscMat);
    baseDisc.receiveShadow = !isSoftwareGl;

    const pedestalRingGeo = new THREE.TorusGeometry(1.76, 0.028, 12, 64);
    pedestalRingGeo.rotateX(Math.PI / 2);
    const pedestalRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.8,
    });
    const pedestalRing = new THREE.Mesh(pedestalRingGeo, pedestalRingMat);
    pedestalRing.position.y = -0.01;

    // Soft radial contact shadow on top of pedestal
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowPlaneGeo = new THREE.PlaneGeometry(2.4, 2.4);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.position.y = 0.005;

    // 3D Studio Height Reference Ruler (0.5m, 1.0m, 1.5m, 2.0m)
    const rulerGroup = new THREE.Group();
    rulerGroup.position.set(-1.12, 0, -0.25);
    rulerGroup.visible = stateRef.current.showHeightRuler;

    const rulerPoleMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.7,
    });
    const rulerPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 2.2, 10),
      rulerPoleMat
    );
    rulerPole.position.y = 1.1;
    rulerGroup.add(rulerPole);

    const makeRulerTick = (heightMeters: number, labelText: string) => {
      const tickGroup = new THREE.Group();
      tickGroup.position.y = heightMeters;

      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.014, 0.014),
        rulerPoleMat
      );
      bar.position.x = 0.14;
      tickGroup.add(bar);

      const lblCanvas = document.createElement('canvas');
      lblCanvas.width = 128;
      lblCanvas.height = 48;
      const lCtx = lblCanvas.getContext('2d')!;
      lCtx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      lCtx.fillRect(4, 4, 120, 40);
      lCtx.strokeStyle = '#f59e0b';
      lCtx.lineWidth = 3;
      lCtx.strokeRect(4, 4, 120, 40);
      lCtx.fillStyle = '#fef3c7';
      lCtx.font = 'bold 24px monospace';
      lCtx.textAlign = 'center';
      lCtx.textBaseline = 'middle';
      lCtx.fillText(labelText, 64, 25);

      const lblTex = new THREE.CanvasTexture(lblCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: lblTex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.34, 0.13, 1);
      sprite.position.set(-0.22, 0, 0);
      tickGroup.add(sprite);
      return tickGroup;
    };

    rulerGroup.add(
      makeRulerTick(0.5, '0.5m'),
      makeRulerTick(1.0, '1.0m'),
      makeRulerTick(1.5, '1.5m'),
      makeRulerTick(2.0, '2.0m')
    );

    pedestalGroup.add(baseDisc, pedestalRing, shadowPlane, rulerGroup);
    scene.add(pedestalGroup);

    const gridHelper = new THREE.GridHelper(18, 18, 0x334155, 0x1e293b);
    gridHelper.position.y = -0.16;
    gridHelper.visible = stateRef.current.showFloorGrid;
    scene.add(gridHelper);

    const renderNow = () => {
      const { theta, phi, distance, targetY } = orbitRef.current;
      const cosPhi = Math.cos(phi);
      const camX = Math.sin(theta) * cosPhi * distance;
      const camY = targetY + Math.sin(phi) * distance;
      const camZ = Math.cos(theta) * cosPhi * distance;
      camera.position.set(camX, Math.max(0.15, camY), camZ);
      camera.lookAt(0, targetY, 0);
      renderer.render(scene, camera);
    };

    sceneObjectsRef.current = {
      scene,
      renderer,
      pedestalGroup,
      rulerGroup,
      gridHelper,
      hemiLight,
      keyLight,
      rimLight,
      pedestalRingMat,
      renderNow,
    };

    // Build initial entity rig
    const initialRig = buildLabEntityRig(
      stateRef.current.entity.id,
      stateRef.current.skin
    );
    initialRig.setWireframe(stateRef.current.showWireframe);
    initialRig.applyAnimation(
      stateRef.current.animation.id,
      0,
      0,
      stateRef.current.poseOverrides
    );
    pedestalGroup.add(initialRig.root);
    rigRef.current = initialRig;
    onRigStatsChange?.(initialRig.stats);
    renderNow();

    // Orbit & Zoom Pointer Controls
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      orbitRef.current.theta -= dx * 0.0075;
      orbitRef.current.phi = Math.max(
        -0.15,
        Math.min(1.25, orbitRef.current.phi + dy * 0.0065)
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      renderer.domElement.releasePointerCapture?.(e.pointerId);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRef.current.distance = Math.max(
        1.1,
        Math.min(11.0, orbitRef.current.distance + e.deltaY * 0.003)
      );
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    // Paced Animation Loop (Software WebGL Safe)
    let frameTimerId = 0;
    let isDisposed = false;
    let lastTime = performance.now();
    let elapsedSec = 0;
    let lastPhaseEmit = 0;

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl2 = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl2.fenceSync ? gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl2.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl2.getSyncParameter(sync, gl2.SYNC_STATUS);
        if (state === gl2.UNSIGNALED) {
          frameTimerId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl2.deleteSync(sync);
          frameTimerId = window.setTimeout(cb, isSoftwareGl ? 80 : 16);
        }
      };
      frameTimerId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.15);
      lastTime = now;

      const s = stateRef.current;
      if (!s.isPaused && s.animation.id !== 'none') {
        elapsedSec += dt;
      }

      if (s.autoTurntable) {
        orbitRef.current.turntableAngle += dt * 0.55;
      }
      pedestalGroup.rotation.y = orbitRef.current.turntableAngle;

      const cycleProg = computeLabAnimationCycleProgress(
        s.animation,
        elapsedSec,
        s.playbackSpeed,
        s.isPaused,
        s.manualPhase
      );

      rigRef.current?.applyAnimation(s.animation.id, elapsedSec, cycleProg, s.poseOverrides);

      if (onLivePhaseUpdate && !s.isPaused && now - lastPhaseEmit > 120) {
        lastPhaseEmit = now;
        onLivePhaseUpdate(cycleProg);
      }

      // Compute Camera Orbit Position
      const { theta, phi, distance, targetY } = orbitRef.current;
      const cosPhi = Math.cos(phi);
      const camX = Math.sin(theta) * cosPhi * distance;
      const camY = targetY + Math.sin(phi) * distance;
      const camZ = Math.cos(theta) * cosPhi * distance;
      camera.position.set(camX, Math.max(0.15, camY), camZ);
      camera.lookAt(0, targetY, 0);

      renderer.render(scene, camera);
      afterDraw(tick);
    }

    tick();

    return () => {
      isDisposed = true;
      window.clearTimeout(frameTimerId);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);

      rigRef.current?.dispose();
      rigRef.current = null;
      baseDiscGeo.dispose();
      baseDiscMat.dispose();
      pedestalRingGeo.dispose();
      pedestalRingMat.dispose();
      shadowPlaneGeo.dispose();
      shadowPlaneMat.dispose();
      shadowTex.dispose();
      envTex?.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="lab-webgl-container"
      className="w-full h-full cursor-grab active:cursor-grabbing"
    />
  );
};
