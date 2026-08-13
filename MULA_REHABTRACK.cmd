@echo off
setlocal
title RehabTrack Web
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-rehabtrack.ps1"
if errorlevel 1 (
  echo.
  echo RehabTrack tidak dapat dimulakan. Baca mesej di atas.
  pause
)

