import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from '../migrations';
import { guidePath, renderMigrationGuide } from './generate-docs';

describe('guides de migration', () => {
  for (const migration of MIGRATIONS) {
    describe(migration.id, () => {
      const guide = renderMigrationGuide(migration);

      it('documente chaque composant dans la table et le détail', () => {
        for (const { source } of migration.components) {
          expect(guide).toContain(`| [\`<${source}>\`](#${source})`);
          expect(guide).toContain(`### \`<${source}>\``);
        }
      });

      it('est à jour (sinon : npm run docs)', () => {
        const file = guidePath(migration);
        expect(existsSync(file), `${file} absent : lancez npm run docs`).toBe(true);
        expect(readFileSync(file, 'utf8')).toBe(guide);
      });
    });
  }
});
