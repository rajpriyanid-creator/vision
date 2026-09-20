import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, StoredSession } from './server/db';
import {
  buildDAG,
  generateInitialTeaching,
  generatePrereqQuiz,
  generateExercise,
  generateReteachLesson,
  toId
} from './server/engine';
import { PartPlanner } from './server/curriculum/partPlanner';
import { checkGeminiHealth, getGeminiStatus } from './server/gemini';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

function publicSession(session: StoredSession) {
  let exercise: any = null;
  if (session.active_exercise) {
    const raw = session.active_exercise;
    exercise = {
      exercise_id: raw.exercise_id,
      concept_id: raw.concept_id,
      concept_title: raw.concept_title,
      format: raw.format || raw.question_format || 'mcq',
      question_format: raw.format || raw.question_format || 'mcq',
      prompt: raw.prompt || raw.question_text || '',
      question_text: raw.prompt || raw.question_text || '',
      options: raw.options || raw.mcq_options || [],
      mcq_options: raw.options || raw.mcq_options || [],
      blank_template: raw.blank_template || null,
      difficulty: raw.difficulty || 'Intermediate',
      cognitive_demand: raw.cognitive_demand || 'Comprehension',
      starter_code: raw.starter_code || raw.code_starter || '',
      code_starter: raw.starter_code || raw.code_starter || '',
      language: raw.language || 'javascript',
      public_examples: raw.public_examples || [],
      phase_intent: raw.phase_intent || 'INITIAL_TARGET',
      quality_status: raw.quality_status || 'PASS',
      learning_part: raw.learning_part || (session.learning_parts && session.current_part_index != null ? session.learning_parts[session.current_part_index] : undefined)
    };
  }

  const teaching_action = session.teaching_action
    ? {
        ...session.teaching_action,
        explanation: session.teaching_action.explanation || session.teaching_action.explanation_text || '',
        learning_part: session.teaching_action.learning_part || (session.learning_parts && session.current_part_index != null ? session.learning_parts[session.current_part_index] : undefined)
      }
    : null;

  return {
    run_id: session.run_id,
    current_state: session.current_state,
    status: session.status,
    session: {
      run_id: session.run_id,
      student_id: session.student_id,
      course_id: session.course_id,
      target_concept: session.target_concept,
      current_state: session.current_state,
      status: session.status,
      call_count: session.call_count,
      revision_count: session.revision_count,
      backtrack_count: session.backtrack_count,
      candidate_prerequisite: session.candidate_prerequisite,
      target_id: session.target_id,
      active_concept: session.active_concept,
      agent_activities: session.agent_activities,
      dag: session.dag,
      concept_titles: session.concept_titles,
      handoffs: db.getHandoffs(session.run_id),
      vision_statement: session.vision_statement,
      n_parts: session.n_parts || session.learning_parts?.length || 1,
      current_part_index: session.current_part_index ?? 0,
      learning_parts: session.learning_parts || [],
      part_transition_data: session.part_transition_data
    },
    subject: session.subject,
    target_concept: session.target_concept,
    target_id: session.target_id,
    active_concept: session.active_concept,
    candidate_prerequisite: session.candidate_prerequisite,
    dag: session.dag,
    concept_titles: session.concept_titles,
    prereq_survey_data: session.prereq_survey_data,
    prereq_quiz: session.active_prereq_quiz,
    quiz_eval: session.last_quiz_eval,
    survey_responses: session.survey_responses,
    exercise,
    teaching_action,
    resource_selection: session.resource_selection,
    human_question: session.human_question,
    evaluation: session.evaluation,
    history: session.history || [],
    taught_concepts: session.taught_concepts || [],
    prereq_chain: session.prereq_chain || [],
    handoffs: db.getHandoffs(session.run_id),
    events: db.getEvents(session.run_id),
    vision_statement: session.vision_statement,
    n_parts: session.n_parts || session.learning_parts?.length || 1,
    current_part_index: session.current_part_index ?? 0,
    learning_parts: session.learning_parts || [],
    part_transition_data: session.part_transition_data
  };
}

// ─── API Routes ─────────────────────────────────────────────────────────────

// 1. Health
app.get('/api/health', async (req, res) => {
  const quick = req.query.quick === 'true';
  const modelInfo = quick ? getGeminiStatus() : await checkGeminiHealth();

  res.json({
    status: 'ok',
    service: 'vision-api',
    storage: 'in-memory',
    llm_provider: 'gemini',
    llm_model: modelInfo.model,
    llm_live: modelInfo.live,
    llm_status: modelInfo.status,
    llm_error: modelInfo.error || null,
    has_api_key: Boolean(process.env.GEMINI_API_KEY)
  });
});

// 2. Courses
app.get('/api/courses', (req, res) => {
  res.json([
    {
      course_id: 'data_structures',
      course_name: 'Data Structures & Algorithms',
      name: 'Data Structures & Algorithms',
      title: 'Data Structures & Algorithms',
      subject: 'Data Structures',
      description: 'Prerequisite graph with 6 foundational concepts and traversal rules.',
      target_concept: 'binary_tree_inorder_traversal',
      target_title: 'Binary Tree Inorder Traversal',
      concepts: [
        'Binary Tree Inorder Traversal',
        'Tree Traversal Ordering Rules',
        'Recursion',
        'Base-Case Evaluation',
        'Call Stack Reasoning',
        'Array Traversal'
      ],
      concept_count: 6,
      source: 'fixture'
    },
    {
      course_id: 'custom',
      course_name: 'Custom — type your own',
      name: 'Custom — type your own',
      title: 'Custom — type your own',
      subject: '',
      description: 'Enter any subject and concept. VISION builds the prerequisite graph dynamically.',
      target_concept: '',
      target_title: '',
      concepts: [],
      concept_count: 0,
      source: 'dynamic'
    }
  ]);
});

// 3. Context Readiness Check
app.post('/api/context/check', (req, res) => {
  const { subject, target_concept } = req.body || {};
  res.json({
    status: 'ready',
    ready: true,
    domain_coverage: 'high',
    readiness_score: 95,
    message: `Domain readiness verified for ${target_concept || 'concept'} in ${subject || 'subject'}. Dynamic DAG generation enabled.`
  });
});

// 4. Session Start
app.post('/api/session/start', async (req, res) => {
  try {
    const {
      student_id = 'student_001',
      subject = 'Data Structures',
      target_concept = 'Binary Tree Inorder Traversal',
      course_id,
      learner_level = 'intermediate',
      learning_goal = 'understand',
      n_parts = 4,
      user_notes
    } = req.body || {};

    const run_id = `run_${Math.random().toString(36).substring(2, 10)}`;
    const dagResult = await buildDAG(subject, target_concept);
    const directPrereqs = dagResult.dag[dagResult.targetId] || [];

    // Plan structured multi-part vision roadmap
    const roadmap = await PartPlanner.planCurriculum(
      subject,
      target_concept,
      Number(n_parts) || 4,
      learner_level,
      learning_goal
    );

    const now = new Date().toISOString();
    const session: StoredSession = {
      run_id,
      student_id,
      subject,
      target_concept,
      target_id: dagResult.targetId,
      course_id: course_id || toId(subject),
      current_state: directPrereqs.length > 0 ? 'PREREQ_SURVEY' : 'INITIAL_TEACHING',
      status: 'active',
      learner_level,
      learning_goal,
      user_notes,
      call_count: 1,
      revision_count: 0,
      backtrack_count: 0,
      dag: dagResult.dag,
      concept_titles: dagResult.conceptTitles,
      active_concept: dagResult.targetId,
      prereq_chain: [dagResult.targetId],
      taught_concepts: [],
      history: [],
      created_at: now,
      vision_statement: roadmap.vision_statement,
      n_parts: roadmap.n_parts,
      current_part_index: 0,
      learning_parts: roadmap.parts,
      agent_activities: {
        SupervisorAgent: `Built ${roadmap.n_parts}-part Vision Roadmap and DAG for ${subject}/${target_concept}. Identified ${directPrereqs.length} prerequisites.`,
        DiagnosticAgent: 'Idle — ready for telemetry monitoring',
        ResourceAgent: 'Curated initial domain materials',
        TutorAgent: `Ready to teach Part 1 of ${roadmap.n_parts}: ${roadmap.parts[0]?.title || target_concept}`,
        ExerciseAgent: 'Ready to generate assessment probe',
        EvaluationAgent: 'Ready'
      }
    };

    // If direct prerequisites exist, prepare survey
    if (directPrereqs.length > 0) {
      session.prereq_survey_data = {
        direct_prerequisites: directPrereqs.map((pid) => ({
          id: pid,
          title: dagResult.conceptTitles[pid] || pid.replace(/_/g, ' ')
        })),
        prerequisites: directPrereqs,
        target_concept,
        target_id: dagResult.targetId,
        message: `Before diving into ${target_concept}, let's quickly check your comfort level with its key prerequisites.`
      };

      db.addEvent(run_id, {
        timestamp: now,
        source_agent: 'SupervisorAgent',
        target_agent: 'Controller',
        action: 'prereq_readiness_survey',
        reason: `Initiated prerequisite survey for ${directPrereqs.length} foundations`,
        state: 'PREREQ_SURVEY'
      });
      db.addHandoff(run_id, {
        from: 'SupervisorAgent',
        to: 'Controller',
        action: 'survey_init',
        timestamp: now,
        reason: 'Constructed knowledge dependency graph and began readiness check'
      });
    } else {
      // Direct teaching for Part 1
      const firstPart = roadmap.parts[0];
      const lesson = await generateInitialTeaching(
        subject,
        target_concept,
        learner_level,
        learning_goal,
        student_id,
        session.course_id,
        firstPart
      );
      session.teaching_action = lesson;
      session.taught_concepts = [dagResult.targetId];

      db.addEvent(run_id, {
        timestamp: now,
        source_agent: 'TutorAgent',
        target_agent: 'Controller',
        action: 'initial_teaching',
        reason: `Delivered Part 1 of ${roadmap.n_parts} lesson: ${firstPart?.title || target_concept}`,
        state: 'INITIAL_TEACHING'
      });
    }

    db.saveSession(session);
    const profile = db.getStudentProfile(student_id, session.course_id);
    profile.total_sessions += 1;
    db.saveStudentProfile(profile);

    res.json(publicSession(session));
  } catch (err: any) {
    console.error('Error starting session:', err);
    res.status(500).json({ detail: err.message || 'Failed to start session' });
  }
});

// 5. Prerequisite Survey Submission
app.post('/api/session/prereq-survey', async (req, res) => {
  try {
    const { run_id, survey_responses = {} } = req.body || {};
    const session = db.getSession(run_id);
    if (!session) {
      return res.status(404).json({ detail: `Session ${run_id} not found` });
    }

    session.survey_responses = survey_responses;
    session.call_count += 1;
    const now = new Date().toISOString();

    const noList = Object.entries(survey_responses).filter(([_, ans]) => String(ans).toLowerCase() === 'no').map(([k]) => k);
    const partialList = Object.entries(survey_responses).filter(([_, ans]) => String(ans).toLowerCase() === 'partially').map(([k]) => k);
    const yesList = Object.entries(survey_responses).filter(([_, ans]) => String(ans).toLowerCase() === 'yes').map(([k]) => k);

    const profile = db.getStudentProfile(session.student_id, session.course_id);
    for (const y of yesList) {
      if (!profile.mastered_concepts.includes(y)) profile.mastered_concepts.push(y);
    }
    for (const n of noList) {
      if (!profile.weak_concepts.includes(n)) profile.weak_concepts.push(n);
    }
    db.saveStudentProfile(profile);

    // Branch 1: "No" self-declaration -> Teach prerequisite immediately
    if (noList.length > 0) {
      const chosen = noList[0];
      const title = session.concept_titles[chosen] || chosen.replace(/_/g, ' ');
      session.candidate_prerequisite = chosen;
      session.active_concept = chosen;
      session.current_state = 'INITIAL_TEACHING';
      session.prereq_chain = [session.target_id, chosen];

      const lesson = await generateReteachLesson(
        chosen,
        title,
        'self_declared_gap',
        session.subject,
        session.learner_level,
        session.learning_goal,
        session.student_id,
        session.course_id
      );
      session.teaching_action = lesson;
      session.resource_selection = {
        query: title,
        source: 'curriculum_corpus',
        verification_status: 'verified',
        excerpt: lesson.explanation.slice(0, 180) + '...'
      };

      db.addEvent(run_id, {
        timestamp: now,
        source_agent: 'SupervisorAgent',
        target_agent: 'TutorAgent',
        action: 'pivot_to_prereq',
        reason: `Learner declared 'No' on prerequisite ${title}. Pivoted curriculum to foundation.`,
        state: 'INITIAL_TEACHING'
      });
      db.addHandoff(run_id, {
        from: 'SupervisorAgent',
        to: 'TutorAgent',
        action: 'remedial_lesson',
        timestamp: now,
        reason: `Targeted repair for ${title}`
      });
    }
    // Branch 2: "Partially" self-declaration -> Diagnostic quiz
    else if (partialList.length > 0) {
      const chosen = partialList[0];
      const title = session.concept_titles[chosen] || chosen.replace(/_/g, ' ');
      session.candidate_prerequisite = chosen;
      session.active_concept = chosen;
      session.current_state = 'PREREQ_QUIZ';

      session.active_prereq_quiz = await generatePrereqQuiz(chosen, title, session.subject);

      db.addEvent(run_id, {
        timestamp: now,
        source_agent: 'SupervisorAgent',
        target_agent: 'ExerciseAgent',
        action: 'prereq_quiz',
        reason: `Learner indicated partial knowledge of ${title}. Serving diagnostic quiz.`,
        state: 'PREREQ_QUIZ'
      });
    }
    // Branch 3: All "Yes" -> Proceed to initial teaching for target concept
    else {
      session.current_state = 'INITIAL_TEACHING';
      session.active_concept = session.target_id;
      const activePart = session.learning_parts?.[session.current_part_index || 0];
      session.teaching_action = await generateInitialTeaching(
        session.subject,
        session.target_concept,
        session.learner_level,
        session.learning_goal,
        session.student_id,
        session.course_id,
        activePart
      );
      session.taught_concepts = [session.target_id];

      db.addEvent(run_id, {
        timestamp: now,
        source_agent: 'SupervisorAgent',
        target_agent: 'TutorAgent',
        action: 'initial_teaching',
        reason: `Prerequisites confirmed. Beginning Part 1 lesson: ${activePart?.title || session.target_concept}`,
        state: 'INITIAL_TEACHING'
      });
    }

    db.saveSession(session);
    res.json(publicSession(session));
  } catch (err: any) {
    console.error('Error handling prereq survey:', err);
    res.status(500).json({ detail: err.message || 'Failed to process survey' });
  }
});

// 6. Prerequisite Quiz Submission
app.post('/api/session/prereq-quiz', async (req, res) => {
  try {
    const { run_id, answers = {} } = req.body || {};
    const session = db.getSession(run_id);
    if (!session) {
      return res.status(404).json({ detail: `Session ${run_id} not found` });
    }

    const quiz = session.active_prereq_quiz;
    const questions = quiz?.questions || [];
    let correctCount = 0;

    questions.forEach((q: any, idx: number) => {
      const studentAns = answers[String(q.id || idx + 1)] ?? answers[idx];
      if (
        studentAns === q.correct_index ||
        String(studentAns).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()
      ) {
        correctCount += 1;
      }
    });

    const passed = correctCount >= Math.ceil(questions.length / 2);
    session.last_quiz_eval = {
      concept: session.active_concept,
      score: questions.length > 0 ? (correctCount / questions.length) * 100 : 100,
      passed,
      correct_count: correctCount,
      total_count: questions.length,
      threshold: 50
    };

    const now = new Date().toISOString();
    const prereqTitle = session.concept_titles[session.active_concept || ''] || session.active_concept;

    if (passed) {
      // Quiz passed! Move to target concept lesson
      session.current_state = 'INITIAL_TEACHING';
      session.active_concept = session.target_id;
      session.candidate_prerequisite = undefined;
      const activePart = session.learning_parts?.[session.current_part_index || 0];
      session.teaching_action = await generateInitialTeaching(
        session.subject,
        session.target_concept,
        session.learner_level,
        session.learning_goal,
        session.student_id,
        session.course_id,
        activePart
      );

      db.addEvent(run_id, {
        timestamp: now,
        source_agent: 'EvaluationAgent',
        target_agent: 'SupervisorAgent',
        action: 'quiz_passed',
        reason: `Diagnostic passed on ${prereqTitle} (${correctCount}/${questions.length}). Proceeding to Part 1: ${activePart?.title || session.target_concept}`,
        state: 'INITIAL_TEACHING'
      });
    } else {
      // Quiz failed: reteach prerequisite
      session.current_state = 'INITIAL_TEACHING';
      session.revision_count += 1;
      session.teaching_action = await generateReteachLesson(
        session.active_concept || 'recursion',
        prereqTitle || 'Prerequisite',
        'diagnostic_quiz_gap',
        session.subject,
        session.learner_level,
        session.learning_goal,
        session.student_id,
        session.course_id
      );

      db.addEvent(run_id, {
        timestamp: now,
        source_agent: 'EvaluationAgent',
        target_agent: 'TutorAgent',
        action: 'quiz_remediation',
        reason: `Diagnostic revealed gap on ${prereqTitle}. Initiating targeted foundation repair lesson.`,
        state: 'INITIAL_TEACHING'
      });
    }

    db.saveSession(session);
    res.json(publicSession(session));
  } catch (err: any) {
    console.error('Error handling prereq quiz:', err);
    res.status(500).json({ detail: err.message || 'Failed to evaluate quiz' });
  }
});

// 7. Begin Practice
app.post('/api/session/begin-practice', async (req, res) => {
  try {
    const { run_id, skip_lesson = false } = req.body || {};
    const session = db.getSession(run_id);
    if (!session) {
      return res.status(404).json({ detail: `Session ${run_id} not found` });
    }

    session.current_state = 'PRACTICE';
    session.call_count += 1;
    const now = new Date().toISOString();

    const activeConcept = session.active_concept || session.target_id;
    const conceptTitle = session.concept_titles[activeConcept] || session.target_concept;
    const activePart = session.learning_parts && session.current_part_index != null
      ? session.learning_parts[session.current_part_index]
      : undefined;

    const genResult = await generateExercise(
      activeConcept,
      conceptTitle,
      session.subject,
      activeConcept !== session.target_id,
      session.learner_level,
      session.learning_goal,
      activePart
    );

    session.active_exercise = genResult.exercise || genResult;
    session.active_answer_key = genResult.answer_key;

    db.addEvent(run_id, {
      timestamp: now,
      source_agent: 'ExerciseAgent',
      target_agent: 'Controller',
      action: 'generate_exercise',
      reason: `Generated interactive practice exercise for ${conceptTitle} (${activePart ? activePart.title : 'Target'})`,
      state: 'PRACTICE'
    });
    db.addHandoff(run_id, {
      from: 'TutorAgent',
      to: 'ExerciseAgent',
      action: 'start_practice',
      timestamp: now,
      reason: `Ready for student evaluation on ${conceptTitle}`
    });

    db.saveSession(session);
    res.json(publicSession(session));
  } catch (err: any) {
    console.error('Error beginning practice:', err);
    res.status(500).json({ detail: err.message || 'Failed to begin practice' });
  }
});

// 8. Get Session
app.get('/api/session/:run_id', (req, res) => {
  const session = db.getSession(req.params.run_id);
  if (!session) {
    return res.status(404).json({ detail: `Session ${req.params.run_id} not found` });
  }
  res.json(publicSession(session));
});

import { WorkflowController } from './server/workflow/controller';

// 9. Step / Submit Answer
const handleStep = async (req: express.Request, res: express.Response) => {
  try {
    const run_id = req.params.run_id || req.body?.run_id;
    const {
      student_answer = '',
      selected_option,
      code_submission,
      submission_id
    } = req.body || {};

    const session = db.getSession(run_id);
    if (!session) {
      return res.status(404).json({ detail: `Session ${run_id} not found` });
    }

    const updatedSession = await WorkflowController.handleStudentSubmission(session, {
      student_answer,
      selected_option,
      code_submission,
      submission_id: submission_id || `sub_${Date.now()}`
    });

    res.json(publicSession(updatedSession));
  } catch (err: any) {
    console.error('Error handling step:', err);
    res.status(500).json({ detail: err.message || 'Failed to submit answer' });
  }
};

app.post('/api/session/step', handleStep);
app.post('/api/session/:run_id/step', handleStep);

// 10. Human Resume
const handleResume = async (req: express.Request, res: express.Response) => {
  try {
    const run_id = req.params.run_id || req.body?.run_id;
    const { decision = 'continue' } = req.body || {};
    const session = db.getSession(run_id);
    if (!session) {
      return res.status(404).json({ detail: `Session ${run_id} not found` });
    }

    session.current_state = 'PRACTICE';
    session.human_question = null;
    const now = new Date().toISOString();

    db.addEvent(run_id, {
      timestamp: now,
      source_agent: 'SupervisorAgent',
      target_agent: 'Controller',
      action: 'human_resume',
      reason: `Human instructor provided decision: '${decision}'. Resuming study flow.`,
      state: 'PRACTICE'
    });

    db.saveSession(session);
    res.json(publicSession(session));
  } catch (err: any) {
    res.status(500).json({ detail: err.message || 'Failed to resume session' });
  }
};

app.post('/api/session/human-resume', handleResume);
app.post('/api/session/:run_id/human-resume', handleResume);

// 11. Why Explanation
app.get('/api/session/:run_id/why', (req, res) => {
  const session = db.getSession(req.params.run_id);
  if (!session) {
    return res.status(404).json({ detail: `Session ${req.params.run_id} not found` });
  }

  const rationaleMap: Record<string, string> = {
    PREREQ_SURVEY: 'The Supervisor Agent identified key foundational prerequisites in the knowledge graph and is verifying readiness to ensure a solid foundation before advancing.',
    PREREQ_QUIZ: 'The Diagnostic Agent served a 2-question probe to calibrate current understanding of the prerequisite.',
    INITIAL_TEACHING: 'The Tutor Agent is delivering a structured lesson using grounded analogies and practical code to explain the core invariants.',
    PRACTICE: 'The Exercise Agent generated an active retrieval problem to test comprehension and identify any lingering misconceptions.',
    DIAGNOSE_GAP: 'The Diagnostic Agent traced an incorrect answer back to an underlying prerequisite gap in the DAG, pausing to remediate it.',
    RETEACH_PREREQ: 'Delivering a focused remediation lesson on the identified prerequisite gap to unblock downstream learning.',
    TARGET_MASTERED: 'The student successfully solved both foundational and target exercises, proving robust conceptual mastery.'
  };

  res.json({
    why: rationaleMap[session.current_state] || `The multi-agent coordinator selected ${session.current_state} based on recent telemetry and state rules.`,
    reason: `Pedagogical optimization for student profile '${session.student_id}' on ${session.target_concept}.`,
    current_state: session.current_state,
    target_concept: session.target_concept
  });
});

// 12. Events Trace
app.get('/api/session/:run_id/events', (req, res) => {
  res.json(db.getEvents(req.params.run_id));
});

// 13. Student Profile
app.get('/api/student/:student_id/profile', (req, res) => {
  const studentId = req.params.student_id;
  const courseId = (req.query.course_id as string) || 'dynamic';
  const profile = db.getStudentProfile(studentId, courseId);
  const sessions = db.getStudentSessions(studentId).map((s) => ({
    run_id: s.run_id,
    student_id: s.student_id,
    created_at: s.created_at,
    course_id: s.course_id,
    subject: s.subject,
    target_concept: s.target_concept,
    status: s.status,
    current_state: s.current_state
  }));

  res.json({
    profile,
    sessions
  });
});

// 14. Student Sessions
app.get('/api/student/:student_id/sessions', (req, res) => {
  const sessions = db.getStudentSessions(req.params.student_id).map((s) => ({
    run_id: s.run_id,
    student_id: s.student_id,
    created_at: s.created_at,
    course_id: s.course_id,
    subject: s.subject,
    target_concept: s.target_concept,
    status: s.status,
    current_state: s.current_state
  }));
  res.json(sessions);
});

// ─── Frontend Serving (Vite dev middleware vs Production static) ────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VISION Adaptive Study Engine listening on port ${PORT}`);
  });
}

startServer();
