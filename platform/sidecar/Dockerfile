FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 git rsync inotify-tools curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY watch.sh deploy-learner.sh /sidecar/
RUN chmod +x /sidecar/*.sh
# Runs as uid 1000, the owner of the workspace and the server's data dir (compose sets user:).
ENTRYPOINT ["/sidecar/watch.sh"]
