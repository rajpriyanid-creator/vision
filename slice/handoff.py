from typing import List
from slice.state_manager import AgentHandoff, StateManager

class HandoffRecorder:
    """Helper service to log typed agent handoffs during state machine transitions."""

    def __init__(self, state_manager: StateManager):
        self.state_manager = state_manager

    def record(
        self,
        run_id: str,
        from_agent: str,
        to_agent: str,
        action: str,
        reason: str,
        input_record_refs: List[str] = None,
        output_record_refs: List[str] = None
    ) -> AgentHandoff:
        handoff = AgentHandoff(
            run_id=run_id,
            from_agent=from_agent,
            to_agent=to_agent,
            action=action,
            reason=reason,
            input_record_refs=input_record_refs or [],
            output_record_refs=output_record_refs or []
        )
        self.state_manager.record_handoff(handoff)
        return handoff
