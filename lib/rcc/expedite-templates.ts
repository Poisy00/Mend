import type { ExpediteInput, RccPreferences } from "./types";

export const DEFAULT_EXPEDITE_ACTION = "Kindly review this account for the earliest available technician appointment or any available opportunity to expedite the scheduled visit.";

export const EXPEDITE_TEMPLATES = [
  { id: "no-internet", label: "No Internet", reason: "No Working Service", summary: "The customer is currently without internet service. Standard troubleshooting has been completed, but service remains unavailable." },
  { id: "outage", label: "Area Outage", reason: "Area Outage Resolved", summary: "The area outage has been resolved; however, the customer remains without service." },
  { id: "repeat", label: "Repeat Trouble Call", reason: "Repeat Repair", summary: "The customer has contacted us multiple times regarding the same service issue. Previous troubleshooting and repair efforts have not provided a lasting resolution." },
  { id: "damage", label: "Property Damage", reason: "Property Damage Reported", summary: "The customer reported that the technician’s vehicle caused damage to the property during the previous visit. The original service issue remains unresolved." },
  { id: "cancel", label: "Cancellation Risk", reason: "Customer at Risk of Cancellation", summary: "The customer has expressed an intent to cancel service due to the ongoing issue and appointment availability. An earlier visit may help retain the account." },
  { id: "business", label: "Business Customer", reason: "Business Impact", summary: "The service interruption is affecting the customer’s business operations. The customer is requesting the earliest possible technician visit to restore service." },
  { id: "missed", label: "Missed Appointment", reason: "Missed Appointment", summary: "The customer’s previous appointment was missed, and the service issue remains unresolved. The customer is available for the earliest replacement appointment." },
  { id: "degradation", label: "Service Degradation", reason: "Service Degradation", summary: "The customer is experiencing severe service degradation that continues after troubleshooting and is materially affecting normal service use." },
] as const;

export const EXPEDITE_REASONS = [
  "Extended Service Interruption", "Customer at Risk of Cancellation", "Business Impact", "Property Damage Reported", "Repeat Repair", "Missed Appointment", "No Working Service", "Multiple Service Failures", "Area Outage Resolved", "Service Degradation", "Other",
];

export const DEFAULT_RCC_PREFERENCES: RccPreferences = {
  longIslandEmail: "longislandrcc@optimum.com",
  nassauEmail: "NQUOTA@optimum.com",
  signature: "Best regards,",
  name: "Agent",
};

export function applyExpediteTemplate(form: ExpediteInput, templateId: string): ExpediteInput {
  const template = EXPEDITE_TEMPLATES.find(item => item.id === templateId);
  return template ? { ...form, reason: template.reason, summary: template.summary, action: form.action || DEFAULT_EXPEDITE_ACTION } : form;
}
