import {
  REQUESTED_OUTCOME_BY_ID,
} from './schema.js';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function suggestedPrimary(incident, conflicts) {
  const suggestions = [];
  const situations = new Set(incident.activeSituationIds);
  const conflictIds = new Set(conflicts.map(({ id }) => id));
  const hasArrivalConcern = situations.has('did-not-arrive')
    || situations.has('arrival-disputed')
    || conflictIds.has('arrival-record-conflict')
    || conflictIds.has('arrival-selection-conflict');
  const hasInstructionConcern = situations.has('told-contact-support')
    || situations.has('incorrect-guidance');
  const hasWorkConcern = situations.has('no-work-attempted')
    || situations.has('work-not-completed')
    || situations.has('left-before-resolution');
  const hasSlaConcern = situations.has('sla-expired');

  if (hasSlaConcern) {
    suggestions.push('review-sla-status');
  } else if (hasArrivalConcern && hasInstructionConcern) {
    suggestions.push('review-visit-handling', 'review-instructions');
  } else {
    if (hasArrivalConcern) suggestions.push('verify-arrival');
    if (
      incident.customer.contact === 'not-received'
      || conflictIds.has('contact-record-conflict')
    ) suggestions.push('verify-contact');
    if (hasInstructionConcern) suggestions.push('review-instructions');
    if (hasWorkConcern) suggestions.push('review-incomplete-work');
  }
  if (!suggestions.length) suggestions.push('review-visit-handling');
  return unique(suggestions).slice(0, 2);
}

function suggestedRecovery(incident) {
  if (incident.sla?.expired) return 'provide-status-resolution';
  if (incident.impacts.includes('new-appointment')) return 'restore-appointment';
  if (incident.impacts.includes('service-unresolved')) return 'earliest-resolution';
  return 'advise-next-action';
}

function normalizedRequestedOutcomes(incident, conflicts, overrides = {}) {
  const primaryOverride = Array.isArray(overrides?.primary)
    ? unique(overrides.primary).filter((id) => REQUESTED_OUTCOME_BY_ID[id]?.kind === 'primary').slice(0, 2)
    : [];
  const recoveryOverride = REQUESTED_OUTCOME_BY_ID[overrides?.recovery]?.kind === 'recovery'
    ? overrides.recovery
    : '';
  return {
    primary: primaryOverride.length ? primaryOverride : suggestedPrimary(incident, conflicts),
    recovery: recoveryOverride || suggestedRecovery(incident),
  };
}

function transparency(incident, conflicts, outcomes) {
  const included = [];
  const omitted = [];
  if (incident.context.appointmentDate || incident.context.appointmentWindow) included.push('Appointment timing');
  if (incident.customer.arrival !== 'not-answered') included.push('Customer arrival account');
  if (incident.customer.contact !== 'not-answered') included.push('Customer contact account');
  if (!['not-answered', 'unknown'].includes(incident.customer.workOutcome)) included.push('Work outcome');
  if (!['not-answered', 'unknown', 'no-instruction'].includes(incident.customer.instruction.type)) included.push('Reported instruction');
  if (incident.impacts.includes('service-unresolved')) included.push('Unresolved service impact');
  if (incident.customer.available !== 'not-answered') omitted.push('Customer availability retained as supporting detail');
  if (incident.impacts.includes('waited-window')) omitted.push('Waited-window impact compressed into the incident context');
  if (
    incident.impacts.includes('dissatisfaction')
    && !incident.impacts.some((id) => ['escalation-requested', 'cancellation-risk', 'repeated-failed-visits', 'accessibility-safety'].includes(id))
  ) omitted.push('Generic dissatisfaction omitted as repetitive');
  return {
    included,
    omitted,
    discrepancies: conflicts.map(({ statement }) => statement),
    suggestedOutcomes: [
      ...outcomes.primary,
      outcomes.recovery,
    ].map((id) => REQUESTED_OUTCOME_BY_ID[id]?.label).filter(Boolean),
    missingRecommended: [...incident.missingRecommended],
  };
}

export function planReviewNarrative(incident, conflicts = [], overrides = {}) {
  const outcomes = normalizedRequestedOutcomes(incident, conflicts, overrides);
  return {
    shape: conflicts.length ? 'disputed' : 'simple',
    context: incident.context,
    mainIncident: {
      arrival: incident.customer.arrival,
      contact: incident.customer.contact,
      workOutcome: incident.customer.workOutcome,
      instruction: incident.customer.instruction,
      reason: incident.customer.reason,
      additional: incident.customer.additional,
    },
    relevantRecords: incident.records,
    sla: incident.sla,
    discrepancies: conflicts,
    currentOutcome: {
      impacts: incident.impacts,
      otherImpact: incident.otherImpact,
    },
    requestedReview: outcomes.primary,
    requestedRecovery: outcomes.recovery,
    transparency: transparency(incident, conflicts, outcomes),
  };
}
