# The learner's editor. No auth of its own (Caddy and the control plane
# decide who gets here), AI features off (halves memory), the course checker
# on PATH, the lesson preview and autosave settings baked in.
FROM codercom/code-server:4.135.0

USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 git curl \
 && rm -rf /var/lib/apt/lists/*
COPY settings.json /home/coder/.local/share/code-server/User/settings.json
RUN chown -R coder:coder /home/coder/.local
USER coder

# /course is a read-only mount of the repository's course/ directory.
ENV PATH=/course/bin:$PATH
WORKDIR /workspace
CMD ["--bind-addr", "0.0.0.0:8080", "--auth", "none", \
     "--disable-telemetry", "--disable-update-check", "--disable-workspace-trust", \
     "/workspace"]
