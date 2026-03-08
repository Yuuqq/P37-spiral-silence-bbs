/**
 * P37 沉默的螺旋：多智能体建模 (Agent-Based Modeling)
 * 学术重构版 (By Tsinghua Perspective)
 */

// DOM Elements
const canvas = document.getElementById("abmCanvas");
const ctx = canvas.getContext("2d");

const paramOpinionA = document.getElementById("paramOpinionA");
const paramRadius = document.getElementById("paramRadius");
const paramPressure = document.getElementById("paramPressure");
const paramHardcore = document.getElementById("paramHardcore");

const valOpinionA = document.getElementById("valOpinionA");
const valRadius = document.getElementById("valRadius");
const valPressure = document.getElementById("valPressure");
const valHardcore = document.getElementById("valHardcore");

const btnSetup = document.getElementById("btnSetup");
const btnPlay = document.getElementById("btnPlay");
const btnStep = document.getElementById("btnStep");

const statVocalA = document.getElementById("statVocalA");
const statVocalB = document.getElementById("statVocalB");
const statSilent = document.getElementById("statSilent");
const spiralAlert = document.getElementById("spiralAlert");

// Simulation State
let agents = [];
let isPlaying = false;
let animFrame;
let tickCount = 0;

// Configuration
const NUM_AGENTS = 250;
const CANVAS_W = 600;
const CANVAS_H = 400;
const AGENT_RADIUS = 5;

// Colors
const COLOR_A = "#ea4335";
const COLOR_B = "#4285f4";
const COLOR_SILENT = "#bdc1c6";
const COLOR_HARDCORE = "#fbbc04";

// Utilities
function randomPos(max) { return Math.random() * max; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// Update labels
function updateLabels() {
  valOpinionA.textContent = paramOpinionA.value + "%";
  valRadius.textContent = paramRadius.value;
  valPressure.textContent = paramPressure.value + "%";
  valHardcore.textContent = paramHardcore.value + "%";
}

[paramOpinionA, paramRadius, paramPressure, paramHardcore].forEach(el => {
  el.addEventListener("input", updateLabels);
});

// Initialize ABM
function setupEnvironment() {
  cancelAnimationFrame(animFrame);
  isPlaying = false;
  btnPlay.innerHTML = "▶️ 运行仿真";
  btnPlay.classList.replace("secondary", "success");
  spiralAlert.classList.add("hidden");
  tickCount = 0;

  const ratioA = parseInt(paramOpinionA.value) / 100;
  const hcRatio = parseInt(paramHardcore.value) / 100;

  agents = [];
  for (let i = 0; i < NUM_AGENTS; i++) {
    // Determine Opinion (A or B)
    const op = Math.random() < ratioA ? 'A' : 'B';

    // Determine if Hardcore (Never goes silent)
    const isHardcore = Math.random() < hcRatio;

    agents.push({
      id: i,
      x: randomPos(CANVAS_W),
      y: randomPos(CANVAS_H),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      opinion: op,         // True inner opinion
      isVocal: true,       // Initially everyone is vocal
      isHardcore: isHardcore,
      pressureFelt: 0
    });
  }

  draw();
  updateStats();
}

// Single discrete step of the ABM
function stepSimulation() {
  const radius = parseInt(paramRadius.value);
  const pressureThreshold = parseInt(paramPressure.value) / 100;

  let changed = 0;

  // For each agent, evaluate their perceived opinion climate
  agents.forEach(agent => {
    // Hardcore agents don't care, they stay vocal
    if (agent.isHardcore) return;
    // Already silent agents generally stay silent in classical spiral
    if (!agent.isVocal) return;

    let vocalA = 0;
    let vocalB = 0;

    // Scan perception radius
    agents.forEach(neighbor => {
      if (agent.id === neighbor.id) return;
      if (dist(agent, neighbor) < radius) {
        if (neighbor.isVocal) {
          if (neighbor.opinion === 'A') vocalA++;
          else vocalB++;
        }
      }
    });

    const totalVocal = vocalA + vocalB;
    if (totalVocal === 0) return; // No visible pressure

    // Calculate perceived fraction of OPOSING opinion
    let oposeFraction = 0;
    if (agent.opinion === 'A') oposeFraction = vocalB / totalVocal;
    if (agent.opinion === 'B') oposeFraction = vocalA / totalVocal;

    // Fall into silence if opposed by overwhelmingly visible majority
    if (oposeFraction > pressureThreshold) {
      // Add some randomness to human behavior
      if (Math.random() < 0.3) {
        agent.isVocal = false;
        changed++;
      }
    }
  });

  // Physical movement (random walk jitter)
  agents.forEach(agent => {
    agent.x += agent.vx;
    agent.y += agent.vy;

    // Bounce off walls
    if (agent.x < 0 || agent.x > CANVAS_W) agent.vx *= -1;
    if (agent.y < 0 || agent.y > CANVAS_H) agent.vy *= -1;

    agent.x = Math.max(0, Math.min(CANVAS_W, agent.x));
    agent.y = Math.max(0, Math.min(CANVAS_H, agent.y));
  });

  tickCount++;
  draw();
  updateStats();
  checkSpiral();
}

// Draw to Canvas
function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  agents.forEach(a => {
    ctx.beginPath();
    ctx.arc(a.x, a.y, AGENT_RADIUS, 0, Math.PI * 2);

    if (!a.isVocal) {
      ctx.fillStyle = COLOR_SILENT;
    } else {
      ctx.fillStyle = a.opinion === 'A' ? COLOR_A : COLOR_B;
    }

    ctx.fill();

    if (a.isHardcore) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = COLOR_HARDCORE;
      ctx.stroke();
    }
  });
}

// Update DOM stats
function updateStats() {
  let vA = 0, vB = 0, sil = 0;
  agents.forEach(a => {
    if (!a.isVocal) sil++;
    else if (a.opinion === 'A') vA++;
    else vB++;
  });

  statVocalA.textContent = vA;
  statVocalB.textContent = vB;
  statSilent.textContent = sil;
}

function checkSpiral() {
  // If one side has completely silenced the non-hardcore majority
  let vA = 0, vB = 0;
  agents.forEach(a => {
    if (a.isVocal) {
      if (a.opinion === 'A') vA++;
      else vB++;
    }
  });

  const totalVocal = vA + vB;
  if (totalVocal > 0) {
    if (vA / totalVocal > 0.95 || vB / totalVocal > 0.95) {
      // Spiral completed
      if (tickCount > 10) { // give it some time to form
        spiralAlert.classList.remove("hidden");
      }
    }
  }
}

// Game Loop
function loop() {
  if (!isPlaying) return;
  stepSimulation();
  animFrame = requestAnimationFrame(loop);
}

// Event Listeners
btnSetup.addEventListener("click", setupEnvironment);

btnStep.addEventListener("click", () => {
  isPlaying = false;
  btnPlay.innerHTML = "▶️ 继续仿真";
  btnPlay.classList.replace("secondary", "success");
  stepSimulation();
});

btnPlay.addEventListener("click", () => {
  isPlaying = !isPlaying;
  if (isPlaying) {
    btnPlay.innerHTML = "⏸️ 暂停";
    btnPlay.classList.replace("success", "secondary");
    loop();
  } else {
    btnPlay.innerHTML = "▶️ 继续仿真";
    btnPlay.classList.replace("secondary", "success");
    cancelAnimationFrame(animFrame);
  }
});

// Initialize on load
setupEnvironment();

// === PM Metrics Integration ===
(function () {
  try {
    if (!window.pmMetrics) return;
    let taskStarted = false;
    document.addEventListener('click', function (e) {
      if (taskStarted) return;
      const btn = e.target.closest('button, input');
      if (btn) {
        taskStarted = true;
        window.pmMetrics.markTaskStart('spiral_abm_task');
      }
    }, { once: false });
  } catch (_e) { }
})();
