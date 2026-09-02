@echo off
chcp 65001 > nul
echo ========================================================
echo   CẤU HÌNH TỰ ĐỘNG CHẠY TRANG QUẢN TRỊ WIFI CÙNG WINDOWS
echo ========================================================
echo.

set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS_PATH=C:\Users\XUAN TIEN\.gemini\antigravity\scratch\wifi_admin_dashboard\start_silent.vbs
set SHORTCUT_PATH=%STARTUP_DIR%\WiFiAdminDashboard.lnk

powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%');$s.TargetPath='wscript.exe';$s.Arguments='\"%VBS_PATH%\"';$s.Save()"

echo [Thành công] Đã cài đặt tự động chạy ngầm trang Quản trị Wi-Fi!
echo Mỗi khi mở máy tính, trang web http://127.0.0.1:8000 sẽ tự động chạy ngầm 24/7.
echo.
pause
