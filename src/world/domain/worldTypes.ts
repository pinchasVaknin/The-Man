// ============================================================================
// MODULE: World / Domain / Types
// DESIGN: Core domain data structures, state models, and configuration types (DIP, SRP)
// SUMMARY: Declares immutable and runtime types for player state, world landmarks,
//          inventory catalog, dynamic atmosphere, weather cycles, and entities.
//          Does not contain business logic or Three.js scene instances.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
export { Result } from '../../core/Result';
export { AppException, InfrastructureCorruptedException, InvalidResultAccessException } from '../../core/AppException';
// #endregion

// ======================== BIOME & LOCOMOTION TYPES ======================== \\
// #region Biome & Locomotion Types
/** Summary: Spatial biome classifications determining terrain texture, vegetation and sound. */
export type BiomeType =
  | 'water'
  | 'pier'
  | 'bridge'
  | 'cabin'
  | 'trail'
  | 'shore'
  | 'meadow'
  | 'forest'
  | 'birch_grove'
  | 'desert'
  | 'highland'
  | 'rock';

/** Summary: Movement speed pacing options for ground navigation. */
export type WalkPaceMode = 'relaxed' | 'normal' | 'fast';

/** Summary: Camera point-of-view modes. */
export type CameraPerspectiveMode = 'third_person' | 'first_person';

/** Summary: Active hand-held tool or weapon equipment slot. */
export type EquippedToolSlot = 'bow' | 'sword' | 'torch' | 'unarmed';

/** Summary: Elemental arrow enchantment types. */
export type ArrowElementKind = 'normal' | 'fire' | 'wind';

/** Summary: Unique inventory item catalog identifiers. */
export type InventoryItemId =
  | 'bow'
  | 'sword'
  | 'katana_imperial'
  | 'elven_longbow'
  | 'dwarven_warhammer'
  | 'dragonbone_bow'
  | 'celestial_jin_sword'
  | 'torch'
  | 'unarmed'
  | 'arrow_normal'
  | 'arrow_fire'
  | 'arrow_wind'
  | 'oak_timber'
  | 'cut_granite_blocks'
  | 'iron_ingots'
  | 'imperial_clay_tiles'
  | 'marble_pillar_stone'
  | 'dwarven_gold_ore'
  | 'crystal_gem'
  | 'ancient_dwarven_horn'
  | 'elven_cloak';
// #endregion

// ======================== INVENTORY & EQUIPMENT TYPES ======================== \\
// #region Inventory & Equipment Types
/** Summary: Definition schema for static inventory items in the world catalog. */
export interface InventoryItemDef {
  readonly id: InventoryItemId;
  readonly nameHe: string;
  readonly category: 'weapons' | 'materials' | 'ammo' | 'gear' | 'treasures';
  readonly categoryLabelHe: string;
  readonly statLabelHe: string;
  readonly weight: number;
  readonly valueGold: number;
  readonly requiredLevel: number;
  readonly weaponRole?: 'bow' | 'sword';
  readonly starterOwned?: boolean;
  readonly descriptionHe: string;
  readonly loreHe?: string;
  readonly rarity?: 'common' | 'refined' | 'epic' | 'legendary';
}

/** Summary: Static registry of all available inventory items in the game world. */
export const INVENTORY_ITEMS: readonly InventoryItemDef[] = [
  {
    id: 'bow',
    nameHe: 'קשת ציידים מורכבת',
    category: 'weapons',
    categoryLabelHe: 'כלי נשק',
    statLabelHe: 'נזק 28 · קשת ריקרב',
    weight: 3,
    valueGold: 145,
    requiredLevel: 1,
    weaponRole: 'bow',
    starterOwned: true,
    rarity: 'refined',
    descriptionHe:
      'קשת עץ מלוטשת בעיטורי קרן מוזהבים. החזק קליק שמאלי בעכבר או [R] למתיחת חץ (עם זום מיקוד), וקליק ימני לזום תצפית קרוב.',
    loreHe: 'חושלה בידי קשתי העמק העתיק מעץ אלון מיושן וקרן יעלים, בעלת גמישות מושלמת וחדירה קטלנית.',
  },
  {
    id: 'sword',
    nameHe: 'חרב סיירים מפלדה',
    category: 'weapons',
    categoryLabelHe: 'כלי נשק',
    statLabelHe: 'נזק 34 · להב רונות',
    weight: 4,
    valueGold: 180,
    requiredLevel: 1,
    weaponRole: 'sword',
    starterOwned: true,
    rarity: 'refined',
    descriptionHe:
      'חרב רונות מעוטרת בניצב זהב. לחיצה קצרה לשיסוף רוחבי מהיר, לחיצה ארוכה למכה כבדה החותכת את האוויר קדימה, וקליק ימני לחסימה.',
    loreHe: 'להב פלדה מקושט בחריטות קסומות של אנרגיית רוח. מכה כבדה חותכת את האוויר בגל חרמש בוהק.',
  },
  {
    id: 'katana_imperial',
    nameHe: 'חרב להב קיסרית',
    category: 'weapons',
    categoryLabelHe: 'כלי נשק',
    statLabelHe: 'נזק 48 · חיתוך אוויר חד',
    weight: 3,
    valueGold: 220,
    requiredLevel: 1,
    weaponRole: 'sword',
    starterOwned: false,
    rarity: 'epic',
    descriptionHe:
      'חרב קלה ומאוזנת מהנפחייה של שוק הנמל. מעניקה שיסוף מהיר וחד עם צריכת סיבולת מופחתת.',
    loreHe: 'חושלה מפלדת דמשק מקופלת בידי אומני המבצר הצפוני עבור שומרי הסף הקיסריים.',
  },
  {
    id: 'elven_longbow',
    nameHe: 'קשת אלפים עתיקה',
    category: 'weapons',
    categoryLabelHe: 'כלי נשק',
    statLabelHe: 'נזק 56 · מהירות חץ +25%',
    weight: 2,
    valueGold: 340,
    requiredLevel: 2,
    weaponRole: 'bow',
    starterOwned: false,
    rarity: 'epic',
    descriptionHe:
      'קשת ארוכה מעץ ליבנה מוזהב ומיתר משי כסוף. דורשת דרגת סייר 2 ומעניקה מעוף חץ שטוח ומהיר.',
    loreHe: 'נוצרה בחורשת הלבנה המזרחית ומאפשרת צליפה מדויקת למרחקים עצומים ללא מאמץ.',
  },
  {
    id: 'dwarven_warhammer',
    nameHe: 'חרב מלכי הגמדים',
    category: 'weapons',
    categoryLabelHe: 'כלי נשק',
    statLabelHe: 'נזק 74 · מכה כבדה אדירה',
    weight: 6,
    valueGold: 480,
    requiredLevel: 3,
    weaponRole: 'sword',
    starterOwned: false,
    rarity: 'epic',
    descriptionHe:
      'להב דו־ידני כבד המחושל מזהב־גמדים ופלדת מעמקים. דורש דרגת סייר 3 ומשחרר גל הדף רחב במכה כבדה.',
    loreHe: 'חושלה בכבשני הלבה של המכרה הדרומי בידי נפחי שושלת הגמדים הקדומה.',
  },
  {
    id: 'dragonbone_bow',
    nameHe: 'קשת עצם־דרקון אגדית',
    category: 'weapons',
    categoryLabelHe: 'כלי נשק',
    statLabelHe: 'נזק 92 · עוצמת חדירה מקסימלית',
    weight: 5,
    valueGold: 680,
    requiredLevel: 4,
    weaponRole: 'bow',
    starterOwned: false,
    rarity: 'legendary',
    descriptionHe:
      'קשת מיתולוגית מחושלת מעצמות דרקון השמיים המוזהב. דורשת דרגת סייר 4 וזמינה לרכישה בשוק הסוחרים.',
    loreHe: 'רק צלפים ותיקים בעלי כוח זרוע עילאי מסוגלים למתוח את מיתר הקשת האגדית הזו.',
  },
  {
    id: 'celestial_jin_sword',
    nameHe: 'חרב ג׳ין שמיימית',
    category: 'weapons',
    categoryLabelHe: 'כלי נשק',
    statLabelHe: 'נזק 118 · להב קיסרי אגדי',
    weight: 4,
    valueGold: 920,
    requiredLevel: 5,
    weaponRole: 'sword',
    starterOwned: false,
    rarity: 'legendary',
    descriptionHe:
      'פאר היצירה של השוק הקיסרי — להב ירקן וזהב החותך את האוויר בגל אנרגיה אדיר. דורש דרגת סייר 5.',
    loreHe: 'חרב טקסית וקטלנית שהוענקה למצביאי המבצר הסיני על פסגת ההר הצפוני.',
  },
  {
    id: 'torch',
    nameHe: 'לפיד אש בוער',
    category: 'gear',
    categoryLabelHe: 'ציוד שטח',
    statLabelHe: 'אור אש חי · רדיוס 28 מ׳',
    weight: 1,
    valueGold: 25,
    requiredLevel: 1,
    starterOwned: true,
    rarity: 'common',
    descriptionHe:
      'לפיד עץ וברזל המפיץ תאורת אש חמה בזמן אמת — מושלם לחקירת 4 אולמות המכרה התת־קרקעי, מערות ולילות חשוכים.',
    loreHe: 'ספוג בזפת הרים עשירה הבוערת ללא הרף גם ברוחות עזות ובגשמים קלים.',
  },
  {
    id: 'arrow_normal',
    nameHe: 'חצי פלדה מחושלים',
    category: 'ammo',
    categoryLabelHe: 'חצים ותחמושת',
    statLabelHe: 'נזק +10 · מעוף מאוזן',
    weight: 0,
    valueGold: 40,
    requiredLevel: 1,
    starterOwned: true,
    rarity: 'common',
    descriptionHe:
      'חצי עץ מובחרים עם חוד פלדה מושחז ונוצות ייצוב אדומות־לבנות, המותירים שובל אוויר אפור במעופם.',
  },
  {
    id: 'arrow_fire',
    nameHe: 'חצי אש בוערים',
    category: 'ammo',
    categoryLabelHe: 'חצים ותחמושת',
    statLabelHe: 'נזק +18 אש · מאיר במעוף',
    weight: 0,
    valueGold: 95,
    requiredLevel: 1,
    starterOwned: true,
    rarity: 'refined',
    descriptionHe:
      'חצים משוחים בשמן דליק הבוערים במעופם, מפיצים אור אש סביבם ויוצרים שובל עשן סמיך בפגיעה.',
  },
  {
    id: 'arrow_wind',
    nameHe: 'חצי סערה קלים',
    category: 'ammo',
    categoryLabelHe: 'חצים ותחמושת',
    statLabelHe: 'נזק +14 · מהירות x1.42',
    weight: 0,
    valueGold: 85,
    requiredLevel: 1,
    starterOwned: true,
    rarity: 'refined',
    descriptionHe:
      'חצים אווירודינמיים קלים הטסים במהירות גבוהה ובמסלול שטוח במיוחד לצליפה לטווח רחוק.',
  },
  {
    id: 'oak_timber',
    nameHe: 'קורות עץ אלון מוקצע',
    category: 'materials',
    categoryLabelHe: 'חומרי בנייה',
    statLabelHe: 'עץ בנייה מסיבי · שווי 65 מטבעות',
    weight: 3,
    valueGold: 65,
    requiredLevel: 1,
    starterOwned: true,
    rarity: 'common',
    descriptionHe:
      'קורות עץ אלון יבשות וחזקות מחורשות העמק, המשמשות להקמת גגות, עמודי תמך, גשרים וביצורים.',
    loreHe: 'נכרתו ועובדו במנסרת העמק ומבוקשות מאוד אצל בנאי הנמל והמבצר.',
  },
  {
    id: 'cut_granite_blocks',
    nameHe: 'לבני גרניט מסותתות',
    category: 'materials',
    categoryLabelHe: 'חומרי בנייה',
    statLabelHe: 'אבן בנייה כבדה · שווי 90 מטבעות',
    weight: 4,
    valueGold: 90,
    requiredLevel: 1,
    starterOwned: true,
    rarity: 'refined',
    descriptionHe:
      'גלילי ולבני גרניט אפור־מוזהב שנחצבו במורדות ההרים הדרומיים, מותאמים לבניית חומות, קשתות ובתי אבן.',
    loreHe: 'סותתו בדיוק הנדסי על־ידי סתתי האבן של ממלכת הגמדים.',
  },
  {
    id: 'iron_ingots',
    nameHe: 'מטילי ברזל מחושלים',
    category: 'materials',
    categoryLabelHe: 'חומרי בנייה',
    statLabelHe: 'מתכת לחישול וחיזוק · שווי 130 מטבעות',
    weight: 3,
    valueGold: 130,
    requiredLevel: 1,
    starterOwned: true,
    rarity: 'refined',
    descriptionHe:
      'מטילי ברזל טהורים מכבשני ההתכה, משמשים לחישול צירי שערים, פרזול מבנים וחידוד להבים בנפחיית הנמל.',
    loreHe: 'נוצקו מעפרת ברזל הררית ומהווים חומר גלם מרכזי בשוק הסוחרים של הנמל.',
  },
  {
    id: 'imperial_clay_tiles',
    nameHe: 'רעפי חרס קיסריים',
    category: 'materials',
    categoryLabelHe: 'חומרי בנייה',
    statLabelHe: 'חיפוי גגות מסורתי · שווי 155 מטבעות',
    weight: 2,
    valueGold: 155,
    requiredLevel: 1,
    starterOwned: false,
    rarity: 'refined',
    descriptionHe:
      'רעפי חרס מזוגגים בגוון ארגמן־זהב העמידים בפני סופות גשמים ושלגים. נמכרים בדוכני שוק הנמל.',
    loreHe: 'זהים לרעפים המעטרים את גגות ההיכל המרכזי במבצר הסיני הצפוני.',
  },
  {
    id: 'marble_pillar_stone',
    nameHe: 'אבן שיש לבנה לעמודים',
    category: 'materials',
    categoryLabelHe: 'חומרי בנייה',
    statLabelHe: 'שיש מפואר · שווי 260 מטבעות',
    weight: 4,
    valueGold: 260,
    requiredLevel: 2,
    starterOwned: false,
    rarity: 'epic',
    descriptionHe:
      'גוש שיש לבן מלוטש בעל עורקים כסופים לעיטור היכלות, מרפסות ומזרקות אבן.',
    loreHe: 'יובא בספינות הסוחר הגדולות העוגנות ברציפי הנמל הדרום־מזרחי.',
  },
  {
    id: 'dwarven_gold_ore',
    nameHe: 'עפרת זהב ממכרה הגמדים',
    category: 'materials',
    categoryLabelHe: 'חומרי בנייה',
    statLabelHe: 'מחצב נדיר · שווי 220 מטבעות',
    weight: 2,
    valueGold: 220,
    requiredLevel: 1,
    starterOwned: true,
    rarity: 'epic',
    descriptionHe:
      'גביש גולמי של עפרת זהב טהורה שנחצבה במעמקי מכרה הגמדים הדרומי. ניתן למכירה לסוחרי שוק הנמל תמורת זהב רב!',
    loreHe: 'מחצב יקר ערך הנחצב בידי כורי הגמדים היוצאים בשיירת הזריחה ומובא למטלורגיה העתיקה.',
  },
  {
    id: 'crystal_gem',
    nameHe: 'גביש קריסטל ביולומינצנטי',
    category: 'materials',
    categoryLabelHe: 'חומרי בנייה',
    statLabelHe: 'קרינת אור תכלת · שווי 350 מטבעות',
    weight: 1,
    valueGold: 350,
    requiredLevel: 2,
    starterOwned: true,
    rarity: 'legendary',
    descriptionHe:
      'גביש זוהר הנאסף מאגם הקריסטלים באולם התת־קרקעי של המכרה הדרומי. זוהר בעוצמה גם במעמקים.',
    loreHe: 'אבן קדומה שנוצרה ממי התהום העשירים במינרלים של אגם המערות, מקרינה אנרגיה קרה ושלווה.',
  },
  {
    id: 'ancient_dwarven_horn',
    nameHe: 'קרן קרב של הגמדים',
    category: 'gear',
    categoryLabelHe: 'ציוד שטח',
    statLabelHe: 'הדהוד קולי בהרים · שווי 160',
    weight: 2,
    valueGold: 160,
    requiredLevel: 1,
    starterOwned: true,
    rarity: 'epic',
    descriptionHe:
      'קרן ברונזה מחושלת שעליה תבליטי פטיש ומגן. משמיעה תרועה אדירה המהדהדת ברחבי העמק והמבצר.',
    loreHe: 'שימשה את שומרי שערי הגמדים להתרעה על סכנות או לחגיגת תחילת מסע השיירה בעת הזריחה.',
  },
  {
    id: 'elven_cloak',
    nameHe: 'גלימת סיירים מהודרת',
    category: 'gear',
    categoryLabelHe: 'ציוד שטח',
    statLabelHe: 'הסוואה בטבע · שווי 190',
    weight: 1,
    valueGold: 190,
    requiredLevel: 2,
    starterOwned: false,
    rarity: 'refined',
    descriptionHe:
      'גלימת בד ירוקה־מוזהבת עם אבזם עלי אלון, מעניקה בידוד מושלם מרוחות הסתיו והשלג הצפוני.',
    loreHe: 'נארגה מחוטים גמישים שאינם משמיעים רשרוש, ומאפשרת לסיירי היער לחמוק בדממה מוחלטת.',
  },
  {
    id: 'unarmed',
    nameHe: 'ידיים חופשיות',
    category: 'gear',
    categoryLabelHe: 'ציוד שטח',
    statLabelHe: 'אפסון ציוד על הגב',
    weight: 0,
    valueGold: 0,
    requiredLevel: 1,
    starterOwned: true,
    rarity: 'common',
    descriptionHe:
      'מאפסן את הקשת והנשק על הגב לתנועה חופשית, תצפית נקייה ושחייה מהירה במים.',
  },
] as const;
// #endregion

// ======================== CHARACTER SKILLS & PLAYER STATE ======================== \\
// #region Character Skills & Player State
/** Summary: Skill progression tracking for RPG attributes. */
export interface CharacterSkillsState {
  archeryLevel: number;
  archeryXp: number;
  archeryXpNext: number;
  swordsmanshipLevel: number;
  swordsmanshipXp: number;
  swordsmanshipXpNext: number;
  horsemanshipLevel: number;
  horsemanshipXp: number;
  horsemanshipXpNext: number;
  athleticsLevel: number;
  athleticsXp: number;
  athleticsXpNext: number;
  explorationLevel: number;
  explorationXp: number;
  explorationXpNext: number;
  lastLevelUpSkill?: string | null;
  lastLevelUpTitleHe?: string | null;
  lastLevelUpTimer?: number;
}

/** Summary: Procedural collision cylinder definition. */
export interface ObstacleCylinder {
  x: number;
  z: number;
  radius: number;
  kind: 'pine' | 'oak' | 'birch' | 'palm' | 'acacia' | 'boulder' | 'pillar';
  scale: number;
  seed: number;
}

/** Summary: Complete runtime simulation state for the active player character. */
export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  onGround: boolean;
  isFlying: boolean;
  isSwimming?: boolean;
  lastJumpPressTime: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  bobPhase: number;
  bobAmount: number;
  distanceWalked: number;
  stepCount: number;
  inWater: boolean;
  currentBiome: BiomeType;
  walkPace: WalkPaceMode;
  stamina?: number; // 0..100
  maxStamina?: number; // 100
  skills?: CharacterSkillsState;
  goldCoins?: number;
  ownedItemIds?: InventoryItemId[];
  activeWeaponId?: InventoryItemId;
  climbingLadderId?: string | null;
  mountedHorseId?: string | null;
  mountedHorseYaw?: number;
  cameraPerspective?: CameraPerspectiveMode;
  equippedTool?: EquippedToolSlot;
  arrowKind?: ArrowElementKind;
  hotbarSlots?: [
    InventoryItemId | null,
    InventoryItemId | null,
    InventoryItemId | null,
    InventoryItemId | null,
  ];
  favoriteIds?: InventoryItemId[];
  swordSwingProgress?: number; // 0..1 when swinging sword
  swordComboIndex?: number; // 0, 1, 2 for 3-hit Skyrim slash combo
  swordHeavyAttack?: boolean; // true when executing a long-press heavy forward air-cleaving attack
  swordStrikePending?: boolean; // true during Phase B Wind-Up until Phase C active strike hit window resolves
  swordHitStopTimer?: number; // brief tactile hit-stop resistance timer upon striking a target/obstacle
  swordDebugFreezeProgress?: number | null; // optional deterministic phase inspection lock
  swordChargeTime?: number; // 0..1 windup progress while holding attack button
  swordBlocking?: boolean; // Right-click parry/block guard when sword is equipped
  swordBlockProgress?: number; // 0..1 smooth interpolation into horizontal block stance
  bowZoomHeld?: boolean; // Right-click closer zoom in bow mode (without drawing arrow)
  bowReleaseKick?: number; // 0..1 recoil kick right after releasing an arrow
  weaponSwayX?: number; // Smooth camera-turn horizontal weapon lag
  weaponSwayY?: number; // Smooth camera-pitch/vertical weapon lag
  lastSwordHitPoint?: {
    x: number;
    y: number;
    z: number;
    age: number;
    kind: 'target' | 'obstacle' | 'wall';
  } | null;
  lastSwordAirWave?: {
    startX: number;
    startY: number;
    startZ: number;
    dirX: number;
    dirY: number;
    dirZ: number;
    yaw: number;
    pitch: number;
    age: number;
  } | null;
  dashCooldown?: number;
  dashTimer?: number;
  bowDrawn?: boolean;
  bowDrawProgress?: number; // 0..1
  arrowsShotCount?: number;
  lastArrowHitTarget?: string | null;
}

/** Summary: Processed user input intent for a single simulation tick. */
export interface PlayerInput {
  forward: number; // -1 to 1
  right: number;   // -1 to 1
  sprint: boolean; // Shift = fast
  relaxed: boolean; // Ctrl = relaxed (or descend when flying)
  jumpPressed: boolean;
  jumpHeld: boolean;
  toggleFlyRequested?: boolean;
  toggleMountHorseRequested?: boolean;
  lookYawDelta: number;
  lookPitchDelta: number;
}
// #endregion

// ======================== ANIMAL & HORSE ENTITY TYPES ======================== \\
// #region Animal & Horse Entity Types
/** Summary: Immutable definition for a persistent mountable horse in the world. */
export interface RideableHorseDef {
  readonly id: string;
  readonly nameHe: string;
  readonly coatColorHex: number;
  readonly maneColorHex: number;
  readonly saddleColorHex: number;
  readonly homeX: number;
  readonly homeZ: number;
  readonly homeYaw: number;
}

/** Summary: Dynamic runtime state of a mountable horse. */
export interface RideableHorseState {
  id: string;
  nameHe: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  gaitPhase: number;
}
// #endregion

// ======================== ATMOSPHERE & WEATHER STATE ======================== \\
// #region Atmosphere & Weather State
/** Summary: Complete atmospheric lighting and sky rendering parameters for a frame. */
export interface DynamicAtmosphereState {
  worldHours: number; // 0..24 continuous clock
  timeString: string; // e.g. "06:52"
  phaseLabelHe: string;
  isNight: boolean;
  nightFactor: number; // 0 (day) .. 1 (full night)
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  sunDirX: number;
  sunDirY: number;
  sunDirZ: number;
  sunColorHex: number;
  sunIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  fogColorHex: number;
  fogDensity: number;
  morningMistOpacity: number; // 0..1 for low-lying ground/lake mist banks
  waterDeepHex: number;
  waterShallowHex: number;
  skyTurbidity: number;
  skyRayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  exposure: number;
}

/** Summary: Active world season category. */
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

/** Summary: Discrete weather condition types. */
export type WeatherKind =
  | 'clear_clouds'
  | 'regional_rain'
  | 'dense_fog'
  | 'mountain_snow'
  | 'lightning_storm'
  | 'wind_sand';

/** Summary: Weather progression cycle modes. */
export type WeatherCycleMode = 'turbo_test' | 'seasonal';

/** Summary: User-selectable weather override options. */
export type WeatherToggleOption =
  | 'auto'
  | 'clear_clouds'
  | 'regional_rain'
  | 'dense_fog'
  | 'lightning_storm';

/** Summary: Immutable snapshot of the dynamic weather system state. */
export interface WeatherStateSnapshot {
  mode: WeatherCycleMode;
  season: SeasonType;
  seasonLabelHe: string;
  weatherKind: WeatherKind;
  weatherLabelHe: string;
  cloudCoverage: number;      // 0.15 .. 1.0
  cloudDarkness: number;      // 0 (white cumulus) .. 1 (dark storm clouds)
  rainIntensity: number;      // 0 .. 1 (regional rain streaks)
  snowIntensity: number;      // 0 .. 1 (high-mountain / winter snowflakes)
  fogIntensity: number;       // 0 .. 1 (dense rolling fog & mist)
  wetness: number;            // 0 .. 1 (wet ground darkening & reflective rain puddles)
  windStrength: number;       // 0.15 .. 1.0 (sways trees, grass, clouds)
  sandWindIntensity: number;  // 0 .. 1 (strong wind with blowing sand/dust)
  lightningFlash: number;     // 0 .. 1 (instantaneous lightning bolt & sky flash)
  thunderTriggered: boolean;  // true on the onset of a lightning strike
  boltOriginX: number;
  boltOriginZ: number;
}
// #endregion

// ======================== WORLD STRUCTURES & LANDMARKS ======================== \\
// #region World Structures & Landmarks
/** Summary: Definition schema for a farm house compound. */
export interface ValleyFarmDef {
  readonly id: string;
  readonly doorId: string;
  readonly nameHe: string;
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly clearRadius: number;
  readonly fenceHalfW: number;
  readonly fenceHalfD: number;
  readonly gateHalfW: number;
  readonly dirZ: 1 | -1;
}

/** Summary: Definition schema for a hill watchtower structure. */
export interface HillWatchtowerDef {
  readonly id: string;
  readonly doorId: string;
  readonly nameHe: string;
  readonly x: number;
  readonly z: number;
  readonly baseY: number;
  readonly deckY: number;
  readonly halfSize: number;
  readonly yaw: number;
  readonly doorSideLocalZ: 1 | -1;
  readonly bridgeSideLocalZ: 1 | -1 | 0;
  readonly localLadderX: number;
  readonly localLadderZ: number;
  readonly ladderX: number;
  readonly ladderZ: number;
  readonly standX: number;
  readonly standZ: number;
  readonly doorX: number;
  readonly doorZ: number;
  readonly doorMinX: number;
  readonly doorMaxX: number;
  readonly doorMinZ: number;
  readonly doorMaxZ: number;
  readonly isWest: boolean;
  readonly isSouth: boolean;
  readonly connectedToBridge: boolean;
}

/** Summary: Definition schema for ancient dwarven kingdom guardian statues. */
export interface DwarvenGuardianStatueDef {
  readonly id: string;
  readonly nameHe: string;
  readonly x: number;
  readonly z: number;
  readonly baseY: number;
  readonly pedestalHalfSize: number;
  readonly totalHeight: number;
  readonly yaw: number;
  readonly side: 'west' | 'east';
}

/** Summary: Definition schema for enterable stone houses in the dwarven kingdom. */
export interface DwarvenStoneHouseDef {
  readonly id: string;
  readonly doorId: string;
  readonly nameHe: string;
  readonly x: number;
  readonly z: number;
  readonly terraceY: number;
  readonly floorY: number;
  readonly halfW: number;
  readonly halfD: number;
  readonly dirX: 1 | -1;
  readonly doorX: number;
  readonly doorZ: number;
}

/** Summary: Runtime simulation state for a travelling dwarven miner NPC. */
export interface DwarvenMinerCaravanState {
  dwarfIndex: number;
  nameHe: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  activity: 'resting_home' | 'caravan_to_mine' | 'mining_work' | 'caravan_to_home';
  walkCycle: number;
  miningSwing: number;
  lanternLit: boolean;
}

/** Summary: Definition schema for fortress corner watchtowers. */
export interface CornerWatchtowerDef {
  readonly id: string;
  readonly doorId: string;
  readonly nameHe: string;
  readonly cx: number;
  readonly cz: number;
  readonly doorX: number;
  readonly doorZ: number;
  readonly ladderX: number;
  readonly ladderZ: number;
  readonly isWest: boolean;
  readonly isSouth: boolean;
}

/** Summary: Information required to inspect and climb a vertical ladder. */
export interface ClimbableLadderInfo {
  readonly id: string;
  readonly nameHe: string;
  readonly ladderX: number;
  readonly ladderZ: number;
  readonly standX: number;
  readonly standZ: number;
  readonly isWest: boolean;
  readonly isSouth: boolean;
  readonly minY: number;
  readonly maxY: number;
  readonly floors: readonly number[];
}

/** Summary: Door entry interactable zone specification. */
export interface FortressDoorDef {
  readonly id: string;
  readonly buildingNameHe: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly interactRadius: number;
}

/** Summary: Axis-aligned bounding box for solid building collision. */
export interface SolidBuildingBox {
  readonly id: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly minY?: number;
  readonly maxY?: number;
}
// #endregion

// ======================== COMBAT & PROJECTILE TYPES ======================== \\
// #region Combat & Projectile Types
/** Summary: Stationary archery practice target definition. */
export interface ArcheryTargetDef {
  readonly id: string;
  readonly nameHe: string;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly bullseyeRadius: number;
}

/** Summary: Fading visual trail particle point emitted by a flying projectile. */
export interface ArrowTrailPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly age: number;
}

/** Summary: Runtime physics state for an active flying or lodged projectile arrow. */
export interface ArrowProjectile {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  arrowKind?: ArrowElementKind;
  stuck: boolean;
  hitKind: 'none' | 'target' | 'obstacle' | 'building' | 'ground';
  hitTargetId: string | null;
  age: number;
  trail: ArrowTrailPoint[];
}
// #endregion
