# Takarivo Desktop App Guide (Run Without Code Editor)

You can run Takarivo anytime directly from Windows without opening VS Code or any code editor.

---

## 1. How to Run from Desktop
1. Double-click the **Takarivo** shortcut on your Desktop (with the ৳ icon).
2. If the local server isn't already active:
   - A launcher will start the server in the background.
   - It will wait automatically until services are ready (~10-15s).
   - Once ready, the native borderless **Takarivo Desktop Window** opens automatically.
3. If the server is already active:
   - The desktop app window opens **instantly**.

---

## 2. Desktop Shortcut Setup
If you ever move folders or need to recreate the Desktop shortcut:
- Double-click `create-desktop-shortcut.bat` inside the project folder.

---

## 3. How to Stop the Background Server
When you are done and want to completely shut down the background server:
- Double-click `Stop-Takarivo.bat`.
