/**
 * Question Freshness and Anti-Duplication Engine.
 * Generates normalized structural signatures from questions and computes structural similarity.
 */

export class QuestionFreshness {
  /**
   * Generates a normalized signature for a question prompt.
   * Strips punctuation, whitespace, and variable numbers to identify structural isomorphism.
   */
  static generateSignature(prompt: string, format: string): string {
    if (!prompt) return '';
    const normalized = prompt
      .toLowerCase()
      .replace(/[0-9]+/g, '#NUM')
      .replace(/[^a-z0-9#\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return `${format.toLowerCase()}:${normalized.slice(0, 120)}`;
  }

  /**
   * Checks whether a new prompt signature is a duplicate or near-duplicate of prior signatures.
   */
  static isDuplicate(signature: string, previousSignatures: string[] = []): boolean {
    if (!signature || previousSignatures.length === 0) return false;

    const sigBody = signature.split(':').slice(1).join(':');

    for (const prev of previousSignatures) {
      if (prev === signature) return true;

      const prevBody = prev.split(':').slice(1).join(':');
      if (prevBody === sigBody) return true;

      // Check Jaccard similarity of 3-grams for near duplicates
      const sim = this.ngramSimilarity(sigBody, prevBody);
      if (sim > 0.85) {
        return true;
      }
    }

    return false;
  }

  private static ngramSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length < 5 || b.length < 5) return 0.0;

    const getGrams = (str: string) => {
      const grams = new Set<string>();
      for (let i = 0; i <= str.length - 4; i++) {
        grams.add(str.slice(i, i + 4));
      }
      return grams;
    };

    const setA = getGrams(a);
    const setB = getGrams(b);
    let intersection = 0;

    setA.forEach((g) => {
      if (setB.has(g)) intersection++;
    });

    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}
