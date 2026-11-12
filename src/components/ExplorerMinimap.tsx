// ============================================================================
// MODULE: Components / Explorer Minimap
// DESIGN: Humble UI circular minimap HUD with Fog-of-War parchment discovery (SRP)
// SUMMARY: Renders an offscreen 2D canvas map tracking player coordinates, heading
//          compass arrow, cardinal North indicator, and dynamic cell discovery.
// ============================================================================

// ======================== IMPORTS & PROPS ======================== \\
// #region Imports & Props
import { mapExplorationState } from '../world/domain/mapExploration';
import { t } from '../locales';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpawnedSailableShips,
  isPlayerInsideUndergroundMine,
  sampleMinimapColorAt,
  sampleUndergroundMineMapColorAt,
} from '../world/terrainMath';
import {
  BEAR_MOUNTAIN_CAVES,
  CHINESE_FORTRESS_POS,
  CROCODILE_RIVER_BEND_POS,
  DESERT_PYRAMID_SANCTUARY_POS,
  FLOATING_BLOOMING_ISLANDS,
  HUNTER_LODGE_POS,
  MURKY_SWAMP_BIOME_POS,
  NORDIC_FROST_SHRINE_POS,
  RUINED_ATLANTIS_POS,
  SMUGGLER_ISLAND_POS,
  SOUTHEAST_HARBOR_POS,
  SOUTHERN_DRAGON_RUINS_POS,
  SOUTHERN_MINE_POS,
  SOUTHWEST_OASIS_POS,
  VOLCANO_SANCTUM_POS,
} from '../world/domain/landmarksRegistry';

/**
 * Summary: Props contract for Explorer Minimap radar HUD and Full-Screen World Map modal.
 * Design: Consumes reactive player position, camera yaw, and God Mode teleport callback.
 */
export interface IExplorerMinimapProps {
  playerX: number;
  playerY?: number;
  playerZ: number;
  yawDeg: number;
  isPlaying?: boolean;
  godMode?: boolean;
  onTeleportToWorldPos?: (
    worldX: number,
    worldZ: number,
    targetLayer?: 'surface' | 'mine'
  ) => void;
}

const MAP_WORLD_HALF = 1080; // -1080m .. +1080m covers the expanded world & deep-sea Ruined Atlantis at (980, 420)
const METERS_PER_CELL = 2;  // 2m per pixel cell -> 1080 x 1080 offscreen map
const GRID_SIZE = Math.floor((MAP_WORLD_HALF * 2) / METERS_PER_CELL); // 1080
const DISCOVERY_RADIUS_M = 46; // Reveal radius around the player in meters
const VIEW_WINDOW_M = 180; // Visible meters across the minimap diameter
const FULL_MAP_GRID_METERS = 4; // 4m per pixel cell for full-world overview texture (540x540)
const FULL_MAP_GRID_SIZE = Math.floor((MAP_WORLD_HALF * 2) / FULL_MAP_GRID_METERS);
/** Rows of the full-world terrain built per background slice, and the delay before the first slice. */
const FULL_MAP_BUILD_ROWS_PER_SLICE = 2;
const FULL_MAP_BUILD_START_DELAY_MS = 1500;

/** Fills one row of the full-world terrain texture (RGBA) with sampled minimap colours. */
function fillFullWorldTerrainRow(data: Uint8ClampedArray, cz: number): void {
  const wz = (cz + 0.5) * FULL_MAP_GRID_METERS - MAP_WORLD_HALF;
  const rowOffset = cz * FULL_MAP_GRID_SIZE;
  for (let cx = 0; cx < FULL_MAP_GRID_SIZE; cx++) {
    const wx = (cx + 0.5) * FULL_MAP_GRID_METERS - MAP_WORLD_HALF;
    const [r, g, b] = sampleMinimapColorAt(wx, wz);
    const pIdx = (rowOffset + cx) * 4;
    data[pIdx] = r;
    data[pIdx + 1] = g;
    data[pIdx + 2] = b;
    data[pIdx + 3] = 255;
  }
}

interface IWorldMapLandmarkPin {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly z: number;
  readonly color: string;
}

const WORLD_MAP_LANDMARKS: readonly IWorldMapLandmarkPin[] = [
  { id: 'fortress', label: 'Imperial Fortress', x: CHINESE_FORTRESS_POS.x, z: CHINESE_FORTRESS_POS.z, color: '#fbbf24' },
  { id: 'nordic_shrine', label: 'Nordic Frost Shrine & Hot Springs', x: NORDIC_FROST_SHRINE_POS.x, z: NORDIC_FROST_SHRINE_POS.z, color: '#22d3ee' },
  { id: 'lodge', label: 'Hunter Lodge', x: HUNTER_LODGE_POS.x, z: HUNTER_LODGE_POS.z, color: '#a3e635' },
  { id: 'harbor', label: 'Harbor & Market', x: SOUTHEAST_HARBOR_POS.x, z: SOUTHEAST_HARBOR_POS.z, color: '#38bdf8' },
  { id: 'smuggler_cove', label: 'Corsair Smuggler Cove', x: SMUGGLER_ISLAND_POS.x, z: SMUGGLER_ISLAND_POS.z, color: '#fb7185' },
  { id: 'atlantis', label: 'Ruined Atlantis', x: RUINED_ATLANTIS_POS.x, z: RUINED_ATLANTIS_POS.z, color: '#06b6d4' },
  { id: 'oasis', label: 'Desert Oasis', x: SOUTHWEST_OASIS_POS.x, z: SOUTHWEST_OASIS_POS.z, color: '#facc15' },
  { id: 'sun_pyramid', label: 'Ancient Sun Pyramid & Sphinx', x: DESERT_PYRAMID_SANCTUARY_POS.x, z: DESERT_PYRAMID_SANCTUARY_POS.z, color: '#eab308' },
  { id: 'volcano', label: 'Volcano Sanctum (King Lion)', x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z, color: '#f97316' },
  { id: 'sky_islands', label: 'Floating Sky Islands', x: FLOATING_BLOOMING_ISLANDS[0].x, z: FLOATING_BLOOMING_ISLANDS[0].z, color: '#e879f9' },
  { id: 'dwarven_entrance', label: 'Dwarven Mine Entrance', x: SOUTHERN_MINE_POS.x, z: SOUTHERN_MINE_POS.entranceZ, color: '#cbd5e1' },
  { id: 'dragon_ruins', label: 'Dragon Ruins (Desert Pass)', x: SOUTHERN_DRAGON_RUINS_POS.x, z: SOUTHERN_DRAGON_RUINS_POS.z, color: '#ef4444' },
  { id: 'murky_swamp', label: 'Murky Swamp & Hippo Marsh', x: MURKY_SWAMP_BIOME_POS.x, z: MURKY_SWAMP_BIOME_POS.z, color: '#4ade80' },
  { id: 'croc_lagoon', label: 'Crocodile River Bend', x: CROCODILE_RIVER_BEND_POS.x, z: CROCODILE_RIVER_BEND_POS.z, color: '#22c55e' },
  { id: 'bear_cave', label: 'Bear Mountain Caves', x: BEAR_MOUNTAIN_CAVES[0].x, z: BEAR_MOUNTAIN_CAVES[0].z, color: '#d97706' },
];

const UNDERGROUND_MINE_LANDMARKS: readonly IWorldMapLandmarkPin[] = [
  {
    id: 'mine_portal',
    label: 'Mine Entrance Portal (Surface Exit)',
    x: SOUTHERN_MINE_POS.x,
    z: SOUTHERN_MINE_POS.entranceZ,
    color: '#fbbf24',
  },
  {
    id: 'mine_room1',
    label: 'Room 1 · Dwarven Mess Hall & Rail Hub',
    x: SOUTHERN_MINE_POS.x,
    z: SOUTHERN_MINE_POS.entranceZ + 48,
    color: '#f59e0b',
  },
  {
    id: 'mine_lagoon',
    label: 'Chamber 2 · Waterfall Lagoon & Bridge',
    x: SOUTHERN_MINE_POS.x - 118,
    z: SOUTHERN_MINE_POS.entranceZ + 73,
    color: '#22d3ee',
  },
  {
    id: 'mine_foundry',
    label: 'Chamber 3 · Smelting Foundry',
    x: SOUTHERN_MINE_POS.x + 96,
    z: SOUTHERN_MINE_POS.entranceZ + 73,
    color: '#f97316',
  },
  {
    id: 'mine_moria_bridge',
    label: 'Chamber 4 · Bridge of Khazad-dûm',
    x: SOUTHERN_MINE_POS.x,
    z: SOUTHERN_MINE_POS.entranceZ + 198,
    color: '#e879f9',
  },
  {
    id: 'mine_sanctuary',
    label: 'Royal Dwarven Sanctuary (Deep Moria)',
    x: SOUTHERN_MINE_POS.x,
    z: SOUTHERN_MINE_POS.entranceZ + 238,
    color: '#facc15',
  },
];
// #endregion

// ======================== EXPLORER MINIMAP COMPONENT ======================== \\
// #region Explorer Minimap Component
export const ExplorerMinimap = React.memo<IExplorerMinimapProps>(({
  playerX,
  playerY = 0,
  playerZ,
  yawDeg,
  isPlaying = true,
  godMode = true,
  onTeleportToWorldPos,
}) => {
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullMapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullWorldTerrainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const undergroundMineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenImgDataRef = useRef<ImageData | null>(null);
  const cachedColorsRef = useRef<Uint8Array | null>(null);
  const hasCachedColorRef = useRef<Uint8Array | null>(null);
  const lastRevealPosRef = useRef<{ x: number; z: number }>({ x: 99999, z: 99999 });

  const isPlayerInMine = isPlayerInsideUndergroundMine(playerX, playerY, playerZ);
  const [isFullScreenMapOpen, setIsFullScreenMapOpen] = useState(false);
  const [mapLayer, setMapLayer] = useState<'surface' | 'mine'>(() =>
    isPlayerInMine ? 'mine' : 'surface'
  );
  const [showFullMap, setShowFullMap] = useState<boolean>(true);
  const [mapZoom, setMapZoom] = useState<number>(1.05);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStateRef = useRef<{
    isDown: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    movedDist: number;
  }>({
    isDown: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    movedDist: 0,
  });

  // Helper that computes edge-clamped pan bounds for a given viewport (w, h) and zoom
  const clampPanOffset = useCallback(
    (rawX: number, rawY: number, w: number, h: number, zoom: number) => {
      const effectiveZoom = Math.max(1.0, zoom);
      const mapDrawSize = Math.max(w, h) * effectiveZoom;
      const maxPanX = Math.max(0, (mapDrawSize - w) / 2);
      const maxPanY = Math.max(0, (mapDrawSize - h) / 2);
      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, rawX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, rawY)),
        mapDrawSize,
        maxPanX,
        maxPanY,
      };
    },
    []
  );

  const centerMapOnMineComplex = useCallback(() => {
    const w = fullMapCanvasRef.current?.width || window.innerWidth;
    const h = fullMapCanvasRef.current?.height || window.innerHeight - 60;
    const targetZoom = 2.35;
    const mapDrawSize = Math.max(w, h) * targetZoom;
    const mineCenterX = SOUTHERN_MINE_POS.x;
    const mineCenterZ = SOUTHERN_MINE_POS.entranceZ + 115;
    const normX = (mineCenterX + MAP_WORLD_HALF) / (MAP_WORLD_HALF * 2);
    const normZ = (mineCenterZ + MAP_WORLD_HALF) / (MAP_WORLD_HALF * 2);
    const desiredPanX = (0.5 - normX) * mapDrawSize;
    const desiredPanY = (0.5 - normZ) * mapDrawSize;
    const clamped = clampPanOffset(desiredPanX, desiredPanY, w, h, targetZoom);
    setMapZoom(targetZoom);
    setPanOffset({ x: clamped.x, y: clamped.y });
  }, [clampPanOffset]);

  // Automatically sync active map layer when the player enters or exits the underground mine
  const prevInMineRef = useRef(isPlayerInMine);
  useEffect(() => {
    if (prevInMineRef.current !== isPlayerInMine) {
      prevInMineRef.current = isPlayerInMine;
      setMapLayer(isPlayerInMine ? 'mine' : 'surface');
      if (isPlayerInMine) {
        centerMapOnMineComplex();
      } else {
        setMapZoom(1.05);
        setPanOffset({ x: 0, y: 0 });
      }
    }
  }, [isPlayerInMine, centerMapOnMineComplex]);

  const prevMapOpenRef = useRef(isFullScreenMapOpen);
  // Sync body dataset flag so WorldCanvas ignores gameplay clicks/movement while Full-Screen Map is open
  useEffect(() => {
    const active = isPlaying && isFullScreenMapOpen;
    document.body.dataset.worldMapModalOpen = active ? 'true' : 'false';
    if (active && !prevMapOpenRef.current) {
      const targetLayer = isPlayerInMine ? 'mine' : 'surface';
      setMapLayer(targetLayer);
      if (targetLayer === 'mine') {
        centerMapOnMineComplex();
      }
    }
    if (active && document.pointerLockElement) {
      document.exitPointerLock?.();
    } else if (!active && prevMapOpenRef.current && isPlaying) {
      window.dispatchEvent(new CustomEvent('reacquire-pointer-lock'));
    }
    prevMapOpenRef.current = isFullScreenMapOpen;
    return () => {
      document.body.dataset.worldMapModalOpen = 'false';
    };
  }, [isPlaying, isFullScreenMapOpen, isPlayerInMine, centerMapOnMineComplex]);

  // Listen for [M] key to toggle the Full-Screen World Map
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (document.body.dataset.skyrimModalOpen === 'true') return;
      if (e.code === 'KeyM' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullScreenMapOpen((prev) => !prev);
      } else if (e.code === 'Escape' && isFullScreenMapOpen) {
        setIsFullScreenMapOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, isFullScreenMapOpen]);

  // Initialize persistent Fog-of-War offscreen canvas and cached color arrays once,
  // and listen for 'reset-world-minimap' to clear explored Fog-of-War cells on world reset.
  useEffect(() => {
    const initOrClearFogCanvas = (clear: boolean) => {
      let off = offscreenCanvasRef.current;
      if (!off) {
        off = document.createElement('canvas');
        off.width = GRID_SIZE;
        off.height = GRID_SIZE;
        offscreenCanvasRef.current = off;
      }
      const ctx = off.getContext('2d');
      if (!ctx) return;

      // Fill with unexplored dark slate-parchment fog color
      ctx.fillStyle = '#151310';
      ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);

      offscreenImgDataRef.current = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
      // S4: keep a restored grid; a reset (clear) or a missing grid starts unexplored.
      if (clear || !mapExplorationState.revealed || mapExplorationState.revealed.length !== GRID_SIZE * GRID_SIZE) {
        mapExplorationState.revealed = new Uint8Array(GRID_SIZE * GRID_SIZE);
      }
      if (!cachedColorsRef.current) {
        cachedColorsRef.current = new Uint8Array(GRID_SIZE * GRID_SIZE * 3);
      }
      if (!hasCachedColorRef.current) {
        hasCachedColorRef.current = new Uint8Array(GRID_SIZE * GRID_SIZE);
      }
      lastRevealPosRef.current = { x: 99999, z: 99999 };
    };

    initOrClearFogCanvas(false);
    const onReset = () => initOrClearFogCanvas(true);
    window.addEventListener('reset-world-minimap', onReset);
    return () => {
      window.removeEventListener('reset-world-minimap', onReset);
    };
  }, []);

  // S4: paint the explored cells from a loaded save (on mount, and when a save is loaded while the map is open).
  useEffect(() => {
    const repaintExplored = () => {
      const revealed = mapExplorationState.revealed;
      const imgData = offscreenImgDataRef.current;
      const off = offscreenCanvasRef.current;
      if (!revealed || !imgData || !off) return;
      let hasExplored = false;
      for (let i = 0; i < revealed.length; i++) {
        if (revealed[i] !== 0) {
          hasExplored = true;
          break;
        }
      }
      if (!hasExplored) return;
      const ctx = off.getContext('2d');
      if (!ctx) return;
      const data = imgData.data;
      for (let i = 0; i < revealed.length; i++) {
        const level = revealed[i];
        const p = i * 4;
        if (level === 0) {
          data[p] = 21;
          data[p + 1] = 19;
          data[p + 2] = 16;
          data[p + 3] = 255;
          continue;
        }
        const wx = ((i % GRID_SIZE) + 0.5) * METERS_PER_CELL - MAP_WORLD_HALF;
        const wz = (Math.floor(i / GRID_SIZE) + 0.5) * METERS_PER_CELL - MAP_WORLD_HALF;
        const [r, g, b] = sampleMinimapColorAt(wx, wz);
        const alpha = level / 255;
        data[p] = Math.round(21 * (1 - alpha) + r * alpha);
        data[p + 1] = Math.round(19 * (1 - alpha) + g * alpha);
        data[p + 2] = Math.round(16 * (1 - alpha) + b * alpha);
        data[p + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    };
    repaintExplored();
    window.addEventListener('map-exploration-loaded', repaintExplored);
    return () => window.removeEventListener('map-exploration-loaded', repaintExplored);
  }, []);

  // Lazily build the full-world topographic terrain texture the first time the Full-Screen Map is opened
  const ensureFullWorldTerrainCanvas = useCallback(() => {
    if (fullWorldTerrainCanvasRef.current) return fullWorldTerrainCanvasRef.current;
    const fullOff = document.createElement('canvas');
    fullOff.width = FULL_MAP_GRID_SIZE;
    fullOff.height = FULL_MAP_GRID_SIZE;
    const ctx = fullOff.getContext('2d');
    if (!ctx) return null;

    const img = ctx.createImageData(FULL_MAP_GRID_SIZE, FULL_MAP_GRID_SIZE);
    for (let cz = 0; cz < FULL_MAP_GRID_SIZE; cz++) fillFullWorldTerrainRow(img.data, cz);
    ctx.putImageData(img, 0, 0);
    fullWorldTerrainCanvasRef.current = fullOff;
    return fullOff;
  }, []);

  // Builds the full-world terrain in small slices only when the full map is opened, avoiding 270 main-thread timers during startup.
  useEffect(() => {
    if (!isFullScreenMapOpen || fullWorldTerrainCanvasRef.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let canvas: HTMLCanvasElement | null = null;
    let img: ImageData | null = null;
    let nextRow = 0;
    const step = () => {
      if (cancelled || fullWorldTerrainCanvasRef.current) return;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = FULL_MAP_GRID_SIZE;
        canvas.height = FULL_MAP_GRID_SIZE;
        const c = canvas.getContext('2d');
        if (!c) return;
        img = c.createImageData(FULL_MAP_GRID_SIZE, FULL_MAP_GRID_SIZE);
      }
      const end = Math.min(FULL_MAP_GRID_SIZE, nextRow + FULL_MAP_BUILD_ROWS_PER_SLICE);
      for (let cz = nextRow; cz < end; cz++) fillFullWorldTerrainRow(img!.data, cz);
      nextRow = end;
      if (nextRow >= FULL_MAP_GRID_SIZE) {
        canvas!.getContext('2d')?.putImageData(img!, 0, 0);
        fullWorldTerrainCanvasRef.current = canvas;
        return;
      }
      timer = setTimeout(step, 0);
    };
    timer = setTimeout(step, FULL_MAP_BUILD_START_DELAY_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isFullScreenMapOpen]);

  // Lazily build the dedicated Underground Dwarven Mine (Moria) floorplan canvas
  const ensureUndergroundMineCanvas = useCallback(() => {
    if (undergroundMineCanvasRef.current) return undergroundMineCanvasRef.current;
    const mineOff = document.createElement('canvas');
    mineOff.width = GRID_SIZE;
    mineOff.height = GRID_SIZE;
    const ctx = mineOff.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#121014';
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);

    const img = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
    const data = img.data;
    const minCx = Math.max(0, Math.floor((-240 + MAP_WORLD_HALF) / METERS_PER_CELL));
    const maxCx = Math.min(GRID_SIZE - 1, Math.ceil((120 + MAP_WORLD_HALF) / METERS_PER_CELL));
    const minCz = Math.max(0, Math.floor((420 + MAP_WORLD_HALF) / METERS_PER_CELL));
    const maxCz = Math.min(GRID_SIZE - 1, Math.ceil((730 + MAP_WORLD_HALF) / METERS_PER_CELL));

    for (let cz = minCz; cz <= maxCz; cz++) {
      const wz = (cz + 0.5) * METERS_PER_CELL - MAP_WORLD_HALF;
      const rowOffset = cz * GRID_SIZE;
      for (let cx = minCx; cx <= maxCx; cx++) {
        const wx = (cx + 0.5) * METERS_PER_CELL - MAP_WORLD_HALF;
        const [r, g, b] = sampleUndergroundMineMapColorAt(wx, wz);
        const pIdx = (rowOffset + cx) * 4;
        data[pIdx] = r;
        data[pIdx + 1] = g;
        data[pIdx + 2] = b;
        data[pIdx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    undergroundMineCanvasRef.current = mineOff;
    return mineOff;
  }, []);

  useEffect(() => {
    const displayCanvas = displayCanvasRef.current;
    const offCanvas = offscreenCanvasRef.current;
    const imgData = offscreenImgDataRef.current;
    const revealed = mapExplorationState.revealed;
    if (!displayCanvas || !offCanvas || !imgData || !revealed) return;

    const offCtx = offCanvas.getContext('2d');
    const dispCtx = displayCanvas.getContext('2d');
    if (!offCtx || !dispCtx) return;

    // 1. Reveal surface cells within DISCOVERY_RADIUS_M around (playerX, playerZ) when on the surface
    const movedDist = Math.hypot(
      playerX - lastRevealPosRef.current.x,
      playerZ - lastRevealPosRef.current.z
    );
    if (!isPlayerInMine && movedDist >= 6.0) {
      lastRevealPosRef.current = { x: playerX, z: playerZ };

      const centerCellX = Math.floor((playerX + MAP_WORLD_HALF) / METERS_PER_CELL);
      const centerCellZ = Math.floor((playerZ + MAP_WORLD_HALF) / METERS_PER_CELL);
      const cellRadius = Math.ceil(DISCOVERY_RADIUS_M / METERS_PER_CELL);

      const minCx = Math.max(0, centerCellX - cellRadius);
      const maxCx = Math.min(GRID_SIZE - 1, centerCellX + cellRadius);
      const minCz = Math.max(0, centerCellZ - cellRadius);
      const maxCz = Math.min(GRID_SIZE - 1, centerCellZ + cellRadius);

      let dirty = false;
      const data = imgData.data;
      const cachedColors = cachedColorsRef.current;
      const hasCached = hasCachedColorRef.current;
      const maxDistSq = DISCOVERY_RADIUS_M * DISCOVERY_RADIUS_M;

      for (let cz = minCz; cz <= maxCz; cz++) {
        const wz = (cz + 0.5) * METERS_PER_CELL - MAP_WORLD_HALF;
        const dz = wz - playerZ;
        const dzSq = dz * dz;
        const rowOffset = cz * GRID_SIZE;
        for (let cx = minCx; cx <= maxCx; cx++) {
          const cellIdx = rowOffset + cx;
          if (revealed[cellIdx] === 255) continue;

          const wx = (cx + 0.5) * METERS_PER_CELL - MAP_WORLD_HALF;
          const dx = wx - playerX;
          const distSq = dx * dx + dzSq;
          if (distSq > maxDistSq) continue;

          // Smooth fog-of-war transition edge between 32m and 46m
          const edgeT =
            distSq <= 32 * 32
              ? 1.0
              : Math.max(0, 1.0 - (Math.sqrt(distSq) - 32) / (DISCOVERY_RADIUS_M - 32));
          const newLevel = Math.round(edgeT * 255);

          if (newLevel > revealed[cellIdx]) {
            revealed[cellIdx] = newLevel;
            let r: number;
            let g: number;
            let b: number;
            const cIdx = cellIdx * 3;

            if (hasCached && cachedColors && hasCached[cellIdx] === 1) {
              r = cachedColors[cIdx];
              g = cachedColors[cIdx + 1];
              b = cachedColors[cIdx + 2];
            } else {
              [r, g, b] = sampleMinimapColorAt(wx, wz);
              if (hasCached && cachedColors) {
                cachedColors[cIdx] = r;
                cachedColors[cIdx + 1] = g;
                cachedColors[cIdx + 2] = b;
                hasCached[cellIdx] = 1;
              }
            }

            const alpha = newLevel / 255;
            // Blend topographic color over dark fog base (#151310 -> 21, 19, 16)
            const pIdx = cellIdx * 4;
            data[pIdx] = Math.round(21 * (1 - alpha) + r * alpha);
            data[pIdx + 1] = Math.round(19 * (1 - alpha) + g * alpha);
            data[pIdx + 2] = Math.round(16 * (1 - alpha) + b * alpha);
            data[pIdx + 3] = 255;
            dirty = true;
          }
        }
      }

      if (dirty) {
        offCtx.putImageData(
          imgData,
          0,
          0,
          minCx,
          minCz,
          maxCx - minCx + 1,
          maxCz - minCz + 1
        );
      }
    }

    // 2. Render Player-Centered Scrolling Viewport on Display Canvas (automatically switches to Underground Mine Map when inside the mine!)
    const w = displayCanvas.width;
    const h = displayCanvas.height;
    const halfW = w / 2;
    const halfH = h / 2;

    dispCtx.save();
    dispCtx.clearRect(0, 0, w, h);

    // Circular clip
    dispCtx.beginPath();
    dispCtx.arc(halfW, halfH, halfW - 2, 0, Math.PI * 2);
    dispCtx.clip();

    // Base unexplored background
    dispCtx.fillStyle = isPlayerInMine ? '#121014' : '#151310';
    dispCtx.fillRect(0, 0, w, h);

    // Source crop rectangle in offscreen canvas centered on player
    const activeRadarCanvas = isPlayerInMine
      ? ensureUndergroundMineCanvas() ?? offCanvas
      : offCanvas;
    const playerOffX = (playerX + MAP_WORLD_HALF) / METERS_PER_CELL;
    const playerOffZ = (playerZ + MAP_WORLD_HALF) / METERS_PER_CELL;
    const windowCells = VIEW_WINDOW_M / METERS_PER_CELL;
    const halfWindowCells = windowCells / 2;

    dispCtx.drawImage(
      activeRadarCanvas,
      playerOffX - halfWindowCells,
      playerOffZ - halfWindowCells,
      windowCells,
      windowCells,
      0,
      0,
      w,
      h
    );

    // Subtle topographic range rings around player (30m and 60m)
    dispCtx.strokeStyle = 'rgba(255, 248, 220, 0.11)';
    dispCtx.lineWidth = 1;
    for (const ringM of [32, 64]) {
      const rPx = (ringM / VIEW_WINDOW_M) * w;
      dispCtx.beginPath();
      dispCtx.arc(halfW, halfH, rPx, 0, Math.PI * 2);
      dispCtx.stroke();
    }

    // 2B. Draw Owned Sailable Ships on Minimap Radar (only on surface)
    if (!isPlayerInMine) {
      const ownedShips = getSpawnedSailableShips();
      for (let i = 0; i < ownedShips.length; i++) {
        const sh = ownedShips[i];
        const dxM = sh.x - playerX;
        const dzM = sh.z - playerZ;
        const sx = halfW + (dxM / VIEW_WINDOW_M) * w;
        const sz = halfH + (dzM / VIEW_WINDOW_M) * h;
        if (Math.hypot(sx - halfW, sz - halfH) <= halfW - 6) {
          dispCtx.fillStyle = '#38bdf8';
          dispCtx.strokeStyle = '#0c0a09';
          dispCtx.lineWidth = 1.8;
          dispCtx.beginPath();
          dispCtx.arc(sx, sz, 4.2, 0, Math.PI * 2);
          dispCtx.fill();
          dispCtx.stroke();
        }
      }
    }

    // 3. Draw Player View-Direction Cone & Heading Arrow at Center
    const yawRad = (yawDeg * Math.PI) / 180;
    const canvasHeadingRad = -yawRad - Math.PI / 2;

    // Soft field-of-view fan cone
    const coneSpread = (58 * Math.PI) / 180;
    const coneRadius = halfW * 0.44;
    const grad = dispCtx.createRadialGradient(halfW, halfH, 2, halfW, halfH, coneRadius);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.42)');
    grad.addColorStop(1, 'rgba(251, 191, 36, 0.0)');

    dispCtx.fillStyle = grad;
    dispCtx.beginPath();
    dispCtx.moveTo(halfW, halfH);
    dispCtx.arc(
      halfW,
      halfH,
      coneRadius,
      canvasHeadingRad - coneSpread / 2,
      canvasHeadingRad + coneSpread / 2
    );
    dispCtx.closePath();
    dispCtx.fill();

    // Directional player chevron at center
    dispCtx.save();
    dispCtx.translate(halfW, halfH);
    dispCtx.rotate(-yawRad); // 0 rad = pointing up (-Y on canvas = North)

    dispCtx.fillStyle = '#fbbf24';
    dispCtx.strokeStyle = '#14120f';
    dispCtx.lineWidth = 2;
    dispCtx.beginPath();
    dispCtx.moveTo(0, -9);
    dispCtx.lineTo(6.5, 7);
    dispCtx.lineTo(0, 3.5);
    dispCtx.lineTo(-6.5, 7);
    dispCtx.closePath();
    dispCtx.fill();
    dispCtx.stroke();
    dispCtx.restore();

    // Soft inner vignette around minimap rim
    const rimGrad = dispCtx.createRadialGradient(halfW, halfH, halfW * 0.72, halfW, halfH, halfW);
    rimGrad.addColorStop(0, 'rgba(15, 13, 10, 0)');
    rimGrad.addColorStop(1, 'rgba(15, 13, 10, 0.65)');
    dispCtx.fillStyle = rimGrad;
    dispCtx.fillRect(0, 0, w, h);

    dispCtx.restore();
  }, [playerX, playerZ, yawDeg, isPlayerInMine, ensureUndergroundMineCanvas]);

  // Render the Full-Screen Interactive World Map whenever it is open
  useEffect(() => {
    if (!isFullScreenMapOpen) return;
    const fullCanvas = fullMapCanvasRef.current;
    if (!fullCanvas) return;

    // Match canvas internal resolution to its displayed CSS size so it fills 100% of the screen with zero black bars
    const rect = fullCanvas.getBoundingClientRect();
    const targetW = Math.max(640, Math.round(rect.width || window.innerWidth));
    const targetH = Math.max(400, Math.round(rect.height || window.innerHeight - 60));
    if (fullCanvas.width !== targetW || fullCanvas.height !== targetH) {
      fullCanvas.width = targetW;
      fullCanvas.height = targetH;
    }

    const ctx = fullCanvas.getContext('2d');
    if (!ctx) return;

    const effectiveShowFullMap = godMode ? showFullMap : false;
    const sourceCanvas =
      mapLayer === 'mine'
        ? ensureUndergroundMineCanvas()
        : effectiveShowFullMap
          ? ensureFullWorldTerrainCanvas()
          : offscreenCanvasRef.current;
    const w = fullCanvas.width;
    const h = fullCanvas.height;
    const halfW = w / 2;
    const halfH = h / 2;

    ctx.save();
    ctx.fillStyle = mapLayer === 'mine' ? '#121014' : '#151310';
    ctx.fillRect(0, 0, w, h);

    // Cover-mode sizing: mapDrawSize is always >= w and >= h so there are NEVER black bars on any side,
    // and panning clamps strictly when a map edge reaches the screen edge!
    const clamped = clampPanOffset(panOffset.x, panOffset.y, w, h, mapZoom);
    const mapDrawSize = clamped.mapDrawSize;
    const mapLeft = halfW - mapDrawSize / 2 + clamped.x;
    const mapTop = halfH - mapDrawSize / 2 + clamped.y;

    if (sourceCanvas) {
      ctx.drawImage(sourceCanvas, mapLeft, mapTop, mapDrawSize, mapDrawSize);
    }

    // Subtle coordinate grid lines every 200m
    ctx.strokeStyle = 'rgba(255, 248, 220, 0.12)';
    ctx.lineWidth = 1;
    for (let m = -800; m <= 800; m += 200) {
      const norm = (m + MAP_WORLD_HALF) / (MAP_WORLD_HALF * 2);
      const gx = mapLeft + norm * mapDrawSize;
      const gz = mapTop + norm * mapDrawSize;
      ctx.beginPath();
      ctx.moveTo(gx, mapTop);
      ctx.lineTo(gx, mapTop + mapDrawSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mapLeft, gz);
      ctx.lineTo(mapLeft + mapDrawSize, gz);
      ctx.stroke();
    }

    // Draw Landmark Pins & Labels for the active map layer (Surface vs Underground Mine)
    const activeLandmarks =
      mapLayer === 'mine' ? UNDERGROUND_MINE_LANDMARKS : WORLD_MAP_LANDMARKS;
    const revealed = mapExplorationState.revealed;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const lm of activeLandmarks) {
      if (mapLayer === 'surface' && !effectiveShowFullMap && revealed) {
        const cx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((lm.x + MAP_WORLD_HALF) / METERS_PER_CELL)));
        const cz = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((lm.z + MAP_WORLD_HALF) / METERS_PER_CELL)));
        if (revealed[cz * GRID_SIZE + cx] < 35) {
          continue;
        }
      }
      const nx = (lm.x + MAP_WORLD_HALF) / (MAP_WORLD_HALF * 2);
      const nz = (lm.z + MAP_WORLD_HALF) / (MAP_WORLD_HALF * 2);
      const px = mapLeft + nx * mapDrawSize;
      const pz = mapTop + nz * mapDrawSize;
      if (px < -60 || px > w + 60 || pz < -40 || pz > h + 40) continue;

      ctx.fillStyle = lm.color;
      ctx.strokeStyle = '#0c0a09';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(px, pz, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label backdrop pill
      const textWidth = ctx.measureText(lm.label).width;
      ctx.fillStyle = 'rgba(12, 10, 8, 0.82)';
      ctx.fillRect(px - textWidth / 2 - 5, pz + 8, textWidth + 10, 17);
      ctx.fillStyle = '#f5f5f4';
      ctx.fillText(lm.label, px, pz + 20);
    }

    // Always draw Owned/Spawned Sailable Ships on the Surface Map
    if (mapLayer === 'surface') {
      const spawnedShips = getSpawnedSailableShips();
      for (let i = 0; i < spawnedShips.length; i++) {
        const sh = spawnedShips[i];
        const nx = (sh.x + MAP_WORLD_HALF) / (MAP_WORLD_HALF * 2);
        const nz = (sh.z + MAP_WORLD_HALF) / (MAP_WORLD_HALF * 2);
        const px = mapLeft + nx * mapDrawSize;
        const pz = mapTop + nz * mapDrawSize;
        if (px < -60 || px > w + 60 || pz < -40 || pz > h + 40) continue;

        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#0c0a09';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(px, pz, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const shipLabel = `⚓ ${sh.name.split(' · ')[0]}`;
        const textWidth = ctx.measureText(shipLabel).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(px - textWidth / 2 - 5, pz - 24, textWidth + 10, 17);
        ctx.fillStyle = '#fde68a';
        ctx.fillText(shipLabel, px, pz - 12);
      }
    }

    // Draw Player Position & Heading Chevron
    const pNormX = (playerX + MAP_WORLD_HALF) / (MAP_WORLD_HALF * 2);
    const pNormZ = (playerZ + MAP_WORLD_HALF) / (MAP_WORLD_HALF * 2);
    const playerPx = mapLeft + pNormX * mapDrawSize;
    const playerPz = mapTop + pNormZ * mapDrawSize;
    const yawRad = (yawDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(playerPx, playerPz);
    ctx.rotate(-yawRad);
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#0c0a09';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(8.5, 9);
    ctx.lineTo(0, 4.5);
    ctx.lineTo(-8.5, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }, [
    isFullScreenMapOpen,
    mapLayer,
    showFullMap,
    godMode,
    mapZoom,
    panOffset,
    playerX,
    playerZ,
    yawDeg,
    ensureFullWorldTerrainCanvas,
    ensureUndergroundMineCanvas,
    clampPanOffset,
  ]);

  const handleFullMapMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const fullCanvas = fullMapCanvasRef.current;
    const w = fullCanvas?.width || window.innerWidth;
    const h = fullCanvas?.height || window.innerHeight - 60;
    const clamped = clampPanOffset(panOffset.x, panOffset.y, w, h, mapZoom);
    dragStateRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: clamped.x,
      startPanY: clamped.y,
      movedDist: 0,
    };
  };

  const handleFullMapMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current.isDown) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    dragStateRef.current.movedDist = Math.max(dragStateRef.current.movedDist, Math.hypot(dx, dy));
    const fullCanvas = fullMapCanvasRef.current;
    const w = fullCanvas?.width || window.innerWidth;
    const h = fullCanvas?.height || window.innerHeight - 60;
    const clamped = clampPanOffset(
      dragStateRef.current.startPanX + dx,
      dragStateRef.current.startPanY + dy,
      w,
      h,
      mapZoom
    );
    setPanOffset({ x: clamped.x, y: clamped.y });
  };

  const handleFullMapMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current.isDown) return;
    const wasClick = dragStateRef.current.movedDist < 6;
    dragStateRef.current.isDown = false;

    if (wasClick && godMode && onTeleportToWorldPos && fullMapCanvasRef.current) {
      const rect = fullMapCanvasRef.current.getBoundingClientRect();
      const scaleX = fullMapCanvasRef.current.width / Math.max(1, rect.width);
      const scaleY = fullMapCanvasRef.current.height / Math.max(1, rect.height);
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;

      const w = fullMapCanvasRef.current.width;
      const h = fullMapCanvasRef.current.height;
      const clamped = clampPanOffset(panOffset.x, panOffset.y, w, h, mapZoom);
      const mapDrawSize = clamped.mapDrawSize;
      const mapLeft = w / 2 - mapDrawSize / 2 + clamped.x;
      const mapTop = h / 2 - mapDrawSize / 2 + clamped.y;

      const normX = (canvasX - mapLeft) / mapDrawSize;
      const normZ = (canvasY - mapTop) / mapDrawSize;
      if (normX >= 0 && normX <= 1 && normZ >= 0 && normZ <= 1) {
        const worldX = Math.round(normX * (MAP_WORLD_HALF * 2) - MAP_WORLD_HALF);
        const worldZ = Math.round(normZ * (MAP_WORLD_HALF * 2) - MAP_WORLD_HALF);
        onTeleportToWorldPos(worldX, worldZ, mapLayer);
        setIsFullScreenMapOpen(false);
      }
    }
  };

  const applyClampedPanDelta = (dx: number, dy: number) => {
    const fullCanvas = fullMapCanvasRef.current;
    const w = fullCanvas?.width || window.innerWidth;
    const h = fullCanvas?.height || window.innerHeight - 60;
    setPanOffset((prev) => {
      const clamped = clampPanOffset(prev.x + dx, prev.y + dy, w, h, mapZoom);
      return { x: clamped.x, y: clamped.y };
    });
  };

  const handleToggleMapLayer = () => {
    setMapLayer((prev) => {
      const next = prev === 'mine' ? 'surface' : 'mine';
      if (next === 'mine') {
        centerMapOnMineComplex();
      } else {
        setMapZoom(1.05);
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  return (
    <>
      <div
        data-testid="explorer-minimap"
        className="fixed bottom-4 left-4 z-20 pointer-events-auto select-none flex items-center justify-center cursor-pointer group"
        style={{
          width: '156px',
          height: '156px',
        }}
        onClick={() => {
          if (isPlaying) setIsFullScreenMapOpen(true);
        }}
        title="Press [M] to open Full-Screen World Map"
        aria-label={t('ui.minimap_aria')}
      >
        <div
          className="relative w-full h-full rounded-full flex items-center justify-center transition-transform group-hover:scale-[1.03]"
          style={{
            backgroundColor: 'rgba(18, 16, 13, 0.92)',
            border: isPlayerInMine
              ? '2px solid rgba(56, 189, 248, 0.65)'
              : '2px solid rgba(217, 119, 6, 0.48)',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.65)',
          }}
        >
          <canvas
            ref={displayCanvasRef}
            width={240}
            height={240}
            className="w-[146px] h-[146px] rounded-full block"
          />

          {/* Cardinal North Marker on Bezel */}
          <div
            className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold text-amber-300 leading-none"
            style={{
              backgroundColor: 'rgba(18, 16, 13, 0.95)',
              border: '1px solid rgba(217, 119, 6, 0.45)',
            }}
          >
            {t('ui.compass_north')}
          </div>

          {/* [M] Full Map Shortcut Hint Badge */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-mono-tabular font-bold text-stone-200 leading-none whitespace-nowrap"
            style={{
              backgroundColor: 'rgba(18, 16, 13, 0.95)',
              border: '1px solid rgba(217, 119, 6, 0.45)',
            }}
          >
            {isPlayerInMine ? '[M] Mine Map' : '[M] Map'}
          </div>
        </div>
      </div>

      {/* Full-Screen Interactive World Map Overlay ([M]) */}
      {isPlaying && isFullScreenMapOpen && (
        <div
          data-testid="fullscreen-world-map"
          role="dialog"
          aria-modal="true"
          aria-label="Full World Map"
          className="fixed inset-0 z-40 flex flex-col bg-stone-950 pointer-events-auto select-none"
        >
          {/* Top Bar */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-amber-500/30"
            style={{ backgroundColor: 'rgba(16, 14, 11, 0.98)' }}
          >
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-xs">
                [M]
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-stone-100 leading-tight">
                  {mapLayer === 'mine'
                    ? 'Underground Dwarven Mine Map (Moria Layer)'
                    : 'World Explorer Map (Surface Layer)'}
                </h2>
                <p className="text-xs text-stone-400">
                  {mapLayer === 'mine'
                    ? 'Subterranean Floorplan · Tunnels, Rail Lines, Lagoon & Great Hall of Khazad-dûm'
                    : 'Overworld Surface Map · Drag to pan'}
                  {godMode ? ' · GOD MODE: Click anywhere on this layer to teleport!' : ''}
                </p>
              </div>
            </div>

            {/* Layer Switch, Fog-of-War Toggle & Pan/Zoom Controls */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                data-testid="fullmap-switch-layer"
                onClick={handleToggleMapLayer}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  mapLayer === 'mine'
                    ? 'bg-sky-500/25 border border-sky-400/60 text-sky-200 hover:bg-sky-500/35'
                    : 'bg-purple-500/25 border border-purple-400/60 text-purple-200 hover:bg-purple-500/35'
                }`}
              >
                {mapLayer === 'mine'
                  ? '↑ Switch to Surface Map (Overworld)'
                  : '↓ Switch to Underground Mine Map'}
              </button>

              {godMode && mapLayer === 'surface' && (
                <button
                  type="button"
                  data-testid="fullmap-toggle-fog"
                  onClick={() => setShowFullMap((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    showFullMap
                      ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/35'
                      : 'bg-amber-500/25 border border-amber-400/50 text-amber-200 hover:bg-amber-500/35'
                  }`}
                >
                  {showFullMap ? 'Full Map (Show Explored Only)' : 'Explored Only (Show Full Map)'}
                </button>
              )}
              <button
                type="button"
                data-testid="fullmap-pan-left"
                onClick={() => applyClampedPanDelta(140, 0)}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 cursor-pointer"
                title="Pan Left"
              >
                ←
              </button>
              <button
                type="button"
                data-testid="fullmap-pan-right"
                onClick={() => applyClampedPanDelta(-140, 0)}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 cursor-pointer"
                title="Pan Right"
              >
                →
              </button>
              <button
                type="button"
                data-testid="fullmap-pan-up"
                onClick={() => applyClampedPanDelta(0, 140)}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 cursor-pointer"
                title="Pan Up"
              >
                ↑
              </button>
              <button
                type="button"
                data-testid="fullmap-pan-down"
                onClick={() => applyClampedPanDelta(0, -140)}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 cursor-pointer"
                title="Pan Down"
              >
                ↓
              </button>
              <button
                type="button"
                data-testid="fullmap-zoom-out"
                onClick={() =>
                  setMapZoom((z) => {
                    const nextZ = Math.max(1.0, Number((z - 0.25).toFixed(2)));
                    const fullCanvas = fullMapCanvasRef.current;
                    const w = fullCanvas?.width || window.innerWidth;
                    const h = fullCanvas?.height || window.innerHeight - 60;
                    setPanOffset((p) => {
                      const c = clampPanOffset(p.x, p.y, w, h, nextZ);
                      return { x: c.x, y: c.y };
                    });
                    return nextZ;
                  })
                }
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 cursor-pointer"
              >
                − Zoom
              </button>
              <button
                type="button"
                data-testid="fullmap-zoom-in"
                onClick={() => setMapZoom((z) => Math.min(3.0, Number((z + 0.25).toFixed(2))))}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 cursor-pointer"
              >
                + Zoom
              </button>
              <button
                type="button"
                data-testid="fullmap-reset-view"
                onClick={() => {
                  if (mapLayer === 'mine') {
                    centerMapOnMineComplex();
                  } else {
                    setPanOffset({ x: 0, y: 0 });
                    setMapZoom(1.05);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-amber-300 cursor-pointer"
              >
                Center
              </button>
              <button
                type="button"
                data-testid="fullmap-close-btn"
                onClick={() => setIsFullScreenMapOpen(false)}
                className="ml-1 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold cursor-pointer"
              >
                Close [M]
              </button>
            </div>
          </div>

          {/* Interactive Draggable & Click-to-Teleport Canvas Viewport (Edge-to-Edge Cover, Zero Black Bars) */}
          <div className="relative flex-1 w-full h-full overflow-hidden">
            <canvas
              ref={fullMapCanvasRef}
              data-testid="fullscreen-world-map-canvas"
              width={1440}
              height={900}
              onMouseDown={handleFullMapMouseDown}
              onMouseMove={handleFullMapMouseMove}
              onMouseUp={handleFullMapMouseUp}
              onMouseLeave={() => {
                dragStateRef.current.isDown = false;
              }}
              className={`w-full h-full block ${
                godMode ? 'cursor-crosshair active:cursor-grabbing' : 'cursor-grab active:cursor-grabbing'
              }`}
            />

            {/* Bottom Coordinate & God Mode Status Pill */}
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl flex items-center gap-3 text-xs font-mono-tabular text-stone-200 pointer-events-none"
              style={{
                backgroundColor: 'rgba(15, 13, 10, 0.92)',
                border: '1px solid rgba(251, 191, 36, 0.45)',
              }}
            >
              <span>
                Player: ({Math.round(playerX)}, {Math.round(playerZ)}) ·{' '}
                {mapLayer === 'mine' ? 'Underground Layer' : 'Surface Layer'}
              </span>
              {godMode && (
                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                  GOD MODE TELEPORT ACTIVE
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});
ExplorerMinimap.displayName = 'ExplorerMinimap';
// #endregion


