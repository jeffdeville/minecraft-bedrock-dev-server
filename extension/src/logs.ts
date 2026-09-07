// The two log feeds shown in the bottom panel's Output view:
//   Course: Deploy   tail of workspace/.course/deploy.log (the sidecar writes it)
//   Course: Server   the learner's Bedrock server log, polled from the control
//                    plane with the learner's token (docker logs --timestamps)
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as path from "path";
import * as vscode from "vscode";

const SERVER_POLL_MS = 4000;

export class DeployLog {
  readonly channel: vscode.OutputChannel;
  private offset = 0;
  private readonly file: string;

  constructor(ws: string) {
    this.channel = vscode.window.createOutputChannel("Course: Deploy");
    this.file = path.join(ws, ".course", "deploy.log");
    this.catchUp();
  }

  /** Append whatever the sidecar wrote since the last look. */
  catchUp(): void {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(this.file);
    } catch {
      return;
    }
    if (stat.size < this.offset) {
      this.offset = 0; // the sidecar rotated the file
      this.channel.appendLine("--- (log trimmed) ---");
    }
    if (stat.size === this.offset) {
      return;
    }
    const fd = fs.openSync(this.file, "r");
    try {
      const buf = Buffer.alloc(stat.size - this.offset);
      fs.readSync(fd, buf, 0, buf.length, this.offset);
      this.offset = stat.size;
      this.channel.append(buf.toString("utf8"));
    } finally {
      fs.closeSync(fd);
    }
  }
}

export class ServerLog {
  readonly channel: vscode.OutputChannel;
  private since = "";
  private lastStamp = "";
  private timer: NodeJS.Timeout | undefined;
  private inFlight = false;

  constructor(private readonly control: string, private readonly learner: string, private readonly token: string) {
    this.channel = vscode.window.createOutputChannel("Course: Server");
  }

  start(): void {
    if (!this.control || !this.learner || !this.token) {
      this.channel.appendLine("(no course server configured: set redstone.control and redstone.token, or run inside the course editor)");
      return;
    }
    // First fetch: the last few minutes, so the panel is not empty on open.
    this.since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    void this.poll();
    this.timer = setInterval(() => void this.poll(), SERVER_POLL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async poll(): Promise<void> {
    if (this.inFlight) {
      return;
    }
    this.inFlight = true;
    try {
      const text = await fetchText(`${this.control}/api/logs/${this.learner}?since=${encodeURIComponent(this.since)}`, this.token);
      for (const line of text.split("\n")) {
        const sp = line.indexOf(" ");
        if (sp < 0) {
          continue;
        }
        const stamp = line.slice(0, sp);
        if (stamp <= this.lastStamp) {
          continue; // docker's --since is inclusive; skip what we already showed
        }
        this.lastStamp = stamp;
        this.since = stamp;
        this.channel.appendLine(line.slice(sp + 1));
      }
    } catch (e) {
      // The server restarting or the control plane redeploying is routine; say it once per gap.
      if (this.lastStamp !== "err") {
        this.channel.appendLine(`(could not reach the course server log: ${e})`);
        this.lastStamp = this.lastStamp || "";
      }
    } finally {
      this.inFlight = false;
    }
  }
}

function fetchText(url: string, token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.get(url, { headers: { Authorization: `Bearer ${token}` }, timeout: 10_000 }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if ((res.statusCode ?? 500) >= 400) {
          reject(new Error(`${res.statusCode}: ${body.slice(0, 120)}`));
        } else {
          resolve(body);
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}
