import os
import json
from typing import Dict, List, Tuple

class Validator:
    """Validator for Prerequisite Graph Edges, Provenance Quote Verification, and Resource Cross-Checking."""

    @staticmethod
    def validate_prerequisite_edge(dependency_graph: Dict[str, List[str]], target_concept: str, candidate_prerequisite: str) -> bool:
        """Checks if candidate_prerequisite is a valid prerequisite of target_concept in the DAG."""
        valid_prereqs = dependency_graph.get(target_concept, [])
        return candidate_prerequisite in valid_prereqs

    @staticmethod
    def verify_quote_provenance(corpus_filepath: str, excerpt_quote: str) -> bool:
        """Verifies that excerpt_quote is an exact or normalized substring of approved material."""
        if not os.path.exists(corpus_filepath):
            return False
        
        with open(corpus_filepath, "r", encoding="utf-8") as f:
            corpus_text = f.read()

        # Check exact match
        if excerpt_quote.strip() in corpus_text:
            return True

        # Check normalized match (collapsing whitespace/newlines)
        norm_quote = " ".join(excerpt_quote.strip().split())
        norm_corpus = " ".join(corpus_text.split())
        return norm_quote in norm_corpus

    @staticmethod
    def verify_resource_cross_check(concept_needed: str, excerpt_quote: str) -> Tuple[bool, str]:
        """Cross-checks whether retrieved evidence excerpt is relevant to the prerequisite concept needed."""
        # Simple string/keyword cross-check
        normalized_concept = concept_needed.replace("_", " ").lower()
        normalized_quote = excerpt_quote.lower()

        # Key concept tokens
        tokens = [t for t in normalized_concept.split() if len(t) > 2]
        matches = sum(1 for token in tokens if token in normalized_quote)

        if len(tokens) == 0 or (matches / len(tokens)) >= 0.5:
            return True, "verified"
        return False, "off_target"
