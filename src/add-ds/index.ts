import { chain, Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { addDependency, DependencyType, ExistingBehavior, InstallBehavior, updateWorkspace } from '@schematics/angular/utility';
import { getDesignSystem } from '../design-systems';
import { addGlobalAssets } from '../utility/workspace-assets';
import { resolveProject } from '../utility/project';
import { AddDsSchema } from './schema';
import { createVerboseLogger } from '../utility/verbose';

/**
 * Ajoute un design system au projet : dépendances npm, styles et scripts globaux.
 */
export function addDs(options: AddDsSchema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    let ds;
    try {
      ds = getDesignSystem(options.ds ?? 'dsfr');
    } catch (e) {
      throw new SchematicsException((e as Error).message);
    }
    const verbose = createVerboseLogger(context, options);
    const { name } = await resolveProject(tree, options.project);
    context.logger.info(`Ajout du design system ${ds.name} au projet "${name}"...`);
    verbose(`Packages : ${ds.packages.map((p) => `${p.name}@${p.version}${p.dev ? ' (dev)' : ''}`).join(', ') || 'aucun'}.`);
    verbose(`Styles : ${(ds.styles ?? []).join(', ') || 'aucun'} ; scripts : ${(ds.scripts ?? []).join(', ') || 'aucun'}.`);
    verbose(options.skipInstall ? 'Installation des dépendances désactivée (--skip-install).' : 'Installation des dépendances activée.');

    const dependencies = ds.packages.map((pkg) =>
      addDependency(pkg.name, pkg.version, {
        type: pkg.dev ? DependencyType.Dev : DependencyType.Default,
        existing: ExistingBehavior.Skip,
        install: options.skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
      }),
    );

    const assets = updateWorkspace((workspace) => {
      const project = workspace.projects.get(name)!;
      const added = [
        ...addGlobalAssets(project, 'styles', ds.styles ?? []),
        ...addGlobalAssets(project, 'scripts', ds.scripts ?? []),
      ];
      added.forEach((a) => context.logger.info(`angular.json : ajout de ${a}`));
      if (!added.length) verbose('angular.json : styles et scripts déjà présents, rien à ajouter.');
    });

    const notes: Rule = (_tree, ctx) => {
      for (const note of ds.setupNotes ?? []) ctx.logger.warn(`À faire : ${note}`);
    };

    return chain([...dependencies, assets, notes]);
  };
}
