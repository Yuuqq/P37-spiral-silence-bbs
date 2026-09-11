const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = `
<!DOCTYPE html>
<html>
<body>
    <div id="mock-dom" style="display:none;">
        <input type="range" id="paramOpinionA" value="50">
        <span id="valOpinionA"></span>
        <input type="range" id="paramFear" value="50">
        <span id="valFear"></span>
        <input type="range" id="paramConformity" value="50">
        <span id="valConformity"></span>
        <input type="range" id="paramAttention" value="50">
        <span id="valAttention"></span>
        <input type="range" id="paramMediaBias" value="50">
        <span id="valMediaBias"></span>
        <input type="range" id="paramHardcore" value="10">
        <span id="valHardcore"></span>
        <button id="btnReset"></button>
        <button id="btnPlay"></button>
        <button id="btnStep"></button>
        <button id="btnNudgeA"></button>
        <button id="btnNudgeB"></button>
        <div id="status"></div>

        <div id="meterPrivateA" style="width:50%"></div>
        <div id="meterPrivateB" style="width:50%"></div>
        <div id="meterVisibleA" style="width:50%"></div>
        <div id="meterVisibleB" style="width:50%"></div>

        <div id="labelPrivate"></div>
        <div id="labelVisible"></div>
        <div id="labelTick"></div>
        <div id="labelClimate"></div>
        <div id="labelPosts"></div>
        <div id="labelSilent"></div>
        <div id="insightText"></div>
        <div id="insightAlert"></div>
        <div id="spiralAlert" class="hidden"></div>
        <div id="spiralCounter"></div>
        <div id="postList"></div>
        <canvas id="chart" width="400" height="200"></canvas>
    </div>
</body>
</html>`;

const dom = new JSDOM(html, {
    url: "http://localhost/?seed=42",
    runScripts: "dangerously"
});

const window = dom.window;
const document = window.document;

// Mock window resize and canvas methods
window.addEventListener = () => {};
window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect: () => {}, fillRect: () => {}, fillText: () => {},
    save: () => {}, restore: () => {}, beginPath: () => {},
    moveTo: () => {}, lineTo: () => {}, stroke: () => {},
    closePath: () => {}, fill: () => {}
});

// We need to inject state extraction at the end of app.js
let appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
appJs += `\nwindow.getState = () => state;\n`;

try {
    window.eval(appJs);

    // Run 10 ticks
    for (let i = 0; i < 10; i++) {
        window.runOneTick();
    }

    const state = window.getState();
    const lastHistory = state.history[state.history.length - 1];

    const snap = {
        tick: state.tick,
        postsLength: state.posts.length,
        visibleA: lastHistory.visibleA.toFixed(4),
        speakA: lastHistory.speakA.toFixed(4),
        silentRate: lastHistory.silentRate.toFixed(4)
    };

    console.log("State Snapshot:", snap);

    if (snap.tick !== 10) throw new Error(`Tick is ${snap.tick}, expected 10`);
    if (snap.postsLength !== 80) throw new Error(`Posts length is ${snap.postsLength}, expected 80`);
    if (snap.visibleA !== "0.9368") throw new Error(`visibleA is ${snap.visibleA}`);
    if (snap.speakA !== "1.0000") throw new Error(`speakA is ${snap.speakA}`);
    if (snap.silentRate !== "0.5157") throw new Error(`silentRate is ${snap.silentRate}`);

    console.log("Determinism test PASSED.");
    process.exit(0);

} catch(e) {
    console.error("Determinism test FAILED.");
    console.error(e);
    process.exit(1);
}
