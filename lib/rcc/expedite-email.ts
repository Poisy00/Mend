import type { EmailDraft, ExpediteInput, RccPreferences, RouteDecision } from "./types";
import { appointmentWindow } from "./expedite-templates";

export const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const content = (value: string) => escapeHtml(value.trim() || "Not provided").replace(/\r?\n/g, "<br>");
function dateLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "Not provided";
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}

export function buildExpediteEmail(input: ExpediteInput, prefs: RccPreferences, route: RouteDecision): EmailDraft {
  const longIsland = route.id === "long-island";
  const accent = longIsland ? "#147457" : "#2368aa";
  const to = longIsland ? prefs.longIslandEmail : prefs.nassauEmail;
  const subject = `${longIsland ? "[LONG ISLAND RCC]" : "[NASSAU QUOTA]"} Appointment Expedite Request${input.account ? ` – ${input.account}` : ""}`;
  const window = appointmentWindow(input);
  const appointmentLabel = input.scheduled ? "CURRENT APPOINTMENT" : "REQUESTED APPOINTMENT";
  const plain = [
    "APPOINTMENT EXPEDITE REQUEST", route.name.toUpperCase(), "",
    `${input.scheduled ? "Current" : "Requested"} Appointment: ${dateLabel(input.date)} · ${window || "Not provided"} ET`,
    `Account Number: ${input.account || "Not provided"}`, `Phone Number: ${input.phone || "Not provided"}`,
    ...(input.customerName ? [`Customer Name: ${input.customerName}`] : []),
    `Reason for Expedite: ${input.reason || "Not provided"}`, "",
    "CASE SUMMARY", input.summary || "Not provided", "",
    "ACTION REQUESTED", input.action || "Not provided", "",
    prefs.signature || "Best regards,", prefs.name || "Agent",
  ].join("\n");
  const fragment = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="620" style="width:620px;max-width:100%;border-collapse:collapse;background:#ffffff;font-family:Arial,'Segoe UI',sans-serif;color:#1e2931"><tr><td style="padding:0 36px;border-top:3px solid ${accent}"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse">
  <tr><td style="padding:31px 0 27px"><div style="font-size:12px;line-height:18px;font-weight:700;letter-spacing:.5px;color:${accent}">${escapeHtml(route.name.toUpperCase())}</div><div style="padding-top:10px;font-size:26px;line-height:32px;font-weight:700;color:#1a2830">Appointment expedite request</div></td></tr>
  <tr><td style="border-top:1px solid #dce4e8;padding:24px 0 23px"><div style="font-size:12px;line-height:18px;font-weight:700;color:#536570">${appointmentLabel}</div><div style="padding-top:7px;font-size:21px;line-height:29px;font-weight:700;color:#1c2a32">${escapeHtml(dateLabel(input.date))}</div><div style="padding-top:2px;font-size:16px;line-height:24px;font-weight:700;color:${accent}">${escapeHtml(window || "Not provided")} ET</div></td></tr>
  <tr><td style="padding:0 0 20px"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background:#f3f7f8;border-left:3px solid ${accent}"><tr><td style="padding:17px 19px"><div style="font-size:12px;line-height:18px;font-weight:700;color:#536570">ACCOUNT NUMBER</div><div style="padding-top:3px;font-size:20px;line-height:27px;font-weight:700;color:#172832;word-break:break-word">${content(input.account)}</div></td></tr><tr><td style="padding:0 19px 16px"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;border-collapse:collapse"><tr><td valign="top" width="50%" style="width:50%;padding-right:12px"><div style="font-size:12px;line-height:18px;font-weight:700;color:#536570">CALLBACK NUMBER</div><div style="padding-top:3px;font-size:17px;line-height:24px;font-weight:700;color:#172832;word-break:break-word">${content(input.phone)}</div></td>${input.customerName ? `<td valign="top" width="50%" style="width:50%;padding-left:12px"><div style="font-size:12px;line-height:18px;font-weight:700;color:#536570">CUSTOMER NAME</div><div style="padding-top:3px;font-size:17px;line-height:24px;font-weight:700;color:#172832;word-break:break-word">${content(input.customerName)}</div></td>` : ""}</tr></table></td></tr></table></td></tr>
  <tr><td style="padding:0 0 16px"><div style="font-size:12px;line-height:18px;font-weight:700;color:#536570">REASON FOR EXPEDITE</div><div style="padding-top:4px;font-size:16px;line-height:23px;font-weight:700;color:#1e2931">${content(input.reason)}</div></td></tr>
  <tr><td style="border-top:1px solid #e5eaed;padding:23px 0 0"><div style="font-size:12px;line-height:18px;font-weight:700;color:#536570">CASE SUMMARY</div><div style="padding-top:7px;font-size:15px;line-height:24px;color:#2e3e47">${content(input.summary)}</div></td></tr>
  <tr><td style="padding:25px 0 0"><div style="font-size:12px;line-height:18px;font-weight:700;color:${accent}">ACTION REQUESTED</div><div style="padding-top:7px;font-size:15px;line-height:24px;color:#1e2931">${content(input.action)}</div></td></tr>
  <tr><td style="padding:30px 0 34px"><div style="font-size:14px;line-height:22px;color:#455660">${content(prefs.signature || "Best regards,")}<br><strong style="color:#1e2931">${content(prefs.name || "Agent")}</strong></div></td></tr>
  </table></td></tr></table>`;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>Appointment Expedite Request</title></head><body style="margin:0;padding:24px;background:#f3f5f7;font-family:Arial,'Segoe UI',sans-serif;color:#1e2931"><!--StartFragment--><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;border-collapse:collapse"><tr><td align="center">${fragment}</td></tr></table><!--EndFragment--></body></html>`;
  return { to, subject, plain, html };
}
