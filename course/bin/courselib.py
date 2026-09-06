"""Shared by build-tags and new-workspace. Standard library only."""

import shutil
import subprocess
import sys
from pathlib import Path

COURSE = Path(__file__).resolve().parent.parent
GIT_IDENTITY = ["-c", "user.name=course", "-c", "user.email=course@localhost"]


def die(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(2)


def git(repo, *args, check=True):
    return subprocess.run(["git", *GIT_IDENTITY, "-C", str(repo), *args],
                          capture_output=True, text=True, check=check)


def lesson_ids():
    return [p.stem for p in sorted((COURSE / "lessons").glob("*.md"))]


def copy_tree(src, dst):
    """Copy src's contents over dst, creating directories, overwriting files."""
    for p in src.rglob("*"):
        rel = p.relative_to(src)
        target = dst / rel
        if p.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, target)


def stage_workspace(dst):
    """Lay out a fresh workspace: template plus a copy of every lesson."""
    dst.mkdir(parents=True, exist_ok=True)
    copy_tree(COURSE / "templates" / "workspace", dst)
    lessons = dst / "lessons"
    lessons.mkdir(exist_ok=True)
    for p in (COURSE / "lessons").glob("*.md"):
        shutil.copy2(p, lessons / p.name)
