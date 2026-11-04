// ============================================================================
// MODULE: Components / Explorer Minimap
// DESIGN: Humble UI circular minimap HUD with Fog-of-War parchment discovery (SRP)
// SUMMARY: Renders an offscreen 2D canvas map tracking player coordinates, heading
//          compass arrow, cardinal North indicator, and dynamic cell discovery.
// ============================================================================

// ======================== IMPORTS & PROPS ======================== \\
// #region Imports & Props
import { t } from '../locales';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sampleMinimapColorAt } from '../world/terrainMath';
import {
  BEAR_MOUNTAIN_CAVES,
  CHINESE_FORTRESS_POS,
  CROCODILE_RIVER_BEND_POS,
  DESERT_PYRAMID_SANCTUARY_POS,
  FLOATING_BLOOMING_ISLANDS,
  HUNTER_LODGE_POS,
  NORDIC_FROST_SHRINE_POS,
  RUINED_ATLANTIS_POS,
  SAILABLE_SHIP_INITIAL_POS,
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
  playerZ: number;
  yawDeg: number;
  isPlaying?: boolean;
  godMode?: boolean;
  onTeleportToWorldPos?: (worldX: number, worldZ: number) => void;
}

const MAP_WORLD_HALF = 1080; // -1080m .. +1080m covers the expanded world & deep-sea Ruined Atlantis at (980, 420)
const METERS_PER_CELL = 2;  // 2m per pixel cell -> 1080 x 1080 offscreen map
const GRID_SIZE = Math.floor((MAP_WORLD_HALF * 2) / METERS_PER_CELL); // 1080
const DISCOVERY_RADIUS_M = 46; // Reveal radius around the player in meters
const VIEW_WINDOW_M = 180; // Visible meters across the minimap diameter
const FULL_MAP_GRID_METERS = 4; // 4m per pixel cell for full-world overview texture (540x540)
const FULL_MAP_GRID_SIZE = Math.floor((MAP_WORLD_HALF * 2) / FULL_MAP_GRID_METERS);

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
  { id: 'sailable_ship', label: 'Sailable Ship', x: SAILABLE_SHIP_INITIAL_POS.homeX, z: SAILABLE_SHIP_INITIAL_POS.homeZ, color: '#f59e0b' },
  { id: 'smuggler_cove', label: 'Corsair Smuggler Cove', x: SMUGGLER_ISLAND_POS.x, z: SMUGGLER_ISLAND_POS.z, color: '#fb7185' },
  { id: 'atlantis', label: 'Ruined Atlantis', x: RUINED_ATLANTIS_POS.x, z: RUINED_ATLANTIS_POS.z, color: '#06b6d4' },
  { id: 'oasis', label: 'Desert Oasis', x: SOUTHWEST_OASIS_POS.x, z: SOUTHWEST_OASIS_POS.z, color: '#facc15' },
  { id: 'sun_pyramid', label: 'Ancient Sun Pyramid & Sphinx', x: DESERT_PYRAMID_SANCTUARY_POS.x, z: DESERT_PYRAMID_SANCTUARY_POS.z, color: '#eab308' },
  { id: 'volcano', label: 'Volcano Sanctum (King Lion)', x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z, color: '#f97316' },
  { id: 'sky_islands', label: 'Floating Sky Islands', x: FLOATING_BLOOMING_ISLANDS[0].x, z: FLOATING_BLOOMING_ISLANDS[0].z, color: '#e879f9' },
  { id: 'dwarven', label: 'Dwarven Kingdom', x: SOUTHERN_MINE_POS.x, z: SOUTHERN_MINE_POS.z, color: '#cbd5e1' },
  { id: 'dragon_ruins', label: 'Dragon Ruins (Desert Pass)', x: SOUTHERN_DRAGON_RUINS_POS.x, z: SOUTHERN_DRAGON_RUINS_POS.z, color: '#ef4444' },
  { id: 'croc_lagoon', label: 'Crocodile River Bend', x: CROCODILE_RIVER_BEND_POS.x, z: CROCODILE_RIVER_BEND_POS.z, color: '#22c55e' },
  { id: 'bear_cave', label: 'Bear Mountain Caves', x: BEAR_MOUNTAIN_CAVES[0].x, z: BEAR_MOUNTAIN_CAVES[0].z, color: '#d97706' },
];
// #endregion

// ======================== EXPLORER MINIMAP COMPONENT ======================== \\
// #region Explorer Minimap Component
export const ExplorerMinimap = React.memo<IExplorerMinimapProps>(({
  playerX,
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
  const offscreenImgDataRef = useRef<ImageData | null>(null);
  const revealedLevelRef = useRef<Uint8Array | null>(null);
  const cachedColorsRef = useRef<Uint8Array | null>(null);
  const hasCachedColorRef = useRef<Uint8Array | null>(null);
  const lastRevealPosRef = useRef<{ x: number; z: number }>({ x: 99999, z: 99999 });

  const [isFullScreenMapOpen, setIsFullScreenMapOpen] = useState(false);
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

  // Sync body dataset flag so WorldCanvas ignores gameplay clicks/movement while Full-Screen Map is open
  useEffect(() => {
    const active = isPlaying && isFullScreenMapOpen;
    document.body.dataset.worldMapModalOpen = active ? 'true' : 'false';
    if (active && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    return () => {
      document.body.dataset.worldMapModalOpen = 'false';
    };
  }, [isPlaying, isFullScreenMapOpen]);

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

  // Initialize persistent Fog-of-War offscreen canvas and cached color arrays once
  useEffect(() => {
    const off = document.createElement('canvas');
    off.width = GRID_SIZE;
    off.height = GRID_SIZE;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    // Fill with unexplored dark slate-parchment fog color
    ctx.fillStyle = '#151310';
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);

    offscreenCanvasRef.current = off;
    offscreenImgDataRef.current = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
    revealedLevelRef.current = new Uint8Array(GRID_SIZE * GRID_SIZE);
    cachedColorsRef.current = new Uint8Array(GRID_SIZE * GRID_SIZE * 3);
    hasCachedColorRef.current = new Uint8Array(GRID_SIZE * GRID_SIZE);
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
    const data = img.data;
    for (let cz = 0; cz < FULL_MAP_GRID_SIZE; cz++) {
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
    ctx.putImageData(img, 0, 0);
    fullWorldTerrainCanvasRef.current = fullOff;
    return fullOff;
  }, []);

  useEffect(() => {
    const displayCanvas = displayCanvasRef.current;
    const offCanvas = offscreenCanvasRef.current;
    const imgData = offscreenImgDataRef.current;
    const revealed = revealedLevelRef.current;
    if (!displayCanvas || !offCanvas || !imgData || !revealed) return;

    const offCtx = offCanvas.getContext('2d');
    const dispCtx = displayCanvas.getContext('2d');
    if (!offCtx || !dispCtx) return;

    // 1. Reveal cells within DISCOVERY_RADIUS_M around (playerX, playerZ) when player moves >= 6.0m
    const movedDist = Math.hypot(
      playerX - lastRevealPosRef.current.x,
      playerZ - lastRevealPosRef.current.z
    );
    if (movedDist >= 6.0) {
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

    // 2. Render Player-Centered Scrolling Viewport on Display Canvas
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
    dispCtx.fillStyle = '#151310';
    dispCtx.fillRect(0, 0, w, h);

    // Source crop rectangle in offscreen canvas centered on player
    const playerOffX = (playerX + MAP_WORLD_HALF) / METERS_PER_CELL;
    const playerOffZ = (playerZ + MAP_WORLD_HALF) / METERS_PER_CELL;
    const windowCells = VIEW_WINDOW_M / METERS_PER_CELL;
    const halfWindowCells = windowCells / 2;

    dispCtx.drawImage(
      offCanvas,
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
  }, [playerX, playerZ, yawDeg]);

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
    const sourceCanvas = effectiveShowFullMap ? ensureFullWorldTerrainCanvas() : offscreenCanvasRef.current;
    const w = fullCanvas.width;
    const h = fullCanvas.height;
    const halfW = w / 2;
    const halfH = h / 2;

    ctx.save();
    ctx.fillStyle = '#151310';
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

    // Draw Landmark Pins & Labels (when in Discovered-Only mode, only show landmarks that have been explored!)
    const revealed = revealedLevelRef.current;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const lm of WORLD_MAP_LANDMARKS) {
      if (!effectiveShowFullMap && revealed) {
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
      ctx.fillStyle = 'rgba(12, 10, 8, 0.78)';
      ctx.fillRect(px - textWidth / 2 - 5, pz + 8, textWidth + 10, 17);
      ctx.fillStyle = '#f5f5f4';
      ctx.fillText(lm.label, px, pz + 20);
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
    showFullMap,
    godMode,
    mapZoom,
    panOffset,
    playerX,
    playerZ,
    yawDeg,
    ensureFullWorldTerrainCanvas,
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
        onTeleportToWorldPos(worldX, worldZ);
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
            border: '2px solid rgba(217, 119, 6, 0.48)',
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
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-mono-tabular font-bold text-stone-200 leading-none"
            style={{
              backgroundColor: 'rgba(18, 16, 13, 0.95)',
              border: '1px solid rgba(217, 119, 6, 0.45)',
            }}
          >
            [M] Map
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
                  World Explorer Map
                </h2>
                <p className="text-xs text-stone-400">
                  Drag to pan to map edges
                  {godMode ? ' · GOD MODE: Click anywhere on the map to teleport immediately!' : ''}
                </p>
              </div>
            </div>

            {/* Fog-of-War Toggle & Pan/Zoom Controls */}
            <div className="flex flex-wrap items-center gap-1.5">
              {godMode && (
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
                  setPanOffset({ x: 0, y: 0 });
                  setMapZoom(1.05);
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
                Player: ({Math.round(playerX)}, {Math.round(playerZ)})
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

