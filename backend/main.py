from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import json
try:
    from decision_layer import DecisionLayer
    from report_generator import ReportGenerator
    from supabase_client import get_supabase
except ImportError:
    from .decision_layer import DecisionLayer
    from .report_generator import ReportGenerator
    from .supabase_client import get_supabase
try:
    from extras_client import extras_client
except ImportError:
    from .extras_client import extras_client
import uvicorn

app = FastAPI(title="MedAssist v2 API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

decision_layer = DecisionLayer()
report_generator = ReportGenerator()

class SymptomInput(BaseModel):
    primary_symptom: str
    severity_score: int
    duration_category: str
    frequency: str
    age_group: str
    breathlessness_level: str
    vomiting_severity: str
    fever_level: str
    pain_type: str

class ChatInput(BaseModel):
    message: str
    history: list = []

class DictionaryInput(BaseModel):
    term: str

class MedicineInput(BaseModel):
    name: str

@app.get("/")
def read_root():
    return {"message": "MedAssist v2 API is running"}

@app.post("/predict")
def predict_urgency(data: SymptomInput):
    try:
        result = decision_layer.predict(data.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-report")
def generate_report(data: dict):
    # data should contain "input" and "result"
    try:
        input_data = data.get("input")
        result_data = data.get("result")
        explanation = result_data.get("ai_explanation")
        
        filename = report_generator.generate_pdf(input_data, result_data, explanation)
        
        # If user is logged in, we could sync this to Supabase here
        # supabase = get_supabase()
        # if supabase and data.get("user_id"):
        #     supabase.table("assessments").insert({"user_id": data.get("user_id"), "data": data}).execute()
            
        return {"report_url": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/register")
def register(data: dict):
    supabase = get_supabase()
    if not supabase: raise HTTPException(status_code=501, detail="Supabase not configured")
    try:
        res = supabase.auth.sign_up({"email": data['email'], "password": data['password']})
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/login")
def login(data: dict):
    supabase = get_supabase()
    if not supabase: raise HTTPException(status_code=501, detail="Supabase not configured")
    try:
        res = supabase.auth.sign_in_with_password({"email": data['email'], "password": data['password']})
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/download-report/{filename:path}")
def download_report(filename: str):
    if os.path.exists(filename):
        return FileResponse(filename, media_type="application/pdf", filename="MedAssist_Report.pdf")
    raise HTTPException(status_code=404, detail="Report not found")

try:
    from grok_client import grok_brain
except ImportError:
    from .grok_client import grok_brain

# Simple global cache for API protection
chat_cache = {}

@app.post("/chat")
async def chat(data: ChatInput):
    # Create a simple cache key based on the message and a bit of history
    # We only cache if history is short to avoid context issues
    cache_key = f"{data.message.lower().strip()}"
    
    if not data.history and cache_key in chat_cache:
        print(f"Serving from cache: {cache_key}")
        return chat_cache[cache_key]

    result = await grok_brain.classify_and_respond(data.message, data.history)
    
    # Cache simple initial queries (where history is empty) to save tokens
    if not data.history and result.get("status") == "allowed":
        chat_cache[cache_key] = {
            "reply": result["reply"],
            "suggestions": result.get("suggestions", [])
        }

    return {
        "reply": result["reply"],
        "suggestions": result.get("suggestions", [])
    }

@app.post("/dictionary")
async def lookup_dictionary(data: DictionaryInput):
    res = await extras_client.get_dictionary_definition(data.term)
    if "error" in res:
        raise HTTPException(status_code=500, detail=res["error"])
    return res

@app.post("/medicine")
async def lookup_medicine(data: MedicineInput):
    res = await extras_client.get_medicine_info(data.name)
    if "error" in res:
        raise HTTPException(status_code=500, detail=res["error"])
    return res

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
