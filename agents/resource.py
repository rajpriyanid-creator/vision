import os
import glob
from typing import Optional, List, Dict, Tuple
from slice.state_manager import ResourceSelection
from slice.validator import Validator
from slice.llm_client import UnifiedLLMClient

class ResourceAgent:
    """Dynamic RAG & Grounding Agent — Searches approved course corpus markdown files for verbatim quotes."""

    def __init__(self, corpus_dir: str = "corpus", provider: Optional[str] = None):
        self.corpus_dir = corpus_dir
        self.llm = UnifiedLLMClient(provider=provider)

    def select_resource(self, run_id: str, concept: str) -> ResourceSelection:
        """Dynamically indexes corpus files, searches for relevant content, and extracts exact verbatim quote."""
        corpus_files = glob.glob(os.path.join(self.corpus_dir, "*.md"))
        # Exclude README.md if present
        corpus_files = [f for f in corpus_files if not f.endswith("README.md")]

        if not corpus_files:
            return ResourceSelection(
                run_id=run_id,
                concept=concept,
                source_id="none",
                excerpt_quote=f"No approved corpus files found in {self.corpus_dir}.",
                verification_status="could_not_establish"
            )

        best_file, best_quote, line_ref = self._dynamic_corpus_search(corpus_files, concept)

        # Verify provenance using Validator
        verified = Validator.verify_quote_provenance(best_file, best_quote)
        status = "verified" if verified else "could_not_establish"

        rel_path = os.path.basename(best_file)
        source_id = f"{rel_path}#{line_ref}"

        return ResourceSelection(
            run_id=run_id,
            concept=concept,
            source_id=source_id,
            excerpt_quote=best_quote,
            verification_status=status
        )

    def _dynamic_corpus_search(self, corpus_files: List[str], concept: str) -> Tuple[str, str, str]:
        """Scans corpus files for matching concept lines/paragraphs."""
        search_terms = concept.replace("_", " ").lower().split()

        best_score = -1
        best_file = corpus_files[0]
        best_quote = ""
        best_line_start = 1
        best_line_end = 1

        for filepath in corpus_files:
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.readlines()

            # Group into paragraphs
            paragraph = []
            para_start_line = 1
            for idx, line in enumerate(lines, 1):
                if line.strip():
                    if not paragraph:
                        para_start_line = idx
                    paragraph.append(line)
                else:
                    if paragraph:
                        text = "".join(paragraph)
                        score = sum(1 for term in search_terms if term in text.lower())
                        if score > best_score:
                            best_score = score
                            best_file = filepath
                            best_quote = text.strip()
                            best_line_start = para_start_line
                            best_line_end = idx - 1
                        paragraph = []

            if paragraph:
                text = "".join(paragraph)
                score = sum(1 for term in search_terms if term in text.lower())
                if score > best_score:
                    best_score = score
                    best_file = filepath
                    best_quote = text.strip()
                    best_line_start = para_start_line
                    best_line_end = len(lines)

        if not best_quote:
            best_quote = f"Course notes covering {concept}."

        # Keep quote concise (max 3 sentences)
        sentences = best_quote.split(". ")
        if len(sentences) > 3:
            best_quote = ". ".join(sentences[:3]) + "."

        line_ref = f"L{best_line_start}-L{best_line_end}"
        return best_file, best_quote, line_ref
