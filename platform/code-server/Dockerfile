# The learner's editor. No auth of its own (Caddy and the control plane
# decide who gets here), AI features off (halves memory), the course checker
# on PATH, the lesson preview and autosave settings baked in, and the Redstone
# Course extension installed.
#
# Build context is the repository root (learner.compose.yml sets it) so the
# first stage can bundle extension/. The box never needs Node: the .vsix is
# built here.
FROM node:22-bookworm-slim AS ext
WORKDIR /ext
COPY extension/package.json extension/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY extension/ ./
RUN npm run package

FROM codercom/code-server:4.135.0

USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 git curl \
 && rm -rf /var/lib/apt/lists/*
COPY platform/code-server/settings.json /home/coder/.local/share/code-server/User/settings.json
COPY --from=ext --chown=coder:coder /ext/redstone-course.vsix /tmp/redstone-course.vsix
RUN chown -R coder:coder /home/coder/.local
USER coder
RUN code-server --install-extension /tmp/redstone-course.vsix && rm -f /tmp/redstone-course.vsix

# /course is a read-only mount of the repository's course/ directory.
# code-server's bundled Node goes on PATH so the checker can `node --check`
# a learner's script.
ENV PATH=/course/bin:/usr/lib/code-server/lib:$PATH
WORKDIR /workspace
CMD ["--bind-addr", "0.0.0.0:8080", "--auth", "none", \
     "--disable-telemetry", "--disable-update-check", "--disable-workspace-trust", \
     "/workspace"]
