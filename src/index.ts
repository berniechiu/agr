import { Command } from 'commander';
import { setBaseDir } from './config.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { tagCommand } from './commands/tag.js';
import { tagsCommand } from './commands/tags.js';
import { untagCommand } from './commands/untag.js';
import { statsCommand } from './commands/stats.js';
import { cleanCommand } from './commands/clean.js';
import { resumeCommand } from './commands/resume.js';

const program = new Command();

program
  .name('agr')
  .description('Claude Code session browser')
  .version('0.1.0')
  .option('--base-dir <path>', 'Override base directory (for testing)')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.optsWithGlobals();
    if (opts.baseDir) {
      setBaseDir(opts.baseDir);
    }
  });

program
  .command('list', { isDefault: true })
  .description('Browse sessions interactively')
  .action(listCommand);

program
  .command('search <text>')
  .description('Full-text search across all session content')
  .action(searchCommand);

program
  .command('tag <first> [second]')
  .description('Tag a session or list sessions by tag')
  .action(tagCommand);

program
  .command('tags')
  .description('List all tags with session counts')
  .action(tagsCommand);

program
  .command('untag <sessionId> <tag>')
  .description('Remove a tag from a session')
  .action(untagCommand);

program
  .command('stats')
  .description('Show usage statistics')
  .action(statsCommand);

program
  .command('clean')
  .description('Remove empty sessions and fix index')
  .action(cleanCommand);

program
  .command('resume <idOrName>')
  .description('Resume a session by ID prefix or name')
  .action(resumeCommand);

program.parse();
