// ============================================================================
// MODULE: Components / Game Settings & Keybind Configuration Modal
// DESIGN: Studio-Grade Keybinding & Default Configuration Editor with Disk Save
// SUMMARY: Allows players to customize every keyboard shortcut and default game
//          setting and save them directly to src/config/savedGameSettings.ts.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  DEFAULT_GAME_KEYBINDINGS,
  formatKeyCodeLabel,
  saveGameSettingsToFile,
  type FirefliesMode,
  type IGameKeybindings,
  type IGameSettingsConfig,
} from '../config/savedGameSettings';
import type { CameraPerspectiveMode } from '../world/domain/worldTypes';

export interface IGameSettingsModalProps {
  readonly isOpen: boolean;
  readonly settings: IGameSettingsConfig;
  readonly onApplySettings: (next: IGameSettingsConfig) => void;
  readonly onClose: () => void;
}

interface IKeybindRowMeta {
  readonly key: keyof IGameKeybindings;
  readonly labelHe: string;
  readonly categoryHe: 'תנועה וניווט' | 'קרב ואינטראקציה' | 'ממשק ומצלמה';
  readonly descriptionHe: string;
}

const KEYBIND_ROWS: readonly IKeybindRowMeta[] = [
  {
    key: 'moveForward',
    labelHe: 'הליכה קדימה',
    categoryHe: 'תנועה וניווט',
    descriptionHe: 'תנועה קדימה בעולם (או טיפוס בסולם)',
  },
  {
    key: 'moveBackward',
    labelHe: 'הליכה אחורה',
    categoryHe: 'תנועה וניווט',
    descriptionHe: 'נסיגה / הליכה לאחור',
  },
  {
    key: 'moveLeft',
    labelHe: 'תנועה שמאלה',
    categoryHe: 'תנועה וניווט',
    descriptionHe: 'תנועה צידית שמאלה (Strafe Left)',
  },
  {
    key: 'moveRight',
    labelHe: 'תנועה ימינה',
    categoryHe: 'תנועה וניווט',
    descriptionHe: 'תנועה צידית ימינה (Strafe Right)',
  },
  {
    key: 'sprint',
    labelHe: 'ריצה מהירה (Sprint)',
    categoryHe: 'תנועה וניווט',
    descriptionHe: 'החזקה לריצה מהירה או דהירה על סוס',
  },
  {
    key: 'relaxedWalk',
    labelHe: 'הליכה רגועה / צלילה במים',
    categoryHe: 'תנועה וניווט',
    descriptionHe: 'הליכה איטית ביבשה או צלילה לעומק בשחייה',
  },
  {
    key: 'jump',
    labelHe: 'קפיצה / טיפוס / תעופה (לחיצה כפולה)',
    categoryHe: 'תנועה וניווט',
    descriptionHe: 'קפיצה, עלייה בסולם או לחיצה כפולה למצב תעופה',
  },
  {
    key: 'dash',
    labelHe: 'זינוק מהיר (Ranger Dash)',
    categoryHe: 'תנועה וניווט',
    descriptionHe: 'זינוק קרבי קדימה או תנופה במים',
  },
  {
    key: 'interactDoor',
    labelHe: 'פתיחת / סגירת דלתות',
    categoryHe: 'קרב ואינטראקציה',
    descriptionHe: 'פתיחה וסגירה של דלתות ושערים בעולם',
  },
  {
    key: 'mountHorse',
    labelHe: 'רכיבה / ירידה מסוס',
    categoryHe: 'קרב ואינטראקציה',
    descriptionHe: 'עלייה על סוס קרוב או ירידה ממנו',
  },
  {
    key: 'drawOrSlash',
    labelHe: 'מתקפת חרב / דריכת קשת',
    categoryHe: 'קרב ואינטראקציה',
    descriptionHe: 'הנפת חרב או דריכת קשת (בנוסף ללחיצת עכבר שמאלית)',
  },
  {
    key: 'cycleArrowElement',
    labelHe: 'החלפת סוג חץ (רגיל / אש / סופה)',
    categoryHe: 'קרב ואינטראקציה',
    descriptionHe: 'מעבר בין חצי פלדה, חצי אש וחצי רוח',
  },
  {
    key: 'hotbarSlot1',
    labelHe: 'משבצת נשק מהירה 1',
    categoryHe: 'קרב ואינטראקציה',
    descriptionHe: 'ציוד מיידי של פריט במשבצת 1 (קשת כברירת מחדל)',
  },
  {
    key: 'hotbarSlot2',
    labelHe: 'משבצת נשק מהירה 2',
    categoryHe: 'קרב ואינטראקציה',
    descriptionHe: 'ציוד מיידי של פריט במשבצת 2 (לפיד כברירת מחדל)',
  },
  {
    key: 'hotbarSlot3',
    labelHe: 'משבצת נשק מהירה 3',
    categoryHe: 'קרב ואינטראקציה',
    descriptionHe: 'ציוד מיידי של פריט במשבצת 3 (חרב כברירת מחדל)',
  },
  {
    key: 'hotbarSlot4',
    labelHe: 'משבצת נשק מהירה 4',
    categoryHe: 'קרב ואינטראקציה',
    descriptionHe: 'ציוד מיידי של פריט במשבצת 4 (ידיים חשופות כברירת מחדל)',
  },
  {
    key: 'cameraPerspective',
    labelHe: 'החלפת זווית מצלמה (גוף שלישי / ראשון)',
    categoryHe: 'ממשק ומצלמה',
    descriptionHe: 'מעבר בין תצוגת הדמות בגוף שלישי לבין גוף ראשון',
  },
  {
    key: 'inventoryModal',
    labelHe: 'פתיחת תיק ציוד ומיומנויות',
    categoryHe: 'ממשק ומצלמה',
    descriptionHe: 'פתיחת מסך הציוד, הכישורים והשוק',
  },
  {
    key: 'favoritesModal',
    labelHe: 'תפריט מועדפים מהיר',
    categoryHe: 'ממשק ומצלמה',
    descriptionHe: 'גישה מהירה לנשקים ופריטים מועדפים',
  },
  {
    key: 'marketModal',
    labelHe: 'מסחר בדוכן שוק',
    categoryHe: 'ממשק ומצלמה',
    descriptionHe: 'פתיחת חנות נשקים כאשר עומדים ליד דוכן שוק',
  },
  {
    key: 'cycleWeather',
    labelHe: 'החלפת מזג אוויר',
    categoryHe: 'ממשק ומצלמה',
    descriptionHe: 'מעבר בין מצבי מזג אוויר (אוטומטי, גשם, ערפל, סופה, שלג)',
  },
  {
    key: 'toggleMute',
    labelHe: 'השתקת / הפעלת שמע',
    categoryHe: 'ממשק ומצלמה',
    descriptionHe: 'כיבוי או הדלקה של צלילי הטבע והאפקטים',
  },
];

export const GameSettingsModal: React.FC<IGameSettingsModalProps> = ({
  isOpen,
  settings,
  onApplySettings,
  onClose,
}) => {
  const [draft, setDraft] = useState<IGameSettingsConfig>(settings);
  const [listeningKey, setListeningKey] = useState<keyof IGameKeybindings | null>(null);
  const [activeTab, setActiveTab] = useState<'keybindings' | 'gameplay'>('keybindings');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setListeningKey(null);
      setSaveStatus('idle');
    }
  }, [isOpen, settings]);

  // Capture next key press when rebinding a key
  useEffect(() => {
    if (!isOpen || !listeningKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListeningKey(null);
        return;
      }
      setDraft((prev) => ({
        ...prev,
        keybindings: {
          ...prev.keybindings,
          [listeningKey]: e.code,
        },
      }));
      setListeningKey(null);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, listeningKey]);

  const handleSaveToFile = useCallback(async () => {
    setSaveStatus('saving');
    onApplySettings(draft);
    await saveGameSettingsToFile(draft);
    setSaveStatus('saved');
    window.setTimeout(() => setSaveStatus('idle'), 2200);
  }, [draft, onApplySettings]);

  const handleResetToFactory = useCallback(() => {
    const factory: IGameSettingsConfig = {
      keybindings: { ...DEFAULT_GAME_KEYBINDINGS },
      defaultCameraPerspective: 'third_person',
      mouseSensitivity: 1.0,
      walkSpeedMultiplier: 1.0,
      jumpForceMultiplier: 1.0,
      firefliesMode: 'sanctuary_only',
      defaultMuted: false,
    };
    setDraft(factory);
  }, []);

  if (!isOpen) return null;

  const categories: Array<'תנועה וניווט' | 'קרב ואינטראקציה' | 'ממשק ומצלמה'> = [
    'תנועה וניווט',
    'קרב ואינטראקציה',
    'ממשק ומצלמה',
  ];

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      data-testid="game-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-auto select-none"
      style={{ backgroundColor: 'rgba(8, 7, 6, 0.82)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !listeningKey) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] rounded-2xl flex flex-col overflow-hidden text-stone-100"
        style={{
          backgroundColor: '#141210',
          border: '1px solid rgba(245, 158, 11, 0.48)',
          boxShadow: '0 28px 64px rgba(0, 0, 0, 0.92)',
        }}
      >
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between gap-4 bg-[#191613]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-2.5 h-2.5 rotate-45 bg-amber-400" />
              <h2 className="font-display-he text-2xl font-bold text-stone-100">
                הגדרות משחק ומקשים (Settings)
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              הגדר כל מקש או ברירת מחדל ולחץ על Save כדי לשמור ישירות לקובץ ההגדרות בפרויקט
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              data-testid="settings-save-to-file-btn"
              onClick={handleSaveToFile}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow ${
                saveStatus === 'saved'
                  ? 'bg-emerald-400 text-stone-950'
                  : 'bg-amber-400 hover:bg-amber-300 text-stone-950'
              }`}
            >
              {saveStatus === 'saving'
                ? 'שומר לקובץ...'
                : saveStatus === 'saved'
                  ? '✓ נשמר לקובץ (Saved)!'
                  : 'Save · שמור לקובץ'}
            </button>

            <button
              type="button"
              data-testid="close-settings-btn"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 cursor-pointer"
            >
              סגור ✕
            </button>
          </div>
        </div>

        {/* Sub-Tab Bar: Keybindings vs Gameplay & Environment Defaults */}
        <div className="px-6 pt-3 pb-2 border-b border-stone-800/80 flex items-center justify-between gap-3 bg-[#161411]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="settings-tab-keybindings"
              onClick={() => setActiveTab('keybindings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'keybindings'
                  ? 'bg-amber-400 text-stone-950'
                  : 'bg-stone-900 text-stone-300 hover:text-stone-100 border border-stone-800'
              }`}
            >
              מקשים וכפתורי שליטה ({KEYBIND_ROWS.length})
            </button>
            <button
              type="button"
              data-testid="settings-tab-gameplay"
              onClick={() => setActiveTab('gameplay')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'gameplay'
                  ? 'bg-amber-400 text-stone-950'
                  : 'bg-stone-900 text-stone-300 hover:text-stone-100 border border-stone-800'
              }`}
            >
              ברירות מחדל משחק, מצלמה ועולם
            </button>
          </div>

          <button
            type="button"
            data-testid="settings-reset-defaults-btn"
            onClick={handleResetToFactory}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-amber-300 bg-stone-900 hover:bg-stone-800 border border-stone-800 cursor-pointer"
          >
            איפוס לברירת מחדל
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'keybindings' ? (
            <>
              {listeningKey && (
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-bold flex items-center justify-between">
                  <span>
                    לחץ כעת על המקש החדש במקלדת עבור &quot;
                    {KEYBIND_ROWS.find((r) => r.key === listeningKey)?.labelHe}
                    &quot; (או ESC לביטול)...
                  </span>
                  <button
                    type="button"
                    onClick={() => setListeningKey(null)}
                    className="px-2.5 py-1 rounded bg-stone-900 text-stone-200 text-[11px] cursor-pointer"
                  >
                    ביטול
                  </button>
                </div>
              )}

              {categories.map((cat) => {
                const rows = KEYBIND_ROWS.filter((r) => r.categoryHe === cat);
                return (
                  <div key={cat} className="space-y-2">
                    <h3 className="text-xs font-bold text-amber-300 tracking-wide border-b border-stone-800 pb-1.5">
                      {cat}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {rows.map((row) => {
                        const currentCode = draft.keybindings[row.key];
                        const isListening = listeningKey === row.key;
                        return (
                          <div
                            key={row.key}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                              isListening
                                ? 'bg-amber-500/15 border-amber-400'
                                : 'bg-stone-900/75 border-stone-800/90 hover:border-stone-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-stone-100 truncate">
                                {row.labelHe}
                              </div>
                              <div className="text-[11px] text-stone-400 truncate mt-0.5">
                                {row.descriptionHe}
                              </div>
                            </div>

                            <button
                              type="button"
                              data-testid={`rebind-btn-${row.key}`}
                              onClick={() =>
                                setListeningKey(isListening ? null : row.key)
                              }
                              className={`min-w-[82px] px-3 py-1.5 rounded-lg font-mono-tabular text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                isListening
                                  ? 'bg-amber-400 text-stone-950 animate-pulse'
                                  : 'bg-stone-950 text-amber-300 border border-stone-700 hover:border-amber-400'
                              }`}
                            >
                              {isListening
                                ? 'לחץ מקש...'
                                : formatKeyCodeLabel(currentCode)}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="space-y-4">
              {/* 1. Default Camera Perspective */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-stone-100">
                    זווית מצלמה התחלתית (Default Camera)
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    בחר אם המשחק יתחיל בגוף שלישי (רואים את הסייר) או בגוף ראשון
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(
                    [
                      { id: 'third_person', label: 'גוף שלישי (3rd Person)' },
                      { id: 'first_person', label: 'גוף ראשון (1st Person)' },
                    ] as const
                  ).map((opt) => {
                    const active = draft.defaultCameraPerspective === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            defaultCameraPerspective: opt.id as CameraPerspectiveMode,
                          }))
                        }
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-stone-950'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Fireflies Mode */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-stone-100">
                    גחליליות יער (Fireflies)
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    מיקום קבוע במקדש הסאקורה ובחורשת הליבנה בלבד (ללא תזוזה עם השחקן) או כיבוי מלא
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(
                    [
                      { id: 'sanctuary_only', label: 'באזור המקדש בלבד' },
                      { id: 'off', label: 'כבוי לגמרי' },
                    ] as const
                  ).map((opt) => {
                    const active = draft.firefliesMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`fireflies-mode-${opt.id}`}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            firefliesMode: opt.id as FirefliesMode,
                          }))
                        }
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-stone-950'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Mouse Look Sensitivity */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-100">
                    רגישות עכבר ומבט (Mouse Sensitivity)
                  </span>
                  <span dir="ltr" className="font-mono-tabular text-xs font-bold text-amber-300">
                    {draft.mouseSensitivity.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={2.5}
                  step={0.05}
                  value={draft.mouseSensitivity}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      mouseSensitivity: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* 4. Movement Speed Multiplier */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-100">
                    מהירות תנועה והליכה (Movement Speed)
                  </span>
                  <span dir="ltr" className="font-mono-tabular text-xs font-bold text-amber-300">
                    {draft.walkSpeedMultiplier.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.8}
                  step={0.05}
                  value={draft.walkSpeedMultiplier}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      walkSpeedMultiplier: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* 5. Jump Height Multiplier */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-100">
                    עוצמת קפיצה (Jump Force)
                  </span>
                  <span dir="ltr" className="font-mono-tabular text-xs font-bold text-amber-300">
                    {draft.jumpForceMultiplier.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.6}
                  step={0.05}
                  value={draft.jumpForceMultiplier}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      jumpForceMultiplier: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer with Save CTA */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-[#191613] flex items-center justify-between gap-4">
          <span className="text-xs text-stone-400">
            שמירה מעדכנת מיד את המשחק החי וכותבת לקובץ{' '}
            <code className="text-amber-300 font-mono">src/config/savedGameSettings.ts</code>
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveToFile}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-stone-950 cursor-pointer shadow"
            >
              {saveStatus === 'saved' ? '✓ נשמר לקובץ!' : 'Save · שמור לקובץ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
