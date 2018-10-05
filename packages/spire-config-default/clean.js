const { remove } = require('fs-extra');
const execa = require('execa');

const CLEAN_COMMAND = Symbol.for('clean');

function clean(
  { setCommand, getCommand },
  {
    keeplist = [
      'node_modules/',
      '.vscode/',
      '.atom/',
      '.idea/',
      '.sublime-project/',
    ],
  }
) {
  return {
    name: 'default-plugin-clean',
    async setup({ cli }) {
      cli.command(
        'clean',
        'Cleans files matching .gitignore',
        yargs => {
          yargs
            .option('keeplist', {
              type: 'string',
              array: true,
              description: 'Array of patterns to keep even if matched',
              group: 'Options',
              default: keeplist,
            })
            .option('ignore-keeplist', {
              type: 'boolean',
              description: 'Ignore keeplist to remove all matching files',
              group: 'Options',
            })
            .option('dry-run', {
              type: 'boolean',
              description: 'List matched files without removing them',
              group: 'Options',
            });
        },
        () => setCommand(CLEAN_COMMAND)
      );
    },
    async run({ options, logger }) {
      if (getCommand() !== CLEAN_COMMAND) {
        return;
      }
      const keeplist = options.ignorekeeplist
        ? []
        : options.keeplist || keeplist || [];
      // Get list of files to remove (including nested .gitignore's)
      const gitLsOutput = await execa.stdout('git', [
        'ls-files',
        '--others',
        '--ignored',
        '--exclude-standard',
        '--directory',
      ]);
      // Drop keeplisted files
      const filesToRemove = gitLsOutput
        .split('\n')
        .filter(Boolean)
        .filter(file => !keeplist.includes(file));
      // Build list of tasks
      if (filesToRemove.length) {
        if (options.dryRun) {
          logger.note(
            'Next paths are to be cleaned up: %s',
            filesToRemove.join(', ')
          );
        } else {
          await Promise.all(
            filesToRemove.map(async (file, index) => {
              logger.await(
                'Cleaning %s [%d/%d]',
                file,
                index + 1,
                filesToRemove.length
              );
              await remove(file);
            })
          );
          logger.success('Cleaned %d path(s)', filesToRemove.length);
        }
      } else {
        logger.note('No paths needs to be cleand up');
      }
    },
  };
}

module.exports = clean;
