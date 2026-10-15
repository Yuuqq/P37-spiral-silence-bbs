# Review status: P37-spiral-silence-bbs

This is a status note for the current `main` line after the third-pass findings on PR #3. It is not a full audit, and it does not describe bugs that this tree already fixed.

PR #3 (`add-review-md-16337765549823298910-13566268852990366960`) is stale against `main`. It deletes the classroom README, deletes `inkRgba`, renames the Service Worker cache back to the origin-wide `journalism-tool-v1`, and drops canvas/nav labels. Do not merge it.

## Fixed here

- `window.simRandom` serves `?seed=`. `Math.random` is not replaced. `pm-metrics.js` still uses `Math.random` for its own id, which is outside the simulation.
- `renderPosts` updates articles by `data-id` and writes post text with `textContent`. Vote buttons are not recreated every tick.
- `state.posts` is capped in `capStoredPosts`, called from `runOneTick` and `injectHot`, not from rendering.
- The private meter is the agent mix (`measurePrivateA`). Dragging 「A 占比」 rewrites stances (`rebalanceAgents`). Other sliders do not. The slider handler uses `estimateSilentRate` and refreshes insight and posts.
- Chart ink re-reads `--ink` (hex or `rgb()`), including after a theme attribute change. The previous one-shot cache could keep the old color.
- Service Worker cache name stays P37-scoped. Install failures log `console.warn`. A failed fetch no longer calls `respondWith(undefined)`. `event.waitUntil` on the revalidate path is unchanged. Registration failures log instead of an empty `catch`.
- `npm test` loads `index.html` defaults, checks two seeded runs match, checks a different seed diverges, checks the 80% rebalance, and checks a vote button node survives the next tick.
- README keeps the 40-minute classroom section and adds local HTTP instructions. SPEC / TASKS / QA no longer claim a free-text compose box or “no dependencies / no known issues”.

## Still open

- The page still loads `../shared/*.js`. That is a same-origin supply chain on GitHub Pages, not an XSS bug in post text. There is no Security-critical finding in this repo’s own scripts.
- Offline use still needs one online visit so `../shared/` can be cached. The README says so. The PWA badge remains a shortcut, not a claim that a cold `file://` open works.
- `app.js` is still one file. Splitting it is optional structure, not a defect.
- Narrow-screen layout was not rechecked in this pass.
- There is still no free-text composer. That matches the simulator. QA used to check the box anyway.

## Security

No critical XSS or exfiltration in this tree. Post bodies are `textContent`. Templates are static. Votes only increment local counters. Metrics stay in `localStorage`. The Service Worker handles same-origin GET and uses a P37 cache name. Residual risk is the shared teaching scripts above. `test.js` evals `app.js` inside jsdom only.
