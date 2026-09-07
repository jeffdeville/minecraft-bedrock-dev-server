// The Redstone Course extension: a sidebar over `lesson json` plus a deploy
// status bar item. All lesson logic lives in the checker; this file runs it,
// renders what it says, and turns buttons into checker commands.
import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import MarkdownIt from "markdown-it";
import * as vscode from "vscode";
import { DeployLog, ServerLog, controlRequest } from "./logs";

interface Check {
  step: number;
  label: string;
  status: "ok" | "fail" | "skip";
  msg?: string;
  got?: string;
  reason?: string;
  code?: string;
}

/** Append one line to .course/events.jsonl (FORMAT.md): codes and labels only, never learner text. */
function logEvent(ws: string, fields: Record<string, unknown>): void {
  try {
    const dir = path.join(ws, ".course");
    fs.mkdirSync(dir, { recursive: true });
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== null));
    fs.appendFileSync(path.join(dir, "events.jsonl"), JSON.stringify({ t: new Date().toISOString(), ...clean }) + "\n");
  } catch {
    // never let telemetry break the lesson
  }
}

interface Step {
  n: number;
  title: string;
  body: string;
  hint: string;
  status: "done" | "current" | "todo";
  game: boolean;
  checks: Check[];
}

interface Doc {
  workspace: string;
  lessons: { id: string; title: string; done: boolean; current: boolean }[];
  lesson: {
    id: string;
    title: string;
    concept: string;
    intro: string;
    file: string;
    files: string[];
    index: number;
    count: number;
    steps: Step[];
    current_step: number | null;
    done: boolean;
    fails: number;
    broken: { file: string; message: string } | null;
  };
  deploy: {
    status: string;
    detail: string;
    at: string;
    behavior_packs: string[];
    resource_packs: string[];
  } | null;
  game_available: boolean;
}

const md = new MarkdownIt({ html: false, linkify: false });
const GAME_POLL_MS = 8000;

function findWorkspace(): string | undefined {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const root = folder.uri.fsPath;
    if (fs.existsSync(path.join(root, "lessons")) && fs.existsSync(path.join(root, "packs"))) {
      return root;
    }
  }
  return undefined;
}

/**
 * Where the checker is. The setting wins; a bare name is looked up on PATH
 * and then in the places the course box and a repo checkout put it. The
 * extension host's PATH is not the terminal's (code-server gives it a login
 * shell's PATH), which is why a bare "lesson" alone is not enough.
 */
function checkerCommand(ws: string): string {
  const configured = vscode.workspace.getConfiguration("redstone").get<string>("checker") || "lesson";
  if (configured.includes("/") || configured.includes("\\")) {
    return configured;
  }
  const dirs = [
    ...(process.env.PATH ?? "").split(path.delimiter),
    "/course/bin",
    path.join(ws, "..", "..", "app", "course", "bin"),
    path.join(ws, "course", "bin"),
  ];
  for (const dir of dirs) {
    const candidate = path.join(dir, configured);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // keep looking
    }
  }
  return configured;
}

function runChecker(ws: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const cmd = checkerCommand(ws);
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: ws, maxBuffer: 4 * 1024 * 1024, timeout: 120_000 }, (err, stdout, stderr) => {
      let code = 0;
      let extra = "";
      if (err) {
        const e = err as NodeJS.ErrnoException & { code?: number | string; killed?: boolean };
        code = typeof e.code === "number" ? e.code : 1;
        if (e.code === "ENOENT") {
          extra = `the checker was not found (looked for "${cmd}"); set redstone.checker to the path of course/bin/lesson`;
        } else if (e.killed) {
          extra = "the checker took too long and was stopped";
        }
      }
      resolve({ code, stdout: stdout ?? "", stderr: (stderr ?? "") + (extra ? "\n" + extra : "") });
    });
  });
}

class Course {
  private doc: Doc | undefined;
  private view: vscode.WebviewView | undefined;
  private status: vscode.StatusBarItem;
  private refreshTimer: NodeJS.Timeout | undefined;
  private busy = false;
  private pendingAttempt = false;
  private pendingSource = "button";
  private lastDeployAt = "";
  private shownHint = false;
  private answerText: string | undefined;
  private notice: string | undefined;
  private gameBusy = false;
  private gameTimer: NodeJS.Timeout | undefined;

  constructor(private readonly ctx: vscode.ExtensionContext, readonly ws: string) {
    this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    this.status.command = "redstone.showDeploy";
    this.status.text = "$(circle-outline) course";
    this.status.show();
    ctx.subscriptions.push(this.status);
  }

  // --- refreshing ---------------------------------------------------------

  /** Re-run the checker soon. `attempt` counts a failing step towards its hint. */
  schedule(attempt: boolean, delay = 400, source = "button"): void {
    this.pendingAttempt = this.pendingAttempt || attempt;
    if (attempt) {
      this.pendingSource = source;
    }
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => void this.refresh(), delay);
  }

  async refresh(runGame = false): Promise<void> {
    if (this.busy) {
      this.schedule(this.pendingAttempt, 500);
      return;
    }
    this.busy = true;
    const attempt = this.pendingAttempt;
    this.pendingAttempt = false;
    try {
      const args = ["json", "--source", attempt ? this.pendingSource : "refresh"];
      if (!attempt) {
        args.push("--no-attempt");
      }
      if (!runGame) {
        args.push("--no-game");
      }
      const r = await runChecker(this.ws, args);
      if (r.code !== 0 || !r.stdout.trim()) {
        this.notice = r.stderr.trim() || `the checker (${checkerCommand(this.ws)}) answered nothing`;
        this.render();
        return;
      }
      const doc = JSON.parse(r.stdout) as Doc;
      if (this.doc && (this.doc.lesson.id !== doc.lesson.id || this.doc.lesson.current_step !== doc.lesson.current_step)) {
        this.shownHint = false;
        this.answerText = undefined;
      }
      this.doc = doc;
      this.updateStatus();
      this.logDeploy(doc);
      this.render();
      this.scheduleGamePoll();
    } catch (e) {
      this.notice = `could not read the checker's answer: ${e}`;
      this.render();
    } finally {
      this.busy = false;
    }
  }

  /** One event per deploy, when its timestamp changes. */
  private logDeploy(doc: Doc): void {
    const d = doc.deploy;
    if (!d || !d.at || d.at === this.lastDeployAt || (d.status === "ok" && d.detail)) {
      return;
    }
    this.lastDeployAt = d.at;
    logEvent(this.ws, { lesson: doc.lesson.id, step: doc.lesson.current_step, event: "deploy",
      outcome: d.status === "ok" ? "pass" : "fail", code: d.status === "ok" ? undefined : "deploy.failed", source: "sidecar" });
  }

  /**
   * A step checked inside the game (join, hold the wand, the scoreboard) is
   * re-checked on its own every few seconds while it is the current step, so
   * the learner who is looking at the phone sees the tick without pressing
   * anything. Polls do not count as attempts, so they never trigger the hint.
   */
  private scheduleGamePoll(): void {
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
      this.gameTimer = undefined;
    }
    const doc = this.doc;
    const step = doc?.lesson.steps.find((s) => s.status === "current");
    if (!doc || doc.lesson.done || !step?.game || !doc.game_available) {
      return;
    }
    this.gameTimer = setTimeout(() => {
      this.gameTimer = undefined;
      if (this.busy || this.gameBusy) {
        this.scheduleGamePoll();
        return;
      }
      this.pendingAttempt = false;
      void this.refresh(true);
    }, GAME_POLL_MS);
  }

  private updateStatus(): void {
    const d = this.doc?.deploy;
    if (!d) {
      this.status.text = "$(circle-outline) no deploy yet";
      this.status.tooltip = "Save a file under packs/ and the server picks it up.";
      this.status.backgroundColor = undefined;
    } else if (d.status === "ok" && d.detail) {
      this.status.text = "$(sync~spin) " + d.detail;
      this.status.tooltip = d.at;
      this.status.backgroundColor = undefined;
    } else if (d.status === "ok") {
      const packs = [...(d.behavior_packs ?? []), ...(d.resource_packs ?? [])];
      this.status.text = "$(check) live" + (packs.length ? ": " + packs.join(", ") : "");
      this.status.tooltip = "Your packs are on your server. " + d.at;
      this.status.backgroundColor = undefined;
    } else {
      this.status.text = "$(error) deploy failed";
      this.status.tooltip = d.detail;
      this.status.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    }
  }

  // --- actions ---------------------------------------------------------------

  async hint(): Promise<void> {
    this.shownHint = true;
    logEvent(this.ws, { lesson: this.doc?.lesson.id, step: this.doc?.lesson.current_step, event: "hint", source: "button" });
    this.render();
  }

  async answer(): Promise<void> {
    const r = await runChecker(this.ws, ["answer"]);
    this.answerText = (r.stdout + (r.stderr ? "\n" + r.stderr : "")).trim();
    this.render();
  }

  async applyAnswer(): Promise<void> {
    const step = this.doc?.lesson.current_step;
    const ok = await vscode.window.showWarningMessage(
      `Write the answer for step ${step ?? "?"} into your files? Your own version of those files is replaced.`,
      { modal: true },
      "Write it",
    );
    if (ok !== "Write it") {
      return;
    }
    const r = await runChecker(this.ws, ["answer", "--apply"]);
    this.notice = (r.stdout + r.stderr).trim();
    this.answerText = undefined;
    this.schedule(false, 0);
  }

  async next(): Promise<void> {
    const r = await runChecker(this.ws, ["next"]);
    this.notice = (r.stdout + r.stderr).trim();
    this.shownHint = false;
    this.answerText = undefined;
    this.schedule(false, 0);
    const first = this.doc?.lesson.file;
    if (r.code === 0 && first) {
      // The new lesson's file name arrives with the next refresh; open it then.
      setTimeout(() => void this.openLesson(), 800);
    }
  }

  async gameCheck(): Promise<void> {
    if (this.gameBusy) {
      return;
    }
    this.gameBusy = true;
    this.notice = "Asking your server…";
    this.render();
    try {
      this.pendingAttempt = true;
      this.pendingSource = "button";
      await this.refresh(true);
      const step = this.doc?.lesson.steps.find((s) => s.status === "current");
      const gameFail = step?.checks.find((c) => c.status === "fail" && /^game\./.test(c.code ?? ""));
      logEvent(this.ws, { lesson: this.doc?.lesson.id, step: step?.n, event: "game", outcome: gameFail ? "fail" : "pass",
        code: gameFail ? "game.fail" : undefined, source: "button" });
    } finally {
      this.gameBusy = false;
      this.notice = undefined;
      this.render();
    }
  }

  async openLesson(): Promise<void> {
    const rel = this.doc?.lesson.file;
    if (!rel) {
      return;
    }
    const uri = vscode.Uri.file(path.join(this.ws, rel));
    await vscode.commands.executeCommand("vscode.openWith", uri, "vscode.markdown.preview.editor", vscode.ViewColumn.Beside);
  }

  async openFile(rel: string): Promise<void> {
    const full = path.join(this.ws, rel);
    if (!fs.existsSync(full)) {
      this.notice = `${rel} does not exist yet; this step is where you create it.`;
      this.render();
      return;
    }
    await vscode.window.showTextDocument(vscode.Uri.file(full), { preview: false });
  }

  showDeploy(): void {
    const d = this.doc?.deploy;
    if (!d) {
      void vscode.window.showInformationMessage("No deploy yet. Save a file under packs/ and the server picks it up in a few seconds.");
    } else if (d.status === "ok") {
      void vscode.window.showInformationMessage(`Last deploy ${d.at}: ${d.detail || "live"}.`);
    } else {
      void vscode.window.showErrorMessage(`Deploy failed: ${d.detail}`);
    }
  }

  // --- the view ---------------------------------------------------------------

  attach(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(this.ctx.extensionUri, "media")] };
    view.webview.html = this.shell(view.webview);
    view.webview.onDidReceiveMessage((m: { cmd: string; arg?: string }) => {
      switch (m.cmd) {
        case "check": this.pendingAttempt = true; this.schedule(true, 0, "button"); break;
        case "hint": void this.hint(); break;
        case "answer": void this.answer(); break;
        case "apply": void this.applyAnswer(); break;
        case "next": void this.next(); break;
        case "game": void this.gameCheck(); break;
        case "openLesson": void this.openLesson(); break;
        case "allowlist": void vscode.commands.executeCommand("redstone.allowlist"); break;
        case "openFile": if (m.arg) { void this.openFile(m.arg); } break;
        case "dismiss": this.notice = undefined; this.answerText = undefined; this.render(); break;
      }
    });
    view.onDidChangeVisibility(() => { if (view.visible) { this.render(); } });
    this.render();
  }

  private render(): void {
    if (!this.view) {
      return;
    }
    const doc = this.doc;
    const state = doc ? {
      lesson: {
        ...doc.lesson,
        introHtml: md.render(doc.lesson.intro || ""),
        steps: doc.lesson.steps.map((s) => ({
          ...s,
          bodyHtml: md.render(s.body || ""),
          hintHtml: s.hint ? md.render(s.hint) : "",
        })),
      },
      lessons: doc.lessons,
      deploy: doc.deploy,
      gameAvailable: doc.game_available,
      showHint: this.shownHint || (doc.lesson.fails >= 2),
      answer: this.answerText,
      notice: this.notice,
      gameBusy: this.gameBusy,
    } : { notice: this.notice ?? "Loading the lesson…" };
    void this.view.webview.postMessage({ type: "state", state });
  }

  private shell(webview: vscode.Webview): string {
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const script = webview.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, "media", "main.js"));
    const style = webview.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, "media", "style.css"));
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${style}">
<title>Lesson</title>
</head>
<body>
<div id="app"><p class="muted">Loading the lesson…</p></div>
<script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
  }
}

export function activate(ctx: vscode.ExtensionContext): void {
  const ws = findWorkspace();
  if (!ws) {
    return;
  }
  const course = new Course(ctx, ws);

  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider("redstone.lesson", {
      resolveWebviewView: (view) => course.attach(view),
    }, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand("redstone.check", () => { course.schedule(true, 0); }),
    vscode.commands.registerCommand("redstone.hint", () => course.hint()),
    vscode.commands.registerCommand("redstone.answer", () => course.answer()),
    vscode.commands.registerCommand("redstone.applyAnswer", () => course.applyAnswer()),
    vscode.commands.registerCommand("redstone.next", () => course.next()),
    vscode.commands.registerCommand("redstone.gameCheck", () => course.gameCheck()),
    vscode.commands.registerCommand("redstone.openLesson", () => course.openLesson()),
    vscode.commands.registerCommand("redstone.showDeploy", () => course.showDeploy()),
  );

  // A save under packs/ or lessons/ is an attempt; anything the sidecar writes
  // (deploy.json) is not.
  const inWorkspace = (p: string) => p.startsWith(ws + path.sep);
  ctx.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((d) => {
      if (inWorkspace(d.uri.fsPath)) {
        course.schedule(true, 400, "save");
      }
    }),
  );
  const packs = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(ws, "packs/**"));
  packs.onDidCreate(() => course.schedule(true, 400, "save"));
  packs.onDidDelete(() => course.schedule(true, 400, "save"));
  packs.onDidChange(() => course.schedule(true, 400, "save"));
  const deploy = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(ws, ".course/deploy.json"));
  deploy.onDidChange(() => course.schedule(false));
  deploy.onDidCreate(() => course.schedule(false));
  ctx.subscriptions.push(packs, deploy);

  // The bottom panel: the sidecar's deploy log and the server's own log.
  const cfg = vscode.workspace.getConfiguration("redstone");
  const control = cfg.get<string>("control") || process.env.COURSE_CONTROL || "";
  const learner = process.env.COURSE_LEARNER || "";
  const token = cfg.get<string>("token") || process.env.COURSE_TOKEN || "";
  const deployLog = new DeployLog(ws);
  const serverLog = new ServerLog(control, learner, token);
  const deployLogWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(ws, ".course/deploy.log"));
  deployLogWatcher.onDidChange(() => deployLog.catchUp());
  deployLogWatcher.onDidCreate(() => deployLog.catchUp());
  const deployLogPoll = setInterval(() => deployLog.catchUp(), 3000);
  serverLog.start();
  ctx.subscriptions.push(
    deployLogWatcher,
    deployLog.channel,
    serverLog.channel,
    { dispose: () => { clearInterval(deployLogPoll); serverLog.stop(); } },
    vscode.commands.registerCommand("redstone.showLogs", () => { serverLog.channel.show(true); }),
    vscode.commands.registerCommand("redstone.allowlist", () => allowlist(control, learner, token)),
  );

  logEvent(ws, { event: "panel", source: "open" });
  course.schedule(false, 0);
  // Layout on open: explorer left, the Course panel right, the server log below.
  void vscode.commands.executeCommand("redstone.lesson.focus");
  serverLog.channel.show(true);
}

/** Who can join my server: a quick pick of the current gamertags, add or remove one. */
async function allowlist(control: string, learner: string, token: string): Promise<void> {
  if (!control || !learner || !token) {
    void vscode.window.showInformationMessage("The list of who can join is managed on the course page for this server.");
    return;
  }
  const url = `${control}/api/allowlist/${learner}`;
  try {
    const current = JSON.parse(await controlRequest(url, token)) as { allowed: string[]; seen?: { gamertag: string; xuid: string }[] };
    const allowedLower = new Set(current.allowed.map((t) => t.toLowerCase()));
    const seen = (current.seen ?? []).filter((p) => !allowedLower.has(p.gamertag.toLowerCase()));
    const items: (vscode.QuickPickItem & { xuid?: string })[] = [
      ...seen.map((p) => ({ label: p.gamertag, description: "has joined before · pick to allow", xuid: p.xuid })),
      { label: "$(add) Allow a new player…", description: "type their gamertag exactly" },
      ...current.allowed.map((t) => ({ label: t, description: "allowed · pick to remove" })),
    ];
    const pick = await vscode.window.showQuickPick(items, {
      title: "Who can join my server",
      placeHolder: current.allowed.length ? `${current.allowed.length} player(s) can join` : "Nobody can join yet",
    });
    if (!pick) {
      return;
    }
    let gamertag: string | undefined;
    let action = "add";
    const xuid = (pick as { xuid?: string }).xuid ?? "";
    if (xuid) {
      gamertag = pick.label;
    } else if (pick.label.startsWith("$(add)")) {
      gamertag = await vscode.window.showInputBox({ title: "Gamertag to allow", prompt: "Exactly as it shows in Minecraft", validateInput: (v) => (/^[A-Za-z0-9 ]{1,16}$/.test(v.trim()) ? undefined : "1 to 16 letters, digits or spaces") });
    } else {
      const ok = await vscode.window.showWarningMessage(`Remove ${pick.label}? They will not be able to join.`, { modal: true }, "Remove");
      if (ok === "Remove") {
        gamertag = pick.label;
        action = "remove";
      }
    }
    if (!gamertag) {
      return;
    }
    const result = JSON.parse(await controlRequest(url, token, JSON.stringify({ gamertag: gamertag.trim(), action, xuid }))) as { notice: string };
    void vscode.window.showInformationMessage(result.notice);
  } catch (e) {
    void vscode.window.showErrorMessage(`Could not reach the course server: ${e}`);
  }
}

export function deactivate(): void {}
