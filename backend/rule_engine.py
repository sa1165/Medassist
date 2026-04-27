class RuleEngine:
    def __init__(self):
        pass

    def validate_input(self, data):
        """
        Checks for contradictions in clinical input.
        Returns: (is_valid, error_message)
        """
        symptom = data.get('primary_symptom')
        severity = data.get('severity_score', 0)
        breath = data.get('breathlessness_level', 'none')
        vomit = data.get('vomiting_severity', 'none')
        fever = data.get('fever_level', 'none')

        # Contradiction: Symptom specified but severity is too low to be considered a symptom
        if symptom and symptom != 'none' and severity <= 1:
            return False, f"Contradiction: Primary symptom '{symptom}' reported but severity score is {severity}. Please provide an accurate severity."

        # Contradiction: Associated symptom specified but level is 'none'
        if breath != 'none' and symptom == 'shortness_of_breath' and severity < 2:
             return False, "Contradiction: Respiratory distress reported but severity is low."

        if vomit != 'none' and symptom == 'vomiting' and severity < 2:
             return False, "Contradiction: Vomiting reported but severity is low."

        return True, None

    def evaluate(self, data):
        """
        Evaluates clinical rules on input data.
        Returns: { "urgency": "Low/Moderate/High", "matching_rule": "Rule description", "logic": "Rule logic details" }
        """
        symptom = data.get('primary_symptom')
        severity = data.get('severity_score', 0)
        duration = data.get('duration_category')
        breath = data.get('breathlessness_level')
        vomit = data.get('vomiting_severity')
        fever = data.get('fever_level')
        pain = data.get('pain_type')
        age = data.get('age_group')
        freq = data.get('frequency')

        # HIGH URGENCY RULES (Priority 1) - EMERGENCY DETECTION
        
        # Stroke Detection (using pain_type or description if available)
        if (symptom == 'headache' and pain == 'sharp' and severity > 8) or \
           (data.get('facial_droop') or data.get('slurred_speech')):
            return self._result("High", "Potential Stroke / Neurological Emergency", "Symptoms indicate potential acute neurological deficit.")

        if symptom == 'chest_pain' and severity > 7 and breath == 'severe':
            return self._result("High", "Potential Cardiac Event", "Severe chest pain with respiratory distress.")
        
        if symptom == 'shortness_of_breath' and breath == 'severe':
            return self._result("High", "Severe Respiratory Distress", "Critical breathing difficulty reported.")

        if data.get('severe_bleeding') or (symptom == 'abdominal_pain' and severity > 9):
            return self._result("High", "Internal/Severe Bleeding Risk", "High severity pain or reported bleeding.")
            
        if symptom == 'abdominal_pain' and severity > 8 and age == 'elderly':
            return self._result("High", "Geriatric Abdominal Emergency", "High severity abdominal pain in an elderly patient.")
            
        if symptom == 'vomiting' and vomit == 'severe' and duration == 'medium':
            return self._result("High", "Dehydration Risk / Severe Vomiting", "Severe persistent vomiting.")
            
        if fever == 'high' and breath == 'severe':
            return self._result("High", "Sepsis / Severe Infection Risk", "High fever with critical respiratory involvement.")

        # MODERATE URGENCY RULES (Priority 2)
        if fever == 'high' or (fever == 'mild' and symptom == 'cough' and duration == 'medium'):
            return self._result("Moderate", "Significant Infection", "Fever and persistent respiratory symptoms.")
            
        if age == 'elderly' and 5 <= severity <= 7:
            return self._result("Moderate", "Elderly Vulnerability", "Moderate symptoms in an elderly patient.")
            
        if vomit == 'mild' and freq == 'frequent':
            return self._result("Moderate", "Persistent GI Distress", "Frequent vomiting episodes.")
            
        if symptom == 'headache' and duration == 'medium' and severity > 6:
            return self._result("Moderate", "Complex Migraine / Neuralgia", "High severity persistent headache.")
            
        if age == 'child' and fever == 'mild':
            return self._result("Moderate", "Pediatric Fever", "Fever in a child requiring evaluation.")

        # LOW URGENCY RULES (Priority 3)
        if fever == 'mild' and freq == 'rare' and duration == 'short':
            return self._result("Low", "Minor Viral Symptoms", "Mild fever with short duration.")
            
        if symptom == 'cough' and severity < 4 and breath == 'none':
            return self._result("Low", "Simple Respiratory Irritation", "Mild cough with no distress.")
            
        if symptom == 'headache' and severity < 5 and pain == 'dull':
            return self._result("Low", "Tension Headache", "Mild dull headache.")
            
        if symptom == 'sore_throat' and fever == 'none':
            return self._result("Low", "Minor Pharyngitis", "Sore throat without systemic symptoms.")

        # DEFAULT LOGIC
        if severity > 7:
            return self._result("Moderate", "Severity-Based Escalation", "High severity score requires professional review.")
        
        return self._result("Low", "Standard Monitoring", "Symptoms appear manageable with routine care.")

    def _result(self, urgency, rule_name, logic):
        return {
            "urgency": urgency,
            "matching_rule": rule_name,
            "logic": logic
        }


if __name__ == "__main__":
    # Simple Test
    engine = RuleEngine()
    test_case = {
        "primary_symptom": "chest_pain",
        "severity_score": 9,
        "breathlessness_level": "severe"
    }
    print(f"Test Result: {engine.evaluate(test_case)}")
