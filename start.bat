@echo off
start "Backend" cmd /k "cd /d codebase\backend && python app.py"
start "Frontend" cmd /k "cd /d codebase\frontend && npm run dev"
