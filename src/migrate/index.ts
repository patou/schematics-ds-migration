import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { normalize } from '@angular-devkit/core';
import { TODO_MARKER, normalizePrefix } from '../core/template-migrator';
import { migrateProject } from '../core/ts/project-migrator';
import { getMigration } from '../migrations';
import { resolveProject } from '../utility/project';
import { MigrateSchema } from './schema';
import { createVerboseLogger } from '../utility/verbose';

/**
 * Migre les composants d'un dossier du design system source vers le design system cible.
 */
export function migrate(options: MigrateSchema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    let migration;
    try {
      migration = getMigration(options.from ?? 'lion', options.to ?? 'dsfr');
    } catch (e) {
      throw new SchematicsException((e as Error).message);
    }
    const verbose = createVerboseLogger(context, options);
    const project = await resolveProject(tree, options.project);
    const path = normalize(options.path?.trim() ? options.path : project.sourceRoot);
    verbose(`Projet "${project.name}", sourceRoot "${project.sourceRoot}", dossier analysé "${path}".`);
    const dir = tree.getDir(path);
    if (!dir.subfiles.length && !dir.subdirs.length) {
      throw new SchematicsException(`Le dossier "${path}" est vide ou n'existe pas.`);
    }

    const prefix = normalizePrefix(options.prefix);
    context.logger.info(
      `Migration ${migration.from.name} -> ${migration.to.name} du dossier "${path}"${prefix ? ` (préfixe "${prefix}")` : ''}...`,
    );

    const report = migrateProject(tree, migration, {
      path,
      projectRoot: project.sourceRoot,
      prefix,
      verbose: options.verbose,
      removeCustomElementsSchema: options.removeCustomElementsSchema,
    });

    for (const message of report.verboseMessages) verbose(message);
    for (const warning of report.warnings) context.logger.warn(warning);
    for (const file of report.files) {
      context.logger.info(`${file.path} : ${file.todos.length} TODO`);
      for (const todo of file.todos) context.logger.info(`  - ${todo}`);
    }
    context.logger.info(
      `${report.changedFiles.length} fichier(s) modifié(s), ${report.todoCount} point(s) à reprendre manuellement` +
        (report.todoCount ? ` (recherchez "${TODO_MARKER}").` : '.'),
    );
    if (report.changedFiles.length) {
      context.logger.info(
        `Pensez à installer ${migration.to.name} (schematic "add-ds") puis à supprimer ${migration.from.name} (schematic "remove-ds").`,
      );
    }
    return tree;
  };
}
