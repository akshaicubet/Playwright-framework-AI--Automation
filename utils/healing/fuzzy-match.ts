import levenshtein from 'fast-levenshtein';

/**
 * Returns a 0..1 similarity score between two strings (1 = identical).
 * Uses normalized Levenshtein distance.
 */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const normA = a.trim().toLowerCase();
  const normB = b.trim().toLowerCase();
  if (normA === normB) return 1;

  const distance = levenshtein.get(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;

  return 1 - distance / maxLen;
}

/**
 * Descriptors are written for humans ("Sign In button", "Email field"), but
 * the element's own text is just "Sign In" / "Email". Strip trailing role
 * words so they don't drag the similarity score below threshold.
 */
const ROLE_WORDS = /\b(button|btn|link|field|input|textbox|text box|checkbox|radio|dropdown|select|combobox|tab|icon|menu item)\b/gi;

export function stripRoleWords(descriptor: string): string {
  return descriptor.replace(ROLE_WORDS, ' ').replace(/\s+/g, ' ').trim();
}

export interface CandidateElement {
  tag: string;
  /** Explicit `role` attribute, or the implicit ARIA role of the tag. */
  role?: string | null;
  id?: string | null;
  name?: string | null;
  testId?: string | null;
  ariaLabel?: string | null;
  /** Text of the associated <label>, for form controls. */
  label?: string | null;
  placeholder?: string | null;
  text?: string | null;
}

export interface MatchResult {
  candidate: CandidateElement;
  score: number;
  matchedOn: string;
}

/**
 * Compares a failed locator's descriptive text against a list of currently
 * visible interactive elements and returns every fuzzy match above the
 * threshold, best first. This never touches an LLM — pure string math.
 */
export function rankMatches(
  failedDescriptor: string,
  candidates: CandidateElement[],
  threshold = 0.8
): MatchResult[] {
  const stripped = stripRoleWords(failedDescriptor);
  const matches: MatchResult[] = [];

  for (const candidate of candidates) {
    const fields: Array<[string, string | null | undefined]> = [
      ['testId', candidate.testId],
      ['ariaLabel', candidate.ariaLabel],
      ['label', candidate.label],
      ['placeholder', candidate.placeholder],
      ['name', candidate.name],
      ['id', candidate.id],
      ['text', candidate.text],
    ];

    let best: MatchResult | null = null;
    for (const [field, value] of fields) {
      if (!value) continue;
      const score = Math.max(similarity(failedDescriptor, value), similarity(stripped, value));
      if (score >= threshold && (!best || score > best.score)) {
        best = { candidate, score, matchedOn: field };
      }
    }
    if (best) matches.push(best);
  }

  return matches.sort((a, b) => b.score - a.score);
}

export function findBestMatch(
  failedDescriptor: string,
  candidates: CandidateElement[],
  threshold = 0.8
): MatchResult | null {
  return rankMatches(failedDescriptor, candidates, threshold)[0] ?? null;
}
