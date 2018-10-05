const isCI = require('is-ci');
const { join } = require('path');
const execa = require('execa');
const { pathExists, readFile, outputFile, chmod, remove } = require('fs-extra');
const SpireError = require('spire/error');

const SPIRE_COMMENT_MARK = '# spire';

function hookToString(command) {
  return `
#!/bin/sh
${SPIRE_COMMENT_MARK}
${command}
`;
}

function git(
  { getCommand },
  {
    gitHooks = {
      'pre-commit': 'npx spire hook precommit',
      'post-merge': 'npx spire hook postmerge',
    },
  }
) {
  return {
    name: 'spire-git-support',
    async run({ logger }) {
      if (isCI) {
        logger.debug('Skipping installing hooks on CI');
        return;
      }
      const gitRoot = await execa.stdout('git', [
        'rev-parse',
        '--show-toplevel',
      ]);
      switch (getCommand()) {
        case Symbol.for('postinstall'):
          for (const hook of Object.keys(gitHooks)) {
            const hookPath = join(gitRoot, '.git/hooks', hook);
            if (await pathExists(hookPath)) {
              const hookContents = await readFile(hookPath, 'utf8');
              if (hookContents.includes(SPIRE_COMMENT_MARK)) {
                continue;
              }
              throw new SpireError(
                [
                  `Git ${hook} hook is already installed.`,
                  "Make sure you're not using husky or any other similiar tools.",
                  'To continue, remove `.git/hooks/` folder any try again.',
                ].join(' ')
              );
            }
            await outputFile(hookPath, hookToString(gitHooks[hook]), 'utf8');
            await chmod(hookPath, '744'); // a+x
          }
          break;
        case Symbol.for('preuninstall'):
          for (const hook of Object.keys(gitHooks)) {
            const hookPath = join(gitRoot, '.git/hooks', hook);
            if (await pathExists(hookPath)) {
              const hookContents = await readFile(hookPath, 'utf8');
              if (hookContents.includes(SPIRE_COMMENT_MARK)) {
                await remove(hookPath);
              }
            }
          }
          break;
        default:
          return;
      }
    },
  };
}

module.exports = git;
