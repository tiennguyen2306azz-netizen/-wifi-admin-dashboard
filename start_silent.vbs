Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\XUAN TIEN\.gemini\antigravity\scratch\wifi_admin_dashboard"
WshShell.Run "python -m uvicorn main:app --host 127.0.0.1 --port 8000", 0, False
