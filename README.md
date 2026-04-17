# agr

A standalone CLI for browsing, searching, tagging, and resuming Claude Code sessions.

Claude Code's built-in `--resume` shows only ~10 recent sessions and relies on a session index that silently goes stale. `agr` scans `.jsonl` session files directly from `~/.claude/projects/`, presents them in an inline fuzzy-filter picker, and lets you resume with a single keypress.

## Install

```bash
git clone <repo-url> && cd agr
npm install
npm run build
npm link
```

Requires Node.js >= 20.

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
| `Space` | Preview selected session (when filter is empty) |
| `Ctrl+T` | Tag selected session |
| `Ctrl+U` | Untag selected session (shows existing tags) |
| `Ctrl+R` | Rename selected session (local to agr — never modifies `~/.claude`) |
| `Esc` | Clear filter / exit |
| Type | Filter by project, title, branch, or tag |

The preview shows session metadata (project, branch, id, start/end, duration, tags, cwd), the full first prompt, and the last few user/assistant messages. Message content is parsed only when the preview is opened — no startup cost. Press `Esc` or `Enter` to return to the list.

Each row shows its git branch on a dim second line under the title. Tagged sessions show `#tag-name` at the end of the first line. Titles are cleaned of XML-style command wrappers (e.g. `<local-command-caveat>`) for readability.

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

`agr` reads session data directly from `~/.claude/projects/` (read-only — it never modifies `~/.claude` data). Each session is a `.jsonl` file named by UUID. The parser extracts metadata (project, first prompt, timestamps, message count, custom title, git branch) without reading the entire file.

Sessions are auto-titled from the first user prompt. If a session was renamed with `/rename` in Claude Code, the custom title takes precedence.

Active sessions (currently running) are detected via `~/.claude/sessions/*.json` and marked with a green dot in the picker.

All agr data (tags, title overrides) is stored in `~/.agr/`.

## Development

```bash
npm run dev          # Run with tsx (no build step)
npm test             # Run tests
npm run test:watch   # Watch mode
npm run build        # Compile TypeScript to dist/
```

## License

MIT
