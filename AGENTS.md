# AGENTS.md

Working rules, and nothing else. **A line that describes what the repo _is_ — an inventory, a
lookup table, a how-to, a story — does not belong here.** A rule carries the failure it prevents
whenever one is what makes it obeyable.

**`docs/constitution.md` outranks this file.** It holds the non-negotiable rules and is never
restated here. `docs/incidents.md` holds the history behind them.

**Language.** Every repo document is English, specs and JSDoc included; `Memory.md` is the agent's
call.

## Workflow

### Before writing code

- **A feature or a refactor starts with a spec**, in `specs/NNN-<name>/spec.md`. Read the
  constitution and the active spec first.
- A typo, a rename, a comment or a formatting fix does not need a spec. When it is not clear which
  one a change is, **ask**.
- **The spec template and its rules live in the `sdd` skill**, `.agents/skills/sdd/SKILL.md` — the
  only copy. It is gitignored, so it lives per machine.
- **Every RF carries the check that settles it.** A requirement with no check is prose that reads
  like coverage.
- **A spec never overrides the constitution or this file.** A contradiction is the finding: resolve
  it in those two files first, then in the code.
- **Reference the spec in the commits it produces.**

### Verifying

- **There is no test runner yet.** Until one is chosen by its own spec, a change is verified by
  building the touched package (`npm run build --workspace=<package>`) and opening every touched
  docs page from a running dev server (`npm run dev`) — say which pages were opened.
- **Validating a spec covers its non-functional requirements and edge cases, not only its RFs.**
- **The working tree is CRLF.** Normalise before matching an anchor, or the probe finds nothing.

### Visual work, one component at a time

1. Change **one** component. Show it in both themes when the docs site has two.
2. **Stop and wait for approval.** Do not commit an unapproved component, do not start the next.
3. On approval, commit that component, then move on.

### Before showing a proposal

- **Re-read each proposal as a senior reviewer** looking for inconsistency and contradiction, and
  say plainly what that turned up.
- **Prefer a number to an adjective, and say which one you have.**

### Commands

- **Do not run `npx astro check`** until a spec decides type-checking is part of the policy.
- **Do not add a linter, formatter or test runner to make a check pass** — constitution 5.

### Git

- **NEVER push. NEVER commit unless asked.** Finishing a task does not imply committing.
- **Commits follow Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`…), which
  `sui-mono changelog` and `release` read to version the packages.
- **A new spec is drafted from `main`, and gets its own branch once approved**: `spec/NNN-<name>`.
- `AGENTS.md` and `docs/constitution.md` get their own `docs:` commit.
- **`git checkout -- .` destroys uncommitted work silently.** Revert explicit paths only.
- **`bloque/` is scratch and never tracked.**

### Memory

- **Read `Memory.md` before proposing anything**, and update it after each task.
- **Keep `Memory.md` under 50 lines.** Summarise what is stale and delete it.
- **Three homes, one rule each**: non-negotiable rules in `docs/constitution.md`, working rules
  here, state and context in `Memory.md`. Never duplicate a rule across two.

## Rules

### Sensitive data

- **Never write paths with the real user name, emails, tokens or passwords into a repo document or
  a commit message.** Use placeholders — `C:\Users\<user>\...`, `<email>`, `<token>`.

### Agent tooling

- **Agent tooling is never tracked** — `.agents/`, `.claude/`, `.opencode/`, `skills-lock.json`,
  `opencode.json` and `opencode.jsonc` are per-machine. Re-run `powershell -File .agents/link.ps1`
  after changing `.agents/`.
