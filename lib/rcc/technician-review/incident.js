import {
  IMPACT_BY_ID,
  QUESTION_BY_ID,
  SLA_DURATION_OPTIONS,
  SITUATION_BY_ID,
  isQuestionVisible,
} from './schema.js';

function clean(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function triState(value, yes, no) {
  if (value === 'yes' || value === true) return yes;
  if (value === 'no' || value === false) return no;
  if (value === 'unknown') return 'unsure';
  return 'not-answered';
}

function activeQuestionIds(review) {
  return new Set(
    (review.selectedSituations || [])
      .map((id) => SITUATION_BY_ID[id])
      .filter(Boolean)
      .flatMap((situation) => situation.questionIds),
  );
}

function visibleQuestionIds(review) {
  const active = activeQuestionIds(review);
  return new Set(
    [...active].filter((id) => isQuestionVisible(QUESTION_BY_ID[id], review.answers || {})),
  );
}

function internalArrival(value) {
  if (value === 'arrived' || value === 'completed') return 'arrived';
  if (value === 'not-arrived') return 'no-arrival';
  if (value === 'en-route') return 'attempted';
  if (value === 'unknown' || value === 'other') return 'unknown';
  return 'not-available';
}

function internalContact(value) {
  if (value === 'attempted' || value === 'connected') return 'recorded';
  if (value === 'none-recorded') return 'not-recorded';
  if (value === 'unknown' || value === 'other') return 'unknown';
  return 'not-available';
}

function internalCompletion(visitStatus, completionStatus) {
  if (completionStatus === 'completed' || visitStatus === 'completed') return 'completed';
  if (completionStatus === 'not-started') return 'not-started';
  if (completionStatus === 'incomplete') return 'incomplete';
  if (visitStatus === 'missed' || visitStatus === 'cancelled') return 'not-completed';
  if (completionStatus === 'unknown' || completionStatus === 'other') return 'unknown';
  return 'not-available';
}

function workOutcome(workAttempted, workCompleted, unresolved) {
  const attempted = triState(workAttempted, 'yes', 'no');
  const completed = triState(workCompleted, 'yes', 'no');
  if (attempted === 'no' && completed === 'yes') return 'unknown';
  if (attempted === 'no') return 'no-work-attempted';
  if (attempted === 'yes' && completed === 'no') return 'started-incomplete';
  if (completed === 'yes' && unresolved) return 'reported-complete-unresolved';
  if (completed === 'yes') return 'completed';
  if (attempted === 'unsure' || completed === 'unsure') return 'unknown';
  return 'not-answered';
}

function inferredInstructionType(detail) {
  const text = String(detail || '').toLowerCase();
  if (!text) return 'not-answered';
  if (/(reschedul|another appointment|new appointment)/u.test(text)) return 'reschedule';
  if (/(call|contact).*(support|us|customer service)/u.test(text)) return 'contact-support';
  if (/(wait|follow.?up)/u.test(text)) return 'wait-follow-up';
  if (/(department|billing|sales|retention)/u.test(text)) return 'other-department';
  return 'other';
}

function instruction(review, answer) {
  const detail = clean(answer('customerInstructions')) || '';
  const explicit = answer('instructionType');
  const type = explicit && explicit !== 'unknown'
    ? explicit
    : inferredInstructionType(detail);
  return {
    type: explicit === 'unknown' ? 'unknown' : type,
    delivery: clean(answer('instructionDelivery')) || 'unknown',
    detail,
  };
}

function missingRecommended(review, activeIds) {
  const answers = review.answers || {};
  const ids = [...new Set(
    (review.selectedSituations || [])
      .map((id) => SITUATION_BY_ID[id])
      .filter(Boolean)
      .flatMap((situation) => situation.recommendedFacts),
  )];
  return ids
    .filter((id) => activeIds.has(id))
    .filter((id) => {
      const value = answers[id];
      return value === undefined || value === null || String(value).trim() === '';
    })
    .map((id) => QUESTION_BY_ID[id]?.label || id);
}

export function buildCanonicalIncident(review) {
  const activeIds = visibleQuestionIds(review);
  const answers = review.answers || {};
  const answer = (id) => activeIds.has(id) ? answers[id] : undefined;
  const selectedSituations = (review.selectedSituations || []).filter((id) => Boolean(SITUATION_BY_ID[id]));
  const applicableImpactIds = new Set(
    selectedSituations.flatMap((id) => SITUATION_BY_ID[id]?.impactIds || []),
  );
  const impacts = (review.impacts || [])
    .filter((id) => IMPACT_BY_ID[id])
    .filter((id) => !selectedSituations.length || applicableImpactIds.has(id));
  const unresolved = impacts.includes('service-unresolved');
  const visitStatus = clean(answer('visitStatus')) || 'not-available';
  const completionStatus = clean(answer('completionStatus')) || 'not-available';
  const customerInstruction = instruction(review, answer);
  const slaDurationId = clean(answer('slaDuration')) || '';
  const customSlaDuration = clean(answer('customSlaDuration')) || '';
  const slaDuration = slaDurationId === 'custom'
    ? customSlaDuration
    : (SLA_DURATION_OPTIONS.find(({ value }) => value === slaDurationId)?.emailLabel || '');

  return {
    context: {
      account: clean(review.appointment?.account) || '',
      customerName: clean(review.appointment?.customerName) || '',
      phone: clean(review.appointment?.phone) || '',
      appointmentDate: clean(review.appointment?.date) || '',
      appointmentWindow: review.appointment?.window === 'Custom window'
        ? (clean(review.appointment?.customWindow) || '')
        : (clean(review.appointment?.window) || ''),
      originalIssue: clean(review.appointment?.originalIssue) || '',
    },
    customer: {
      arrival: triState(answer('customerArrived'), 'arrived', 'did-not-arrive'),
      contact: triState(answer('contactReceived'), 'received', 'not-received'),
      available: triState(answer('customerAvailable'), 'yes', 'no'),
      workOutcome: workOutcome(answer('workAttempted'), answer('workCompleted'), unresolved),
      instruction: customerInstruction,
      reason: clean(answer('reasonProvided')) || '',
      additional: clean(answer('customerAdditional')) || '',
    },
    records: {
      visitStatus,
      arrival: internalArrival(answer('arrivalStatus')),
      contact: internalContact(answer('contactAttempt')),
      completion: internalCompletion(visitStatus, completionStatus),
      arrivalTime: clean(answer('arrivalTime')) || '',
      contactTime: clean(answer('contactTime')) || '',
      technicianNotes: clean(answer('technicianNotes')) || '',
      dispatchNotes: clean(answer('dispatchNotes')) || '',
      other: clean(answer('otherInternalInfo')) || '',
    },
    impacts,
    sla: {
      expired: selectedSituations.includes('sla-expired'),
      duration: slaDuration,
      durationId: slaDurationId,
      communicatedAt: clean(answer('slaCommunicatedAt')) || '',
      reference: clean(answer('slaReference')) || '',
      dueAt: clean(answer('slaDueAt')) || '',
      lastStatus: clean(answer('slaLastStatus')) || '',
    },
    otherImpact: impacts.includes('other') ? (clean(review.otherImpact) || '') : '',
    requestedOutcomeOverrides: {
      primary: Array.isArray(review.requestedOutcomeOverrides?.primary)
        ? [...review.requestedOutcomeOverrides.primary]
        : [],
      recovery: clean(review.requestedOutcomeOverrides?.recovery) || '',
    },
    activeSituationIds: selectedSituations,
    missingRecommended: missingRecommended(review, activeIds),
    raw: {
      workAttempted: triState(answer('workAttempted'), 'yes', 'no'),
      workCompleted: triState(answer('workCompleted'), 'yes', 'no'),
      contactReceived: triState(answer('contactReceived'), 'yes', 'no'),
      instructionType: customerInstruction.type,
      instructionDelivery: customerInstruction.delivery,
    },
  };
}
