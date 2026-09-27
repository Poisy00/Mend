import {
  COMPOSER_VERSION,
  composeReviewEmail,
} from './email.js';
import { captureFactSnapshot, diffFactSnapshots } from './model.js';

function toHistoryEntry(draft, savedAt) {
  if (!draft?.body) return null;
  return {
    body: draft.body,
    generatedBody: draft.generatedBody || '',
    generatedFrom: draft.generatedFrom,
    generatedAt: draft.generatedAt,
    composerVersion: draft.composerVersion || null,
    schemaVersion: draft.schemaVersion || null,
    savedAt: savedAt || new Date().toISOString(),
  };
}

function generatedDraft(review, settings, now) {
  const message = composeReviewEmail(review, settings);
  return {
    body: message.body,
    generatedBody: message.body,
    generatedFrom: captureFactSnapshot(review),
    generatedAt: now,
    composerVersion: message.composerVersion,
    schemaVersion: message.schemaVersion,
  };
}

export function generateDraft(review, settings, now = new Date().toISOString()) {
  return {
    ...review,
    draft: {
      ...review.draft,
      ...generatedDraft(review, settings, now),
      history: review.draft?.history || [],
    },
  };
}

export function editDraft(review, body) {
  return {
    ...review,
    draft: {
      ...review.draft,
      body,
    },
  };
}

export function deriveDraftStatus(review) {
  const changedFacts = review.draft?.generatedFrom
    ? diffFactSnapshots(review.draft.generatedFrom, captureFactSnapshot(review))
    : [];
  return {
    generated: Boolean(review.draft?.generatedFrom),
    edited: Boolean(review.draft?.generatedBody && review.draft.body !== review.draft.generatedBody),
    stale: changedFacts.length > 0,
    composerOutdated: Boolean(
      review.draft?.generatedFrom
      && review.draft?.composerVersion
      && review.draft.composerVersion !== COMPOSER_VERSION
    ),
    changedFacts,
  };
}

export function refreshDraft(review, settings, now = new Date().toISOString()) {
  const previous = toHistoryEntry(review.draft, now);
  return {
    ...review,
    draft: {
      ...generatedDraft(review, settings, now),
      history: previous
        ? [previous, ...(review.draft?.history || [])].slice(0, 10)
        : (review.draft?.history || []),
    },
  };
}

export function restoreDraftVersion(review, index, now = new Date().toISOString()) {
  const history = [...(review.draft?.history || [])];
  const target = history[index];
  if (!target) return review;
  history.splice(index, 1);
  const displaced = toHistoryEntry(review.draft, now);
  if (displaced) history.unshift(displaced);
  return {
    ...review,
    draft: {
      body: target.body,
      generatedBody: target.generatedBody || target.body,
      generatedFrom: target.generatedFrom || null,
      generatedAt: target.generatedAt || target.savedAt || now,
      composerVersion: target.composerVersion || null,
      schemaVersion: target.schemaVersion || null,
      history: history.slice(0, 10),
    },
  };
}
