export type EnvProp = "floor" | "bench" | "incline_bench" | "pullup_bar" | "none";
export type EquipmentType = "barbell" | "dumbbell" | "kettlebell" | "cable" | "machine" | "none";

export interface JointCoords {
  h: [number, number]; // Head
  s: [number, number]; // Shoulder
  p: [number, number]; // Pelvis
  k: [number, number]; // Knee
  f: [number, number]; // Foot
  e: [number, number]; // Elbow
  w: [number, number]; // Wrist
}

export interface ArchetypeCoords {
  start: JointCoords;
  end: JointCoords;
  duration: number;
  prop: EnvProp;
  eq: EquipmentType;
}

export const ARCHETYPES: Record<string, ArchetypeCoords> = {
  pushup: {
    start: { h: [30,85], s: [50,85], p: [90,85], k: [110,85], f: [110,95], e: [50,105], w: [50,105] },
    end: { h: [30,105], s: [50,105], p: [90,95], k: [110,90], f: [110,95], e: [40,100], w: [50,105] },
    duration: 2,
    prop: "floor", eq: "none"
  },
  plank: {
    start: { h: [30,95], s: [50,95], p: [90,90], k: [110,90], f: [110,100], e: [50,105], w: [70,105] },
    end: { h: [30,96], s: [50,96], p: [90,91], k: [110,91], f: [110,100], e: [50,105], w: [70,105] },
    duration: 1.5,
    prop: "floor", eq: "none"
  },
  bench_press: {
    start: { h: [30,75], s: [50,75], p: [90,75], k: [110,95], f: [110,110], e: [50,50], w: [50,30] },
    end: { h: [30,75], s: [50,75], p: [90,75], k: [110,95], f: [110,110], e: [50,90], w: [50,70] },
    duration: 2.5,
    prop: "bench", eq: "barbell"
  },
  dumbbell_bench_press: {
    start: { h: [30,75], s: [50,75], p: [90,75], k: [110,95], f: [110,110], e: [50,50], w: [50,30] },
    end: { h: [30,75], s: [50,75], p: [90,75], k: [110,95], f: [110,110], e: [50,90], w: [50,70] },
    duration: 2.5,
    prop: "bench", eq: "dumbbell"
  },
  chest_fly: {
    start: { h: [30,75], s: [50,75], p: [90,75], k: [110,95], f: [110,110], e: [50,50], w: [50,30] },
    end: { h: [30,75], s: [50,75], p: [90,75], k: [110,95], f: [110,110], e: [50,90], w: [50,110] },
    duration: 2.5,
    prop: "bench", eq: "dumbbell"
  },
  incline_bench_press: {
    start: { h: [40,55], s: [55,65], p: [90,85], k: [110,95], f: [110,110], e: [55,40], w: [55,20] },
    end: { h: [40,55], s: [55,65], p: [90,85], k: [110,95], f: [110,110], e: [55,75], w: [55,60] },
    duration: 2.5,
    prop: "incline_bench", eq: "barbell"
  },
  incline_dumbbell_press: {
    start: { h: [40,55], s: [55,65], p: [90,85], k: [110,95], f: [110,110], e: [55,40], w: [55,20] },
    end: { h: [40,55], s: [55,65], p: [90,85], k: [110,95], f: [110,110], e: [55,75], w: [55,60] },
    duration: 2.5,
    prop: "incline_bench", eq: "dumbbell"
  },
  pullup: {
    start: { h: [60,40], s: [60,55], p: [60,95], k: [70,105], f: [60,110], e: [50,30], w: [60,20] },
    end: { h: [60,20], s: [60,35], p: [60,75], k: [70,85], f: [60,90], e: [45,55], w: [60,20] },
    duration: 2.5,
    prop: "pullup_bar", eq: "none"
  },
  dip: {
    start: { h: [60,20], s: [60,35], p: [60,65], k: [65,95], f: [60,110], e: [50,55], w: [60,70] },
    end: { h: [60,40], s: [60,55], p: [60,85], k: [65,115], f: [60,130], e: [30,45], w: [60,70] },
    duration: 2.5,
    prop: "none", eq: "machine"
  },
  lat_pulldown: {
    start: { h: [60,25], s: [60,40], p: [60,80], k: [80,80], f: [80,110], e: [45,20], w: [60,10] },
    end: { h: [60,25], s: [60,40], p: [60,80], k: [80,80], f: [80,110], e: [50,60], w: [60,40] },
    duration: 2.5,
    prop: "none", eq: "cable"
  },
  rowing: {
    start: { h: [90,45], s: [85,55], p: [40,65], k: [55,85], f: [65,110], e: [85,75], w: [85,95] },
    end: { h: [90,45], s: [85,55], p: [40,65], k: [55,85], f: [65,110], e: [70,50], w: [80,65] },
    duration: 2.5,
    prop: "floor", eq: "barbell"
  },
  dumbbell_row: {
    start: { h: [90,45], s: [85,55], p: [40,65], k: [55,85], f: [65,110], e: [85,75], w: [85,95] },
    end: { h: [90,45], s: [85,55], p: [40,65], k: [55,85], f: [65,110], e: [70,50], w: [80,65] },
    duration: 2.5,
    prop: "bench", eq: "dumbbell"
  },
  seated_row: {
    start: { h: [50,25], s: [50,40], p: [50,80], k: [80,80], f: [80,110], e: [70,50], w: [90,50] },
    end: { h: [45,25], s: [45,40], p: [50,80], k: [80,80], f: [80,110], e: [30,50], w: [50,55] },
    duration: 2,
    prop: "bench", eq: "cable"
  },
  face_pull: {
    start: { h: [50,25], s: [50,40], p: [50,80], k: [60,95], f: [60,110], e: [70,30], w: [90,25] },
    end: { h: [45,25], s: [45,40], p: [50,80], k: [60,95], f: [60,110], e: [30,40], w: [45,25] },
    duration: 2,
    prop: "floor", eq: "cable"
  },
  overhead_press: {
    start: { h: [60,25], s: [60,40], p: [60,80], k: [65,95], f: [60,110], e: [50,50], w: [60,40] },
    end: { h: [60,25], s: [60,40], p: [60,80], k: [65,95], f: [60,110], e: [50,20], w: [60,10] },
    duration: 2.5,
    prop: "floor", eq: "barbell"
  },
  overhead_press_seated: {
    start: { h: [60,25], s: [60,40], p: [60,80], k: [80,80], f: [80,110], e: [50,50], w: [60,40] },
    end: { h: [60,25], s: [60,40], p: [60,80], k: [80,80], f: [80,110], e: [50,20], w: [60,10] },
    duration: 2.5,
    prop: "bench", eq: "dumbbell"
  },
  shrug: {
    start: { h: [60,20], s: [60,40], p: [60,75], k: [65,90], f: [60,110], e: [60,60], w: [60,80] },
    end: { h: [60,25], s: [60,30], p: [60,75], k: [65,90], f: [60,110], e: [60,50], w: [60,70] },
    duration: 2,
    prop: "floor", eq: "barbell"
  },
  back_squat: {
    start: { h: [60,20], s: [60,35], p: [60,65], k: [65,85], f: [65,110], e: [70,45], w: [60,35] },
    end: { h: [50,50], s: [50,65], p: [40,90], k: [75,90], f: [65,110], e: [60,75], w: [50,65] },
    duration: 2.5,
    prop: "floor", eq: "barbell"
  },
  front_squat: {
    start: { h: [60,20], s: [60,35], p: [60,65], k: [65,85], f: [65,110], e: [65,30], w: [60,35] },
    end: { h: [60,50], s: [60,65], p: [50,90], k: [75,90], f: [65,110], e: [65,60], w: [60,65] },
    duration: 2.5,
    prop: "floor", eq: "barbell"
  },
  lunge: {
    start: { h: [60,20], s: [60,35], p: [60,65], k: [75,85], f: [75,110], e: [60,55], w: [60,75] },
    end: { h: [60,50], s: [60,65], p: [60,95], k: [90,95], f: [75,110], e: [60,85], w: [60,105] },
    duration: 2.5,
    prop: "floor", eq: "dumbbell"
  },
  deadlift: {
    start: { h: [60,20], s: [60,35], p: [60,65], k: [65,85], f: [65,110], e: [60,50], w: [60,65] },
    end: { h: [90,45], s: [85,55], p: [40,65], k: [55,85], f: [65,110], e: [85,75], w: [85,95] },
    duration: 2.5,
    prop: "floor", eq: "barbell"
  },
  rdl: {
    start: { h: [60,20], s: [60,35], p: [60,65], k: [65,85], f: [65,110], e: [60,50], w: [60,65] },
    end: { h: [95,50], s: [90,60], p: [45,65], k: [50,85], f: [65,110], e: [90,80], w: [90,100] },
    duration: 2.5,
    prop: "floor", eq: "barbell"
  },
  leg_press: {
    start: { h: [30,80], s: [45,75], p: [80,95], k: [60,60], f: [85,40], e: [60,80], w: [75,90] },
    end: { h: [30,80], s: [45,75], p: [80,95], k: [100,70], f: [115,50], e: [60,80], w: [75,90] },
    duration: 2.5,
    prop: "incline_bench", eq: "machine"
  },
  leg_extension: {
    start: { h: [50,45], s: [50,60], p: [50,85], k: [70,85], f: [70,110], e: [45,70], w: [50,85] },
    end: { h: [50,45], s: [50,60], p: [50,85], k: [70,85], f: [100,85], e: [45,70], w: [50,85] },
    duration: 2,
    prop: "bench", eq: "machine"
  },
  leg_curl: {
    start: { h: [110,95], s: [90,95], p: [50,95], k: [30,95], f: [10,95], e: [90,105], w: [110,105] },
    end: { h: [110,95], s: [90,95], p: [50,95], k: [30,95], f: [30,70], e: [90,105], w: [110,105] },
    duration: 2,
    prop: "floor", eq: "machine"
  },
  calf_raise: {
    start: { h: [60,20], s: [60,35], p: [60,65], k: [65,85], f: [65,110], e: [60,50], w: [60,65] },
    end: { h: [60,15], s: [60,30], p: [60,60], k: [65,80], f: [65,105], e: [60,45], w: [60,60] },
    duration: 1.5,
    prop: "none", eq: "machine"
  },
  hip_thrust: {
    start: { h: [30,75], s: [50,75], p: [70,105], k: [90,85], f: [90,110], e: [60,85], w: [70,100] },
    end: { h: [30,75], s: [50,75], p: [70,75], k: [90,85], f: [90,110], e: [60,75], w: [70,70] },
    duration: 2,
    prop: "bench", eq: "barbell"
  },
  bicep_curl: {
    start: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [60,55], w: [60,75] },
    end: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [55,55], w: [75,40] },
    duration: 2,
    prop: "none", eq: "dumbbell"
  },
  preacher_curl: {
    start: { h: [45,45], s: [45,60], p: [45,85], k: [65,85], f: [65,110], e: [65,65], w: [85,85] },
    end: { h: [45,45], s: [45,60], p: [45,85], k: [65,85], f: [65,110], e: [65,65], w: [70,45] },
    duration: 2.5,
    prop: "bench", eq: "barbell"
  },
  tricep_pushdown: {
    start: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [60,55], w: [80,55] },
    end: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [60,55], w: [65,75] },
    duration: 2,
    prop: "none", eq: "cable"
  },
  skullcrusher: {
    start: { h: [30,75], s: [50,75], p: [90,75], k: [110,95], f: [110,110], e: [50,50], w: [50,25] },
    end: { h: [30,75], s: [50,75], p: [90,75], k: [110,95], f: [110,110], e: [50,50], w: [30,45] },
    duration: 2,
    prop: "bench", eq: "barbell"
  },
  tricep_extension: {
    start: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [55,20], w: [40,30] },
    end: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [55,20], w: [55,5] },
    duration: 2,
    prop: "none", eq: "dumbbell"
  },
  lateral_raise: {
    start: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [60,55], w: [60,75] },
    end: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [40,45], w: [20,45] },
    duration: 2,
    prop: "none", eq: "dumbbell"
  },
  front_raise: {
    start: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [60,55], w: [60,75] },
    end: { h: [60,20], s: [60,35], p: [60,70], k: [65,90], f: [65,110], e: [70,45], w: [90,45] },
    duration: 2,
    prop: "none", eq: "dumbbell"
  },
  crunch: {
    start: { h: [20,100], s: [40,100], p: [70,100], k: [90,85], f: [110,105], e: [40,90], w: [20,90] },
    end: { h: [35,80], s: [45,90], p: [70,100], k: [90,85], f: [110,105], e: [50,90], w: [60,80] },
    duration: 1.5,
    prop: "floor", eq: "none"
  },
  russian_twist: {
    start: { h: [40,60], s: [50,75], p: [60,100], k: [80,85], f: [95,95], e: [45,85], w: [40,95] },
    end: { h: [40,60], s: [50,75], p: [60,100], k: [80,85], f: [95,95], e: [60,85], w: [70,95] },
    duration: 1.5,
    prop: "floor", eq: "none"
  },
  leg_raise: {
    start: { h: [20,100], s: [40,100], p: [60,100], k: [80,100], f: [100,100], e: [40,100], w: [60,100] },
    end: { h: [20,100], s: [40,100], p: [60,100], k: [60,75], f: [60,50], e: [40,100], w: [60,100] },
    duration: 2,
    prop: "floor", eq: "none"
  },
  running: {
    start: { h: [60,20], s: [60,35], p: [60,65], k: [80,75], f: [80,105], e: [40,45], w: [50,30] },
    end: { h: [60,22], s: [60,37], p: [60,67], k: [50,85], f: [40,95], e: [70,45], w: [60,60] },
    duration: 0.8,
    prop: "floor", eq: "none"
  },
  cycling: {
    start: { h: [50,30], s: [40,45], p: [75,70], k: [85,55], f: [65,85], e: [35,65], w: [20,70] },
    end: { h: [50,32], s: [40,47], p: [75,72], k: [65,90], f: [80,105], e: [35,67], w: [20,72] },
    duration: 1,
    prop: "bench", eq: "none"
  },
  rowing_machine: {
    start: { h: [60,50], s: [60,65], p: [70,95], k: [85,85], f: [100,95], e: [75,65], w: [90,65] },
    end: { h: [45,50], s: [45,65], p: [50,95], k: [80,90], f: [100,95], e: [30,65], w: [50,70] },
    duration: 2.5,
    prop: "floor", eq: "cable"
  }
};

export function getExerciseArchetype(id: string, family: string): ArchetypeCoords {
  const i = id.toLowerCase();
  
  if (i.includes("push_up") || i.includes("pushup")) return ARCHETYPES.pushup;
  if (i.includes("dip")) return ARCHETYPES.dip;
  if (i.includes("pull_up") || i.includes("chin_up")) return ARCHETYPES.pullup;
  
  if (i.includes("bench_press") || i.includes("chest_press") || i.includes("press_machine")) {
    if (i.includes("incline")) return i.includes("dumbbell") ? ARCHETYPES.incline_dumbbell_press : ARCHETYPES.incline_bench_press;
    return i.includes("dumbbell") ? ARCHETYPES.dumbbell_bench_press : ARCHETYPES.bench_press;
  }
  if (i.includes("fly") || i.includes("pec_deck")) return ARCHETYPES.chest_fly;

  if (i.includes("pulldown") || i.includes("pull_down")) return ARCHETYPES.lat_pulldown;
  if (i.includes("row")) {
    if (i.includes("dumbbell") || i.includes("one_arm")) return ARCHETYPES.dumbbell_row;
    if (i.includes("cable") || i.includes("machine") || i.includes("seated")) return ARCHETYPES.seated_row;
    if (i.includes("cardio") || i.includes("erg")) return ARCHETYPES.rowing_machine;
    return ARCHETYPES.rowing;
  }
  if (i.includes("face_pull")) return ARCHETYPES.face_pull;
  if (i.includes("shrug")) return ARCHETYPES.shrug;
  
  if (i.includes("deadlift") || i.includes("good_morning") || i.includes("extension")) {
    if (i.includes("romanian") || i.includes("stiff") || i.includes("rdl")) return ARCHETYPES.rdl;
    if (i.includes("tricep") || i.includes("leg")) {
      // pass to later handlers
    } else {
      return ARCHETYPES.deadlift;
    }
  }
  
  if (i.includes("squat")) {
    if (i.includes("front") || i.includes("goblet") || i.includes("zercher")) return ARCHETYPES.front_squat;
    if (i.includes("bulgarian") || i.includes("split") || i.includes("lunge")) return ARCHETYPES.lunge;
    return ARCHETYPES.back_squat;
  }
  if (i.includes("lunge")) return ARCHETYPES.lunge;
  if (i.includes("leg_press")) return ARCHETYPES.leg_press;
  if (i.includes("leg_extension")) return ARCHETYPES.leg_extension;
  if (i.includes("leg_curl")) return ARCHETYPES.leg_curl;
  if (i.includes("calf_raise")) return ARCHETYPES.calf_raise;
  if (i.includes("hip_thrust") || i.includes("glute_bridge")) return ARCHETYPES.hip_thrust;

  if (i.includes("shoulder_press") || i.includes("overhead_press") || i.includes("military_press")) {
    if (i.includes("dumbbell") || i.includes("seated")) return ARCHETYPES.overhead_press_seated;
    return ARCHETYPES.overhead_press;
  }
  if (i.includes("lateral_raise")) return ARCHETYPES.lateral_raise;
  if (i.includes("front_raise")) return ARCHETYPES.front_raise;
  if (i.includes("raise") && i.includes("rear")) return ARCHETYPES.lateral_raise; // close enough for rear delt

  if (i.includes("curl")) {
    if (i.includes("leg")) return ARCHETYPES.leg_curl;
    if (i.includes("preacher")) return ARCHETYPES.preacher_curl;
    return ARCHETYPES.bicep_curl;
  }
  
  if (i.includes("tricep") || i.includes("skullcrusher")) {
    if (i.includes("pushdown") || i.includes("pressdown")) return ARCHETYPES.tricep_pushdown;
    if (i.includes("skullcrusher") || i.includes("french")) return ARCHETYPES.skullcrusher;
    return ARCHETYPES.tricep_extension;
  }

  if (i.includes("crunch") || i.includes("sit_up") || i.includes("situp")) return ARCHETYPES.crunch;
  if (i.includes("plank")) return ARCHETYPES.plank;
  if (i.includes("russian_twist") || i.includes("twist")) return ARCHETYPES.russian_twist;
  if (i.includes("leg_raise")) return ARCHETYPES.leg_raise;
  if (i.includes("core")) return ARCHETYPES.plank;
  
  if (i.includes("run") || i.includes("treadmill") || i.includes("jog")) return ARCHETYPES.running;
  if (i.includes("cycle") || i.includes("bike")) return ARCHETYPES.cycling;
  if (i.includes("stair")) return ARCHETYPES.running;

  // Fallback to families if keyword not found
  switch (family) {
    case "vertical_pull": return ARCHETYPES.lat_pulldown;
    case "horizontal_pull": return ARCHETYPES.seated_row;
    case "horizontal_push": return ARCHETYPES.bench_press;
    case "vertical_push": return ARCHETYPES.overhead_press;
    case "squat": return ARCHETYPES.back_squat;
    case "leg_press": return ARCHETYPES.leg_press;
    case "hip_hinge": return ARCHETYPES.deadlift;
    case "curl": return ARCHETYPES.bicep_curl;
    case "tricep_extension": return ARCHETYPES.tricep_extension;
    case "lateral_raise": return ARCHETYPES.lateral_raise;
    case "rear_delt": return ARCHETYPES.face_pull;
    case "running": return ARCHETYPES.running;
    case "stair_climbing": return ARCHETYPES.running;
    case "cycling": return ARCHETYPES.cycling;
    case "rowing_cardio": return ARCHETYPES.rowing_machine;
    case "core_hold": return ARCHETYPES.plank;
    default: return ARCHETYPES.bench_press;
  }
}
