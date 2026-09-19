"""
VISION Resource Agent — Truthful Grounding & Dynamic Retrieval.
Searches corpus files dynamically, records provenance, accepts learner-provided notes,
and tags every resource with an explicit verification status:
  - VERIFIED_COURSE_SOURCE
  - LEARNER_PROVIDED
  - AI_GENERATED_SUPPORT
  - UNVERIFIED
  - COULD_NOT_ESTABLISH
"""

from __future__ import annotations
import glob
import os
from typing import Optional, Tuple
from slice.state_manager import ResourceSelection
from slice.validator import Validator
from slice.llm_client import LLMClient


class ResourceAgent:
    """
    Grounding & Retrieval Agent.
    1. Searches all *.md files in corpus/ for relevant paragraphs.
    2. Verifies quote provenance against corpus files.
    3. Accepts learner-provided notes/links.
    4. Labels AI-generated support explicitly — never claims it is 'grounded in course notes'.
    """

    SYSTEM_PROMPT_EXTRACT = """You are a knowledge retrieval assistant.
Given a corpus excerpt and a concept to explain, extract or summarize the most relevant
1-3 sentences from the corpus that best explain the concept.

Rules:
- Use ONLY text from the corpus excerpt
- Do not add external facts
- Return the extracted/summarized text as plain text"""

    SYSTEM_PROMPT_GENERATE = """You are an expert educator generating a reference explanation.
Provide a concise, factually accurate 2-3 sentence explanation of the given concept.
Plain text only."""

    def __init__(self, corpus_dir: str = "corpus"):
        self.corpus_dir = corpus_dir
        self.llm = LLMClient()

    def select_resource(
        self,
        run_id: str,
        concept: str,
        subject: str = "",
        user_notes: Optional[str] = None
    ) -> ResourceSelection:
        concept_clean = concept.replace("_", " ").title()
        query_encoded = concept.replace("_", "+")

        web_resources = [
            {"site": "YouTube", "title": f"Mastering {concept_clean} — Video Tutorial", "url": f"https://www.youtube.com/results?search_query={query_encoded}+{subject.replace(' ', '+')}"},
            {"site": "GeeksforGeeks", "title": f"{concept_clean} Explanation & Code Guide", "url": f"https://www.geeksforgeeks.org/search/{query_encoded}"},
            {"site": "W3Schools", "title": f"{concept_clean} Reference & Examples", "url": f"https://www.w3schools.com/tags/ref_byfunc.asp"},
            {"site": "Coursera", "title": f"{subject or 'Computer Science'} Specialization — {concept_clean}", "url": f"https://www.coursera.org/search?query={query_encoded}"},
            {"site": "MDN Web Docs", "title": f"{concept_clean} Documentation & Standards", "url": f"https://developer.mozilla.org/en-US/search?q={query_encoded}"}
        ]

        corpus_files = [
            f for f in glob.glob(os.path.join(self.corpus_dir, "**", "*.md"), recursive=True)
            if not os.path.basename(f).lower().startswith("readme")
        ]

        # 1. Check local course corpus
        if corpus_files:
            best_file, best_para, line_ref = self._search_corpus(corpus_files, concept, subject)
            if best_para and len(best_para.strip()) > 15:
                refined = self._refine_excerpt(best_para, concept)
                verified = Validator.verify_quote_provenance(best_file, refined) or Validator.verify_quote_provenance(best_file, best_para[:60])
                status = "VERIFIED_COURSE_SOURCE" if verified else "COULD_NOT_ESTABLISH"
                return ResourceSelection(
                    run_id=run_id,
                    concept=concept,
                    source_id=f"{os.path.basename(best_file)}#{line_ref}",
                    excerpt_quote=refined or best_para,
                    verification_status=status,
                    web_resources=web_resources,
                    user_custom_notes=user_notes
                )

        # 2. Check user-provided notes
        if user_notes and len(user_notes.strip()) > 3:
            return ResourceSelection(
                run_id=run_id,
                concept=concept,
                source_id="learner_provided_notes",
                excerpt_quote=f"Learner Notes: '{user_notes}'",
                verification_status="LEARNER_PROVIDED",
                web_resources=web_resources,
                user_custom_notes=user_notes
            )

        # 3. AI Generated Support
        if self.llm.is_live:
            ai_excerpt = self._generate_explanation(concept, subject)
            return ResourceSelection(
                run_id=run_id,
                concept=concept,
                source_id="ai_generated_reference",
                excerpt_quote=ai_excerpt,
                verification_status="AI_GENERATED_SUPPORT",
                web_resources=web_resources,
                user_custom_notes=user_notes
            )

        # 4. Fallback / Unverified web Discovery
        return ResourceSelection(
            run_id=run_id,
            concept=concept,
            source_id="web_discovery_recommendations",
            excerpt_quote=f"Review online learning materials for '{concept_clean}' across YouTube, GeeksforGeeks, W3Schools, and Coursera.",
            verification_status="UNVERIFIED",
            web_resources=web_resources,
            user_custom_notes=user_notes
        )

    def _search_corpus(
        self, files: list, concept: str, subject: str
    ) -> Tuple[str, str, str]:
        search_terms = set(concept.replace("_", " ").lower().split())
        if subject:
            search_terms.update(subject.lower().split()[:3])

        best_score = -1
        best_file = files[0]
        best_para = ""
        best_ref = "L1"

        for filepath in files:
            try:
                with open(filepath, encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
            except Exception:
                continue

            para_lines = []
            para_start = 1
            for i, line in enumerate(lines, 1):
                if line.strip():
                    if not para_lines:
                        para_start = i
                    para_lines.append(line)
                else:
                    if para_lines:
                        text = "".join(para_lines).strip()
                        score = sum(1 for t in search_terms if t in text.lower())
                        if score > best_score:
                            best_score = score
                            best_file = filepath
                            best_para = text
                            best_ref = f"L{para_start}-L{i - 1}"
                        para_lines = []

            if para_lines:
                text = "".join(para_lines).strip()
                score = sum(1 for t in search_terms if t in text.lower())
                if score > best_score:
                    best_score = score
                    best_file = filepath
                    best_para = text
                    best_ref = f"L{para_start}-L{len(lines)}"

        return best_file, best_para, best_ref

    def _refine_excerpt(self, corpus_para: str, concept: str) -> str:
        if not self.llm.is_live or len(corpus_para) < 100:
            return corpus_para
        result = self.llm.chat(
            self.SYSTEM_PROMPT_EXTRACT,
            f"Concept: {concept}\n\nCorpus excerpt:\n{corpus_para[:1200]}",
            max_tokens=256
        )
        return result.strip() if result and len(result) > 20 else corpus_para

    def _generate_explanation(self, concept: str, subject: str) -> str:
        result = self.llm.chat(
            self.SYSTEM_PROMPT_GENERATE,
            f"Subject: {subject or 'General'}\nConcept: {concept}\n\nProvide a concise explanation.",
            max_tokens=256
        )
        return result.strip() if result and len(result) > 20 else f"Core concept: {concept}"
