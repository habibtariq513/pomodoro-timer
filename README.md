# Pomodoro Timer with Daily History

A fully functional Pomodoro timer web app that helps you focus using the Pomodoro Technique (25 min focus, 5 min break). It tracks completed focus sessions for the current day, persists them in `localStorage`, and automatically resets at midnight.


## Live Demo
🔗 **https://habibtariq513.github.io/pomodoro-timer**

## How to Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/habibtariq513/pomodoro-timer.git
2. **Open the folder** containing `index.html`.
3. **Serve the files** using any static server. For example:
   - Using Python:  
     `python3 -m http.server 8000`  
     Then visit `http://localhost:8000`
   - Using VS Code Live Server extension
   - Or simply double-click `index.html` (though some browsers may restrict audio autoplay; a local server is recommended)

**Single command to run** (if you have `npx` installed):  
```bash
npx serve .
