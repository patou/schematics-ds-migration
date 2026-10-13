import * as ts from 'typescript';
import { DirEntry, Tree } from '@angular-devkit/schematics';
import { dirname, join, normalize } from '@angular-devkit/core';
import { applyTagPrefix, migrateTemplate, MigrateTemplateOptions, TemplateMigrationResult } from '../template-migrator';
import { ImportSpec, MigrationDefinition } from '../types';
import {
  addNamedImports,
  addToArrayProperty,
  applyEdits,
  countIdentifierUsages,
  findDecoratedClasses,
  getProperty,
  getStringProperty,
  listImports,
  parseSource,
  removeFromArrayProperty,
  removeNamedImport,
  removeStatement,
  TextEdit,
} from './ts-utils';

export interface ProjectMigrationOptions extends MigrateTemplateOptions {
  /** Dossier à migrer. */
  path: string;
  /** Dossier racine du projet (pour retrouver les NgModule et les sélecteurs des composants). */
  projectRoot: string;
  /** Supprime `CUSTOM_ELEMENTS_SCHEMA` quand il n'est plus nécessaire. */
  removeCustomElementsSchema?: boolean;
}

export interface FileReport {
  path: string;
  todos: string[];
}

export interface ProjectMigrationReport {
  changedFiles: string[];
  files: FileReport[];
  warnings: string[];
  /** Nombre total de TODO ajoutés. */
  todoCount: number;
}

const ANGULAR_ELEMENTS = new Set(['ng-container', 'ng-template', 'ng-content', 'router-outlet']);

/**
 * Migre tous les templates (fichiers `.html` et templates inline) d'un dossier, et met à jour
 * les composants TypeScript (imports standalone / NgModule, imports "define", CUSTOM_ELEMENTS_SCHEMA).
 */
export function migrateProject(
  tree: Tree,
  migration: MigrationDefinition,
  options: ProjectMigrationOptions,
): ProjectMigrationReport {
  const report: ProjectMigrationReport = { changedFiles: [], files: [], warnings: [], todoCount: 0 };
  const changed = new Set<string>();
  const basePath = normalize(options.path);
  const tsFiles = collectFiles(tree.getDir(basePath), (p) => p.endsWith('.ts') && !p.endsWith('.spec.ts') && !p.endsWith('.d.ts'));
  const htmlFiles = collectFiles(tree.getDir(basePath), (p) => p.endsWith('.html'));
  const projectTsFiles = collectFiles(tree.getDir(normalize(options.projectRoot)), (p) => p.endsWith('.ts') && !p.endsWith('.d.ts'));
  const knownSelectors = collectSelectors(tree, projectTsFiles);
  const migratedHtml = new Set<string>();
  const pendingModuleImports: { className: string; imports: ImportSpec[]; file: string }[] = [];

  const record = (path: string, result: TemplateMigrationResult) => {
    if (result.todos.length) {
      report.files.push({ path, todos: result.todos });
      report.todoCount += result.todos.length;
    }
  };

  for (const file of tsFiles) {
    const text = tree.readText(file);
    if (!text.includes('@Component')) continue;
    const sf = parseSource(file, text);
    const edits: TextEdit[] = [];
    const fileImports: ImportSpec[] = [];
    const removedSchemaFrom: ts.ObjectLiteralExpression[] = [];
    const migratedTags = new Set<string>();
    let remainingContent = '';

    for (const component of findDecoratedClasses(sf, 'Component')) {
      const metadata = component.metadata;
      const templateUrl = getStringProperty(metadata, 'templateUrl');
      const templateProp = getProperty(metadata, 'template');
      let result: TemplateMigrationResult | undefined;

      if (templateUrl) {
        const htmlPath = join(dirname(normalize(file)), templateUrl);
        if (!tree.exists(htmlPath)) {
          report.warnings.push(`${file} : template introuvable "${templateUrl}".`);
          continue;
        }
        result = migrateTemplate(tree.readText(htmlPath), migration, options);
        migratedHtml.add(htmlPath);
        if (result.changed) {
          tree.overwrite(htmlPath, result.content);
          changed.add(htmlPath);
        }
        record(htmlPath, result);
      } else if (templateProp) {
        const literal = templateProp.initializer;
        if (!ts.isStringLiteral(literal) && !ts.isNoSubstitutionTemplateLiteral(literal)) {
          report.warnings.push(`${file} (${component.className}) : template dynamique non migré.`);
          continue;
        }
        result = migrateTemplate(literal.text, migration, options);
        if (result.changed) {
          edits.push({ start: literal.getStart(sf), end: literal.getEnd(), text: serializeTemplate(result.content, literal, sf) });
        }
        record(`${file}#${component.className}`, result);
      }
      if (!result) continue;

      result.sourceTags.forEach((t) => migratedTags.add(t));
      remainingContent += result.content;
      if (!result.sourceTags.length) continue;

      const standalone = isStandalone(metadata);
      if (result.imports.length) {
        if (standalone) {
          const symbolEdits = addToArrayProperty(sf, metadata, 'imports', result.imports.map((i) => i.name));
          if (symbolEdits) {
            edits.push(...symbolEdits);
            fileImports.push(...result.imports);
          } else {
            report.warnings.push(
              `${file} (${component.className}) : "imports" n'est pas un tableau littéral, ajoutez manuellement : ${result.imports
                .map((i) => i.name)
                .join(', ')}.`,
            );
          }
        } else {
          pendingModuleImports.push({ className: component.className, imports: result.imports, file });
        }
      }

      if (
        standalone &&
        options.removeCustomElementsSchema !== false &&
        !needsCustomElementsSchema(result.content, migration, knownSelectors)
      ) {
        const schemaEdits = removeFromArrayProperty(sf, metadata, 'schemas', 'CUSTOM_ELEMENTS_SCHEMA');
        if (schemaEdits.length) {
          edits.push(...schemaEdits);
          removedSchemaFrom.push(metadata);
        }
      }
    }

    if (removedSchemaFrom.length) {
      const remaining = countIdentifierUsages(sf, 'CUSTOM_ELEMENTS_SCHEMA') - removedSchemaFrom.length;
      if (remaining <= 0) edits.push(...removeNamedImport(sf, 'CUSTOM_ELEMENTS_SCHEMA', '@angular/core'));
    }

    // Imports "define" des web components qui ne sont plus utilisés dans ce fichier.
    if (migration.sourceDefineImport) {
      for (const imp of listImports(sf)) {
        if (!imp.sideEffect) continue;
        for (const tag of migratedTags) {
          if (
            migration.sourceDefineImport(tag).test(imp.moduleName) &&
            !containsTag(remainingContent, tag, options.prefix, migration.from.tagPrefix)
          ) {
            edits.push(removeStatement(sf, imp.statement));
            break;
          }
        }
      }
    }

    if (fileImports.length) edits.push(...addNamedImports(sf, fileImports));

    if (edits.length) {
      tree.overwrite(file, applyEdits(text, edits));
      changed.add(file);
    }
  }

  // Fichiers HTML non rattachés à un composant du dossier.
  for (const htmlPath of htmlFiles) {
    if (migratedHtml.has(htmlPath)) continue;
    const result = migrateTemplate(tree.readText(htmlPath), migration, options);
    if (result.changed) {
      tree.overwrite(htmlPath, result.content);
      changed.add(htmlPath);
      if (result.imports.length) {
        report.warnings.push(
          `${htmlPath} : aucun composant trouvé pour ce template, importez manuellement : ${result.imports
            .map((i) => i.name)
            .join(', ')}.`,
        );
      }
    }
    record(htmlPath, result);
  }

  // Composants non standalone : imports ajoutés au NgModule qui les déclare.
  for (const pending of pendingModuleImports) {
    const updated = addImportsToDeclaringModule(tree, projectTsFiles, pending.className, pending.imports);
    if (updated) {
      changed.add(updated);
      report.warnings.push(
        `${updated} : vérifiez si CUSTOM_ELEMENTS_SCHEMA est encore nécessaire dans le module qui déclare ${pending.className}.`,
      );
    } else {
      report.warnings.push(
        `${pending.file} (${pending.className}) : NgModule déclarant le composant introuvable, importez manuellement : ${pending.imports
          .map((i) => i.name)
          .join(', ')}.`,
      );
    }
  }

  report.changedFiles = [...changed];
  return report;
}

function isStandalone(metadata: ts.ObjectLiteralExpression): boolean {
  const prop = getProperty(metadata, 'standalone');
  return !prop || prop.initializer.kind !== ts.SyntaxKind.FalseKeyword;
}

function addImportsToDeclaringModule(
  tree: Tree,
  files: string[],
  className: string,
  imports: ImportSpec[],
): string | undefined {
  for (const file of files) {
    const text = tree.readText(file);
    if (!text.includes('@NgModule') || !text.includes(className)) continue;
    const sf = parseSource(file, text);
    for (const module of findDecoratedClasses(sf, 'NgModule')) {
      const declarations = getProperty(module.metadata, 'declarations');
      if (
        !declarations ||
        !ts.isArrayLiteralExpression(declarations.initializer) ||
        !declarations.initializer.elements.some((e) => e.getText(sf) === className)
      ) {
        continue;
      }
      const edits = addToArrayProperty(sf, module.metadata, 'imports', imports.map((i) => i.name));
      if (!edits) return undefined;
      edits.push(...addNamedImports(sf, imports));
      if (edits.length) tree.overwrite(file, applyEdits(text, edits));
      return file;
    }
  }
  return undefined;
}

/** Sérialise un template migré dans un littéral TypeScript du même type (backtick si nécessaire). */
function serializeTemplate(
  content: string,
  literal: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral,
  sf: ts.SourceFile,
): string {
  const quote = sf.text[literal.getStart(sf)];
  const escapeBacktick = (s: string) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  if (quote === '`' || content.includes('\n') || content.includes(quote)) {
    return '`' + escapeBacktick(content) + '`';
  }
  return quote + content.replace(/\\/g, '\\\\') + quote;
}

export function collectFiles(dir: DirEntry, filter: (path: string) => boolean): string[] {
  const files: string[] = [];
  const visit = (d: DirEntry) => {
    const name = d.path.split('/').pop();
    if (name === 'node_modules' || name === 'dist' || name === '.angular' || name?.startsWith('.git')) return;
    for (const f of d.subfiles) {
      const path = join(d.path, f);
      if (filter(path)) files.push(path);
    }
    d.subdirs.forEach((s) => visit(d.dir(s)));
  };
  visit(dir);
  return files;
}

/** Sélecteurs d'éléments des composants Angular du projet (`app-header`, ...). */
function collectSelectors(tree: Tree, files: string[]): Set<string> {
  const selectors = new Set<string>();
  for (const file of files) {
    const text = tree.readText(file);
    if (!text.includes('selector')) continue;
    for (const match of text.matchAll(/selector\s*:\s*['"`]([^'"`]+)['"`]/g)) {
      for (const part of match[1].split(',')) {
        const tag = /^\s*([a-z][\w-]*)/i.exec(part);
        if (tag) selectors.add(tag[1].toLowerCase());
      }
    }
  }
  return selectors;
}

function needsCustomElementsSchema(
  template: string,
  migration: MigrationDefinition,
  knownSelectors: Set<string>,
): boolean {
  for (const match of stripHtmlComments(template).matchAll(/<([a-zA-Z][\w]*-[\w-]*)/g)) {
    const tag = match[1].toLowerCase();
    if (ANGULAR_ELEMENTS.has(tag) || knownSelectors.has(tag)) continue;
    if (tag.startsWith(migration.to.tagPrefix)) continue;
    return true;
  }
  return false;
}

function containsTag(content: string, tag: string, prefix: string | undefined, sourceTagPrefix: string): boolean {
  const full = applyTagPrefix(tag, prefix, sourceTagPrefix);
  return new RegExp(`<${full}(\\s|>|/)`, 'i').test(stripHtmlComments(content));
}

/** Supprime les commentaires HTML (les TODO peuvent citer des balises). */
export function stripHtmlComments(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, '');
}
