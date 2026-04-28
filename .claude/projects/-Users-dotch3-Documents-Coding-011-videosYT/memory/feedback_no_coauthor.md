---
name: No Co-Authored-By in commits
description: Never include the Co-Authored-By Claude attribution line in git commit messages
type: feedback
---

Never add `Co-Authored-By: Claude ...` to git commit messages.

**Why:** User explicitly asked to remove it — doesn't want Claude attribution in commit history.

**How to apply:** All git commits in this project must omit the Co-Authored-By trailer entirely.
