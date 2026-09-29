import { z } from "zod";

export const aiContextSchema = z.object({
  area: z.enum(["today","follow-ups","rcc","cases","settings","schedule"]),
  route: z.string().max(160),
  entityId: z.string().uuid().optional(),
  workflow: z.enum(["expedite","technician-review","quick-follow-up"]).optional(),
  selectedText: z.string().max(4000).optional(),
  draftContext: z.object({ issueSummary: z.string().max(2000).optional(), reason: z.string().max(2000).optional(), status: z.string().max(100).optional() }).strict().optional(),
}).strict();
export type MendAIContext = z.infer<typeof aiContextSchema>;

export function operationalContext(context: MendAIContext) {
  return { area: context.area, route: context.route, entityId: context.entityId, workflow: context.workflow,
    // Selected text is user-provided. Do not add customer identifiers from the page.
    selectedText: context.selectedText, draftContext: context.draftContext };
}
