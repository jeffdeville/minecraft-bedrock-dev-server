// The Redstone Course extension: a sidebar over `lesson json` plus a deploy
// status bar item. All lesson logic lives in the checker; this file runs it,
// renders what it says, and turns buttons into checker commands.
import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import MarkdownIt from "markdown-it";
import * as vscode from "vscode";

interface Check {
  step: number;
  label: string;
  status: "ok" | "fail" | "skip";
  msg?: string;
  got?: string;
  reason?: string;
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

function findWorkspace(): string | undefined {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const root = folder.uri.fsPath;
    if (fs.existsSync(path.join(root, "lessons")) && fs.existsSync(path.join(root, "packs"))) {
      return root;
    }
  }
  return undefined;
}

function checkerCommand(): string {
  return vscode.workspace.getConfiguration("redstone").get<string>("checker") || "lesson";
}

function runChecker(ws: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(checkerCommand(), args, { cwd: ws, maxBuffer: 4 * 1024 * 1024, timeout: 120_000 }, (err, stdout, stderr) => {
      const code = err && typeof (err as NodeJS.ErrnoException).code === "number"
        ? ((err as NodeJS.ErrnoException).code as unknown as number)
        : err ? 1 : 0;
      resolve({ code, stdout: stdout ?? "", stderr: stderr ?? "" });
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
  private shownHint = false;
  private answerText: string | undefined;
  private notice: string | undefined;
  private gameBusy = false;

  constructor(private readonly ctx: vscode.ExtensionContext, readonly ws: string) {
    this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    this.status.command = "redstone.showDeploy";
    this.status.text = "$(circle-outline) course";
    this.status.show();
    ctx.subscriptions.push(this.status);
  }

  // --- refreshing ---------------------------------------------------------

  /** Re-run the checker soon. `attempt` counts a failing step towards its hint. */
  schedule(attempt: boolean, delay = 400): void {
    this.pendingAttempt = this.pendingAttempt || attempt;
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
      const args = ["json"];
      if (!attempt) {
        args.push("--no-attempt");
      }
      if (!runGame) {
        args.push("--no-game");
      }
      const r = await runChecker(this.ws, args);
      if (r.code !== 0 || !r.stdout.trim()) {
        this.notice = r.stderr.trim() || `the checker (${checkerCommand()}) did not answer`;
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
      this.render();
    } catch (e) {
      this.notice = `could not read the checker's answer: ${e}`;
      this.render();
    } finally {
      this.busy = false;
    }
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
      await this.refresh(true);
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
        case "check": this.pendingAttempt = true; this.schedule(true, 0); break;
        case "hint": void this.hint(); break;
        case "answer": void this.answer(); break;
        case "apply": void this.applyAnswer(); break;
        case "next": void this.next(); break;
        case "game": void this.gameCheck(); break;
        case "openLesson": void this.openLesson(); break;
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
        course.schedule(true);
      }
    }),
  );
  const packs = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(ws, "packs/**"));
  packs.onDidCreate(() => course.schedule(true));
  packs.onDidDelete(() => course.schedule(true));
  packs.onDidChange(() => course.schedule(true));
  const deploy = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(ws, ".course/deploy.json"));
  deploy.onDidChange(() => course.schedule(false));
  deploy.onDidCreate(() => course.schedule(false));
  ctx.subscriptions.push(packs, deploy);

  course.schedule(false, 0);
  void vscode.commands.executeCommand("redstone.lesson.focus");
}

export function deactivate(): void {}
