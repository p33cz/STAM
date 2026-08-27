/**
 * Mock "AI" tag suggestion.
 * Stands in for a future LLM-based classifier: same function signature
 * (description in, tags out), so the real implementation can later replace
 * this one without touching the service layer that calls it.
 */
const KEYWORD_TAG_MAP: ReadonlyMap<string, string> = new Map([
  ['bug', 'bug'],
  ['fix', 'bug'],
  ['error', 'bug'],
  ['crash', 'bug'],
  ['urgent', 'urgent'],
  ['asap', 'urgent'],
  ['critical', 'urgent'],
  ['meeting', 'meeting'],
  ['call', 'meeting'],
  ['sync', 'meeting'],
  ['design', 'design'],
  ['ui', 'design'],
  ['ux', 'design'],
  ['mockup', 'design'],
  ['api', 'backend'],
  ['database', 'backend'],
  ['server', 'backend'],
  ['migration', 'backend'],
  ['frontend', 'frontend'],
  ['react', 'frontend'],
  ['component', 'frontend'],
  ['test', 'testing'],
  ['testing', 'testing'],
  ['qa', 'testing'],
  ['research', 'research'],
  ['investigate', 'research'],
  ['document', 'documentation'],
  ['docs', 'documentation'],
  ['readme', 'documentation'],
]);

const MAX_SUGGESTED_TAGS = 5;

export function suggestTags(description: string): string[] {
  const words = description.toLowerCase().match(/[a-z0-9]+/g) ?? [];

  const tags = new Set<string>();
  for (const word of words) {
    const tag = KEYWORD_TAG_MAP.get(word);
    if (tag) {
      tags.add(tag);
    }
    if (tags.size >= MAX_SUGGESTED_TAGS) {
      break;
    }
  }

  return [...tags];
}
