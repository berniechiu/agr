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

Opens an inline picker scoped to the current project folder, sorted by: current folder matches, then branch matches, then most recent. Type to filter across all projects by name, title, branch, or tag. Arrow keys to navigate. Enter to resume. Esc to exit.

### Search session content

```bash
# Single word: searches within current project folder
agr search "webhook"

# Multiple words: first word filters by project, rest search content
agr search "my-app webhook"
agr search "my-app schema migration"
```

The first word selects the project scope, remaining words search session content. Words are matched independently (AND logic). With a single word, the search is scoped to the current folder.

### Tag sessions

```bash
# Tag a session (use UUID prefix, minimum 8 chars)
agr tag a1b2c3d4 "auth refactor"

# Tag multiple sessions with the same label
agr tag a1b2c3d4 "sprint-12"
agr tag e5f6a7b8 "sprint-12"

# List sessions by tag (opens picker)
agr tag "sprint-12"

# List all tags
agr tags

# Remove a tag
agr untag a1b2c3d4 "auth refactor"
```

Tags are stored in `~/.agr/tags.json` and never modify session files.

### Resume directly

```bash
# By UUID prefix
agr resume a1b2c3d4

# By session name
agr resume "fix login bug"
```

### View stats

```bash
agr stats
```

Shows total sessions, this week's activity, total messages, and top projects.

### Clean up

```bash
agr clean
```

Reports empty sessions (0 messages) and prunes orphaned tags from `~/.agr/tags.json`. Does not modify any `~/.claude` data.

## How it works

`agr` reads session data directly from `~/.claude/projects/` (read-only — it never modifies `~/.claude` data). Each session is a `.jsonl` file named by UUID. The parser extracts metadata (project, first prompt, timestamps, message count, custom title, git branch) without reading the entire file.

Sessions are auto-titled from the first user prompt. If a session was renamed with `/rename` in Claude Code, the custom title takes precedence.

Active sessions (currently running) are detected via `~/.claude/sessions/*.json` and marked with a green dot in the picker.

All agr data (tags) is stored in `~/.agr/`.

## Development

```bash
npm run dev          # Run with tsx (no build step)
npm test             # Run tests
npm run test:watch   # Watch mode
npm run build        # Compile TypeScript to dist/
```

## License

MIT
