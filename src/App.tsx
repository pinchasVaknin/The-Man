// ============================================================================
// MODULE: Application Root Component
// DESIGN: Root shell coordinating canvas, overlay HUD, state, and inputs (SRP)
// SUMMARY: Manages top-level game state (title, playing, paused), audio mute,
//          weather cycles, and binds WorldCanvas with GameShellOverlay.
// ============================================================================

// ======================== IMPORTS & CONSTANTS ======================== \\
// #region Imports & Constants
import { useState, useEffect, useRef, useCallback } from 'react';
import { WeatherToggleOption, type IGameActions } from './world/terrainMath';
import { WorldCanvas, GameStateMode, IVirtualMoveState } from './components/WorldCanvas';
import { GameShellOverlay } from './components/GameShellOverlay';
import { telemetryStore } from './core/telemetryStore';

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

  const [isLabOpen, setIsLabOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('lab') === '1') {
        return true;
      }
    }
    return false;
  });

  const [muted, setMuted] = useState<boolean>(false);
  const [weatherToggle, setWeatherToggle] = useState<WeatherToggleOption>('auto');
  const [gameActions, setGameActions] = useState<IGameActions | null>(null);

  const virtualMoveRef = useRef<IVirtualMoveState>({
    forward: 0,
    right: 0,
    sprint: false,
    relaxed: false,
    jump: false,
  });

  // Sync game state to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = isLabOpen ? 'lab' : gameState;
  }, [gameState, isLabOpen]);

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
    if (isLabOpen) return;
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
  }, [gameState, isLabOpen, handleStartGame, handleCycleWeather]);

  if (isLabOpen) {
    return <CharacterLabView onClose={() => setIsLabOpen(false)} />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 select-none">
      <WorldCanvas
        gameState={gameState}
        muted={muted}
        weatherToggle={weatherToggle}
        onTelemetryUpdate={telemetryStore.setSnapshot}
        onRequestPauseToggle={handleTogglePause}
        virtualMoveRef={virtualMoveRef}
        onRegisterGameActions={setGameActions}
      />

      <GameShellOverlay
        gameState={gameState}
        muted={muted}
        weatherToggle={weatherToggle}
        onStartGame={handleStartGame}
        onResumeGame={handleResumeGame}
        onReturnToTitle={handleReturnToTitle}
        onTogglePause={handleTogglePause}
        onToggleMute={() => setMuted((m) => !m)}
        onCycleWeather={handleCycleWeather}
        onSelectWeather={setWeatherToggle}
        onOpenLab={() => setIsLabOpen(true)}
        virtualMoveRef={virtualMoveRef}
        gameActions={gameActions}
      />
    </div>
  );
}
// #endregion
