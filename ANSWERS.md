```markdown
# Answers to Assessment Questions

## 1. How to run

**Local steps:**
- Clone the repo: `git clone https://github.com/habibtariq513/pomodoro-timer.git`
- Open a terminal in the project folder.
- Run `npx serve .` (requires Node.js) or `python3 -m http.server 8000`.
- Open `http://localhost:3000` (or `http://localhost:8000`) in a browser.

**Deployed URL:** https://habibtariq513.github.io/pomodoro-timer

---

## 2. Stack & design choices

**Why vanilla HTML/CSS/JS?**  
I chose a no‑framework stack because the Pomodoro timer is a self‑contained UI with moderate state (timer, phase, history). Vanilla JS keeps the bundle size minimal, avoids external dependencies, and makes the timer logic transparent. It also ensures the app runs instantly without any build step — important for a quick assessment.

**Design decision 1 – Timer takes ~60% of the card width**  
The `.timer-digits` font size uses `clamp(3.8rem, 18vw, 6rem)`. This makes the timer prominent on all screens. On a 1440px laptop, it grows to 6rem, becoming the clear focal point. On a 360px phone, it shrinks proportionally but still occupies ~60% of the card width, ensuring it's easily readable while leaving room for buttons and history. This hierarchy communicates "the timer is the most important element".

**Design decision 2 – Grid flex-wrap button group + config row**  
The button group uses `flex-wrap: wrap` with `gap: 0.9rem`. On narrow screens (360px), buttons stack into two rows instead of overflowing horizontally. The config row also wraps, so focus/break inputs remain usable without horizontal scroll. This choice directly addresses the assessment's request to resize the window — the UI reflows gracefully without media query overkill.

---

## 3. Responsive & accessibility

**Responsive behavior:**  
- **360px phone:** The card padding reduces, buttons become smaller, and the config inputs shrink to 60px width. The history list remains scrollable. The timer font scales down but stays legible. Everything fits without horizontal overflow.  
- **1440px laptop:** The card maxes at 800px, centered. Timer font scales up to 6rem. Buttons and config row are comfortably spaced. The history list shows up to ~5 items without scrolling.

**Accessibility consideration handled:**  
- **Keyboard focus states:** I added `:focus-visible` styles (orange outline) on all buttons and input fields. This helps keyboard users navigate and understand which element is active. Also, I used semantic `<button>` elements and included `aria-label` on control buttons.

**Accessibility knowingly skipped:**  
- **Screen reader announcements for timer ticks:** I chose not to implement live region updates for every second because that would be extremely noisy for screen reader users. Instead, the timer display updates visually and phase transitions are announced via badge text changes. With another day, I would add an optional setting to announce only phase completions.

---

## 4. AI usage

I used **GitHub Copilot** and **ChatGPT (GPT-4)** during development.

**Specific AI interactions:**

| Tool | Prompt / Task | What AI gave me | What I changed |
|------|---------------|----------------|----------------|
| ChatGPT | "Write a Pomodoro timer with start/pause/reset and daily history stored in localStorage" | A working timer but with a flat layout and no responsive design. | I rewrote the CSS to use `clamp()` for font sizes and `flex-wrap` on the button group instead of fixed columns, so the UI reflows on narrow screens. |
| ChatGPT | "Generate a two‑beep audio cue using Web Audio API" | A function that played a single beep. | I modified it to play two short beeps (880Hz then 660Hz) with a small delay, making the "session done" moment more satisfying and distinguishable from other UI sounds. |
| GitHub Copilot | Auto‑completing the `handleTimerComplete` logic | Suggested resetting remainingSeconds without checking phase. | I corrected it to transition correctly from focus→break and break→focus, and to call `addFocusSession` only after a focus completes, not after break. |

**Additional AI use:**  
- I asked ChatGPT to review my `localStorage` day‑reset logic and it pointed out that I wasn't checking the date on each page focus. I added a `window.addEventListener('focus')` to re‑validate the day when the user returns to the tab.

---

## 5. Honest gap

**One unpolished thing:** The audio beep requires a user gesture to unlock the Web Audio context. On first load, if the user starts the timer without clicking anywhere else, the beep may not play until after they've interacted. This is a browser autoplay policy limitation, not a bug, but it feels slightly awkward.

**How I would fix it with another day:**  
I would add a silent "audio test" button or a small UI hint ("Click anywhere to enable sound") that pre‑initializes the audio context. Alternatively, I could store a flag in `localStorage` indicating that the user has already interacted, and on subsequent visits automatically unlock audio without extra clicks. I'd also implement a fallback `new Audio()` beep using a base64-encoded sine wave for broader compatibility.