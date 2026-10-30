// ============================================================================
// MODULE: Lab / Entity, Animation & Skin Catalog
// DESIGN: 100% Decoupled Laboratory Data Model & Pure State Helpers (SRP)
// SUMMARY: Catalogs all characters, humans, animals, and mythic creatures that
//          exist in the world codebase, along with their animations (starting
//          with 'none' = static pose) and skin variants.
// ============================================================================

import {
  RIDEABLE_HORSES,
  HUNTER_LODGE_POS,
  SAKURA_SANCTUARY_POS,
  VALLEY_FARMS,
  LAKESIDE_TEA_PAVILION_POS,
} from '../world/domain/landmarks/settlementLandmarks';
import {
  SOUTHERN_MINE_POS,
  DWARVEN_GUARDIAN_STATUES,
} from '../world/domain/landmarks/dwarvenLandmarks';
import { DWARVEN_MINERS_COUNT } from '../world/systems/dwarvenMineAndCaravanSystem';
import {
  MARKET_STALL_LOCATIONS,
  SOUTHEAST_HARBOR_POS,
} from '../world/domain/landmarks/oasisAndHarborLandmarks';
import { CHINESE_FORTRESS_POS } from '../world/domain/landmarks/fortressLandmarks';

// ======================== TYPES & INTERFACES ======================== \\
// #region Types & Interfaces
export type LabCategoryId = 'characters' | 'animals';
export type LabCategoryFilter = LabCategoryId | 'all';
export type LabEquipmentVisibilityMode = 'auto' | 'both' | 'right_only' | 'left_only' | 'none';

export interface ILabAnimationDef {
  readonly id: string;
  readonly nameHe: string;
  readonly descriptionHe: string;
  readonly isStaticDefault?: boolean;
  readonly loopDurationSec: number;
}

export interface ILabSkinPalette {
  readonly primaryHex: number;
  readonly secondaryHex: number;
  readonly accentHex: number;
  readonly trimHex?: number;
  readonly emissiveHex?: number;
  readonly hasAntlers?: boolean;
}

export interface ILabSkinDef {
  readonly id: string;
  readonly nameHe: string;
  readonly subtitleHe: string;
  readonly badgeColors: readonly [string, string, string];
  readonly palette: ILabSkinPalette;
}

export interface ILabEntityDef {
  readonly id: string;
  readonly nameHe: string;
  readonly subtitleHe: string;
  readonly category: LabCategoryId;
  readonly categoryLabelHe: string;
  readonly worldLocationHe: string;
  readonly worldCoordinatesText: string;
  readonly worldInstanceCount: number;
  readonly sourceFile: string;
  readonly descriptionHe: string;
  readonly defaultCameraDistance: number;
  readonly defaultCameraTargetY: number;
  readonly anatomyTagsHe: readonly string[];
  readonly animations: readonly ILabAnimationDef[];
  readonly skins: readonly ILabSkinDef[];
}

export type LabInspectorTab = 'animations' | 'editor' | 'skins';
export type LabStageEnvironment = 'studio_day' | 'golden_sunset' | 'moonlit_night';
export type LabCameraPreset = 'front' | 'angle' | 'side' | 'back' | 'closeup';

/**
 * Summary: User-editable fine-tuning overrides for animations, right-hand weapon,
 *          left-hand weapon, and body joints in the Lab.
 */
export interface ILabPoseOverrides {
  /** Visibility mode for held weapons/props ('auto' | 'both' | 'right_only' | 'left_only' | 'none') */
  readonly equipmentVisibilityMode: LabEquipmentVisibilityMode;
  /** Multiplier on animation motion amplitude (0.0 to 2.0, default 1.0) */
  readonly amplitudeMultiplier: number;
  /** Right-hand weapon / primary prop rotation offsets in degrees (-180 to +180) */
  readonly weaponRotXDeg: number;
  readonly weaponRotYDeg: number;
  readonly weaponRotZDeg: number;
  /** Right-hand weapon / primary prop scale multiplier (0.5 to 2.0, default 1.0) */
  readonly weaponScale: number;
  /** Left-hand weapon / secondary prop rotation offsets in degrees (-180 to +180) */
  readonly leftWeaponRotXDeg: number;
  readonly leftWeaponRotYDeg: number;
  readonly leftWeaponRotZDeg: number;
  /** Left-hand weapon / secondary prop scale multiplier (0.5 to 2.0, default 1.0) */
  readonly leftWeaponScale: number;
  /** Right arm / wing / fin / front-right leg rotation offsets in degrees (-180 to +180) */
  readonly rightLimbRotXDeg: number;
  readonly rightLimbRotYDeg: number;
  readonly rightLimbRotZDeg: number;
  /** Left arm / wing / fin / front-left leg rotation offsets in degrees (-180 to +180) */
  readonly leftLimbRotXDeg: number;
  readonly leftLimbRotYDeg: number;
  readonly leftLimbRotZDeg: number;
  /** Head & neck rotation offsets in degrees (-90 to +90) */
  readonly headRotXDeg: number;
  readonly headRotYDeg: number;
  readonly headRotZDeg: number;
  /** Torso / body tilt & yaw offsets in degrees (-180 to +180) + vertical height offset */
  readonly bodyRotXDeg: number;
  readonly bodyRotYDeg: number;
  readonly bodyRotZDeg: number;
  readonly bodyOffsetY: number;
  /** Persistent playback speed multiplier for this entity across all animations (0.1 to 3.0, default 1.0) */
  readonly animationSpeedMultiplier?: number;
  /** Persistent per-animation playback speed multipliers (animationId -> multiplier 0.1 to 3.0) */
  readonly perAnimationSpeeds?: Readonly<Record<string, number>>;
}

export const DEFAULT_LAB_POSE_OVERRIDES: ILabPoseOverrides = {
  equipmentVisibilityMode: 'auto',
  amplitudeMultiplier: 1.0,
  weaponRotXDeg: 0,
  weaponRotYDeg: 0,
  weaponRotZDeg: 0,
  weaponScale: 1.0,
  leftWeaponRotXDeg: 0,
  leftWeaponRotYDeg: 0,
  leftWeaponRotZDeg: 0,
  leftWeaponScale: 1.0,
  rightLimbRotXDeg: 0,
  rightLimbRotYDeg: 0,
  rightLimbRotZDeg: 0,
  leftLimbRotXDeg: 0,
  leftLimbRotYDeg: 0,
  leftLimbRotZDeg: 0,
  headRotXDeg: 0,
  headRotYDeg: 0,
  headRotZDeg: 0,
  bodyRotXDeg: 0,
  bodyRotYDeg: 0,
  bodyRotZDeg: 0,
  bodyOffsetY: 0,
  animationSpeedMultiplier: 1.0,
  perAnimationSpeeds: {},
};

export interface ILabSessionState {
  readonly selectedEntityId: string;
  readonly selectedAnimationId: string;
  readonly selectedSkinId: string;
  readonly activeRightTab: LabInspectorTab;
  readonly categoryFilter: LabCategoryFilter;
  readonly searchQuery: string;
  readonly playbackSpeed: number;
  readonly isPaused: boolean;
  readonly manualPhase: number;
  readonly autoTurntable: boolean;
  readonly showWireframe: boolean;
  readonly showFloorGrid: boolean;
  readonly showHeightRuler: boolean;
  readonly stageEnvironment: LabStageEnvironment;
  readonly cameraPreset: LabCameraPreset;
}
// #endregion

// ======================== CATEGORY METADATA ======================== \\
// #region Category Metadata
export const LAB_CATEGORIES: readonly { id: LabCategoryId; labelHe: string; subtitleHe: string }[] = [
  { id: 'characters', labelHe: 'דמויות', subtitleHe: 'אנשים, לוחמים, סוחרים ושומרים' },
  { id: 'animals', labelHe: 'חיות', subtitleHe: 'יונקים, עופות, דגים, חרקים ודרקון' },
] as const;
// #endregion

// ======================== ENTITY CATALOG ======================== \\
// #region Entity Catalog
const horseSkinsFromWorld: ILabSkinDef[] = RIDEABLE_HORSES.map((h, idx) => {
  const hexToCss = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;
  return {
    id: h.id,
    nameHe: h.name,
    subtitleHe: `אורווה #${idx + 1} (${Math.round(h.homeX)}, ${Math.round(h.homeZ)})`,
    badgeColors: [
      hexToCss(h.coatColorHex),
      hexToCss(h.maneColorHex),
      hexToCss(h.saddleColorHex),
    ],
    palette: {
      primaryHex: h.coatColorHex,
      secondaryHex: h.maneColorHex,
      accentHex: h.saddleColorHex,
      trimHex: 0xd4af37,
    },
  };
});

export const LAB_ENTITIES: readonly ILabEntityDef[] = [
  // ==========================================================================
  // 1. HUMANS & CHARACTERS (אנשים ודמויות)
  // ==========================================================================
  {
    id: 'ranger_third_person',
    nameHe: 'סייר הצפון — אראגורן (דמות השחקן)',
    subtitleHe: 'סייר גונדור תלת־ממדי מפרקי בהשראת שר הטבעות',
    category: 'characters',
    categoryLabelHe: 'דמויות',
    worldLocationHe: 'נקודת ההתחלה וכל רחבי העולם',
    worldCoordinatesText: '(0, 22)',
    worldInstanceCount: 1,
    sourceFile: 'src/world/builders/playerAndCombatBuilder.ts',
    descriptionHe:
      'דמות הסייר המלאה של השחקן בהשראת סייר הצפון משר הטבעות — שיער גלי בגוון ערמוני כהה עד הכתפיים, זקן קצר מחוספס ושפם, גלימת יער עם צמד אבזמי ברונזה וסמל העץ הלבן של גונדור על הגב, אפוד עור חום עם שרוכי חזה מעל טוניקת יער ושריון שרשראות, חגורת כתף אלכסונית וחרב ארוכה.',
    defaultCameraDistance: 4.1,
    defaultCameraTargetY: 0.98,
    anatomyTagsHe: ['שיער גלי וזקן סייר', 'גלימת העץ הלבן של גונדור', 'אפוד עור עם שרוכים', 'שריון שרשראות (Hauberk)', 'חרב ארוכה וקשת ריקרב', 'מגפי רכיבה עם רצועות'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'תנוחת בסיס ניטרלית ללא תנועה לבחינת המודל והפרופורציות.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        nameHe: 'עמידה ונשימה טבעית',
        descriptionHe: 'תנועת נשימה קלה בבית החזה ונדנוד עדין של הגלימה והקשת.',
        loopDurationSec: 3.8,
      },
      {
        id: 'walk',
        nameHe: 'הליכת סיור בשביל',
        descriptionHe: 'מחזור הליכה מאוזן עם הנפת רגליים וזרועות מסונכרנת.',
        loopDurationSec: 1.4,
      },
      {
        id: 'sprint',
        nameHe: 'ריצה מהירה ביער',
        descriptionHe: 'הטיית גוף קדימה, צעדים רחבים ותנופת זרועות מהירה.',
        loopDurationSec: 0.85,
      },
      {
        id: 'bow_draw',
        nameHe: 'מתיחת קשת וכיוון חץ',
        descriptionHe: 'הרמת קשת הריקרב ביד שמאל, דריכת חץ מנוצה ומתיחת המיתר לאחור.',
        loopDurationSec: 2.2,
      },
      {
        id: 'sword_slash',
        nameHe: 'הנפת חרב גונדור (קומבו)',
        descriptionHe: 'שליפת החרב הארוכה וביצוע חיתוך אופקי ואלכסוני עוצמתי.',
        loopDurationSec: 1.6,
      },
      {
        id: 'torch_carry',
        nameHe: 'נשיאת לפיד בוער במערה',
        descriptionHe: 'הרמת לפיד האש ביד ימין להארת מנהרות המכרה והלילה.',
        loopDurationSec: 2.4,
      },
      {
        id: 'swim',
        nameHe: 'שחייה במי האגם',
        descriptionHe: 'הטיית פלג הגוף העליון וביצוע תנועות חתירה רחבות במים עם אדוות.',
        loopDurationSec: 1.8,
      },
      {
        id: 'horse_mount_pose',
        nameHe: 'ישיבת רכיבה על סוס',
        descriptionHe: 'פיסוק רגליים סביב האוכף ואחיזת המושכות ביציבות.',
        loopDurationSec: 1.6,
      },
    ],
    skins: [
      {
        id: 'ranger_classic_forest',
        nameHe: 'סייר הצפון — גונדור (מקורי)',
        subtitleHe: 'אפוד עור חום, טוניקת יער זית, שריון שרשראות וגלימת העץ הלבן',
        badgeColors: ['#3b4d3b', '#2a332b', '#5c3a21'],
        palette: {
          primaryHex: 0x3b4d3b,
          secondaryHex: 0x2a332b,
          accentHex: 0x5c3a21,
          trimHex: 0xc5a059,
          emissiveHex: 0xe2e8f0,
        },
      },
      {
        id: 'ranger_imperial_guard',
        nameHe: 'שומר המצודה הקיסרי',
        subtitleHe: 'שריון ארגמן מלכותי, עיטורי זהב ולהב רונות אש',
        badgeColors: ['#991b1b', '#7f1d1d', '#d4af37'],
        palette: {
          primaryHex: 0x991b1b,
          secondaryHex: 0x450a0a,
          accentHex: 0xd4af37,
          trimHex: 0xfbbf24,
          emissiveHex: 0xf97316,
        },
      },
      {
        id: 'ranger_shadow_stalker',
        nameHe: 'צייד הצללים הלילי',
        subtitleHe: 'שריון עור שחור־עורב, גלימת לילה ורונות סגולות',
        badgeColors: ['#1e293b', '#0f172a', '#a855f7'],
        palette: {
          primaryHex: 0x1e293b,
          secondaryHex: 0x090d16,
          accentHex: 0x334155,
          trimHex: 0xc084fc,
          emissiveHex: 0xa855f7,
        },
      },
      {
        id: 'ranger_oasis_nomad',
        nameHe: 'סייר נווה המדבר',
        subtitleHe: 'בדי פשתן מדבריים, לאפיס כחול וזהב עתיק',
        badgeColors: ['#d97706', '#1d4ed8', '#fef3c7'],
        palette: {
          primaryHex: 0xb45309,
          secondaryHex: 0x1e3a8a,
          accentHex: 0x78350f,
          trimHex: 0xfde68a,
          emissiveHex: 0x06b6d4,
        },
      },
    ],
  },

  {
    id: 'ranger_first_person',
    nameHe: 'ידיים וכלי נשק בגוף ראשון (Viewmodel)',
    subtitleHe: 'ידיים מפורטות עם אצבעות, טבעת חותם, מגני אמה וכלי נשק',
    category: 'characters',
    categoryLabelHe: 'דמויות',
    worldLocationHe: 'תצוגת מצלמה בגוף ראשון (Skyrim Viewmodel)',
    worldCoordinatesText: 'מצלמת שחקן [V / C]',
    worldInstanceCount: 1,
    sourceFile: 'src/world/systems/swordAttackAnimationSystem.ts',
    descriptionHe:
      'מערכת הידיים בגוף ראשון — כוללת כפפות עור חצי־פתוחות, 5 אצבעות מפרקיות בכל יד, טבעת חותם מוזהבת, מגני אמה אלפיים, חרב רונות, קשת ריקרב ולפיד.',
    defaultCameraDistance: 1.85,
    defaultCameraTargetY: 1.15,
    anatomyTagsHe: ['10 אצבעות מפרקיות', 'טבעת חותם מוזהבת', 'מגני אמה אלפיים', 'חרב רונות', 'קשת ריקרב'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (אחיזת מוצא)',
        descriptionHe: 'הצגת שתי הידיים וכלי הנשק בתנוחת מוצא סטטית וברורה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'fp_sword_combo',
        nameHe: 'קומבו חרב 3 שלבים (Skyrim Slash)',
        descriptionHe: 'חיתוך מימין לשמאל, חיתוך חוזר משמאל לימין והנחתה אלכסונית עם שובל אור.',
        loopDurationSec: 2.4,
      },
      {
        id: 'fp_sword_heavy',
        nameHe: 'מתקפת עוצמה כבדה + גל אוויר',
        descriptionHe: 'טעינת חרב הרונות ושיגור מכה אנכית המשחררת גל חיתוך אוויר קדמי.',
        loopDurationSec: 1.8,
      },
      {
        id: 'fp_sword_block',
        nameHe: 'חסימת להב אופקית (Parry Guard)',
        descriptionHe: 'הרמת החרב באלכסון מול הפנים ותפיסת הניצב בשתי ידיים להגנה.',
        loopDurationSec: 2.0,
      },
      {
        id: 'fp_bow_aim',
        nameHe: 'מתיחת קשת וירי חץ בגוף ראשון',
        descriptionHe: 'סיבוב הקשת, דריכת חץ על המיתר ומתיחה מלאה לעבר המטרה.',
        loopDurationSec: 2.2,
      },
      {
        id: 'fp_torch_hold',
        nameHe: 'נשיאת לפיד בוער ויד שמאל מגוננת',
        descriptionHe: 'אחיזת לפיד האש ביד ימין עם להבה מתנועעת.',
        loopDurationSec: 2.0,
      },
    ],
    skins: [
      {
        id: 'fp_elven_emerald',
        nameHe: 'מגני אמה אלפיים (ירוק וזהב)',
        subtitleHe: 'עיטורי פיליגרן זהב על לוחות ירוק־אזמרגד',
        badgeColors: ['#1b4d3e', '#d4af37', '#36200d'],
        palette: {
          primaryHex: 0x1b4d3e,
          secondaryHex: 0x36200d,
          accentHex: 0xd4af37,
          emissiveHex: 0x38bdf8,
        },
      },
      {
        id: 'fp_imperial_crimson',
        nameHe: 'להב הארגמן הקיסרי',
        subtitleHe: 'מגני אמה אדומים־מוזהבים ורונות להבה כתומות',
        badgeColors: ['#991b1b', '#fbbf24', '#f97316'],
        palette: {
          primaryHex: 0x991b1b,
          secondaryHex: 0x29150c,
          accentHex: 0xfbbf24,
          emissiveHex: 0xf97316,
        },
      },
      {
        id: 'fp_dwarven_mithril',
        nameHe: 'מיתריל גמדים כסוף',
        subtitleHe: 'פלדה כסופה מבהיקה עם רונות ספיר כחולות',
        badgeColors: ['#cbd5e1', '#38bdf8', '#1e293b'],
        palette: {
          primaryHex: 0x475569,
          secondaryHex: 0x1e293b,
          accentHex: 0xe2e8f0,
          emissiveHex: 0x38bdf8,
        },
      },
    ],
  },

  {
    id: 'dwarven_miner',
    nameHe: 'לוחם וכורה גמדים — ארבור (LOTR)',
    subtitleHe: 'גמד חסון עם זקן 3 צמות, צמות רקות, שריון שרשראות וגרזן דו־להבי',
    category: 'characters',
    categoryLabelHe: 'דמויות',
    worldLocationHe: 'ממלכת הגמדים והמכרה הדרומי',
    worldCoordinatesText: `(${SOUTHERN_MINE_POS.x}, ${SOUTHERN_MINE_POS.entranceZ})`,
    worldInstanceCount: DWARVEN_MINERS_COUNT,
    sourceFile: 'src/world/systems/dwarvenMineAndCaravanSystem.ts',
    descriptionHe:
      'ששת הלוחמים והכורים של ממלכת הגמדים (תורין, באלין, דוואלין, בופור, גלוין ואורי) בהשראת גמדי שר הטבעות — ראש חשוף עם צמות כתר וצמת גב, זקן ערמוני מפואר קלוע ל־3 צמות עם חבקי מתכת, כתפיות שריון שרשראות, סיכות כוכב נורדיות, אבזם יהלום וגרזן קרב דו־להבי.',
    defaultCameraDistance: 3.4,
    defaultCameraTargetY: 0.82,
    anatomyTagsHe: ['זקן קלוע 3 צמות עם חבקים', 'צמות רקות וצמת גב', 'כתפיות שריון שרשראות', 'סיכות כוכב ואבזם יהלום', 'גרזן קרב דו־להבי', 'עששית כרייה זוהרת'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'עמידה זקופה עם גרזן הקרב והעששית ללא תנועה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'mining_work',
        nameHe: 'חציבה והנפת גרזן בסלע הקריסטלים',
        descriptionHe: 'הנפת הגרזן הדו־להבי מעלה והכאה בעוצמה בעורק הקריסטל בלוויית תנודת זקן.',
        loopDurationSec: 1.2,
      },
      {
        id: 'caravan_march',
        nameHe: 'צעידה בשיירה אל המכרה',
        descriptionHe: 'הליכת גמדים נמרצת עם נדנוד העששית ביד שמאל והגרזן ביד ימין.',
        loopDurationSec: 1.1,
      },
      {
        id: 'miner_idle',
        nameHe: 'עמידת מנוחה והתבוננות',
        descriptionHe: 'נשימה שקטה, סיבוב ראש קל ובדיקת העששית.',
        loopDurationSec: 3.2,
      },
      {
        id: 'celebrate_gold',
        nameHe: 'צהלת מציאת זהב!',
        descriptionHe: 'הנפת הגרזן והעששית אל על בשמחה על מציאת עורק זהב מלכותי.',
        loopDurationSec: 1.5,
      },
    ],
    skins: [
      {
        id: 'dwarf_thorin_red',
        nameHe: 'לוחם גמדי ארבור (LOTR מקורי)',
        subtitleHe: 'טוניקת זית־פחם עם עיטורי ברונזה, שריון שרשראות וזקן ערמוני קלוע',
        badgeColors: ['#333629', '#8c3b16', '#9e7b42'],
        palette: {
          primaryHex: 0x333629,
          secondaryHex: 0x8c3b16,
          accentHex: 0x9e7b42,
          trimHex: 0x10b981,
        },
      },
      {
        id: 'dwarf_balin_blue',
        nameHe: 'באלין — טוניקה כחולה וזקן כסוף',
        subtitleHe: 'זקן השבט ושומר ספריית האבן',
        badgeColors: ['#1e3a5f', '#cbd5e1', '#d4af37'],
        palette: {
          primaryHex: 0x1e3a5f,
          secondaryHex: 0xcbd5e1,
          accentHex: 0x94a3b8,
          trimHex: 0xd4af37,
        },
      },
      {
        id: 'dwarf_dwalin_green',
        nameHe: 'דוואלין — טוניקה ירוקה וזקן שחור',
        subtitleHe: 'חוצב האזמרגד של האולם המערבי',
        badgeColors: ['#2d4c2b', '#1c1917', '#10b981'],
        palette: {
          primaryHex: 0x2d4c2b,
          secondaryHex: 0x1c1917,
          accentHex: 0xb8860b,
          trimHex: 0x10b981,
        },
      },
      {
        id: 'dwarf_bofur_amber',
        nameHe: 'בופור — טוניקה חומה וזקן זהוב',
        subtitleHe: 'אומן כבשן ההתכה ומטילי הזהב',
        badgeColors: ['#5c3a21', '#d97706', '#fbbf24'],
        palette: {
          primaryHex: 0x5c3a21,
          secondaryHex: 0xd97706,
          accentHex: 0xb8860b,
          trimHex: 0xfbbf24,
        },
      },
    ],
  },

  {
    id: 'shaolin_monk',
    nameHe: 'נזיר שאולין — לוחם המצודה',
    subtitleHe: 'נזיר קונג־פו בגלימת זעפרן עם מוט לחימה מוזהב (Bo Staff)',
    category: 'characters',
    categoryLabelHe: 'דמויות',
    worldLocationHe: 'חצר האימונים במצודה הקיסרית הצפונית',
    worldCoordinatesText: `(${CHINESE_FORTRESS_POS.x}, ${CHINESE_FORTRESS_POS.z})`,
    worldInstanceCount: 8,
    sourceFile: 'src/world/models/fortressModels.ts',
    descriptionHe:
      'שמונת נזירי השאולין המתאמנים בחצר המצודה הקיסרית — לבושים בגלימת זעפרן מסורתית, אבנט ארגמן, חותלות רגליים לבנות ואוחזים במוט קונג־פו מוזהב.',
    defaultCameraDistance: 3.9,
    defaultCameraTargetY: 0.95,
    anatomyTagsHe: ['גלימת שאולין', 'אבנט ארגמן', 'מוט לחימה מוזהב', 'חותלות בד לבנות', 'נעלי קונג־פו'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'עמידת מוצא זקופה עם מוט הלחימה ביד ימין.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'kung_fu_form',
        nameHe: 'תרגול קאטת קונג־פו ומקל',
        descriptionHe: 'האנימציה המקורית מהמצודה: סיבוב אגן, הנפת מוט זהב וצעדי עמידה דינמיים.',
        loopDurationSec: 3.4,
      },
      {
        id: 'staff_whirlwind',
        nameHe: 'סופת מוט מסתובב (Bo Spin)',
        descriptionHe: 'סיבוב מהיר של מוט הזהב סביב הגוף בשילוב הגנה והתקפה.',
        loopDurationSec: 1.4,
      },
      {
        id: 'horse_stance_strike',
        nameHe: 'עמידת סוס נמוכה (Ma Bu) ודקירה',
        descriptionHe: 'ירידה לעמידת קרב נמוכה ושיגור מכת מוט ממוקדת לפנים.',
        loopDurationSec: 2.0,
      },
      {
        id: 'shaolin_salute',
        nameHe: 'קידת כבוד של מסדר השאולין',
        descriptionHe: 'הצמדת אגרוף לכף יד וקידה מסורתית של אומני הלחימה.',
        loopDurationSec: 2.6,
      },
    ],
    skins: [
      {
        id: 'monk_saffron_classic',
        nameHe: 'גלימת שאולין כתומה (מקורי)',
        subtitleHe: 'כתום זעפרן מסורתי עם אבנט ארגמן ומוט זהב',
        badgeColors: ['#d96b27', '#991b1b', '#d4af37'],
        palette: {
          primaryHex: 0xd96b27,
          secondaryHex: 0x262626,
          accentHex: 0x991b1b,
          trimHex: 0xd4af37,
        },
      },
      {
        id: 'monk_grandmaster_crimson',
        nameHe: 'גראנד־מאסטר ההיכל הקיסרי',
        subtitleHe: 'גלימת ארגמן מלכותית עם אבנט זהב טהור',
        badgeColors: ['#991b1b', '#fbbf24', '#1c1917'],
        palette: {
          primaryHex: 0x991b1b,
          secondaryHex: 0x1c1917,
          accentHex: 0xfbbf24,
          trimHex: 0xfef08a,
        },
      },
      {
        id: 'monk_jade_guardian',
        nameHe: 'שומר מקדש הירקן',
        subtitleHe: 'גלימת ירוק־ירקן עמוק עם מוט ברונזה עתיק',
        badgeColors: ['#047857', '#064e3b', '#f59e0b'],
        palette: {
          primaryHex: 0x047857,
          secondaryHex: 0x064e3b,
          accentHex: 0xd97706,
          trimHex: 0x34d399,
        },
      },
      {
        id: 'monk_mountain_slate',
        nameHe: 'נזיר פסגות הערפל',
        subtitleHe: 'גלימה אפורה־כחולה של מנזר ההרים הצפוני',
        badgeColors: ['#475569', '#1e293b', '#38bdf8'],
        palette: {
          primaryHex: 0x475569,
          secondaryHex: 0x1e293b,
          accentHex: 0x0284c7,
          trimHex: 0xe2e8f0,
        },
      },
    ],
  },

  {
    id: 'tai_chi_monk',
    nameHe: 'נזיר טאי־צ׳י — מקדש הסאקורה',
    subtitleHe: 'מאסטר טאי־צ׳י ומדיטציה במעיינות החמים של מקדש הדובדבן',
    category: 'characters',
    categoryLabelHe: 'דמויות',
    worldLocationHe: 'מקדש הסאקורה והמעיינות החמים',
    worldCoordinatesText: `(${SAKURA_SANCTUARY_POS.x}, ${SAKURA_SANCTUARY_POS.z})`,
    worldInstanceCount: 4,
    sourceFile: 'src/world/models/sanctuaryAndDragonModels.ts',
    descriptionHe:
      'ארבעת נזירי הטאי־צ׳י המתרגלים זרימה הרמונית ושיווי משקל תחת עצי הדובדבן הפורחים למרגלות פסל הבודהה המוזהב.',
    defaultCameraDistance: 3.8,
    defaultCameraTargetY: 0.95,
    anatomyTagsHe: ['תנועה ללא נשק', 'גלימת מדיטציה', 'אבנט משי', 'חותלות שוקיים לבנות'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'עמידת זן שקטה ויציבה ללא תנועה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'tai_chi_flow',
        nameHe: 'זרימת טאי־צ׳י הרמונית',
        descriptionHe: 'תנועות ידיים מעגליות איטיות והעברת משקל רגועה מצד לצד.',
        loopDurationSec: 4.2,
      },
      {
        id: 'cloud_hands',
        nameHe: 'ידיים כעננים ברוח (Cloud Hands)',
        descriptionHe: 'תנועה גלית של שתי הזרועות בגובה החזה בסינכרון עם סיבוב האגן.',
        loopDurationSec: 3.6,
      },
      {
        id: 'crane_balance',
        nameHe: 'שיווי משקל עגור הלוטוס',
        descriptionHe: 'הרמת רגל אחת ופתיחת שתי הזרועות ככנפי עגור מעל המעיינות.',
        loopDurationSec: 3.2,
      },
    ],
    skins: [
      {
        id: 'taichi_sakura_blossom',
        nameHe: 'פריחת הסאקורה (ורוד ולבן)',
        subtitleHe: 'גלימת משי בהירה בהשראת עלי הכותרת של מקדש הדובדבן',
        badgeColors: ['#f472b6', '#fdf2f8', '#9d174d'],
        palette: {
          primaryHex: 0xfbcfe8,
          secondaryHex: 0x831843,
          accentHex: 0xdb2777,
          trimHex: 0xfef3c7,
        },
      },
      {
        id: 'taichi_sunrise_orange',
        nameHe: 'כתום זריחה (מקורי)',
        subtitleHe: 'גלימת המקדש המסורתית עם אבנט ארגמן',
        badgeColors: ['#d96b27', '#991b1b', '#f5f0e6'],
        palette: {
          primaryHex: 0xd96b27,
          secondaryHex: 0x262626,
          accentHex: 0x991b1b,
          trimHex: 0xf5f0e6,
        },
      },
      {
        id: 'taichi_zen_white',
        nameHe: 'לבן טהור — מאסטר הזן',
        subtitleHe: 'גלימת פשתן לבנה עם אבנט זהב עדין',
        badgeColors: ['#f8fafc', '#cbd5e1', '#d4af37'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0x334155,
          accentHex: 0xd4af37,
          trimHex: 0x94a3b8,
        },
      },
    ],
  },

  {
    id: 'harbor_merchant',
    nameHe: 'סוחרי שוק הנמל והנפח',
    subtitleHe: 'ששת בעלי הדוכנים בנמל הדרום־מזרח (ליאנג, מיי, דורין, קארים, בורין והאן)',
    category: 'characters',
    categoryLabelHe: 'דמויות',
    worldLocationHe: 'שוק הסוחרים בנמל הדרום־מזרח',
    worldCoordinatesText: `(${SOUTHEAST_HARBOR_POS.x}, ${SOUTHEAST_HARBOR_POS.z})`,
    worldInstanceCount: MARKET_STALL_LOCATIONS.length,
    sourceFile: 'src/world/domain/landmarks/oasisAndHarborLandmarks.ts',
    descriptionHe:
      'סוחרי הנמל המנהלים את ששת דוכני המסחר: חרבות ולהבים (ליאנג), קשתות וחצים (מיי), עץ ובנייה (דורין), אבן ושיש (קארים), נפחיית הנמל (בורין) ואוצרות (האן).',
    defaultCameraDistance: 3.8,
    defaultCameraTargetY: 0.95,
    anatomyTagsHe: ['גלימת סוחר רקומה', 'כובע סוחרים', 'מגילת חשבונות / פטיש נפח', 'חגורת מטבעות זהב'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'עמידה יציבה בדוכן השוק ללא תנועה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'merchant_welcome',
        nameHe: 'ברכת סוחרים והצגת סחורה',
        descriptionHe: 'פתיחת ידיים רחבה, קידה קלה והזמנת השחקן לעיין בפריטי הדוכן.',
        loopDurationSec: 2.8,
      },
      {
        id: 'blacksmith_forge',
        nameHe: 'ריקוע בפטיש (הנפח בורין)',
        descriptionHe: 'הנפת פטיש הנפחים הכבד והכאה קצבית על להב פלדה לוהט.',
        loopDurationSec: 1.3,
      },
      {
        id: 'market_call',
        nameHe: 'קריאה לעוברים ושבים בנמל',
        descriptionHe: 'נפנוף יד נלהב לעבר הספינה והמזח.',
        loopDurationSec: 2.2,
      },
    ],
    skins: [
      {
        id: 'merchant_liang_crimson',
        nameHe: 'הסוחר ליאנג — דוכן חרבות ולהבים',
        subtitleHe: 'גלימת משי ארגמן וזהב קיסרי',
        badgeColors: ['#991b1b', '#d4af37', '#1e293b'],
        palette: {
          primaryHex: 0x991b1b,
          secondaryHex: 0x1e293b,
          accentHex: 0xd4af37,
          trimHex: 0xfbbf24,
        },
      },
      {
        id: 'merchant_mei_emerald',
        nameHe: 'הסוחרת מיי — דוכן קשתות וחצים',
        subtitleHe: 'טוניקת יערן ירוקה רקומה בזהב',
        badgeColors: ['#065f46', '#10b981', '#d97706'],
        palette: {
          primaryHex: 0x065f46,
          secondaryHex: 0x064e3b,
          accentHex: 0xd97706,
          trimHex: 0x34d399,
        },
      },
      {
        id: 'merchant_borin_blacksmith',
        nameHe: 'הנפח בורין — נפחיית הנמל',
        subtitleHe: 'סינר עור כבד, פלדה מושחרת וגחלים',
        badgeColors: ['#451a03', '#78350f', '#f97316'],
        palette: {
          primaryHex: 0x451a03,
          secondaryHex: 0x1c1917,
          accentHex: 0x78350f,
          trimHex: 0xf97316,
        },
      },
      {
        id: 'merchant_karim_lapis',
        nameHe: 'הסוחר קארים — אבן, שיש ואוצרות',
        subtitleHe: 'גלימת לאפיס־לזולי כחולה מנווה המדבר',
        badgeColors: ['#1d4ed8', '#dbeafe', '#d4af37'],
        palette: {
          primaryHex: 0x1d4ed8,
          secondaryHex: 0x1e3a8a,
          accentHex: 0xd4af37,
          trimHex: 0x93c5fd,
        },
      },
    ],
  },

  // ==========================================================================
  // 2. ANIMALS & WILDLIFE (חיות בר ורכיבה)
  // ==========================================================================
  {
    id: 'rideable_horse',
    nameHe: 'סוס רכיבה אצילי',
    subtitleHe: 'סוס מפרקי מלא עם אוכף, ארכובות, מושכות ו־4 מקצבי תנועה ביומכניים',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'אורוות העולם (אחו, בקתת הצייד, חווה, נמל ונווה מדבר)',
    worldCoordinatesText: '5 אורוות ברחבי המפה',
    worldInstanceCount: RIDEABLE_HORSES.length,
    sourceFile: 'src/world/systems/horsePhysicsSystem.ts',
    descriptionHe:
      'סוסי הרכיבה של העולם — בנויים עם מערכת קינמטיקה ביומכנית אמיתית (רגליים קדמיות ואחוריות בעלות 3 מפרקים: כתף/ירך, ברך ופרסה), צוואר, רעמה, זנב ואוכף מלא.',
    defaultCameraDistance: 4.1,
    defaultCameraTargetY: 1.15,
    anatomyTagsHe: ['4 רגליים תלת־מפרקיות', 'אוכף וארכובות', 'רעמה וזנב מתנופפים', 'רתמות ומושכות'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'עמידה סימטרית על ארבע פרסות ללא תנועה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'horse_idle',
        nameHe: 'עמידה רגועה ונשימה (Idle Gait)',
        descriptionHe: 'תנועת נשימה עדינה, הטיית צוואר קלה וניעור זנב.',
        loopDurationSec: 3.6,
      },
      {
        id: 'horse_walk',
        nameHe: 'הליכה מרובעת (4-Beat Walk)',
        descriptionHe: 'מקצב הליכה רגוע ב־4 פעימות עם הרמת ברכיים ופרסות מדויקת.',
        loopDurationSec: 1.6,
      },
      {
        id: 'horse_trot',
        nameHe: 'ריצה קלה אלכסונית (2-Beat Diagonal Trot)',
        descriptionHe: 'תנועה מסונכרנת של זוגות רגליים אלכסוניים עם קפיציות בגו.',
        loopDurationSec: 1.1,
      },
      {
        id: 'horse_gallop',
        nameHe: 'דהירה מהירה (4-Beat Rotary Gallop)',
        descriptionHe: 'דהירה מלאה עם שלב ריחוף, מתיחת צוואר קדימה והתנופפות הזנב.',
        loopDurationSec: 0.78,
      },
      {
        id: 'horse_rear',
        nameHe: 'הזדקפות מלכותית (Heroic Rear)',
        descriptionHe: 'התרוממות דרמטית על הרגליים האחוריות ונפנוף הרגליים הקדמיות באוויר.',
        loopDurationSec: 2.2,
      },
    ],
    skins: horseSkinsFromWorld,
  },

  {
    id: 'forest_deer',
    nameHe: 'אייל היער המלכותי',
    subtitleHe: 'אייל ואיילה החיים בעדרים ביערות ובשולי האגם',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'יערות האורנים והאחו המערבי',
    worldCoordinatesText: '5 נקודות מרעה ביער',
    worldInstanceCount: 5,
    sourceFile: 'src/world/models/Deer.ts (public/models/Deer_Complete.ts)',
    descriptionHe:
      'מודל הצבי המלא (Deer_Complete) עם שלד אוטומטי בן 27 עצמות, טקסטורה מוטמעת ו־9 אנימציות IK פרוצדורליות מלאות: עמידה, הליכה, אכילה, קריאה, שכיבה, ריצה, בריחה, דילוג ומוות.',
    defaultCameraDistance: 3.2,
    defaultCameraTargetY: 0.72,
    anatomyTagsHe: ['שלד 27 עצמות', 'קרניים מסועפות', 'מפרק לסת מדויק', '9 אנימציות IK'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'עמידה זקופה ודרוכה ללא תנועה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        nameHe: 'עמידה דרוכה ונשימה (Idle)',
        descriptionHe: 'עמידה טבעית ביער עם נשימה עדינה, מצמוץ אוזניים, תנועת זנב והפניית ראש.',
        loopDurationSec: 4.0,
      },
      {
        id: 'walk',
        nameHe: 'הליכה מרובעת ביער (Walk)',
        descriptionHe: 'צעידה אצילית במחזור מרובע מלא עם כיפוף ברכיים וקרסוליים ותנודת צוואר.',
        loopDurationSec: 1.5,
      },
      {
        id: 'eat',
        nameHe: 'אכילה וליחוך עשב (Eat)',
        descriptionHe: 'הרכנת הצוואר והראש אל העשב הטרי עם תנועת לעיסה של הלסת התחתונה.',
        loopDurationSec: 3.2,
      },
      {
        id: 'call',
        nameHe: 'קריאת אייל / שאגה (Call)',
        descriptionHe: 'הרמת החזה והצוואר מעלה, פתיחת הלסת התחתונה ושאגת אייל מרשימה.',
        loopDurationSec: 3.0,
      },
      {
        id: 'lie',
        nameHe: 'שכיבה ומנוחה על הקרקע (Lie)',
        descriptionHe: 'קיפול רגליים הדרגתי, הנמכת האגן אל הקרקע ונשימת מנוחה שלווה.',
        loopDurationSec: 4.0,
      },
      {
        id: 'run',
        nameHe: 'ריצה ודהירה מהירה (Run)',
        descriptionHe: 'דהירה דינמית במחזור Rotary Gallop עם השענת צוואר קדימה וניתור מלא.',
        loopDurationSec: 0.9,
      },
      {
        id: 'flee',
        nameHe: 'בריחה מהירה וזיגזג (Flee)',
        descriptionHe: 'מילוט מהיר מסכנה עם זנב מורם לאזהרה, אוזניים משוכות לאחור ופניות חדות.',
        loopDurationSec: 0.8,
      },
      {
        id: 'skip',
        nameHe: 'דילוג וניתור יער (Skip / Pronking)',
        descriptionHe: 'ניתור קשתי חינני (Stotting) עם דחיפת 4 הרגליים וריחוף באוויר.',
        loopDurationSec: 1.1,
      },
      {
        id: 'death',
        nameHe: 'מוות וקריסה על הקרקע (Death)',
        descriptionHe: 'קריסה דרמטית של הרגליים ונפילה על הצד אל הקרקע.',
        loopDurationSec: 3.5,
      },
    ],
    skins: [
      {
        id: 'deer_stag_classic',
        nameHe: 'אייל יער חום עם קרניים (מקורי)',
        subtitleHe: 'פרווה חומה־אדמדמה וקרניים בהירות',
        badgeColors: ['#8c583a', '#d8c8b4', '#3b2314'],
        palette: {
          primaryHex: 0x8c583a,
          secondaryHex: 0xd8c8b4,
          accentHex: 0x3b2314,
          hasAntlers: true,
        },
      },
      {
        id: 'deer_doe_gentle',
        nameHe: 'איילת היער (ללא קרניים)',
        subtitleHe: 'פרווה חומה־זהובה עדינה ללא קרניים',
        badgeColors: ['#a16237', '#fde68a', '#451a03'],
        palette: {
          primaryHex: 0xa16237,
          secondaryHex: 0xfde68a,
          accentHex: 0x451a03,
          hasAntlers: false,
        },
      },
      {
        id: 'deer_white_hart',
        nameHe: 'אייל השחר הלבן (אגדי)',
        subtitleHe: 'פרווה לבנה כשלג וקרני זהב מלכותיות',
        badgeColors: ['#f8fafc', '#fbbf24', '#cbd5e1'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xfbbf24,
          accentHex: 0x94a3b8,
          hasAntlers: true,
        },
      },
      {
        id: 'deer_highland_dark',
        nameHe: 'אייל הפסגות הצפוני',
        subtitleHe: 'פרווה כהה עבה המותאמת לקור ההרים',
        badgeColors: ['#44403c', '#a8a29e', '#1c1917'],
        palette: {
          primaryHex: 0x44403c,
          secondaryHex: 0xa8a29e,
          accentHex: 0x1c1917,
          hasAntlers: true,
        },
      },
    ],
  },

  {
    id: 'forest_bear',
    nameHe: 'דוב היער החום',
    subtitleHe: 'דוב גריזלי אדיר החי ביערות העבותים ובמורדות ההרים',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'יער האורנים הצפוני ובקתת הצייד',
    worldCoordinatesText: '3 דובים ביערות ובהרים',
    worldInstanceCount: 3,
    sourceFile: 'src/world/models/Bear.ts (public/models/Bear_Complete.ts)',
    descriptionHe:
      'מודל הדוב המלא (Bear_Complete) עם שלד 37 מפרקים, 4,664 קודקודים, טקסטורה מוטמעת ו־13 אנימציות: עמידה, הליכה, אכילה, קריאה, שכיבה, ישיבה, ריצה קלה, ריצה, בריחה, דילוג, שאגה, תקיפה ומוות.',
    defaultCameraDistance: 3.4,
    defaultCameraTargetY: 0.68,
    anatomyTagsHe: ['שלד 37 עצמות', 'טופרים ולסת מפרקיים', '13 אנימציות מלאות', 'טקסטורת פרווה מלאה'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'עמידת מוצא יציבה על ארבע כפות ללא תנועה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        nameHe: 'עמידה רגועה ונשימה (Idle)',
        descriptionHe: 'עמידה כבדה עם נשימה עמוקה, תנודת ראש ורחרחנות קלה.',
        loopDurationSec: 4.2,
      },
      {
        id: 'walk',
        nameHe: 'הליכה כבדה ביער (Walk)',
        descriptionHe: 'צעידה מרובעת כבדה עם העברת משקל מצד לצד.',
        loopDurationSec: 1.67,
      },
      {
        id: 'eat',
        nameHe: 'אכילה וליקוט ביער (Eat)',
        descriptionHe: 'הרכנת הראש והצוואר לאכילת פירות יער ודבש עם תנועת לסתות.',
        loopDurationSec: 7.33,
      },
      {
        id: 'call',
        nameHe: 'קריאת דוב / נהימה (Call)',
        descriptionHe: 'הרמת הראש ופתיחת הלוע לנהימת אזהרה עמוקה.',
        loopDurationSec: 4.0,
      },
      {
        id: 'lie',
        nameHe: 'שכיבה ומנוחה (Lie)',
        descriptionHe: 'רביצה נינוחה על הבטן והכפות על קרקע היער.',
        loopDurationSec: 4.17,
      },
      {
        id: 'sit',
        nameHe: 'ישיבה זקופה (Sit)',
        descriptionHe: 'ישיבה על הרגליים האחוריות והתבוננות בסביבה.',
        loopDurationSec: 5.0,
      },
      {
        id: 'trot',
        nameHe: 'ריצה קלה (Trot)',
        descriptionHe: 'ריצה קלה אלכסונית ומהירה בשבילי היער.',
        loopDurationSec: 0.67,
      },
      {
        id: 'run',
        nameHe: 'דהירה מהירה (Run)',
        descriptionHe: 'ריצה עוצמתית מלאה עם כיפוף עמוד השדרה וניתור קדימה.',
        loopDurationSec: 0.53,
      },
      {
        id: 'flee',
        nameHe: 'בריחה ודהירת מילוט (Flee)',
        descriptionHe: 'דהירה מהירה ביותר בעת מילוט מסכנה.',
        loopDurationSec: 0.47,
      },
      {
        id: 'skip',
        nameHe: 'דילוג וקפיצה (Skip)',
        descriptionHe: 'ניתור כבד ודילוג קשתי מעל מכשולים ביער.',
        loopDurationSec: 1.83,
      },
      {
        id: 'roar',
        nameHe: 'שאגת אימים (Roar)',
        descriptionHe: 'התרוממות ושאגת דוב אדירה בפה פעור.',
        loopDurationSec: 5.0,
      },
      {
        id: 'attack',
        nameHe: 'תקיפת טופרים ונשיכה (Attack)',
        descriptionHe: 'הסתערות קדימה, הנפת כפות קדמיות ומכת טופרים עוצמתית.',
        loopDurationSec: 2.4,
      },
      {
        id: 'death',
        nameHe: 'מוות וקריסה על הקרקע (Death)',
        descriptionHe: 'קריסה כבדה של הדוב ונפילה על הקרקע.',
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'bear_grizzly_classic',
        nameHe: 'דוב גריזלי חום (מקורי)',
        subtitleHe: 'פרווה חומה עמוקה של יערות הצפון',
        badgeColors: ['#6b4226', '#9c6b43', '#2a1810'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x9c6b43,
          accentHex: 0x2a1810,
        },
      },
      {
        id: 'bear_black_mountain',
        nameHe: 'דוב שחור הררי',
        subtitleHe: 'פרווה כהה של מצוקי הגמדים והרכסים',
        badgeColors: ['#292524', '#57534e', '#0c0a09'],
        palette: {
          primaryHex: 0x57534e,
          secondaryHex: 0x78716c,
          accentHex: 0x1c1917,
        },
      },
      {
        id: 'bear_polar_frost',
        nameHe: 'דוב שלגים לבן',
        subtitleHe: 'פרווה בהירה המותאמת לפסגות המושלגות',
        badgeColors: ['#f8fafc', '#e2e8f0', '#64748b'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xe2e8f0,
          accentHex: 0x475569,
        },
      },
    ],
  },

  {
    id: 'river_crocodile',
    nameHe: 'תנין הנילוס והביצה',
    subtitleHe: 'טורף שריוני שוכן גדות נהר, אגם ונווה מדבר',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'גדות האגם המרכזי, הנהר ונווה המדבר',
    worldCoordinatesText: '3 תנינים לאורך גדות המים',
    worldInstanceCount: 3,
    sourceFile: 'src/world/models/Crocodile.ts (public/models/Crocodile_Complete.ts)',
    descriptionHe:
      'מודל התנין המלא (Crocodile_Complete) עם שלד 49 מפרקים, 12,800 קודקודים, קשקשים משוריינים ו־13 אנימציות כולל רביצת שמש בפה פעור וגלגול מוות 720° (Death Roll) בתקיפה.',
    defaultCameraDistance: 3.7,
    defaultCameraTargetY: 0.35,
    anatomyTagsHe: ['שלד 49 עצמות', 'מלתעות 60+ שיניים', 'גלגול מוות 720°', 'זנב שריוני מפרקי'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'עמידת מוצא שטוחה על ארבע רגליים וזנב ישר.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        nameHe: 'רביצת גדה ונשימה (Idle)',
        descriptionHe: 'עמידה נמוכה על הגדה עם תנועת נשימה בגרון ותנודת זנב איטית.',
        loopDurationSec: 3.6,
      },
      {
        id: 'walk',
        nameHe: 'זחילה והליכה גלית (Walk)',
        descriptionHe: 'הליכת תנין אופיינית עם פיתול S של הגוף והזנב.',
        loopDurationSec: 1.8,
      },
      {
        id: 'eat',
        nameHe: 'אכילה וטריפה (Eat)',
        descriptionHe: 'פתיחה וסגירה של המלתעות עם טלטול ראש לבליעת טרף.',
        loopDurationSec: 3.2,
      },
      {
        id: 'call',
        nameHe: 'רביצה בפה פעור / לחישה (Call)',
        descriptionHe: 'פתיחת לוע רחבה על הגדה לקירור תרמי ולחישת אזהרה.',
        loopDurationSec: 3.0,
      },
      {
        id: 'lie',
        nameHe: 'רביצת שמש שטוחה (Lie)',
        descriptionHe: 'השתטחות מלאה על חול הגדה ברגליים פרושות לצדדים.',
        loopDurationSec: 4.0,
      },
      {
        id: 'sit',
        nameHe: 'התרוממות דרוכה על הגדה (Sit)',
        descriptionHe: 'הרמת החזה והראש בזווית גבוהה לתצפית על המים.',
        loopDurationSec: 3.8,
      },
      {
        id: 'trot',
        nameHe: 'הליכה גבוהה מהירה (High Walk / Trot)',
        descriptionHe: 'הרמת הבטן מהקרקע ותנועה מהירה על ארבע רגליים.',
        loopDurationSec: 1.6,
      },
      {
        id: 'run',
        nameHe: 'ריצת הסתערות (Gallop / Run)',
        descriptionHe: 'דהירת תנין מהירה עם הצלפות זנב חזקות.',
        loopDurationSec: 0.9,
      },
      {
        id: 'flee',
        nameHe: 'גלישת מילוט למים (Flee)',
        descriptionHe: 'זינוק ופיתול גוף מהיר ביותר לעבר המים.',
        loopDurationSec: 0.72,
      },
      {
        id: 'skip',
        nameHe: 'ניתור מים וזינוק (Skip / Lunge)',
        descriptionHe: 'זינוק קשתי קדימה מתוך המים בדחיפת הזנב.',
        loopDurationSec: 1.1,
      },
      {
        id: 'roar',
        nameHe: 'שאגת תנין והצלפת זנב (Roar)',
        descriptionHe: 'קימור הגב, פתיחת מלתעות מקסימלית ורעידת שאגה.',
        loopDurationSec: 3.0,
      },
      {
        id: 'attack',
        nameHe: 'תקיפת נשיכה וגלגול מוות 720° (Death Roll)',
        descriptionHe: 'זינוק נשיכה עוצמתי וביצוע גלגול מוות כפול (720 מעלות) סביב ציר הגוף!',
        loopDurationSec: 2.6,
      },
      {
        id: 'death',
        nameHe: 'מוות והתהפכות (Death)',
        descriptionHe: 'קריסת רגליים, התהפכות ורפיון מלתעות על הקרקע.',
        loopDurationSec: 2.2,
      },
    ],
    skins: [
      {
        id: 'croc_nile_classic',
        nameHe: 'תנין נילוס ירוק־זית (מקורי)',
        subtitleHe: 'קשקשים משוריינים בגווני ירוק־זית ובוץ גדות',
        badgeColors: ['#4d5d3b', '#8c8253', '#27321c'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x8c8253,
          accentHex: 0x27321c,
        },
      },
      {
        id: 'croc_swamp_shadow',
        nameHe: 'תנין ביצות כהה',
        subtitleHe: 'שריון קשקשים כהה להסוואה במים עמוקים',
        badgeColors: ['#27382b', '#4b5563', '#0f172a'],
        palette: {
          primaryHex: 0x5c6f5e,
          secondaryHex: 0x4b5563,
          accentHex: 0x0f172a,
        },
      },
      {
        id: 'croc_oasis_golden',
        nameHe: 'תנין נווה המדבר הזהוב',
        subtitleHe: 'גווני חול זהוב ושנהב של נווה המדבר הדרומי',
        badgeColors: ['#d4a359', '#fef08a', '#78350f'],
        palette: {
          primaryHex: 0xe5c07b,
          secondaryHex: 0xfef08a,
          accentHex: 0x78350f,
        },
      },
    ],
  },

  {
    id: 'grazing_sheep',
    nameHe: 'כבשה רועה בחווה',
    subtitleHe: 'כבשים צמריריות הרועות סביב חוות העמק ושדות החיטה',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'חוות העמק המערבית וחוות שדות החיטה',
    worldCoordinatesText: `(${VALLEY_FARMS[0].x}, ${VALLEY_FARMS[0].z})`,
    worldInstanceCount: 5,
    sourceFile: 'src/world/models/farmhouseModels.ts',
    descriptionHe:
      'עדר הכבשים של חוות העמק — בעלות גוף צמר עגלגל, ראש כהה ו־4 רגליים קטנות. מסתובבות במעגלים שלווים סביב שדות החיטה.',
    defaultCameraDistance: 2.5,
    defaultCameraTargetY: 0.55,
    anatomyTagsHe: ['גוף צמר עגלגל', 'ראש ואוזניים', '4 רגליים', 'תנועת מרעה'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'עמידה סטטית לבחינת גוף הצמר והראש.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'sheep_graze_walk',
        nameHe: 'הליכה ומרעה בחווה',
        descriptionHe: 'הליכה קצבית איטית עם הנהון ראש לליחוך עשב.',
        loopDurationSec: 1.6,
      },
      {
        id: 'sheep_nibble',
        nameHe: 'ליחוך חציר וחיטה',
        descriptionHe: 'הרכנת הראש וניקור מהיר בעשב.',
        loopDurationSec: 1.8,
      },
      {
        id: 'sheep_joy_hop',
        nameHe: 'דילוג שמח באחו',
        descriptionHe: 'קפיצות קטנות וקלילות של שמחה בשדה.',
        loopDurationSec: 1.1,
      },
    ],
    skins: [
      {
        id: 'sheep_white_classic',
        nameHe: 'צמר לבן קלאסי (מקורי)',
        subtitleHe: 'צמר לבן־שמנת רך ופנים כהות',
        badgeColors: ['#f4f1ea', '#3a322c', '#d6d3d1'],
        palette: {
          primaryHex: 0xf4f1ea,
          secondaryHex: 0x3a322c,
          accentHex: 0xd6d3d1,
        },
      },
      {
        id: 'sheep_black_highland',
        nameHe: 'כבשה שחורה מההרים',
        subtitleHe: 'צמר פחם כהה ועמוק',
        badgeColors: ['#292524', '#1c1917', '#57534e'],
        palette: {
          primaryHex: 0x292524,
          secondaryHex: 0x0c0a09,
          accentHex: 0x57534e,
        },
      },
      {
        id: 'sheep_golden_fleece',
        nameHe: 'גיזת הזהב של העמק',
        subtitleHe: 'צמר בגוון שמנת־זהוב חמים',
        badgeColors: ['#fef3c7', '#78350f', '#fbbf24'],
        palette: {
          primaryHex: 0xfde68a,
          secondaryHex: 0x78350f,
          accentHex: 0xfbbf24,
        },
      },
    ],
  },

  {
    id: 'forest_rabbit',
    nameHe: 'ארנב בר',
    subtitleHe: 'ארנב זריז עם אוזניים ארוכות מתרוממות וזנב פונפון לבן',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'קרחות היער וגדות הנחל',
    worldCoordinatesText: 'פזורים ברחבי היער',
    worldInstanceCount: 8,
    sourceFile: 'src/world/builders/wildlifeAndFootprintsBuilder.ts',
    descriptionHe:
      'ארנבי הבר של השמורה — מזנקים בין השיחים, זוקפים אוזניים בדריכות כשמתקרבים אליהם ומנתרים במהירות למחסה.',
    defaultCameraDistance: 1.9,
    defaultCameraTargetY: 0.32,
    anatomyTagsHe: ['זוג אוזניים ארוכות', 'זנב פונפון לבן', 'ירכיים שריריות לניתור', 'עיניים שחורות מבריקות'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'ישיבה שקטה בתנוחת מוצא ללא תנועה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'rabbit_sniff',
        nameHe: 'רחרחנות והזזת אוזניים',
        descriptionHe: 'תנועות ראש מהירות ורפרוף אוזניים עדין.',
        loopDurationSec: 2.0,
      },
      {
        id: 'rabbit_alert',
        nameHe: 'דריכות וזקיפת אוזניים (Alert)',
        descriptionHe: 'הרמת הראש וזקיפת האוזניים בזווית חדה בעת זיהוי תנועה.',
        loopDurationSec: 1.8,
      },
      {
        id: 'rabbit_hop',
        nameHe: 'ניתור ובריחה מהירה (Scamper Hop)',
        descriptionHe: 'קפיצות קשתיות מהירות עם הטיית הגוף והאוזניים לאחור.',
        loopDurationSec: 0.75,
      },
    ],
    skins: [
      {
        id: 'rabbit_wild_brown',
        nameHe: 'חום־אפור יער (מקורי)',
        subtitleHe: 'פרוות הסוואה טבעית וזנב לבן',
        badgeColors: ['#8d7966', '#f7f4ef', '#4a3c31'],
        palette: {
          primaryHex: 0x8d7966,
          secondaryHex: 0xf7f4ef,
          accentHex: 0x4a3c31,
        },
      },
      {
        id: 'rabbit_snow_white',
        nameHe: 'ארנב שלג לבן',
        subtitleHe: 'פרווה לבנה צחורה ואוזניים ורדרדות',
        badgeColors: ['#f8fafc', '#fda4af', '#e2e8f0'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xffffff,
          accentHex: 0xfda4af,
        },
      },
      {
        id: 'rabbit_russet_fox',
        nameHe: 'ארנב ערמוני־זהוב',
        subtitleHe: 'פרווה חומה־כתומה חמה של שדות החיטה',
        badgeColors: ['#b45309', '#fef3c7', '#78350f'],
        palette: {
          primaryHex: 0xb45309,
          secondaryHex: 0xfef3c7,
          accentHex: 0x78350f,
        },
      },
    ],
  },

  {
    id: 'woodland_squirrel',
    nameHe: 'סנאי העצים',
    subtitleHe: 'סנאי אדמוני עם זנב מפואר המתרוצץ ומטפס על גזעי האורנים',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'עצי האורן והאלון ברחבי היער',
    worldCoordinatesText: '14 עצים מרכזיים ביער',
    worldInstanceCount: 14,
    sourceFile: 'src/world/models/environmentAtmosphereModels.ts',
    descriptionHe:
      'סנאי היער הפעלתניים — בעלי מכונת מצבים של 4 שלבים: ישיבה בצמרות העצים, ירידה ספירלית על הגזע, חיפוש בלוטים על הקרקע וטיפוס חזרה לעץ הבא.',
    defaultCameraDistance: 1.85,
    defaultCameraTargetY: 0.32,
    anatomyTagsHe: ['זנב פרוותי מעוקל גדול', 'אוזניים מחודדות', 'גוף קומפקטי וזריז'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת מוצא)',
        descriptionHe: 'ישיבה סטטית עם הזנב הפרוותי זקוף.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'squirrel_tail_flick',
        nameHe: 'ישיבה על ענף וניעור זנב',
        descriptionHe: 'תנועות זנב מהירות וקצביות בזמן תצפית מענף העץ.',
        loopDurationSec: 1.4,
      },
      {
        id: 'squirrel_forage_hop',
        nameHe: 'ניתור וחיפוש בלוטים על הקרקע',
        descriptionHe: 'קפיצות קטנות וזריזות בין שורשי העצים.',
        loopDurationSec: 0.9,
      },
      {
        id: 'squirrel_spiral_climb',
        nameHe: 'טיפוס ספירלי על גזע עץ',
        descriptionHe: 'תנועה מעגלית מהירה כלפי מעלה כמו על גזע אורן.',
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'squirrel_red_classic',
        nameHe: 'סנאי אדמוני קלאסי (מקורי)',
        subtitleHe: 'פרווה חומה־אדמדמה עשירה',
        badgeColors: ['#8c4a27', '#7c2d12', '#d97706'],
        palette: {
          primaryHex: 0x8c4a27,
          secondaryHex: 0x7c2d12,
          accentHex: 0xd97706,
        },
      },
      {
        id: 'squirrel_silver_gray',
        nameHe: 'סנאי אפור־כסוף',
        subtitleHe: 'פרווה אפורה עם קצוות זנב לבנים',
        badgeColors: ['#64748b', '#cbd5e1', '#334155'],
        palette: {
          primaryHex: 0x64748b,
          secondaryHex: 0x94a3b8,
          accentHex: 0x334155,
        },
      },
      {
        id: 'squirrel_dark_pine',
        nameHe: 'סנאי אורנים כהה',
        subtitleHe: 'פרווה חומה־שחורה של יערות הצפון',
        badgeColors: ['#3f2e21', '#1c1917', '#78350f'],
        palette: {
          primaryHex: 0x3f2e21,
          secondaryHex: 0x1c1917,
          accentHex: 0x78350f,
        },
      },
    ],
  },

  {
    id: 'mountain_eagle',
    nameHe: 'עיט הרים זהוב',
    subtitleHe: 'עיט מלכותי בעל מוטת כנפיים רחבה הדואה מעל המפל והמצוקים',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'מצוקי הצפון והמפל הגדול',
    worldCoordinatesText: '(-15, -85) בגובה 46 מ׳',
    worldInstanceCount: 1,
    sourceFile: 'src/world/builders/wildlifeAndFootprintsBuilder.ts',
    descriptionHe:
      'עיט ההרים הזהוב החג במעגלים רחבים מעל המפל הצפוני ומצוקי המצודה — בעל ראש מוזהב, מקור מעוקל, זנב מניפה ומוטת כנפיים מרשימה.',
    defaultCameraDistance: 3.6,
    defaultCameraTargetY: 0.85,
    anatomyTagsHe: ['מוטת כנפיים רחבה', 'ראש ועורף מוזהבים', 'מקור דורס', 'זנב מניפה'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (כנפיים פרושות)',
        descriptionHe: 'תנוחת דאייה סטטית לבחינת מוטת הכנפיים והנוצות.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'eagle_soar',
        nameHe: 'דאייה ונפנוף מעל המצוקים',
        descriptionHe: 'נפנוף כנפיים איטי ואצילי בזרמי האוויר החמים.',
        loopDurationSec: 2.2,
      },
      {
        id: 'eagle_dive',
        nameHe: 'צלילת ציד מהירה (Hunting Swoop)',
        descriptionHe: 'כיפוף הכנפיים לאחור והטיית הגוף לצלילה חדה.',
        loopDurationSec: 1.6,
      },
      {
        id: 'eagle_power_flap',
        nameHe: 'נסיקה עוצמתית לפסגה',
        descriptionHe: 'חבטות כנפיים עמוקות ומהירות לטיפוס בגובה.',
        loopDurationSec: 1.1,
      },
    ],
    skins: [
      {
        id: 'eagle_golden_classic',
        nameHe: 'עיט הרים זהוב (מקורי)',
        subtitleHe: 'נוצות חומות כהות וראש מוזהב',
        badgeColors: ['#3b2616', '#c8963e', '#eab308'],
        palette: {
          primaryHex: 0x3b2616,
          secondaryHex: 0xc8963e,
          accentHex: 0xeab308,
        },
      },
      {
        id: 'eagle_bald_white',
        nameHe: 'עיטם לבן־ראש',
        subtitleHe: 'גוף שחור־חום עם ראש וזנב לבנים בוהקים',
        badgeColors: ['#27272a', '#f8fafc', '#f59e0b'],
        palette: {
          primaryHex: 0x27272a,
          secondaryHex: 0xf8fafc,
          accentHex: 0xf59e0b,
        },
      },
      {
        id: 'eagle_desert_hawk',
        nameHe: 'עיט מדברי בהיר',
        subtitleHe: 'נוצות חול וזהב של נווה המדבר',
        badgeColors: ['#92400e', '#fcd34d', '#451a03'],
        palette: {
          primaryHex: 0x92400e,
          secondaryHex: 0xfcd34d,
          accentHex: 0x451a03,
        },
      },
    ],
  },

  {
    id: 'flock_bird',
    nameHe: 'ציפור שיר — להקת היער',
    subtitleHe: 'ציפורי השיר הטסות בלהקות חכמות (Boids) בשמי העמק והיערות',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'שמי העמק, האגם ויערות האורנים',
    worldCoordinatesText: '36 ציפורי להקה + 16 ציפורים דואות',
    worldInstanceCount: 52,
    sourceFile: 'src/world/systems/boidsAndWildlifeSystem.ts',
    descriptionHe:
      'ציפורי השיר של השמורה הטסות בלהקות חכמות (Boids עם הפרדה, יישור ולכידות) מעל צמרות העצים והאגם, ומגיבות בבהלה לקולות בסביבה.',
    defaultCameraDistance: 2.1,
    defaultCameraTargetY: 0.65,
    anatomyTagsHe: ['כנפיים דו־מפרקיות', 'זנב מניפה מתרחב', 'מקור שיר מחודד', 'נוצות חזה בהירות'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (כנפיים פרושות)',
        descriptionHe: 'תנוחת מעוף מאוזנת ללא תנועה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'bird_cruise',
        nameHe: 'מעוף להקה רגוע (Boids Cruise)',
        descriptionHe: 'נפנוף כנפיים קצבי עם תנועה הרמונית של קצות הכנף.',
        loopDurationSec: 1.0,
      },
      {
        id: 'bird_startled',
        nameHe: 'בהלה ומנוסה מהירה (Startled Burst)',
        descriptionHe: 'פתיחת מניפת הזנב וחבטות כנפיים מהירות מאוד.',
        loopDurationSec: 0.55,
      },
      {
        id: 'bird_glide_bank',
        nameHe: 'דאייה ופנייה מעל העמק',
        descriptionHe: 'הטיית הגוף הצידה (Bank Roll) וגלישה על פני הרוח.',
        loopDurationSec: 2.4,
      },
    ],
    skins: [
      {
        id: 'bird_forest_swallow',
        nameHe: 'סנונית יער כחולה־אפורה (מקורי)',
        subtitleHe: 'גב כחול־אפור וחזה בהיר',
        badgeColors: ['#3a4450', '#c8beae', '#d49b35'],
        palette: {
          primaryHex: 0x3a4450,
          secondaryHex: 0xc8beae,
          accentHex: 0xd49b35,
        },
      },
      {
        id: 'bird_robin_redbreast',
        nameHe: 'אדום־חזה של עמק השמורה',
        subtitleHe: 'חזה כתום־אדום בולט וכנפיים חומות',
        badgeColors: ['#57534e', '#ea580c', '#fbbf24'],
        palette: {
          primaryHex: 0x57534e,
          secondaryHex: 0xea580c,
          accentHex: 0xfbbf24,
        },
      },
      {
        id: 'bird_azure_kingfisher',
        nameHe: 'שלדג כחול־טורקיז מהאגם',
        subtitleHe: 'נוצות טורקיז בוהקות וגחון ענבר',
        badgeColors: ['#0284c7', '#f59e0b', '#e0f2fe'],
        palette: {
          primaryHex: 0x0284c7,
          secondaryHex: 0xf59e0b,
          accentHex: 0x38bdf8,
        },
      },
    ],
  },

  {
    id: 'harbor_seagull',
    nameHe: 'שחף הנמל הלבן',
    subtitleHe: 'שחפי החוף החגים מעל המגדלור, המזח וספינת הגליאון בנמל הדרום־מזרח',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'נמל הדרום־מזרח והמגדלור',
    worldCoordinatesText: `(${SOUTHEAST_HARBOR_POS.x}, ${SOUTHEAST_HARBOR_POS.z})`,
    worldInstanceCount: 10,
    sourceFile: 'src/world/models/harborModels.ts',
    descriptionHe:
      'עשרת שחפי הים הלבנים החגים מעל רציפי העץ, המגדלור וספינת הסוחר בנמל הדרום־מזרח — בעלי כנפיים ארוכות עם קצוות כהים ומקור ימי מעוקל.',
    defaultCameraDistance: 2.75,
    defaultCameraTargetY: 0.68,
    anatomyTagsHe: ['כנפי דאייה ימיות ארוכות', 'קצות כנף שחורים', 'מקור צהוב מעוקל', 'רגלי חוף כתומות'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (כנפיים פרושות)',
        descriptionHe: 'תנוחת דאייה ימית סטטית לבחינת מוטת הכנפיים והמקור.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'seagull_harbor_soar',
        nameHe: 'דאייה ברוח הים מעל המגדלור',
        descriptionHe: 'נפנוף כנפיים מתון בשילוב גלישה על בריזת החוף.',
        loopDurationSec: 1.8,
      },
      {
        id: 'seagull_wave_skim',
        nameHe: 'גלישה נמוכה מעל גלי הנמל',
        descriptionHe: 'הטיית כנפיים חדה מצד לצד בגובה פני המים.',
        loopDurationSec: 2.2,
      },
      {
        id: 'seagull_fish_dive',
        nameHe: 'צלילה לתפיסת דג במפרץ',
        descriptionHe: 'קיפול הכנפיים לאחור וצלילה מהירה לעבר המים.',
        loopDurationSec: 1.4,
      },
    ],
    skins: [
      {
        id: 'seagull_coastal_classic',
        nameHe: 'שחף חופים לבן־אפור (מקורי)',
        subtitleHe: 'גוף לבן צחור, גב אפור־כסוף וקצות כנף כהים',
        badgeColors: ['#f8fafc', '#94a3b8', '#eab308'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0x94a3b8,
          accentHex: 0xeab308,
          trimHex: 0x1e293b,
        },
      },
      {
        id: 'seagull_black_backed',
        nameHe: 'שחף ימי שחור־גב',
        subtitleHe: 'כנפיים כהות בגוון צפחה ובטן לבנה מבהיקה',
        badgeColors: ['#334155', '#f8fafc', '#f59e0b'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0x334155,
          accentHex: 0xf59e0b,
          trimHex: 0x0f172a,
        },
      },
      {
        id: 'seagull_golden_sunset',
        nameHe: 'שחף המפרץ הזהוב',
        subtitleHe: 'נוצות לבנות־חמימות בגוון שקיעה ומקור אלמוג',
        badgeColors: ['#fef3c7', '#cbd5e1', '#ea580c'],
        palette: {
          primaryHex: 0xfef3c7,
          secondaryHex: 0xcbd5e1,
          accentHex: 0xea580c,
          trimHex: 0x475569,
        },
      },
    ],
  },

  {
    id: 'koi_fish',
    nameHe: 'דג קוי מלכותי',
    subtitleHe: 'דגי הקוי היפניים השוחים בין פרחי הלוטוס בבריכת בית התה',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'בריכת הלוטוס בבית התה על שפת האגם',
    worldCoordinatesText: `(${LAKESIDE_TEA_PAVILION_POS.x}, ${LAKESIDE_TEA_PAVILION_POS.z})`,
    worldInstanceCount: 12,
    sourceFile: 'src/world/models/settlementModels.ts',
    descriptionHe:
      'שנים־עשר דגי הקוי המלכותיים השוחים במסלולים מעגליים בין עלי הנופר ופרחי הלוטוס סביב בית התה של האגם — כולל גוף מדורג, סנפיר גב, זוג סנפירי חזה, זיפים וזנב מניפה גמיש.',
    defaultCameraDistance: 2.65,
    defaultCameraTargetY: 0.42,
    anatomyTagsHe: ['גוף דג קוי מפוסל', 'סנפיר גב עליון', 'סנפירי חזה מתנועעים', 'זנב מניפה דו־אונתי', 'זיפי שפם קדמיים'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (תנוחת מוצא במים)',
        descriptionHe: 'דג הקוי מיושר בתנוחת מוצא סטטית לבחינת הסנפירים והדוגמה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'koi_pond_swim',
        nameHe: 'שחייה גלית בבריכת הלוטוס',
        descriptionHe: 'תנועת גוף וזנב סינוסואידית חלקה במים עם נפנוף סנפירי הצד.',
        loopDurationSec: 1.8,
      },
      {
        id: 'koi_fast_dart',
        nameHe: 'זינוק מהיר ופנייה במים',
        descriptionHe: 'תנועות זנב מהירות והטיית גוף בזמן האצה בין עלי הנופר.',
        loopDurationSec: 0.9,
      },
      {
        id: 'koi_surface_feed',
        nameHe: 'עלייה לפני המים ויצירת אדוות',
        descriptionHe: 'הרמת החרטום לעבר פני הבריכה ופתיחת סנפירי החזה.',
        loopDurationSec: 2.2,
      },
    ],
    skins: [
      {
        id: 'koi_imperial_gold',
        nameHe: 'קוי כתום־זהב קיסרי (מקורי)',
        subtitleHe: 'קשקשים כתומים בוהקים עם סנפירי זהב וכתמי שנהב',
        badgeColors: ['#ff6b2b', '#fbbf24', '#fffbeb'],
        palette: {
          primaryHex: 0xff6b2b,
          secondaryHex: 0xfbbf24,
          accentHex: 0xfffbeb,
        },
      },
      {
        id: 'koi_kohaku_crimson',
        nameHe: 'קוי קוהאקו (לבן וארגמן יפני)',
        subtitleHe: 'גוף לבן פנינה עם כתמי ארגמן מלכותיים על הגב',
        badgeColors: ['#f8fafc', '#dc2626', '#fca5a5'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xdc2626,
          accentHex: 0xdc2626,
        },
      },
      {
        id: 'koi_sapphire_asagi',
        nameHe: 'קוי אסאגי — ספיר וכסף',
        subtitleHe: 'גב כחול־ספיר עם סנפירים תכולים־כסופים',
        badgeColors: ['#0284c7', '#e0f2fe', '#38bdf8'],
        palette: {
          primaryHex: 0x0284c7,
          secondaryHex: 0xe0f2fe,
          accentHex: 0x38bdf8,
        },
      },
      {
        id: 'koi_ogon_platinum',
        nameHe: 'קוי אוגון — זהב טהור',
        subtitleHe: 'דג קוי מוזהב מבהיק של מקדש הסאקורה',
        badgeColors: ['#facc15', '#fef08a', '#d97706'],
        palette: {
          primaryHex: 0xfacc15,
          secondaryHex: 0xfef08a,
          accentHex: 0xd97706,
        },
      },
    ],
  },

  {
    id: 'meadow_butterfly',
    nameHe: 'פרפר האחו הזוהר',
    subtitleHe: 'פרפרים צבעוניים המרפרפים מעל שדות הפרחים וגדות האגם',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'האחו המערבי, שדות הפרחים ומקדש הסאקורה',
    worldCoordinatesText: '18 פרפרים ברחבי האחו',
    worldInstanceCount: 18,
    sourceFile: 'src/world/models/environmentAtmosphereModels.ts',
    descriptionHe:
      'שמונה־עשר פרפרי האחו המעופפים מעל מרבדי הפרחים — בנויים עם גוף מחולק (ראש, חזה ובטן), זוג מחושים מעוקלים, ו־4 כנפיים מעוצבות (כנפיים קדמיות ואחוריות) עם עיטורים זוהרים.',
    defaultCameraDistance: 2.45,
    defaultCameraTargetY: 0.52,
    anatomyTagsHe: ['זוג כנפיים קדמיות', 'זוג כנפיים אחוריות', 'מחושים מעוקלים', 'עיטורי כנף זוהרים'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (כנפיים פרושות)',
        descriptionHe: 'הפרפר נח על פרח עם כנפיים פרושות לבחינת הדוגמה המלאה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'butterfly_meadow_flutter',
        nameHe: 'רפרוף מעל פרחי האחו',
        descriptionHe: 'תנועת כנפיים קצבית ועדינה בשילוב ריחוף אנכי קל.',
        loopDurationSec: 1.2,
      },
      {
        id: 'butterfly_flower_bask',
        nameHe: 'מנוחה וקיפול כנפיים על פרח',
        descriptionHe: 'פתיחה וסגירה איטית של הכנפיים בשמש הבוקר.',
        loopDurationSec: 2.6,
      },
      {
        id: 'butterfly_spiral_dance',
        nameHe: 'ריקוד ספירלי ברוח האביב',
        descriptionHe: 'מעוף מעגלי שובב עם רפרוף כנפיים מהיר.',
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'butterfly_morpho_cyan',
        nameHe: 'מורפו כחול־טורקיז זוהר (מקורי)',
        subtitleHe: 'כנפי טורקיז מבהיקות עם מסגרת כהה ונקודות אור',
        badgeColors: ['#06b6d4', '#67e8f9', '#0f172a'],
        palette: {
          primaryHex: 0x06b6d4,
          secondaryHex: 0x67e8f9,
          accentHex: 0x0f172a,
          emissiveHex: 0x22d3ee,
        },
      },
      {
        id: 'butterfly_monarch_amber',
        nameHe: 'דנאית מלכותית (כתום וזהב)',
        subtitleHe: 'כנפיים כתומות־זהובות עם עורקים שחורים',
        badgeColors: ['#f97316', '#fbbf24', '#1c1917'],
        palette: {
          primaryHex: 0xf97316,
          secondaryHex: 0xfbbf24,
          accentHex: 0x1c1917,
          emissiveHex: 0xf59e0b,
        },
      },
      {
        id: 'butterfly_sakura_pink',
        nameHe: 'פרפר פריחת הסאקורה',
        subtitleHe: 'כנפיים בגוון ורוד־דובדבן ומג׳נטה זוהרת',
        badgeColors: ['#ec4899', '#fbcfe8', '#500724'],
        palette: {
          primaryHex: 0xec4899,
          secondaryHex: 0xfbcfe8,
          accentHex: 0x500724,
          emissiveHex: 0xf472b6,
        },
      },
      {
        id: 'butterfly_swallowtail_gold',
        nameHe: 'זנב־סנונית מלכותי (צהוב־אזמרגד)',
        subtitleHe: 'כנפיים צהובות־ירוקות זוהרות של עמק המעיינות',
        badgeColors: ['#eab308', '#34d399', '#1e293b'],
        palette: {
          primaryHex: 0xeab308,
          secondaryHex: 0x34d399,
          accentHex: 0x1e293b,
          emissiveHex: 0xfacc15,
        },
      },
    ],
  },

  {
    id: 'imperial_sky_dragon',
    nameHe: 'דרקון השמיים הקיסרי',
    subtitleHe: 'דרקון מזרחי אדיר בן 22 חוליות המעופף בשמי המצודה הצפונית',
    category: 'animals',
    categoryLabelHe: 'חיות',
    worldLocationHe: 'שמי המצודה הקיסרית ומקדש הסאקורה',
    worldCoordinatesText: '(22, -265) בגובה 72 מ׳',
    worldInstanceCount: 1,
    sourceFile: 'src/world/models/sanctuaryAndDragonModels.ts',
    descriptionHe:
      'דרקון השמיים הקיסרי המורכב מראש מפוסל עם קרני שיש, עיניים אדומות זוהרות, שפם זהב מתנופף, 22 חוליות גוף מדורגות עם סנפירי גב מארגמן ו־4 רגליים בעלות טפרים.',
    defaultCameraDistance: 6.2,
    defaultCameraTargetY: 1.2,
    anatomyTagsHe: ['22 חוליות גוף גמישות', 'קרני שיש ושפם זהב', 'עיניים זוהרות', 'סנפירי גב מארגמן', '4 רגלי טפרים'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (פרוש באוויר)',
        descriptionHe: 'כל 22 חוליות הדרקון מיושרות בתנוחת מוצא לבחינת המבנה המלא.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'dragon_sky_flight',
        nameHe: 'תעופת גל בשמיים (Sky Serpent Flight)',
        descriptionHe: 'תנועת גל סינוסואידית תלת־ממדית לאורך כל 22 חוליות הגוף והראש.',
        loopDurationSec: 2.6,
      },
      {
        id: 'dragon_coiled_hover',
        nameHe: 'ריחוף ספירלי סביב הפגודה',
        descriptionHe: 'פיתול מעגלי הדוק של גוף הדרקון ותנועת ראש מלכותית.',
        loopDurationSec: 3.2,
      },
      {
        id: 'dragon_roar_surge',
        nameHe: 'שאגת הדרקון הקיסרי',
        descriptionHe: 'הרמת הראש, פתיחת הלסת וגל אנרגיה מהיר העובר מהראש עד קצה הזנב.',
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'dragon_imperial_gold',
        nameHe: 'זהב וארגמן קיסרי (מקורי)',
        subtitleHe: 'קשקשי זהב מבהיקים וסנפירי גב מארגמן',
        badgeColors: ['#d4af37', '#991b1b', '#ff3311'],
        palette: {
          primaryHex: 0xd4af37,
          secondaryHex: 0x991b1b,
          accentHex: 0xf8fafc,
          emissiveHex: 0xff3311,
        },
      },
      {
        id: 'dragon_celestial_jade',
        nameHe: 'דרקון הירקן השמיימי',
        subtitleHe: 'קשקשי ג׳ייד ירוקים, סנפירי זהב ועיני טורקיז זוהרות',
        badgeColors: ['#10b981', '#047857', '#fbbf24'],
        palette: {
          primaryHex: 0x10b981,
          secondaryHex: 0xd4af37,
          accentHex: 0xecfdf5,
          emissiveHex: 0x38bdf8,
        },
      },
      {
        id: 'dragon_obsidian_amethyst',
        nameHe: 'דרקון הלילה והאמטיסט',
        subtitleHe: 'קשקשי בזלת כהים וגבישי אמטיסט סגולים מהמכרה',
        badgeColors: ['#1e1b4b', '#a855f7', '#e879f9'],
        palette: {
          primaryHex: 0x312e81,
          secondaryHex: 0x9333ea,
          accentHex: 0xe2e8f0,
          emissiveHex: 0xe879f9,
        },
      },
    ],
  },

  // ==========================================================================
  // GUARDIAN CHARACTERS & MONUMENTS (דמויות שומרים ופסלים)
  // ==========================================================================
  {
    id: 'dwarven_king_statue',
    nameHe: 'שומר מלך הגמדים הענק',
    subtitleHe: 'שומר המונוליט האדיר הניצב בשער ממלכת הגמדים עם גרזן דו־להבי ועששית',
    category: 'characters',
    categoryLabelHe: 'דמויות',
    worldLocationHe: 'שער הכניסה לממלכת הגמדים',
    worldCoordinatesText: `(${SOUTHERN_MINE_POS.x}, ${SOUTHERN_MINE_POS.entranceZ - 14})`,
    worldInstanceCount: DWARVEN_GUARDIAN_STATUES.length,
    sourceFile: 'src/world/builders/dwarvenKingdomBuilder.ts',
    descriptionHe:
      'זוג שומרי הענק הניצבים בשער ממלכת הגמדים — מפוסלים מגרניט וברונזה עתיקה, עם עיניים זהובות בורקות, זקן אבן קלוע, גרזן קרב דו־להבי ועששית אש תלויה.',
    defaultCameraDistance: 4.8,
    defaultCameraTargetY: 1.35,
    anatomyTagsHe: ['כן גרניט מפוסל', 'כתפיות ברונזה', 'זקן אבן 3 צמות', 'גרזן קרב דו־להבי', 'עששית תלויה'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (עמידת שמירה)',
        descriptionHe: 'תנוחת השמירה המונומנטלית המקורית בשער המכרה.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'statue_lantern_pulse',
        nameHe: 'הבהוב עיני זהב ונדנוד עששית',
        descriptionHe: 'פעימת אור בעיני המלך ונדנוד העששית התלויה ברוח ההרים.',
        loopDurationSec: 3.0,
      },
      {
        id: 'statue_awakened_guard',
        nameHe: 'התעוררות שומר המכרה (הנפת גרזן)',
        descriptionHe: 'השומר מתעורר לחיים, מניף את גרזן הקרב הדו־להבי ומכה בקרקע.',
        loopDurationSec: 2.6,
      },
    ],
    skins: [
      {
        id: 'statue_granite_bronze',
        nameHe: 'גרניט וברונזה עתיקה (מקורי)',
        subtitleHe: 'אבן הררית אפורה עם שריון ברונזה וזהב',
        badgeColors: ['#6e6a64', '#9c6631', '#d4af37'],
        palette: {
          primaryHex: 0x6e6a64,
          secondaryHex: 0x9c6631,
          accentHex: 0xd4af37,
          emissiveHex: 0xffb732,
        },
      },
      {
        id: 'statue_solid_gold',
        nameHe: 'זהב מלכותי יצוק',
        subtitleHe: 'שומר אוצר המלך מזהב טהור ורובי אדום',
        badgeColors: ['#d4af37', '#b45309', '#ef4444'],
        palette: {
          primaryHex: 0xd4af37,
          secondaryHex: 0x92400e,
          accentHex: 0xfef08a,
          emissiveHex: 0xef4444,
        },
      },
      {
        id: 'statue_basalt_emerald',
        nameHe: 'בזלת מעמקים ואזמרגד',
        subtitleHe: 'אבן בזלת שחורה משובצת קריסטלי אזמרגד ירוקים',
        badgeColors: ['#1e293b', '#0f172a', '#10b981'],
        palette: {
          primaryHex: 0x1e293b,
          secondaryHex: 0x334155,
          accentHex: 0x10b981,
          emissiveHex: 0x34d399,
        },
      },
    ],
  },

  {
    id: 'golden_buddha',
    nameHe: 'הבודהה המוזהב על כס הלוטוס',
    subtitleHe: 'דמות הבודהה המונומנטלית בלב מקדש הסאקורה עם הילת אור ופנסי משי',
    category: 'characters',
    categoryLabelHe: 'דמויות',
    worldLocationHe: 'מקדש הסאקורה המזרחי',
    worldCoordinatesText: `(${SAKURA_SANCTUARY_POS.x}, ${SAKURA_SANCTUARY_POS.z})`,
    worldInstanceCount: 1,
    sourceFile: 'src/world/models/sanctuaryAndDragonModels.ts',
    descriptionHe:
      'דמות הבודהה המוזהבת היושבת על כס לוטוס תלת־שכבתי משיש וארגמן בלב מקדש הסאקורה, מוקפת בהילת אור מוזהבת וזוג פנסים סיניים אדומים.',
    defaultCameraDistance: 4.8,
    defaultCameraTargetY: 1.3,
    anatomyTagsHe: ['כס לוטוס 3 שכבות', 'הילת זהב אחורית', 'זוג פנסים סיניים', 'ישיבת מדיטציה'],
    animations: [
      {
        id: 'none',
        nameHe: 'ללא אנימציה (ישיבת לוטוס שקטה)',
        descriptionHe: 'תנוחת המדיטציה המוזהבת השקטה על כס הלוטוס.',
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'buddha_halo_spin',
        nameHe: 'זוהר ההילה המסתובבת ופנסי המקדש',
        descriptionHe: 'סיבוב הילת האור המוזהבת מאחורי הראש ונדנוד פנסי המשי.',
        loopDurationSec: 4.0,
      },
      {
        id: 'buddha_levitation',
        nameHe: 'ריחוף מדיטטיבי מעל כס הלוטוס',
        descriptionHe: 'התרוממות שלווה באוויר מעל עלי הלוטוס בלוויית פעימת אור.',
        loopDurationSec: 3.6,
      },
    ],
    skins: [
      {
        id: 'buddha_imperial_gold',
        nameHe: 'זהב קיסרי מבהיק (מקורי)',
        subtitleHe: 'זהב ממורק על כס שיש וארגמן',
        badgeColors: ['#d4af37', '#991b1b', '#f8fafc'],
        palette: {
          primaryHex: 0xd4af37,
          secondaryHex: 0x991b1b,
          accentHex: 0xf8fafc,
          emissiveHex: 0xfbbf24,
        },
      },
      {
        id: 'buddha_sacred_jade',
        nameHe: 'ירקן קדוש (Sacred Jade)',
        subtitleHe: 'אבן ג׳ייד ירוקה חצי־שקופה עם כס זהב',
        badgeColors: ['#059669', '#d4af37', '#ecfdf5'],
        palette: {
          primaryHex: 0x059669,
          secondaryHex: 0xd4af37,
          accentHex: 0xecfdf5,
          emissiveHex: 0x34d399,
        },
      },
      {
        id: 'buddha_white_marble',
        nameHe: 'שיש לבן טהור והילת ספיר',
        subtitleHe: 'פיסול שיש לבן עם הילה תכולה זוהרת',
        badgeColors: ['#f8fafc', '#38bdf8', '#1e3a8a'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0x1e3a8a,
          accentHex: 0xcbd5e1,
          emissiveHex: 0x38bdf8,
        },
      },
    ],
  },
] as const;
// #endregion

// ======================== PURE DOMAIN FUNCTIONS ======================== \\
// #region Pure Domain Functions

/**
 * Summary: Retrieves an entity definition by ID, falling back to the first entity.
 */
export function getLabEntityById(entityId: string): ILabEntityDef {
  return LAB_ENTITIES.find((e) => e.id === entityId) ?? LAB_ENTITIES[0];
}

/**
 * Summary: Retrieves an animation definition for a given entity, falling back to 'none' (static pose).
 */
export function getLabAnimationForEntity(
  entity: ILabEntityDef,
  animationId: string
): ILabAnimationDef {
  return (
    entity.animations.find((a) => a.id === animationId) ??
    entity.animations.find((a) => a.id === 'none') ??
    entity.animations[0]
  );
}

/**
 * Summary: Retrieves a skin definition for a given entity, falling back to its default skin.
 */
export function getLabSkinForEntity(
  entity: ILabEntityDef,
  skinId: string
): ILabSkinDef {
  return entity.skins.find((s) => s.id === skinId) ?? entity.skins[0];
}

/**
 * Summary: Filters entities by category ('all' | 'characters' | 'animals') and Hebrew/English search query.
 */
export function filterLabEntities(
  entities: readonly ILabEntityDef[],
  category: LabCategoryFilter,
  searchQuery: string
): readonly ILabEntityDef[] {
  const q = searchQuery.trim().toLowerCase();
  return entities.filter((entity) => {
    if (category !== 'all' && entity.category !== category) {
      return false;
    }
    if (!q) return true;
    return (
      entity.nameHe.toLowerCase().includes(q) ||
      entity.subtitleHe.toLowerCase().includes(q) ||
      entity.worldLocationHe.toLowerCase().includes(q) ||
      entity.anatomyTagsHe.some((t) => t.toLowerCase().includes(q)) ||
      entity.id.toLowerCase().includes(q)
    );
  });
}

/**
 * Summary: Creates the initial Lab session state — always starting with 'none' (no animation)!
 */
export function createInitialLabSessionState(initialEntityId?: string): ILabSessionState {
  const entity = getLabEntityById(initialEntityId ?? LAB_ENTITIES[0].id);
  return {
    selectedEntityId: entity.id,
    selectedAnimationId: 'none',
    selectedSkinId: entity.skins[0].id,
    activeRightTab: 'animations',
    categoryFilter: entity.category,
    searchQuery: '',
    playbackSpeed: 1.0,
    isPaused: false,
    manualPhase: 0,
    autoTurntable: false,
    showWireframe: false,
    showFloorGrid: true,
    showHeightRuler: false,
    stageEnvironment: 'studio_day',
    cameraPreset: 'angle',
  };
}

/**
 * Summary: Selects a new entity in the Lab and resets animation to 'none' (static initial state)
 *          and skin to the entity's default skin, preserving 'all' filter if active.
 */
export function selectLabEntity(
  state: ILabSessionState,
  newEntityId: string
): ILabSessionState {
  const entity = getLabEntityById(newEntityId);
  return {
    ...state,
    selectedEntityId: entity.id,
    categoryFilter: state.categoryFilter === 'all' ? 'all' : entity.category,
    selectedAnimationId: 'none',
    selectedSkinId: entity.skins[0].id,
    isPaused: false,
    manualPhase: 0,
  };
}

/**
 * Summary: Switches between 'all', 'characters' (דמויות), and 'animals' (חיות) categories,
 *          automatically selecting the first entity of that category in static 'none' pose
 *          if the currently active entity belongs to another category.
 */
export function selectLabCategory(
  state: ILabSessionState,
  newCategory: LabCategoryFilter
): ILabSessionState {
  if (newCategory === 'all') {
    return {
      ...state,
      categoryFilter: 'all',
    };
  }
  const currentEntity = getLabEntityById(state.selectedEntityId);
  if (currentEntity.category === newCategory) {
    return {
      ...state,
      categoryFilter: newCategory,
    };
  }
  const firstInCategory =
    LAB_ENTITIES.find((e) => e.category === newCategory) ?? LAB_ENTITIES[0];
  return {
    ...state,
    categoryFilter: newCategory,
    selectedEntityId: firstInCategory.id,
    selectedAnimationId: 'none',
    selectedSkinId: firstInCategory.skins[0].id,
    isPaused: false,
    manualPhase: 0,
  };
}

/**
 * Summary: Computes normalized cycle progress in [0, 1) for a given elapsed time, speed, and animation.
 *          Returns 0 when animationId is 'none'.
 */
export function computeLabAnimationCycleProgress(
  animation: ILabAnimationDef,
  elapsedTimeSec: number,
  playbackSpeed: number,
  isPaused: boolean,
  manualPhase: number
): number {
  if (animation.id === 'none' || animation.isStaticDefault) {
    return 0;
  }
  if (isPaused) {
    return ((manualPhase % 1) + 1) % 1;
  }
  const dur = Math.max(0.1, animation.loopDurationSec);
  const scaled = (elapsedTimeSec * Math.max(0, playbackSpeed)) / dur;
  return ((scaled % 1) + 1) % 1;
}

/**
 * Summary: Returns the effective playback speed multiplier for a given entity's pose overrides and animation.
 *          Prioritizes perAnimationSpeeds[animationId], then animationSpeedMultiplier, then fallbackSpeed.
 */
export function getEffectiveLabAnimationSpeed(
  overrides: ILabPoseOverrides | undefined,
  animationId: string,
  fallbackSpeed = 1.0
): number {
  if (!overrides) return fallbackSpeed;
  const perAnim = overrides.perAnimationSpeeds?.[animationId];
  if (typeof perAnim === 'number' && Number.isFinite(perAnim) && perAnim > 0) {
    return Math.max(0.1, Math.min(3.0, perAnim));
  }
  const entitySpeed = overrides.animationSpeedMultiplier;
  if (typeof entitySpeed === 'number' && Number.isFinite(entitySpeed) && entitySpeed > 0) {
    return Math.max(0.1, Math.min(3.0, entitySpeed));
  }
  return fallbackSpeed;
}

/**
 * Summary: Counts how many fine-tuning fields in ILabPoseOverrides differ from their default values.
 */
export function countActivePoseOverrides(overrides: ILabPoseOverrides): number {
  let count = 0;
  if (overrides.equipmentVisibilityMode && overrides.equipmentVisibilityMode !== 'auto') count++;
  if (Math.abs(overrides.amplitudeMultiplier - 1.0) > 0.001) count++;
  if (Math.abs((overrides.animationSpeedMultiplier ?? 1.0) - 1.0) > 0.001) count++;
  if (overrides.perAnimationSpeeds) {
    for (const spd of Object.values(overrides.perAnimationSpeeds)) {
      if (typeof spd === 'number' && Math.abs(spd - 1.0) > 0.001) count++;
    }
  }
  if (Math.abs(overrides.weaponRotXDeg) > 0.1) count++;
  if (Math.abs(overrides.weaponRotYDeg) > 0.1) count++;
  if (Math.abs(overrides.weaponRotZDeg) > 0.1) count++;
  if (Math.abs(overrides.weaponScale - 1.0) > 0.001) count++;
  if (Math.abs(overrides.leftWeaponRotXDeg ?? 0) > 0.1) count++;
  if (Math.abs(overrides.leftWeaponRotYDeg ?? 0) > 0.1) count++;
  if (Math.abs(overrides.leftWeaponRotZDeg ?? 0) > 0.1) count++;
  if (Math.abs((overrides.leftWeaponScale ?? 1.0) - 1.0) > 0.001) count++;
  if (Math.abs(overrides.rightLimbRotXDeg) > 0.1) count++;
  if (Math.abs(overrides.rightLimbRotYDeg) > 0.1) count++;
  if (Math.abs(overrides.rightLimbRotZDeg) > 0.1) count++;
  if (Math.abs(overrides.leftLimbRotXDeg) > 0.1) count++;
  if (Math.abs(overrides.leftLimbRotYDeg) > 0.1) count++;
  if (Math.abs(overrides.leftLimbRotZDeg) > 0.1) count++;
  if (Math.abs(overrides.headRotXDeg) > 0.1) count++;
  if (Math.abs(overrides.headRotYDeg) > 0.1) count++;
  if (Math.abs(overrides.headRotZDeg) > 0.1) count++;
  if (Math.abs(overrides.bodyRotXDeg) > 0.1) count++;
  if (Math.abs(overrides.bodyRotYDeg) > 0.1) count++;
  if (Math.abs(overrides.bodyRotZDeg) > 0.1) count++;
  if (Math.abs(overrides.bodyOffsetY) > 0.001) count++;
  return count;
}

/**
 * Summary: Returns context-aware Hebrew labels for the entity's editable right-hand weapon,
 *          left-hand weapon, and limbs.
 */
export function getEntityEditorLabelsHe(entityId: string): {
  readonly weaponGroupTitleHe: string;
  readonly leftWeaponGroupTitleHe: string;
  readonly rightLimbTitleHe: string;
  readonly leftLimbTitleHe: string;
  readonly headTitleHe: string;
} {
  switch (entityId) {
    case 'ranger_third_person':
    case 'ranger_first_person':
      return {
        weaponGroupTitleHe: 'נשק ביד ימין — חרב רונות / לפיד',
        leftWeaponGroupTitleHe: 'נשק ביד שמאל — קשת ריקרב',
        rightLimbTitleHe: 'זרוע ויד ימין (אחיזת חרב)',
        leftLimbTitleHe: 'זרוע ויד שמאל (אחיזת קשת)',
        headTitleHe: 'ראש ומבט',
      };
    case 'dwarven_miner':
      return {
        weaponGroupTitleHe: 'כלי ביד ימין — מכוש ברזל',
        leftWeaponGroupTitleHe: 'כלי ביד שמאל — עששית כורים',
        rightLimbTitleHe: 'זרוע ימין (הנפת מכוש)',
        leftLimbTitleHe: 'זרוע שמאל (נשיאת עששית)',
        headTitleHe: 'ראש, קסדה וזקן',
      };
    case 'shaolin_monk':
      return {
        weaponGroupTitleHe: 'נשק ביד ימין — מוט לחימה מוזהב (Staff)',
        leftWeaponGroupTitleHe: 'אבנט משי וציוד משני',
        rightLimbTitleHe: 'זרוע ימין (אחיזת מוט)',
        leftLimbTitleHe: 'זרוע שמאל',
        headTitleHe: 'ראש וצוואר',
      };
    case 'tai_chi_monk':
      return {
        weaponGroupTitleHe: 'אבנט משי ואביזר ראשי',
        leftWeaponGroupTitleHe: 'שרוול שמאל ואביזר משני',
        rightLimbTitleHe: 'זרוע ימין (טאי־צ׳י)',
        leftLimbTitleHe: 'זרוע שמאל (טאי־צ׳י)',
        headTitleHe: 'ראש וצוואר',
      };
    case 'harbor_merchant':
      return {
        weaponGroupTitleHe: 'כלי ביד ימין — פטיש נפחים',
        leftWeaponGroupTitleHe: 'אביזר ביד שמאל — מגילת סוחר',
        rightLimbTitleHe: 'זרוע ימין (פטיש)',
        leftLimbTitleHe: 'זרוע שמאל (מגילה)',
        headTitleHe: 'ראש וכובע סוחרים',
      };
    case 'dwarven_king_statue':
      return {
        weaponGroupTitleHe: 'נשק ביד ימין — גרזן קרב דו־להבי',
        leftWeaponGroupTitleHe: 'אביזר ביד שמאל — עששית השער',
        rightLimbTitleHe: 'זרוע הגרזן הימנית',
        leftLimbTitleHe: 'זרוע העששית השמאלית',
        headTitleHe: 'ראש הכתר והזקן',
      };
    case 'golden_buddha':
      return {
        weaponGroupTitleHe: 'הילת האור המוזהבת',
        leftWeaponGroupTitleHe: 'כס הלוטוס העליון',
        rightLimbTitleHe: 'כתף וצד ימין',
        leftLimbTitleHe: 'כתף וצד שמאל',
        headTitleHe: 'ראש הבודהה',
      };
    case 'mountain_eagle':
    case 'flock_bird':
    case 'harbor_seagull':
      return {
        weaponGroupTitleHe: 'מניפת זנב (היגוי תעופה)',
        leftWeaponGroupTitleHe: 'מקור קדמי',
        rightLimbTitleHe: 'כנף ימין',
        leftLimbTitleHe: 'כנף שמאל',
        headTitleHe: 'ראש וצוואר',
      };
    case 'meadow_butterfly':
      return {
        weaponGroupTitleHe: 'מחוש ימין',
        leftWeaponGroupTitleHe: 'מחוש שמאל',
        rightLimbTitleHe: 'כנף ימין (קדמית + אחורית)',
        leftLimbTitleHe: 'כנף שמאל (קדמית + אחורית)',
        headTitleHe: 'ראש וחזה',
      };
    case 'koi_fish':
      return {
        weaponGroupTitleHe: 'סנפיר זנב דו־אונתי (דחף)',
        leftWeaponGroupTitleHe: 'סנפיר גב עליון',
        rightLimbTitleHe: 'סנפיר חזה ימין',
        leftLimbTitleHe: 'סנפיר חזה שמאל',
        headTitleHe: 'ראש וזיפי שפם',
      };
    case 'forest_deer':
      return {
        weaponGroupTitleHe: 'כתר קרניים מסועפות',
        leftWeaponGroupTitleHe: 'זנב האייל',
        rightLimbTitleHe: 'רגליים ימניות',
        leftLimbTitleHe: 'רגליים שמאליות',
        headTitleHe: 'ראש וצוואר',
      };
    case 'forest_bear':
      return {
        weaponGroupTitleHe: 'כפה וטופרים ימניים',
        leftWeaponGroupTitleHe: 'לסת תחתונה ושיניים',
        rightLimbTitleHe: 'רגליים ימניות של הדוב',
        leftLimbTitleHe: 'רגליים שמאליות של הדוב',
        headTitleHe: 'ראש וצוואר הדוב',
      };
    case 'river_crocodile':
      return {
        weaponGroupTitleHe: 'מלתעות ולסת תחתונה',
        leftWeaponGroupTitleHe: 'זנב שריוני מפרקי',
        rightLimbTitleHe: 'רגליים ימניות של התנין',
        leftLimbTitleHe: 'רגליים שמאליות של התנין',
        headTitleHe: 'ראש וחרטום התנין',
      };
    default:
      return {
        weaponGroupTitleHe: 'זנב / אביזר ראשי',
        leftWeaponGroupTitleHe: 'אוכף / אוזניים / אביזר משני',
        rightLimbTitleHe: 'רגליים ימניות',
        leftLimbTitleHe: 'רגליים שמאליות',
        headTitleHe: 'ראש וצוואר',
      };
  }
}
// #endregion
