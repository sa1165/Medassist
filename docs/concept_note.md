# MedAssist v2 Concept Note

## Project Overview
**MedAssist v2** is a Structured Clinical Triage and Decision Support System. Its primary goal is to assess the **urgency** of user-reported symptoms using a deterministic clinical rule engine supported by a machine learning validation layer.

## The Problem
Existing digital health tools often fall into two traps:
1. **Search-Engine Panic:** Users Google symptoms and receive overwhelming, often catastrophic, information without context.
2. **LLM Hallucination:** Generic LLMs (like ChatGPT) provide unstructured, inconsistent medical advice and can "hallucinate" diagnostic decisions, which is dangerous in a clinical context.

## Our Solution: The Hybrid Architecture
MedAssist v2 separates **Communication** from **Decision Logic**.
- **Structured Intake:** Replaces free-text chat with guided clinical questioning.
- **Rule Engine (Primary):** Executes hard-coded clinical triage logic (High, Moderate, Low urgency).
- **ML Model (Secondary):** Acts as a "second opinion" to validate rule engine outputs.
- **LLM (Interaction):** Encapsulates results in natural language and manages the conversation flow, but *cannot* override the rule-based decision.

## Clinical Triage Focus
The system is designed for **Triage**, not **Diagnosis**. It answers the question: *"How quickly do I need to see a professional?"* rather than *"What disease do I have?"*

---
*MedAssist v2: Engineering safety and reliability into digital health triage.*
