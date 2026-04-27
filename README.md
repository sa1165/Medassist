# MedAssist v2

<div align="center">
  <img src="frontend/src/medassist_logo.png" alt="MedAssist Logo" width="200"/>
  <h3>Structured Clinical Triage and Decision Support System</h3>
  <p><i>Engineering safety and reliability into digital health triage.</i></p>
</div>

---

## 🚀 Core Features

- **Hybrid Triage Engine:** Combines a deterministic **Clinical Rule Engine** with a **Machine Learning validation layer**.
- **Guided Intake:** 6-step structured questioning to ensure precise clinical data capture.
- **AI-Powered Explanations:** Utilizes LLMs to provide context-aware summaries of triage decisions.
- **Urgency Visualization:** Clear, color-coded indicators for High, Moderate, and Low urgency levels.
- **Professional Reports:** Automatic generation of PDF clinical reports for patient or provider records.
- **Intelligent Chat:** Integrated AI assistant to guide users and manage clinical conversation flow.

---

## 🏗️ Tiered Architecture

MedAssist v2 separates **Communication** from **Decision Logic** to ensure safety:

1.  **Rule Engine (Primary):** Executes hard-coded clinical triage logic based on established protocols.
2.  **ML Model (Secondary):** Acts as a "second opinion" to validate rule engine outputs and detect contradictions.
3.  **LLM Layer (Interaction):** Encapsulates results in natural language and manages the UX without overriding clinical logic.

---

## 💻 Tech Stack

### **Frontend**
- **React 17** with **TypeScript**
- **Vite** (Next-generation build tool)
- **Vanilla CSS** (Custom Design System)
- **Lucide React** (Modern Iconography)

### **Backend**
- **FastAPI** (High-performance Python framework)
- **Uvicorn** (ASGI Server)
- **Machine Learning:** Scikit-learn (MLP Classifier)
- **ReportLab:** Dynamic PDF Generation
- **Supabase:** Secure Authentication & Data Sync
- **Grok API:** Advanced Intelligence Layer

---

## 🛠️ Setup & Installation

### **Prerequisites**
- Python 3.8+
- Node.js 16+

### **1. Backend Setup**
```bash
cd backend
pip install -r requirements.txt
# Configure your .env file with Supabase and LLM keys
python main.py
```

### **2. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:3015`.

---

## 📂 Project Organization

- `backend/`: FastAPI application, logic layers (ML/Rules/LLM), and report generators.
- `frontend/`: React source code, custom hooks, and high-fidelity UI components.
- `models/`: Pre-trained ML models and metadata.
- `data/`: Clinical rule definitions, symptom datasets, and schemas.
- `docs/`: Technical documentation and concept notes.
- `scripts/`: Model training and dataset generation utilities.

---

## ⚠️ Disclaimer

**MedAssist v2 is a clinical decision support demonstration.** It is designed for **triage assistance**, not diagnosis. This tool is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for any medical concerns.
