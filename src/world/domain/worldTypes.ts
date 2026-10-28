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

export type WalkPaceMode = 'relaxed' | 'normal' | 'fast';
export type CameraPerspectiveMode = 'third_person' | 'first_person';
export type EquippedToolSlot = 'bow' | 'sword' | 'torch' | 'unarmed';
export type ArrowElementKind = 'normal' | 'fire' | 'wind';
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

export interface InventoryItemDef {
  id: InventoryItemId;
  nameHe: string;
  category: 'weapons' | 'materials' | 'ammo' | 'gear' | 'treasures';
  categoryLabelHe: string;
  statLabelHe: string;
  weight: number;
  valueGold: number;
  requiredLevel: number;
  weaponRole?: 'bow' | 'sword';
  starterOwned?: boolean;
  descriptionHe: string;
  loreHe?: string;
  rarity?: 'common' | 'refined' | 'epic' | 'legendary';
}

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

export interface ObstacleCylinder {
  x: number;
  z: number;
  radius: number;
  kind: 'pine' | 'oak' | 'birch' | 'palm' | 'acacia' | 'boulder' | 'pillar';
  scale: number;
  seed: number;
}

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

export interface PlayerInput {
  forward: number; // -1 to 1
  right: number;   // -1 to 1
  sprint: boolean; // Shift = מהיר
  relaxed: boolean; // Ctrl = נינוח (or descend when flying)
  jumpPressed: boolean;
  jumpHeld: boolean;
  toggleFlyRequested?: boolean;
  toggleMountHorseRequested?: boolean;
  lookYawDelta: number;
  lookPitchDelta: number;
}

export interface RideableHorseDef {
  id: string;
  nameHe: string;
  coatColorHex: number;
  maneColorHex: number;
  saddleColorHex: number;
  homeX: number;
  homeZ: number;
  homeYaw: number;
}

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

export interface ValleyFarmDef {
  id: string;
  doorId: string;
  nameHe: string;
  x: number;
  z: number;
  height: number;
  clearRadius: number;
  fenceHalfW: number;
  fenceHalfD: number;
  gateHalfW: number;
  dirZ: 1 | -1; // +1 = front gate faces South (+Z), -1 = front gate faces North (-Z) toward approaching trail
}

export interface HillWatchtowerDef {
  id: string;
  doorId: string;
  nameHe: string;
  x: number;
  z: number;
  baseY: number;
  deckY: number;
  halfSize: number;
  yaw: number;
  doorSideLocalZ: 1 | -1;
  bridgeSideLocalZ: 1 | -1 | 0;
  localLadderX: number;
  localLadderZ: number;
  ladderX: number;
  ladderZ: number;
  standX: number;
  standZ: number;
  doorX: number;
  doorZ: number;
  doorMinX: number;
  doorMaxX: number;
  doorMinZ: number;
  doorMaxZ: number;
  isWest: boolean;
  isSouth: boolean;
  connectedToBridge: boolean;
}

export interface DwarvenGuardianStatueDef {
  id: string;
  nameHe: string;
  x: number;
  z: number;
  baseY: number;
  pedestalHalfSize: number;
  totalHeight: number;
  yaw: number;
  side: 'west' | 'east';
}

export interface DwarvenStoneHouseDef {
  id: string;
  doorId: string;
  nameHe: string;
  x: number;
  z: number;
  terraceY: number;
  floorY: number;
  halfW: number; // along X
  halfD: number; // along Z
  dirX: 1 | -1;  // +1 = door on East wall (+X) facing the central road, -1 = door on West wall (-X) facing the central road
  doorX: number;
  doorZ: number;
}

export interface DwarvenMinerCaravanState {
  dwarfIndex: number;
  nameHe: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  activity: 'resting_home' | 'caravan_to_mine' | 'mining_work' | 'caravan_to_home';
  walkCycle: number;
  miningSwing: number; // 0..1 pickaxe swing phase when mining
  lanternLit: boolean;
}

export interface CornerWatchtowerDef {
  id: string;
  doorId: string;
  nameHe: string;
  cx: number;
  cz: number;
  doorX: number;
  doorZ: number;
  ladderX: number;
  ladderZ: number;
  isWest: boolean;
  isSouth: boolean;
}

export interface ClimbableLadderInfo {
  id: string;
  nameHe: string;
  ladderX: number;
  ladderZ: number;
  standX: number;
  standZ: number;
  isWest: boolean;
  isSouth: boolean;
  minY: number;
  maxY: number;
  floors: readonly number[];
}

export interface FortressDoorDef {
  id: string;
  buildingNameHe: string;
  x: number;
  y: number;
  z: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  interactRadius: number;
}

export interface SolidBuildingBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
}

export interface ArcheryTargetDef {
  id: string;
  nameHe: string;
  x: number;
  z: number;
  yaw: number;
  bullseyeRadius: number;
}

export interface ArrowTrailPoint {
  x: number;
  y: number;
  z: number;
  age: number; // seconds since emitted (fades out over 0.85s)
}

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

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherKind =
  | 'clear_clouds'
  | 'regional_rain'
  | 'dense_fog'
  | 'mountain_snow'
  | 'lightning_storm'
  | 'wind_sand';
export type WeatherCycleMode = 'turbo_test' | 'seasonal';
export type WeatherToggleOption =
  | 'auto'
  | 'clear_clouds'
  | 'regional_rain'
  | 'dense_fog'
  | 'lightning_storm';

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
