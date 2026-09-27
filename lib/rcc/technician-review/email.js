import {
  IMPACT_BY_ID,
  SITUATION_BY_ID,
} from './schema.js';
import { buildCanonicalIncident } from './incident.js';
import { analyzeIncidentContradictions } from './contradictions.js';
import { planReviewNarrative } from './narrative.js';

export const COMPOSER_VERSION = 3;
export const REVIEW_SCHEMA_VERSION = 2;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function humanList(items) {
  const values = [...new Set(items.filter(Boolean))];
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function finishSentence(value) {
  const text = String(value || '').trim().replace(/[.]+$/u, '');
  return text ? `${text}.` : '';
}

function stripCustomerAttribution(value) {
  return String(value || '').trim().replace(
    /^(?:according to the customer,?|the customer (?:reports|advises)(?: that)?|the customer also reports(?: that)?)\s*/iu,
    '',
  );
}

function contextParagraph(context, omitAppointmentTiming = false) {
  const sentences = [];
  const subject = context.customerName ? `The customer, ${context.customerName},` : 'The customer';
  if (!omitAppointmentTiming && context.appointmentDate && context.appointmentWindow) {
    sentences.push(`${subject} was scheduled for a technician appointment on ${context.appointmentDate} during the ${context.appointmentWindow} window.`);
  } else if (!omitAppointmentTiming && context.appointmentDate) {
    sentences.push(`${subject} was scheduled for a technician appointment on ${context.appointmentDate}.`);
  } else if (!omitAppointmentTiming && context.appointmentWindow) {
    const article = /^8/u.test(context.appointmentWindow) ? 'an' : 'a';
    sentences.push(`${subject} had ${article} ${context.appointmentWindow} technician appointment window.`);
  }
  if (context.account) sentences.push(`This review concerns account ${context.account}.`);
  if (context.originalIssue) sentences.push(`The original service issue is described as ${finishSentence(context.originalIssue)}`);
  return sentences.join(' ');
}

function customerParagraph(plan) {
  const incident = plan.mainIncident;
  const sentences = [];

  if (plan.sla?.expired) {
    const promised = plan.sla.duration
      ? `The promised ${plan.sla.duration} SLA has expired`
      : 'The promised SLA has expired';
    sentences.push(`${promised}, and no update or resolution has been provided.`);
    if (plan.sla.communicatedAt) sentences.push(`The SLA was communicated on ${finishSentence(plan.sla.communicatedAt)}`);
    if (plan.sla.dueAt) sentences.push(`The SLA due date was ${finishSentence(plan.sla.dueAt)}`);
    if (plan.sla.reference) sentences.push(`The related case or reference is ${finishSentence(plan.sla.reference)}`);
    if (plan.sla.lastStatus) sentences.push(`The last known status was ${finishSentence(plan.sla.lastStatus)}`);
  }

  if (incident.arrival === 'did-not-arrive' && incident.contact === 'not-received') {
    sentences.push('According to the customer, no technician arrived or made contact during the scheduled window.');
  } else if (incident.arrival === 'did-not-arrive') {
    sentences.push('According to the customer, no technician arrived at the location during the scheduled window.');
  } else if (incident.arrival === 'arrived' && incident.contact === 'not-received') {
    sentences.push('According to the customer, the technician arrived, but no call, voicemail, or message was received.');
  } else if (incident.contact === 'not-received') {
    sentences.push('According to the customer, no call, voicemail, or message was received during the scheduled window.');
  } else if (incident.arrival === 'arrived') {
    sentences.push('According to the customer, the technician attended the appointment.');
  }

  if (incident.workOutcome === 'no-work-attempted') {
    sentences.push('No work was performed.');
  } else if (incident.workOutcome === 'started-incomplete') {
    sentences.push('Work was started but not completed.');
  } else if (incident.workOutcome === 'reported-complete-unresolved') {
    sentences.push('The customer reports that work was completed, but the original service issue remains unresolved.');
  } else if (incident.workOutcome === 'completed') {
    sentences.push('The customer reports that the required work was completed.');
  }

  if (!['not-answered', 'unknown', 'no-instruction'].includes(incident.instruction.type)) {
    const detail = incident.instruction.detail.replace(/[.]+$/u, '');
    const instructionText = ({
      'contact-support': 'contact support',
      reschedule: 'contact support to arrange another appointment',
      'wait-follow-up': 'wait for follow-up',
      'other-department': 'contact another department',
      other: detail || 'follow additional instructions',
    }[incident.instruction.type]) || detail;
    if (instructionText) {
      sentences.push(`The customer advises that they were instructed to ${instructionText.replace(/^to\s+/iu, '')}.`);
    }
  }
  if (incident.reason) {
    sentences.push(`The reason reported was ${finishSentence(stripCustomerAttribution(incident.reason))}`);
  }
  if (incident.additional) {
    sentences.push(`The customer also reports that ${finishSentence(stripCustomerAttribution(incident.additional))}`);
  }
  return sentences.join(' ');
}

function internalParagraph(plan) {
  const records = plan.relevantRecords;
  const sentences = [];
  const incomplete = ['not-started', 'incomplete', 'not-completed'].includes(records.completion)
    || records.visitStatus === 'missed';
  const complete = records.completion === 'completed';
  const noArrival = records.arrival === 'no-arrival';
  const arrival = records.arrival === 'arrived';
  const noContact = records.contact === 'not-recorded';
  const contact = records.contact === 'recorded';

  if (incomplete) {
    const detail = noArrival && noContact
      ? 'no arrival or contact attempt recorded'
      : noArrival
        ? 'no arrival recorded'
        : noContact
          ? 'no contact attempt recorded'
          : '';
    sentences.push(`The available visit information reflects that the appointment was not completed${detail ? `, with ${detail}` : ''}.`);
  } else if (complete) {
    const details = [];
    if (arrival) details.push('an arrival');
    if (contact) details.push('contact activity');
    sentences.push(`The available visit information reflects completion${details.length ? `, with ${humanList(details)} recorded` : ''}.`);
  } else {
    const details = [];
    if (arrival) details.push('an arrival');
    if (noArrival) details.push('no arrival');
    if (contact) details.push('contact activity');
    if (noContact) details.push('no contact attempt');
    if (details.length) sentences.push(`The available visit information reflects ${humanList(details)} recorded.`);
  }
  if (records.arrivalTime) sentences.push(`The recorded arrival time is ${finishSentence(records.arrivalTime)}`);
  if (records.contactTime) sentences.push(`The recorded contact time is ${finishSentence(records.contactTime)}`);
  if (records.technicianNotes) sentences.push(`The technician notes state: ${finishSentence(records.technicianNotes)}`);
  if (records.dispatchNotes) sentences.push(`The dispatch notes state: ${finishSentence(records.dispatchNotes)}`);
  if (records.other) sentences.push(`Other available internal information states: ${finishSentence(records.other)}`);
  return sentences.join(' ');
}

const REQUEST_PHRASES = {
  'review-visit-handling': 'review the handling of this appointment',
  'verify-arrival': 'verify the recorded arrival activity',
  'verify-contact': 'verify the recorded contact activity',
  'review-instructions': 'review the instructions provided to the customer',
  'review-incomplete-work': 'review why the required work was not completed',
  'correct-status': 'correct the visit status where appropriate',
  'review-sla-status': 'review the expired SLA and current case status',
  'restore-appointment': 'assist with the appropriate next appointment action',
  'earliest-resolution': 'assist with the earliest appropriate resolution',
  'advise-next-action': 'advise on the correct next action',
  'provide-status-resolution': 'provide the current status and the appropriate resolution',
};

function requestParagraph(plan) {
  let primary = plan.requestedReview
    .map((id) => REQUEST_PHRASES[id])
    .filter(Boolean);
  if (
    plan.requestedReview.includes('review-visit-handling')
    && plan.requestedReview.includes('review-instructions')
  ) {
    primary = ['review the handling of this appointment and the instructions provided to the customer'];
  } else if (
    plan.requestedReview.includes('verify-arrival')
    && plan.requestedReview.includes('verify-contact')
  ) {
    primary = ['verify the recorded arrival and contact activity'];
  }
  const recovery = REQUEST_PHRASES[plan.requestedRecovery];
  if (!primary.length && !recovery) {
    return 'Could you please review the available visit information and advise on the appropriate resolution?';
  }
  if (!primary.length) return `Could you please ${recovery}?`;
  const reviewRequest = `Could you please ${humanList(primary)}?`;
  return recovery ? `${reviewRequest} Please also ${recovery}.` : reviewRequest;
}

function signatureBlock(settings) {
  return [
    settings.signature || 'Best regards,',
    settings.name || 'Agent',
    ...[settings.jobTitle, settings.department, settings.company].filter(Boolean),
  ].join('\n');
}

function appointmentDetails(context, omitAppointmentTiming = false) {
  return [
    context.account && `Account: ${context.account}`,
    !omitAppointmentTiming && context.appointmentDate && `Appointment date: ${context.appointmentDate}`,
    !omitAppointmentTiming && context.appointmentWindow && `Window: ${context.appointmentWindow}`,
    context.customerName && `Customer: ${context.customerName}`,
    context.phone && `Callback: ${context.phone}`,
  ].filter(Boolean);
}

function visitOutcome(plan) {
  const incident = plan.mainIncident;
  if (plan.sla?.expired) {
    return plan.sla.duration
      ? `The promised ${plan.sla.duration} SLA has expired with no update.`
      : 'The promised SLA has expired with no update.';
  }
  if (incident.arrival === 'did-not-arrive' && incident.contact === 'not-received') {
    return 'Customer reports no technician arrival or contact.';
  }
  if (incident.arrival === 'did-not-arrive') return 'Customer reports no technician arrival.';
  if (incident.workOutcome === 'no-work-attempted') return 'Customer reports no work was attempted.';
  if (incident.workOutcome === 'started-incomplete') return 'Customer reports work started but was not completed.';
  if (incident.workOutcome === 'reported-complete-unresolved') {
    return 'Work is reported complete, but the service issue remains unresolved.';
  }
  if (incident.workOutcome === 'completed') return 'Customer reports the required work was completed.';
  if (incident.arrival === 'arrived') return 'Customer reports the technician attended the appointment.';
  if (!['not-answered', 'unknown', 'no-instruction'].includes(incident.instruction.type)) {
    return 'Customer instructions or visit handling require review.';
  }
  return 'Technician visit handling requires review.';
}

function currentStatus(plan) {
  if (plan.sla?.expired) return 'No current update or resolution has been provided.';
  const impacts = new Set(plan.currentOutcome.impacts);
  if (impacts.has('service-unresolved') && impacts.has('new-appointment')) {
    return 'Service remains unresolved; another appointment may be required.';
  }
  if (impacts.has('service-unresolved')) return 'Service remains unresolved.';
  if (impacts.has('new-appointment')) return 'Another appointment may be required.';
  if (impacts.has('redirected-support')) return 'The customer was redirected to support.';
  if (impacts.has('cancellation-risk')) return 'Customer cancellation risk is recorded.';
  if (impacts.has('accessibility-safety')) return 'An accessibility or safety concern requires consideration.';
  if (impacts.has('dissatisfaction')) return 'The customer expressed dissatisfaction with the visit handling.';
  return 'Review requested based on the available visit information.';
}

function impactParagraph(plan) {
  const values = plan.currentOutcome.impacts
    .map((id) => IMPACT_BY_ID[id]?.label)
    .filter((label) => label && label !== 'Other impact');
  if (plan.currentOutcome.otherImpact) values.push(plan.currentOutcome.otherImpact);
  return [...new Set(values)].map(finishSentence).join(' ');
}

function conflictPairLines(plan) {
  const ids = new Set(plan.discrepancies.map(({ id }) => id));
  const customer = [];
  const records = [];

  if (ids.has('arrival-record-conflict')) {
    customer.push('No technician arrival was reported.');
    records.push('Arrival was recorded.');
  }
  if (ids.has('contact-record-conflict')) {
    customer.push('No call, voicemail, or message was reported received.');
    records.push('Contact activity was recorded.');
  }
  if (ids.has('completion-record-conflict')) {
    customer.push(plan.mainIncident.workOutcome === 'no-work-attempted'
      ? 'No work was reported performed.'
      : 'The work was reported incomplete.');
    records.push('Completion was recorded.');
  }
  if (ids.has('completion-impact-conflict')) {
    customer.push('The service issue remains unresolved.');
    records.push('Completion was recorded.');
  }

  const direct = plan.discrepancies
    .filter(({ kind }) => kind !== 'customer-record')
    .map(({ statement }) => statement);
  const lines = [];
  if (customer.length) lines.push(`Customer report: ${customer.join(' ')}`);
  if (records.length) lines.push(`Recorded status: ${records.join(' ')}`);
  if (customer.length || records.length) {
    lines.push('Review note: The recorded information differs from the customer’s account of the visit.');
  }
  if (direct.length) lines.push(`Review note: ${direct.join(' ')}`);
  return lines;
}

function section(title, lines) {
  const values = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
  return values.length ? `${title}\n${values.join('\n')}` : '';
}

function structuredBody(plan, settings) {
  const customer = customerParagraph(plan);
  const records = internalParagraph(plan);
  const impact = impactParagraph(plan);
  const conflicts = conflictPairLines(plan);
  const omitAppointmentTiming = Boolean(plan.sla?.expired && !plan.context.appointmentDate);
  const details = appointmentDetails(plan.context, omitAppointmentTiming);
  const context = contextParagraph(plan.context, omitAppointmentTiming);
  return [
    'Hello Team,',
    section('Appointment details', details.length ? details : context),
    section('Visit summary', [
      `Visit outcome: ${visitOutcome(plan)}`,
      `Current status: ${currentStatus(plan)}`,
    ]),
    section('Customer reports', customer),
    section('Records reflect', records),
    section('Information to reconcile', conflicts),
    section('Customer impact', impact),
    section('Action requested', requestParagraph(plan)),
    'Thank you.',
    signatureBlock(settings),
  ].filter(Boolean).join('\n\n');
}

export function composeReviewEmail(review, settings = {}) {
  const incident = buildCanonicalIncident(review);
  const conflicts = analyzeIncidentContradictions(incident, review);
  const plan = planReviewNarrative(
    incident,
    conflicts,
    review.requestedOutcomeOverrides || incident.requestedOutcomeOverrides,
  );
  const selectedLabels = (review.selectedSituations || []).map((id) => SITUATION_BY_ID[id]?.label).filter(Boolean);
  const body = structuredBody(plan, settings);
  const account = review.appointment?.account?.trim();
  const slaFollowUp = incident.sla?.expired;
  return {
    subject: `[LONG ISLAND RCC] ${slaFollowUp ? 'SLA Follow-up Review' : 'Technician Visit Review'}${account ? ` – ${account}` : ''}`,
    body,
    selectedLabels,
    plan,
    transparency: plan.transparency,
    composerVersion: COMPOSER_VERSION,
    schemaVersion: REVIEW_SCHEMA_VERSION,
  };
}

const STRUCTURED_HEADINGS = [
  'Appointment details',
  'Visit summary',
  'Customer reports',
  'Records reflect',
  'Information to reconcile',
  'Customer impact',
  'Action requested',
];

function parseStructuredBody(body) {
  const headings = new Set(STRUCTURED_HEADINGS);
  const parsed = {
    intro: [],
    sections: new Map(),
    closing: [],
  };
  let target = parsed.intro;
  let foundSection = false;

  for (const rawLine of String(body || '').replace(/\r/gu, '').split('\n')) {
    const line = rawLine.trim();
    if (headings.has(line)) {
      foundSection = true;
      target = [];
      parsed.sections.set(line, target);
      continue;
    }
    if (line === 'Thank you.') {
      target = parsed.closing;
    }
    if (!line) continue;
    target.push(line);
  }
  return foundSection ? parsed : null;
}

function emphasizeFacts(value) {
  let text = escapeHtml(value);
  const patterns = [
    /no technician arrival(?: or contact)?/giu,
    /no technician arrived(?: or made contact)?/giu,
    /service (?:issue )?remains unresolved/giu,
    /another appointment may be required/giu,
    /arrival (?:was|is) recorded/giu,
    /contact activity (?:was|is) recorded/giu,
    /completion (?:was|is) recorded/giu,
    /no work was (?:attempted|performed)/giu,
    /work (?:was )?started but (?:was )?not completed/giu,
  ];
  for (const pattern of patterns) {
    text = text.replace(pattern, '<strong style="font-weight:700;color:#202b33">$&</strong>');
  }
  return text;
}

function renderLegacyBody(body) {
  return String(body || '').split(/\n/u).map((line) => {
    if (!line) return '<div style="height:12px;line-height:12px">&nbsp;</div>';
    return `<div style="font-size:14px;line-height:22px;color:#30363b">${emphasizeFacts(line)}</div>`;
  }).join('');
}

function splitLabel(line) {
  const match = String(line || '').match(/^([^:]+):\s*(.*)$/u);
  return match ? { label: match[1].trim(), value: match[2].trim() } : null;
}

function renderSectionLabel(label, color = '#5f6b75') {
  return `<div style="font-size:10px;line-height:15px;letter-spacing:.75px;color:${color};font-weight:700;text-transform:uppercase">${escapeHtml(label).toUpperCase()}</div>`;
}

function renderAppointment(lines) {
  const fields = new Map(lines.map(splitLabel).filter(Boolean).map(({ label, value }) => [label, value]));
  const primary = [
    ['Account', fields.get('Account')],
    ['Appointment', fields.get('Appointment date')],
    ['Window', fields.get('Window')],
  ].filter(([, value]) => value);
  const secondary = [
    ['Customer', fields.get('Customer')],
    ['Callback', fields.get('Callback')],
  ].filter(([, value]) => value);
  if (!primary.length && !secondary.length) return '';

  const primaryCells = primary.map(([label, value], index) =>
    `<td valign="top" width="${Math.floor(100 / primary.length)}%" style="padding:13px 14px;${index < primary.length - 1 ? 'border-right:1px solid #dfe5e8;' : ''}">${renderSectionLabel(label)}<div style="padding-top:3px;font-size:14px;line-height:20px;font-weight:700;color:#202b33">${emphasizeFacts(value)}</div></td>`).join('');
  const secondaryCells = secondary.length
    ? `<tr>${secondary.map(([label, value], index) =>
      `<td colspan="${primary.length === 3 ? (index === 0 ? 2 : 1) : 1}" valign="top" style="padding:9px 14px;border-top:1px solid #dfe5e8;${index < secondary.length - 1 ? 'border-right:1px solid #dfe5e8;' : ''}">${renderSectionLabel(label)}<div style="padding-top:2px;font-size:13px;line-height:19px;color:#303b43">${emphasizeFacts(value)}</div></td>`).join('')}</tr>`
    : '';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f7f8;border:1px solid #dfe5e8;border-collapse:collapse"><tr>${primaryCells}</tr>${secondaryCells}</table>`;
}

function renderSummary(lines) {
  const values = lines.map(splitLabel).filter(Boolean);
  if (!values.length) return '';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse">${values.map(({ label, value }, index) =>
    `<tr><td valign="top" width="112" style="padding:${index ? '9px' : '15px'} 12px ${index === values.length - 1 ? '15px' : '9px'} 0;${index ? 'border-top:1px solid #dfe5e8;' : ''}">${renderSectionLabel(label)}</td><td valign="top" style="padding:${index ? '9px' : '15px'} 0 ${index === values.length - 1 ? '15px' : '9px'};font-size:15px;line-height:22px;font-weight:700;color:#202b33;${index ? 'border-top:1px solid #dfe5e8;' : ''}">${emphasizeFacts(value)}</td></tr>`).join('')}</table>`;
}

function renderSourceSection(label, lines) {
  if (!lines?.length) return '';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse"><tr><td width="4" bgcolor="#c7d2da" style="width:4px;background:#c7d2da">&nbsp;</td><td style="padding:11px 14px;background:#fafbfc">${renderSectionLabel(label)}${lines.map((line) => `<div style="padding-top:5px;font-size:14px;line-height:22px;color:#30363b">${emphasizeFacts(line)}</div>`).join('')}</td></tr></table>`;
}

function renderReconciliation(lines) {
  if (!lines?.length) return '';
  const content = lines.map((line) => {
    const pair = splitLabel(line);
    if (!pair) return `<div style="padding-top:7px;font-size:13px;line-height:20px;color:#31545a">${emphasizeFacts(line)}</div>`;
    const isNote = pair.label === 'Review note';
    return `<div style="padding-top:${isNote ? '9px' : '7px'};${isNote ? 'border-top:1px solid #b9dcde;margin-top:9px;' : ''}">${renderSectionLabel(pair.label, '#087f8c')}<div style="padding-top:2px;font-size:${isNote ? '13px' : '14px'};line-height:21px;color:${isNote ? '#31545a' : '#203a3e'};${isNote ? '' : 'font-weight:700;'}">${emphasizeFacts(pair.value)}</div></div>`;
  }).join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eaf5f5;border:1px solid #9fcfd1;border-collapse:collapse"><tr><td style="padding:14px 16px">${renderSectionLabel('Information to reconcile', '#087f8c')}${content}</td></tr></table>`;
}

function renderStructuredBody(parsed) {
  const section = (name) => parsed.sections.get(name) || [];
  const greeting = parsed.intro
    .map((line) => `<div style="font-size:14px;line-height:22px;color:#30363b">${emphasizeFacts(line)}</div>`)
    .join('');
  const customer = renderSourceSection('Customer reports', section('Customer reports'));
  const records = renderSourceSection('Records reflect', section('Records reflect'));
  const impact = section('Customer impact');
  const action = section('Action requested');
  const closing = parsed.closing
    .map((line, index) => `<div style="font-size:${index === 0 ? '14px' : '13px'};line-height:20px;color:${index === 0 ? '#30363b' : '#5f6b75'}">${emphasizeFacts(line)}</div>`)
    .join('');

  return [
    greeting && `<tr><td style="padding:0 30px 16px">${greeting}</td></tr>`,
    `<tr><td style="padding:0 30px 18px">${renderAppointment(section('Appointment details'))}</td></tr>`,
    `<tr><td style="padding:0 30px 18px">${renderSummary(section('Visit summary'))}</td></tr>`,
    customer && `<tr><td style="padding:0 30px 12px">${customer}</td></tr>`,
    records && `<tr><td style="padding:0 30px 18px">${records}</td></tr>`,
    section('Information to reconcile').length
      ? `<tr><td style="padding:0 30px 18px">${renderReconciliation(section('Information to reconcile'))}</td></tr>`
      : '',
    impact.length
      ? `<tr><td style="padding:0 30px 18px">${renderSectionLabel('Customer impact')}<div style="padding-top:5px;font-size:14px;line-height:22px;color:#30363b">${impact.map(emphasizeFacts).join(' ')}</div></td></tr>`
      : '',
    action.length
      ? `<tr><td style="padding:0 30px 20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f7f8;border-collapse:collapse"><tr><td width="4" bgcolor="#18324a" style="width:4px;background:#18324a">&nbsp;</td><td style="padding:13px 15px">${renderSectionLabel('Action requested', '#18324a')}<div style="padding-top:5px;font-size:14px;line-height:22px;color:#202b33;font-weight:700">${action.map(emphasizeFacts).join(' ')}</div></td></tr></table></td></tr>`
      : '',
    closing && `<tr><td style="padding:0 30px 26px">${closing}</td></tr>`,
  ].filter(Boolean).join('');
}

export function renderReviewEmailHtml(message) {
  const parsed = parseStructuredBody(message.body);
  const body = parsed
    ? renderStructuredBody(parsed)
    : `<tr><td style="padding:0 30px 28px">${renderLegacyBody(message.body)}</td></tr>`;
  const title = /SLA Follow-up Review/iu.test(message.subject || '')
    ? 'SLA Follow-up Review'
    : 'Technician Visit Review';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;padding:24px;background:#f3f5f7;font-family:Segoe UI,Arial,sans-serif;color:#242424"><!--StartFragment--><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:100%;background:#fff;border:1px solid #dfe5e8;border-collapse:separate"><tr><td height="5" bgcolor="#18324a" style="height:5px;background:#18324a">&nbsp;</td></tr><tr><td style="padding:23px 30px 17px"><div style="font-size:10px;line-height:15px;letter-spacing:.8px;color:#5f6b75;font-weight:700">INTERNAL REVIEW · RCC LONG ISLAND</div><div style="padding-top:4px;font-size:22px;line-height:29px;font-weight:700;color:#18324a">${title}</div></td></tr>${body}</table><div style="padding-top:10px;font-size:10px;line-height:15px;color:#818b94">Internal operational communication</div></td></tr></table><!--EndFragment--></body></html>`;
}

const ACCUSATORY_PATTERNS = [
  {
    pattern: /\b(lie|lied|lying|fake arrival|false technician claim)\b/iu,
    alternative: 'The customer reports that the visit did not occur as recorded, and the recorded information differs from the customer’s account.',
  },
  {
    pattern: /\b(abuse|abused|misconduct)\b/iu,
    alternative: 'The customer reports a professional-handling concern and is requesting a review of the visit.',
  },
  {
    pattern: /\b(fraud|fraudulent completion)\b/iu,
    alternative: 'The recorded completion status differs from the customer’s account of the work performed.',
  },
  {
    pattern: /\b(refused service|refused to help)\b/iu,
    alternative: 'The customer reports that the requested work was not completed and asks that the visit handling be reviewed.',
  },
];

export function findNeutralLanguageSuggestions(body = '') {
  return ACCUSATORY_PATTERNS.flatMap(({ pattern, alternative }) => pattern.test(body)
    ? [{
        blocking: false,
        message: 'Consider neutral, source-attributed wording.',
        alternative,
      }]
    : []);
}

export { escapeHtml };
