function action(id, label) {
  return { id, label };
}

function retained(review, id) {
  return review.conflictResolutions?.[id] === 'retain';
}

export function analyzeIncidentContradictions(incident, review = {}) {
  const conflicts = [];
  const add = (conflict) => conflicts.push({
    material: true,
    retained: retained(review, conflict.id),
    ...conflict,
  });

  if (
    incident.activeSituationIds.includes('did-not-arrive')
    && incident.customer.arrival === 'arrived'
  ) {
    add({
      id: 'arrival-selection-conflict',
      kind: 'selection-customer',
      statement: 'Arrival information may conflict. The selected situation indicates that the technician did not arrive, but the customer-arrival answer is marked Yes.',
      actions: [
        action('customer-arrival-no', 'Change customer arrival to No'),
        action('replace-with-arrival-disputed', 'Replace concern with Arrival status disputed'),
        action('retain-discrepancy', 'Keep both and describe the discrepancy'),
      ],
    });
  }

  if (
    incident.customer.arrival === 'did-not-arrive'
    && incident.records.arrival === 'arrived'
  ) {
    add({
      id: 'arrival-record-conflict',
      kind: 'customer-record',
      statement: 'The recorded arrival status differs from the customer’s account of the visit.',
      actions: [
        action('customer-arrival-yes', 'Change customer arrival to Yes'),
        action('record-arrival-no', 'Change recorded arrival to No arrival reflected'),
        action('retain-discrepancy', 'Keep both as a discrepancy'),
      ],
    });
  }

  const hasInstruction = !['not-answered', 'unknown', 'no-instruction'].includes(
    incident.customer.instruction.type,
  );
  const conflictingDelivery = ['unknown', 'phone', 'voicemail', 'written'].includes(
    incident.customer.instruction.delivery,
  );
  if (incident.customer.contact === 'not-received' && hasInstruction && conflictingDelivery) {
    add({
      id: 'contact-instruction-conflict',
      kind: 'customer-customer',
      statement: 'The case records an instruction from the technician, but the customer is marked as receiving no contact.',
      actions: [
        action('choose-instruction-delivery', 'Choose how the instruction was delivered'),
        action('customer-contact-yes', 'Change customer contact to Yes'),
        action('customer-contact-unknown', 'Mark customer contact as Unknown'),
        action('retain-discrepancy', 'Keep both as a discrepancy'),
      ],
    });
  }

  if (incident.raw.workAttempted === 'no' && incident.raw.workCompleted === 'yes') {
    add({
      id: 'customer-work-conflict',
      kind: 'customer-customer',
      statement: 'The customer work answers conflict: no work is marked as attempted while work is also marked completed.',
      actions: [
        action('customer-work-not-completed', 'Change completed work to No'),
        action('customer-work-attempted', 'Change work attempted to Yes'),
        action('retain-discrepancy', 'Keep both as a discrepancy'),
      ],
    });
  }

  if (
    ['no-work-attempted', 'started-incomplete'].includes(incident.customer.workOutcome)
    && incident.records.completion === 'completed'
  ) {
    add({
      id: 'completion-record-conflict',
      kind: 'customer-record',
      statement: 'The recorded completion status differs from the customer’s account of the work performed.',
      actions: [
        action('record-completion-incomplete', 'Change recorded completion to Incomplete'),
        action('retain-discrepancy', 'Keep both as a discrepancy'),
      ],
    });
  } else if (
    incident.records.completion === 'completed'
    && incident.impacts.includes('service-unresolved')
  ) {
    add({
      id: 'completion-impact-conflict',
      kind: 'customer-record',
      statement: 'The available visit status reflects completion; however, the service issue is recorded as remaining unresolved.',
      actions: [
        action('record-completion-incomplete', 'Change recorded completion to Incomplete'),
        action('retain-discrepancy', 'Keep both as a discrepancy'),
      ],
    });
  }

  if (incident.customer.contact === 'not-received' && incident.records.contact === 'recorded') {
    add({
      id: 'contact-record-conflict',
      kind: 'customer-record',
      statement: 'The recorded contact activity differs from the customer’s account of receiving contact.',
      actions: [
        action('customer-contact-yes', 'Change customer contact to Yes'),
        action('record-contact-none', 'Change recorded contact to None recorded'),
        action('retain-discrepancy', 'Keep both as a discrepancy'),
      ],
    });
  }

  return conflicts;
}

export function applyConflictAction(review, conflictId, actionId) {
  if (actionId === 'retain-discrepancy') {
    return {
      ...review,
      conflictResolutions: {
        ...(review.conflictResolutions || {}),
        [conflictId]: 'retain',
      },
    };
  }

  const next = {
    ...review,
    selectedSituations: [...(review.selectedSituations || [])],
    answers: { ...(review.answers || {}) },
    conflictResolutions: {
      ...(review.conflictResolutions || {}),
    },
  };
  delete next.conflictResolutions[conflictId];

  const patches = {
    'customer-arrival-no': ['customerArrived', 'no'],
    'customer-arrival-yes': ['customerArrived', 'yes'],
    'record-arrival-no': ['arrivalStatus', 'not-arrived'],
    'customer-contact-yes': ['contactReceived', 'yes'],
    'customer-contact-unknown': ['contactReceived', 'unknown'],
    'record-contact-none': ['contactAttempt', 'none-recorded'],
    'customer-work-not-completed': ['workCompleted', 'no'],
    'customer-work-attempted': ['workAttempted', 'yes'],
    'record-completion-incomplete': ['completionStatus', 'incomplete'],
  };

  if (actionId === 'replace-with-arrival-disputed') {
    next.selectedSituations = next.selectedSituations.filter((id) => id !== 'did-not-arrive');
    if (!next.selectedSituations.includes('arrival-disputed')) {
      next.selectedSituations.push('arrival-disputed');
    }
    return next;
  }

  const patch = patches[actionId];
  if (patch) next.answers[patch[0]] = patch[1];
  return next;
}
