/**
 * DETERMINISTIC WORKFLOW CONTROLLER
 * The absolute deterministic authority of VISION.
 * Enforces:
 * - State machine transitions
 * - Graph edge validation (cannot accept hallucinations)
 * - Session budget and revision depth
 * - Idempotent answer submissions
 * - Strict evidence-based learner memory persistence
 * - Human-in-the-loop escalation
 */

import {
  WorkflowState,
  CourseContext,
  SupervisorDecision,
  GapHypothesis,
  ValidatedHypothesis,
  ResourceSelection,
  TeachingAction,
  Exercise,
  Evaluation,
  LearnerMemory,
  SessionBudget
} from '../models/contracts';
import { GraphValidator } from '../validation/graphValidator';
import { supervisorAgent } from '../agents/supervisorAgent';
import { diagnosticAgent } from '../agents/diagnosticAgent';
import { resourceAgent } from '../agents/resourceAgent';
import { tutorAgent } from '../agents/tutorAgent';
import { exerciseAgent } from '../agents/exerciseAgent';
import { evaluationAgent } from '../agents/evaluationAgent';
import { db, StoredSession } from '../db';
import { generateInitialTeaching, generateExercise } from '../engine';

export class WorkflowController {
  /**
   * Validates a diagnostic hypothesis against the Course DAG.
   */
  static validateHypothesis(
    hypothesis: GapHypothesis,
    activeConcept: string,
    courseContext: CourseContext
  ): ValidatedHypothesis {
    const prereq = hypothesis.suspected_prerequisite;

    if (!prereq) {
      return {
        hypothesis,
        is_supported_in_dag: false,
        is_direct_or_ancestor_prereq: false,
        validated_prerequisite_id: null,
        validation_status: 'rejected_unconnected',
        rationale: 'No prerequisite was identified in the hypothesis.'
      };
    }

    // Check DAG connectivity
    const isConnected = GraphValidator.isPrerequisiteOf(courseContext.dag, activeConcept, prereq);

    if (!isConnected) {
      return {
        hypothesis,
        is_supported_in_dag: false,
        is_direct_or_ancestor_prereq: false,
        validated_prerequisite_id: null,
        validation_status: 'rejected_unconnected',
        rationale: `Proposed prerequisite '${prereq}' is not connected to '${activeConcept}' in the course dependency graph.`
      };
    }

    if (hypothesis.confidence < 0.4) {
      return {
        hypothesis,
        is_supported_in_dag: true,
        is_direct_or_ancestor_prereq: true,
        validated_prerequisite_id: prereq,
        validation_status: 'rejected_low_confidence',
        rationale: `Hypothesis confidence (${hypothesis.confidence}) is below the acceptable threshold (0.40).`
      };
    }

    return {
      hypothesis,
      is_supported_in_dag: true,
      is_direct_or_ancestor_prereq: true,
      validated_prerequisite_id: prereq,
      validation_status: 'accepted',
      rationale: `Validated '${prereq}' as a legitimate dependency of '${activeConcept}'.`
    };
  }

  /**
   * Executes the full deterministic step when an answer is submitted.
   */
  static async handleStudentSubmission(
    session: StoredSession,
    submission: {
      student_answer?: string;
      selected_option?: string;
      code_submission?: string;
      submission_id?: string;
    }
  ): Promise<StoredSession> {
    const now = new Date().toISOString();
    const runId = session.run_id;

    // Idempotency check: prevent double-clicks
    if (submission.submission_id && session.last_submission_id === submission.submission_id) {
      return session;
    }
    session.last_submission_id = submission.submission_id;

    const activeConcept = session.active_concept || session.target_id;
    const conceptTitle = session.concept_titles[activeConcept] || session.target_concept;

    // 1. EVALUATION AGENT evaluates the answer
    const evalResult: Evaluation = await evaluationAgent.evaluate({
      exercise: session.active_exercise,
      answer_key: session.active_answer_key,
      student_answer: submission.student_answer || '',
      selected_option: submission.selected_option,
      code_submission: submission.code_submission
    });

    session.evaluation = evalResult;
    session.call_count += 1;

    // Record in exercise history for freshness tracking
    if (!session.exercise_history) session.exercise_history = [];
    session.exercise_history.push({
      exercise_id: session.active_exercise?.exercise_id,
      concept_id: activeConcept,
      status: evalResult.status,
      timestamp: now
    });

    // Log Evaluation Event
    db.addEvent(runId, {
      timestamp: now,
      source_agent: 'EvaluationAgent',
      target_agent: 'WorkflowController',
      action: 'evaluate_submission',
      reason: evalResult.reasoning_summary,
      state: session.current_state
    });

    // 2. Branch based on evaluation outcome
    const profile = db.getStudentProfile(session.student_id, session.course_id);
    const activeStrategy = session.teaching_action?.teaching_strategy || session.teaching_action?.teaching_mode || 'DIRECT_EXPLANATION';

    if (evalResult.status === 'demonstrated') {
      // Record demonstrated teaching outcome
      if (!profile.mastered_concepts.includes(activeConcept)) {
        profile.mastered_concepts.push(activeConcept);
      }
      profile.teaching_outcomes.push({
        strategy: activeStrategy,
        mode: session.teaching_action?.teaching_mode || 'standard',
        concept_id: activeConcept,
        evaluation_status: 'demonstrated',
        learning_result: 'Mastery demonstrated on active assessment',
        timestamp: now
      });
      if (!profile.successful_teaching_modes.includes(activeStrategy)) {
        profile.successful_teaching_modes.push(activeStrategy);
      }
      // Remove from failed if student now succeeded with this mode
      profile.failed_teaching_modes = profile.failed_teaching_modes.filter(m => m !== activeStrategy);
      db.saveStudentProfile(profile);

      if (activeConcept !== session.target_id) {
        // Prerequisite successfully repaired! Return to active part of target concept
        session.current_state = 'RECHECK_ORIGINAL';
        session.active_concept = session.target_id;
        const currentPart = session.learning_parts && session.current_part_index != null
          ? session.learning_parts[session.current_part_index]
          : undefined;

        const retestOutcome = await exerciseAgent.generateAssessment({
          student_id: session.student_id,
          course_id: session.course_id,
          subject: session.subject,
          target_concept: session.target_concept,
          active_concept: session.target_id,
          concept_title: currentPart ? `${currentPart.title} (${session.target_concept})` : session.target_concept,
          phase_intent: currentPart ? (`PART_${currentPart.part_number}_RECHECK` as any) : 'TARGET_RETEST',
          learner_level: session.learner_level,
          learning_goal: session.learning_goal,
          previous_exercise_ids: session.exercise_history.map(h => h.exercise_id)
        });
        session.active_exercise = {
          ...retestOutcome.exercise,
          learning_part: currentPart
        };
        session.active_answer_key = retestOutcome.answer_key;

        db.addHandoff(runId, {
          from: 'EvaluationAgent',
          to: 'SupervisorAgent',
          action: 'prereq_repaired',
          timestamp: now,
          reason: `Prerequisite ${conceptTitle} demonstrated. Advancing to retest target milestone ${currentPart ? currentPart.title : session.target_concept}.`
        });
      } else {
        // Check if session has structured N-parts progression
        const parts = session.learning_parts || [];
        const currentIndex = session.current_part_index ?? 0;
        const totalParts = session.n_parts || (parts.length > 0 ? parts.length : 1);

        if (parts.length > 0 && currentIndex < parts.length) {
          // Mark current part as mastered
          parts[currentIndex].status = 'mastered';
          parts[currentIndex].demonstrated_at = now;
          parts[currentIndex].evaluations_count = (parts[currentIndex].evaluations_count || 0) + 1;

          // Check if there are remaining parts in the learning roadmap
          if (currentIndex < totalParts - 1 && currentIndex + 1 < parts.length) {
            const nextIndex = currentIndex + 1;
            session.current_part_index = nextIndex;
            const prevPart = parts[currentIndex];
            const nextPart = parts[nextIndex];
            nextPart.status = 'in_progress';

            session.part_transition_data = {
              previous_part: prevPart,
              next_part: nextPart,
              message: `Milestone Achieved: Part ${prevPart.part_number} (${prevPart.title}) mastered! Advancing to Part ${nextPart.part_number} of ${totalParts}: ${nextPart.title}.`
            };

            // Transition to INITIAL_TEACHING for the next part
            session.current_state = 'INITIAL_TEACHING';
            const nextLesson = await generateInitialTeaching(
              session.subject,
              session.target_concept,
              session.learner_level,
              session.learning_goal,
              session.student_id,
              session.course_id,
              nextPart
            );
            session.teaching_action = nextLesson;

            db.addEvent(runId, {
              timestamp: now,
              source_agent: 'SupervisorAgent',
              target_agent: 'TutorAgent',
              action: 'advance_to_next_part',
              reason: `Part ${prevPart.part_number} mastered. Orchestrating Part ${nextPart.part_number} of ${totalParts}: ${nextPart.title}`,
              state: 'INITIAL_TEACHING'
            });

            db.addHandoff(runId, {
              from: 'EvaluationAgent',
              to: 'TutorAgent',
              action: 'next_milestone_unlocked',
              timestamp: now,
              reason: `Advanced to Part ${nextPart.part_number}/${totalParts}: ${nextPart.title}`
            });

            db.saveSession(session);
            return session;
          }
        }

        // All parts completed / Target concept fully mastered!
        session.current_state = 'TARGET_MASTERED';
        session.status = 'completed';

        db.addEvent(runId, {
          timestamp: now,
          source_agent: 'EvaluationAgent',
          target_agent: 'WorkflowController',
          action: 'mastery_achieved',
          reason: `Demonstrated full mastery across all ${totalParts} milestone parts of ${session.target_concept}`,
          state: 'TARGET_MASTERED'
        });
      }
    } else {
      // Unresolved or uncertain: trigger Diagnostic Agent
      session.revision_count += 1;
      if (session.learning_parts && session.current_part_index != null && session.learning_parts[session.current_part_index]) {
        session.learning_parts[session.current_part_index].status = 'repairing';
        session.learning_parts[session.current_part_index].evaluations_count = (session.learning_parts[session.current_part_index].evaluations_count || 0) + 1;
      }

      // Record unresolved outcome
      profile.teaching_outcomes.push({
        strategy: activeStrategy,
        mode: session.teaching_action?.teaching_mode || 'standard',
        concept_id: activeConcept,
        evaluation_status: 'unresolved',
        learning_result: evalResult.reasoning_summary,
        timestamp: now
      });

      // If this strategy has failed 2+ times, add to failed_teaching_modes
      const unresolvedForStrategy = profile.teaching_outcomes.filter(
        o => o.strategy === activeStrategy && o.evaluation_status === 'unresolved'
      ).length;
      if (unresolvedForStrategy >= 2 && !profile.failed_teaching_modes.includes(activeStrategy)) {
        profile.failed_teaching_modes.push(activeStrategy);
      }
      db.saveStudentProfile(profile);

      // Check revision budget
      if (session.revision_count > 4) {
        session.current_state = 'WAITING_FOR_HUMAN';
        session.human_question = {
          question: `The student has attempted 4 remediation cycles on '${conceptTitle}' without unblocking. Instructor assistance required.`,
          options: ['Provide hint', 'Override to target', 'Change teaching mode', 'Reset session'],
          status: 'pending'
        };
        db.addEvent(runId, {
          timestamp: now,
          source_agent: 'WorkflowController',
          target_agent: 'HumanInstructor',
          action: 'escalate_budget_exceeded',
          reason: 'Max revision depth reached.',
          state: 'WAITING_FOR_HUMAN'
        });
        db.saveSession(session);
        return session;
      }

      // 3. DIAGNOSTIC AGENT
      const hypothesis: GapHypothesis = await diagnosticAgent.diagnose({
        run_id: runId,
        attempt_id: `att_${Date.now()}`,
        target_concept: session.target_concept,
        active_concept: activeConcept,
        student_answer: submission.selected_option || submission.student_answer || '',
        evaluation: evalResult,
        exercise: session.active_exercise,
        course_context: {
          course_id: session.course_id,
          course_name: session.subject,
          subject: session.subject,
          target_concept: session.target_concept,
          target_id: session.target_id,
          dag: session.dag,
          concept_titles: session.concept_titles,
          nodes: {},
          is_valid_dag: true
        }
      });

      // 4. CONTROLLER VALIDATES HYPOTHESIS
      const courseCtx: CourseContext = {
        course_id: session.course_id,
        course_name: session.subject,
        subject: session.subject,
        target_concept: session.target_concept,
        target_id: session.target_id,
        dag: session.dag,
        concept_titles: session.concept_titles,
        nodes: {},
        is_valid_dag: true
      };

      const validated = this.validateHypothesis(hypothesis, activeConcept, courseCtx);

      db.addEvent(runId, {
        timestamp: now,
        source_agent: 'DiagnosticAgent',
        target_agent: 'WorkflowController',
        action: 'diagnose_error',
        reason: `${hypothesis.category}: ${hypothesis.reasoning_summary}`,
        state: 'DIAGNOSE_GAP'
      });

      const selectedPrereq = validated.validated_prerequisite_id || session.dag[activeConcept]?.[0] || activeConcept;
      const prereqTitle = session.concept_titles[selectedPrereq] || selectedPrereq;

      session.candidate_prerequisite = selectedPrereq;
      session.active_concept = selectedPrereq;
      session.current_state = 'DIAGNOSE_GAP';

      // 5. RESOURCE AGENT retrieves verified evidence
      const resource = await resourceAgent.selectResource({
        concept_id: selectedPrereq,
        concept_title: prereqTitle,
        query_context: `${session.subject} ${prereqTitle}`
      });
      session.resource_selection = resource;

      // 6. TUTOR AGENT delivers targeted prerequisite repair with rich context
      const lesson = await tutorAgent.teach({
        teaching_context: 'PREREQUISITE_REPAIR',
        concept_id: selectedPrereq,
        concept_title: prereqTitle,
        target_concept: session.target_concept,
        active_concept: selectedPrereq,
        subject: session.subject,
        student_id: session.student_id,
        course_id: session.course_id,
        learner_level: session.learner_level,
        learning_goal: session.learning_goal,
        evidence: resource.primary_evidence,
        misconception: hypothesis.reasoning_summary,
        learner_memory: {
          student_id: session.student_id,
          course_id: session.course_id,
          mastered_concepts: profile.mastered_concepts,
          weak_concepts: profile.weak_concepts,
          confirmed_misconceptions: profile.misconceptions,
          prerequisite_history: profile.prerequisite_history,
          successful_teaching_modes: profile.successful_teaching_modes,
          failed_teaching_modes: profile.failed_teaching_modes,
          teaching_outcomes: profile.teaching_outcomes,
          total_attempts: session.call_count,
          total_sessions: profile.total_sessions,
          last_updated: now
        },
        hidden_expected_answer: session.active_exercise?.expected_answer
      });
      session.teaching_action = lesson;

      db.addHandoff(runId, {
        from: 'DiagnosticAgent',
        to: 'TutorAgent',
        action: 'repair_prerequisite',
        timestamp: now,
        reason: `Targeted repair scheduled for prerequisite '${prereqTitle}'.`
      });
    }

    db.saveSession(session);
    return session;
  }
}
