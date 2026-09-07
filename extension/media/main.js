// The Course panel. Receives {type: "state", state} from the extension and
// renders it; buttons post {cmd} back. No framework, no fetches.
(function () {
  const vscode = acquireVsCodeApi();
  const app = document.getElementById("app");

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function button(cmd, label, cls, arg) {
    const a = arg ? ` data-arg="${esc(arg)}"` : "";
    return `<button class="btn ${cls || ""}" data-cmd="${cmd}"${a}>${esc(label)}</button>`;
  }

  function render(state) {
    if (!state.lesson) {
      app.innerHTML = `<p class="muted">${esc(state.notice || "Loading the lesson…")}</p>`;
      return;
    }
    const L = state.lesson;
    const current = L.steps.find((s) => s.status === "current");
    const parts = [];

    const doneCount = state.lessons.filter((l) => l.done).length;
    parts.push(`<header>
      <details class="picker">
        <summary class="crumbs">Lesson ${L.index} of ${L.count} · ${doneCount} done · <span class="link">all lessons</span></summary>
        <ol class="lessons">${state.lessons.map((l, i) => {
          const mark = l.done ? "✓" : l.current ? "→" : "·";
          return `<li class="${l.current ? "current" : ""} ${l.done ? "done" : ""}">
            <button class="btn link" data-cmd="goto" data-arg="${esc(l.id)}"><span class="mark">${mark}</span> ${i + 1}. ${esc(l.title)}</button></li>`;
        }).join("")}</ol>
      </details>
      <h1>${esc(L.title)}</h1>
      <p class="concept">${esc(L.concept)}</p>
    </header>`);

    if (state.notice) {
      parts.push(`<div class="notice">${esc(state.notice)} ${button("dismiss", "×", "link")}</div>`);
    }

    parts.push(`<details class="idea" ${current && current.n === 1 ? "open" : ""}>
      <summary>The idea</summary>
      <div class="md">${L.introHtml}</div>
    </details>`);

    parts.push(`<ol class="steps">${L.steps.map((s) => {
      const mark = s.status === "done" ? "✓" : s.status === "current" ? "→" : "·";
      return `<li class="${s.status}"><span class="mark">${mark}</span> ${esc(s.title)}</li>`;
    }).join("")}</ol>`);

    if (L.done) {
      parts.push(`<section class="done">
        <h2>Lesson done</h2>
        <p>Every step of this lesson passes.</p>
        ${L.index < L.count ? button("next", "Next lesson →", "primary") : "<p>That was the last lesson.</p>"}
      </section>`);
    } else if (current) {
      const fails = current.checks.filter((c) => c.status === "fail");
      parts.push(`<section class="step">
        <h2>Step ${current.n}: ${esc(current.title)}</h2>
        <div class="md">${current.bodyHtml}</div>
        ${L.files.length ? `<p class="files">${L.files.map((f) => button("openFile", "Open " + f, "small", f)).join(" ")}</p>` : ""}
      </section>`);

      const waiting = fails.length && /^waiting:/.test(fails[0].got || "");
      if (L.broken) {
        parts.push(`<section class="result fail">
          <h3>Something stopped working in ${esc(L.broken.file)}</h3>
          <p class="msg">${esc(L.broken.message)}</p>
          <p class="muted">Fix that first: your earlier steps are still there. "Show the answer" shows this step's version of the file.</p>
        </section>`);
      } else if (fails.length && !waiting) {
        parts.push(`<section class="result fail">
          <h3>Not yet</h3>
          ${fails.map((c) => `<p class="msg">${esc(c.msg)}</p>${c.got ? `<p class="got">${esc(c.got)}</p>` : ""}`).join("")}
        </section>`);
      } else if (waiting) {
        parts.push(`<section class="result waiting">
          <h3>Checking in your game…</h3>
          <p class="msg">This step is checked inside Minecraft, every few seconds, by itself. Do the step on your phone and watch this box. The button checks right now.</p>
        </section>`);
      }

      parts.push(`<p class="muted">A red underline in your code is the editor's guess. This panel is the lesson's answer.</p>`);
      const controls = [];
      if (current.game && state.gameAvailable) {
        controls.push(button("game", state.gameBusy ? "Asking the game…" : "Check in the game now", "primary"));
      } else {
        controls.push(button("check", "Check my work", "primary"));
      }
      if (current.hint && !state.showHint) {
        controls.push(button("hint", "Hint", ""));
      }
      controls.push(button("answer", "Show the answer", ""));
      parts.push(`<p class="controls">${controls.join(" ")}</p>`);

      if (state.showHint && current.hint) {
        parts.push(`<section class="hint"><h3>Hint</h3><div class="md">${current.hintHtml}</div></section>`);
      }
      if (state.answer !== undefined) {
        parts.push(`<section class="answer">
          <h3>The answer</h3>
          <pre>${esc(state.answer)}</pre>
          <p>${button("apply", "Write the answer into my files", "danger")} ${button("dismiss", "Close", "")}</p>
        </section>`);
      }
    }

    const idx = state.lessons.findIndex((l) => l.current);
    const prev = idx > 0 ? state.lessons[idx - 1] : null;
    const nxt = idx >= 0 && idx < state.lessons.length - 1 ? state.lessons[idx + 1] : null;
    parts.push(`<footer>
      <p>${prev ? button("goto", "← " + prev.title, "link", prev.id) : ""} ${nxt ? button("goto", nxt.title + " →", "link", nxt.id) : ""}</p>
      <p>${button("openLesson", "Open the lesson text", "link")} · ${button("allowlist", "Who can join my server", "link")}</p>
    </footer>`);

    app.innerHTML = parts.join("\n");
  }

  app.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-cmd]");
    if (!b) return;
    vscode.postMessage({ cmd: b.dataset.cmd, arg: b.dataset.arg });
  });

  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "state") {
      render(e.data.state);
    }
  });
})();
