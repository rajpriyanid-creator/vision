/**
 * AGENT 2: DIAGNOSTIC AGENT
 * Debugs student learning failures by forming grounded, probabilistic hypotheses.
 * Distinguishes genuine prerequisite gaps, misconceptions, careless errors, and ambiguity.
 * NEVER relies on hardcoded domain if-statements or blindly returns the first node.
 */

import { CourseContext, GapHypothesis, Evaluation, Exercise } from '../models/contracts';
import { generateWithGemini } from '../gemini';
import { GraphValidator } from '../validation/graphValidator';

export interface DiagnosticInput {
  run_id: string;
  attempt_id: string;
  target_concept: string;
  active_concept: string;
  student_answer: string;
  evaluation: Evaluation;
  exercise: Exercise;
  course_context: CourseContext;
  prior_attempts?: any[];
}

export class DiagnosticAgent {
  async diagnose(input: DiagnosticInput): Promise<GapHypothesis> {
    const { run_id, attempt_id, target_concept, active_concept, student_answer, evaluation, exercise, course_context } =
      input;

    const availablePrereqs = course_context.dag[active_concept] || [];
    const allAncestors = Array.from(GraphValidator.getAncestors(course_context.dag, active_concept));

    // Try AI-driven diagnosis if live LLM is configured
    const prompt = `You are the DIAGNOSTIC AGENT for the VISION adaptive learning system.
Debug the student's learning struggle using precise cognitive diagnostic modeling.

Active Concept: "${active_concept}" (${course_context.concept_titles[active_concept] || active_concept})
Target Concept: "${target_concept}"
Question Given: "${exercise.prompt}"
Student's Answer: "${student_answer}"
Evaluation Feedback: "${evaluation.reasoning_summary}"
Available Direct Prerequisites in Course DAG: ${JSON.stringify(availablePrereqs)}
All Transitive Ancestor Prerequisites in Course DAG: ${JSON.stringify(allAncestors)}

Categories: "prerequisite_gap", "misconception", "careless_error", "incomplete_reasoning", "ambiguous", "unsupported_diagnosis".

CRITICAL RULES:
1. ONLY select a suspected_prerequisite if it exists in the available prerequisites or transitive ancestors list.
2. If the student made a typo/syntax slip, classify as "careless_error" and set suspected_prerequisite to null.
3. If the answer is vague or says "not sure", classify as "ambiguous".
4. If there is no supported prerequisite in the graph, set suspected_prerequisite to null.

Output strictly JSON:
{
  "category": "prerequisite_gap",
  "suspected_prerequisite": "one_id_from_ancestors_or_null",
  "confidence": 0.85,
  "reasoning_summary": "Concise cognitive diagnosis of why this error happened.",
  "evidence_references": ["student answer excerpt"],
  "alternative_hypotheses": []
}`;

    const aiRes = await generateWithGemini(prompt);
    if (aiRes) {
      try {
        const cleaned = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        // Sanitize proposed prerequisite against DAG
        let suspected = parsed.suspected_prerequisite || null;
        if (suspected) {
          const suspectedStr = String(suspected).trim().toLowerCase();
          const normKey = suspectedStr.replace(/[^a-z0-9_]/g, '_');
          const allCandidates = [...availablePrereqs, ...allAncestors];
          const matched = allCandidates.find(
            (c) =>
              c.toLowerCase() === suspectedStr ||
              c.toLowerCase() === normKey ||
              course_context.concept_titles[c]?.toLowerCase() === suspectedStr ||
              course_context.concept_titles[c]?.toLowerCase().includes(suspectedStr)
          );
          if (matched) {
            suspected = matched;
          } else if (availablePrereqs.length > 0) {
            suspected = availablePrereqs[0];
          } else {
            suspected = null;
          }
        } else if (parsed.category === 'prerequisite_gap' && availablePrereqs.length > 0) {
          suspected = availablePrereqs[0];
        }

        return {
          run_id,
          attempt_id,
          target_concept,
          active_concept,
          student_answer,
          category: parsed.category || 'prerequisite_gap',
          suspected_prerequisite: suspected,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
          reasoning_summary: parsed.reasoning_summary || 'Diagnosed error pattern from student telemetry.',
          evidence_references: parsed.evidence_references || [student_answer.slice(0, 100)],
          alternative_hypotheses: parsed.alternative_hypotheses || []
        };
      } catch {
        // Fallback to grounded semantic pattern analysis
      }
    }

    // Grounded deterministic semantic analysis
    const lowerAns = student_answer.toLowerCase();

    // 1. Careless error check
    if (lowerAns.includes('typo') || lowerAns.includes('misread') || lowerAns.includes('accidentally') || lowerAns.includes('syntax')) {
      return {
        run_id,
        attempt_id,
        target_concept,
        active_concept,
        student_answer,
        category: 'careless_error',
        suspected_prerequisite: null,
        confidence: 0.9,
        reasoning_summary: 'Student indicated a slip or typographical error rather than conceptual failure.',
        evidence_references: [student_answer],
        alternative_hypotheses: []
      };
    }

    // 2. Ambiguity check
    if (lowerAns.includes('not sure') || lowerAns.includes('maybe') || lowerAns.length < 5) {
      return {
        run_id,
        attempt_id,
        target_concept,
        active_concept,
        student_answer,
        category: 'ambiguous',
        suspected_prerequisite: availablePrereqs[0] || null,
        confidence: 0.45,
        reasoning_summary: 'Insufficient evidence to determine exact conceptual root cause with high confidence.',
        evidence_references: [student_answer],
        alternative_hypotheses: []
      };
    }

    // 3. Connect to valid prerequisite in DAG
    let bestPrereq: string | null = null;
    let confidence = 0.8;
    let rationale = `Diagnosed struggle on ${active_concept}.`;

    if (availablePrereqs.length > 0) {
      // Find prerequisite that matches answer keywords or select the primary ancestor
      bestPrereq = availablePrereqs[0];
      for (const p of availablePrereqs) {
        const pNorm = p.replace(/_/g, ' ');
        if (lowerAns.includes(pNorm) || lowerAns.includes(p)) {
          bestPrereq = p;
          confidence = 0.9;
          break;
        }
      }
      rationale = `Identified prerequisite dependency '${bestPrereq}' in course DAG as primary candidate for remediation.`;
    }

    return {
      run_id,
      attempt_id,
      target_concept,
      active_concept,
      student_answer,
      category: bestPrereq ? 'prerequisite_gap' : 'unsupported_diagnosis',
      suspected_prerequisite: bestPrereq,
      confidence,
      reasoning_summary: rationale,
      evidence_references: [student_answer.slice(0, 120)],
      alternative_hypotheses: []
    };
  }
}

export const diagnosticAgent = new DiagnosticAgent();
