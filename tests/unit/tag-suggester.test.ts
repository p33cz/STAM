import { describe, expect, it } from 'vitest';

import { suggestTags } from '../../src/utils/tag-suggester.js';

describe('suggestTags', () => {
  it('matches known keywords case-insensitively', () => {
    expect(suggestTags('Fix a critical BUG in the API before the client demo')).toEqual(
      expect.arrayContaining(['bug', 'urgent', 'backend']),
    );
  });

  it('returns an empty array when no keywords match', () => {
    expect(suggestTags('Buy milk on the way home')).toEqual([]);
  });

  it('returns an empty array for an empty description', () => {
    expect(suggestTags('')).toEqual([]);
  });

  it('deduplicates tags reached via multiple keywords', () => {
    // "fix" and "error" both map to the "bug" tag.
    expect(suggestTags('fix the error')).toEqual(['bug']);
  });

  it('never returns more than the configured maximum number of tags', () => {
    const description = 'bug urgent meeting design api frontend test research document';
    expect(suggestTags(description).length).toBeLessThanOrEqual(5);
  });

  it('ignores punctuation between keywords', () => {
    expect(suggestTags('urgent: fix, the bug!')).toEqual(expect.arrayContaining(['urgent', 'bug']));
  });
});
