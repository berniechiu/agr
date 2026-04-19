# agr (Agent Resume)

A standalone CLI for browsing, searching, tagging, and resuming Claude Code sessions.

Claude Code's built-in `--resume` shows only ~10 recent sessions. `agr` scans `.jsonl` session files directly from `~/.claude/projects/`, presents them in an inline fuzzy-filter picker, and lets you resume with a single keypress.

## Demo

```
> webhook_
  ●  my-app         Fix the retry logic in the webhook handler     10/17   142 msgs
     ⎇ feat/retries
     my-app         Add webhook signature verification             10/14    58 msgs  #sprint-12
     ⎇ master
  ↑↓ navigate · type to filter (#tag) · ⎵ preview · ⏎ resume · ^T tag · ^U untag · ^R rename
```

`Space` opens a preview pane with files changed in the session, estimated cost, and a one-line recap of the last state — see [Feature overview](#feature-overview) below.

## Install

```bash
npm install -g agr-cli
```

Or from source:

```bash
git clone https://github.com/berniechiu/agr.git && cd agr
npm install
npm run build
npm link
```

Requires Node.js >= 20.

## Quick start

```bash
agr
```

Opens the picker scoped to your current project folder. Type to filter across all projects by title, project name, branch, or tag. Press `⏎` to resume. That's the whole flow — everything below is optional.

## Feature overview

`agr` vs. Claude Code's built-in `--resume`:

| Capability | `claude --resume` | `agr` |
|---|---|---|
| **Scope** | Current dir; `Ctrl+A` for all | All projects, ranked by folder + branch |
| **Filter** | — | Type to fuzzy-filter; `#tag` scopes to tags |
| **Full-text search** | — | `agr search "<text>"` across all sessions, with inline match snippets |
| **Preview (`Space`)** | Prompt snippets | Metadata, first prompt, recent messages, **files changed, estimated cost, last-state recap** |
| **Tagging** | — | `Ctrl+T` / `Ctrl+U` in picker; `agr tag` / `agr tags` |
| **Stats** | — | `agr stats` — weekly delta, streaks, sparkline, top projects |
| **Cleanup** | — | `agr clean` — reports empty sessions, prunes orphaned tags/titles |

## Usage

### Browse sessions

```bash
agr
```

Opens an inline picker scoped to the current project folder, sorted by: current folder matches, then branch matches, then most recent. Type to filter across all projects by name, title, branch, or tag.

**Picker controls:**

| Key | Action |
|-----|--------|
| `↑↓` | Navigate sessions |
| `⏎` | Resume selected session |
| `Space` | Preview selected session |
| `Ctrl+T` | Tag selected session |
| `Ctrl+U` | Untag selected session (shows existing tags) |
| `Ctrl+R` | Rename selected session (local to agr — never modifies `~/.claude`) |
| `Esc` | Clear filter / exit |
| Type | Filter by project, title, branch, or tag |
| `#tag` | Narrow to sessions with a matching tag (bare `#` lists all tagged sessions) |

`Space` is bound only when the filter is empty, so you can still type literal spaces while filtering.

**Preview (`Space`)** shows:

- Session metadata — project, branch, id, start/end, duration, tags, cwd
- **Files** — top files edited in the session, ranked by edit count
- **Cost** — estimated USD based on per-turn token usage (hardcoded model rates; may drift)
- **Recap** — last user intent + last tool action (`Edited <path>`, `Ran: <cmd>`, etc.); heuristic, not a full summary
- The full first prompt
- The last few user/assistant messages

Content is parsed lazily — only when the preview is opened — so startup stays instant. Press `Esc` or `Enter` to return to the list.

**Row layout:** each row shows its git branch on a dim second line under the title. Tagged sessions show `#tag-name` at the end of the first line. Titles are cleaned of XML-style command wrappers (e.g. `<local-command-caveat>`) for readability.

### Search session content

```bash
# Single word: searches within current project folder
agr search "webhook"

# Multiple words: first word filters by project, rest search content
agr search "my-app webhook"
agr search "my-app schema migration"
```

The first word selects the project scope, remaining words search session content. Words are matched independently (AND logic). With a single word, the search is scoped to the current folder.

Search results open in the same picker with the same controls — you can resume, tag, or untag directly from results.

Each result row shows a dim third line with the matched phrase in context, so you can see *where* the match is without opening the session.

### Tags

```bash
# List sessions by tag (opens picker)
agr tag "sprint-12"

# List all tags with session counts
agr tags
```

Tags are stored in `~/.agr/tags.json` and never modify session files.

### Rename (local override)

Press `Ctrl+R` in the picker to rename a session. Overrides are stored in `~/.agr/titles.json` and take precedence over both the Claude Code `/rename` custom title and the auto-derived first-prompt title. An empty input clears the override. `agr` never writes to `~/.claude`, so the rename is visible only inside `agr`.

### View stats

```bash
agr stats
```

Shows total sessions, this week with week-over-week delta, active/best streak, median/longest session length, a 14-day activity sparkline, and top projects with proportional bars.

### Clean up

```bash
agr clean
```

Reports empty sessions (0 messages) and prunes orphaned entries from `~/.agr/tags.json` and `~/.agr/titles.json`. Does not modify any `~/.claude` data.

## How it works

**Safety:** `agr` is strictly read-only against `~/.claude/`. Tags, title overrides, and any other agr state live in `~/.agr/`. Resuming a session invokes `claude --resume <id>` — `agr` never touches the session file itself.

**Discovery:** Each session is a `.jsonl` file named by UUID under `~/.claude/projects/<project-hash>/`. The parser streams each file once and extracts metadata (project, first prompt, timestamps, message count, custom title, git branch) without loading the full content.

**Titles:** auto-derived from the first user prompt. If a session was renamed with Claude Code's `/rename`, that custom title takes precedence. A local `Ctrl+R` rename in agr (stored in `~/.agr/titles.json`) overrides both.

**Active sessions:** currently-running sessions are detected via `~/.claude/sessions/*.json` and marked with a green dot in the picker.

## Development

```bash
npm run dev          # Run with tsx (no build step)
npm test             # Run tests (vitest)
npm run test:watch   # Watch mode
npm run build        # Compile TypeScript to dist/
```

**Layout:**

- `src/scanner/` — JSONL discovery, parsing, and preview enrichers (files / cost / recap).
- `src/search/` — content search and snippet extraction.
- `src/picker/` — Ink + React TUI (picker, preview pane, tag / rename prompts).
- `src/commands/` — CLI subcommands (`search`, `tag`, `tags`, `stats`, `clean`).
- `src/tags/`, `src/titles/` — overlays stored under `~/.agr/`.
- `tests/` — mirrors `src/` layout. Fixtures under `tests/fixtures/` are real-shaped JSONL.

## Prior art

Several tools occupy the same space. They share the core idea — scan `~/.claude/projects/`, present a pickable list — but each leans in a different direction.

| Tool | Language | Focus |
|---|---|---|
| [cc-session](https://github.com/cc-deck/cc-session) | Rust | Instant startup (2,000+ sessions in <500ms), single-line display, background deep-search of full content, built-in conversation replay viewer with syntax highlighting |
| sessioner | TypeScript | Session-graph operations: fork, merge, prune, trim; cost breakdown and tool-usage stats |
| claude-sessions | Bash + Python | fzf-based picker, empty-session cleanup, bash-function ergonomics |
| [csm](https://github.com/ash0x0/csm) | Go | `csm reindex` to rebuild `sessions-index.json` (repairs Claude Code's own `/resume` picker); merge, move, activity heatmap |

### Where `agr` leans further

- **Non-destructive overlays.** Tags and local renames live in `~/.agr/`; `~/.claude` is strictly read-only. Most other tools either don't rename, or rename by rewriting the session file.
- **Rich preview without a separate viewer.** `Space` shows files changed, estimated cost, and a last-state recap alongside metadata and recent messages, in the same picker. `cc-session` has a dedicated viewer; `csm` has `show`/`timeline`. `agr` puts that context one keypress away in the picker itself.
- **Inline search snippets.** `agr search "<text>"` runs content search and opens results in the same picker, with the matched phrase shown as a dim third line under each row — you can judge relevance without opening the session. `cc-session` does deep-search but surfaces matches inside the viewer; `csm search` lists sessions without per-match context. (In-picker typing still matches metadata only — title, project, branch, tag — by design; content search is a deliberate separate step.)
- **First-class tags + `#tag` picker filter.** None of the tools above treat tags as a filterable dimension in the browsing UI.
- **Stats as a review tool, not just a counter.** `agr stats` gives week-over-week delta, streaks, a 14-day sparkline, and top projects with proportional bars — framed as "how am I spending my Claude time."

### Where `agr` does less

- No session-graph operations (fork, merge, prune, trim) — see `sessioner`.
- No `sessions-index.json` repair — see `csm reindex`.
- No in-terminal conversation replay viewer with syntax highlighting — see `cc-session`.
- No cross-agent support (Codex, Gemini CLI, etc.) — `agr` is Claude-Code-only by design.

## Roadmap

Ideas under consideration for future releases. Not commitments.

- **Support for other agents.** The core architecture is agent-agnostic; adding parsers for other JSONL formats (e.g. Gemini CLI) is straightforward. No ETA.
- **In-picker content search mode.** A keybinding (e.g. `/`) to switch the picker into content-search mode, so deep-search becomes reachable without leaving the picker. Today it lives only behind the `agr search` subcommand.
- **Session-graph awareness.** Detect fork / branch lineage from JSONL parent links and show session families in the picker.
- **Worktree grouping.** Distinguish main checkout from `.claude/worktrees/` sessions; surface stale worktrees.
- **Export / import.** `agr export <session>` to a portable bundle for cross-machine resume or sharing.

## License

MIT
