import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

class GrokBrain:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
            
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url="https://api.groq.com/openai/v1",
        )

    async def classify_and_respond(self, query: str, history: list = []):
        router_prompt = f"""
        User Query: "{query}"
        
        TASK: STRICT CLINICAL GATEKEEPING (PILLAR #1).
        
        ALLOWED (\u2705): Symptoms, Diseases, Medications, Treatments, First Aid, Prevention, Medical Education.
        REJECT (\u274c): Politics, Sports, Vehicles (CC engines, cars, bikes), Coding, Entertainment, Finance, etc.
        
        CLASSIFICATION RULE:
        - If the query is NOT 100% medical, set "status": "rejected".
        - Even if it's ambiguous (like "CC"), if the context isn't medical, REJECT it.
        
        RESPONSE TYPE RULE:
        - Use "structured" for comprehensive queries (e.g., "how to...", "explain...", "treatment for...") to provide deep clinical sections.
        - Use "conversational" for short questions, greetings, or quick clarifications.
        
        Return JSON: {{ "status": "allowed" | "rejected", "response_type": "structured" | "conversational", "rejection_message": "I am a dedicated medical clinical support system. I only provide assistance with symptoms, diseases, medications, and medical education. I cannot answer queries about non-medical topics like [topic]." }}
        """

        try:
            router_res = await self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a clinical gatekeeper. Respond ONLY in JSON."},
                    {"role": "user", "content": router_prompt}
                ],
                response_format={ "type": "json_object" }
            )
            
            classification = json.loads(router_res.choices[0].message.content)
            
            if classification["status"] == "rejected":
                return {"reply": classification["rejection_message"], "status": "rejected"}

            response_type = classification.get("response_type", "conversational")
            
            # Define templates separately to avoid f-string nesting issues
            structured_template = """STRICT TEMPLATE:
            You MUST follow a structured format with DOUBLE NEWLINES between every element.
            Use AT LEAST 4 main sections with BOLD HEADERS. You are encouraged to use MORE than 4 if the topic requires deeper exploration (e.g., 5-7 sections for complex topics).
            
            ADAPT HEADERS TO CONTEXT:
            - For SYMPTOMS/DISEASES: Use **OVERVIEW**, **KEY SYMPTOMS**, **POSSIBLE CAUSES**, **NEXT STEPS**, and additional relevant headers.
            - For LIFESTYLE/PREVENTION: Use **OVERVIEW**, **KEY COMPONENTS**, **TO DO**, **TO AVOID**, and additional relevant headers.
            - For MEDICATIONS: Use **OVERVIEW**, **MECHANISM OF ACTION**, **SIDE EFFECTS**, **DOSAGE & SAFETY**, and additional relevant headers.
            - For GENERAL MEDICAL INFO: Choose relevant, professional medical headers (minimum 4).
            
            FORMATTING RULES:
            - Each section MUST be expansive, detailed, and academically rigorous.
            - Use BULLET POINTS (using '-' or '*') for listing specific details, symptoms, or recommendations within sections.
            - Do NOT just write long paragraphs; use points to make information clear and professional."""
            
            conversational_template = """CONVERSATIONAL MODE:
            - Respond naturally, warmly, and professionally.
            - Answer the specific question with **high clinical depth**.
            - Use bullet points if listing more than 2 items.
            """
            
            mode_instr = "(CRITICAL: USE THE STRUCTURED TEMPLATE)" if response_type == "structured" else "(CRITICAL: DO NOT USE SECTION HEADERS. BUT REMAIN EXPANSIVE.)"
            active_template = structured_template if response_type == "structured" else conversational_template
            
            system_prompt = f"""
            YOU ARE THE MEDASSIST AI CLINICAL SUPPORT SYSTEM.
            
            ### CRITICAL MANDATORY RULES (NEVER OMIT) ###
            1. **STRICT CLINICAL DOMAIN (PILLAR #1)**: 
               - \u2705 ALLOWED: Symptoms, Diseases, Medications, Treatments, First Aid, Prevention, Medical Education.
               - \u274c REJECT: Politics, Sports, Vehicles (engines), Coding, Entertainment, etc.
               - If a non-medical query reaches you, you MUST REFUSE to answer it.
            
            2. **BE EXPANSIVE & DETAILED**: NEVER summarize. Your answers MUST be long and academically rigorous. Use bullet points for specific lists or details.
            
            3. **CASUAL TALK & GREETINGS**: If the user says "Hi", "Hello", "Okay", "Thanks", respond naturally and briefly. (Omit disclaimer).
            
            4. **SAFETY DISCLAIMER**: For any MEDICAL query or advice, end with exactly two newlines then: 
               "DISCLAIMER: This information is for educational purposes. Please consult a qualified physician for a formal diagnosis."
            
            5. **FOLLOW-UP QUESTION**: AT THE VERY END of your reply (after the disclaimer), add exactly one relevant, professional follow-up question to keep the conversation going.
            
            6. **CLINICAL INTAKE MODE (PILLAR #2)**:
               - If a user reports a symptom but it is VAGUE (e.g. "I have pain"), you MUST ask for: **Location**, **Severity (1-10)**, **Duration**, and **Associated Symptoms**.
            
            ### RESPONSE MODE: {response_type.upper()} ###
            {mode_instr}
            
            {active_template}
            
            ### STYLE RULES ###
            - Provide EXACTLY 3 short questions as suggestions for the "suggestions" JSON field (blue chips).
            
            RESPOND ONLY IN JSON:
            {{
                "reply": "your detailed response here including headers, points, disclaimer, and ONE follow-up question at the end",
                "suggestions": ["...", "...", "..."]
            }}
            """

            # Build messages with history
            messages = [{"role": "system", "content": system_prompt}]
            # Limit history to prevent context bloat but keep the flow
            for msg in history[-6:]:
                role = "assistant" if msg["role"] == "ai" else "user"
                messages.append({"role": role, "content": msg["content"]})
            
            # Avoid duplicate user message if it's already at the end of history
            if not history or history[-1]["content"] != query:
                messages.append({"role": "user", "content": query})

            response = await self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                response_format={ "type": "json_object" }
            )
            
            res_data = json.loads(response.choices[0].message.content)
            return {
                "reply": res_data.get("reply", ""), 
                "suggestions": res_data.get("suggestions", []),
                "status": "allowed"
            }

        except Exception as e:
            err_str = str(e).lower()
            if "rate_limit" in err_str:
                return {"reply": "MedAssist is currently experiencing high demand. Try again in a moment.", "suggestions": [], "status": "rate_limited"}
            print(f"Groq Error: {e}")
            return {"reply": "I'm having trouble connecting. Please try again later.", "suggestions": [], "status": "error"}

grok_brain = GrokBrain()
