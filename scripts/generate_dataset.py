import pandas as pd
import numpy as np
import random
import os

# Define Schema Options
OPTIONS = {
    "primary_symptom": ["chest_pain", "fever", "vomiting", "headache", "shortness_of_breath", "abdominal_pain", "sore_throat", "cough", "dizziness"],
    "duration_category": ["short", "medium", "long"],
    "frequency": ["rare", "frequent", "persistent"],
    "age_group": ["child", "adult", "elderly"],
    "breathlessness_level": ["none", "mild", "severe"],
    "vomiting_severity": ["none", "mild", "severe"],
    "fever_level": ["none", "mild", "high"],
    "pain_type": ["sharp", "dull", "none"]
}

def apply_rules(row):
    """
    Apply clinical rules to determine urgency.
    Rules are based on data/clinical_rules.md
    """
    symptom = row['primary_symptom']
    severity = row['severity_score']
    duration = row['duration_category']
    breath = row['breathlessness_level']
    vomit = row['vomiting_severity']
    fever = row['fever_level']
    pain = row['pain_type']
    age = row['age_group']
    freq = row['frequency']

    # High Urgency Rules
    if symptom == 'chest_pain' and severity > 7 and breath == 'severe':
        return "High"
    if symptom == 'shortness_of_breath' and breath == 'severe':
        return "High"
    if symptom == 'abdominal_pain' and severity > 8 and age == 'elderly':
        return "High"
    if symptom == 'vomiting' and vomit == 'severe' and duration == 'medium':
        return "High"
    if fever == 'high' and breath == 'severe':
        return "High"
    if symptom == 'chest_pain' and pain == 'sharp' and severity > 6:
        return "High"

    # Moderate Urgency Rules
    if fever == 'mild' and symptom == 'cough' and duration == 'medium':
        return "Moderate"
    if age == 'elderly' and 5 <= severity <= 7:
        return "Moderate"
    if vomit == 'mild' and freq == 'frequent':
        return "Moderate"
    if symptom == 'headache' and duration == 'medium' and severity > 6:
        return "Moderate"
    if age == 'child' and fever == 'mild':
        return "Moderate"

    # Low Urgency Rules
    if fever == 'mild' and freq == 'rare' and duration == 'short':
        return "Low"
    if symptom == 'cough' and severity < 4 and breath == 'none':
        return "Low"
    if symptom == 'headache' and severity < 5 and pain == 'dull':
        return "Low"
    if symptom == 'sore_throat' and fever == 'none':
        return "Low"
    if symptom == 'abdominal_pain' and pain == 'dull' and duration == 'short':
        return "Low"

    # Default Logic
    if severity > 7:
        return "Moderate"
    return "Low"

def generate_dataset(num_rows=5000):
    data = []
    
    # Target counts for balance
    target_per_class = num_rows // 3
    counts = {"Low": 0, "Moderate": 0, "High": 0}
    
    while len(data) < num_rows:
        row = {
            "primary_symptom": random.choice(OPTIONS["primary_symptom"]),
            "severity_score": random.randint(1, 10),
            "duration_category": random.choice(OPTIONS["duration_category"]),
            "frequency": random.choice(OPTIONS["frequency"]),
            "age_group": random.choice(OPTIONS["age_group"]),
            "breathlessness_level": random.choice(OPTIONS["breathlessness_level"]),
            "vomiting_severity": random.choice(OPTIONS["vomiting_severity"]),
            "fever_level": random.choice(OPTIONS["fever_level"]),
            "pain_type": random.choice(OPTIONS["pain_type"])
        }
        
        # Heuristics to increase chance of High/Moderate for balance
        if random.random() < 0.3:
            row['severity_score'] = random.randint(8, 10)
            if random.random() < 0.5: row['breathlessness_level'] = 'severe'
            if random.random() < 0.5: row['primary_symptom'] = 'chest_pain'

        # Logical consistency checks
        if row['primary_symptom'] != 'chest_pain' and row['primary_symptom'] != 'abdominal_pain' and row['pain_type'] == 'sharp':
            if random.random() > 0.2: row['pain_type'] = 'none'
            
        if row['primary_symptom'] != 'fever' and row['fever_level'] == 'high':
             if random.random() > 0.3: row['fever_level'] = 'none'

        urgency = apply_rules(row)
        
        # Only add if we need more of this class, or if it's "High" (since it's usually harder to hit)
        if counts[urgency] < target_per_class or (urgency == "High" and counts["High"] < target_per_class + 200):
            row['urgency'] = urgency
            data.append(row)
            counts[urgency] += 1

    df = pd.DataFrame(data)
    
    output_path = os.path.join("data", "symptoms_dataset.csv")
    df.to_csv(output_path, index=False)
    print(f"Balanced dataset generated successfully with {len(df)} rows at {output_path}")
    print("\nClass Distribution:")
    print(df['urgency'].value_counts())

if __name__ == "__main__":
    generate_dataset(5000)
