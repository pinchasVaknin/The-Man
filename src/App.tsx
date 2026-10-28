// ============================================================================
// MODULE: Application Root Component
// DESIGN: Root shell coordinating canvas, overlay HUD, state, and inputs (SRP)
// SUMMARY: Manages top-level game state (title, playing, paused), audio mute,
//          weather cycles, and binds WorldCanvas with GameShellOverlay.
// ============================================================================

// ======================== IMPORTS & CONSTANTS ======================== \\
// #region Imports & Constants
import { useState, useEffect, useRef, useCallback } from 'react';
import { WORLD_SPAWN, WeatherToggleOption } from './world/terrainMath';
import { WorldCanvas, GameStateMode, TelemetrySnapshot, VirtualMoveState } from './components/WorldCanvas';
import { GameShellOverlay } from './components/GameShellOverlay';

const WEATHER_CYCLE_ORDER: WeatherToggleOption[] = [
  'auto',
  'regional_rain',
  'dense_fog',
  'lightning_storm',
  'clear_clouds',
];
// #endregion

// ======================== ROOT APPLICATION COMPONENT ======================== \\
// #region Root Application Component
export default function App() {
  const [gameState, setGameState] = useState<GameStateMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [muted, setMuted] = useState<boolean>(false);
  const [weatherToggle, setWeatherToggle] = useState<WeatherToggleOption>('auto');

  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    x: WORLD_SPAWN.x,
    y: 2.15,
    z: WORLD_SPAWN.z,
    yawDeg: 0,
    distanceWalked: 0,
    stepCount: 0,
    biome: 'trail',
    walkPace: 'normal',
    timeString: '06:40',
    phaseLabelHe: 'זריחה וערפל בוקר',
    sunElevationDeg: 14,
    pointerLocked: false,
    isFlying: false,
  });

  const virtualMoveRef = useRef<VirtualMoveState>({
    forward: 0,
    right: 0,
    sprint: false,
    relaxed: false,
    jump: false,
  });

  // Sync game state to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const handleStartGame = useCallback(() => {
    document.body.dataset.state = 'playing';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setGameState('playing');
  }, []);

  const handleResumeGame = useCallback(() => {
    document.body.dataset.state = 'playing';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setGameState('playing');
  }, []);

  const handleReturnToTitle = useCallback(() => {
    document.body.dataset.state = 'title';
    setGameState('title');
  }, []);

  const handleTogglePause = useCallback(() => {
    setGameState((prev) => {
      const next = prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev;
      document.body.dataset.state = next;
      return next;
    });
  }, []);

  const handleCycleWeather = useCallback(() => {
    setWeatherToggle((prev) => {
      const idx = WEATHER_CYCLE_ORDER.indexOf(prev);
      return WEATHER_CYCLE_ORDER[(idx + 1) % WEATHER_CYCLE_ORDER.length];
    });
  }, []);

  // Global keyboard shortcuts for Title Start (Enter/Space), Mute (M), and Weather Cycle (V)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStartGame();
        return;
      }
      if (e.code === 'KeyM') {
        setMuted((prev) => !prev);
      }
      if (e.code === 'KeyV') {
        handleCycleWeather();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, handleStartGame, handleCycleWeather]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 select-none">
      <WorldCanvas
        gameState={gameState}
        muted={muted}
        weatherToggle={weatherToggle}
        onTelemetryUpdate={setTelemetry}
        onRequestPauseToggle={handleTogglePause}
        virtualMoveRef={virtualMoveRef}
      />

      <GameShellOverlay
        gameState={gameState}
        telemetry={telemetry}
        muted={muted}
        weatherToggle={weatherToggle}
        onStartGame={handleStartGame}
        onResumeGame={handleResumeGame}
        onReturnToTitle={handleReturnToTitle}
        onTogglePause={handleTogglePause}
        onToggleMute={() => setMuted((m) => !m)}
        onCycleWeather={handleCycleWeather}
        onSelectWeather={setWeatherToggle}
        virtualMoveRef={virtualMoveRef}
      />
    </div>
  );
}
// #endregion
