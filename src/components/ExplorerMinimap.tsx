import React, { useEffect, useRef } from 'react';
import { sampleMinimapColorAt } from '../world/terrainMath';

export interface ExplorerMinimapProps {
  playerX: number;
  playerZ: number;
  yawDeg: number;
}

const MAP_WORLD_HALF = 680; // -680m .. +680m
const METERS_PER_CELL = 2;  // 2m per pixel cell -> 680 x 680 offscreen map
const GRID_SIZE = Math.floor((MAP_WORLD_HALF * 2) / METERS_PER_CELL); // 680
const DISCOVERY_RADIUS_M = 46; // Reveal radius around the player in meters
const VIEW_WINDOW_M = 180; // Visible meters across the minimap diameter

export const ExplorerMinimap: React.FC<ExplorerMinimapProps> = ({
  playerX,
  playerZ,
  yawDeg,
}) => {
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenImgDataRef = useRef<ImageData | null>(null);
  const revealedLevelRef = useRef<Uint8Array | null>(null);
  const lastRevealPosRef = useRef<{ x: number; z: number }>({ x: 99999, z: 99999 });

  // Initialize persistent Fog-of-War offscreen canvas once
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

    // 1. Reveal cells within DISCOVERY_RADIUS_M around (playerX, playerZ) when player moves >= 3.0m
    const movedDist = Math.hypot(
      playerX - lastRevealPosRef.current.x,
      playerZ - lastRevealPosRef.current.z
    );
    if (movedDist >= 3.0) {
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

      for (let cz = minCz; cz <= maxCz; cz++) {
        const wz = (cz + 0.5) * METERS_PER_CELL - MAP_WORLD_HALF;
        const dz = wz - playerZ;
        for (let cx = minCx; cx <= maxCx; cx++) {
          const wx = (cx + 0.5) * METERS_PER_CELL - MAP_WORLD_HALF;
          const dist = Math.hypot(wx - playerX, dz);
          if (dist > DISCOVERY_RADIUS_M) continue;

          // Smooth fog-of-war transition edge between 32m and 46m
          const edgeT =
            dist <= 32
              ? 1.0
              : Math.max(0, 1.0 - (dist - 32) / (DISCOVERY_RADIUS_M - 32));
          const newLevel = Math.round(edgeT * 255);
          const cellIdx = cz * GRID_SIZE + cx;

          if (newLevel > revealed[cellIdx]) {
            revealed[cellIdx] = newLevel;
            const [r, g, b] = sampleMinimapColorAt(wx, wz);
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
    // Note: in Three.js, yaw = 0 faces North (-Z, top of map). Positive yaw rotates counter-clockwise (West).
    // So canvas angle from North (up = -PI/2) is (-yawRad - PI/2).
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

  return (
    <div
      data-testid="explorer-minimap"
      className="fixed bottom-4 left-4 z-20 pointer-events-none select-none flex items-center justify-center"
      style={{
        width: '156px',
        height: '156px',
      }}
      aria-label="מפת סביבה וכיוון"
    >
      <div
        className="relative w-full h-full rounded-full flex items-center justify-center"
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
          N
        </div>
      </div>
    </div>
  );
};
