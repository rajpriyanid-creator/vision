# VISION Event Evidence & Iteration Archive

This directory stores real-user walkthrough notes, stress-test execution logs, visible iteration commit records, and verification artifacts gathered by Dhanush S (Verifier) during the AGENT-A-THON event.

---

## 1. Directory & File Layout

```text
evidence/
├── README.md                  # Evidence registry & standards (this file)
├── walkthrough_user_1.md      # User 1 (Student A — Weak Recursion Baseline) Walkthrough Log
├── walkthrough_user_2.md      # User 2 (Student B — Tie-Breaker Test) Walkthrough Log
├── walkthrough_user_3.md      # User 3 (Student C — Second Encounter Persistence) Walkthrough Log
├── stress_test_results.md     # 5 Adversarial Attack Vector Execution Logs
└── iteration_log.md           # Pre-Fix vs. Post-Fix Git Commit & Verification Record
```

---

## 2. Iteration Log Requirements

To satisfy the hackathon's "Visible Iteration" requirement:
1. Every bug or vulnerability discovered during testing must be recorded in `evidence/iteration_log.md`.
2. The log must record:
   - **Flaw Description & Pre-Fix Failure Log**
   - **Root Cause & Git Commit Hash of Code Fix**
   - **Post-Fix Verification Log showing Clean Pass**

