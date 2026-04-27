import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib 
import os

# Create models directory
if not os.path.exists('models'):
    os.makedirs('models')

def train_models():
    # 1. Load Data
    data_path = 'data/symptoms_dataset.csv'
    if not os.path.exists(data_path):
        print(f"Error: {data_path} not found.")
        return
    
    df = pd.read_csv(data_path)
    
    # 2. Preprocessing
    le_map = {}
    categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
    categorical_cols.remove('urgency') # Remove target
    
    X = df.drop('urgency', axis=1)
    y = df['urgency']
    
    # Encode target
    le_target = LabelEncoder()
    y_encoded = le_target.fit_transform(y)
    
    # Encode features
    X_encoded = pd.get_dummies(X, columns=categorical_cols)
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X_encoded, y_encoded, test_size=0.2, random_state=42)
    
    # 3. Training & Comparison
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "XGBoost": XGBClassifier(use_label_encoder=False, eval_metric='mlogloss')
    }
    
    best_model = None
    best_accuracy = 0
    
    for name, model in models.items():
        print(f"\n--- Training {name} ---")
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        acc = accuracy_score(y_test, y_pred)
        print(f"Accuracy: {acc:.4f}")
        print("Classification Report:")
        print(classification_report(y_test, y_pred, target_names=le_target.classes_))
        
        if acc > best_accuracy:
            best_accuracy = acc
            best_model = (name, model)

    print(f"\nBest Model: {best_model[0]} with Accuracy: {best_accuracy:.4f}")
    
    # 4. Save best model and metadata
    import joblib
    model_path = f'models/best_model.joblib'
    joblib.dump(best_model[1], model_path)
    
    # Save encoders and column metadata
    metadata = {
        "target_classes": le_target.classes_.tolist(),
        "feature_columns": X_encoded.columns.tolist(),
        "categorical_columns": categorical_cols
    }
    joblib.dump(metadata, 'models/metadata.joblib')
    
    print(f"Best model saved to {model_path}")

if __name__ == "__main__":
    train_models()
