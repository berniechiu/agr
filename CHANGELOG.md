# Changelog

## 0.3.0 (2026-04-19)

### Added

- **Files touched in preview** — the `Space` preview now shows the top files edited in the session (by `Edit` / `Write` / `MultiEdit` / `NotebookEdit` count). Read-only sessions display `no file edits`.
- **Estimated cost in preview** — shows an estimated USD total and token counts (input + cache tokens / output) based on per-turn `usage` data in the JSONL and hardcoded model rates. Sessions without usage data or entirely unknown models display `—`.
- **Last-state recap in preview** — distilled to the last user intent + last tool action (`Edited <path>`, `Wrote <path>`, `Ran: <cmd>`, `Delegated to agent: <desc>`). Falls back to the last assistant text when no tool action occurred. Heuristic, not a full summary.
- **Match snippets on search results** — `agr search "<text>"` now attaches a dim third line under each result with the matched phrase in context. Browse picker (no search) is unchanged.

### Changed

- `SearchMatch` now carries a `matchSnippet` field. External consumers of `searchSessionFile` get the snippet for free.

## 0.2.0 (2026-04-17)

### Added

- **Session preview** — press `Space` in the picker to see a full preview: metadata (project, branch, id, start/end, duration, tags, cwd), the full first prompt, and the last few user/assistant messages. Message content is parsed lazily — only when the preview is opened — so there's no startup cost. `Esc` or `Enter` returns to the list.
- **Branch on session rows** — each row now shows its git branch on a second dim line under the title. `HEAD` and detached-head states are filtered out.
- **Local rename** — press `Ctrl+R` in the picker to rename a session. Overrides are stored in `~/.agr/titles.json` and take precedence over Claude Code's `/rename` title and the auto-derived first-prompt title. Empty input clears the override. agr never writes to `~/.claude`.
- **Title scrubbing** — `custom-title` entries written by Claude Code are now run through the XML/caveat stripper, so titles generated from a slash-command transcript (e.g. `<local-command-caveat>…`) render cleanly instead of leaking wrapper tags.
- **Redesigned `agr stats`** — week-over-week delta on the weekly count, current and longest active streak, median and longest session length, a 14-day activity sparkline, and top projects with proportional bars and percentage share. Removed the vanity `Total messages` and standalone `Projects` count.
- **Tag-scoped picker filter** — typing `#foo` in the picker narrows to sessions whose tags match `foo`; a bare `#` lists all tagged sessions. Other queries continue to match project, title, branch, and tag text.

### Changed

- **Tag / untag keybindings** — changed from `t` / `u` to `Ctrl+T` / `Ctrl+U` so they don't collide with type-to-filter.
- **Row layout** — column widths are now fixed, the selected title is bold, and XML-style command wrappers (`<local-command-…>`, `<command-name>`, etc.) and the "Caveat:" preamble are stripped from titles for readability.
- **Footer** — removed the stale `N sessions · M projects` counter; only keybind hints remain.

## 0.1.0 (2026-04-16)

Initial release.

### Features

- **Session picker** — inline fuzzy-filter picker (fzf-style) for browsing all Claude Code sessions across all projects
- **Cross-project browsing** — scans `~/.claude/projects/` directly, not scoped to current directory
- **Auto-titling** — sessions are titled from the first user prompt (custom titles from `/rename` take precedence)
- **Full-text search** — `agr search <text>` searches message content across all sessions
- **Tagging** — tag / untag sessions inline from the picker; `agr tag <name>` to filter by tag; `agr tags` to list all tags with session counts
- **Stats** — `agr stats` shows total sessions, weekly activity, message counts, and top projects
- **Clean** — `agr clean` reports empty sessions and prunes orphaned tags (read-only for `~/.claude`)
- **Active session detection** — running sessions marked with a green dot in the picker
