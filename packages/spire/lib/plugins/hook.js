function hook({ setCommand, getCommand, setState }) {
  return {
    name: 'spire-hook-support',
    async setup({ cli }) {
      cli.command(
        'hook <name>',
        'Runs plugin hooks',
        yargs => {
          yargs.positional('name', {
            describe: 'Hook name',
            choices: ['postinstall', 'preuninstall', 'precommit', 'postmerge'],
            type: 'string',
          });
        },
        argv => setCommand(Symbol.for(argv.name))
      );
    },
    async run(context) {
      const command = getCommand();
      switch (command) {
        case Symbol.for('postinstall'):
        case Symbol.for('preuninstall'):
        case Symbol.for('precommit'):
        case Symbol.for('postmerge'): {
          const hook = Symbol.keyFor(command);
          setState({ hook });
          for (const plugin of context.config.plugins) {
            if (plugin[hook]) {
              await plugin[hook](context);
            }
          }
        }
        default:
          return;
      }
    },
  };
}

module.exports = hook;
