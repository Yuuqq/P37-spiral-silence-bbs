/**
 * P37 沉默的螺旋互动论坛模拟
 * - 私下观点 vs 可见舆论气候（前 N 条热帖）
 * - 点赞/点踩 + 可见度衰减（热度排序/衰减）
 * - 恐惧孤立驱动发帖概率（教学演示，不做现实预测）
 */

// DOM
const el = {
  paramOpinionA: document.getElementById("paramOpinionA"),
  valOpinionA: document.getElementById("valOpinionA"),
  paramFear: document.getElementById("paramFear"),
  valFear: document.getElementById("valFear"),
  paramConformity: document.getElementById("paramConformity"),
  valConformity: document.getElementById("valConformity"),
  paramAttention: document.getElementById("paramAttention"),
  valAttention: document.getElementById("valAttention"),
  paramMediaBias: document.getElementById("paramMediaBias"),
  valMediaBias: document.getElementById("valMediaBias"),
  paramHardcore: document.getElementById("paramHardcore"),
  valHardcore: document.getElementById("valHardcore"),
  btnReset: document.getElementById("btnReset"),
  btnPlay: document.getElementById("btnPlay"),
  btnStep: document.getElementById("btnStep"),
  btnNudgeA: document.getElementById("btnNudgeA"),
  btnNudgeB: document.getElementById("btnNudgeB"),
  status: document.getElementById("status"),
  meterPrivateA: document.getElementById("meterPrivateA"),
  meterPrivateB: document.getElementById("meterPrivateB"),
  meterVisibleA: document.getElementById("meterVisibleA"),
  meterVisibleB: document.getElementById("meterVisibleB"),
  labelPrivate: document.getElementById("labelPrivate"),
  labelVisible: document.getElementById("labelVisible"),
  labelPosts: document.getElementById("labelPosts"),
  labelSilent: document.getElementById("labelSilent"),
  chart: document.getElementById("chartCanvas"),
  labelTick: document.getElementById("labelTick"),
  labelClimate: document.getElementById("labelClimate"),
  postList: document.getElementById("postList"),
  insightText: document.getElementById("insightText"),
  spiralAlert: document.getElementById("spiralAlert")
};

// Constants
const NUM_AGENTS = 320;
const MAX_POSTS_STORE = 260;
const MAX_POSTS_RENDER = 34;
const MAX_HISTORY = 180;
const TICK_MS = 520;
const TASK_NAME = "spiral_silence_forum_task";

// Text pool (deliberately neutral/academic tone)
const POST_TEMPLATES = {
  A: [
    "我支持 A，但想补充一个前提：如果只看热点，很容易误判真实分布。",
    "从成本收益看，A 方案的外部性被低估了，建议把影响拆到可核查指标上。",
    "数据口径要一致。A 的优势可能来自统计方式差异，不要用情绪盖过方法。",
    "如果承认不确定性，A 的论证链条目前更完整：因果、机制与边界条件更清晰。",
    "把反例也放进来讨论：A 并不等于完美，但它在当前约束下更可行。"
  ],
  B: [
    "我更倾向 B，但这里说一句就好：在这种氛围里表达异议成本太高了。",
    "B 的担忧不是立场问题，是风险管理：不确定性越大，越该保守。",
    "提醒一下：高票不等于真理。少数意见被压下去，反而更需要被看见。",
    "如果只剩一种声音，那就是信息被筛过了。B 的问题值得单独拆解。",
    "我不反对讨论 A，但请别把质疑等同于敌意。B 视角是补全盲区。"
  ]
};

// State
const state = {
  running: false,
  timer: null,
  tick: 0,
  agents: [],
  posts: [],
  history: [],
  lastTickPostsA: 0,
  lastTickPostsB: 0,
  spiralCounter: 0,
  spiralTriggered: false,
  pmStarted: false
};

// Utils
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function pct(n) { return `${Math.round(n * 100)}%`; }

function getUiConfig() {
  const opinionA = parseInt(el.paramOpinionA.value, 10) / 100;
  const fearPct = parseInt(el.paramFear.value, 10) / 100;
  const conformityPct = parseInt(el.paramConformity.value, 10) / 100;
  const attention = parseInt(el.paramAttention.value, 10);
  const mediaBias = parseInt(el.paramMediaBias.value, 10); // -50..50
  const hardcore = parseInt(el.paramHardcore.value, 10) / 100;

  return {
    opinionA,
    fearPct,
    conformityPct,
    attention,
    mediaBias,
    hardcore,
    // Internal tunables (kept deterministic enough for teaching)
    baseSpeakRate: 0.38,
    fearStrength: lerp(0, 6.8, fearPct),
    courageWeight: 1.2,
    mediaWeight: 0.28,
    voteEngagement: 0.42,
    voterSample: 54,
    downvoteBias: lerp(1.0, 2.6, conformityPct), // penalty multiplier in ranking
    decayRate: lerp(0.16, 0.34, conformityPct), // higher conformity => faster burying
    shadowThreshold: lerp(-2.4, -0.4, conformityPct),
    shadowSharpness: 1.05,
    maxNewPostsPerTick: 8,
    silentProbThreshold: 0.08
  };
}

function updateValueLabels() {
  el.valOpinionA.textContent = `${el.paramOpinionA.value}%`;
  el.valFear.textContent = `${el.paramFear.value}%`;
  el.valConformity.textContent = `${el.paramConformity.value}%`;
  el.valAttention.textContent = el.paramAttention.value;
  el.valMediaBias.textContent = el.paramMediaBias.value;
  el.valHardcore.textContent = `${el.paramHardcore.value}%`;
}

function mediaSignalA(cfg) {
  // mediaBias = -50..50 maps to perceived share A
  return clamp(0.5 + (cfg.mediaBias / 100), 0.02, 0.98);
}

function speakProbability(agent, perceivedA, cfg) {
  if (agent.hardcore) return 0.92;

  const support = agent.stance === "A" ? perceivedA : (1 - perceivedA); // 0..1
  const delta = (support - 0.5) * 2; // -1..1
  const courage = (agent.courage - 0.5) * 2; // -1..1
  const z = delta * cfg.fearStrength + courage * cfg.courageWeight;
  return clamp(cfg.baseSpeakRate * sigmoid(z), 0, 1);
}

function postRankScore(post, tick, cfg) {
  const age = tick - post.t;
  const weighted = post.up - (post.down * cfg.downvoteBias);
  return weighted - age * cfg.decayRate;
}

function postVisibility(rank, cfg) {
  const v = sigmoid((rank - cfg.shadowThreshold) * cfg.shadowSharpness);
  return clamp(v, 0, 1);
}

function getVisibleWindow(cfg) {
  if (!state.posts.length) return [];
  const sorted = [...state.posts].sort((a, b) => b.rank - a.rank);
  return sorted.slice(0, cfg.attention);
}

function perceivedClimateA(cfg) {
  const windowPosts = getVisibleWindow(cfg);
  let a = 0;
  let b = 0;
  for (const p of windowPosts) {
    if (p.stance === "A") a++;
    else b++;
  }
  const fromPosts = (a + b) > 0 ? (a / (a + b)) : 0.5;
  if (!windowPosts.length) return mediaSignalA(cfg);
  return clamp(lerp(fromPosts, mediaSignalA(cfg), cfg.mediaWeight), 0.01, 0.99);
}

function makeAgents(cfg) {
  const agents = [];
  for (let i = 0; i < NUM_AGENTS; i++) {
    const stance = Math.random() < cfg.opinionA ? "A" : "B";
    const hardcore = Math.random() < cfg.hardcore;
    // Courage: most people are moderate; hardcore gets a boost
    const courage = clamp((Math.random() + Math.random()) / 2 + (hardcore ? 0.22 : 0), 0, 1);
    agents.push({ id: i, stance, hardcore, courage, lastSpeakP: 0 });
  }
  return agents;
}

function makePost(stance, tick, meta) {
  const authorId = meta?.authorId ?? Math.floor(Math.random() * NUM_AGENTS);
  const isInjected = !!meta?.injected;
  const baseText = pick(POST_TEMPLATES[stance]);
  const text = isInjected ? `【置顶投放】${baseText}` : baseText;
  const up = meta?.seedUp ?? 0;
  const down = meta?.seedDown ?? 0;

  return {
    id: `${tick}-${Math.random().toString(16).slice(2)}`,
    stance,
    t: tick,
    authorId,
    text,
    up,
    down,
    rank: 0,
    vis: 1
  };
}

function recomputePostScores(cfg) {
  for (const p of state.posts) {
    p.rank = postRankScore(p, state.tick, cfg);
    p.vis = postVisibility(p.rank, cfg);
  }
}

function pickWeighted(posts, weightFn) {
  let total = 0;
  const weights = new Array(posts.length);
  for (let i = 0; i < posts.length; i++) {
    const w = Math.max(0, weightFn(posts[i]));
    weights[i] = w;
    total += w;
  }
  if (total <= 0) return posts[Math.floor(Math.random() * posts.length)];
  let r = Math.random() * total;
  for (let i = 0; i < posts.length; i++) {
    r -= weights[i];
    if (r <= 0) return posts[i];
  }
  return posts[posts.length - 1];
}

function simulateVotes(perceivedA, cfg) {
  const windowPosts = getVisibleWindow(cfg);
  if (!windowPosts.length) return;

  const voters = cfg.voterSample;
  for (let i = 0; i < voters; i++) {
    if (Math.random() > cfg.voteEngagement) continue;
    const voter = state.agents[Math.floor(Math.random() * state.agents.length)];
    const support = voter.stance === "A" ? perceivedA : (1 - perceivedA);
    const confidence = sigmoid((support - 0.5) * 9); // 0..1

    const target = pickWeighted(windowPosts, (p) => (0.12 + p.vis) / (1 + (state.tick - p.t) * 0.08));
    const aligned = voter.stance === target.stance;

    if (aligned) {
      const pUp = clamp(0.18 + 0.60 * confidence, 0, 0.92);
      if (Math.random() < pUp) target.up += 1;
    } else {
      const pileOn = target.rank < 0 ? 0.10 : 0;
      const pDown = clamp((0.10 + 0.70 * confidence) * (0.35 + 0.65 * cfg.conformityPct) + pileOn, 0, 0.98);
      if (Math.random() < pDown) target.down += 1;
    }
  }
}

function recordHistory(privateA, visibleA, speakA, silentRate) {
  state.history.push({ privateA, visibleA, speakA, silentRate });
  if (state.history.length > MAX_HISTORY) state.history.shift();
}

function spiralCheck(privateA, visibleA, silentRate) {
  const diverged = Math.abs(visibleA - privateA) >= 0.22;
  const silenced = silentRate >= 0.55;
  const dominated = (visibleA >= 0.93) || (visibleA <= 0.07);

  if (state.tick >= 12 && ((diverged && silenced) || dominated)) state.spiralCounter += 1;
  else state.spiralCounter = Math.max(0, state.spiralCounter - 1);

  if (!state.spiralTriggered && state.spiralCounter >= 12) {
    state.spiralTriggered = true;
    el.spiralAlert.classList.remove("hidden");
    setStatus("沉默的螺旋已形成：可见舆论长期背离真实分布。你可以尝试提高“注意力窗口”或“死硬派比例”。");

    try {
      if (window.pmMetrics) window.pmMetrics.markTaskComplete(TASK_NAME, { tick: state.tick });
    } catch (_e) { }
  }
}

function setStatus(text) {
  el.status.textContent = `状态：${text}`;
}

function updateInsight(privateA, visibleA, silentRate, cfg) {
  const d = visibleA - privateA;
  const absD = Math.abs(d);
  const direction = d >= 0 ? "A" : "B";

  let text = "";
  if (absD < 0.08) {
    text = "目前可见舆论与私下分布接近，个体对“意见气候”的估计相对可靠。";
  } else if (absD < 0.18) {
    text = `可见舆论开始偏向 ${direction}，这会让另一方更担心孤立，从而降低发声概率。`;
  } else {
    text = `可见舆论显著偏向 ${direction}，即使私下并非压倒性多数，也会造成强烈的“多数错觉”。`;
  }

  if (silentRate >= 0.60) text += " 当前大量个体处于“有效沉默”状态，螺旋更容易自我强化。";
  if (Math.abs(cfg.mediaBias) >= 20) text += " 媒体偏置作为外部信号在放大这种气候。";

  el.insightText.textContent = text;
}

function renderMeters(privateA, visibleA) {
  el.meterPrivateA.style.width = `${Math.round(privateA * 100)}%`;
  el.meterPrivateB.style.width = `${Math.round((1 - privateA) * 100)}%`;
  el.labelPrivate.textContent = `A ${pct(privateA)} · B ${pct(1 - privateA)}`;

  el.meterVisibleA.style.width = `${Math.round(visibleA * 100)}%`;
  el.meterVisibleB.style.width = `${Math.round((1 - visibleA) * 100)}%`;
  el.labelVisible.textContent = `A ${pct(visibleA)} · B ${pct(1 - visibleA)}`;
}

function renderTopLabels(visibleA) {
  el.labelTick.textContent = `t = ${state.tick}`;
  el.labelClimate.textContent = `意见气候：A ${pct(visibleA)}`;
}

function renderPosts(cfg) {
  if (!state.posts.length) {
    el.postList.innerHTML = `<div class="post" data-stance="A" role="listitem" style="opacity:.85">
      <div class="post-head">
        <div class="badge"><span class="stance">i</span><span>提示</span></div>
        <div class="vis">从 t=0 开始</div>
      </div>
      <p class="post-body">点击“运行”后，系统会根据当前参数自动生成帖子并模拟点赞/点踩。你也可以直接对帖子进行干预。</p>
      <div class="post-foot">
        <span class="score">可见度由热度排序决定</span>
        <span class="vis">前 N 条热帖 = 你的“窗口”</span>
      </div>
    </div>`;
    return;
  }

  const sorted = [...state.posts].sort((a, b) => b.rank - a.rank).slice(0, MAX_POSTS_RENDER);
  const parts = [];
  for (const p of sorted) {
    const shadowed = p.vis < 0.26;
    const net = p.up - p.down;
    const visPct = Math.round(p.vis * 100);
    const author = (p.authorId === -1) ? "系统" : `用户#${p.authorId}`;
    const stanceLabel = p.stance;

    parts.push(`
      <article class="post ${shadowed ? "is-shadowed" : ""}" data-stance="${p.stance}" data-id="${p.id}" role="listitem">
        <div class="post-head">
          <div class="badge">
            <span class="stance">${stanceLabel}</span>
            <span>t=${p.t}</span>
            <span class="dotsep">·</span>
            <span>${author}</span>
          </div>
          <div class="vis">可见度 ${visPct}%</div>
        </div>
        <p class="post-body">${escapeHtml(p.text)}</p>
        <div class="post-foot">
          <div class="votes" aria-label="投票">
            <button type="button" class="vote-btn" data-vote="up" data-id="${p.id}" aria-label="点赞">赞 ${p.up}</button>
            <button type="button" class="vote-btn" data-vote="down" data-id="${p.id}" aria-label="点踩">踩 ${p.down}</button>
            <span class="score" aria-label="净票">净票 ${net}</span>
          </div>
          <div class="vis" aria-label="热度">热度 ${p.rank.toFixed(1)}</div>
        </div>
      </article>
    `);
  }
  el.postList.innerHTML = parts.join("");

  // Also cap stored posts to avoid unbounded growth
  if (state.posts.length > MAX_POSTS_STORE) {
    state.posts.sort((a, b) => a.t - b.t);
    state.posts = state.posts.slice(-MAX_POSTS_STORE);
    recomputePostScores(cfg);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function resizeCanvasToDisplaySize(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    return true;
  }
  return false;
}

function drawChart() {
  if (!el.chart) return;
  resizeCanvasToDisplaySize(el.chart);
  const ctx = el.chart.getContext("2d");
  if (!ctx) return;

  const w = el.chart.width;
  const h = el.chart.height;
  ctx.clearRect(0, 0, w, h);

  const pad = Math.round(14 * (window.devicePixelRatio || 1));
  const left = pad + 22;
  const top = pad;
  const right = w - pad;
  const bottom = h - pad - 14;
  const cw = right - left;
  const ch = bottom - top;

  const data = state.history;
  if (!data.length) {
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.font = `${Math.round(12 * (window.devicePixelRatio || 1))}px sans-serif`;
    ctx.fillText("等待数据…", left, top + 18);
    return;
  }

  // Background
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.03)";
  ctx.fillRect(left, top, cw, ch);
  ctx.restore();

  // Grid + labels
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,.08)";
  ctx.lineWidth = 1;
  ctx.font = `${Math.round(11 * (window.devicePixelRatio || 1))}px sans-serif`;
  ctx.fillStyle = "rgba(0,0,0,.35)";
  for (let i = 0; i <= 4; i++) {
    const y = top + (ch * i) / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    const val = (1 - i / 4).toFixed(2);
    ctx.fillText(val, pad, y + 4);
  }
  ctx.restore();

  const n = data.length;
  const xAt = (i) => left + (cw * (n === 1 ? 0 : i / (n - 1)));
  const yAt = (v) => top + (1 - v) * ch;

  // Silent rate shading (low alpha)
  ctx.save();
  ctx.fillStyle = "rgba(166,31,18,.06)";
  ctx.beginPath();
  ctx.moveTo(xAt(0), bottom);
  for (let i = 0; i < n; i++) {
    const r = clamp(data[i].silentRate, 0, 1);
    const y = top + (1 - r) * ch;
    ctx.lineTo(xAt(i), y);
  }
  ctx.lineTo(xAt(n - 1), bottom);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  function drawLine(key, color, width) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const v = clamp(data[i][key], 0, 1);
      const x = xAt(i);
      const y = yAt(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  const css = getComputedStyle(document.documentElement);
  const cPrivate = css.getPropertyValue("--tone-a").trim() || "#c7491f";
  const cVisible = css.getPropertyValue("--tone-b").trim() || "#176c74";
  drawLine("privateA", cPrivate, Math.max(2, Math.round(2 * (window.devicePixelRatio || 1))));
  drawLine("visibleA", cVisible, Math.max(2, Math.round(2 * (window.devicePixelRatio || 1))));
  drawLine("speakA", "#7c3aed", Math.max(2, Math.round(2 * (window.devicePixelRatio || 1))));

  // Current marker
  const last = data[data.length - 1];
  const x = xAt(n - 1);
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,.2)";
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.font = `${Math.round(11 * (window.devicePixelRatio || 1))}px sans-serif`;
  ctx.fillText(`t=${state.tick}`, Math.min(x + 6, right - 38), top + 14);
  ctx.fillText(`可见A ${pct(last.visibleA)}`, Math.min(x + 6, right - 80), top + 30);
  ctx.restore();
}

function renderAll(cfg, privateA, visibleA, silentRate) {
  renderMeters(privateA, visibleA);
  renderTopLabels(visibleA);
  el.labelPosts.textContent = `A ${state.lastTickPostsA} · B ${state.lastTickPostsB}`;
  el.labelSilent.textContent = `沉默估计：${pct(silentRate)}`;

  updateInsight(privateA, visibleA, silentRate, cfg);
  renderPosts(cfg);
  drawChart();
}

function runOneTick() {
  const cfg = getUiConfig();
  const privateA = cfg.opinionA;

  state.tick += 1;

  // 1) update ranks/visibility using current cfg
  recomputePostScores(cfg);

  // 2) perception from visible window + media
  const perceivedA = perceivedClimateA(cfg);

  // 3) decide who posts this tick (based on perceived climate)
  const speakers = [];
  for (const a of state.agents) {
    const pSpeak = speakProbability(a, perceivedA, cfg);
    a.lastSpeakP = pSpeak;
    if (Math.random() < pSpeak) speakers.push(a);
  }
  shuffleInPlace(speakers);
  const newSpeakers = speakers.slice(0, cfg.maxNewPostsPerTick);

  let createdA = 0;
  let createdB = 0;
  for (const s of newSpeakers) {
    const p = makePost(s.stance, state.tick, { authorId: s.id });
    state.posts.push(p);
    if (p.stance === "A") createdA++;
    else createdB++;
  }

  // 4) votes happen after posts appear
  simulateVotes(perceivedA, cfg);
  recomputePostScores(cfg);

  // 5) compute visible climate (after ranking)
  const windowPosts = getVisibleWindow(cfg);
  let visA = 0;
  let visTotal = 0;
  for (const p of windowPosts) {
    visTotal++;
    if (p.stance === "A") visA++;
  }
  const fromWindow = visTotal ? (visA / visTotal) : 0.5;
  const visibleA = clamp(lerp(fromWindow, mediaSignalA(cfg), cfg.mediaWeight), 0.01, 0.99);

  // 6) silence estimate from current speak probabilities
  let silent = 0;
  let eligible = 0;
  for (const a of state.agents) {
    if (a.hardcore) continue;
    eligible++;
    if (a.lastSpeakP < cfg.silentProbThreshold) silent++;
  }
  const silentRate = eligible ? (silent / eligible) : 0;

  // 7) record + check spiral
  const speakA = (createdA + createdB) > 0 ? (createdA / (createdA + createdB)) : (state.history.length ? state.history[state.history.length - 1].speakA : privateA);
  state.lastTickPostsA = createdA;
  state.lastTickPostsB = createdB;

  recordHistory(privateA, visibleA, speakA, silentRate);
  spiralCheck(privateA, visibleA, silentRate);

  renderAll(cfg, privateA, visibleA, silentRate);
}

function estimateSilentRate(perceivedA, cfg) {
  let silent = 0;
  let eligible = 0;
  for (const a of state.agents) {
    if (a.hardcore) continue;
    eligible++;
    const pSpeak = speakProbability(a, perceivedA, cfg);
    if (pSpeak < cfg.silentProbThreshold) silent++;
  }
  return eligible ? (silent / eligible) : 0;
}

function resetSimulation() {
  const cfg = getUiConfig();
  state.running = false;
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }

  state.tick = 0;
  state.posts = [];
  state.history = [];
  state.lastTickPostsA = 0;
  state.lastTickPostsB = 0;
  state.spiralCounter = 0;
  state.spiralTriggered = false;
  el.spiralAlert.classList.add("hidden");

  state.agents = makeAgents(cfg);

  recomputePostScores(cfg);
  const v0 = mediaSignalA(cfg);
  recordHistory(cfg.opinionA, v0, cfg.opinionA, estimateSilentRate(v0, cfg));
  setStatus("已重置。点击“运行”观察可见舆论如何偏离真实分布。");
  el.btnPlay.textContent = "运行";
  renderAll(cfg, cfg.opinionA, v0, estimateSilentRate(v0, cfg));
}

function play() {
  if (state.running) return;
  state.running = true;
  el.btnPlay.textContent = "暂停";
  state.timer = setInterval(() => {
    try {
      runOneTick();
    } catch (e) {
      state.running = false;
      clearInterval(state.timer);
      state.timer = null;
      el.btnPlay.textContent = "运行";
      setStatus(`仿真错误：${e && e.message ? e.message : "未知错误"}`);
      try {
        if (window.pmMetrics) window.pmMetrics.markTaskError(TASK_NAME, { message: String(e && e.message ? e.message : e) });
      } catch (_e) { }
    }
  }, TICK_MS);
  setStatus("运行中。你也可以对帖子进行点赞/点踩干预。");
}

function pause() {
  if (!state.running) return;
  state.running = false;
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  el.btnPlay.textContent = "运行";
  setStatus("已暂停。可调整参数后继续运行或单步观察。");
}

function step() {
  pause();
  runOneTick();
  setStatus("已单步演化 1 次。");
}

function injectHot(stance) {
  const cfg = getUiConfig();
  const seedUp = stance === "A" ? 26 : 26;
  const seedDown = 0;
  state.posts.push(makePost(stance, state.tick, { authorId: -1, injected: true, seedUp, seedDown }));
  recomputePostScores(cfg);
  setStatus(`已投放 ${stance} 热帖。观察它如何改变“前 N 条热帖”的构成。`);
  const privateA = cfg.opinionA;
  const visibleA = perceivedClimateA(cfg);
  const silentRate = estimateSilentRate(visibleA, cfg);
  renderAll(cfg, privateA, visibleA, silentRate);
}

// Events
[el.paramOpinionA, el.paramFear, el.paramConformity, el.paramAttention, el.paramMediaBias, el.paramHardcore].forEach((inp) => {
  inp.addEventListener("input", () => {
    updateValueLabels();
    const cfg = getUiConfig();
    // Live re-render (does not mutate state except scores)
    recomputePostScores(cfg);
    const privateA = cfg.opinionA;
    const visibleA = perceivedClimateA(cfg);
    const silentRate = 0;
    renderMeters(privateA, visibleA);
    renderTopLabels(visibleA);
    drawChart();
  });
});

el.btnReset.addEventListener("click", resetSimulation);
el.btnPlay.addEventListener("click", () => (state.running ? pause() : play()));
el.btnStep.addEventListener("click", step);
el.btnNudgeA.addEventListener("click", () => injectHot("A"));
el.btnNudgeB.addEventListener("click", () => injectHot("B"));

// Vote delegation (user intervention)
el.postList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-vote][data-id]");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const vote = btn.getAttribute("data-vote");
  const post = state.posts.find((p) => p.id === id);
  if (!post) return;

  if (vote === "up") post.up += 1;
  if (vote === "down") post.down += 1;

  const cfg = getUiConfig();
  recomputePostScores(cfg);
  const privateA = cfg.opinionA;
  const visibleA = perceivedClimateA(cfg);
  const silentRate = estimateSilentRate(visibleA, cfg);
  renderAll(cfg, privateA, visibleA, silentRate);
  setStatus("你已干预投票。观察热度排序与可见舆论的连锁反应。");
});

// PM Metrics Integration
(function () {
  try {
    if (!window.pmMetrics) return;
    document.addEventListener("click", function (e) {
      if (state.pmStarted) return;
      const hit = e.target.closest("button, input");
      if (!hit) return;
      state.pmStarted = true;
      window.pmMetrics.markTaskStart(TASK_NAME);
    }, { once: false });
  } catch (_e) { }
})();

// Init
updateValueLabels();
resetSimulation();
window.addEventListener("resize", () => drawChart());
