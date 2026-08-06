// Yono Workout — Equipment Catalog
// Short stable codes used throughout the application.

export interface EquipmentItem {
  code: string;
  name: string;
  aliases: string[];
  category: "machine" | "free_weight" | "cable" | "cardio" | "bodyweight" | "accessory";
}

export const equipment: EquipmentItem[] = [
  // ── MACHINES ──────────────────────────────────────────
  { code: "lat_pulldown_machine", name: "Lat Pulldown Machine", aliases: ["pulldown machine", "lat machine"], category: "machine" },
  { code: "seated_row_machine", name: "Seated Row Machine", aliases: ["row machine", "cable row machine"], category: "machine" },
  { code: "plate_loaded_row", name: "Plate-Loaded Row Machine", aliases: ["hammer strength row", "plate row"], category: "machine" },
  { code: "chest_press_machine", name: "Chest Press Machine", aliases: ["machine chest press", "selectorized chest press"], category: "machine" },
  { code: "incline_chest_press_machine", name: "Incline Chest Press Machine", aliases: ["machine incline press"], category: "machine" },
  { code: "shoulder_press_machine", name: "Shoulder Press Machine", aliases: ["machine shoulder press", "lateral raise machine"], category: "machine" },
  { code: "pec_deck", name: "Pec Deck / Butterfly Machine", aliases: ["pec deck fly", "machine fly", "butterfly"], category: "machine" },
  { code: "assisted_pull_up_machine", name: "Assisted Pull-Up & Dip Machine", aliases: ["assisted pullup machine", "gravitron"], category: "machine" },
  { code: "leg_press", name: "Leg Press", aliases: ["45 degree leg press", "machine leg press"], category: "machine" },
  { code: "hack_squat", name: "Hack Squat Machine", aliases: ["hack squat", "plate loaded hack"], category: "machine" },
  { code: "pendulum_squat", name: "Pendulum Squat Machine", aliases: ["pendulum squat"], category: "machine" },
  { code: "leg_extension", name: "Leg Extension Machine", aliases: ["knee extension machine"], category: "machine" },
  { code: "seated_leg_curl", name: "Seated Leg Curl Machine", aliases: ["seated hamstring curl"], category: "machine" },
  { code: "lying_leg_curl", name: "Lying Leg Curl Machine", aliases: ["prone leg curl", "hamstring curl machine"], category: "machine" },
  { code: "standing_leg_curl", name: "Standing Leg Curl Machine", aliases: ["unilateral leg curl"], category: "machine" },
  { code: "hip_abductor", name: "Hip Abductor Machine", aliases: ["outer thigh machine", "seated abductor"], category: "machine" },
  { code: "hip_adductor", name: "Hip Adductor Machine", aliases: ["inner thigh machine", "seated adductor"], category: "machine" },
  { code: "calf_raise_machine", name: "Calf Raise Machine", aliases: ["standing calf machine", "seated calf machine"], category: "machine" },
  { code: "smith_machine", name: "Smith Machine", aliases: ["smith"], category: "machine" },

  // ── CABLE ─────────────────────────────────────────────
  { code: "cable_station", name: "Cable Station", aliases: ["cable machine", "high low cable"], category: "cable" },
  { code: "functional_trainer", name: "Functional Trainer", aliases: ["dual cable machine", "adjustable cable"], category: "cable" },
  { code: "cable_crossover", name: "Cable Crossover", aliases: ["cable cross", "crossover machine"], category: "cable" },

  // ── FREE WEIGHTS ──────────────────────────────────────
  { code: "barbell", name: "Barbell", aliases: ["olympic bar", "straight bar"], category: "free_weight" },
  { code: "ez_curl_bar", name: "EZ Curl Bar", aliases: ["curl bar", "ez bar"], category: "free_weight" },
  { code: "weight_plates", name: "Weight Plates", aliases: ["plates", "bumper plates", "iron plates"], category: "free_weight" },
  { code: "dumbbells", name: "Dumbbells", aliases: ["dumbbell", "db"], category: "free_weight" },
  { code: "kettlebells", name: "Kettlebells", aliases: ["kettlebell", "kb"], category: "free_weight" },

  // ── BENCHES & RACKS ───────────────────────────────────
  { code: "squat_rack", name: "Squat Rack", aliases: ["half rack", "squat stand"], category: "machine" },
  { code: "power_rack", name: "Power Rack", aliases: ["full rack", "cage"], category: "machine" },
  { code: "flat_bench", name: "Flat Bench", aliases: ["flat bench press bench"], category: "accessory" },
  { code: "adjustable_bench", name: "Adjustable Bench", aliases: ["incline bench", "decline bench", "fid bench"], category: "accessory" },
  { code: "preacher_bench", name: "Preacher Bench", aliases: ["scott bench", "preacher curl bench"], category: "accessory" },
  { code: "back_extension_bench", name: "Back Extension Bench", aliases: ["roman chair", "hyperextension bench"], category: "accessory" },

  // ── BODYWEIGHT / ACCESSORIES ──────────────────────────
  { code: "pull_up_bar", name: "Pull-Up Bar", aliases: ["chin up bar", "pullup bar"], category: "bodyweight" },
  { code: "dip_station", name: "Dip Station", aliases: ["dip bars", "parallel bars"], category: "bodyweight" },
  { code: "mat", name: "Exercise Mat", aliases: ["yoga mat", "floor mat"], category: "accessory" },
  { code: "resistance_bands", name: "Resistance Bands", aliases: ["bands", "elastic bands", "loop bands"], category: "accessory" },

  // ── CARDIO ────────────────────────────────────────────
  { code: "treadmill", name: "Treadmill", aliases: ["running machine"], category: "cardio" },
  { code: "stationary_bike", name: "Stationary Bike", aliases: ["spin bike", "upright bike", "cycle"], category: "cardio" },
  { code: "recumbent_bike", name: "Recumbent Bike", aliases: ["reclined bike", "low bike"], category: "cardio" },
  { code: "elliptical", name: "Elliptical", aliases: ["cross trainer", "elliptical machine"], category: "cardio" },
  { code: "stair_climber", name: "Stair Climber", aliases: ["stepmill", "stairmaster", "step machine"], category: "cardio" },
  { code: "rowing_machine", name: "Rowing Machine", aliases: ["erg", "ergometer", "concept2", "rower"], category: "cardio" },
  { code: "battle_rope", name: "Battle Rope", aliases: ["battle ropes", "heavy rope"], category: "cardio" },
  { code: "sled", name: "Sled", aliases: ["prowler", "push sled", "drag sled"], category: "cardio" },
];

// Helper lookups
export const equipmentMap = new Map<string, EquipmentItem>(
  equipment.map((e) => [e.code, e])
);

export function getEquipmentByCode(code: string): EquipmentItem | undefined {
  return equipmentMap.get(code);
}

export function searchEquipment(query: string): EquipmentItem[] {
  const q = query.toLowerCase();
  return equipment.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.code.toLowerCase().includes(q) ||
      e.aliases.some((a) => a.toLowerCase().includes(q))
  );
}

export const ALL_EQUIPMENT_CODES = equipment.map((e) => e.code);

// FTL Full Gym preset equipment codes (broad commercial gym)
export const FTL_EQUIPMENT_CODES: string[] = [
  "lat_pulldown_machine",
  "cable_station",
  "functional_trainer",
  "cable_crossover",
  "seated_row_machine",
  "plate_loaded_row",
  "chest_press_machine",
  "incline_chest_press_machine",
  "shoulder_press_machine",
  "pec_deck",
  "assisted_pull_up_machine",
  "leg_press",
  "hack_squat",
  "pendulum_squat",
  "leg_extension",
  "seated_leg_curl",
  "lying_leg_curl",
  "standing_leg_curl",
  "hip_abductor",
  "hip_adductor",
  "calf_raise_machine",
  "smith_machine",
  "squat_rack",
  "power_rack",
  "barbell",
  "ez_curl_bar",
  "weight_plates",
  "dumbbells",
  "kettlebells",
  "flat_bench",
  "adjustable_bench",
  "preacher_bench",
  "back_extension_bench",
  "pull_up_bar",
  "dip_station",
  "mat",
  "resistance_bands",
  "treadmill",
  "stationary_bike",
  "recumbent_bike",
  "elliptical",
  "stair_climber",
  "rowing_machine",
  "battle_rope",
  "sled",
];
