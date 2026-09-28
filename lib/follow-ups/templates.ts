/** FollowBack's reason recipes, adapted for Mend's follow-up profile. */
export const FOLLOW_UP_REASONS = [
  "Customer requested callback", "Call disconnected", "Waiting for reboot/reset",
  "Make sure technician arrived", "Technician missed appointment window", "Technician go-back request",
  "Make sure service is stable", "Check appointment status", "Check escalation/update",
  "Verify issue resolution", "Continue troubleshooting", "Waiting for information", "Service restoration", "Other",
] as const;
export const TECHNICIAN_WINDOW_REASONS = ["Make sure technician arrived", "Technician missed appointment window", "Technician go-back request"] as const;
export const GO_BACK_ISSUES = ["Issue not resolved", "Technician forgot tools", "No arrival long after window", "Technician went to wrong address", "Technician claimed arrival but did not"] as const;
export const FOLLOW_UP_WINDOWS = [
  { value: "8-11", label: "8:00 AM – 11:00 AM", start: "08:00", end: "11:00" },
  { value: "9-12", label: "9:00 AM – 12:00 PM", start: "09:00", end: "12:00" },
  { value: "11-2", label: "11:00 AM – 2:00 PM", start: "11:00", end: "14:00" },
  { value: "2-5", label: "2:00 PM – 5:00 PM", start: "14:00", end: "17:00" },
  { value: "3-6", label: "3:00 PM – 6:00 PM", start: "15:00", end: "18:00" },
] as const;
export const needsTechnicianWindow = (reason: string) => TECHNICIAN_WINDOW_REASONS.some(value => value === reason);
export type FollowUpRecipe = { context: string; promise: string; completion: string; minutes: number; priority: "normal" | "urgent" };
export function followUpRecipe(reason: string, appointmentEnd = "the appointment window", goBackIssue = ""): FollowUpRecipe {
  const recipes: Record<string, Omit<FollowUpRecipe, "priority">> = {
    "Call disconnected": { context: "Reconnect with the customer and continue from the point where the call dropped.", promise: "Call back as soon as possible.", completion: "The customer is reached and the interrupted conversation is completed.", minutes: 1 },
    "Customer requested callback": { context: "Return to the customer at the time they requested.", promise: "Call at the customer’s requested time.", completion: "The customer is reached and the promised action is handled.", minutes: 30 },
    "Waiting for reboot/reset": { context: "Confirm the equipment completed its reboot and check whether service returned.", promise: "Call after the reboot has had enough time to complete.", completion: "Service status is confirmed and the next action is clear.", minutes: 15 },
    "Make sure technician arrived": { context: `Confirm technician arrival before ${appointmentEnd}.`, promise: "Follow up during the appointment window.", completion: "Arrival is confirmed or the missed-appointment action is determined.", minutes: 30 },
    "Technician missed appointment window": { context: `The ${appointmentEnd} appointment window passed without arrival. After the Tech ETA escalation is raised, confirm whether dispatch contacted the customer and provide the latest expectation if they did not.`, promise: "Check back after dispatch has had time to contact the customer.", completion: "Dispatch contact is confirmed or the customer receives a clear update and next action.", minutes: 30 },
    "Technician go-back request": { context: goBackIssue ? `Go-back request: ${goBackIssue}. Confirm the return action and the next technician expectation with the customer.` : "A technician go-back request is needed. Confirm why the return is required and update the customer on the next action.", promise: "Call back after the go-back request is raised.", completion: "The return request status and next expectation are confirmed with the customer.", minutes: 30 },
    "Make sure service is stable": { context: "Confirm that service remained stable and the original issue did not return.", promise: "Call after a monitoring period.", completion: "The customer confirms stable service or another action is identified.", minutes: 30 },
    "Check appointment status": { context: "Verify the latest appointment status and set the correct expectation.", promise: "Call when the appointment can be meaningfully checked.", completion: "Appointment status is confirmed with the customer.", minutes: 30 },
    "Check escalation/update": { context: "Check whether a new escalation update is available before contacting the customer.", promise: "Return with the latest available update.", completion: "The customer receives the update or a new check time is agreed.", minutes: 60 },
    "Verify issue resolution": { context: "Confirm the original issue is resolved from the customer’s perspective.", promise: "Call back to verify the service outcome.", completion: "Resolution is confirmed or the issue returns to the correct workflow.", minutes: 30 },
    "Service restoration": { context: "Confirm the original issue is resolved from the customer’s perspective.", promise: "Call back to verify the service outcome.", completion: "Resolution is confirmed or the issue returns to the correct workflow.", minutes: 30 },
    "Continue troubleshooting": { context: "Resume troubleshooting from the last completed step without repeating work.", promise: "Call back to continue troubleshooting.", completion: "Troubleshooting is completed or the next action is confirmed.", minutes: 15 },
    "Waiting for information": { context: "Return after the required information becomes available.", promise: "Call back with the requested information.", completion: "The information is shared and the customer knows what happens next.", minutes: 60 },
    "Other": { context: "Return to the customer with the promised follow-up.", promise: "Call back at the agreed time.", completion: "The reason for the follow-up is fully handled.", minutes: 30 },
  };
  const selected = recipes[reason] ?? recipes.Other;
  return { ...selected, priority: reason === "Call disconnected" || needsTechnicianWindow(reason) ? "urgent" : "normal" };
}
