// ── Config ─────────────────────────────────────────────────
const Config = {
	timer: {
		workTime: 25,
		breakTime: 5,
		longBreakTime: 15,
	},
};

const SESSIONS = ["work", "shortBreak", "work", "shortBreak", "work", "shortBreak", "work", "longBreak"];
const SESSION_LABELS = { work: "Work", shortBreak: "Short Break", longBreak: "Long Break" };
const SECOND = 1000;

// ── DOM refs ───────────────────────────────────────────────
const timerField = document.querySelector("#timer-display");
const startBtn = document.querySelector("#start-btn");
const settingsPanel = document.querySelector("#settings-panel");
const settingsOverlay = document.querySelector("#settings-overlay");

// ── State ──────────────────────────────────────────────────
let interval = null;
let running = false;
let endTime = null;
let totalTime = 0;
let timeRemaining = 0;
let sessionIndex = 0;
let pomodoroCount = 0;

// ── Audio ──────────────────────────────────────────────────
const clickAudio = new Audio("bry.mp3");
const finishAudio = [new Audio("yaaha.mp3"), new Audio("unanan.mp3")];

function playButtonClick() {
	clickAudio.play();
}

function playSessionFinish() {
	const random = finishAudio[Math.floor(Math.random() * finishAudio.length)];
	random.play();
}

// ── Session ────────────────────────────────────────────────
function currentSessionType() {
	return SESSIONS[sessionIndex % SESSIONS.length];
}

function currentSessionTime() {
	const type = currentSessionType();
	if (type === "work") return Config.timer.workTime * 60;
	if (type === "shortBreak") return Config.timer.breakTime * 60;
	if (type === "longBreak") return Config.timer.longBreakTime * 60;
}

function updateSessionUI() {
	document.querySelector("#session-label").textContent = SESSION_LABELS[currentSessionType()];
	document.querySelectorAll(".dot").forEach((dot, i) => {
		dot.classList.toggle("filled", i < (pomodoroCount % 4 === 0 && pomodoroCount > 0 ? 4 : pomodoroCount % 4));
	});
}

function sessionComplete() {
	if (currentSessionType() === "work") pomodoroCount++;
	sessionIndex++;
	resetTimer();
	updateSessionUI();
	playSessionFinish();
	sendNotification();
}

// ── Timer ──────────────────────────────────────────────────
function inMinutes(seconds) {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function updateTimerDisplay() {
	timerField.textContent = inMinutes(timeRemaining);
	document.title = `${inMinutes(timeRemaining)} — ${SESSION_LABELS[currentSessionType()]}`;
}

function tick() {
	const remaining = Math.round((endTime - Date.now()) / 1000);
	if (remaining <= 0) {
		timeRemaining = 0;
		updateTimerDisplay();
		clearInterval(interval);
		running = false;
		sessionComplete();
	} else {
		timeRemaining = remaining;
		updateTimerDisplay();
	}
}

function toggleTimer() {
	if (running) {
		running = false;
		clearInterval(interval);
		totalTime = timeRemaining;
		startBtn.textContent = "Start";
		startBtn.classList.add("paused");
		timerField.classList.remove("running");
	} else {
		running = true;
		endTime = Date.now() + timeRemaining * 1000;
		interval = setInterval(tick, SECOND);
		startBtn.textContent = "Pause";
		startBtn.classList.remove("paused");
		timerField.classList.add("running");
	}
}

function resetTimer() {
	running = false;
	clearInterval(interval);
	totalTime = currentSessionTime();
	timeRemaining = totalTime;
	endTime = null;
	timerField.textContent = inMinutes(totalTime);
	startBtn.textContent = "Start";
	startBtn.classList.add("paused");
	timerField.classList.remove("running");
	document.title = `${inMinutes(totalTime)} — ${SESSION_LABELS[currentSessionType()]}`;
}

function fullReset() {
	sessionIndex = 0;
	pomodoroCount = 0;
	resetTimer();
	updateSessionUI();
}

// ── Settings ───────────────────────────────────────────────
function openSettings() {
	document.querySelector("#input-work").value = Config.timer.workTime;
	document.querySelector("#input-break").value = Config.timer.breakTime;
	document.querySelector("#input-long").value = Config.timer.longBreakTime;
	settingsPanel.classList.add("open");
	settingsOverlay.classList.add("open");
}

function closeSettings() {
	settingsPanel.classList.remove("open");
	settingsOverlay.classList.remove("open");
}

function applySettings() {
	const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
	Config.timer.workTime = clamp(parseInt(document.querySelector("#input-work").value) || Config.timer.workTime, 1, 99);
	Config.timer.breakTime = clamp(parseInt(document.querySelector("#input-break").value) || Config.timer.breakTime, 1, 99);
	Config.timer.longBreakTime = clamp(parseInt(document.querySelector("#input-long").value) || Config.timer.longBreakTime, 1, 99);
	saveSettings();
	resetTimer();
	closeSettings();
}

// ── Persistence ────────────────────────────────────────────
function saveSettings() {
	localStorage.setItem("pomodoroConfig", JSON.stringify(Config.timer));
}

function loadSettings() {
	const saved = localStorage.getItem("pomodoroConfig");
	if (!saved) return;
	const parsed = JSON.parse(saved);
	Config.timer.workTime = parsed.workTime ?? Config.timer.workTime;
	Config.timer.breakTime = parsed.breakTime ?? Config.timer.breakTime;
	Config.timer.longBreakTime = parsed.longBreakTime ?? Config.timer.longBreakTime;
}

// ── Notifications ──────────────────────────────────────────
async function requestNotificationPermission() {
	if (!("Notification" in window)) return;
	if (Notification.permission === "default") await Notification.requestPermission();
}

function sendNotification() {
	if (!("Notification" in window) || Notification.permission !== "granted") return;
	const messages = {
		work: { title: "Back to work! 🐰", body: "Break's over — let's get focused." },
		shortBreak: { title: "Take a short break! 🐰", body: "You earned it — stretch your legs." },
		longBreak: { title: "Take a long break! 🐰", body: "4 pomodoros done — go rest properly!" },
	};
	const { title, body } = messages[currentSessionType()];
	new Notification(title, { body, icon: "base.png" });
}

// ── Event listeners ────────────────────────────────────────
document.querySelector("#start-btn").addEventListener("click", toggleTimer);
document.querySelector("#reset-btn").addEventListener("click", fullReset);
document.querySelector("#settings-btn").addEventListener("click", openSettings);
document.querySelector("#settings-close").addEventListener("click", closeSettings);
document.querySelector("#settings-apply").addEventListener("click", applySettings);
settingsOverlay.addEventListener("click", closeSettings);

document.querySelectorAll(".container button").forEach((btn) => {
	btn.addEventListener("click", playButtonClick);
});

// ── Init ───────────────────────────────────────────────────
loadSettings();
fullReset();
requestNotificationPermission();
