import type { EmailDraft, ExpediteInput, RccPreferences, RouteDecision } from "./types";

export const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

function content(value: string) {
  return escapeHtml(value.trim() || "Not provided").replaceAll("\n", "<br>");
}

function cell(label: string, value: string, border = "") {
  return `<td width="50%" valign="top" style="width:50%;padding:14px 16px;${border}"><div style="font-size:10px;line-height:15px;letter-spacing:.5px;color:#66717c;font-weight:700">${escapeHtml(label.toUpperCase())}</div><div style="padding-top:3px;font-size:14px;line-height:21px;color:#202020;font-weight:700">${content(value)}</div></td>`;
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
  const accent = longIsland ? "#087f8c" : "#5b456f";
  const tint = longIsland ? "#e8f5f6" : "#f0eaf5";
  const badge = longIsland ? "SAME DAY" : "NEXT AVAILABLE";
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>Appointment Expedite Request</title></head><body style="margin:0;padding:24px;background:#f3f5f7;font-family:Segoe UI,Arial,sans-serif;color:#242424"><!--StartFragment--><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:100%;background:#fff;border:1px solid #dfe4e8;border-collapse:separate"><tr><td height="5" bgcolor="${accent}" style="height:5px;font-size:0">&nbsp;</td></tr><tr><td style="padding:25px 30px 20px"><table role="presentation" width="100%"><tr><td valign="top"><div style="font-size:11px;letter-spacing:.85px;color:${accent};font-weight:700">INTERNAL ESCALATION · ${escapeHtml(route.name.toUpperCase())}</div><div style="padding-top:6px;font-size:23px;line-height:30px;font-weight:700">Appointment Expedite Request</div></td><td align="right" valign="top"><span style="display:inline-block;padding:6px 10px;background:${tint};border:1px solid ${accent};border-radius:20px;font-size:10px;color:${accent};font-weight:700">${badge}</span></td></tr></table></td></tr><tr><td style="padding:0 30px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f9fb;border:1px solid #e1e6ea;border-collapse:collapse"><tr>${cell("Account Number",input.account,"border-right:1px solid #e1e6ea;border-bottom:1px solid #e1e6ea")}${cell("Phone Number",input.phone,"border-bottom:1px solid #e1e6ea")}</tr><tr>${cell(appointmentLabel,appointment,"border-right:1px solid #e1e6ea")}${cell("Reason for Expedite",input.reason)}</tr></table></td></tr>${input.customerName ? `<tr><td style="padding:17px 30px 0;font-size:14px">Customer: <strong>${escapeHtml(input.customerName)}</strong></td></tr>` : ""}<tr><td style="padding:22px 30px 0"><div style="padding-bottom:8px;font-size:11px;letter-spacing:.65px;color:#56616b;font-weight:700">CASE SUMMARY</div><div style="font-size:14px;line-height:22px;color:#30363b">${content(input.summary)}</div></td></tr><tr><td style="padding:17px 30px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="3" bgcolor="${accent}" style="font-size:0">&nbsp;</td><td bgcolor="${tint}" style="padding:14px 16px"><div style="font-size:10px;letter-spacing:.6px;color:${accent};font-weight:700">ACTION REQUESTED</div><div style="padding-top:5px;font-size:14px;line-height:22px;color:#2b3137">${content(input.action)}</div></td></tr></table></td></tr><tr><td style="padding:24px 30px 29px;font-size:14px;line-height:21px">${content(prefs.signature || "Best regards,")}<br><strong>${content(prefs.name || "Agent")}</strong></td></tr></table><div style="padding-top:10px;font-size:10px;color:#818b94">Internal operational communication</div></td></tr></table><!--EndFragment--></body></html>`;
  return { to, subject, plain, html };
}
