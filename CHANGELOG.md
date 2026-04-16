# Changelog

## 0.1.0 (2026-04-16)

Initial release.

### Features

- **Session picker** — inline fuzzy-filter picker (fzf-style) for browsing all Claude Code sessions across all projects
- **Cross-project browsing** — scans `~/.claude/projects/` directly, not scoped to current directory
- **Auto-titling** — sessions are titled from the first user prompt (custom titles from `/rename` take precedence)
- **Full-text search** — `agr search <text>` searches message content across all sessions
- **Tagging** — `agr tag <id> <tag>` to label sessions, `agr tags` to list all tags, `agr tag <tag>` to filter by tag
- **Stats** — `agr stats` shows total sessions, weekly activity, message counts, and top projects
- **Clean** — `agr clean` reports empty sessions and prunes orphaned tags (read-only for `~/.claude`)
- **Direct resume** — `agr resume <id|name>` by UUID prefix or session name
- **Active session detection** — running sessions marked with a green dot in the picker
