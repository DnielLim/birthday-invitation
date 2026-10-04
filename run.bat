@echo off
cd /d "%~dp0"
echo ========================================================
echo  Starting Birthday Invitation App: Alvien & Vinella
echo ========================================================
if exist ".venv\Scripts\streamlit.exe" (
    ".venv\Scripts\streamlit.exe" run app.py
) else (
    streamlit run app.py
)
pause
