from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/")
async def root():
    return JSONResponse({"ok": True}, status_code=200)


@app.get("/health")
async def health_check():
    return JSONResponse({"status": "healthy"}, status_code=200)
