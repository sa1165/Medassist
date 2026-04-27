# Clinical Triage Rules

These rules define the deterministic logic for the **MedAssist v2** Rule-Based Engine.

## High Urgency Rules
1. **Cardiac Risk:** `primary_symptom == 'chest_pain'` AND `severity_score > 7` AND `breathlessness_level == 'severe'` -> **High**
2. **Severe Respiratory Distress:** `primary_symptom == 'shortness_of_breath'` AND `breathlessness_level == 'severe'` -> **High**
3. **Severe Abdominal / Elderly:** `primary_symptom == 'abdominal_pain'` AND `severity_score > 8` AND `age_group == 'elderly'` -> **High**
4. **Persistent Severe Vomiting:** `primary_symptom == 'vomiting'` AND `vomiting_severity == 'severe'` AND `duration_category == 'medium'` -> **High**
5. **High Fever + Breathlessness:** `fever_level == 'high'` AND `breathlessness_level == 'severe'` -> **High**
6. **Sharp Chest Pain:** `primary_symptom == 'chest_pain'` AND `pain_type == 'sharp'` AND `severity_score > 6` -> **High**

## Moderate Urgency Rules
7. **Moderate Fever + Cough:** `fever_level == 'mild'` AND `primary_symptom == 'cough'` AND `duration_category == 'medium'` -> **Moderate**
8. **Elderly + Moderate Pain:** `age_group == 'elderly'` AND `severity_score >= 5` AND `severity_score <= 7` -> **Moderate**
9. **Frequent Vomiting:** `vomiting_severity == 'mild'` AND `frequency == 'frequent'` -> **Moderate**
10. **Persistent Migraine:** `primary_symptom == 'headache'` AND `duration_category == 'medium'` AND `severity_score > 6` -> **Moderate**
11. **Child + Moderate Fever:** `age_group == 'child'` AND `fever_level == 'mild'` -> **Moderate**

## Low Urgency Rules
12. **Mild Fever + Rare:** `fever_level == 'mild'` AND `frequency == 'rare'` AND `duration_category == 'short'` -> **Low**
13. **Simple Cough:** `primary_symptom == 'cough'` AND `severity_score < 4` AND `breathlessness_level == 'none'` -> **Low**
14. **Mild Headache:** `primary_symptom == 'headache'` AND `severity_score < 5` AND `pain_type == 'dull'` -> **Low**
15. **Sore Throat:** `primary_symptom == 'sore_throat'` AND `fever_level == 'none'` -> **Low**
16. **Dull Abdominal Pain (Short):** `primary_symptom == 'abdominal_pain'` AND `pain_type == 'dull'` AND `duration_category == 'short'` -> **Low**

## Priority / Conflict Handling
- If a rule for **High** urgency matches, the classification is **High**, regardless of other matching rules.
- If no **High** but a **Moderate** rule matches, classification is **Moderate**.
- Default classification (if no specific rules match) is derived from `severity_score`:
    - `severity_score > 7`: Moderate
    - `severity_score <= 7`: Low
