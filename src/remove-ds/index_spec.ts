import { beforeEach, describe, expect, it } from 'vitest';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { createRunner, createWorkspace } from '../testing/helpers';

const runner = createRunner();

describe('remove-ds', () => {
  let tree: UnitTestTree;

  beforeEach(async () => {
    tree = await createWorkspace();
    const pkg = JSON.parse(tree.readText('/package.json'));
    pkg.dependencies['@lion/ui'] = '^0.21.1';
    tree.overwrite('/package.json', JSON.stringify(pkg, null, 2));
    tree.overwrite(
      '/projects/app/src/main.ts',
      [
        "import { bootstrapApplication } from '@angular/platform-browser';",
        "import '@lion/ui/define/lion-button.js';",
        "import { App } from './app/app';",
        '',
        "import('@lion/ui/define/lion-dialog.js');",
        'bootstrapApplication(App);',
        '',
      ].join('\n'),
    );
  });

  const run = (options: Record<string, unknown> = {}) =>
    runner.runSchematic('remove-ds', { ds: 'lion', skipInstall: true, ...options }, tree);

  it('supprime les dépendances et les imports', async () => {
    const result = await run();
    expect(JSON.parse(result.readText('/package.json')).dependencies['@lion/ui']).toBeUndefined();
    expect(result.readText('/projects/app/src/main.ts')).toBe(
      [
        "import { bootstrapApplication } from '@angular/platform-browser';",
        "import { App } from './app/app';",
        '',
        'bootstrapApplication(App);',
        '',
      ].join('\n'),
    );
  });

  it('remplace un import nommé encore utilisé par un TODO', async () => {
    tree.create(
      '/projects/app/src/app/validators.ts',
      "import { Required } from '@lion/ui/form-core.js';\nexport const validators = [new Required()];\n",
    );
    const result = await run();
    expect(result.readText('/projects/app/src/app/validators.ts')).toBe(
      '// TODO(ds-migration): import "@lion/ui/form-core.js" supprimé, remplacez les usages de Required.\nexport const validators = [new Required()];\n',
    );
  });

  it('refuse si des composants sont encore utilisés, sauf avec --force', async () => {
    tree.create('/projects/app/src/app/x.html', '<my-lion-input></my-lion-input>');
    await expect(run({ prefix: 'my' })).rejects.toThrow(/my-lion-input/);
    await expect(run()).resolves.toBeTruthy();
    const result = await run({ prefix: 'my', force: true });
    expect(result.readText('/projects/app/src/app/x.html')).toContain('my-lion-input');
  });

  it('supprime les styles et scripts globaux du DS (dsfr)', async () => {
    let result = await runner.runSchematic('add-ds', { ds: 'dsfr', skipInstall: true }, tree);
    result = await runner.runSchematic('remove-ds', { ds: 'dsfr', skipInstall: true }, result);
    const options = JSON.parse(result.readText('/angular.json')).projects.app.architect.build.options;
    expect(options.styles).toEqual(['projects/app/src/styles.css']);
    expect(options.scripts).toEqual([]);
    const pkg = JSON.parse(result.readText('/package.json'));
    expect(pkg.dependencies['@edugouvfr/ngx-dsfr']).toBeUndefined();
    expect(pkg.dependencies['@gouvfr/dsfr']).toBeUndefined();
  });
});
