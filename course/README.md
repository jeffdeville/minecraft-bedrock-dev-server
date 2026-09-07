# The course, for authors

What is here:

- `FORMAT.md` — the contract between lessons, checker, platform and editor.
  Read it before touching a lesson.
- `lessons/NN-slug.md` — the sixteen lessons (`00-tour` to `15-quest`). The
  design they follow, with the reasoning, the predicted mistakes and the
  phone facts, is `docs/2026-09-07-course-design.md`.
- `solutions/<id>/step-N/` — overlays that produce the state after each
  step. `main.js` and `en_US.lang` overlays are cumulative in lesson order
  (lesson 10's `main.js` contains lessons 03 to 09's changes), so the
  replayed tags and `lesson answer` stay right for a learner who did the
  lessons in order. A step with no overlay is check-only.
- `templates/workspace/` — the skeleton every learner starts from; complete
  and working, with `{{UUID}}` placeholders rendered per workspace.
- `grader_bp/` — the in-game grader; `game` check ids in lessons must be
  keys of its `checks` table.
- `bin/` — `lesson` (the checker), `new-workspace`, `build-tags`.
- `PARENT.md` — one line per lesson for whoever sits beside the learner.

How to verify a change:

```
course/bin/new-workspace /tmp/ws      # builds every solution tag; stops on
                                      # the first step whose solution fails
                                      # its own checks
cd /tmp/ws && PATH=$PWD/../course/bin:$PATH lesson check 05
```

Then break the lesson the way a learner would (a capital letter, the ```
fence pasted, the block inside the hello block, the wrong folder) and read
the message. The first failing check is the only one the learner sees, so
in `main.js` steps put the `js` check first: a syntax error must be reported
as one, not as "the message still says …".

Rules that are easy to forget: lessons are independent (checks assert only
what the lesson adds, and pass on the bare skeleton plus that lesson's own
edits); the last step is the playable moment and carries the rejoin
paragraph verbatim (`00-tour` is the one exception, since it is the first
join); code lines in lesson snippets are at most 44 characters; every
`msg` is a sentence for a twelve-year-old saying what to do next.
