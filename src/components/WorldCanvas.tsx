import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import {
  BiomeType,
  WalkPaceMode,
  WeatherKind,
  WeatherCycleMode,
  WeatherToggleOption,
  WeatherStateSnapshot,
  CameraPerspectiveMode,
  EquippedToolSlot,
  ArrowElementKind,
  InventoryItemId,
  CharacterSkillsState,
  ArrowProjectile,
  ARCHERY_TARGETS,
  DEFAULT_WEATHER_CYCLE_MODE,
  PLAYER_EYE_HEIGHT,
  generateWorldObstacles,
  createInitialPlayerState,
  equipInventoryItem,
  assignHotbarSlot,
  toggleFavoriteItem,
  createInitialRideableHorses,
  findNearestRideableHorse,
  stepPlayerPhysics,
  awardSkillXp,
  spawnArrowProjectile,
  stepArrowsPhysics,
  computeDynamicSolarCycle,
  computeWeatherState,
  walkableHeightAt,
  isPositionUnderRoof,
  findNearestFortressDoor,
  findNearestMarketStall,
  findLookedAtWatchtowerLadder,
  triggerSwordSlash,
  stepSwordSwingCombat,
  computeFirstPersonSwordAttackPose,
} from '../world/terrainMath';
import { createWorldTextures } from '../world/proceduralTextures';
import { buildRealisticWorld } from '../world/proceduralModels';
import { NatureSoundEngine } from '../world/soundEngine';
import { applyDynamicAtmosphereToScene } from '../world/controllers/atmosphereRenderController';
import { registerWindowDebugBridge } from '../world/controllers/windowDebugController';

export type GameStateMode = 'title' | 'playing' | 'paused';

export interface TelemetrySnapshot {
  x: number;
  y: number;
  z: number;
  yawDeg: number;
  distanceWalked: number;
  stepCount: number;
  biome: BiomeType;
  walkPace: WalkPaceMode;
  isFlying: boolean;
  isSwimming?: boolean;
  cameraPerspective?: CameraPerspectiveMode;
  equippedTool?: EquippedToolSlot;
  activeWeaponId?: InventoryItemId;
  arrowKind?: ArrowElementKind;
  hotbarSlots?: (InventoryItemId | null)[];
  favoriteIds?: InventoryItemId[];
  goldCoins?: number;
  ownedItemIds?: InventoryItemId[];
  nearbyMarket?: {
    id: string;
    nameHe: string;
  } | null;
  swordSwingProgress?: number;
  dashCooldown?: number;
  bowDrawn?: boolean;
  bowDrawProgress?: number;
  arrowsShotCount?: number;
  lastArrowHitTarget?: string | null;
  lastArrowHitTargetNameHe?: string | null;
  timeString: string;
  phaseLabelHe: string;
  sunElevationDeg: number;
  pointerLocked: boolean;
  weatherKind?: WeatherKind;
  weatherLabelHe?: string;
  wetness?: number;
  mountedHorseId?: string | null;
  nearbyHorse?: {
    id: string;
    nameHe: string;
  } | null;
  nearbyDoor?: {
    id: string;
    buildingNameHe: string;
    isOpen: boolean;
  } | null;
  nearbyLadder?: boolean;
  climbingLadder?: boolean;
  stamina?: number;
  maxStamina?: number;
  skills?: CharacterSkillsState;
}

export interface VirtualMoveState {
  forward: number;
  right: number;
  sprint: boolean;
  relaxed: boolean;
  jump: boolean;
  drawBow?: boolean;
}

export interface WorldCanvasProps {
  gameState: GameStateMode;
  muted: boolean;
  weatherToggle: WeatherToggleOption;
  onTelemetryUpdate: (snapshot: TelemetrySnapshot) => void;
  onRequestPauseToggle: () => void;
  virtualMoveRef: React.MutableRefObject<VirtualMoveState>;
}

// Reusable scratch vectors outside render loop (Zero GC)
const _sunVec = new THREE.Vector3();
const _tourPos = new THREE.Vector3();
const _tourLook = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

export const WorldCanvas: React.FC<WorldCanvasProps> = ({
  gameState,
  muted,
  weatherToggle,
  onTelemetryUpdate,
  onRequestPauseToggle,
  virtualMoveRef,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const gameStateRef = useRef<GameStateMode>(gameState);
  const mutedRef = useRef<boolean>(muted);
  const weatherToggleRef = useRef<WeatherToggleOption>(weatherToggle);
  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  const onRequestPauseToggleRef = useRef(onRequestPauseToggle);

  useEffect(() => {
    gameStateRef.current = gameState;
    if (gameState !== 'playing' && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }, [gameState]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    weatherToggleRef.current = weatherToggle;
  }, [weatherToggle]);

  useEffect(() => {
    onTelemetryUpdateRef.current = onTelemetryUpdate;
    onRequestPauseToggleRef.current = onRequestPauseToggle;
  }, [onTelemetryUpdate, onRequestPauseToggle]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

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
    const worldHandles = buildRealisticWorld(scene, textures, obstacles, isSoftwareGl);

    // 7. Player State, Rideable Horses, Active Arrows & Input Tracking
    const playerState = createInitialPlayerState();
    const rideableHorses = createInitialRideableHorses();
    const activeArrows: ArrowProjectile[] = [];
    let lastArrowHitTargetNameHe: string | null = null;
    let lastArrowHitTimer = 0;

    let activeWeatherMode: WeatherCycleMode = DEFAULT_WEATHER_CYCLE_MODE;
    let urlForcedWeatherKind: WeatherKind | null = null;
    let seasonTimeOffset = 0;

    // Optional URL parameters ?pos=x,z,yaw & ?weather=rain|snow|storm|sand|clouds|fog & ?season=spring|summer|autumn|winter & ?weatherMode=seasonal|turbo_test & ?perspective=third_person|first_person
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const posParam = searchParams.get('pos');
      if (posParam) {
        const parts = posParam.split(',').map((s) => parseFloat(s));
        if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
          playerState.x = parts[0];
          playerState.z = parts[1];
          const explicitY = parts.length >= 4 && Number.isFinite(parts[3]) ? parts[3] : undefined;
          playerState.y =
            explicitY !== undefined
              ? explicitY
              : walkableHeightAt(parts[0], parts[1]).height;
          if (parts.length >= 3 && Number.isFinite(parts[2])) {
            playerState.yaw = parts[2];
          }
          if (parts.length >= 5 && Number.isFinite(parts[4])) {
            playerState.pitch = parts[4];
          }
        }
      }
      const perspParam = searchParams.get('perspective');
      if (perspParam === 'first_person' || perspParam === 'third_person') {
        playerState.cameraPerspective = perspParam;
      }

      const wParam = searchParams.get('weather');
      if (wParam === 'rain') urlForcedWeatherKind = 'regional_rain';
      else if (wParam === 'snow') urlForcedWeatherKind = 'mountain_snow';
      else if (wParam === 'storm') urlForcedWeatherKind = 'lightning_storm';
      else if (wParam === 'sand') urlForcedWeatherKind = 'wind_sand';
      else if (wParam === 'clouds' || wParam === 'clear') urlForcedWeatherKind = 'clear_clouds';
      else if (wParam === 'fog') urlForcedWeatherKind = 'dense_fog';

      const sParam = searchParams.get('season');
      if (sParam === 'spring') seasonTimeOffset = 20;
      else if (sParam === 'summer') seasonTimeOffset = 180 + 20;
      else if (sParam === 'autumn') seasonTimeOffset = 360 + 20;
      else if (sParam === 'winter') seasonTimeOffset = 540 + 20;

      const wmParam = searchParams.get('weatherMode');
      if (wmParam === 'seasonal' || wmParam === 'turbo_test') {
        activeWeatherMode = wmParam;
      }
    }

    function getEffectiveForcedWeather(): WeatherKind | null {
      if (weatherToggleRef.current !== 'auto') {
        return weatherToggleRef.current;
      }
      return urlForcedWeatherKind;
    }

    const soundEngine = new NatureSoundEngine();

    function fireArrowNow(powerOverride?: number) {
      if (playerState.isSwimming) return null;
      playerState.equippedTool = 'bow';
      const pwr =
        powerOverride !== undefined
          ? Math.max(0.28, Math.min(1.0, powerOverride))
          : Math.max(0.35, playerState.bowDrawProgress);
      const arrow = spawnArrowProjectile(playerState, pwr);
      activeArrows.push(arrow);
      if (activeArrows.length > 28) {
        activeArrows.shift();
      }
      playerState.arrowsShotCount += 1;
      playerState.bowDrawn = false;
      playerState.bowDrawProgress = 0;
      playerState.bowReleaseKick = 1.0;
      soundEngine.playArrowShoot(pwr);
      return arrow;
    }

    const keysPressed = new Set<string>();
    const keysJustPressed = new Set<string>();
    const openDoorIds = new Set<string>();
    if (typeof window !== 'undefined') {
      const odParam = new URLSearchParams(window.location.search).get('openDoors');
      if (odParam === 'all') {
        openDoorIds.add('main-hall-door');
        openDoorIds.add('west-pavilion-door');
        openDoorIds.add('east-pavilion-door');
        openDoorIds.add('sw-watchtower-door');
        openDoorIds.add('se-watchtower-door');
        openDoorIds.add('nw-watchtower-door');
        openDoorIds.add('ne-watchtower-door');
        openDoorIds.add('hunter-lodge-door');
        openDoorIds.add('farm-west-door');
        openDoorIds.add('farm-south-door');
        openDoorIds.add('farm-east-door');
        openDoorIds.add('hill-watchtower-sw-door');
        openDoorIds.add('hill-watchtower-west-door');
        openDoorIds.add('hill-watchtower-east-door');
        openDoorIds.add('harbor-tavern-door');
        openDoorIds.add('harbor-warehouse-door');
        openDoorIds.add('harbor-lighthouse-door');
        openDoorIds.add('galleon-captain-door');
        openDoorIds.add('sw-observatory-door');
        openDoorIds.add('sw-alchemist-door');
      }
    }
    let pendingFlyToggle = false;
    let lastSpaceDownMs = -1000;
    let accumYawDelta = 0;
    let accumPitchDelta = 0;
    let isDraggingLook = false;
    let isMouseBowHeld = false;
    let mouseDownStartX = 0;
    let mouseDownStartY = 0;
    let mouseMovedWhileDown = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let landingDip = 0;
    let lastThunderTime = -10;
    let smoothAimZoom = 0;
    let smoothRightClickZoom = 0;
    let isSwordAttackHeld = false;
    let swordHoldDuration = 0;
    let swordHeavyTriggeredDuringHold = false;

    const initialHourParam = (() => {
      if (typeof window === 'undefined') return null;
      const p = new URLSearchParams(window.location.search).get('hour');
      if (!p) return null;
      const num = parseFloat(p);
      return Number.isFinite(num) ? num : null;
    })();
    let worldHours = initialHourParam !== null ? initialHourParam : 6.68;

    function applyDynamicAtmosphere(hours: number, weather?: WeatherStateSnapshot) {
      return applyDynamicAtmosphereToScene(
        {
          scene,
          renderer,
          sky,
          sunDiscMesh,
          sunDiscMat,
          sunLight,
          hemiLight,
          fog,
          bgColor,
          sunVec: _sunVec,
          waterMaterial: worldHandles.waterMaterial,
          lanternLights: worldHandles.lanternLights,
        },
        hours,
        weather
      );
    }

    let currentWeather = computeWeatherState(
      seasonTimeOffset,
      playerState.x,
      playerState.z,
      activeWeatherMode,
      getEffectiveForcedWeather()
    );
    let currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);

    function handleSwordStrikeImpactFeedback(
      res: ReturnType<typeof triggerSwordSlash> | null
    ) {
      if (!res) return;
      if (res.hitTarget) {
        lastArrowHitTargetNameHe = res.hitTarget.nameHe;
        lastArrowHitTimer = 3.5;
        soundEngine.playArrowHit(true);
        emitHudSnapshot();
      } else if (res.hitAnySurface) {
        soundEngine.playSwordClash(false);
      }
    }

    function executeSwordSlash(isHeavy = false, deferHitToStrikeWindow = true) {
      if (playerState.isSwimming) return null;
      const res = triggerSwordSlash(
        playerState,
        obstacles,
        isHeavy,
        deferHitToStrikeWindow
      );
      soundEngine.playSwordSwing(res.comboIndex, isHeavy);
      if (!deferHitToStrikeWindow) {
        handleSwordStrikeImpactFeedback(res);
      }
      return res;
    }

    registerWindowDebugBridge({
      playerState,
      obstacles,
      rideableHorses,
      activeArrows,
      openDoorIds,
      camera,
      soundEngine,
      gameStateRef,
      weatherToggleRef,
      setActiveWeatherMode: (mode) => {
        activeWeatherMode = mode;
      },
      setSmoothAimZoom: (val) => {
        smoothAimZoom = val;
      },
      setSmoothRightClickZoom: (val) => {
        smoothRightClickZoom = val;
      },
      fireArrowNow,
      executeSwordSlash,
      getWorldHours: () => worldHours,
      setWorldHoursAndApply: (hours) => {
        worldHours = ((Number(hours) % 24) + 24) % 24;
        currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);
        return Number(worldHours.toFixed(2));
      },
      getCurrentAtmo: () => currentAtmo,
      getCurrentWeather: () => currentWeather,
      emitHudSnapshot,
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Event Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
          onRequestPauseToggleRef.current();
        }
      }
      if (
        gameStateRef.current === 'playing' &&
        (e.ctrlKey || e.code === 'ControlLeft' || e.code === 'ControlRight')
      ) {
        if (
          e.code === 'KeyS' ||
          e.code === 'KeyA' ||
          e.code === 'KeyD' ||
          e.code === 'KeyW' ||
          e.code === 'Space'
        ) {
          e.preventDefault();
        }
      }
      // If Skyrim Inventory [Tab] or Favorites [Q] modal is open, let the modal handle keys!
      if (document.body.dataset.skyrimModalOpen === 'true') {
        return;
      }

      // Toggle Camera Perspective between 3rd-Person Character View and 1st-Person View with [C]
      if (e.code === 'KeyC' && !e.repeat && gameStateRef.current === 'playing') {
        playerState.cameraPerspective =
          playerState.cameraPerspective === 'third_person' ? 'first_person' : 'third_person';
      }
      // Customizable Hotkey Slots [1], [2], [3], [4]
      if (
        (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3' || e.code === 'Digit4') &&
        !e.repeat &&
        gameStateRef.current === 'playing'
      ) {
        const slotIdx =
          e.code === 'Digit1' ? 0 : e.code === 'Digit2' ? 1 : e.code === 'Digit3' ? 2 : 3;
        const boundItem = playerState.hotbarSlots?.[slotIdx];
        if (boundItem) {
          equipInventoryItem(playerState, boundItem);
          soundEngine.playFootstep('trail', 1.15);
        }
      }
      // Cycle Arrow Element [X]: Normal Steel -> Fire Arrow -> Wind Storm Arrow
      if (e.code === 'KeyX' && !e.repeat && gameStateRef.current === 'playing') {
        const order: ArrowElementKind[] = ['normal', 'fire', 'wind'];
        const curr = playerState.arrowKind ?? 'normal';
        playerState.arrowKind = order[(order.indexOf(curr) + 1) % order.length];
        soundEngine.playBowDraw();
      }
      // Ranger Dash / Water Surge [G]
      if (e.code === 'KeyG' && !e.repeat && gameStateRef.current === 'playing') {
        if ((playerState.dashCooldown ?? 0) <= 0.05) {
          playerState.dashTimer = 0.42;
          playerState.dashCooldown = 1.4;
          soundEngine.playFootstep(playerState.isSwimming ? 'water' : playerState.currentBiome, 1.25);
        }
      }
      // Start drawing bow or charging/swinging sword on [R] keydown (only when not swimming!)
      if (e.code === 'KeyR' && !e.repeat && gameStateRef.current === 'playing' && !playerState.isSwimming) {
        if (playerState.equippedTool === 'sword') {
          isSwordAttackHeld = true;
          swordHoldDuration = 0;
          swordHeavyTriggeredDuringHold = false;
        } else {
          playerState.equippedTool = 'bow';
          if (!playerState.bowDrawn) {
            playerState.bowDrawn = true;
            soundEngine.playBowDraw();
          }
        }
      }
      // Detect Double-Tap Spacebar (within 500ms) to toggle Flight Mode (disabled when mounting/dismounting a ladder!)
      if (e.code === 'Space' && !e.repeat && gameStateRef.current === 'playing') {
        const onOrLookingAtLadder =
          Boolean(playerState.climbingLadderId) ||
          Boolean(
            findLookedAtWatchtowerLadder(
              playerState.x,
              playerState.y,
              playerState.z,
              playerState.yaw,
              playerState.pitch
            )
          );
        if (!onOrLookingAtLadder) {
          const nowMs = performance.now();
          if (nowMs - lastSpaceDownMs <= 500) {
            pendingFlyToggle = true;
            lastSpaceDownMs = -1000;
          } else {
            lastSpaceDownMs = nowMs;
          }
        }
      }
      if (!keysPressed.has(e.code)) {
        keysJustPressed.add(e.code);
      }
      keysPressed.add(e.code);
      if (gameStateRef.current === 'playing') {
        soundEngine.init();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
      if (e.code === 'KeyR' && gameStateRef.current === 'playing') {
        if (isSwordAttackHeld) {
          isSwordAttackHeld = false;
          playerState.swordChargeTime = 0;
          if (!swordHeavyTriggeredDuringHold) {
            executeSwordSlash(false);
          }
        } else if (playerState.bowDrawn) {
          fireArrowNow();
        }
      }
    };

    const onBlurOrHide = () => {
      keysPressed.clear();
      keysJustPressed.clear();
      isDraggingLook = false;
      isMouseBowHeld = false;
      isSwordAttackHeld = false;
      playerState.bowZoomHeld = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      if (gameStateRef.current === 'playing') {
        e.preventDefault();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing') return;
      soundEngine.init();
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      mouseDownStartX = e.clientX;
      mouseDownStartY = e.clientY;
      mouseMovedWhileDown = false;

      if (document.body.dataset.skyrimModalOpen === 'true') return;

      if (e.button === 2 && !playerState.isSwimming) {
        if (playerState.equippedTool === 'sword') {
          // Right mouse button with Sword equipped raises Skyrim Horizontal Parry / Block Guard!
          playerState.swordBlocking = true;
          soundEngine.playSwordClash(true);
        } else {
          // Right mouse button in Bow mode ONLY zooms the screen in closer (does NOT draw the arrow)!
          playerState.bowZoomHeld = true;
        }
      } else if (e.button === 0) {
        isDraggingLook = true;
        if (!playerState.isSwimming && playerState.equippedTool === 'sword') {
          // Left mouse button with Sword: tap for quick horizontal cleave, hold >= 0.24s for Heavy Forward Air-Cleaving Power Attack!
          isSwordAttackHeld = true;
          swordHoldDuration = 0;
          swordHeavyTriggeredDuringHold = false;
        } else if (
          !playerState.isSwimming &&
          (playerState.equippedTool ?? 'bow') === 'bow'
        ) {
          // Left mouse button in Bow mode draws the bow and arrow!
          isMouseBowHeld = true;
          if (!playerState.bowDrawn) {
            playerState.bowDrawn = true;
            soundEngine.playBowDraw();
          }
        }
        if (document.pointerLockElement !== renderer.domElement) {
          try {
            renderer.domElement.requestPointerLock?.();
          } catch {
            // Fallback to drag-look
          }
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing') return;
      if (document.pointerLockElement === renderer.domElement) {
        accumYawDelta -= e.movementX * 0.0022;
        accumPitchDelta -= e.movementY * 0.0022;
      } else if (isDraggingLook) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        accumYawDelta -= dx * 0.0045;
        accumPitchDelta -= dy * 0.0045;
        if (Math.hypot(e.clientX - mouseDownStartX, e.clientY - mouseDownStartY) > 16) {
          mouseMovedWhileDown = true;
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      isDraggingLook = false;
      if (e.button === 2) {
        if (playerState.swordBlocking) {
          playerState.swordBlocking = false;
        }
        if (playerState.bowZoomHeld) {
          playerState.bowZoomHeld = false;
        }
      }
      if (e.button === 0 && isSwordAttackHeld) {
        isSwordAttackHeld = false;
        playerState.swordChargeTime = 0;
        if (!swordHeavyTriggeredDuringHold && !mouseMovedWhileDown) {
          executeSwordSlash(false);
        }
      }
      if (e.button === 0 && isMouseBowHeld) {
        isMouseBowHeld = false;
        const isLocked = document.pointerLockElement === renderer.domElement;
        if (
          playerState.bowDrawn &&
          (isLocked || !mouseMovedWhileDown || playerState.bowDrawProgress >= 0.35)
        ) {
          fireArrowNow();
        } else if (!keysPressed.has('KeyR')) {
          playerState.bowDrawn = false;
          playerState.bowDrawProgress = 0;
        }
      }
    };

    // Touch look support on mobile
    let touchLookId: number | null = null;
    let lastTouchX = 0;
    let lastTouchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (gameStateRef.current !== 'playing') return;
      soundEngine.init();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (touchLookId === null) {
          touchLookId = t.identifier;
          lastTouchX = t.clientX;
          lastTouchY = t.clientY;
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (gameStateRef.current !== 'playing' || touchLookId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchLookId) {
          const dx = t.clientX - lastTouchX;
          const dy = t.clientY - lastTouchY;
          lastTouchX = t.clientX;
          lastTouchY = t.clientY;
          accumYawDelta -= dx * 0.005;
          accumPitchDelta -= dy * 0.005;
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchLookId) {
          touchLookId = null;
        }
      }
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlurOrHide);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: true });

    // 8. Main Animation Loop with Software-WebGL Pacing Guard
    let frameId = 0;
    let lastTime = performance.now();
    let elapsedTotal = 0;
    let lastHudEmitTime = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const now = performance.now();
      const rawDt = Math.min((now - lastTime) / 1000, 0.35);
      lastTime = now;

      soundEngine.setMuted(mutedRef.current);
      soundEngine.setPaused(gameStateRef.current !== 'playing');

      if (gameStateRef.current === 'title') {
        elapsedTotal += rawDt;
        worldHours = (worldHours + rawDt * 0.022) % 24;
        currentWeather = computeWeatherState(
          elapsedTotal + seasonTimeOffset,
          camera.position.x,
          camera.position.z,
          activeWeatherMode,
          getEffectiveForcedWeather()
        );
        currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);

        const tourAngle = elapsedTotal * 0.09 - 0.65;
        const tourRadius = 34;
        _tourPos.set(
          Math.sin(tourAngle) * tourRadius,
          8.5 + Math.sin(elapsedTotal * 0.25) * 1.4,
          Math.cos(tourAngle) * tourRadius + 6
        );
        _tourLook.set(4, 1.8, -4);
        camera.position.copy(_tourPos);
        camera.lookAt(_tourLook);
        worldHandles.update(
          elapsedTotal,
          camera.position.x,
          camera.position.z,
          currentAtmo.morningMistOpacity,
          currentAtmo.nightFactor,
          currentWeather,
          openDoorIds,
          rideableHorses,
          null,
          undefined,
          activeArrows,
          worldHours
        );
      } else if (gameStateRef.current === 'playing') {
        elapsedTotal += rawDt;

        // Slow, natural continuous 24h day & night solar/lunar cycle + Seasonal Weather cycle
        worldHours = (worldHours + rawDt * 0.028) % 24;
        currentWeather = computeWeatherState(
          elapsedTotal + seasonTimeOffset,
          playerState.x,
          playerState.z,
          activeWeatherMode,
          getEffectiveForcedWeather()
        );
        currentAtmo = applyDynamicAtmosphere(worldHours, currentWeather);

        if (
          (currentWeather.thunderTriggered || currentWeather.lightningFlash > 0.25) &&
          elapsedTotal - lastThunderTime > 2.2
        ) {
          lastThunderTime = elapsedTotal;
          soundEngine.playThunderRumble();
        }

        let forward = virtualMoveRef.current.forward;
        let right = virtualMoveRef.current.right;
        if (document.body.dataset.skyrimModalOpen !== 'true') {
          if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) forward += 1;
          if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) forward -= 1;
          if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) right += 1;
          if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) right -= 1;
        }

        // Interactive Door Toggle when pressing [E] ONLY when looking at a Fortress Door
        if (keysJustPressed.has('KeyE')) {
          const nearDoor = findNearestFortressDoor(
            playerState.x,
            playerState.y,
            playerState.z,
            playerState.yaw,
            playerState.pitch
          );
          if (nearDoor) {
            if (openDoorIds.has(nearDoor.id)) {
              openDoorIds.delete(nearDoor.id);
            } else {
              openDoorIds.add(nearDoor.id);
            }
            soundEngine.playFootstep('bridge', 0.85);
          }
        }

        // Virtual bow draw button on touch / HUD
        if (virtualMoveRef.current.drawBow) {
          if (!playerState.bowDrawn) {
            playerState.bowDrawn = true;
            soundEngine.playBowDraw();
          }
        }

        // Update Bow Draw Tension Progress (0 -> 1 over 0.52s)
        if (playerState.bowDrawn) {
          if (keysPressed.has('KeyR') || isMouseBowHeld || virtualMoveRef.current.drawBow) {
            playerState.bowDrawProgress = Math.min(1.0, playerState.bowDrawProgress + rawDt / 0.52);
          }
        } else {
          playerState.bowDrawProgress = Math.max(0, playerState.bowDrawProgress - rawDt * 5.0);
        }

        // Update Bow Release Recoil Kick (1 -> 0 over 0.28s)
        if ((playerState.bowReleaseKick ?? 0) > 0) {
          playerState.bowReleaseKick = Math.max(0, (playerState.bowReleaseKick ?? 0) - rawDt / 0.28);
        }

        // Update Long-Press Sword Power Attack Charge (holding Left-Click or [R] >= 0.24s triggers Heavy Forward Air-Cleaving Attack!)
        if (isSwordAttackHeld && !playerState.isSwimming && playerState.equippedTool === 'sword') {
          swordHoldDuration += rawDt;
          if (!swordHeavyTriggeredDuringHold) {
            playerState.swordChargeTime = Math.min(1.0, swordHoldDuration / 0.24);
            if (swordHoldDuration >= 0.24 && !mouseMovedWhileDown) {
              swordHeavyTriggeredDuringHold = true;
              executeSwordSlash(true);
            }
          }
        } else {
          playerState.swordChargeTime = Math.max(0, (playerState.swordChargeTime ?? 0) - rawDt * 6.0);
        }

        // Step 5-Phase Sword Slash Progress & Synchronized Phase C Active Strike Window Hit Detection
        if ((playerState.swordSwingProgress ?? 0) > 0) {
          const strikeWindowRes = stepSwordSwingCombat(playerState, obstacles, rawDt);
          if (strikeWindowRes) {
            handleSwordStrikeImpactFeedback(strikeWindowRes);
          }
        }
        const targetBlock =
          !playerState.isSwimming &&
          playerState.equippedTool === 'sword' &&
          Boolean(playerState.swordBlocking)
            ? 1.0
            : 0.0;
        playerState.swordBlockProgress =
          (playerState.swordBlockProgress ?? 0) +
          (targetBlock - (playerState.swordBlockProgress ?? 0)) * (1 - Math.exp(-14 * rawDt));

        // Age active Sword Clash Spark burst (0.45s lifetime) & Forward Air-Slash Wave (0.48s lifetime)
        if (playerState.lastSwordHitPoint) {
          playerState.lastSwordHitPoint.age += rawDt;
          if (playerState.lastSwordHitPoint.age > 0.45) {
            playerState.lastSwordHitPoint = null;
          }
        }
        if (playerState.lastSwordAirWave) {
          playerState.lastSwordAirWave.age += rawDt;
          if (playerState.lastSwordAirWave.age > 0.48) {
            playerState.lastSwordAirWave = null;
          }
        }

        // Smooth First-Person Weapon Inertia (Mouse-Look Lag + Vertical Jump/Fall Momentum)
        const targetSwayX = Math.max(-0.045, Math.min(0.045, -accumYawDelta * 0.65));
        const targetSwayY = Math.max(
          -0.045,
          Math.min(0.045, -accumPitchDelta * 0.65 - playerState.vy * 0.0045 + landingDip * 0.14)
        );
        const swayDamp = 1 - Math.exp(-12 * rawDt);
        playerState.weaponSwayX =
          ((playerState.weaponSwayX ?? 0) + targetSwayX) * (1 - swayDamp * 0.65);
        playerState.weaponSwayY =
          ((playerState.weaponSwayY ?? 0) + targetSwayY) * (1 - swayDamp * 0.65);

        // Step active 3D Arrows in flight
        if (activeArrows.length > 0) {
          const arrowRes = stepArrowsPhysics(activeArrows, obstacles, rawDt);
          if (arrowRes.hitTarget) {
            playerState.lastArrowHitTarget = arrowRes.hitTarget.id;
            lastArrowHitTargetNameHe = arrowRes.hitTarget.nameHe;
            lastArrowHitTimer = 3.5;
            playerState.goldCoins = (playerState.goldCoins ?? 280) + 15;
            awardSkillXp(playerState, 'archery', 32);
            soundEngine.playArrowHit(true);
            emitHudSnapshot();
          } else if (arrowRes.hitAnySurface) {
            soundEngine.playArrowHit(false);
          }
        }
        if (lastArrowHitTimer > 0) {
          lastArrowHitTimer = Math.max(0, lastArrowHitTimer - rawDt);
        }

        const sprint =
          virtualMoveRef.current.sprint ||
          keysPressed.has('ShiftLeft') ||
          keysPressed.has('ShiftRight');

        const relaxed =
          virtualMoveRef.current.relaxed ||
          keysPressed.has('ControlLeft') ||
          keysPressed.has('ControlRight');

        const jumpPressed =
          virtualMoveRef.current.jump || keysJustPressed.has('Space');
        const jumpHeld =
          virtualMoveRef.current.jump || keysPressed.has('Space');
        const toggleMountHorsePressed = keysJustPressed.has('KeyF');

        const triggerFlyToggle = pendingFlyToggle;
        pendingFlyToggle = false;
        keysJustPressed.clear();

        const subSteps = Math.max(1, Math.ceil(rawDt / 0.05));
        const subDt = rawDt / subSteps;
        let anySteppedFoot = false;
        let maxLandedImpact = 0;

        for (let s = 0; s < subSteps; s++) {
          const res = stepPlayerPhysics(
            playerState,
            {
              forward: Math.max(-1, Math.min(1, forward)),
              right: Math.max(-1, Math.min(1, right)),
              sprint,
              relaxed,
              jumpPressed: s === 0 ? jumpPressed : false,
              jumpHeld,
              toggleFlyRequested: s === 0 ? triggerFlyToggle : false,
              toggleMountHorseRequested: s === 0 ? toggleMountHorsePressed : false,
              lookYawDelta: s === 0 ? accumYawDelta : 0,
              lookPitchDelta: s === 0 ? accumPitchDelta : 0,
            },
            obstacles,
            subDt,
            openDoorIds,
            rideableHorses
          );
          if (res.steppedFoot) anySteppedFoot = true;
          if (res.landedImpact > maxLandedImpact) maxLandedImpact = res.landedImpact;
        }
        accumYawDelta = 0;
        accumPitchDelta = 0;

        if (anySteppedFoot) {
          const pitchMod = playerState.mountedHorseId
            ? 0.72
            : playerState.isSwimming
              ? 0.85
              : playerState.walkPace === 'fast'
                ? 1.14
                : playerState.walkPace === 'relaxed'
                  ? 0.88
                  : 1.0;
          soundEngine.playFootstep(
            playerState.mountedHorseId
              ? 'trail'
              : playerState.isSwimming
                ? 'water'
                : playerState.currentBiome,
            pitchMod
          );
        }
        if (maxLandedImpact > 0.1) {
          landingDip = maxLandedImpact * 0.22;
          soundEngine.playFootstep(playerState.currentBiome, 0.82);
        }
        landingDip *= Math.exp(-12 * rawDt);

        const underRoof = isPositionUnderRoof(playerState.x, playerState.y, playerState.z);
        const distToBirdsFlock = Math.hypot(playerState.x, playerState.z - 15);
        const birdProximity = Math.max(0, Math.min(1, 1.0 - (distToBirdsFlock - 35) / 85));

        soundEngine.updateAmbient(
          rawDt,
          playerState.x,
          playerState.z,
          true,
          currentWeather.windStrength,
          currentWeather.rainIntensity,
          currentAtmo.isNight,
          underRoof,
          birdProximity
        );

        const isMountedOnHorse = Boolean(playerState.mountedHorseId);
        const saddleHeightBonus = isMountedOnHorse ? 0.68 : 0;
        const bobScale = isMountedOnHorse ? 0.022 : playerState.isSwimming ? 0.045 : 0.055;
        const bobY = isMountedOnHorse
          ? Math.sin(playerState.bobPhase) * bobScale * playerState.bobAmount
          : Math.sin(playerState.bobPhase * 2) * bobScale * playerState.bobAmount;
        const bobRoll =
          Math.cos(playerState.bobPhase) * (isMountedOnHorse ? 0.0045 : 0.008) * playerState.bobAmount;
        const horsePitchSway = isMountedOnHorse
          ? Math.sin(playerState.bobPhase) * 0.011 * playerState.bobAmount
          : 0;

        const targetAimZoom = playerState.bowDrawn ? 1.0 : 0.0;
        smoothAimZoom += (targetAimZoom - smoothAimZoom) * (1 - Math.exp(-10 * rawDt));
        const targetRightZoom =
          !playerState.isSwimming &&
          (playerState.equippedTool ?? 'bow') === 'bow' &&
          Boolean(playerState.bowZoomHeld)
            ? 1.0
            : 0.0;
        smoothRightClickZoom +=
          (targetRightZoom - smoothRightClickZoom) * (1 - Math.exp(-12 * rawDt));
        const combinedThirdPersonZoom = Math.min(1.0, smoothAimZoom * 0.7 + smoothRightClickZoom * 0.8);

        if (playerState.cameraPerspective === 'third_person') {
          // 3rd-Person Over-the-Right-Shoulder Camera so the 3D Ranger Character & Proper Recurve Bow Grip are clearly visible
          const pivotY =
            playerState.y +
            (isMountedOnHorse ? 2.22 : playerState.isSwimming ? 1.25 : 1.54) +
            bobY -
            landingDip;
          const effPitch = playerState.pitch + horsePitchSway;
          const cosP = Math.cos(effPitch);
          const sinP = Math.sin(effPitch);
          const fwdX = -Math.sin(playerState.yaw) * cosP;
          const fwdY = sinP;
          const fwdZ = -Math.cos(playerState.yaw) * cosP;
          const rightX = Math.cos(playerState.yaw);
          const rightZ = -Math.sin(playerState.yaw);

          const baseDist = isMountedOnHorse ? 4.15 : 2.95;
          const aimDist = isMountedOnHorse ? 2.55 : 1.78;
          const camDist = baseDist + (aimDist - baseDist) * combinedThirdPersonZoom;
          const shoulderSide = 0.44 - 0.86 * combinedThirdPersonZoom;
          const shoulderUp = 0.28 - 0.12 * combinedThirdPersonZoom;

          const camX = playerState.x - fwdX * camDist + rightX * shoulderSide;
          const camZ = playerState.z - fwdZ * camDist + rightZ * shoulderSide;
          const minCamFloorY = walkableHeightAt(camX, camZ, playerState.y).height + 0.45;
          const camY = Math.max(minCamFloorY, pivotY - fwdY * camDist + shoulderUp);

          const lookSideOffset = 0.16 * (1.0 - combinedThirdPersonZoom);
          camera.position.set(camX, camY, camZ);
          _camTargetLook.set(
            playerState.x + fwdX * 32.0 + rightX * lookSideOffset,
            pivotY + fwdY * 32.0,
            playerState.z + fwdZ * 32.0 + rightZ * lookSideOffset
          );
          camera.lookAt(_camTargetLook);
        } else {
          // Restrained, phase-synchronized first-person camera impulse (Wind-Up -> Strike -> Impact/Follow-Through -> Recovery)
          const swProg = playerState.swordSwingProgress ?? 0;
          let combatCamPitch = 0;
          let combatCamYaw = 0;
          let combatCamRoll = 0;
          if (swProg > 0.0001) {
            const camPose = computeFirstPersonSwordAttackPose({
              swingProgress: swProg,
              comboIndex: playerState.swordComboIndex ?? 0,
              isHeavy: Boolean(playerState.swordHeavyAttack),
              chargeProgress: playerState.swordChargeTime ?? 0,
              blockProgress: playerState.swordBlockProgress ?? 0,
              swayX: 0,
              swayY: 0,
              breathY: 0,
              sprintCarry: 0,
              impactKind: playerState.lastSwordHitPoint?.kind ?? 'none',
              impactAge: playerState.lastSwordHitPoint?.age ?? 99,
            });
            combatCamPitch = camPose.cameraImpulse.pitchOffset;
            combatCamYaw = camPose.cameraImpulse.yawOffset;
            combatCamRoll = camPose.cameraImpulse.rollOffset;
          }
          camera.position.set(
            playerState.x,
            playerState.y + PLAYER_EYE_HEIGHT + saddleHeightBonus + bobY - landingDip,
            playerState.z
          );
          _euler.set(
            playerState.pitch + combatCamPitch + horsePitchSway,
            playerState.yaw + combatCamYaw,
            bobRoll + combatCamRoll,
            'YXZ'
          );
          camera.quaternion.setFromEuler(_euler);
        }

        const horizSpeed = Math.hypot(playerState.vx, playerState.vz);
        const baseFov = playerState.isFlying
          ? 76
          : isMountedOnHorse && horizSpeed > 11.0
            ? 77.5
            : isMountedOnHorse && horizSpeed > 4.0
              ? 72.5
              : playerState.walkPace === 'fast' && horizSpeed > 5.2
                ? 73.5
                : playerState.walkPace === 'relaxed' && horizSpeed > 0.5
                  ? 65.5
                  : 68;
        // Bow Draw Zoom (6.5° subtle zoom when drawing arrow) + Bow Right-Click Closer Zoom (11.5° zoom without drawing arrow) + Sword Block Zoom (4.5°)!
        const drawZoomDrop = 6.5;
        const rightClickZoomDrop = 11.5;
        const blockZoomDrop = (playerState.swordBlockProgress ?? 0) * 4.5;
        const dashFovBoost = (playerState.dashTimer ?? 0) > 0 ? 6.5 : 0.0;
        const targetFov =
          baseFov +
          dashFovBoost -
          smoothAimZoom * drawZoomDrop -
          smoothRightClickZoom * rightClickZoomDrop -
          blockZoomDrop;
        if (Math.abs(camera.fov - targetFov) > 0.05) {
          camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-9 * rawDt));
          camera.updateProjectionMatrix();
        }

        sunLight.target.position.set(playerState.x, playerState.y, playerState.z);
        sunLight.position
          .copy(_sunVec)
          .multiplyScalar(85)
          .add(sunLight.target.position);

        worldHandles.update(
          elapsedTotal,
          playerState.x,
          playerState.z,
          currentAtmo.morningMistOpacity,
          currentAtmo.nightFactor,
          currentWeather,
          openDoorIds,
          rideableHorses,
          playerState.mountedHorseId,
          playerState,
          activeArrows,
          worldHours,
          {
            onBirdFlockStartled: (dist) => {
              soundEngine.playBirdFlockStartle(dist);
            },
            onCritterScampered: (dist) => {
              soundEngine.playCritterScamper(dist);
            },
          }
        );
      }

      if (now - lastHudEmitTime > 100) {
        lastHudEmitTime = now;
        emitHudSnapshot();
      }

      sky.position.copy(camera.position);
      sunDiscMesh.position.copy(_sunVec).multiplyScalar(215).add(camera.position);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    function emitHudSnapshot() {
      const normYaw = ((((playerState.yaw * 180) / Math.PI) % 360) + 360) % 360;
      const nearDoor = findNearestFortressDoor(
        playerState.x,
        playerState.y,
        playerState.z,
        playerState.yaw,
        playerState.pitch
      );
      const nearLadder = findLookedAtWatchtowerLadder(
        playerState.x,
        playerState.y,
        playerState.z,
        playerState.yaw,
        playerState.pitch
      );
      const nearHorse = !playerState.mountedHorseId
        ? findNearestRideableHorse(playerState.x, playerState.y, playerState.z, rideableHorses)
        : null;
      const nearMarket = findNearestMarketStall(playerState.x, playerState.z);
      onTelemetryUpdateRef.current({
        x: playerState.x,
        y: playerState.y,
        z: playerState.z,
        yawDeg: normYaw,
        distanceWalked: playerState.distanceWalked,
        stepCount: playerState.stepCount,
        biome: playerState.currentBiome,
        walkPace: playerState.walkPace,
        isFlying: playerState.isFlying,
        isSwimming: playerState.isSwimming,
        cameraPerspective: playerState.cameraPerspective,
        equippedTool: playerState.equippedTool,
        activeWeaponId: playerState.activeWeaponId,
        arrowKind: playerState.arrowKind,
        hotbarSlots: playerState.hotbarSlots ? [...playerState.hotbarSlots] : undefined,
        favoriteIds: playerState.favoriteIds ? [...playerState.favoriteIds] : undefined,
        goldCoins: playerState.goldCoins ?? 280,
        ownedItemIds: playerState.ownedItemIds ? [...playerState.ownedItemIds] : undefined,
        nearbyMarket: nearMarket ? { id: nearMarket.id, nameHe: nearMarket.nameHe } : null,
        swordSwingProgress: playerState.swordSwingProgress,
        dashCooldown: playerState.dashCooldown,
        bowDrawn: playerState.bowDrawn,
        bowDrawProgress: playerState.bowDrawProgress,
        arrowsShotCount: playerState.arrowsShotCount,
        lastArrowHitTarget: playerState.lastArrowHitTarget,
        lastArrowHitTargetNameHe: lastArrowHitTimer > 0 ? lastArrowHitTargetNameHe : null,
        timeString: currentAtmo.timeString,
        phaseLabelHe: currentAtmo.phaseLabelHe,
        sunElevationDeg: currentAtmo.sunElevationDeg,
        pointerLocked: document.pointerLockElement === renderer.domElement,
        weatherKind: currentWeather.weatherKind,
        weatherLabelHe: currentWeather.weatherLabelHe,
        wetness: currentWeather.wetness,
        mountedHorseId: playerState.mountedHorseId,
        nearbyHorse: nearHorse
          ? {
              id: nearHorse.id,
              nameHe: nearHorse.nameHe,
            }
          : null,
        nearbyDoor: nearDoor
          ? {
              id: nearDoor.id,
              buildingNameHe: nearDoor.buildingNameHe,
              isOpen: openDoorIds.has(nearDoor.id),
            }
          : null,
        nearbyLadder: Boolean(nearLadder),
        climbingLadder: Boolean(playerState.climbingLadderId),
        stamina: playerState.stamina,
        maxStamina: playerState.maxStamina,
        skills: playerState.skills ? { ...playerState.skills } : undefined,
      });
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlurOrHide);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      soundEngine.dispose();
      worldHandles.dispose();
      textures.dispose();
      sunDiscGeo.dispose();
      sunDiscMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, [virtualMoveRef]);

  return (
    <div
      ref={canvasMountRef}
      className="fixed inset-0 w-full h-full overflow-hidden bg-stone-950 cursor-grab active:cursor-grabbing"
      aria-label="תצוגת עולם תלת ממדי בגוף ראשון"
    />
  );
};
