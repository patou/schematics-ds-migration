import * as path from 'node:path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { migrateTemplate, MigrateTemplateOptions } from '../core/template-migrator';
import { lionToDsfr } from '../migrations/lion-to-dsfr';

export const COLLECTION_PATH = path.resolve(process.cwd(), 'src/collection.json');

export function createRunner(): SchematicTestRunner {
  return new SchematicTestRunner('schematics-ds-migration', COLLECTION_PATH);
}

/** Crée un workspace Angular (application standalone `app` dans projects/app). */
export async function createWorkspace(): Promise<UnitTestTree> {
  const ngRunner = new SchematicTestRunner('@schematics/angular', path.resolve(process.cwd(), 'node_modules/@schematics/angular/collection.json'));
  const tree = await ngRunner.runSchematic('workspace', {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '19.2.15',
  });
  return ngRunner.runSchematic('application', { name: 'app', skipTests: true, style: 'css', skipInstall: true }, tree);
}

/** Migre un template Lion -> DSFR. */
export function lion(template: string, options: MigrateTemplateOptions = {}) {
  return migrateTemplate(template, lionToDsfr, options);
}

/** Retourne uniquement le HTML migré. */
export function toDsfr(template: string, options: MigrateTemplateOptions = {}): string {
  return lion(template, options).content;
}

/** Retourne les TODO ajoutés. */
export function todosOf(template: string, options: MigrateTemplateOptions = {}): string[] {
  return lion(template, options).todos;
}
