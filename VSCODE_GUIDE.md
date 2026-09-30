# How to Run in VS Code (Visual Studio Code Mein Kaise Chalayein)

Follow these simple steps to run this project on your computer using VS Code:

---

### Step 1: Open the Project in VS Code
1. Open **Visual Studio Code**.
2. Click **File > Open Folder...** (या Ctrl + K, Ctrl + O).
3. Select this project root folder (jahan `package.json` aur `server.ts` hain).

---

### Step 2: Open Terminal in VS Code
- Press: **Ctrl + `** (backtick) or go to top menu **Terminal > New Terminal**.

---

### Step 3: Install Dependencies
Type the following command in the terminal and press Enter:
```bash
npm install
```
*(Wait 1-2 minutes for all packages to install).*

---

### Step 4: Run the Application
You have two easy ways to run:

#### Option A: Using Terminal (Recommended)
```bash
npm run dev
```

#### Option B: Using VS Code 1-Click Debugger
- Press **F5** on your keyboard (or click the **Run & Debug** play button on the left sidebar and choose **"Run Full-Stack Dev Server"**).

---

### Step 5: Open in Your Browser
Once you see:
```text
================================================================
 NMIMS AI Admission Voice Assistant Backend Active on Port 3000
 Campus: SVKM NMIMS Global University, Dhule
================================================================
```
Open your browser (Chrome or Edge recommended) and go to:
👉 **http://localhost:3000**

---

### Useful Commands in VS Code Terminal:
| Command | What it does |
| :--- | :--- |
| `npm run dev` | Starts full-stack server (Backend API + WebSocket + React Frontend) |
| `npm run test` | Runs the 32 automated verification tests |
| `npm run build` | Builds production frontend into `dist/` |
| `npm run lint` | Checks TypeScript for syntax and type safety |

---

### Notes:
- **Port**: The application runs on port `3000`. If port 3000 is busy on your machine, you can change `PORT=3000` to `PORT=3001` in `.env`.
- **Microphone Access**: When opening in Chrome, click **"Allow"** when Chrome asks for microphone access so the female voice assistant can hear your speech.
- **Gemini API Key (Optional)**: If you have a Google Gemini API key, you can paste it in `.env` (`GEMINI_API_KEY=your_key`). If you don't have one, don't worry—the system already includes an intelligent built-in conversational admission engine!
