// Yono Workout — Workout Templates
// Templates store a copy of session exercises in localStorage.
// This is intentionally NOT in IndexedDB — templates are portable presets.

export interface TemplateExercise {
  exerciseId: string;
  order: number;
  targetSets?: number;
  repMin?: number;
  repMax?: number;
  suggestedWeightKg?: number;
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  focus?: string[];
  exercises: TemplateExercise[];
  createdAt: number;
  updatedAt: number;
}

const TEMPLATES_KEY = "yono_workout_templates";

export function getTemplates(): WorkoutTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as WorkoutTemplate[];
  } catch {
    return [];
  }
}

export function saveTemplate(template: WorkoutTemplate): WorkoutTemplate[] {
  const templates = getTemplates();
  const existing = templates.findIndex((t) => t.id === template.id);
  if (existing >= 0) {
    templates[existing] = template;
  } else {
    templates.unshift(template);
  }
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return templates;
}

export function deleteTemplate(id: string): WorkoutTemplate[] {
  const templates = getTemplates().filter((t) => t.id !== id);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return templates;
}

export function createTemplateFromSession(
  name: string,
  focus: string[] | undefined,
  exercises: TemplateExercise[]
): WorkoutTemplate {
  const now = Date.now();
  const id = crypto.randomUUID();
  return {
    id,
    name,
    focus,
    exercises,
    createdAt: now,
    updatedAt: now,
  };
}
