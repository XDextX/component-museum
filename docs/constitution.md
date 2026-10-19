# Constitution

Status: approved 2026-10-19 by the owner — 10 rules, reviewed in full.

**Purpose.** This repo is the single home of the components the owner builds other projects
with. Each component ships as a package for every framework it supports, so any project can
install it and use it without extra setup. The gallery is where each one is seen, explained and
manipulated.

Each rule names where it is decided: a test, a command, or a file to read. Breaking one is a
bug — the fix is the rule or an amendment, never a workaround in the code. `AGENTS.md`
elaborates these and yields to them on any conflict.

1. **The packages are the product; the gallery is their first consumer.** `packages/docs`
   imports a component only through a package entry (`@component-museum/<framework>`), exactly
   as an outside project would, never through a path into a package's `src/`. A component that
   only works from inside the repo is not finished. *Check:* no import in `packages/docs/src`
   reaches into another package's `src/`.
2. **Install, import, use.** A consumer installs the package, imports its stylesheet once, and
   every exported component works — no build plugin, config file or extra dependency to add by
   hand. *Check:* each component's story shows the full import, and a project outside the
   workspace builds with it (how is decided by spec).
3. **Every component is exported from its package entry.** A component folder that the entry
   does not export is unreachable. *Check:* the folder list matches the entry's `export` lines.
4. **One contract, many frameworks.** A component's props, variants and events are defined once;
   each framework's implementation follows that contract under the same names. A framework that
   lacks a component says so in the gallery — it never ships a different API under the same
   name. *Check:* the gallery's framework matrix, generated from the packages' entries.
5. **No component without its story.** Each exported component has a gallery page that explains
   how to use it, how it is built and how to alter it, with live controls to manipulate its props.
   *Check:* every export has a page; a page missing a section is not done.
6. **A breaking change is versioned as one.** Other projects depend on these packages: renaming
   or removing a prop, variant or event is a `BREAKING CHANGE` commit, so `sui-mono release`
   bumps the major. *Check:* the commit that changes a contract says so.
7. **Accessible by default.** Every component meets WCAG 2.1 AA: keyboard reachable, an
   accessible name, visible focus, 4.5:1 text contrast. *Check:* its spec lists how each point
   was verified in a running browser.
8. **A mechanical rule ships with a guard, and the guard fails once.** If a rule can be settled
   by reading files, a test settles it — and is never called green before its violation was
   injected and seen red. *Check:* the rule names its test; the commit names the injection.
9. **A new dependency needs its reason first**, written in the spec that introduces it. A
   dependency a package forces on its consumers needs a stronger one: rule 2 pays for it.
   *Check:* every `package.json` diff that adds one cites a spec.
10. **Secrets stay out; documents stay English.** `.env` is gitignored and no token, password or
    personal address appears in a tracked file. Code, comments, specs, this file and `AGENTS.md`
    are English. *Check:* `git ls-files .env` is empty; reading the diff.
