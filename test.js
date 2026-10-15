const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function loadHtml() {
  const raw = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  return raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function boot(seed) {
  const dom = new JSDOM(loadHtml(), {
    url: `http://localhost/?seed=${seed}`,
    runScripts: "dangerously"
  });
  const window = dom.window;
  window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() {}, fillRect() {}, fillText() {},
    save() {}, restore() {}, beginPath() {},
    moveTo() {}, lineTo() {}, stroke() {},
    closePath() {}, fill() {}
  });
  const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  window.eval(`${appJs}\nwindow.getState = () => state;\n`);
  return { window, document: window.document, dom };
}

function snapshot(window) {
  const state = window.getState();
  return JSON.stringify({
    tick: state.tick,
    agents: state.agents.map((a) => [a.id, a.stance, a.hardcore, a.courage]),
    posts: state.posts.map((p) => [p.id, p.stance, p.up, p.down, p.t, p.text]),
    history: state.history
  });
}

function countA(window) {
  return window.getState().agents.filter((a) => a.stance === "A").length;
}

function main() {
  const html = loadHtml();
  assert(html.includes('id="paramFear"') && html.includes('value="70"'), "index.html fear default missing");
  assert(html.includes('id="chartCanvas"'), "index.html chart id missing");

  const a = boot(42);
  const b = boot(42);
  for (let i = 0; i < 10; i++) {
    a.window.runOneTick();
    b.window.runOneTick();
  }
  const snapA = snapshot(a.window);
  const snapB = snapshot(b.window);
  assert(snapA === snapB, "seed=42 diverged across two runs");

  const state = a.window.getState();
  assert(state.tick === 10, `tick ${state.tick}`);
  assert(state.posts.length > 0 && state.posts.length <= 260, `posts ${state.posts.length}`);
  const last = state.history[state.history.length - 1];
  for (const key of ["privateA", "visibleA", "speakA", "silentRate"]) {
    assert(last[key] >= 0 && last[key] <= 1, `${key} out of range`);
  }
  const privatePct = Math.round(countA(a.window) / state.agents.length * 100);
  assert(a.document.getElementById("meterPrivateA").style.width === `${privatePct}%`, "private meter is not the agent mix");
  assert(last.privateA === countA(a.window) / state.agents.length, "history privateA is not the agent mix");

  const other = boot(43);
  for (let i = 0; i < 10; i++) other.window.runOneTick();
  assert(snapshot(other.window) !== snapA, "seed=43 matched seed=42; seed hook is a no-op");

  const live = boot(42);
  for (let i = 0; i < 3; i++) live.window.runOneTick();
  const up = live.document.querySelector('#postList button[data-vote="up"]');
  assert(up, "missing upvote button");
  const upId = up.getAttribute("data-id");
  up.focus();
  live.window.runOneTick();
  const upAgain = live.document.querySelector(`#postList button[data-vote="up"][data-id="${upId}"]`);
  assert(upAgain === up, "upvote button was recreated");
  assert(live.document.activeElement === up, "upvote focus was lost on the next tick");
  const beforeUp = live.window.getState().posts.find((p) => p.id === upId).up;
  up.click();
  const afterUp = live.window.getState().posts.find((p) => p.id === upId).up;
  assert(afterUp === beforeUp + 1, `upvote did not increment (${beforeUp} -> ${afterUp})`);

  const beforeFear = countA(live.window);
  const fear = live.document.getElementById("paramFear");
  const silentLabel = () => live.document.getElementById("labelSilent").textContent;
  fear.value = "0";
  fear.dispatchEvent(new live.window.Event("input", { bubbles: true }));
  assert(countA(live.window) === beforeFear, "fear slider rewrote stances");
  const silentAtLowFear = silentLabel();
  fear.value = "100";
  fear.dispatchEvent(new live.window.Event("input", { bubbles: true }));
  assert(countA(live.window) === beforeFear, "fear slider rewrote stances on the way up");
  assert(silentLabel() !== silentAtLowFear, `silent label stayed ${silentLabel()} for fear 0 and 100`);

  const opinion = live.document.getElementById("paramOpinionA");
  opinion.value = "80";
  opinion.dispatchEvent(new live.window.Event("input", { bubbles: true }));
  const n = live.window.getState().agents.length;
  const expectA = Math.round(0.8 * n);
  assert(countA(live.window) === expectA, `A agents ${countA(live.window)} expected ${expectA}`);
  assert(live.document.getElementById("meterPrivateA").style.width === "80%", "meter did not follow rebalance");

  console.log("P37 simulation tests passed.");
}

try {
  main();
} catch (err) {
  console.error("P37 simulation tests failed.");
  console.error(err);
  process.exit(1);
}
