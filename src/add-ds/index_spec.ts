import { describe, expect, it } from 'vitest';
import { createRunner, createWorkspace } from '../testing/helpers';

const runner = createRunner();

describe('add-ds', () => {
  it('ajoute DSFR : dépendances, styles et scripts', async () => {
    const tree = await runner.runSchematic('add-ds', { ds: 'dsfr', skipInstall: true }, await createWorkspace());
    const pkg = JSON.parse(tree.readText('/package.json'));
    expect(pkg.dependencies['@edugouvfr/ngx-dsfr']).toBe('^1.18.1');
    expect(pkg.dependencies['@gouvfr/dsfr']).toBe('~1.14.4');
    const angular = JSON.parse(tree.readText('/angular.json'));
    const options = angular.projects.app.architect.build.options;
    expect(options.styles.slice(0, 2)).toEqual([
      'node_modules/@gouvfr/dsfr/dist/dsfr/dsfr.main.min.css',
      'node_modules/@gouvfr/dsfr/dist/utility/utility.main.min.css',
    ]);
    expect(options.styles).toContain('projects/app/src/styles.css');
    expect(options.scripts).toEqual(['node_modules/@gouvfr/dsfr/dist/dsfr/dsfr.module.js']);
    expect(runner.tasks.length).toBe(0);
  });

  it('est idempotent', async () => {
    let tree = await runner.runSchematic('add-ds', { ds: 'dsfr', skipInstall: true }, await createWorkspace());
    tree = await runner.runSchematic('add-ds', { ds: 'dsfr', skipInstall: true }, tree);
    const options = JSON.parse(tree.readText('/angular.json')).projects.app.architect.build.options;
    expect(options.scripts).toHaveLength(1);
    expect(options.styles).toHaveLength(3);
  });

  it('planifie npm install par défaut', async () => {
    await runner.runSchematic('add-ds', { ds: 'lion' }, await createWorkspace());
    expect(runner.tasks.some((t) => t.name === 'node-package')).toBe(true);
  });

  it('échoue pour un design system inconnu', async () => {
    await expect(runner.runSchematic('add-ds', { ds: 'foo' }, await createWorkspace())).rejects.toThrow();
  });
});
