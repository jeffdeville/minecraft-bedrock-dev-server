# Redstone Course extension

The guidance layer of the course, as a VS Code extension. It works the same in
desktop VS Code and in code-server, because it runs in the extension host, not
the browser. It renders over the data `course/FORMAT.md` defines and drives
the checker `course/bin/lesson` (`lesson json`); it holds no lesson logic of
its own.

What it shows, in a "Course" panel in the activity bar:

- the lesson's Idea, the step list with done/current markers, and the
  current step's instructions;
- the check results for the current step after every save, with the message
  written for the learner;
- Hint (automatic after the second failed save), Show answer (the diff),
  Write the answer, Next lesson, Check in the game, and Open buttons for the
  lesson's files;
- the last deploy in the status bar: deploying, live, or failed with the
  reason.

## Build

```
cd extension
npm install
npm run package          # -> redstone-course.vsix
```

`platform/code-server/Dockerfile` builds it in a Node stage and installs the
`.vsix` into the learner's editor image, so the box never needs Node. For
desktop VS Code, install the `.vsix` with "Extensions: Install from VSIX" and
set `redstone.checker` to the path of `course/bin/lesson` if it is not on
`PATH`.
