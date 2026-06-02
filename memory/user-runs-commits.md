---
name: user-runs-commits
description: User runs all git commits themselves — give them the command, never run git commit/push/reset
metadata:
  type: feedback
---

The user commits everything themselves. When work is ready, OUTPUT the exact ready-to-run command(s) (e.g. `git add <files> && git commit -m "..."`) for them to copy and run. Do NOT execute `git commit`, `git push`, or `git reset` yourself — even when they ask to "make commits" or "separate commit messages" (that means *give me the commands/messages*, not run them).

**Why:** They want to review and control exactly what goes into history.
**How to apply:** Make the code changes, then present commit command(s) grouped by functionality with full messages (including the `Co-Authored-By: Claude Opus 4.8` trailer). Stop there and let the user run them. If hunk-level splitting is needed, give them the steps/commands rather than staging it yourself.
