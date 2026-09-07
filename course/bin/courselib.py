"""Shared by build-tags and new-workspace. Standard library only.

course/bin/lesson stays one self-contained file (it is what a learner's
terminal runs); the authoring scripts import it from here as a module instead
of duplicating its lesson parser.
"""

import importlib.machinery
import importlib.util
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

COURSE = Path(__file__).resolve().parent.parent
# A fixed identity and no signing, so the replay works on any box whatever the
# user's global git config says. safe.directory=*: the provisioner runs as
# root over workspaces owned by the learner's uid, which git otherwise refuses.
GIT_CONFIG = ["-c", "user.name=course", "-c", "user.email=course@localhost",
              "-c", "commit.gpgsign=false", "-c", "tag.gpgSign=false",
              "-c", "safe.directory=*"]


def die(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(2)


def git(repo, *args, check=True):
    try:
        return subprocess.run(["git", *GIT_CONFIG, "-C", str(repo), *args],
                              capture_output=True, text=True, check=check)
    except FileNotFoundError:
        die("git is not installed; the solution tags need it")
    except subprocess.CalledProcessError as e:
        die(f"git {' '.join(args)} failed in {repo}:\n{(e.stderr or e.stdout).strip()}")


def load_checker():
    """Import course/bin/lesson (it has no .py suffix) as a module."""
    path = COURSE / "bin" / "lesson"
    loader = importlib.machinery.SourceFileLoader("lesson", str(path))
    spec = importlib.util.spec_from_loader("lesson", loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


def lesson_paths():
    return sorted((COURSE / "lessons").glob("*.md"))


def copy_tree(src, dst):
    """Copy src's contents over dst, creating directories, overwriting files."""
    shutil.copytree(src, dst, dirs_exist_ok=True)


def refresh_lessons(ws):
    """Make ws/lessons/ an exact copy of course/lessons/."""
    lessons = ws / "lessons"
    lessons.mkdir(parents=True, exist_ok=True)
    keep = {p.name for p in lesson_paths()}
    for p in lesson_paths():
        shutil.copy2(p, lessons / p.name)
    for p in lessons.glob("*.md"):
        if p.name not in keep:
            p.unlink()


# Template entries the course owns outright: refreshed in existing workspaces.
# Everything else in the template is copied once and then belongs to the learner.
TEMPLATE_OWNED = {".vscode", "assets"}


def refresh_template(ws):
    """Bring an existing workspace up to the current template without touching
    what the learner owns: course-owned entries are overwritten, other
    top-level entries are only added when missing."""
    template = COURSE / "templates" / "workspace"
    for entry in template.iterdir():
        target = ws / entry.name
        if entry.name in TEMPLATE_OWNED:
            if entry.is_dir():
                shutil.copytree(entry, target, dirs_exist_ok=True)
            else:
                shutil.copy2(entry, target)
        elif not target.exists():
            if entry.is_dir():
                shutil.copytree(entry, target)
            else:
                shutil.copy2(entry, target)


def stage_workspace(dst):
    """Lay out a fresh workspace: template plus a copy of every lesson."""
    dst.mkdir(parents=True, exist_ok=True)
    copy_tree(COURSE / "templates" / "workspace", dst)
    refresh_lessons(dst)


def init_repo(ws, message):
    git(ws, "init", "-q", "-b", "main")
    git(ws, "add", "-A")
    git(ws, "commit", "-q", "-m", message)


def grader_ids():
    """The lesson ids course/grader_bp/scripts/main.js answers to (the keys of `checks`)."""
    text = (COURSE / "grader_bp" / "scripts" / "main.js").read_text(encoding="utf-8")
    return set(re.findall(r'^\s*"([^"]+)":\s*\(\)\s*=>', text, re.M))


def build_tags(ws, verify=True):
    """Replay the solutions into lesson/<id>/step-N and step-N-solution tags,
    fetch them into ws, drop stale lesson/* tags there and refresh ws/lessons/.

    Returns the number of steps built. Dies on a malformed lesson, a game check
    the grader cannot answer, or a solution that fails its own checks.
    """
    checker = load_checker()
    try:
        lessons = [checker.Lesson(p) for p in lesson_paths()]
    except checker.BadLesson as e:
        die(str(e))
    if not lessons:
        die(f"no lessons in {COURSE / 'lessons'}")
    known = grader_ids()
    for lesson in lessons:
        for step in lesson.steps:
            for c in step.checks:
                if checker.check_kind(c) == "game" and c["game"] not in known:
                    die(f"{lesson.path.name}: step {step.n} asks the grader for {c['game']!r}, but "
                        f"course/grader_bp/scripts/main.js has no check with that key")
    built = []
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        stage_workspace(tmp)
        init_repo(tmp, "template")
        for lesson in lessons:
            for step in lesson.steps:
                before = f"lesson/{lesson.id}/step-{step.n}"
                after = f"{before}-solution"
                git(tmp, "tag", "-f", before)
                overlay = COURSE / "solutions" / lesson.id / f"step-{step.n}"
                if overlay.is_dir():
                    copy_tree(overlay, tmp)
                    git(tmp, "add", "-A")
                    if git(tmp, "status", "--porcelain").stdout.strip():
                        git(tmp, "commit", "-q", "-m", f"{lesson.id} step {step.n}")
                if verify:
                    out = []
                    _, failing, _ = checker.run_lesson(tmp, lesson, upto=step.n, out=out)
                    if failing is not None:
                        print("\n".join(out))
                        die(f"the solution for {lesson.id} step {step.n} fails its own checks (above)")
                git(tmp, "tag", "-f", after)
                built.extend([before, after])
        for tag in git(ws, "tag", "-l", "lesson/*").stdout.split():
            if tag not in built:
                git(ws, "tag", "-d", tag)
        git(ws, "fetch", "-q", "--no-tags", "--force", str(tmp), "refs/tags/*:refs/tags/*")
    refresh_lessons(ws)
    refresh_template(ws)
    return len(built) // 2
