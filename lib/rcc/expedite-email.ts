import type { EmailDraft, ExpediteInput, RccPreferences, RouteDecision } from "./types";

export const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const content = (value: string) => escapeHtml(value.trim() || "Not provided").replaceAll("\n", "<br>");

function detail(label: string, value: string) {
  return `<tr><td valign="top" style="padding:0 12px 11px 0;width:155px;font-size:13px;line-height:20px;color:#746f6b">${escapeHtml(label)}</td><td valign="top" style="padding:0 0 11px;font-size:14px;line-height:21px;color:#282525;word-break:break-word">${content(value)}</td></tr>`;
}

export function buildExpediteEmail(input: ExpediteInput, prefs: RccPreferences, route: RouteDecision): EmailDraft {
  const longIsland = route.id === "long-island";
  const to = longIsland ? prefs.longIslandEmail : prefs.nassauEmail;
  const subject = `${longIsland ? "[LONG ISLAND RCC]" : "[NASSAU QUOTA]"} Appointment Expedite Request${input.account ? ` – ${input.account}` : ""}`;
  const appointment = `${input.date || "Not provided"} · ${input.window || "Not provided"}`;
  const appointmentLabel = input.scheduled ? "Current Appointment" : "Requested Appointment";
  const plain = [
    "APPOINTMENT EXPEDITE REQUEST", route.name.toUpperCase(), "",
    `Account Number: ${input.account || "Not provided"}`,
    `Phone Number: ${input.phone || "Not provided"}`,
    ...(input.customerName ? [`Customer Name: ${input.customerName}`] : []),
    `${appointmentLabel}: ${appointment}`,
    `Reason for Expedite: ${input.reason || "Not provided"}`, "",
    "CASE SUMMARY", input.summary || "Not provided", "",
    "ACTION REQUESTED", input.action || "Not provided", "",
    prefs.signature || "Best regards,", prefs.name || "Agent",
  ].join("\n");
  const accent = longIsland ? "#176c72" : "#5b456f";
  const badge = longIsland ? "SAME DAY" : "NEXT AVAILABLE";
  const fragment = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;color:#282525">
    <tr><td style="padding:0 0 23px">
      <div style="font-size:11px;line-height:16px;letter-spacing:1.1px;font-weight:700;color:${accent}">APPOINTMENT EXPEDITE REQUEST</div>
      <div style="padding-top:6px;font-size:13px;line-height:20px;color:#746f6b">${escapeHtml(route.name)} · ${badge}</div>
    </td></tr>
    <tr><td style="padding:23px 0 11px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed">
      ${detail("Account",input.account)}
      ${detail("Phone",input.phone)}
      ${input.customerName ? detail("Customer",input.customerName) : ""}
      ${detail(appointmentLabel,appointment)}
      ${detail("Reason for expedite",input.reason)}
    </table></td></tr>
    <tr><td style="padding:18px 0 0;border-top:1px solid #e7e3e0"><div style="font-size:12px;line-height:18px;color:#746f6b">CASE SUMMARY</div><div style="padding-top:5px;font-size:14px;line-height:23px;color:#282525">${content(input.summary)}</div></td></tr>
    <tr><td style="padding:19px 0 0"><div style="font-size:12px;line-height:18px;color:#746f6b">ACTION REQUESTED</div><div style="padding-top:5px;font-size:14px;line-height:23px;color:#282525">${content(input.action)}</div></td></tr>
    <tr><td style="padding:24px 0 0;font-size:14px;line-height:22px;color:#282525">${content(prefs.signature || "Best regards,")}<br><strong>${content(prefs.name || "Agent")}</strong></td></tr>
  </table>`;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>Appointment Expedite Request</title></head><body style="margin:0;padding:24px;background:#fff;font-family:Segoe UI,Arial,sans-serif;color:#282525"><!--StartFragment-->${fragment}<!--EndFragment--></body></html>`;
  return { to, subject, plain, html };
}
