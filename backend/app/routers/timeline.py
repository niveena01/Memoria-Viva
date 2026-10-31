# backend\app\routers\timeline.py
from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
from app.services.timeline_service import timeline_service

router = APIRouter(prefix="/api/v1/timeline", tags=["Timeline Analytics"])

@router.post("/analyze")
async def analyze_timeline(file: UploadFile = File(...)):
    """
    Upload a historical timeline CSV file. TabPFN analyzes the temporal data, 
    spots structural anomalies, and calculates rhythmic pattern reliability.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported for timeline analysis.")
    
    temp_file_path = f"temp_{file.filename}"
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Run TabPFN analysis
        result = timeline_service.analyze_timeline_csv(temp_file_path)
        return result
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)   