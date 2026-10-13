import { chain, Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { updateWorkspace } from '@schematics/angular/utility';
import { applyTagPrefix, normalizePrefix, TODO_MARKER } from '../core/template-migrator';
import { collectFiles, stripHtmlComments } from '../core/ts/project-migrator';
import {
  applyEdits,
  countIdentifierUsages,
  listDynamicImports,
  listImports,
  parseSource,
  removeStatement,
  TextEdit,
} from '../core/ts/ts-utils';
import { DesignSystem } from '../core/types';
import { getDesignSystem } from '../design-systems';
import { resolveProject } from '../utility/project';
import { removeGlobalAssets } from '../utility/workspace-assets';
import { RemoveDsSchema } from './schema';
import { createVerboseLogger } from '../utility/verbose';

const matches = (patterns: string[], name: string) =>
  patterns.some((p) => (p.endsWith('/') ? name.startsWith(p) : name === p || name.startsWith(`${p}/`)));

/**
 * Supprime un design system : dépendances npm, imports TypeScript, styles et scripts globaux.
 */
export function removeDs(options: RemoveDsSchema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    let ds: DesignSystem;
    try {
      ds = getDesignSystem(options.ds ?? 'lion');
    } catch (e) {
      throw new SchematicsException((e as Error).message);
    }
    const verbose = createVerboseLogger(context, options);
    const project = await resolveProject(tree, options.project);
    const prefix = normalizePrefix(options.prefix);
    const tagPrefix = applyTagPrefix(ds.tagPrefix, prefix, ds.tagPrefix);

    // 1. Balises encore utilisées
    const sourceFiles = collectFiles(tree.getDir(project.sourceRoot), (p) => /\.(html|ts)$/.test(p) && !p.endsWith('.d.ts'));
    verbose(`Projet "${project.name}" : ${sourceFiles.length} fichier(s) analysé(s) dans "${project.sourceRoot}", balises recherchées : <${tagPrefix}*>.`);
    const tagRegExp = new RegExp(`<${tagPrefix.replace(/[-]/g, '\\-')}[\\w-]*`, 'gi');
    const remaining = new Map<string, Set<string>>();
    for (const file of sourceFiles) {
      for (const match of stripHtmlComments(tree.readText(file)).matchAll(tagRegExp)) {
        const set = remaining.get(file) ?? new Set<string>();
        set.add(match[0].slice(1));
        remaining.set(file, set);
      }
    }
    if (remaining.size) {
      const details = [...remaining].map(([file, tags]) => `  - ${file} : ${[...tags].join(', ')}`).join('\n');
      if (!options.ignoreRemaining) {
        throw new SchematicsException(
          `Des composants ${ds.name} sont encore utilisés. Lancez d'abord le schematic "migrate" ou utilisez --ignore-remaining :\n${details}`,
        );
      }
      context.logger.warn(`Des composants ${ds.name} sont encore utilisés (--ignore-remaining) :\n${details}`);
    }

    // 2. Imports TypeScript
    for (const file of sourceFiles.filter((f) => f.endsWith('.ts'))) {
      const text = tree.readText(file);
      if (!ds.importPatterns.some((p) => text.includes(p))) {
        verbose(`${file} : aucun import ${ds.name}.`);
        continue;
      }
      const sf = parseSource(file, text);
      const edits: TextEdit[] = [];
      for (const imp of listImports(sf)) {
        if (!matches(ds.importPatterns, imp.moduleName)) continue;
        const used = imp.names.filter((n) => countIdentifierUsages(sf, n) > 0);
        const edit = removeStatement(sf, imp.statement);
        if (used.length) {
          const indent = /^[ \t]*/.exec(text.slice(edit.start))![0];
          edit.text = `${indent}// ${TODO_MARKER}: import "${imp.moduleName}" supprimé, remplacez les usages de ${used.join(', ')}.\n`;
          context.logger.warn(`${file} : ${used.join(', ')} (${imp.moduleName}) encore utilisé(s).`);
        }
        edits.push(edit);
      }
      for (const dyn of listDynamicImports(sf)) {
        if (!matches(ds.importPatterns, dyn.moduleName)) continue;
        if (dyn.statement) {
          edits.push(removeStatement(sf, dyn.statement));
        } else {
          context.logger.warn(`${file} : import dynamique de "${dyn.moduleName}" à supprimer manuellement.`);
        }
      }
      if (edits.length) {
        tree.overwrite(file, applyEdits(text, edits));
        context.logger.info(`${file} : imports ${ds.name} supprimés.`);
      }
    }

    // 3. Dépendances npm
    let packagesRemoved = false;
    if (tree.exists('/package.json')) {
      const pkg = JSON.parse(tree.readText('/package.json'));
      for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        for (const name of Object.keys(pkg[section] ?? {})) {
          if (matches(ds.packagePatterns, name)) {
            delete pkg[section][name];
            packagesRemoved = true;
            context.logger.info(`package.json : suppression de ${name}.`);
          }
        }
      }
      if (packagesRemoved) tree.overwrite('/package.json', JSON.stringify(pkg, null, 2) + '\n');
      else verbose(`package.json : aucune dépendance ${ds.name} trouvée.`);
    } else {
      verbose('package.json introuvable.');
    }
    if (packagesRemoved && !options.skipInstall) context.addTask(new NodePackageInstallTask());

    // 4. Styles et scripts globaux
    return chain([
      updateWorkspace((workspace) => {
        const definition = workspace.projects.get(project.name)!;
        const removed = [
          ...removeGlobalAssets(definition, 'styles', ds.styles ?? []),
          ...removeGlobalAssets(definition, 'scripts', ds.scripts ?? []),
        ];
        removed.forEach((r) => context.logger.info(`angular.json : suppression de ${r}`));
        if (!removed.length) verbose('angular.json : aucun style ni script du design system à supprimer.');
      }),
    ]);
  };
}
