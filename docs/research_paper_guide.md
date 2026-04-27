# MedAssist v2: Research Paper & Project Guide

This document provides structured content for your final-year project report, viva preparation, and research paper submission.

## 1. Abstract
MedAssist v2 is a Clinical Triage and Decision Support System (CDSS) that addresses the shortcomings of generic LLMs in medical contexts. By combining a deterministic Rule-Based Engine (RBE) with a Machine Learning (ML) validation layer, the system provides explainable, reliable, and consistent urgency assessments. The system achieves a 99.8% accuracy on a logically consistent synthetic dataset, highlighting the robustness of the hybrid logic architecture.

## 2. System Architecture
- **Inference Pipeline:** intake -> validation -> engine -> ML check -> integration -> LLM narration.
- **Rule Engine (Primary):** Implements clinical triage rules based on medical guidelines.
- **ML Layer (Secondary):** Random Forest/XGBoost models provide a statistical check against rule engine outputs.
- **LLM Layer:** Limits generative AI to the interaction shell, preventing hallucinated clinical decisions.

## 3. Methodology
- **Dataset Synthesis:** Generation of 5,000 balanced instances across three urgency classes (Low, Moderate, High).
- **Feature Engineering:** Encoding of primary symptoms, severity scores (1-10), and secondary features (breathlessness, vomiting, pain type).
- **Model Selection:** Comparison of Logistic Regression, Random Forest, and XGBoost.

## 4. Key Performance Metrics
| Model | Accuracy | F1-Score | Use Case |
|-------|----------|----------|----------|
| Logistic Regression | ~80% | Moderate | Baseline |
| Random Forest | ~99% | High | Robust, Interpretability |
| XGBoost | ~99.8% | High | Maximum Accuracy |

## 5. Novelty & Contribution
Unlike "MedGPT" or simple symptom checkers, MedAssist v2:
1. **Enforces Consistency:** Rejecting "fever symptom with zero fever level" at the intake layer.
2. **Prioritizes Clinical Safety:** Rules override ML in case of conflicts to ensure emergency cases are never downgraded by a statistical model.
3. **Provides Explainability:** Every decision is backed by a specific clinical rule and a natural language explanation.

## 6. Future Work
- Integration with real-world medical datasets.
- Real-time IoT sensor integration (heart rate, SpO2).
- Integration with hospital EMR (Electronic Medical Records) via FHIR standards.
