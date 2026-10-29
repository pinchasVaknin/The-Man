// ============================================================================
// MODULE: Lab / Character & Animation Laboratory Shell View
// DESIGN: 100% Decoupled Studio UI — Left Entity Browser, Center 3D Stage,
//         Right Animation & Skin Inspector with Tab Switcher
// SUMMARY: Full-screen interactive laboratory for inspecting all world
//          characters, humans, animals, and mythic creatures, their animations
//          (starting with static 'none'), and their skin variants.
// ============================================================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DEFAULT_LAB_POSE_OVERRIDES,
  LAB_CATEGORIES,
  LAB_ENTITIES,
  countActivePoseOverrides,
  createInitialLabSessionState,
  filterLabEntities,
  getEntityEditorLabelsHe,
  getLabAnimationForEntity,
  getLabEntityById,
  getLabSkinForEntity,
  selectLabCategory,
  selectLabEntity,
  type ILabPoseOverrides,
  type ILabSessionState,
  type LabCameraPreset,
  type LabCategoryFilter,
  type LabEquipmentVisibilityMode,
  type LabStageEnvironment,
} from './labCatalog';
import { CharacterLabCanvas } from './CharacterLabCanvas';

export interface ICharacterLabViewProps {
  readonly onClose: () => void;
}

const SPEED_OPTIONS: readonly number[] = [0.25, 0.5, 1.0, 1.5, 2.0];

const CAMERA_PRESETS: readonly { id: LabCameraPreset; labelHe: string }[] = [
  { id: 'angle', labelHe: 'תלת־ממד' },
  { id: 'front', labelHe: 'חזית' },
  { id: 'side', labelHe: 'צד' },
  { id: 'back', labelHe: 'גב' },
  { id: 'closeup', labelHe: 'תקריב' },
];

const ENVIRONMENT_PRESETS: readonly { id: LabStageEnvironment; labelHe: string }[] = [
  { id: 'studio_day', labelHe: 'אולפן יום' },
  { id: 'golden_sunset', labelHe: 'שקיעה זהובה' },
  { id: 'moonlit_night', labelHe: 'לילה וירח' },
];

export const CharacterLabView: React.FC<ICharacterLabViewProps> = ({ onClose }) => {
  const [session, setSession] = useState<ILabSessionState>(() =>
    createInitialLabSessionState()
  );
  const [rigStats, setRigStats] = useState<{ meshCount: number; triangleCount: number }>({
    meshCount: 0,
    triangleCount: 0,
  });
  const [livePhase, setLivePhase] = useState<number>(0);
  const [cameraResetNonce, setCameraResetNonce] = useState<number>(0);
  const [snapshotTriggerNonce, setSnapshotTriggerNonce] = useState<number>(0);
  const [copiedTweaksFeedback, setCopiedTweaksFeedback] = useState<boolean>(false);

  const [poseOverridesByEntity, setPoseOverridesByEntity] = useState<
    Record<string, ILabPoseOverrides>
  >(() => {
    try {
      const saved = window.localStorage.getItem('lab_pose_overrides_v1');
      if (saved) {
        return JSON.parse(saved) as Record<string, ILabPoseOverrides>;
      }
    } catch {
      // Ignore storage errors
    }
    return {};
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'lab_pose_overrides_v1',
        JSON.stringify(poseOverridesByEntity)
      );
    } catch {
      // Ignore storage errors
    }
  }, [poseOverridesByEntity]);

  const activeEntity = useMemo(
    () => getLabEntityById(session.selectedEntityId),
    [session.selectedEntityId]
  );

  const activeAnimation = useMemo(
    () => getLabAnimationForEntity(activeEntity, session.selectedAnimationId),
    [activeEntity, session.selectedAnimationId]
  );

  const activeSkin = useMemo(
    () => getLabSkinForEntity(activeEntity, session.selectedSkinId),
    [activeEntity, session.selectedSkinId]
  );

  const activePoseOverrides = useMemo<ILabPoseOverrides>(
    () => ({
      ...DEFAULT_LAB_POSE_OVERRIDES,
      ...(poseOverridesByEntity[activeEntity.id] ?? {}),
    }),
    [poseOverridesByEntity, activeEntity.id]
  );

  const activeOverrideCount = useMemo(
    () => countActivePoseOverrides(activePoseOverrides),
    [activePoseOverrides]
  );

  const editorLabels = useMemo(
    () => getEntityEditorLabelsHe(activeEntity.id),
    [activeEntity.id]
  );

  const updatePoseOverride = useCallback(
    (patch: Partial<ILabPoseOverrides>) => {
      setPoseOverridesByEntity((prev) => {
        const current = prev[activeEntity.id] ?? DEFAULT_LAB_POSE_OVERRIDES;
        return {
          ...prev,
          [activeEntity.id]: {
            ...current,
            ...patch,
          },
        };
      });
    },
    [activeEntity.id]
  );

  const resetEntityPoseOverrides = useCallback(() => {
    setPoseOverridesByEntity((prev) => {
      const next = { ...prev };
      delete next[activeEntity.id];
      return next;
    });
  }, [activeEntity.id]);

  const handleCopyTweaksJson = useCallback(() => {
    const payload = {
      entityId: activeEntity.id,
      animationId: activeAnimation.id,
      overrides: activePoseOverrides,
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
    setCopiedTweaksFeedback(true);
    window.setTimeout(() => setCopiedTweaksFeedback(false), 1800);
  }, [activeEntity.id, activeAnimation.id, activePoseOverrides]);

  const filteredEntities = useMemo(
    () => filterLabEntities(LAB_ENTITIES, session.categoryFilter, session.searchQuery),
    [session.categoryFilter, session.searchQuery]
  );

  const categoryCounts = useMemo(() => {
    const characters = LAB_ENTITIES.filter((e) => e.category === 'characters').length;
    const animals = LAB_ENTITIES.filter((e) => e.category === 'animals').length;
    return { characters, animals };
  }, []);

  const handleSelectEntity = useCallback((entityId: string) => {
    setSession((prev) => selectLabEntity(prev, entityId));
    setLivePhase(0);
  }, []);

  const handleSelectCategory = useCallback((category: LabCategoryFilter) => {
    setSession((prev) => selectLabCategory(prev, category));
    setLivePhase(0);
  }, []);

  const handleStepFrame = useCallback(
    (deltaPhase: number) => {
      const base = session.isPaused ? session.manualPhase : livePhase;
      const next = (((base + deltaPhase) % 1) + 1) % 1;
      setLivePhase(next);
      setSession((prev) => ({
        ...prev,
        isPaused: true,
        manualPhase: next,
      }));
    },
    [session.isPaused, session.manualPhase, livePhase]
  );

  const handleSelectAnimation = useCallback((animationId: string) => {
    setSession((prev) => ({
      ...prev,
      selectedAnimationId: animationId,
      isPaused: false,
      manualPhase: 0,
    }));
    if (animationId === 'none') {
      setLivePhase(0);
    }
  }, []);

  const handleSelectSkin = useCallback((skinId: string) => {
    setSession((prev) => ({
      ...prev,
      selectedSkinId: skinId,
    }));
  }, []);

  const handleStepEntity = useCallback(
    (delta: -1 | 1) => {
      const list = filteredEntities.length > 0 ? filteredEntities : LAB_ENTITIES;
      const idx = list.findIndex((e) => e.id === activeEntity.id);
      const nextIdx = idx < 0 ? 0 : (idx + delta + list.length) % list.length;
      handleSelectEntity(list[nextIdx].id);
    },
    [filteredEntities, activeEntity.id, handleSelectEntity]
  );

  // Keyboard shortcuts inside Lab: Escape to return to title, Space to pause/resume animation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.code === 'Space' && session.selectedAnimationId !== 'none') {
        e.preventDefault();
        setSession((prev) => ({
          ...prev,
          isPaused: !prev.isPaused,
          manualPhase: livePhase,
        }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, session.selectedAnimationId, livePhase]);

  const isStaticNone = activeAnimation.id === 'none';

  return (
    <div
      data-testid="character-lab-view"
      className="fixed inset-0 z-50 flex flex-col bg-[#0d1017] text-stone-100 select-none overflow-hidden"
    >
      {/* ==================================================================== */}
      {/* TOP STUDIO HEADER BAR                                                */}
      {/* ==================================================================== */}
      <header
        dir="rtl"
        className="h-14 px-5 flex items-center justify-between border-b border-stone-800/90 bg-[#121620] shrink-0"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2">
              <path d="M9 3h6m-5 0v5.172a2 2 0 0 1-.586 1.414l-4.828 4.828A2 2 0 0 0 4 15.828V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.172a2 2 0 0 0-.586-1.414l-4.828-4.828A2 2 0 0 1 14 8.172V3" />
              <path d="M7 15h10" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display-he text-lg font-bold text-stone-100 tracking-tight">
                מעבדת הדמויות והאנימציות
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {categoryCounts.characters} דמויות · {categoryCounts.animals} חיות
              </span>
            </div>
            <p className="text-xs text-stone-400">
              בחינה אינטראקטיבית של כל הדמויות והחיות הקיימות בעולם, האנימציות והסקינים שלהן
            </p>
          </div>
        </div>

        {/* Stage Environment & Return to Main Screen CTA */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-stone-900 border border-stone-800">
            {ENVIRONMENT_PRESETS.map((env) => {
              const active = session.stageEnvironment === env.id;
              return (
                <button
                  key={env.id}
                  type="button"
                  onClick={() =>
                    setSession((prev) => ({ ...prev, stageEnvironment: env.id }))
                  }
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-stone-950 font-semibold'
                      : 'text-stone-300 hover:text-stone-100'
                  }`}
                >
                  {env.labelHe}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            data-testid="close-lab-btn"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-stone-100 bg-stone-800 hover:bg-stone-700 border border-stone-600/80 transition-colors cursor-pointer"
          >
            <span>חזרה למסך הראשי</span>
            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-stone-900 text-stone-300 font-mono">
              ESC
            </kbd>
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN 3-COLUMN WORKSPACE (Explicit LTR Grid so Left=Left & Right=Right) */}
      {/* ==================================================================== */}
      <div dir="ltr" className="flex-1 flex min-h-0 overflow-hidden">
        {/* ================================================================== */}
        {/* 1. PHYSICAL LEFT PANEL (בצד שמאל: מעבר נוח בין דמויות וחיות + רשימה) */}
        {/* ================================================================== */}
        <aside
          dir="rtl"
          data-testid="lab-left-panel"
          className="w-80 lg:w-84 h-full flex flex-col border-r border-stone-800/90 bg-[#121620] shrink-0"
        >
          {/* Left Panel Header, Scalable Category Dropdown (Drop Box) & Search */}
          <div className="p-3.5 border-b border-stone-800/80 space-y-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-0.5">
                <label
                  htmlFor="lab-category-select"
                  className="text-[11px] font-bold text-amber-300/95 tracking-wide"
                >
                  קטגוריית תצוגה
                </label>
                <span className="text-[11px] text-stone-400 font-mono-tabular">
                  {filteredEntities.length} פריטים
                </span>
              </div>

              {/* Scalable Drop Box (Select) for Categories */}
              <div className="relative">
                <select
                  id="lab-category-select"
                  data-testid="lab-category-select"
                  value={session.categoryFilter}
                  onChange={(e) =>
                    handleSelectCategory(e.target.value as LabCategoryFilter)
                  }
                  className="w-full appearance-none px-3.5 py-2.5 pl-9 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800/90 border border-stone-700/90 focus:border-amber-400 focus:outline-none text-stone-100 shadow-inner transition-colors cursor-pointer"
                >
                  {LAB_CATEGORIES.map((cat) => {
                    const count =
                      cat.id === 'characters'
                        ? categoryCounts.characters
                        : categoryCounts.animals;
                    return (
                      <option
                        key={cat.id}
                        value={cat.id}
                        className="bg-stone-900 text-stone-100 py-1"
                      >
                        {cat.labelHe} — {cat.subtitleHe} ({count})
                      </option>
                    );
                  })}
                  <option value="all" className="bg-stone-900 text-stone-100 py-1">
                    כל הקטגוריות יחד ({categoryCounts.characters + categoryCounts.animals})
                  </option>
                </select>
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-400">
                  <svg
                    viewBox="0 0 20 20"
                    className="w-4 h-4 fill-current"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                data-testid="lab-entity-search"
                value={session.searchQuery}
                onChange={(e) =>
                  setSession((prev) => ({ ...prev, searchQuery: e.target.value }))
                }
                placeholder={
                  session.categoryFilter === 'characters'
                    ? 'חיפוש דמות (סייר, גמד, נזיר, סוחר...)'
                    : session.categoryFilter === 'animals'
                      ? 'חיפוש חיה (סוס, אייל, דג קוי, פרפר...)'
                      : 'חיפוש בכל הדמויות והחיות בעולם...'
                }
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-stone-900/95 border border-stone-700/80 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400"
              />
              {session.searchQuery && (
                <button
                  type="button"
                  onClick={() => setSession((prev) => ({ ...prev, searchQuery: '' }))}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Entities List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {filteredEntities.map((item) => {
              const isSelected = item.id === activeEntity.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`lab-entity-item-${item.id}`}
                  onClick={() => handleSelectEntity(item.id)}
                  className={`w-full text-right p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400/80 shadow-md'
                      : 'bg-stone-900/65 border-stone-800/80 hover:bg-stone-800/75 hover:border-stone-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-amber-300' : 'text-stone-100'
                        }`}
                      >
                        {item.nameHe}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">
                      {item.subtitleHe}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-300">
                        {item.categoryLabelHe}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {item.animations.length - 1} אנימציות · {item.skins.length} סקינים
                      </span>
                    </div>
                  </div>

                  {/* Skin Swatch Preview Dots */}
                  <div className="flex items-center gap-0.5 shrink-0 pt-1">
                    {item.skins[0].badgeColors.map((hex, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full border border-white/25"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ================================================================== */}
        {/* 2. CENTER VIEWPORT STAGE (במרכז: התצוגה התלת־ממדית של הדמות/החיה) */}
        {/* ================================================================== */}
        <section
          dir="rtl"
          data-testid="lab-center-stage"
          className="flex-1 relative h-full min-w-0 bg-[#13161c] overflow-hidden"
        >
          {/* 3D Three.js Studio Canvas */}
          <CharacterLabCanvas
            entity={activeEntity}
            animation={activeAnimation}
            skin={activeSkin}
            poseOverrides={activePoseOverrides}
            playbackSpeed={session.playbackSpeed}
            isPaused={session.isPaused}
            manualPhase={session.manualPhase}
            autoTurntable={session.autoTurntable}
            showWireframe={session.showWireframe}
            showFloorGrid={session.showFloorGrid}
            showHeightRuler={session.showHeightRuler}
            stageEnvironment={session.stageEnvironment}
            cameraPreset={session.cameraPreset}
            cameraResetNonce={cameraResetNonce}
            snapshotTriggerNonce={snapshotTriggerNonce}
            onRigStatsChange={setRigStats}
            onLivePhaseUpdate={setLivePhase}
          />

          {/* Top-Center Entity Info & Stage Display Toggles */}
          <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2 pointer-events-none">
            {/* Active Character / Animal Compact Card */}
            <div className="px-3 py-2 rounded-xl bg-[#11151e]/92 border border-stone-700/75 pointer-events-auto max-w-[330px]">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {activeEntity.categoryLabelHe}
                </span>
                <span className="text-[10px] text-stone-400 truncate">
                  {activeEntity.worldLocationHe} · כמות: {activeEntity.worldInstanceCount}
                </span>
              </div>
              <h2
                data-testid="lab-active-entity-title"
                className="text-sm font-bold text-stone-100 mt-0.5 truncate"
              >
                {activeEntity.nameHe}
              </h2>
              <div className="flex items-center gap-2.5 mt-1 text-[10px] text-stone-400 font-mono-tabular">
                <span>חלקים: {rigStats.meshCount}</span>
                <span>משולשים: {rigStats.triangleCount}</span>
                <span className="truncate">סקין: {activeSkin.nameHe}</span>
              </div>
            </div>

            {/* Stage Toggles (Prev/Next Entity, Turntable, Height Ruler, Wireframe, Grid, Snapshot) */}
            <div className="flex flex-wrap items-center justify-end gap-1 pointer-events-auto">
              <button
                type="button"
                onClick={() => handleStepEntity(-1)}
                title="ישות קודמת"
                className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-[#11151e]/92 border border-stone-700/80 text-stone-200 hover:border-amber-400 cursor-pointer"
              >
                ▶ הקודם
              </button>
              <button
                type="button"
                onClick={() => handleStepEntity(1)}
                title="ישות הבאה"
                className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-[#11151e]/92 border border-stone-700/80 text-stone-200 hover:border-amber-400 cursor-pointer"
              >
                הבא ◀
              </button>
              <button
                type="button"
                data-testid="lab-toggle-turntable"
                onClick={() =>
                  setSession((prev) => ({ ...prev, autoTurntable: !prev.autoTurntable }))
                }
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  session.autoTurntable
                    ? 'bg-amber-400 text-stone-950 border-amber-300 font-semibold'
                    : 'bg-[#11151e]/92 text-stone-200 border-stone-700/80 hover:border-stone-500'
                }`}
              >
                סיבוב במה
              </button>
              <button
                type="button"
                data-testid="lab-toggle-ruler"
                onClick={() =>
                  setSession((prev) => ({ ...prev, showHeightRuler: !prev.showHeightRuler }))
                }
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  session.showHeightRuler
                    ? 'bg-amber-400 text-stone-950 border-amber-300 font-semibold'
                    : 'bg-[#11151e]/92 text-stone-200 border-stone-700/80 hover:border-stone-500'
                }`}
              >
                סרגל גובה (m)
              </button>
              <button
                type="button"
                data-testid="lab-toggle-wireframe"
                onClick={() =>
                  setSession((prev) => ({ ...prev, showWireframe: !prev.showWireframe }))
                }
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  session.showWireframe
                    ? 'bg-sky-400 text-stone-950 border-sky-300 font-semibold'
                    : 'bg-[#11151e]/92 text-stone-200 border-stone-700/80 hover:border-stone-500'
                }`}
              >
                רשת פוליגונים
              </button>
              <button
                type="button"
                onClick={() =>
                  setSession((prev) => ({ ...prev, showFloorGrid: !prev.showFloorGrid }))
                }
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  session.showFloorGrid
                    ? 'bg-stone-800 text-stone-100 border-stone-600'
                    : 'bg-[#11151e]/92 text-stone-400 border-stone-800'
                }`}
              >
                רשת רצפה
              </button>
              <button
                type="button"
                data-testid="lab-snapshot-btn"
                onClick={() => setSnapshotTriggerNonce((n) => n + 1)}
                title="שמירת תמונת PNG של הדמות"
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#11151e]/92 border border-stone-700/80 text-amber-300 hover:bg-stone-800 hover:border-amber-400 transition-colors cursor-pointer"
              >
                צילום PNG
              </button>
            </div>
          </div>

          {/* Bottom-Center Camera Presets & Animation Playback Control Bar */}
          <div className="absolute bottom-4 inset-x-4 flex flex-col gap-2 pointer-events-none">
            {/* Camera Presets Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#11151e]/92 border border-stone-700/80 pointer-events-auto">
                <span className="px-2 text-[11px] text-stone-400">זווית מצלמה:</span>
                {CAMERA_PRESETS.map((preset) => {
                  const isCurrent = session.cameraPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSession((prev) => ({ ...prev, cameraPreset: preset.id }));
                        setCameraResetNonce((n) => n + 1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-400 text-stone-950 font-semibold'
                          : 'text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      {preset.labelHe}
                    </button>
                  );
                })}
              </div>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#11151e]/92 border border-stone-800 text-[11px] text-stone-400">
                <span>גרירת עכבר: סיבוב חופשי 360°</span>
                <span>·</span>
                <span>גלגלת: תקריב/התרחקות</span>
              </div>
            </div>

            {/* Playback Status & Timeline Scrubber Bar */}
            <div className="px-4 py-2.5 rounded-xl bg-[#11151e]/95 border border-stone-700/85 pointer-events-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  data-testid="lab-active-animation-badge"
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    isStaticNone
                      ? 'bg-stone-800 text-stone-300 border border-stone-700'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {isStaticNone ? 'מצב סטטי: ללא אנימציה' : `מנגן: ${activeAnimation.nameHe}`}
                </span>

                {!isStaticNone && (
                  <>
                    <button
                      type="button"
                      data-testid="lab-play-pause-btn"
                      onClick={() =>
                        setSession((prev) => ({
                          ...prev,
                          isPaused: !prev.isPaused,
                          manualPhase: livePhase,
                        }))
                      }
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-400 text-stone-950 hover:bg-amber-300 cursor-pointer"
                    >
                      {session.isPaused ? 'המשך ניגון' : 'השהה'}
                    </button>
                    <button
                      type="button"
                      data-testid="lab-reset-static-btn"
                      onClick={() => handleSelectAnimation('none')}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700 cursor-pointer"
                    >
                      איפוס לעמידת מוצא
                    </button>
                  </>
                )}
              </div>

              {/* Phase Slider, Frame Steppers & Speed Multiplier */}
              <div className="flex items-center gap-2.5 flex-1 max-w-lg justify-end">
                {!isStaticNone && (
                  <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                    <button
                      type="button"
                      title="צעד אחורה (-5%)"
                      onClick={() => handleStepFrame(-0.05)}
                      className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      -5%
                    </button>
                    <span className="text-[11px] text-stone-300 font-mono-tabular w-9 text-center">
                      {Math.round((session.isPaused ? session.manualPhase : livePhase) * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={0.99}
                      step={0.01}
                      value={session.isPaused ? session.manualPhase : livePhase}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setLivePhase(val);
                        setSession((prev) => ({
                          ...prev,
                          isPaused: true,
                          manualPhase: val,
                        }));
                      }}
                      className="flex-1 accent-amber-400 cursor-pointer"
                    />
                    <button
                      type="button"
                      title="צעד קדימה (+5%)"
                      onClick={() => handleStepFrame(0.05)}
                      className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      +5%
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-stone-400 ml-1">מהירות:</span>
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      disabled={isStaticNone}
                      onClick={() =>
                        setSession((prev) => ({ ...prev, playbackSpeed: spd }))
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-mono-tabular transition-colors ${
                        isStaticNone
                          ? 'opacity-40 cursor-not-allowed text-stone-500'
                          : session.playbackSpeed === spd
                            ? 'bg-amber-400 text-stone-950 font-semibold cursor-pointer'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700 cursor-pointer'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* 3. PHYSICAL RIGHT PANEL (בצד ימין: אנימציות | עריכה ותיקונים | סקינים) */}
        {/* ================================================================== */}
        <aside
          dir="rtl"
          data-testid="lab-right-panel"
          className="w-84 lg:w-92 h-full flex flex-col border-l border-stone-800/90 bg-[#121620] shrink-0"
        >
          {/* Right Panel Top Label / 3-Tab Switcher (אנימציות | עריכה ותיקונים | סקינים) */}
          <div className="p-3 border-b border-stone-800/80">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-stone-900 border border-stone-800">
              <button
                type="button"
                data-testid="lab-tab-animations"
                onClick={() =>
                  setSession((prev) => ({ ...prev, activeRightTab: 'animations' }))
                }
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  session.activeRightTab === 'animations'
                    ? 'bg-amber-400 text-stone-950 shadow'
                    : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/60'
                }`}
              >
                <span>אנימציות</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-tabular ${
                    session.activeRightTab === 'animations'
                      ? 'bg-stone-950/20 text-stone-950'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {activeEntity.animations.length}
                </span>
              </button>

              <button
                type="button"
                data-testid="lab-tab-editor"
                onClick={() =>
                  setSession((prev) => ({ ...prev, activeRightTab: 'editor' }))
                }
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  session.activeRightTab === 'editor'
                    ? 'bg-amber-400 text-stone-950 shadow'
                    : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/60'
                }`}
              >
                <span>עריכה ותיקונים</span>
                {activeOverrideCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-tabular ${
                      session.activeRightTab === 'editor'
                        ? 'bg-stone-950 text-amber-300'
                        : 'bg-amber-500/25 text-amber-300'
                    }`}
                  >
                    {activeOverrideCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                data-testid="lab-tab-skins"
                onClick={() =>
                  setSession((prev) => ({ ...prev, activeRightTab: 'skins' }))
                }
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  session.activeRightTab === 'skins'
                    ? 'bg-amber-400 text-stone-950 shadow'
                    : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/60'
                }`}
              >
                <span>סקינים</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-tabular ${
                    session.activeRightTab === 'skins'
                      ? 'bg-stone-950/20 text-stone-950'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {activeEntity.skins.length}
                </span>
              </button>
            </div>
          </div>

          {/* Right Panel Body: Animations List | Editor & Fine-Tuning | Skins List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {session.activeRightTab === 'animations' ? (
              <>
                <div className="px-1 pb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-stone-300 truncate">
                    אנימציות של {activeEntity.nameHe}
                  </span>
                  <button
                    type="button"
                    data-testid="lab-jump-to-editor-btn"
                    onClick={() =>
                      setSession((prev) => ({ ...prev, activeRightTab: 'editor' }))
                    }
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-400/40 transition-colors cursor-pointer shrink-0"
                  >
                    תיקון זווית / סיבוב חרב ✦
                  </button>
                </div>

                {activeEntity.animations.map((anim, idx) => {
                  const isSelected = anim.id === activeAnimation.id;
                  const isNone = anim.id === 'none';
                  return (
                    <button
                      key={anim.id}
                      type="button"
                      data-testid={`lab-anim-btn-${anim.id}`}
                      onClick={() => handleSelectAnimation(anim.id)}
                      className={`w-full text-right p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? isNone
                            ? 'bg-stone-800/95 border-amber-400/80 shadow'
                            : 'bg-emerald-500/15 border-emerald-400/80 shadow'
                          : 'bg-stone-900/65 border-stone-800/80 hover:bg-stone-800/70 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono-tabular ${
                              isSelected
                                ? isNone
                                  ? 'bg-amber-400 text-stone-950 font-bold'
                                  : 'bg-emerald-400 text-stone-950 font-bold'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {isNone ? '⏸' : idx}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              isSelected
                                ? isNone
                                  ? 'text-amber-300'
                                  : 'text-emerald-300'
                                : 'text-stone-100'
                            }`}
                          >
                            {anim.nameHe}
                          </span>
                        </div>

                        {!isNone && (
                          <span className="text-[10px] font-mono-tabular text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded">
                            {anim.loopDurationSec}s
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
                        {anim.descriptionHe}
                      </p>
                    </button>
                  );
                })}
              </>
            ) : session.activeRightTab === 'editor' ? (
              <div data-testid="lab-editor-panel" className="space-y-3">
                {/* Editor Top Header & Quick Reset / Export Bar */}
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-amber-300">
                        עריכת אנימציה וכיול איברים
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        תיקונים בזמן אמת עבור {activeEntity.nameHe} (נשמרים אוטומטית)
                      </p>
                    </div>
                    {activeOverrideCount > 0 && (
                      <button
                        type="button"
                        data-testid="lab-reset-all-overrides-btn"
                        onClick={resetEntityPoseOverrides}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-500/40 cursor-pointer shrink-0"
                      >
                        איפוס הכל ({activeOverrideCount})
                      </button>
                    )}
                  </div>

                  {/* Held Equipment / Prop Visibility Selector */}
                  <div className="pt-1.5 border-t border-stone-800/80">
                    <span className="text-[10px] font-semibold text-stone-400 block mb-1.5">
                      תצוגת נשק / אביזרים ביד (הפרדה בין ימין לשמאל):
                    </span>
                    <div className="grid grid-cols-5 gap-1">
                      {(
                        [
                          { id: 'auto', label: 'אוטומטי' },
                          { id: 'both', label: 'שניהם' },
                          { id: 'right_only', label: 'רק ימין' },
                          { id: 'left_only', label: 'רק שמאל' },
                          { id: 'none', label: 'ללא' },
                        ] as const
                      ).map((mode) => {
                        const isActive =
                          (activePoseOverrides.equipmentVisibilityMode ?? 'auto') === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            data-testid={`lab-equip-vis-${mode.id}`}
                            onClick={() =>
                              updatePoseOverride({
                                equipmentVisibilityMode: mode.id as LabEquipmentVisibilityMode,
                              })
                            }
                            className={`py-1 px-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-amber-400 text-stone-950'
                                : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700/80'
                            }`}
                          >
                            {mode.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 1A. RIGHT-HAND WEAPON / PRIMARY PROP ROTATION & SCALE SECTION */}
                <div
                  data-testid="lab-right-weapon-section"
                  className="p-3 rounded-xl bg-stone-900/75 border border-amber-500/30 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-amber-200 truncate">
                        {editorLabels.weaponGroupTitleHe}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid="lab-reset-right-weapon-btn"
                      onClick={() =>
                        updatePoseOverride({
                          weaponRotXDeg: 0,
                          weaponRotYDeg: 0,
                          weaponRotZDeg: 0,
                          weaponScale: 1.0,
                        })
                      }
                      className="text-[10px] text-stone-400 hover:text-amber-300 cursor-pointer shrink-0"
                    >
                      איפוס יד ימין
                    </button>
                  </div>

                  {/* Quick One-Click Presets for Right-Hand Weapon (Sword, Pickaxe, Staff, etc.) */}
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      data-testid="lab-preset-weapon-plus45"
                      onClick={() =>
                        updatePoseOverride({
                          weaponRotXDeg: Math.max(
                            -180,
                            Math.min(180, activePoseOverrides.weaponRotXDeg + 45)
                          ),
                        })
                      }
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      סובב +45°
                    </button>
                    <button
                      type="button"
                      data-testid="lab-preset-weapon-minus45"
                      onClick={() =>
                        updatePoseOverride({
                          weaponRotXDeg: Math.max(
                            -180,
                            Math.min(180, activePoseOverrides.weaponRotXDeg - 45)
                          ),
                        })
                      }
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      סובב -45°
                    </button>
                    <button
                      type="button"
                      data-testid="lab-preset-weapon-twist90"
                      onClick={() =>
                        updatePoseOverride({
                          weaponRotYDeg:
                            activePoseOverrides.weaponRotYDeg === 90 ? 0 : 90,
                        })
                      }
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      סיבוב להב 90°
                    </button>
                    <button
                      type="button"
                      data-testid="lab-preset-weapon-flip180"
                      onClick={() =>
                        updatePoseOverride({
                          weaponRotXDeg:
                            activePoseOverrides.weaponRotXDeg === 180 ? 0 : 180,
                        })
                      }
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      היפוך 180°
                    </button>
                  </div>

                  {(
                    [
                      {
                        key: 'weaponRotXDeg',
                        label: 'זווית X (הטיה קדימה/אחורה)',
                        testId: 'lab-slider-weapon-x',
                      },
                      {
                        key: 'weaponRotYDeg',
                        label: 'זווית Y (סיבוב סביב הידית)',
                        testId: 'lab-slider-weapon-y',
                      },
                      {
                        key: 'weaponRotZDeg',
                        label: 'זווית Z (הטיה לצדדים)',
                        testId: 'lab-slider-weapon-z',
                      },
                    ] as const
                  ).map((axis) => {
                    const val = activePoseOverrides[axis.key];
                    return (
                      <div key={axis.key} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-300">{axis.label}</span>
                          <span
                            dir="ltr"
                            className="font-mono-tabular text-amber-300 font-semibold"
                          >
                            {val}°
                          </span>
                        </div>
                        <input
                          type="range"
                          data-testid={axis.testId}
                          min={-180}
                          max={180}
                          step={5}
                          value={val}
                          onChange={(e) =>
                            updatePoseOverride({
                              [axis.key]: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                      </div>
                    );
                  })}

                  <div className="space-y-1 pt-1 border-t border-stone-800/70">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-300">גודל / קנה מידה (יד ימין)</span>
                      <span
                        dir="ltr"
                        className="font-mono-tabular text-amber-300 font-semibold"
                      >
                        {activePoseOverrides.weaponScale.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      data-testid="lab-slider-weapon-scale"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={activePoseOverrides.weaponScale}
                      onChange={(e) =>
                        updatePoseOverride({
                          weaponScale: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 1B. LEFT-HAND WEAPON / SECONDARY PROP ROTATION & SCALE SECTION */}
                <div
                  data-testid="lab-left-weapon-section"
                  className="p-3 rounded-xl bg-stone-900/75 border border-sky-500/30 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                      <span className="text-xs font-bold text-sky-200 truncate">
                        {editorLabels.leftWeaponGroupTitleHe}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid="lab-reset-left-weapon-btn"
                      onClick={() =>
                        updatePoseOverride({
                          leftWeaponRotXDeg: 0,
                          leftWeaponRotYDeg: 0,
                          leftWeaponRotZDeg: 0,
                          leftWeaponScale: 1.0,
                        })
                      }
                      className="text-[10px] text-stone-400 hover:text-sky-300 cursor-pointer shrink-0"
                    >
                      איפוס יד שמאל
                    </button>
                  </div>

                  {/* Quick One-Click Presets for Left-Hand Weapon (Bow, Lantern, Scroll, etc.) */}
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      data-testid="lab-preset-left-weapon-plus45"
                      onClick={() =>
                        updatePoseOverride({
                          leftWeaponRotXDeg: Math.max(
                            -180,
                            Math.min(180, (activePoseOverrides.leftWeaponRotXDeg ?? 0) + 45)
                          ),
                        })
                      }
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      סובב +45°
                    </button>
                    <button
                      type="button"
                      data-testid="lab-preset-left-weapon-minus45"
                      onClick={() =>
                        updatePoseOverride({
                          leftWeaponRotXDeg: Math.max(
                            -180,
                            Math.min(180, (activePoseOverrides.leftWeaponRotXDeg ?? 0) - 45)
                          ),
                        })
                      }
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      סובב -45°
                    </button>
                    <button
                      type="button"
                      data-testid="lab-preset-left-weapon-twist90"
                      onClick={() =>
                        updatePoseOverride({
                          leftWeaponRotYDeg:
                            (activePoseOverrides.leftWeaponRotYDeg ?? 0) === 90 ? 0 : 90,
                        })
                      }
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      סיבוב 90°
                    </button>
                    <button
                      type="button"
                      data-testid="lab-preset-left-weapon-flip180"
                      onClick={() =>
                        updatePoseOverride({
                          leftWeaponRotXDeg:
                            (activePoseOverrides.leftWeaponRotXDeg ?? 0) === 180 ? 0 : 180,
                        })
                      }
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      היפוך 180°
                    </button>
                  </div>

                  {(
                    [
                      {
                        key: 'leftWeaponRotXDeg',
                        label: 'זווית X (הטיה קדימה/אחורה)',
                        testId: 'lab-slider-left-weapon-x',
                      },
                      {
                        key: 'leftWeaponRotYDeg',
                        label: 'זווית Y (סיבוב סביב הציר)',
                        testId: 'lab-slider-left-weapon-y',
                      },
                      {
                        key: 'leftWeaponRotZDeg',
                        label: 'זווית Z (הטיה לצדדים)',
                        testId: 'lab-slider-left-weapon-z',
                      },
                    ] as const
                  ).map((axis) => {
                    const val = activePoseOverrides[axis.key] ?? 0;
                    return (
                      <div key={axis.key} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-300">{axis.label}</span>
                          <span
                            dir="ltr"
                            className="font-mono-tabular text-sky-300 font-semibold"
                          >
                            {val}°
                          </span>
                        </div>
                        <input
                          type="range"
                          data-testid={axis.testId}
                          min={-180}
                          max={180}
                          step={5}
                          value={val}
                          onChange={(e) =>
                            updatePoseOverride({
                              [axis.key]: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-sky-400 cursor-pointer"
                        />
                      </div>
                    );
                  })}

                  <div className="space-y-1 pt-1 border-t border-stone-800/70">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-300">גודל / קנה מידה (יד שמאל)</span>
                      <span
                        dir="ltr"
                        className="font-mono-tabular text-sky-300 font-semibold"
                      >
                        {(activePoseOverrides.leftWeaponScale ?? 1.0).toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      data-testid="lab-slider-left-weapon-scale"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={activePoseOverrides.leftWeaponScale ?? 1.0}
                      onChange={(e) =>
                        updatePoseOverride({
                          leftWeaponScale: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. ANIMATION MOTION AMPLITUDE SECTION */}
                <div className="p-3 rounded-xl bg-stone-900/75 border border-stone-800/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-100">
                      עוצמת תנועה באנימציה
                    </span>
                    <span
                      dir="ltr"
                      className="text-[11px] font-mono-tabular text-emerald-300 font-semibold"
                    >
                      {Math.round(activePoseOverrides.amplitudeMultiplier * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    data-testid="lab-slider-amplitude"
                    min={0}
                    max={2.0}
                    step={0.05}
                    value={activePoseOverrides.amplitudeMultiplier}
                    onChange={(e) =>
                      updatePoseOverride({
                        amplitudeMultiplier: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <p className="text-[10px] text-stone-400">
                    הקטן או הגבר את משרעת התנועה של האנימציה הפעילה (100% = מקורי)
                  </p>
                </div>

                {/* 3. RIGHT LIMB / ARM / WING ROTATION */}
                <div className="p-3 rounded-xl bg-stone-900/75 border border-stone-800/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-100">
                      {editorLabels.rightLimbTitleHe}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updatePoseOverride({
                          rightLimbRotXDeg: 0,
                          rightLimbRotYDeg: 0,
                          rightLimbRotZDeg: 0,
                        })
                      }
                      className="text-[10px] text-stone-400 hover:text-amber-300 cursor-pointer"
                    >
                      איפוס
                    </button>
                  </div>
                  {(
                    [
                      { key: 'rightLimbRotXDeg', label: 'ציר X (הרמה/הורדה)' },
                      { key: 'rightLimbRotYDeg', label: 'ציר Y (סיבוב פנים/חוץ)' },
                      { key: 'rightLimbRotZDeg', label: 'ציר Z (פתיחה הצידה)' },
                    ] as const
                  ).map((axis) => (
                    <div key={axis.key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-300">{axis.label}</span>
                        <span dir="ltr" className="font-mono-tabular text-amber-300">
                          {activePoseOverrides[axis.key]}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={activePoseOverrides[axis.key]}
                        onChange={(e) =>
                          updatePoseOverride({
                            [axis.key]: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                {/* 4. LEFT LIMB / ARM / WING ROTATION */}
                <div className="p-3 rounded-xl bg-stone-900/75 border border-stone-800/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-100">
                      {editorLabels.leftLimbTitleHe}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updatePoseOverride({
                          leftLimbRotXDeg: 0,
                          leftLimbRotYDeg: 0,
                          leftLimbRotZDeg: 0,
                        })
                      }
                      className="text-[10px] text-stone-400 hover:text-amber-300 cursor-pointer"
                    >
                      איפוס
                    </button>
                  </div>
                  {(
                    [
                      { key: 'leftLimbRotXDeg', label: 'ציר X (הרמה/הורדה)' },
                      { key: 'leftLimbRotYDeg', label: 'ציר Y (סיבוב פנים/חוץ)' },
                      { key: 'leftLimbRotZDeg', label: 'ציר Z (פתיחה הצידה)' },
                    ] as const
                  ).map((axis) => (
                    <div key={axis.key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-300">{axis.label}</span>
                        <span dir="ltr" className="font-mono-tabular text-amber-300">
                          {activePoseOverrides[axis.key]}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={activePoseOverrides[axis.key]}
                        onChange={(e) =>
                          updatePoseOverride({
                            [axis.key]: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                {/* 5. HEAD & BODY ORIENTATION + HEIGHT OFFSET */}
                <div className="p-3 rounded-xl bg-stone-900/75 border border-stone-800/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-100">
                      {editorLabels.headTitleHe} · גוף וגובה
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updatePoseOverride({
                          headRotXDeg: 0,
                          headRotYDeg: 0,
                          headRotZDeg: 0,
                          bodyRotXDeg: 0,
                          bodyRotYDeg: 0,
                          bodyRotZDeg: 0,
                          bodyOffsetY: 0,
                        })
                      }
                      className="text-[10px] text-stone-400 hover:text-amber-300 cursor-pointer"
                    >
                      איפוס
                    </button>
                  </div>
                  {(
                    [
                      { key: 'headRotYDeg', label: 'סיבוב ראש ימינה/שמאלה (Y)' },
                      { key: 'headRotXDeg', label: 'הטיית ראש למעלה/למטה (X)' },
                      { key: 'bodyRotXDeg', label: 'הטיית גוף קדימה/אחורה (X)' },
                      { key: 'bodyRotYDeg', label: 'סיבוב גוף סביב ציר (Y)' },
                    ] as const
                  ).map((axis) => (
                    <div key={axis.key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-300">{axis.label}</span>
                        <span dir="ltr" className="font-mono-tabular text-amber-300">
                          {activePoseOverrides[axis.key]}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-90}
                        max={90}
                        step={5}
                        value={activePoseOverrides[axis.key]}
                        onChange={(e) =>
                          updatePoseOverride({
                            [axis.key]: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  ))}

                  <div className="space-y-1 pt-1 border-t border-stone-800/70">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-300">גובה ריחוף / מיקום אנכי (Y)</span>
                      <span dir="ltr" className="font-mono-tabular text-amber-300">
                        {activePoseOverrides.bodyOffsetY.toFixed(2)}m
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-0.5}
                      max={0.5}
                      step={0.02}
                      value={activePoseOverrides.bodyOffsetY}
                      onChange={(e) =>
                        updatePoseOverride({
                          bodyOffsetY: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Copy JSON Tweaks Button */}
                <button
                  type="button"
                  data-testid="lab-copy-tweaks-btn"
                  onClick={handleCopyTweaksJson}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 transition-colors cursor-pointer"
                >
                  {copiedTweaksFeedback
                    ? '✓ ערכי התיקון הועתקו ללוח!'
                    : 'העתק ערכי תיקון (JSON)'}
                </button>
              </div>
            ) : (
              <>
                <div className="px-1 pb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-300">
                    וריאציות וסקינים של {activeEntity.nameHe}
                  </span>
                </div>

                {activeEntity.skins.map((sk) => {
                  const isSelected = sk.id === activeSkin.id;
                  return (
                    <button
                      key={sk.id}
                      type="button"
                      data-testid={`lab-skin-btn-${sk.id}`}
                      onClick={() => handleSelectSkin(sk.id)}
                      className={`w-full text-right p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400/85 shadow'
                          : 'bg-stone-900/65 border-stone-800/80 hover:bg-stone-800/70 hover:border-stone-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? 'text-amber-300' : 'text-stone-100'
                            }`}
                          >
                            {sk.nameHe}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1">
                          {sk.subtitleHe}
                        </p>
                      </div>

                      {/* 3-Color Palette Swatch */}
                      <div className="flex items-center gap-1 shrink-0 p-1.5 rounded-lg bg-stone-950/80 border border-stone-800">
                        {sk.badgeColors.map((hex, idx) => (
                          <span
                            key={idx}
                            className="w-4 h-4 rounded-md border border-white/20"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Right Panel Footer: Entity Anatomy & Codebase Inspector */}
          <div className="p-3.5 border-t border-stone-800/90 bg-stone-950/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-stone-200">מבנה ורכיבי הישות</span>
              <span dir="ltr" className="text-[10px] text-amber-300 font-mono truncate">
                {activeEntity.worldCoordinatesText}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              {activeEntity.descriptionHe}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {activeEntity.anatomyTagsHe.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-stone-800/90 text-stone-300 border border-stone-700/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
