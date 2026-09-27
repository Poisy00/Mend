import {
  IMPACTS,
  IMPACT_BY_ID,
  QUESTION_BY_ID,
  QUESTIONS,
  SITUATION_BY_ID,
  isQuestionVisible,
} from './schema.js';
import { buildCanonicalIncident } from './incident.js';
import { analyzeIncidentContradictions } from './contradictions.js';

const DEFAULT_WINDOW = '8:00 AM – 11:00 AM';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasAnswer(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function displayAnswer(questionId, value) {
  if (!hasAnswer(value)) return 'Not provided';
  const question = QUESTION_BY_ID[questionId];
  const option = question?.options?.find((item) => item.value === value);
  return option?.label || String(value);
}

function listLabels(ids, lookup) {
  return ids.map((id) => lookup[id]?.label || id).join(', ') || 'None selected';
}

export function createEmptyReview() {
  return {
    selectedSituations: [],
    appointment: {
      account: '',
      phone: '',
      customerName: '',
      date: '',
      window: DEFAULT_WINDOW,
      customWindow: '',
      originalIssue: '',
    },
    answers: {},
    impacts: [],
    otherImpact: '',
    requestedOutcomeOverrides: {
      primary: [],
      recovery: '',
    },
    conflictResolutions: {},
    draft: {
      body: '',
      generatedBody: '',
      generatedFrom: null,
      generatedAt: null,
      composerVersion: null,
      schemaVersion: null,
      history: [],
    },
  };
}

export function mergeReviewWithDefaults(saved = {}) {
  const defaults = createEmptyReview();
  return {
    ...defaults,
    ...saved,
    selectedSituations: Array.isArray(saved.selectedSituations)
      ? saved.selectedSituations.filter((id) => Boolean(SITUATION_BY_ID[id]))
      : [],
    appointment: { ...defaults.appointment, ...(saved.appointment || {}) },
    answers: { ...(saved.answers || {}) },
    impacts: Array.isArray(saved.impacts)
      ? saved.impacts.filter((id) => Boolean(IMPACT_BY_ID[id]))
      : [],
    otherImpact: saved.otherImpact || '',
    requestedOutcomeOverrides: {
      ...defaults.requestedOutcomeOverrides,
      ...(saved.requestedOutcomeOverrides || {}),
      primary: Array.isArray(saved.requestedOutcomeOverrides?.primary)
        ? [...saved.requestedOutcomeOverrides.primary]
        : [],
    },
    conflictResolutions: saved.conflictResolutions && typeof saved.conflictResolutions === 'object'
      ? { ...saved.conflictResolutions }
      : {},
    draft: {
      ...defaults.draft,
      ...(saved.draft || {}),
      history: Array.isArray(saved.draft?.history)
        ? saved.draft.history.filter((entry) => entry && typeof entry.body === 'string').slice(0, 10)
        : [],
    },
  };
}

const LEGACY_SITUATION_IDS = {
  'no-arrival': 'did-not-arrive',
  'arrival-disputed': 'arrival-disputed',
  'no-work': 'no-work-attempted',
  'work-incomplete': 'work-not-completed',
  'left-unresolved': 'left-before-resolution',
  redirected: 'told-contact-support',
  'unclear-guidance': 'incorrect-guidance',
  conduct: 'professional-conduct',
  'other-handling': 'other-handling',
};

const LEGACY_IMPACT_IDS = {
  unresolved: 'service-unresolved',
  'redirected-support': 'redirected-support',
  'appointment-required': 'new-appointment',
  'waited-window': 'waited-window',
  'repeat-troubleshooting': 'repeat-troubleshooting',
  dissatisfied: 'dissatisfaction',
  other: 'other',
};

function migrateLegacyVisitReviewWorkspace(workspace) {
  const legacy = workspace?.state;
  if (!legacy || typeof legacy !== 'object') return null;
  const customer = legacy.customer || {};
  const records = legacy.records || {};
  const visitStatus = ['scheduled', 'in-progress', 'completed', 'cancelled', 'missed', 'unknown', 'other']
    .includes(records.visitStatus)
    ? records.visitStatus
    : records.visitStatus ? 'other' : '';
  const internalDetails = [
    records.exactTimeline ? `Legacy visit timeline: ${records.exactTimeline}` : '',
    visitStatus === 'other' ? `Legacy visit status: ${records.visitStatus}` : '',
    records.otherInternal || '',
  ].filter(Boolean).join('\n');
  const instruction = customer.customerInstruction || '';
  const answers = {
    customerArrived: customer.technicianArrived,
    contactReceived: customer.customerContact,
    customerAvailable: customer.customerAvailable,
    workAttempted: customer.workAttempted,
    workCompleted: customer.workCompleted,
    customerInstructions: instruction,
    instructionType: instruction ? 'other' : '',
    reasonProvided: customer.reasonProvided || '',
    customerAdditional: customer.additionalAccount || '',
    visitStatus,
    arrivalStatus: records.arrivalStatus || '',
    contactAttempt: ({
      recorded: 'attempted',
      'not-recorded': 'none-recorded',
    }[records.contactAttempt]) || records.contactAttempt || '',
    completionStatus: ({
      'not-completed': 'incomplete',
    }[records.completionStatus]) || records.completionStatus || '',
    technicianNotes: records.technicianNotes || '',
    dispatchNotes: records.dispatchNotes || '',
    otherInternalInfo: internalDetails,
  };
  const previousDraft = typeof workspace.previousDraft === 'string' ? workspace.previousDraft : '';
  return mergeReviewWithDefaults({
    selectedSituations: (legacy.selectedSituations || [])
      .map((id) => LEGACY_SITUATION_IDS[id])
      .filter(Boolean),
    appointment: {
      account: legacy.account || '',
      phone: legacy.phone || '',
      customerName: legacy.customerName || '',
      date: legacy.appointment?.date || '',
      window: legacy.appointment?.window || DEFAULT_WINDOW,
    },
    answers: Object.fromEntries(
      Object.entries(answers).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    ),
    impacts: (legacy.impact || []).map((id) => LEGACY_IMPACT_IDS[id]).filter(Boolean),
    otherImpact: legacy.otherImpact || '',
    draft: {
      body: typeof workspace.draft === 'string' ? workspace.draft : '',
      generatedBody: '',
      generatedFrom: null,
      generatedAt: null,
      composerVersion: null,
      schemaVersion: null,
      history: previousDraft ? [{ body: previousDraft, savedAt: null }] : [],
    },
  });
}

export function migrateWorkspaceDraft(raw, expediteDefaults, legacyReviewWorkspace, legacyCaseMode) {
  const defaults = clone(expediteDefaults);
  const migratedLegacyReview = migrateLegacyVisitReviewWorkspace(legacyReviewWorkspace);
  const isWorkspaceEnvelope = raw
    && typeof raw === 'object'
    && (
      Number(raw.version) >= 2
      || Object.hasOwn(raw, 'expedite')
      || Object.hasOwn(raw, 'technicianReview')
    );
  if (isWorkspaceEnvelope) {
    const hasCurrentReview = raw.technicianReview && typeof raw.technicianReview === 'object';
    return {
      version: 3,
      activeCase: raw.activeCase === 'technician-review' ? 'technician-review' : 'expedite',
      expedite: { ...defaults, ...(raw.expedite || {}) },
      technicianReview: hasCurrentReview
        ? mergeReviewWithDefaults(raw.technicianReview)
        : migratedLegacyReview || createEmptyReview(),
    };
  }

  const legacy = raw && typeof raw === 'object' ? raw : {};
  return {
    version: 3,
    activeCase: migratedLegacyReview && legacyCaseMode === 'review'
      ? 'technician-review'
      : 'expedite',
    expedite: { ...defaults, ...legacy },
    technicianReview: migratedLegacyReview || createEmptyReview(),
  };
}

function deriveReadiness(review, situations, mismatches) {
  if (mismatches.length) {
    return {
      id: 'information-mismatch',
      label: 'Information mismatch detected',
      detail: 'Source records differ. The email will request a neutral review.',
    };
  }
  if (!situations.length) {
    return {
      id: 'quick-capture',
      label: 'Quick capture',
      detail: 'Select at least one visit situation to focus the review.',
    };
  }

  const essential = [...new Set(situations.flatMap((situation) => situation.essentialFacts))];
  const recommended = [...new Set(situations.flatMap((situation) => situation.recommendedFacts))];
  const missingEssential = essential.filter((id) => !hasAnswer(review.answers?.[id]));
  const missingRecommended = recommended.filter((id) => !hasAnswer(review.answers?.[id]));
  if (missingEssential.length) {
    return {
      id: 'quick-capture',
      label: 'Quick capture',
      detail: `${missingEssential.length} useful fact${missingEssential.length === 1 ? '' : 's'} can still be added. Escalation remains available.`,
      missingEssential,
      missingRecommended,
    };
  }
  if (missingRecommended.length) {
    return {
      id: 'ready-recommended-missing',
      label: 'Ready — recommended detail missing',
      detail: 'The core facts are captured. Additional records may help the review.',
      missingEssential,
      missingRecommended,
    };
  }
  return {
    id: 'ready',
    label: 'Ready to escalate',
    detail: 'The selected situations have their core and recommended details.',
    missingEssential: [],
    missingRecommended: [],
  };
}

export function getTechnicalBlockers(review, recipient) {
  const blockers = [];
  const account = review.appointment?.account?.trim() || '';
  if (account && !/^[A-Za-z0-9-]{5,24}$/.test(account)) {
    blockers.push({
      id: 'invalid-account-format',
      field: 'review-account',
      label: 'Check the account format',
      detail: 'Use 5–24 letters, numbers, or hyphens with no spaces.',
    });
  }
  if (recipient !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient || '')) {
    blockers.push({
      id: 'invalid-recipient',
      field: 'settings',
      label: 'Configure the Long Island recipient',
      detail: 'A valid routing address is required for copy and Outlook handoff.',
    });
  }
  return blockers;
}

export function deriveReview(review) {
  const situations = (review.selectedSituations || []).map((id) => SITUATION_BY_ID[id]).filter(Boolean);
  const relevantIds = new Set(situations.flatMap((situation) => situation.questionIds));
  const questions = QUESTIONS.filter(
    (question) => relevantIds.has(question.id) && isQuestionVisible(question, review.answers),
  );
  const questionsBySource = {
    customer: questions.filter((question) => question.source === 'customer'),
    records: questions.filter((question) => question.source === 'records'),
  };
  const applicableImpactIds = new Set(situations.flatMap((situation) => situation.impactIds));
  const applicableImpacts = IMPACTS.filter((impact) => applicableImpactIds.has(impact.id));
  const incident = buildCanonicalIncident(review);
  const conflicts = analyzeIncidentContradictions(incident, review);
  return {
    situations,
    questions,
    questionsBySource,
    applicableImpacts,
    incident,
    conflicts,
    mismatches: conflicts,
    readiness: deriveReadiness(review, situations, conflicts),
    reviewAreas: [...new Set(situations.flatMap((situation) => situation.reviewAreas))],
    technicalBlockers: getTechnicalBlockers(review),
  };
}

export function captureFactSnapshot(review) {
  return {
    selectedSituations: [...(review.selectedSituations || [])],
    appointment: { ...(review.appointment || {}) },
    answers: { ...(review.answers || {}) },
    impacts: [...(review.impacts || [])],
    otherImpact: review.otherImpact || '',
    requestedOutcomeOverrides: {
      primary: [...(review.requestedOutcomeOverrides?.primary || [])],
      recovery: review.requestedOutcomeOverrides?.recovery || '',
    },
    conflictResolutions: { ...(review.conflictResolutions || {}) },
  };
}

function flattenSnapshot(snapshot) {
  const fields = new Map();
  fields.set('selectedSituations', {
    label: 'Selected situations',
    value: listLabels(snapshot.selectedSituations || [], SITUATION_BY_ID),
  });
  for (const [key, label] of [
    ['account', 'Main customer account'],
    ['phone', 'Callback number'],
    ['customerName', 'Customer name'],
    ['date', 'Appointment date'],
    ['window', 'Appointment window'],
    ['customWindow', 'Custom appointment window'],
  ]) {
    fields.set(`appointment.${key}`, { label, value: snapshot.appointment?.[key] || 'Not provided' });
  }
  for (const question of QUESTIONS) {
    fields.set(`answers.${question.id}`, {
      label: question.label,
      value: displayAnswer(question.id, snapshot.answers?.[question.id]),
    });
  }
  fields.set('impacts', {
    label: 'Current customer impact',
    value: listLabels(snapshot.impacts || [], IMPACT_BY_ID),
  });
  fields.set('otherImpact', {
    label: 'Other customer impact',
    value: snapshot.otherImpact || 'Not provided',
  });
  fields.set('requestedOutcomeOverrides.primary', {
    label: 'Requested review outcomes',
    value: (snapshot.requestedOutcomeOverrides?.primary || []).join(', ') || 'Suggested automatically',
  });
  fields.set('requestedOutcomeOverrides.recovery', {
    label: 'Requested recovery action',
    value: snapshot.requestedOutcomeOverrides?.recovery || 'Suggested automatically',
  });
  fields.set('conflictResolutions', {
    label: 'Retained information discrepancies',
    value: Object.entries(snapshot.conflictResolutions || {})
      .filter(([, value]) => value === 'retain')
      .map(([key]) => key)
      .sort()
      .join(', ') || 'None selected',
  });
  return fields;
}

export function diffFactSnapshots(previous, current) {
  if (!previous) return [];
  const before = flattenSnapshot(previous);
  const after = flattenSnapshot(current);
  return [...after.entries()].flatMap(([key, next]) => {
    const prior = before.get(key);
    return prior?.value === next.value ? [] : [{
      key,
      label: next.label,
      from: prior?.value || 'Not provided',
      to: next.value,
    }];
  });
}

export function formatQuestionValue(questionId, value) {
  return displayAnswer(questionId, value);
}
