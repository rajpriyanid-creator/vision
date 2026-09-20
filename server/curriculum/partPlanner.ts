import { GoogleGenAI } from '@google/genai';
import { toId } from '../engine';

export interface LearningPart {
  part_number: number;
  id: string;
  title: string;
  subtitle: string;
  objective: string;
  key_focus_areas: string[];
  cognitive_demand: string;
  status: 'upcoming' | 'in_progress' | 'repairing' | 'mastered';
  evaluations_count: number;
  mastery_score?: number;
  demonstrated_at?: string;
}

export interface VisionRoadmapPlan {
  target_concept: string;
  subject: string;
  vision_statement: string;
  n_parts: number;
  estimated_duration_mins: number;
  parts: LearningPart[];
}

export class PartPlanner {
  private static getAI(): GoogleGenAI | null {
    if (!process.env.GEMINI_API_KEY) return null;
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  /**
   * Generates a structured N-part learning roadmap with a clear vision
   * for mastering the target concept.
   */
  static async planCurriculum(
    subject: string,
    targetConcept: string,
    nParts = 4,
    learnerLevel = 'intermediate',
    learningGoal = 'understand'
  ): Promise<VisionRoadmapPlan> {
    const totalParts = Math.min(Math.max(Number(nParts) || 4, 2), 6);
    const ai = this.getAI();

    if (ai) {
      try {
        const prompt = `You are the Master Curriculum Architect for an advanced adaptive learning engine called VISION.
The student wants to master: "${targetConcept}" in the subject "${subject}".
Learner Level: ${learnerLevel}
Learning Goal: ${learningGoal}

Partition this learning journey into exactly ${totalParts} logical, sequential, progressive parts (Part 1 to Part ${totalParts}).
Each part must have:
1. title: Concise, clear module title (e.g., "Foundations & Mental Model", "Core State Mechanics & Operations", "Algorithmic Tracing & Edge Cases", "Applied Synthesis & Problem Solving")
2. subtitle: 1-line summary of the core mechanism
3. objective: 1 clear, actionable learning milestone the learner will master in this part
4. key_focus_areas: 3 specific concepts/skills tested in this part
5. cognitive_demand: One of ["Knowledge & Intuition", "Application & Procedural", "Analysis & Edge Cases", "Synthesis & Evaluation"]

Also provide:
- vision_statement: A crystal-clear 2-3 sentence overarching vision of what full mastery of ${targetConcept} entails and why these ${totalParts} parts lead to mastery.
- estimated_duration_mins: Total estimated minutes (e.g., ${totalParts * 5})

Return strictly valid JSON:
{
  "vision_statement": "string",
  "estimated_duration_mins": number,
  "parts": [
    {
      "part_number": 1,
      "id": "part_1_...",
      "title": "...",
      "subtitle": "...",
      "objective": "...",
      "key_focus_areas": ["...", "...", "..."],
      "cognitive_demand": "..."
    }
  ]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        const raw = response.text ? JSON.parse(response.text) : null;
        if (raw && Array.isArray(raw.parts) && raw.parts.length > 0) {
          const formattedParts: LearningPart[] = raw.parts.map((p: any, idx: number) => ({
            part_number: idx + 1,
            id: p.id || `part_${idx + 1}_${toId(p.title || 'module')}`,
            title: p.title || `Part ${idx + 1}: Core Concepts`,
            subtitle: p.subtitle || `Mastering core invariants of ${targetConcept}`,
            objective: p.objective || `Understand and demonstrate mastery of Part ${idx + 1}`,
            key_focus_areas: Array.isArray(p.key_focus_areas) ? p.key_focus_areas : [targetConcept],
            cognitive_demand: p.cognitive_demand || 'Application',
            status: idx === 0 ? 'in_progress' : 'upcoming',
            evaluations_count: 0
          }));

          return {
            target_concept: targetConcept,
            subject,
            vision_statement:
              raw.vision_statement ||
              `Attain complete conceptual, operational, and algorithmic mastery of ${targetConcept} through ${totalParts} progressive milestones.`,
            n_parts: formattedParts.length,
            estimated_duration_mins: raw.estimated_duration_mins || totalParts * 5,
            parts: formattedParts
          };
        }
      } catch (err) {
        console.warn('AI part planner fallback:', err);
      }
    }

    // Deterministic fallback generator
    return this.generateDefaultRoadmap(subject, targetConcept, totalParts);
  }

  /**
   * Deterministic domain-tailored default roadmap
   */
  private static generateDefaultRoadmap(
    subject: string,
    targetConcept: string,
    nParts: number
  ): VisionRoadmapPlan {
    const norm = targetConcept.toLowerCase();

    // Specific templates for common computer science concepts
    if (norm.includes('stack') || norm.includes('lifo')) {
      const allParts: LearningPart[] = [
        {
          part_number: 1,
          id: 'part_1_stack_foundations',
          title: 'Foundations & LIFO Mental Model',
          subtitle: 'Single-ended access discipline and architectural invariants',
          objective: 'Understand why stacks enforce Last-In First-Out (LIFO) order and identify O(1) top-pointer constraints.',
          key_focus_areas: ['LIFO access principle', 'Top pointer mechanics', 'Constant time O(1) guarantees'],
          cognitive_demand: 'Knowledge & Intuition',
          status: 'in_progress',
          evaluations_count: 0
        },
        {
          part_number: 2,
          id: 'part_2_stack_operations',
          title: 'Core Operations & State Transitions',
          subtitle: 'Sequential Push, Pop, and Peek evaluation',
          objective: 'Accurately simulate state changes across multi-step push/pop operations without off-by-one errors.',
          key_focus_areas: ['Push / Pop sequential simulation', 'Peek non-mutating reads', 'Stack height & ordering'],
          cognitive_demand: 'Application & Procedural',
          status: 'upcoming',
          evaluations_count: 0
        },
        {
          part_number: 3,
          id: 'part_3_stack_edge_cases',
          title: 'Boundary Limits & Error Conditions',
          subtitle: 'Underflow, Overflow, and invariant preservation',
          objective: 'Identify and handle boundary edge conditions like popping an empty stack and capacity constraints.',
          key_focus_areas: ['Stack underflow prevention', 'Empty state predicates', 'Memory capacity bounds'],
          cognitive_demand: 'Analysis & Edge Cases',
          status: 'upcoming',
          evaluations_count: 0
        },
        {
          part_number: 4,
          id: 'part_4_stack_synthesis',
          title: 'Applied Synthesis & Algorithmic Parsing',
          subtitle: 'Balanced delimiters, call stacks, and expression evaluation',
          objective: 'Synthesize stack mechanics to solve balanced bracket validation and execution call-frame unwinding.',
          key_focus_areas: ['Balanced parenthesis matching', 'Call stack suspension/unwinding', 'Reverse-Polish evaluation'],
          cognitive_demand: 'Synthesis & Evaluation',
          status: 'upcoming',
          evaluations_count: 0
        }
      ];

      const parts = allParts.slice(0, nParts);
      // Re-number if truncated
      parts.forEach((p, i) => {
        p.part_number = i + 1;
        p.status = i === 0 ? 'in_progress' : 'upcoming';
      });

      return {
        target_concept: targetConcept,
        subject,
        vision_statement: `Build rigorous end-to-end mastery of the Stack data structure—from foundational LIFO memory mechanics and deterministic push/pop operations to boundary invariants and real-world bracket parsing.`,
        n_parts: parts.length,
        estimated_duration_mins: parts.length * 5,
        parts
      };
    }

    if (norm.includes('queue') || norm.includes('fifo')) {
      const allParts: LearningPart[] = [
        {
          part_number: 1,
          id: 'part_1_queue_foundations',
          title: 'Foundations & FIFO Mental Model',
          subtitle: 'Double-ended discipline: head departures and tail arrivals',
          objective: 'Understand First-In First-Out (FIFO) mechanics and the separation between front and rear pointers.',
          key_focus_areas: ['FIFO ordering discipline', 'Head vs Tail pointer separation', 'Deterministic arrival ordering'],
          cognitive_demand: 'Knowledge & Intuition',
          status: 'in_progress',
          evaluations_count: 0
        },
        {
          part_number: 2,
          id: 'part_2_queue_operations',
          title: 'Core Operations: Enqueue & Dequeue',
          subtitle: 'Deterministic state transitions and front element extraction',
          objective: 'Trace sequential enqueue and dequeue steps to determine exact queue contents at any timestamp.',
          key_focus_areas: ['Enqueue tail insertion', 'Dequeue front removal', 'Peek / Front reads'],
          cognitive_demand: 'Application & Procedural',
          status: 'upcoming',
          evaluations_count: 0
        },
        {
          part_number: 3,
          id: 'part_3_queue_edge_cases',
          title: 'Circular Buffers & Boundary Invariants',
          subtitle: 'Wrap-around modulo arithmetic and empty/full predicates',
          objective: 'Manage queue boundaries including underflow on empty dequeue and circular array index wrapping.',
          key_focus_areas: ['Circular index modulo math', 'Underflow detection', 'Fixed-size array utilization'],
          cognitive_demand: 'Analysis & Edge Cases',
          status: 'upcoming',
          evaluations_count: 0
        },
        {
          part_number: 4,
          id: 'part_4_queue_synthesis',
          title: 'Applied Synthesis & BFS Workflows',
          subtitle: 'Breadth-First Search level order traversal and job queues',
          objective: 'Apply queue mechanics to implement level-order graph traversals and asynchronous task buffers.',
          key_focus_areas: ['Breadth-First Search (BFS)', 'Job scheduling & spooling', 'Double-ended queue variations'],
          cognitive_demand: 'Synthesis & Evaluation',
          status: 'upcoming',
          evaluations_count: 0
        }
      ];

      const parts = allParts.slice(0, nParts);
      parts.forEach((p, i) => {
        p.part_number = i + 1;
        p.status = i === 0 ? 'in_progress' : 'upcoming';
      });

      return {
        target_concept: targetConcept,
        subject,
        vision_statement: `Master the Queue data structure across all operational dimensions: First-In First-Out principles, circular buffer index wrapping, and Breadth-First Search applications.`,
        n_parts: parts.length,
        estimated_duration_mins: parts.length * 5,
        parts
      };
    }

    if (norm.includes('tree') || norm.includes('inorder') || norm.includes('traversal')) {
      const allParts: LearningPart[] = [
        {
          part_number: 1,
          id: 'part_1_traversal_foundations',
          title: 'Recursive Traversal Discipline & Invariants',
          subtitle: 'Left -> Node -> Right sequence and base-case guarantees',
          objective: 'Master the recursive L-N-R invariant and understand why inorder traversal yields sorted keys on BSTs.',
          key_focus_areas: ['Left-Node-Right (LNR) ordering', 'Base-case null termination', 'BST sorted property'],
          cognitive_demand: 'Knowledge & Intuition',
          status: 'in_progress',
          evaluations_count: 0
        },
        {
          part_number: 2,
          id: 'part_2_traversal_mechanics',
          title: 'Call Stack Simulation & State Unwinding',
          subtitle: 'Frame suspension, return values, and sequential visitation',
          objective: 'Step through recursive invocation stacks to trace exactly when each node is added to the output list.',
          key_focus_areas: ['Call stack frame suspension', 'Post-return execution order', 'Exact visitation sequencing'],
          cognitive_demand: 'Application & Procedural',
          status: 'upcoming',
          evaluations_count: 0
        },
        {
          part_number: 3,
          id: 'part_3_traversal_edge_cases',
          title: 'Skewed Trees, Single-Child & Boundary Cases',
          subtitle: 'Handling degenerate linear trees, single nodes, and empty roots',
          objective: 'Analyze traversal behavior on skewed trees, missing branches, and leaf-only hierarchies.',
          key_focus_areas: ['Degenerate left/right skewed trees', 'Missing left or right subtrees', 'Single-node edge cases'],
          cognitive_demand: 'Analysis & Edge Cases',
          status: 'upcoming',
          evaluations_count: 0
        },
        {
          part_number: 4,
          id: 'part_4_traversal_synthesis',
          title: 'Iterative Implementation & Full Synthesis',
          subtitle: 'Explicit stack-based traversal and complex tree evaluations',
          objective: 'Synthesize recursive and iterative stack-based traversal algorithms for complex tree problems.',
          key_focus_areas: ['Iterative stack traversal', 'BST validation algorithms', 'Inorder successor finding'],
          cognitive_demand: 'Synthesis & Evaluation',
          status: 'upcoming',
          evaluations_count: 0
        }
      ];

      const parts = allParts.slice(0, nParts);
      parts.forEach((p, i) => {
        p.part_number = i + 1;
        p.status = i === 0 ? 'in_progress' : 'upcoming';
      });

      return {
        target_concept: targetConcept,
        subject,
        vision_statement: `Achieve complete mastery of Binary Tree Traversals, from core recursive ordering invariants to frame unwinding and iterative stack implementations.`,
        n_parts: parts.length,
        estimated_duration_mins: parts.length * 5,
        parts
      };
    }

    // Generic N-part template
    const titles = [
      { title: 'Foundations & Conceptual Mental Model', subtitle: `Core definitions and primary invariants of ${targetConcept}`, demand: 'Knowledge & Intuition' },
      { title: 'Core Operations & Step-by-Step Mechanics', subtitle: `Direct manipulation and procedural execution of ${targetConcept}`, demand: 'Application & Procedural' },
      { title: 'Algorithmic Tracing & Edge Cases', subtitle: `Boundary limits, invariant preservation, and failure modes`, demand: 'Analysis & Edge Cases' },
      { title: 'Applied Synthesis & Complex Problem Solving', subtitle: `Multi-step scenarios, real-world applications, and complete mastery`, demand: 'Synthesis & Evaluation' },
      { title: 'Deep Optimization & Advanced Invariants', subtitle: `Performance bounds, trade-offs, and advanced use cases`, demand: 'Synthesis & Evaluation' }
    ];

    const parts: LearningPart[] = [];
    for (let i = 0; i < nParts; i++) {
      const t = titles[i] || {
        title: `Part ${i + 1}: Advanced Mastery & Practice`,
        subtitle: `In-depth evaluation for ${targetConcept}`,
        demand: 'Synthesis & Evaluation'
      };
      parts.push({
        part_number: i + 1,
        id: `part_${i + 1}_${toId(t.title)}`,
        title: t.title,
        subtitle: t.subtitle,
        objective: `Demonstrate mastery of ${t.title.toLowerCase()} for ${targetConcept}.`,
        key_focus_areas: [`Core principle ${i + 1}`, `Operational rule ${i + 1}`, `Invariant verification`],
        cognitive_demand: t.demand,
        status: i === 0 ? 'in_progress' : 'upcoming',
        evaluations_count: 0
      });
    }

    return {
      target_concept: targetConcept,
      subject,
      vision_statement: `Systematically master ${targetConcept} in ${subject} through a structured ${nParts}-stage curriculum with continuous multi-agent instruction and automated evaluation.`,
      n_parts: nParts,
      estimated_duration_mins: nParts * 5,
      parts
    };
  }
}
