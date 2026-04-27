import joblib
import pandas as pd
import numpy as np
try:
    from rule_engine import RuleEngine
    from llm_layer import LLMLayer
except ImportError:
    from .rule_engine import RuleEngine
    from .llm_layer import LLMLayer
import os

class DecisionLayer:
    def __init__(self):
        self.rule_engine = RuleEngine()
        self.llm_layer = LLMLayer()
        
        # Load ML model and metadata
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            models_dir = os.path.join(os.path.dirname(current_dir), 'models')
            
            self.model = joblib.load(os.path.join(models_dir, 'best_model.joblib'))
            self.metadata = joblib.load(os.path.join(models_dir, 'metadata.joblib'))
            self.target_classes = self.metadata['target_classes']
            self.feature_columns = self.metadata['feature_columns']
            self.categorical_cols = self.metadata['categorical_columns']
        except Exception as e:
            print(f"Error loading ML components: {e}")
            self.model = None

    def predict(self, input_data):
        """
        Combines rule-based and ML-based triage.
        """
        # Ensure all expected keys are present in input_data to avoid ML errors
        complete_input = {
            "primary_symptom": "unknown",
            "severity_score": 5,
            "duration_category": "medium",
            "frequency": "rare",
            "age_group": "adult",
            "breathlessness_level": "none",
            "vomiting_severity": "none",
            "fever_level": "none",
            "pain_type": "none"
        }
        complete_input.update(input_data)
        
        # 0. Validation Check
        is_valid, error_msg = self.rule_engine.validate_input(complete_input)
        if not is_valid:
            return {
                "final_urgency": "N/A",
                "status": "Contradiction Detected",
                "ai_explanation": {
                    "narrative": error_msg,
                    "recommendation": "Please re-enter your symptoms accurately.",
                    "first_aid": "N/A",
                    "medicine_info": "N/A"
                },
                "ml_output": {"urgency": "N/A", "confidence": 0},
                "rule_output": {"matching_rule": "N/A", "logic": error_msg}
            }

        # 1. Rule Engine Prediction
        rule_result = self.rule_engine.evaluate(complete_input)
        
        # 2. ML Model Prediction
        ml_urgency = "Unknown"
        ml_confidence = 0.0
        
        if self.model:
            try:
                # Prepare data for ML
                df_input = pd.DataFrame([complete_input])
                
                # Encode categorical features as dummies
                df_encoded = pd.get_dummies(df_input, columns=self.categorical_cols)
                
                # Reindex to match training columns
                df_final = df_encoded.reindex(columns=self.feature_columns, fill_value=0)
                
                # Predict
                probs = self.model.predict_proba(df_final)[0]
                pred_idx = np.argmax(probs)
                ml_urgency = self.target_classes[pred_idx]
                ml_confidence = float(probs[pred_idx])
            except Exception as e:
                print(f"ML Prediction Error: {e}")

        # 3. Conflict Handling & Decision Masking
        # Rule Engine is PRIMARY.
        final_urgency = rule_result['urgency']
        status = "Agreement"
        
        if rule_result['urgency'] != ml_urgency:
            status = "Conflict (Rule Overrides ML)"
            # Note: We prioritize the Rule Engine in clinical triage for reliability.
            # However, we flag the conflict for the user/system.
            
        # 4. Generate AI Explanation
        explanation = self.llm_layer.generate_explanation(complete_input, {
            "final_urgency": final_urgency,
            "rule_output": rule_result
        })
            
        return {
            "final_urgency": final_urgency,
            "rule_output": rule_result,
            "ml_output": {
                "urgency": ml_urgency,
                "confidence": ml_confidence
            },
            "status": status,
            "ai_explanation": explanation
        }

if __name__ == "__main__":
    # Test Integration
    dl = DecisionLayer()
    test_case = {
        "primary_symptom": "chest_pain",
        "severity_score": 9,
        "duration_category": "short",
        "frequency": "rare",
        "age_group": "adult",
        "breathlessness_level": "severe",
        "vomiting_severity": "none",
        "fever_level": "none",
        "pain_type": "sharp"
    }
    result = dl.predict(test_case)
    print("\nIntegrated Decision Result:")
    import json
    print(json.dumps(result, indent=2))
