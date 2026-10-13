import { readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';
import { HostTree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { describe, expect, it } from 'vitest';
import { createRunner } from '../testing/helpers';

const EXAMPLES_DIR = path.resolve(process.cwd(), 'examples');
const SNAPSHOTS_DIR = path.resolve(process.cwd(), 'src/migrate/__snapshots__/examples');

function listFiles(dir: string, base = dir): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (entry === 'node_modules') return [];
    return statSync(full).isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}

function loadExample(name: string): { tree: UnitTestTree; files: string[] } {
  const dir = path.join(EXAMPLES_DIR, name);
  const tree = new UnitTestTree(new HostTree());
  const files = listFiles(dir).map((f) => f.split(path.sep).join('/'));
  for (const file of files) tree.create(file, readFileSync(path.join(dir, file)));
  return { tree, files };
}

const EXAMPLES = [
  { name: 'lion-app', prefix: '' },
  { name: 'lion-app-prefixed', prefix: 'my' },
];

describe('applications d’exemple', () => {
  for (const { name, prefix } of EXAMPLES) {
    describe(name, () => {
      it('migre, installe DSFR et supprime Lion', async () => {
        const runner = createRunner();
        const { tree: initial, files } = loadExample(name);
        let tree = await runner.runSchematic('migrate', { path: 'src/app', prefix }, initial);
        tree = await runner.runSchematic('add-ds', { ds: 'dsfr', skipInstall: true }, tree);
        tree = await runner.runSchematic(
          'remove-ds',
          { ds: 'lion', prefix, skipInstall: true, ignoreRemaining: true },
          tree,
        );

        const pkg = JSON.parse(tree.readContent('package.json'));
        expect(pkg.dependencies['@edugouvfr/ngx-dsfr']).toBeDefined();
        expect(pkg.dependencies['@lion/ui']).toBeUndefined();

        const tag = new RegExp(`<${prefix ? `${prefix}-` : ''}${prefix ? '' : 'lion-'}`);
        for (const file of files.filter((f) => f.startsWith('src/app/'))) {
          const content = tree.readContent(file);
          expect(content, file).not.toMatch(/from '@lion\/ui|import '@lion\/ui/);
          if (file.endsWith('.html') || file.endsWith('.component.ts')) {
            // Seuls les composants sans équivalent (signalés par un TODO) restent en balises Lion.
            const remaining = content.replace(/<!--[\s\S]*?-->/g, '').match(new RegExp(`${tag.source}[\\w-]+`, 'g')) ?? [];
            for (const element of remaining) {
              expect(content, `${file} : ${element}`).toContain('TODO(ds-migration)');
            }
          }
          await expect(content).toMatchFileSnapshot(path.join(SNAPSHOTS_DIR, name, `${file}.snap`));
        }
      });
    });
  }
});
