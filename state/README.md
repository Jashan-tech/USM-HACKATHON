# Refree — agent state

This directory holds the four context buckets for long-running / multi-session
agent work (progressive context shaping). Any agent that lands in this repo
must read `current.md` first.

| File | Bucket | Read when |
|---|---|---|
| `current.md` | Current state — goal now, active decisions, open questions, next action, stop condition | Always, at session start |
| `context_map.md` | Map — what exists and where it lives | When you need to find material |
| `decisions.md` | History — what was decided and why | When you need the "why" behind a choice |
| `README.md` | This file | n/a |

## Rules
- `current.md` is the source of truth for what to do NEXT. Keep it < ~60 lines.
- When a decision is superseded, move it to `decisions.md` and update `current.md`.
- Do not paste everything into the prompt. Use `context_map.md` to find the bit you need.
- A correction from San must update `current.md`, not just the draft in front of you.
