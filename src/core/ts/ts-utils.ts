import * as ts from 'typescript';
import { ImportSpec } from '../types';

export interface TextEdit {
  start: number;
  end: number;
  text: string;
}

/** Applique des modifications textuelles (non chevauchantes) en partant de la fin. */
export function applyEdits(text: string, edits: TextEdit[]): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
  let out = text;
  for (const edit of sorted) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }
  return out;
}

export function parseSource(path: string, text: string): ts.SourceFile {
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

export interface DecoratedClass {
  className: string;
  node: ts.ClassDeclaration;
  decorator: ts.Decorator;
  metadata: ts.ObjectLiteralExpression;
}

/** Classes décorées par `@Component`, `@NgModule`, ... */
export function findDecoratedClasses(sf: ts.SourceFile, decoratorName: string): DecoratedClass[] {
  const result: DecoratedClass[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isClassDeclaration(node) && node.name) {
      for (const decorator of ts.getDecorators(node) ?? []) {
        const call = decorator.expression;
        if (
          ts.isCallExpression(call) &&
          ts.isIdentifier(call.expression) &&
          call.expression.text === decoratorName &&
          call.arguments[0] &&
          ts.isObjectLiteralExpression(call.arguments[0])
        ) {
          result.push({ className: node.name.text, node, decorator, metadata: call.arguments[0] });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return result;
}

export function getProperty(obj: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | undefined {
  return obj.properties.find(
    (p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) &&
      ((ts.isIdentifier(p.name) && p.name.text === name) || (ts.isStringLiteral(p.name) && p.name.text === name)),
  );
}

export function getStringProperty(obj: ts.ObjectLiteralExpression, name: string): string | undefined {
  const prop = getProperty(obj, name);
  if (prop && (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer))) {
    return prop.initializer.text;
  }
  return undefined;
}

function lineIndent(sf: ts.SourceFile, pos: number): string {
  const text = sf.text;
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  return /^[ \t]*/.exec(text.slice(lineStart))![0];
}

/**
 * Ajoute des symboles dans une propriété tableau (`imports`, `declarations`...) d'un objet littéral.
 * Crée la propriété si nécessaire. Retourne `undefined` si la propriété n'est pas un tableau littéral.
 */
export function addToArrayProperty(
  sf: ts.SourceFile,
  obj: ts.ObjectLiteralExpression,
  property: string,
  symbols: string[],
): TextEdit[] | undefined {
  const prop = getProperty(obj, property);
  if (!prop) {
    if (!symbols.length) return [];
    const first = obj.properties[0];
    if (!first) {
      return [{ start: obj.getStart(sf) + 1, end: obj.getStart(sf) + 1, text: ` ${property}: [${symbols.join(', ')}] ` }];
    }
    const start = first.getStart(sf);
    const multiLine = sf.text.slice(obj.getStart(sf), start).includes('\n');
    const indent = lineIndent(sf, start);
    const separator = multiLine ? `,\n${indent}` : ', ';
    return [{ start, end: start, text: `${property}: ${formatList(symbols, indent, indent.length + property.length + 2)}${separator}` }];
  }
  if (!ts.isArrayLiteralExpression(prop.initializer)) return undefined;
  const array = prop.initializer;
  const existing = new Set(array.elements.map((e) => e.getText(sf)));
  const missing = symbols.filter((s) => !existing.has(s));
  if (!missing.length) return [];
  const elements = array.elements;
  const indent = lineIndent(sf, prop.getStart(sf));
  const column = array.getStart(sf) - (sf.text.lastIndexOf('\n', array.getStart(sf) - 1) + 1);
  const multiLine = sf.text.slice(array.getStart(sf), array.getEnd()).includes('\n');
  if (!elements.length || !multiLine) {
    const all = [...elements.map((e) => e.getText(sf)), ...missing];
    return [{ start: array.getStart(sf), end: array.getEnd(), text: formatList(all, indent, column) }];
  }
  const last = elements[elements.length - 1];
  const separator = `,\n${lineIndent(sf, last.getStart(sf))}`;
  return [{ start: last.getEnd(), end: last.getEnd(), text: separator + missing.join(separator) }];
}

/** Longueur de ligne au-delà de laquelle une liste est présentée sur plusieurs lignes. */
export const MAX_LINE_LENGTH = 100;

/** `[A, B]` ou, si la ligne est trop longue, un élément par ligne. */
function formatList(items: string[], indent: string, column: number): string {
  const inline = `[${items.join(', ')}]`;
  if (column + inline.length + 1 <= MAX_LINE_LENGTH || items.length < 2) return inline;
  return `[\n${items.map((i) => `${indent}  ${i},`).join('\n')}\n${indent}]`;
}

/** `{ A, B }` ou, si la ligne d'import est trop longue, un symbole par ligne. */
function formatImportList(items: string[], column: number, moduleName: string): string {
  const inline = `{ ${items.join(', ')} }`;
  if (column + inline.length + moduleName.length + 9 <= MAX_LINE_LENGTH || items.length < 2) return inline;
  return `{\n${items.map((i) => `  ${i},`).join('\n')}\n}`;
}

/** Supprime un symbole d'une propriété tableau ; supprime la propriété si le tableau devient vide. */
export function removeFromArrayProperty(
  sf: ts.SourceFile,
  obj: ts.ObjectLiteralExpression,
  property: string,
  symbol: string,
): TextEdit[] {
  const prop = getProperty(obj, property);
  if (!prop || !ts.isArrayLiteralExpression(prop.initializer)) return [];
  const elements = prop.initializer.elements;
  const index = elements.findIndex((e) => e.getText(sf) === symbol);
  if (index === -1) return [];
  if (elements.length === 1) {
    return [removeObjectProperty(sf, obj, prop)];
  }
  const el = elements[index];
  if (index < elements.length - 1) {
    return [{ start: el.getStart(sf), end: elements[index + 1].getStart(sf), text: '' }];
  }
  return [{ start: elements[index - 1].getEnd(), end: el.getEnd(), text: '' }];
}

function removeObjectProperty(sf: ts.SourceFile, obj: ts.ObjectLiteralExpression, prop: ts.ObjectLiteralElement): TextEdit {
  const props = obj.properties;
  const index = props.indexOf(prop as ts.ObjectLiteralElementLike);
  if (index < props.length - 1) {
    return { start: prop.getStart(sf), end: props[index + 1].getStart(sf), text: '' };
  }
  if (index > 0) {
    let end = prop.getEnd();
    const after = /^\s*,/.exec(sf.text.slice(end));
    if (after && props.hasTrailingComma) {
      // Dernière propriété suivie d'une virgule : on supprime la ligne complète.
      end += after[0].length;
      const lineEnd = /^[ \t]*\r?\n/.exec(sf.text.slice(end));
      if (lineEnd) end += lineEnd[0].length;
      let start = prop.getStart(sf);
      const lineStart = sf.text.lastIndexOf('\n', start - 1) + 1;
      if (/^[ \t]*$/.test(sf.text.slice(lineStart, start))) start = lineStart;
      return { start, end, text: '' };
    }
    // Dernière propriété sans virgule finale : on retire la virgule qui la précède.
    return { start: props[index - 1].getEnd(), end, text: '' };
  }
  let end = prop.getEnd();
  const after = /^\s*,/.exec(sf.text.slice(end));
  if (after) end += after[0].length;
  return { start: prop.getStart(sf), end, text: '' };
}

/** Ajoute des imports nommés (fusionnés avec les imports existants du même module). */
export function addNamedImports(sf: ts.SourceFile, specs: ImportSpec[]): TextEdit[] {
  const edits: TextEdit[] = [];
  const byModule = new Map<string, string[]>();
  for (const spec of specs) {
    const list = byModule.get(spec.from) ?? [];
    if (!list.includes(spec.name)) list.push(spec.name);
    byModule.set(spec.from, list);
  }
  const imports = sf.statements.filter(ts.isImportDeclaration);
  const newDeclarations: string[] = [];

  for (const [moduleName, names] of byModule) {
    const declarations = imports.filter(
      (d) => ts.isStringLiteral(d.moduleSpecifier) && d.moduleSpecifier.text === moduleName,
    );
    const imported = new Set<string>();
    for (const d of declarations) {
      const bindings = d.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        bindings.elements.forEach((e) => imported.add(e.name.text));
      }
    }
    const missing = names.filter((n) => !imported.has(n));
    if (!missing.length) continue;
    const target = declarations.find((d) => {
      const clause = d.importClause;
      return clause && !clause.isTypeOnly && clause.namedBindings && ts.isNamedImports(clause.namedBindings);
    });
    if (target) {
      const bindings = target.importClause!.namedBindings as ts.NamedImports;
      const multiLine = bindings.getText(sf).includes('\n');
      if (bindings.elements.length && multiLine) {
        const last = bindings.elements[bindings.elements.length - 1];
        const separator = `,\n${lineIndent(sf, last.getStart(sf))}`;
        edits.push({ start: last.getEnd(), end: last.getEnd(), text: separator + missing.join(separator) });
      } else {
        const all = [...bindings.elements.map((e) => e.getText(sf)), ...missing];
        const column = bindings.getStart(sf) - target.getStart(sf);
        edits.push({ start: bindings.getStart(sf), end: bindings.getEnd(), text: formatImportList(all, column, moduleName) });
      }
    } else {
      newDeclarations.push(`import ${formatImportList(missing, 7, moduleName)} from '${moduleName}';`);
    }
  }

  if (newDeclarations.length) {
    const last = imports[imports.length - 1];
    if (last) {
      edits.push({ start: last.getEnd(), end: last.getEnd(), text: `\n${newDeclarations.join('\n')}` });
    } else {
      edits.push({ start: 0, end: 0, text: `${newDeclarations.join('\n')}\n\n` });
    }
  }
  return edits;
}

/** Supprime la déclaration d'import complète, y compris son retour à la ligne. */
export function removeStatement(sf: ts.SourceFile, statement: ts.Statement): TextEdit {
  const start = statement.getFullStart() === 0 ? 0 : statement.getStart(sf);
  let end = statement.getEnd();
  const lineEnd = /^[ \t]*\r?\n/.exec(sf.text.slice(end));
  if (lineEnd) end += lineEnd[0].length;
  // Retire aussi l'indentation de la ligne.
  const lineStart = sf.text.lastIndexOf('\n', start - 1) + 1;
  const realStart = /^[ \t]*$/.test(sf.text.slice(lineStart, start)) ? lineStart : start;
  return { start: realStart, end, text: '' };
}

/** Supprime un import nommé ; supprime la déclaration complète si elle devient vide. */
export function removeNamedImport(sf: ts.SourceFile, name: string, moduleName: string): TextEdit[] {
  for (const d of sf.statements.filter(ts.isImportDeclaration)) {
    if (!ts.isStringLiteral(d.moduleSpecifier) || d.moduleSpecifier.text !== moduleName) continue;
    const bindings = d.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const index = bindings.elements.findIndex((e) => e.name.text === name);
    if (index === -1) continue;
    if (bindings.elements.length === 1 && !d.importClause!.name) return [removeStatement(sf, d)];
    const el = bindings.elements[index];
    if (index < bindings.elements.length - 1) {
      return [{ start: el.getStart(sf), end: bindings.elements[index + 1].getStart(sf), text: '' }];
    }
    if (index > 0) return [{ start: bindings.elements[index - 1].getEnd(), end: el.getEnd(), text: '' }];
  }
  return [];
}

/** Nombre d'utilisations d'un identifiant en dehors des déclarations d'import. */
export function countIdentifierUsages(sf: ts.SourceFile, name: string): number {
  let count = 0;
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) return;
    if (ts.isIdentifier(node) && node.text === name) count++;
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return count;
}

export interface ModuleImport {
  statement: ts.ImportDeclaration;
  moduleName: string;
  /** Import à effet de bord uniquement (`import 'x';`). */
  sideEffect: boolean;
  names: string[];
}

export function listImports(sf: ts.SourceFile): ModuleImport[] {
  return sf.statements.filter(ts.isImportDeclaration).flatMap((statement) => {
    if (!ts.isStringLiteral(statement.moduleSpecifier)) return [];
    const clause = statement.importClause;
    const names: string[] = [];
    if (clause?.name) names.push(clause.name.text);
    const bindings = clause?.namedBindings;
    if (bindings) {
      if (ts.isNamespaceImport(bindings)) names.push(bindings.name.text);
      else bindings.elements.forEach((e) => names.push(e.name.text));
    }
    return [{ statement, moduleName: statement.moduleSpecifier.text, sideEffect: !clause, names }];
  });
}

/** Appels dynamiques `import('...')` (ex : chargement paresseux des web components). */
export function listDynamicImports(sf: ts.SourceFile): { node: ts.CallExpression; moduleName: string; statement?: ts.ExpressionStatement }[] {
  const result: { node: ts.CallExpression; moduleName: string; statement?: ts.ExpressionStatement }[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      let parent: ts.Node = node.parent;
      while (parent && (ts.isAwaitExpression(parent) || ts.isParenthesizedExpression(parent))) parent = parent.parent;
      result.push({
        node,
        moduleName: node.arguments[0].text,
        statement: parent && ts.isExpressionStatement(parent) ? parent : undefined,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return result;
}
