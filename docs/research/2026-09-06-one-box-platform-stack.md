# Platform stack for a one-VPS Bedrock coding course

Research report, 2026-09-06. Feeds the
[project plan](../2026-09-06-guided-course-plan.md).

**Versions checked via GitHub/Codeberg APIs on 2026-09-06:** code-server v4.135.0 (2026-08-27, bundles Code 1.135.0); OpenVSCode Server v1.109.5 (2026-02-20, repo last pushed 2026-03-26); Coder v2.37.0 (2026-09-01); itzg/minecraft-bedrock-server 2026.8.2 (2026-08-20); Gitea v1.27.3 (2026-08-29); Forgejo v16.0.3 / LTS v15.0.7 (2026-08-20); Eclipse Che 7.121.0 (2026-08-07); BDS 1.26.45.1 (what `VERSION=LATEST` downloaded that day).

**Measured on a dev machine (Docker 29.5.2, arm64 host, so x86 images ran under qemu):**

| Thing | RSS (`docker stats`) |
|---|---|
| code-server 4.135.0, `--auth none`, no browser connected | 53 MiB |
| same, one browser tab open, defaults | **565 MiB** (309 MiB of it is a bundled `@github/copilot` agent process + 122 MiB `agentHost`) |
| same, with `"chat.disableAIFeatures": true` in User settings | **310 MiB** |
| BDS 1.26.45.1 (itzg image), idle, zero players, one behavior pack | **402–436 MiB** — *under qemu-x86_64 emulation, so treat as an upper bound* |

## 1. Multi-user VS Code in the browser

code-server's own FAQ says it is single-user and points teams at "one VM per user" or Coder ([FAQ](https://coder.com/docs/code-server/FAQ)). Its stated minimum is 1 GB RAM / 2 cores per instance ([requirements](https://coder.com/docs/code-server/requirements)). Extensions come from Open VSX, not Microsoft's marketplace (FAQ). Auth is `password` (argon2 `hashed-password` supported, rate-limited 2/min + 12/hr) or `none`; the guide explicitly recommends putting Pomerium/oauth2-proxy/Cloudflare Access in front when you use `--auth none` ([guide](https://coder.com/docs/code-server/guide)).

**(i) code-server per learner, `--auth none`, proxy does auth.** Works; this is the documented pattern. Cost is what was measured: ~310 MiB per learner with an editor open once you disable the AI features, ~565 MiB if you don't. Weekly releases track VS Code within days.

**(ii) OpenVSCode Server per learner.** Same shape, `gitpod/openvscode-server` on port 3000, `--connection-token`/`--connection-token-file` or `--without-connection-token` (the Docker default), Open VSX marketplace ([README](https://github.com/gitpod-io/openvscode-server)). Two problems in 2026: the last release is v1.109.5 from February and the repo has had no push since March — Gitpod became Ona in 2025 and OpenAI announced acquiring Ona in June 2026 ([TNW](https://thenextweb.com/news/openai-acquires-ona-codex)), so this fork is effectively unmaintained and ~26 VS Code versions behind code-server. It also has no sub-path serving flag; code-server does serve under a sub-path natively (FAQ lists it as a differentiator). Not recommended.

**(iii) Coder.** Docker install wants "2 CPU cores and 4 GB memory free", offers a built-in Postgres for proof-of-concept but recommends external Postgres 13+ for anything real ([install/docker](https://coder.com/docs/install/docker)); Terraform is bundled in the image and is how every workspace is provisioned ([offline docs](https://coder.com/docs/install/offline)); the smallest validated architecture is 3×(2 vCPU, 8 GB) coderd plus an 8 vCPU/30 GB database ([1k-users](https://coder.com/docs/admin/infrastructure/validated-architectures/1k-users)). It solves accounts, per-user workspaces and a web IDE — but on a 4–8 GB box it would consume the budget for the learners. Overkill for three users.

**(iv) Gitea/Forgejo as accounts + git.** Forgejo v16.0.3 with SQLite runs comfortably on 1 vCPU / 1 GB for a couple of users ([selfhostvps guide](https://selfhostvps.com/en/forgejo-vps-requirements/) — the official docs give no figure). It gives you accounts, password login, a web UI for the repos, and OAuth2 provider mode that oauth2-proxy could sit on. But the workspaces are *local* repos with no remote needed, so Forgejo would be ~150–300 MB of RAM to solve a problem you don't have. Skip for the prototype; add later if you want kids to see history in a browser.

**(v) Others.** Eclipse Che 7.121 requires a Kubernetes cluster with an Ingress controller and an OIDC provider ([getting started](https://eclipse.dev/che/getting-started/)) — not a one-box tool. DevPod: no push since 2025-11-14, last stable release March 2025, only alphas since — stalled. Daytona: pivoted to AI sandboxes and moved development closed-source in June 2026; the public repo "will receive no further updates" ([Daytona announcement](https://www.daytona.io/dotfiles/updates/daytona-is-going-closed-source)). Gitpod self-hosted: archived.

**Recommendation:** (i). One `codercom/code-server:4.135.0` container per learner, `--auth none`, `chat.disableAIFeatures: true` baked into the image's default User settings, Caddy in front doing auth (section 4). The auth backend is your own app; Authelia/oauth2-proxy add another 50–100 MB and an identity model you don't need for three users.

## 2. Per-learner Bedrock servers on one box

**Image/tags.** `itzg/minecraft-bedrock-server` tags are `latest` (main branch), `stable` (newest image release), and `YYYY.M.N` (e.g. `2026.8.2`). BDS itself is *not* in the image; `VERSION=LATEST|PREVIEW|<ver>` is downloaded at container start ([README](https://github.com/itzg/docker-minecraft-bedrock-server)). Pin the image tag *and* keep the existing `update-bds.sh --pin` logic — nothing changes there.

**RAM.** Measured 402–436 MiB idle with no players (emulated, so real x86 is likely lower; a hosting-provider guide puts the vanilla BDS baseline at 400–600 MB — [GBNodes](https://gbnodes.host/blogs/minecraft-bedrock-dedicated-server-ram-4-players-2026/) — but that is operational estimate, not a benchmark). Minecraft Wiki's official-ish "4 GB minimum" is for 10+ players ([wiki](https://minecraft.wiki/w/Bedrock_Dedicated_Server)). **Could not verify** a one-player number; budget ~700 MB per instance with one kid exploring, and cap with `deploy.resources.limits.memory: 1g`. Note there is no `-Xmx` equivalent on Bedrock (wiki).

**Multiple instances, distinct UDP ports.** Supported: set `SERVER_PORT` and `SERVER_PORT_V6` per container (README: "Always set the IPv6 port via SERVER_PORT_V6, do not set ports via server.properties"). Each container gets e.g. `19132`, `19142`, `19152`; publish `-p 19142:19142/udp`. Two gotchas from the README: the default v6 port is 19133 so a naive "19132, 19133, 19134" plan collides, and dual-stack clients time out unless you set `ENABLE_BDS_V6BIND_FIX=true` with v4/v6 on the same port.

**Which clients can join a custom port.** Windows, Android, iOS/iPadOS: Play → Servers → Add Server, with a port field ([XGamingServer](https://xgamingserver.com/docs/minecraft-bedrock/join-server), [oxygenserv](https://www.oxygenserv.com/en/how-to-connect-to-minecraft-bedrock-server-pc-mobile)). Xbox, PlayStation, Switch: no "Add Server" at all; the workaround is a BedrockConnect DNS redirect that hijacks the Featured Servers list and *does* let you enter IP+port there ([holy.gg](https://www.holy.gg/en/post/join-custom-minecraft-bedrock-servers-xbox-switch)). If any learner is on a console, run a BedrockConnect container (it needs UDP 19132 for itself) — otherwise ignore.

**Console commands, no RCON.** Confirmed: BDS has no RCON ([Minecraft Wiki BDS](https://minecraft.wiki/w/Bedrock_Dedicated_Server), [itzg #273](https://github.com/itzg/docker-minecraft-bedrock-server/issues/273)). The image ships `bin/send-command` (`docker exec <c> send-command gamerule dofiretick false`), which is 10 lines of bash: it finds the `bedrock_server-*` process under `/proc` and `echo`s into its `fd/0`. It worked *without* `stdin_open`/`tty` because `mc-server-runner` (v1.15.2, PID 1's child) gives BDS a pipe. `docker attach` needs `stdin_open: true` + `tty: true` and is for humans. `ENABLE_SSH=true` gives an SSH console on 2222 via mc-server-runner's `-remote-console` — not needed. Caveat hit: on arm64 under emulation `send-command`'s `/proc/*/exe` match fails; on real x86 it is fine.

**`/scriptevent` from a player-less console — verified on BDS 1.26.45.1:**

```
scriptevent lesson:check hello from console
→ [INFO] Script event lesson:check has been sent
→ [WARN] [Scripting] [probe] id=lesson:check message="hello from console" sourceType=Server sourceEntity=undefined sourceBlock=undefined initiator=undefined
→ [WARN] [Scripting] PASS lesson1
```

`sourceType` is `"Server"`, matching the `ScriptEventSource.Server` doc: "originated from the server, such as from a runCommand API call or a dedicated server console" ([Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/scripteventsource?view=minecraft-bedrock-stable)). The id must be namespaced and not `minecraft:` ([wiki](https://minecraft.wiki/w/Commands/scriptevent)). The pack used `@minecraft/server` 2.9.0 as in `examples/hello-pack`.

**The thing that will bite you:** script `console.warn` is **dropped** unless `content-log-console-output-enabled=true`; BDS prints `Content logging to console is disabled` at boot. Set `CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true` on the container (itzg maps it). With it on, `docker logs --follow --since 5s <c> | grep -m1 '^\[.*\] \[Scripting\] PASS '` is the whole checker transport. The README already hints at this; the compose file should make it non-optional.

## 3. Deploy-on-save inside one box

Simplest honest design: **one `inotifywait` sidecar per learner, running the existing `deploy.sh` logic with a per-learner `DATA`/`STATE`/`LEVEL`.** `install-packs.py` already takes `ADDONS DATA STATE LEVEL` positionally, so the per-learner variant is a wrapper that sets paths; the rsync step disappears (same box). Loop:

```
inotifywait -m -r -e close_write,moved_to,create,delete --format '%w%f' "$WS/packs" |
while read -r _; do
  while read -r -t "$SETTLE" _; do :; done   # drain until $SETTLE s of quiet
  deploy-learner.sh "$NAME" || true          # never exit the loop
done
```

`close_write` (not `modify`) means you see complete files; a settle of 2 s catches VS Code's multi-file saves. Half-saved JSON is handled where it already is: `install-packs.py` fails loudly on a bad manifest and the next save retries — keep that, and have the wrapper write the failure text to `state/<name>/deploy.json` so the control plane can show it to the learner. Do *not* let the wrapper touch the world if the parse fails.

Alternatives, and why not: the emeraldwalk **Run on Save** extension (v1.1.5, available on Open VSX) needs per-workspace settings and runs *inside* the code-server container, which then needs the Docker socket — a privilege escalation you don't want a child's editor to have. A **git post-commit hook** only fires on commit; kids save, not commit — but it is a good *second* trigger ("lesson complete = commit"). A VS Code **task on save** has no such trigger without an extension. A `git` snapshot per successful deploy (`git add -A && git commit -qm "deploy $(date)"` in the wrapper) gives you history for free.

## 4. Accounts/DB and the control plane

Yes, Caddy `forward_auth` plus a ~200-line Python app is the smallest honest design. `forward_auth` GETs your auth endpoint with `X-Forwarded-Uri`/`X-Forwarded-Method`; 2xx passes and copies chosen headers, anything else is returned to the browser as-is (your login redirect) ([Caddy docs](https://caddyserver.com/docs/caddyfile/directives/forward_auth)). The app: stdlib `http.server` or Flask, `sqlite3` with `users(name, argon2/scrypt hash, is_admin)`, `progress(user, lesson, status, output, ts)`, a signed cookie (`hmac` + `secrets`), and `subprocess.run(["docker","compose","-p",name,"-f",tmpl,"up","-d"])` for provisioning after `git init` + copying the course tree. Provision also writes the learner's `SERVER_PORT` and starts their inotify sidecar.

```caddyfile
course.example.com {
    handle /login* /logout* /api/* /static/* {
        reverse_proxy control:8000
    }
    handle /u/* {
        forward_auth control:8000 {
            uri /auth/check
            copy_headers X-Learner
        }
        @alice { path /u/alice/*  header X-Learner alice }
        @bob   { path /u/bob/*    header X-Learner bob }
        @admin { header X-Learner admin }
        handle @alice { uri strip_prefix /u/alice  reverse_proxy code-alice:8080 }
        handle @bob   { uri strip_prefix /u/bob    reverse_proxy code-bob:8080 }
        handle @admin { uri strip_prefix_regexp ^/u/[^/]+  reverse_proxy {http.regexp...} }
        respond 403
    }
    handle { reverse_proxy control:8000 }   # dashboard: lessons, PASS/FAIL, deploy output
}
```

`/auth/check` reads the cookie, returns 200 + `X-Learner: <name>` or 302 to `/login`; the per-learner `@` matchers stop Alice reaching `/u/bob/`. Generate the matcher block from the DB on provision and `caddy reload` (Caddy's admin API on `:2019`), or use Caddy's `{http.reverse_proxy.upstream}` with a `map` — either is a few lines. code-server serves happily under `/u/<name>/` (FAQ). Admin lands on every learner's editor; that doubles as "look at the kid's screen".

**Alternative — `--auth password` per code-server, no proxy auth.** Costs: a separate password per container in each learner's config (no central store), no progress dashboard login to reuse, and the deploy output has nowhere authenticated to render. You still need Caddy for TLS and path routing, so you save only the `/auth/check` handler — ~30 lines. Not worth it.

## 5. Packaging

**Recommend: a bootstrap script + a directory + a systemd unit that runs `docker compose`.** `curl -fsSL https://get.docker.com | sh` (or the apt repo per [Docker's Ubuntu install docs](https://docs.docker.com/engine/install/ubuntu/)), unpack the tarball/clone to `/opt/<name>`, write `/etc/systemd/system/<name>.service` with `ExecStart=docker compose -f /opt/<name>/docker-compose.yml up -d` / `ExecStop=... down`, `WantedBy=multi-user.target`, plus `restart: unless-stopped` on every service so Docker itself brings them back after reboot — that alone survives reboot; the unit adds the `stop`/`start` handle. This is exactly the existing `bootstrap-server.sh` + `deploy.sh` pattern, extended with per-learner compose projects (`docker compose -p <name>`) that the control plane starts and which also carry `restart: unless-stopped`.

**Debian package**: nicer `apt remove`, but you still need Docker installed first and a postinst that does the same steps; packaging cost for a three-user prototype is not justified. **Compose-only bundle**: reboot-safe via restart policies, but leaves Docker installation and the inotify sidecars (which need host inotify or `pid: host`) to the reader — that is the bootstrap script by another name. **Nix/NixOS**: the cleanest declarative answer (`virtualisation.oci-containers`), but forces a NixOS image on the VPS and a language nobody else on the project reads. Run the inotify sidecars as containers with the workspace bind-mounted and the Docker socket *not* mounted; they only need write access to the learner's BDS `data/` directory (also a bind mount), so no socket is required for the deploy path at all — only the control plane needs the socket, for provisioning and `docker logs`.

## 6. Resource budget: admin + 2 learners

| Component | Count | RAM each | Total |
|---|---|---|---|
| Ubuntu + dockerd + containerd | 1 | ~450 MB | 450 |
| Caddy | 1 | ~30 MB | 30 |
| Control plane (Python + SQLite) | 1 | ~50 MB | 50 |
| code-server, AI off, editor open | 3 (admin+2) | 310 MiB measured | 930 |
| BDS, one player | 2 (learners) — admin uses a learner's | ≤700 MB (idle 402–436 measured, emulated) | 1,400 |
| inotify sidecars | 2 | ~5 MB | 10 |
| **Sum** | | | **~2.9 GB** |

Add page cache and headroom for a chunk-heavy exploration session and a browser tab that leaks. **4 GB is the floor and is tight; 8 GB is the comfortable pick.** With the default code-server (AI on) the three editors alone are 1.7 GB, so bake the setting in. Pricing seen on 2026-09-06: Hetzner CX23 2 vCPU/4 GB €3.49/mo ([Hetzner](https://www.hetzner.com/news/new-cloud-plans/)); Vultr 2 vCPU/4 GB $20/mo ([Vultr](https://www.vultr.com/products/regular-performance-compute/)). A 4 GB Vultr with a 1 GB memory limit per BDS works for the prototype, 8 GB if a third learner or a console-player BedrockConnect container appears. CPU matters more than RAM for BDS (wiki recommends 3 GHz+ cores); 2 vCPU is enough for two idle worlds, expect stutter if both kids explore simultaneously.

## What could not be verified

- BDS RAM with one connected player, and non-emulated idle RSS (numbers are under qemu on arm64).
- code-server memory over multi-day sessions — several GitHub issues report growth; plan on `docker restart` nightly.
- OpenVSCode Server behind a sub-path (no flag documented; not tested).
- Whether BedrockConnect still works with client 1.26.x on consoles (not tested; no console available).
- Coder's own idle RSS on the Docker install (docs give only the "4 GB free" prerequisite).
