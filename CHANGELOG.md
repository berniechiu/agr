# Changelog

## Unreleased

### Added

- **Session preview** — press `Space` in the picker to see a full preview: metadata (project, branch, id, start/end, duration, tags, cwd), the full first prompt, and the last few user/assistant messages. Message content is parsed lazily — only when the preview is opened — so there's no startup cost. `Esc` or `Enter` returns to the list.
- **Branch on session rows** — each row now shows its git branch on a second dim line under the title. `HEAD` and detached-head states are filtered out.

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
