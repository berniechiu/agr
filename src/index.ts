import { Command } from 'commander';
import { setBaseDir } from './config.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { tagCommand } from './commands/tag.js';
import { tagsCommand } from './commands/tags.js';
import { statsCommand } from './commands/stats.js';
import { cleanCommand } from './commands/clean.js';

const program = new Command();

program
  .name('agr')
  .description('Claude Code session browser')
  .version('0.4.0')
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
  .description('Search session content (single word: current project, multi-word: first word is project filter)')
  .action(searchCommand);

program
  .command('tag <name>')
  .description('List sessions by tag name')
  .action(tagCommand);

program
  .command('tags')
  .description('List all tags with session counts')
  .action(tagsCommand);

program
  .command('stats')
  .description('Show usage statistics')
  .action(statsCommand);

program
  .command('clean')
  .description('Report empty sessions and prune orphaned tags')
  .action(cleanCommand);

program.parse();
