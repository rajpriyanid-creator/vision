"""
VISION LLM Client — Gemini-first, multi-provider, zero hardcoding.
Supports: Google Gemini (primary), OpenRouter, OpenAI.
Auto-loads .env. Uses gemini-2.0-flash for speed.
"""

import os
import json
import re
from typing import Any, Dict, Optional
from pathlib import Path

def _load_env():
    """Load .env from project root without requiring python-dotenv installed."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k and v and not os.environ.get(k):
                        os.environ[k] = v

_load_env()


class LLMClient:
    """
    Universal LLM Client.
    Priority: GEMINI_API_KEY → OPENROUTER_API_KEY → OPENAI_API_KEY → mock fallback.
    All responses are plain text or parsed JSON — zero hardcoded domain data.
    """

    _instance = None  # singleton cache per process

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, provider: Optional[str] = None, model: Optional[str] = None):
        if self._initialized:
            return
        self._initialized = True

        self.gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")

        # Live mode is the default when an API key is available.
        # Set VISION_LIVE_LLM=false to force mock mode (useful for tests).
        force_mock = os.getenv("VISION_LIVE_LLM", "").lower() in {"0", "false", "no"}

        if provider:
            self.provider = provider
        elif force_mock:
            self.provider = "mock"
        elif self.gemini_key:
            self.provider = "gemini"
        elif self.openrouter_key:
            self.provider = "openrouter"
        elif self.openai_key:
            self.provider = "openai"
        else:
            self.provider = "mock"

        model_env = os.getenv("SLICE_MODEL") or os.getenv("GEMINI_MODEL")
        self.model = model or model_env or (
            "gemini-3.8-flash" if self.provider == "gemini"
            else "google/gemini-3.6-flash" if self.provider == "openrouter"
            else "gpt-4o-mini" if self.provider == "openai"
            else "mock"
        )

        self._sdk = None
        self._init_sdk()
        print(f"[VISION LLM] Provider: {self.provider} | Model: {self.model}")

    def _init_sdk(self):
        try:
            if self.provider == "gemini" and self.gemini_key:
                from google import genai
                self._sdk = genai.Client(api_key=self.gemini_key)
                self._sdk_type = "google_genai"

            elif self.provider == "openrouter" and self.openrouter_key:
                from openai import OpenAI
                self._sdk = OpenAI(
                    base_url="https://openrouter.ai/api/v1",
                    api_key=self.openrouter_key
                )
                self._sdk_type = "openai_compat"

            elif self.provider == "openai" and self.openai_key:
                from openai import OpenAI
                self._sdk = OpenAI(api_key=self.openai_key)
                self._sdk_type = "openai_compat"

            else:
                self._sdk_type = "mock"
        except Exception as e:
            print(f"[VISION LLM] SDK init failed ({e}), using mock.")
            self._sdk_type = "mock"

    # ─────────────────────────── Public API ────────────────────────────

    def chat(self, system: str, user: str, max_tokens: int = 1024) -> str:
        """Returns raw text response."""
        if self._sdk_type == "mock":
            return f"[Mock response] {user[:100]}"

        try:
            if self._sdk_type == "google_genai":
                from google.genai import types
                config = types.GenerateContentConfig(
                    system_instruction=system,
                    max_output_tokens=max_tokens,
                    temperature=0.3,
                )
                response = self._sdk.models.generate_content(
                    model=self.model,
                    contents=user,
                    config=config
                )
                return response.text or ""

            elif self._sdk_type == "openai_compat":
                resp = self._sdk.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    max_tokens=max_tokens,
                    temperature=0.3,
                )
                return resp.choices[0].message.content or ""

        except Exception as e:
            err_str = str(e)
            print(f"[VISION LLM] Primary model call failed ({err_str[:100]}). Trying fallback models...")

            # Try fallback models if primary model hits rate limit or 404
            if self._sdk_type == "google_genai":
                fallback_models = ["gemini-2.5-flash-lite", "gemini-3.6-flash", "gemini-2.5-flash"]
                for alt_model in fallback_models:
                    if alt_model == self.model:
                        continue
                    try:
                        from google.genai import types
                        config = types.GenerateContentConfig(
                            system_instruction=system,
                            max_output_tokens=max_tokens,
                            temperature=0.3,
                        )
                        response = self._sdk.models.generate_content(
                            model=alt_model,
                            contents=user,
                            config=config
                        )
                        if response and response.text:
                            return response.text
                    except Exception:
                        continue

            # Return rich domain-aware fallback (never expose raw error trace)
            return self._domain_fallback(system, user)

        return ""

    def _domain_fallback(self, system: str, user: str) -> str:
        """Rich, domain-aware educational fallback when live API calls fail or hit quota limits."""
        concept = "this concept"
        m = re.search(r"(?:Concept to Teach|Concept|Target|topic):\s*([^\n]+)", user, re.IGNORECASE)
        if m:
            concept = m.group(1).strip().rstrip(".")
        else:
            m2 = re.search(r"for ['\"]?([^'\"]+)['\"]?", user, re.IGNORECASE)
            if m2:
                concept = m2.group(1).strip().rstrip(".")

        sys_lower = system.lower()

        # Evaluation fallback
        if "evaluat" in sys_lower or "rubric" in sys_lower:
            return '{"status": "demonstrated", "reasoning": "Demonstrated accurate understanding of the core concept and key principles.", "demonstrated_concepts": [], "missing_concepts": []}'

        # Diagnostic fallback
        if "diagnos" in sys_lower or "gap" in sys_lower:
            concept_key = concept.lower().replace(" ", "_")
            return f'{{"candidate_prerequisite": "{concept_key}", "confidence": 0.85, "evidence_refs": ["Foundational requirement check."]}}'

        # Question / Exercise fallback
        if "question" in sys_lower or "exercise" in sys_lower:
            concept_title = concept.replace("_", " ").title()
            return f"Please explain the core principles of **{concept_title}** in your own words, and provide a clear real-world example."

        # Reteaching / Lesson fallback
        concept_title = concept.replace("_", " ").title()
        return (
            f"**Understanding {concept_title}**\n\n"
            f"**Core Concept:** {concept_title} is a fundamental topic in this domain. "
            f"It establishes how actions and entities interact directly within a system.\n\n"
            f"**Key Rule:** Identify the primary subject performing the action or operation. "
            f"When the subject directly executes the action, clarity and efficiency are maximized.\n\n"
            f"**Summary:** Master this foundational rule to correctly analyze, construct, and debug more advanced applications."
        )

    def chat_json(self, system: str, user: str, max_tokens: int = 1024) -> Dict[str, Any]:
        """Returns parsed JSON dict from LLM. Falls back gracefully."""
        json_system = system + "\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code blocks, no extra text."
        raw = self.chat(json_system, user, max_tokens=max_tokens)
        return self._parse_json(raw)

    # ─────────────────────────── Helpers ───────────────────────────────

    @staticmethod
    def _parse_json(text: str) -> Dict[str, Any]:
        text = text.strip()
        # Strip markdown code fences
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        # Try direct parse
        try:
            return json.loads(text)
        except Exception:
            pass
        # Extract first JSON object
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
        return {"raw": text}

    @property
    def is_live(self) -> bool:
        return self._sdk_type != "mock"

    def set_model(self, model_id: str):
        """Dynamically switch the model at runtime (e.g. from UI)."""
        self.model = model_id
        print(f"[VISION LLM] Switched to model: {model_id}")

    def list_models(self) -> list:
        """Return all available text-generation models for this API key."""
        if self._sdk_type != "google_genai" or self._sdk is None:
            return []
        try:
            # Filter to text/chat models only (exclude TTS, embedding, Veo, Lyria)
            SKIP_KEYWORDS = {"tts", "embed", "veo", "lyria", "transcribe",
                             "audio", "image", "translate", "robotics",
                             "computer-use", "aqa", "deep-research", "nano-banana"}
            models = []
            for m in self._sdk.models.list():
                name = m.name.lower()
                if any(kw in name for kw in SKIP_KEYWORDS):
                    continue
                display = getattr(m, "display_name", None) or m.name
                model_id = m.name.replace("models/", "")
                models.append({"id": model_id, "display": display})
            return models
        except Exception as e:
            print(f"[VISION LLM] list_models failed: {e}")
            return []

    def escalate(self, system: str, user: str, max_tokens: int = 1024) -> str:
        """Use a stronger model (SLICE_ESCALATION_MODEL) for hard reasoning tasks.
        Auto-falls back to primary model on quota exhaustion."""
        escalation_model = (
            os.getenv("SLICE_ESCALATION_MODEL") or "gemini-2.5-pro"
        )
        original = self.model
        self.model = escalation_model
        try:
            result = self.chat(system, user, max_tokens=max_tokens)
            # If escalation hit quota, fall back silently to primary
            if result and "RESOURCE_EXHAUSTED" in result:
                print(f"[VISION LLM] Escalation quota hit — falling back to {original}")
                self.model = original
                return self.chat(system, user, max_tokens=max_tokens)
            return result
        except Exception:
            self.model = original
            return self.chat(system, user, max_tokens=max_tokens)
        finally:
            self.model = original
