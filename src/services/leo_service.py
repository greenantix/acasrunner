# src/services/leo_service.py
import aiohttp
import json
import asyncio
from typing import Dict, Any, Optional

class LeoGatekeeperService:
    def __init__(self, lm_studio_url: str = "http://localhost:1234"):
        self.base_url = lm_studio_url
        self.session = None
    
    async def _get_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def make_decision(self, operation_context: str) -> Dict[str, Any]:
        """Get LEO's decision on an operation"""
        session = await self._get_session()
        
        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": operation_context
                }
            ],
            "temperature": 0.1,
            "max_tokens": 200
        }
        
        try:
            async with session.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    leo_response = result['choices'][0]['message']['content']
                    
                    # Parse LEO's JSON response
                    decision_data = json.loads(leo_response)
                    return {
                        "success": True,
                        "decision": decision_data
                    }
                else:
                    return {
                        "success": False,
                        "error": f"LEO service returned {response.status}"
                    }
                    
        except asyncio.TimeoutError:
            return {
                "success": False,
                "error": "LEO decision timeout - defaulting to escalate"
            }
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"LEO returned invalid JSON: {e}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"LEO service error: {e}"
            }
    
    async def evaluate_code_operation(
        self, 
        operation_type: str, 
        file_path: str, 
        details: Dict
    ) -> Dict[str, Any]:
        """Evaluate a specific code operation"""
        context = f"""
        User wants to {operation_type} in file: {file_path}
        
        Operation details:
        {json.dumps(details, indent=2)}
        
        File context: {details.get('file_type', 'unknown')} file
        Project: {details.get('project_name', 'unknown')}
        
        Please respond with JSON in this format:
        {{
            "decision": "approve|deny|escalate",
            "confidence": 0.0-1.0,
            "risk_level": "low|medium|high",
            "reasoning": "explanation of decision"
        }}
        """
        
        return await self.make_decision(context)
    
    async def detect_struggle_pattern(
        self, 
        error_message: str, 
        context: Dict
    ) -> Dict[str, Any]:
        """Detect and categorize struggle patterns"""
        struggle_context = f"""
        Error occurred: {error_message}
        
        Context:
        - File: {context.get('file_path', 'unknown')}
        - Language: {context.get('language', 'unknown')}
        - Previous errors: {context.get('error_count', 0)}
        - Time since last error: {context.get('time_since_last', 'unknown')}
        
        Please respond with JSON categorizing this struggle pattern:
        {{
            "pattern_type": "syntax|logic|dependency|environment|other",
            "severity": "low|medium|high|critical",
            "confidence": 0.0-1.0,
            "recommended_action": "auto_fix|escalate|provide_hints|ignore",
            "reasoning": "explanation of the pattern detected"
        }}
        """
        
        return await self.make_decision(struggle_context)
    
    async def close(self):
        if self.session:
            await self.session.close()

# Usage functions for ACAS workflow
async def process_operation_request(operation_type: str, details: Dict, leo_service: LeoGatekeeperService) -> Dict:
    """Main ACAS operation processing with LEO gatekeeper"""
    
    # Format context for LEO
    context = f"""
    User wants to {operation_type}. 
    Details: {json.dumps(details, indent=2)}
    Should I approve this operation?
    """
    
    # Get LEO's decision
    leo_result = await leo_service.make_decision(context)
    
    if not leo_result["success"]:
        # Fallback: escalate on LEO failure
        return {
            "action": "escalate",
            "reason": "LEO service unavailable",
            "escalation_context": context
        }
    
    decision = leo_result["decision"]
    
    # Route based on LEO's decision
    if decision.get("decision") == "approve":
        return {
            "action": "approved",
            "leo_decision": decision
        }
    
    elif decision.get("decision") == "escalate":
        return {
            "action": "escalate",
            "leo_decision": decision,
            "escalation_context": context
        }
    
    elif decision.get("decision") == "deny":
        return {
            "action": "denied",
            "reason": decision.get("reasoning", "Operation denied by LEO"),
            "leo_decision": decision
        }
    
    # Default to escalate if decision format is unexpected
    return {
        "action": "escalate",
        "reason": "Unexpected LEO response format",
        "leo_decision": decision
    }

async def escalate_to_claude_opus(context: str, leo_decision: Dict) -> Dict:
    """Escalate complex decisions to Claude Opus with LEO's context"""
    escalation_prompt = f"""
    ESCALATION FROM LOCAL GATEKEEPER:
    
    Original Request: {context}
    
    LEO's Assessment:
    - Decision: {leo_decision.get('decision', 'unknown')}
    - Confidence: {leo_decision.get('confidence', 'unknown')}
    - Risk Level: {leo_decision.get('risk_level', 'unknown')}
    - Reasoning: {leo_decision.get('reasoning', 'No reasoning provided')}
    
    Please provide detailed analysis and recommendations for this operation.
    """
    
    # TODO: Implement Claude Opus API integration
    return {
        "action": "escalated",
        "escalation_prompt": escalation_prompt,
        "status": "pending_opus_response"
    }