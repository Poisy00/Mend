import type { ExpediteInput, RccPreferences } from "./types";
import type { QuickFollowUpInput } from "./quick-follow-up";

export type SavedDraft<T> = { payload: T; revision: number } | null;

export type RccInitialState = {
  preferences: RccPreferences;
  expedite: SavedDraft<ExpediteInput>;
  technicianReview: SavedDraft<{ review: unknown; draft?: unknown }>;
  quickFollowUp: SavedDraft<{ input: QuickFollowUpInput; draft?: unknown }>;
};
