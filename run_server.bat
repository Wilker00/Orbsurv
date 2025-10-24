@echo off
call .venv\Scripts\activate
uvicorn backend.app:app --host 0.0.0.0 --port 8000
