import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { normalize } from '@angular-devkit/core';
import { readWorkspace } from '@schematics/angular/utility';
import type { ProjectDefinition, WorkspaceDefinition } from '@schematics/angular/utility';

export interface ResolvedProject {
  workspace: WorkspaceDefinition;
  name: string;
  project: ProjectDefinition;
  /** Racine du projet (`projects/app` ou ``). */
  root: string;
  /** Dossier des sources (`src`, `projects/app/src`). */
  sourceRoot: string;
}

/** Résout le projet Angular ciblé (option `--project`, sinon le premier projet application). */
export async function resolveProject(tree: Tree, projectName?: string): Promise<ResolvedProject> {
  if (!tree.exists('/angular.json')) {
    throw new SchematicsException('angular.json introuvable : exécutez le schematic à la racine d’un workspace Angular.');
  }
  const workspace = await readWorkspace(tree);
  let name = projectName;
  if (!name) {
    const applications = [...workspace.projects.entries()].filter(([, p]) => p.extensions['projectType'] === 'application');
    name = (applications[0] ?? [...workspace.projects.entries()][0])?.[0];
  }
  const project = name ? workspace.projects.get(name) : undefined;
  if (!name || !project) {
    throw new SchematicsException(
      `Projet "${projectName ?? ''}" introuvable. Projets disponibles : ${[...workspace.projects.keys()].join(', ')}.`,
    );
  }
  const root = project.root ?? '';
  const sourceRoot = project.sourceRoot ?? (root ? `${root}/src` : 'src');
  return { workspace, name, project, root: normalize(root || '/'), sourceRoot: normalize(sourceRoot) };
}
