// Yono Workout — AI Response Schemas (Zod)
// Every AI response is validated through these schemas.
// The AI cannot return anything that isn't validated here.

import { z } from "zod";

// ─────────────────────────────────────────────────────────
// WORKOUT SUGGESTION
// ─────────────────────────────────────────────────────────

export const WorkoutSuggestionSchema = z.object({
  sessionName: z.string().min(1).max(80),
  reason: z.string().min(1).max(300),
  estimatedMinutes: z.number().int().min(10).max(180),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        order: z.number().int().positive(),
        targetSets: z.number().int().min(1).max(8),
        targetRepMin: z.number().int().min(1).max(100).optional(),
        targetRepMax: z.number().int().min(1).max(100).optional(),
        suggestedWeightKg: z.number().nonnegative().optional(),
        restSeconds: z.number().int().min(15).max(600),
        notes: z.string().max(200).optional(),
      })
    )
    .min(1)
    .max(10),
});

export type WorkoutSuggestion = z.infer<typeof WorkoutSuggestionSchema>;

// ─────────────────────────────────────────────────────────
// WORKOUT MODIFICATION
// ─────────────────────────────────────────────────────────

export const WorkoutModificationSchema = z.object({
  action: z.literal("modify_workout"),
  summary: z.string().min(1).max(300),
  changes: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("add_exercise"),
        exerciseId: z.string(),
        position: z.number().int().positive(),
        targetSets: z.number().int().min(1).max(8),
        targetRepMin: z.number().int().positive().optional(),
        targetRepMax: z.number().int().positive().optional(),
        restSeconds: z.number().int().min(15).max(600).optional(),
      }),
      z.object({
        type: z.literal("remove_exercise"),
        exerciseId: z.string(),
      }),
      z.object({
        type: z.literal("replace_exercise"),
        fromExerciseId: z.string(),
        toExerciseId: z.string(),
      }),
      z.object({
        type: z.literal("update_target_sets"),
        exerciseId: z.string(),
        targetSets: z.number().int().min(1).max(8),
      }),
      z.object({
        type: z.literal("update_rep_range"),
        exerciseId: z.string(),
        targetRepMin: z.number().int().positive(),
        targetRepMax: z.number().int().positive(),
      }),
      z.object({
        type: z.literal("update_rest"),
        exerciseId: z.string(),
        restSeconds: z.number().int().min(15).max(600),
      }),
      z.object({
        type: z.literal("update_weight"),
        exerciseId: z.string(),
        suggestedWeightKg: z.number().nonnegative(),
      }),
    ])
  ),
  requiresConfirmation: z.literal(true),
});

export type WorkoutModification = z.infer<typeof WorkoutModificationSchema>;

// ─────────────────────────────────────────────────────────
// WORKOUT LOGGING (natural language parsing)
// ─────────────────────────────────────────────────────────

export const WorkoutLoggingSchema = z.object({
  action: z.literal("log_sets"),
  exerciseId: z.string(),
  sets: z.array(
    z.object({
      setNumber: z.number().int().positive(),
      weightKg: z.number().nonnegative().optional(),
      reps: z.number().int().nonnegative().optional(),
      durationSeconds: z.number().int().nonnegative().optional(),
      distanceMeters: z.number().nonnegative().optional(),
      assistanceWeightKg: z.number().nonnegative().optional(),
      rpe: z.number().min(1).max(10).optional(),
    })
  ),
  confidence: z.number().min(0).max(1),
  requiresConfirmation: z.boolean(),
});

export type WorkoutLogging = z.infer<typeof WorkoutLoggingSchema>;

// ─────────────────────────────────────────────────────────
// COACH RESPONSE
// ─────────────────────────────────────────────────────────

export const CoachResponseSchema = z.object({
  message: z.string().min(1).max(2000),
  relatedExerciseIds: z.array(z.string()).optional(),
  suggestedAction: z
    .object({
      type: z.enum(["view_history", "start_workout", "view_exercise", "none"]),
      payload: z.unknown().optional(),
    })
    .optional(),
});

export type CoachResponse = z.infer<typeof CoachResponseSchema>;

// ─────────────────────────────────────────────────────────
// MEMORY PROPOSAL
// ─────────────────────────────────────────────────────────

export const MemoryProposalSchema = z.object({
  proposals: z.array(
    z.object({
      category: z.enum([
        "goal",
        "gym_preference",
        "equipment_preference",
        "exercise_preference",
        "exercise_note",
        "schedule_preference",
        "communication_preference",
        "general",
      ]),
      content: z.string().min(1).max(300),
      confidence: z.number().min(0).max(1),
    })
  ),
});

export type MemoryProposal = z.infer<typeof MemoryProposalSchema>;

// ─────────────────────────────────────────────────────────
// CHAT SUMMARY
// ─────────────────────────────────────────────────────────

export const ChatSummarySchema = z.object({
  summary: z.string().min(1).max(1000),
});

export type ChatSummaryResponse = z.infer<typeof ChatSummarySchema>;

// ─────────────────────────────────────────────────────────
// API REQUEST SCHEMAS (server-side input validation)
// ─────────────────────────────────────────────────────────

export const SuggestWorkoutRequestSchema = z.object({
  profile: z.object({
    goal: z.string().optional(),
    experienceLevel: z.string().optional(),
  }),
  request: z.object({
    focus: z.array(z.string()),
    availableMinutes: z.number().int().min(1).max(300).optional(),
    energy: z.enum(["low", "okay", "strong"]).optional(),
    equipmentMode: z.string().optional(),
    discomfortAreas: z.array(z.string()).optional(),
  }),
  gym: z.object({
    id: z.string(),
    name: z.string(),
    availableEquipmentCodes: z.array(z.string()),
  }),
  recentSessions: z.array(
    z.object({
      name: z.string(),
      focus: z.array(z.string()),
      completedAt: z.number(),
      exercises: z.array(
        z.object({
          exerciseId: z.string(),
          sets: z.array(
            z.object({
              weightKg: z.number().optional(),
              reps: z.number().optional(),
              rpe: z.number().optional(),
            })
          ),
        })
      ),
    })
  ),
  relevantExerciseHistory: z.array(
    z.object({
      exerciseId: z.string(),
      recentPerformances: z.array(
        z.object({
          completedAt: z.number(),
          sets: z.array(
            z.object({
              weightKg: z.number().optional(),
              reps: z.number().optional(),
            })
          ),
        })
      ),
    })
  ),
  preferences: z.array(z.unknown()),
  notes: z.array(z.unknown()),
  memories: z.array(z.unknown()),
});

export const ModifyWorkoutRequestSchema = z.object({
  instruction: z.string().min(1).max(500),
  currentWorkout: z.object({
    sessionName: z.string(),
    exercises: z.array(
      z.object({
        exerciseId: z.string(),
        order: z.number(),
        targetSets: z.number(),
        targetRepMin: z.number().optional(),
        targetRepMax: z.number().optional(),
        suggestedWeightKg: z.number().optional(),
        restSeconds: z.number(),
      })
    ),
  }),
  availableEquipmentCodes: z.array(z.string()),
  memories: z.array(z.unknown()),
});

export const ParseWorkoutLogRequestSchema = z.object({
  text: z.string().min(1).max(500),
  activeSession: z.object({
    exercises: z.array(
      z.object({
        exerciseId: z.string(),
        order: z.number(),
        completedSets: z.number(),
      })
    ),
  }),
});

export const CoachRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  chatHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  chatSummary: z.string().optional(),
  activeSession: z
    .object({
      name: z.string(),
      exercises: z.array(z.unknown()),
      completedSets: z.array(z.unknown()),
    })
    .optional(),
  memories: z.array(z.unknown()),
  exerciseContext: z.array(z.unknown()).optional(),
});

export const SummarizeChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

export const ProposeMemoryRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  existingMemories: z.array(z.unknown()),
});
