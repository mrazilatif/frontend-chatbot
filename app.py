


import os
import logging
import io
from typing import List, Optional


from fastapi import FastAPI, File, UploadFile, Form, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import google.generativeai as genai
import PyPDF2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini API
try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # Fix typo from GENIUL_API_KEY
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in the environment variables.")
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Google Generative AI configured successfully")
except Exception as e:
    logger.error(f"Error configuring Google Generative AI: {e}")  # Fixed f-string
    print(e)

# Initialize FastAPI app
app = FastAPI()

# Mount static files - make sure the directory exists ((File input)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure templates (templates directory (roats))
templates = Jinja2Templates(directory="templates")

# Add url_for to templates 
templates.env.globals['url_for'] = lambda name, **params: app.url_path_for(name, **params)

chat_sessions = {}
#define the html 
@app.get("/", response_class=HTMLResponse)  # Fixed typo response.class -> response_class
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

#for input get from the user
@app.post("/chat")
async def chat_endpoint(request: Request):
    try:
        data = await request.json()
        messages = data.get('messages', [])
        session_id = data.get('session_id', 'default_session')

        if not messages:
            return JSONResponse(content={"error": "No messages provided"}, status_code=400)

        user_message = next((msg['content'] for msg in reversed(messages) if msg['role'] == 'user'), None)
        if not user_message:
            return JSONResponse(content={"error": "No user message found"}, status_code=400)

        if session_id not in chat_sessions:
            model = genai.GenerativeModel("gemini-1.5-flash")
            chat_sessions[session_id] = model.start_chat(history=[])
            logger.info(f"Created new chat session: {session_id}")

        chat = chat_sessions[session_id]
        response = chat.send_message(user_message)

        return {"response": response.text}

    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        return JSONResponse(content={"error": f"Error processing request: {str(e)}"}, status_code=500)
#for the file upload
@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...), session_id: str = Form("default_session")):
    try:
        if not file.filename.lower().endswith('.pdf'):
            return JSONResponse(content={"error": "Only PDF files are supported"}, status_code=400)

        content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = "".join(page.extract_text() or "" for page in pdf_reader.pages)

        if f"{session_id}_resume" not in chat_sessions:
            model = genai.GenerativeModel("gemini-1.5-flash")
            chat_sessions[f"{session_id}_resume"] = model.start_chat(history=[])
            logger.info(f"Created new resume analysis session: {session_id}_resume")

        resume_chat = chat_sessions[f"{session_id}_resume"]

        analysis_prompt = f"""
        I'm sharing my resume text with you. Please analyze it and provide insights:

        {text}

        Please analyze this resume and provide a brief summary of my skills and experience.
        """

        response = resume_chat.send_message(analysis_prompt)

        # Add context to the main chat session too
        if session_id not in chat_sessions:
            model = genai.GenerativeModel("gemini-1.5-flash")
            chat_sessions[session_id] = model.start_chat(history=[])

        context_message = f"I've analyzed a resume titled {file.filename}. It contains information about skills and experiences. I'll use this for future conversations."
        chat_sessions[session_id].send_message(context_message)

        return {
            "message": "Resume uploaded and analyzed successfully",
            "filename": file.filename,
            "analysis": response.text
        }

    except Exception as e:
        logger.error(f"Upload resume error: {e}")
        return JSONResponse(content={"error": f"Error processing resume: {str(e)}"}, status_code=500)
#for clearing the chat
@app.post("/clear-chat")
async def clear_chat(session_id: str = Form("default_session")):
    try:
        deleted = False
        for sid in [session_id, f"{session_id}_resume"]:
            if sid in chat_sessions:
                del chat_sessions[sid]
                logger.info(f"Cleared session: {sid}")
                deleted = True

        if deleted:
            return {"message": "Chat session cleared successfully"}
        else:
            return {"message": "No session found to clear"}

    except Exception as e:
        logger.error(f"Clear chat error: {e}")
        return JSONResponse(content={"error": f"Error clearing session: {str(e)}"}, status_code=500)
  


# Only run locally
if __name__ == "__main__":
    import uvicorn # type: ignore
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)
