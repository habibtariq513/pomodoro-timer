// ------------------- DOM elements ------------------
const timerDisplay = document.getElementById('timerDisplay');
const phaseBadge = document.getElementById('phaseBadge');
const phaseLabel = document.getElementById('phaseLabel');
const stateIndicator = document.getElementById('stateIndicator');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const resetBtn = document.getElementById('resetBtn');

const focusInput = document.getElementById('focusInput');
const breakInput = document.getElementById('breakInput');
const historyContainer = document.getElementById('historyListContainer');

// ------------------- Timer state -------------------
let currentPhase = 'focus';        // 'focus' or 'break'
let remainingSeconds = 25 * 60;    // default 25 min
let timerInterval = null;
let isRunning = false;              // timer actively ticking

let focusMinutes = 25;
let breakMinutes = 5;

// ------------------- Audio (Web Audio with user gesture unlock) -------------
let audioCtx = null;

function initAudio() {
    if (audioCtx) return audioCtx;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx;
    } catch(e) {
        console.warn("Web Audio not supported");
        return null;
    }
}

// small beep: two short beeps (pleasant but noticeable)
function playBeep() {
    if (!audioCtx) {
        initAudio();
    }
    if (!audioCtx) return;
    // resume if suspended (user interaction required)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            actuallyBeep();
        }).catch(e => console.log("audio resume failed"));
    } else {
        actuallyBeep();
    }
}

function actuallyBeep() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.frequency.value = 880;
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc1.start();
    osc1.stop(now + 0.35);
    
    // second short beep after 0.2 sec
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.frequency.value = 660;
    gain2.gain.setValueAtTime(0.18, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.7);
}

// Unlock audio on any user interaction (first click)
function unlockAudioOnUserGesture() {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(e=>console.log);
    } else if (!audioCtx) {
        initAudio()?.resume();
    }
}
// attach unlock to all buttons & inputs
const interactiveElements = [startBtn, pauseBtn, resumeBtn, resetBtn, focusInput, breakInput];
interactiveElements.forEach(el => {
    if (el) el.addEventListener('click', unlockAudioOnUserGesture, { once: false });
    if (el && el.tagName === 'INPUT') el.addEventListener('focus', unlockAudioOnUserGesture);
});
window.addEventListener('touchstart', unlockAudioOnUserGesture, { once: true });
window.addEventListener('click', unlockAudioOnUserGesture, { once: true });

// ------------------- Helper: update UI from state -----------------
function updateTimerDisplay() {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updatePhaseUI() {
    if (currentPhase === 'focus') {
        phaseBadge.textContent = '🍅 FOCUS SESSION';
        phaseLabel.textContent = 'Deep work · stay focused';
    } else {
        phaseBadge.textContent = '🌿 BREAK TIME';
        phaseLabel.textContent = 'Rest & recharge';
    }
    timerDisplay.style.textShadow = currentPhase === 'focus' ? '0 0 4px #68c4ff40' : '0 0 4px #86e0a040';
}

function updateStateIndicator() {
    if (isRunning) {
        stateIndicator.innerHTML = '⏵ RUNNING · ticking';
        stateIndicator.style.color = '#8bcb8f';
    } else if (timerInterval === null && remainingSeconds > 0 && !isRunning) {
        stateIndicator.innerHTML = '⏸ PAUSED / IDLE';
        stateIndicator.style.color = '#e6c384';
    } else if (remainingSeconds === 0) {
        stateIndicator.innerHTML = '⚡ SESSION END';
    } else {
        stateIndicator.innerHTML = '● IDLE';
        stateIndicator.style.color = '#b0c4de';
    }
}

// disable/enable config inputs based on timer running
function setConfigInputsEnabled(enabled) {
    focusInput.disabled = !enabled;
    breakInput.disabled = !enabled;
}

// ------------------- LocalStorage: Daily History -----------------
const STORAGE_KEY = 'pomodoro_daily_history';

function getTodayDateStr() {
    const today = new Date();
    return today.toISOString().slice(0,10); // YYYY-MM-DD
}

function loadHistory() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { date: getTodayDateStr(), sessions: [] };
    try {
        const data = JSON.parse(stored);
        if (data.date === getTodayDateStr()) {
            return data;
        } else {
            // new day: reset history
            return { date: getTodayDateStr(), sessions: [] };
        }
    } catch(e) {
        return { date: getTodayDateStr(), sessions: [] };
    }
}

function saveHistory(historyObj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historyObj));
}

// add a completed focus session (called only when focus timer naturally ends)
function addFocusSession(durationMinutes) {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = `${hours}:${minutes.toString().padStart(2,'0')} ${ampm}`;
    
    let history = loadHistory();
    const today = getTodayDateStr();
    if (history.date !== today) {
        history = { date: today, sessions: [] };
    }
    const sessionEntry = {
        time: timeStr,
        duration: `${durationMinutes}:00`,
        timestamp: now.getTime(),
        label: `${durationMinutes} min focus`
    };
    history.sessions.push(sessionEntry);
    saveHistory(history);
    renderHistoryList();
}

function renderHistoryList() {
    const history = loadHistory();
    const sessions = history.sessions;
    if (!sessions.length) {
        historyContainer.innerHTML = '<div class="empty-history">🍃 No completed pomodoros today. Start focusing!</div>';
        return;
    }
    // show newest first (recent on top)
    const reversed = [...sessions].reverse();
    historyContainer.innerHTML = reversed.map(sess => `
        <div class="history-item">
            <span>✓ ${sess.duration} focus</span>
            <span class="history-time">🕒 ${sess.time}</span>
        </div>
    `).join('');
}

function checkAndResetMidnight() {
    const history = loadHistory();
    const today = getTodayDateStr();
    if (history.date !== today) {
        const freshHistory = { date: today, sessions: [] };
        saveHistory(freshHistory);
        renderHistoryList();
    }
}

// ------------------- Timer core logic -----------------
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isRunning = false;
    updateStateIndicator();
    setConfigInputsEnabled(true);
}

function startTimer() {
    if (timerInterval) stopTimer();
    if (remainingSeconds <= 0) {
        handleTimerComplete();
        return;
    }
    isRunning = true;
    updateStateIndicator();
    setConfigInputsEnabled(false);
    
    timerInterval = setInterval(() => {
        if (!isRunning) return;
        if (remainingSeconds <= 0) {
            stopTimer();
            handleTimerComplete();
        } else {
            remainingSeconds--;
            updateTimerDisplay();
            if (remainingSeconds === 0) {
                stopTimer();
                handleTimerComplete();
            }
        }
    }, 1000);
}

function handleTimerComplete() {
    playBeep();
    
    if (currentPhase === 'focus') {
        addFocusSession(focusMinutes);
        currentPhase = 'break';
        remainingSeconds = breakMinutes * 60;
        updateTimerDisplay();
        updatePhaseUI();
        startTimer();
    } 
    else if (currentPhase === 'break') {
        currentPhase = 'focus';
        remainingSeconds = focusMinutes * 60;
        updateTimerDisplay();
        updatePhaseUI();
        startTimer();
    }
    updateStateIndicator();
}

function pauseTimer() {
    if (isRunning && timerInterval) {
        stopTimer();
        updateStateIndicator();
        setConfigInputsEnabled(true);
    }
}

function resumeTimer() {
    if (!isRunning && remainingSeconds > 0) {
        startTimer();
    } else if (remainingSeconds <= 0) {
        if (currentPhase === 'focus') remainingSeconds = focusMinutes * 60;
        else remainingSeconds = breakMinutes * 60;
        updateTimerDisplay();
        startTimer();
    }
}

function resetTimer() {
    stopTimer();
    currentPhase = 'focus';
    focusMinutes = parseInt(focusInput.value, 10);
    breakMinutes = parseInt(breakInput.value, 10);
    if (isNaN(focusMinutes) || focusMinutes < 1) focusMinutes = 25;
    if (isNaN(breakMinutes) || breakMinutes < 1) breakMinutes = 5;
    focusInput.value = focusMinutes;
    breakInput.value = breakMinutes;
    
    remainingSeconds = focusMinutes * 60;
    updateTimerDisplay();
    updatePhaseUI();
    isRunning = false;
    updateStateIndicator();
    setConfigInputsEnabled(true);
}

function syncDurationsFromInputs() {
    let newFocus = parseInt(focusInput.value, 10);
    let newBreak = parseInt(breakInput.value, 10);
    if (isNaN(newFocus)) newFocus = 25;
    if (isNaN(newBreak)) newBreak = 5;
    focusMinutes = Math.min(99, Math.max(1, newFocus));
    breakMinutes = Math.min(99, Math.max(1, newBreak));
    focusInput.value = focusMinutes;
    breakInput.value = breakMinutes;
    
    if (!isRunning && timerInterval === null) {
        if (currentPhase === 'focus') {
            remainingSeconds = focusMinutes * 60;
        } else if (currentPhase === 'break') {
            remainingSeconds = breakMinutes * 60;
        }
        updateTimerDisplay();
    }
}

function onFocusInputChange() {
    syncDurationsFromInputs();
    if (!isRunning && currentPhase === 'focus') {
        remainingSeconds = focusMinutes * 60;
        updateTimerDisplay();
    }
}

function onBreakInputChange() {
    syncDurationsFromInputs();
    if (!isRunning && currentPhase === 'break') {
        remainingSeconds = breakMinutes * 60;
        updateTimerDisplay();
    }
}

// ------------------- Initialization -----------------
function init() {
    syncDurationsFromInputs();
    remainingSeconds = focusMinutes * 60;
    currentPhase = 'focus';
    updateTimerDisplay();
    updatePhaseUI();
    updateStateIndicator();
    setConfigInputsEnabled(true);
    renderHistoryList();
    checkAndResetMidnight();
    
    startBtn.addEventListener('click', () => {
        if (!isRunning) {
            if (remainingSeconds <= 0) {
                remainingSeconds = focusMinutes * 60;
                currentPhase = 'focus';
                updatePhaseUI();
                updateTimerDisplay();
            }
            startTimer();
        }
    });
    pauseBtn.addEventListener('click', pauseTimer);
    resumeBtn.addEventListener('click', resumeTimer);
    resetBtn.addEventListener('click', resetTimer);
    focusInput.addEventListener('change', onFocusInputChange);
    breakInput.addEventListener('change', onBreakInputChange);
    
    window.addEventListener('focus', () => {
        checkAndResetMidnight();
        renderHistoryList();
    });
    setInterval(() => {
        checkAndResetMidnight();
        renderHistoryList();
    }, 60000);
}

init();