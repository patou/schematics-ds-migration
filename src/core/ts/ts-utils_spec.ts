import { describe, expect, it } from 'vitest';
import {
  addNamedImports,
  addToArrayProperty,
  applyEdits,
  countIdentifierUsages,
  findDecoratedClasses,
  getStringProperty,
  listDynamicImports,
  listImports,
  parseSource,
  removeFromArrayProperty,
  removeNamedImport,
  removeStatement,
} from './ts-utils';

const component = (metadata: string) => `import { Component } from '@angular/core';

@Component(${metadata})
export class AppComponent {}
`;

function edit(text: string, fn: (sf: ReturnType<typeof parseSource>) => { start: number; end: number; text: string }[] | undefined) {
  const sf = parseSource('a.ts', text);
  return applyEdits(text, fn(sf) ?? []);
}

describe('ts-utils', () => {
  it('applyEdits applique les modifications de la fin vers le début', () => {
    expect(
      applyEdits('abcdef', [
        { start: 0, end: 1, text: 'A' },
        { start: 4, end: 6, text: '' },
      ]),
    ).toBe('Abcd');
  });

  it('findDecoratedClasses / getStringProperty', () => {
    const sf = parseSource('a.ts', component(`{ selector: 'app-root', templateUrl: './app.html' }`));
    const [cls] = findDecoratedClasses(sf, 'Component');
    expect(cls.className).toBe('AppComponent');
    expect(getStringProperty(cls.metadata, 'templateUrl')).toBe('./app.html');
    expect(findDecoratedClasses(sf, 'NgModule')).toEqual([]);
  });

  describe('addToArrayProperty', () => {
    const add = (metadata: string, symbols: string[]) =>
      edit(component(metadata), (sf) => addToArrayProperty(sf, findDecoratedClasses(sf, 'Component')[0].metadata, 'imports', symbols));

    it('ajoute à un tableau existant (une ligne)', () => {
      expect(add(`{ imports: [A] }`, ['B', 'A'])).toContain('imports: [A, B]');
    });

    it('ajoute à un tableau vide', () => {
      expect(add(`{ imports: [] }`, ['B'])).toContain('imports: [B]');
    });

    it('respecte un tableau multi-lignes', () => {
      expect(add(`{\n  imports: [\n    A,\n    B\n  ]\n}`, ['C'])).toContain('    A,\n    B,\n    C\n');
    });

    it('crée la propriété en tête de l’objet', () => {
      expect(add(`{\n  selector: 'x',\n}`, ['A'])).toContain(`{\n  imports: [A],\n  selector: 'x',\n}`);
      expect(add(`{}`, ['A'])).toContain('{ imports: [A] }');
    });
  });

  describe('removeFromArrayProperty', () => {
    const remove = (metadata: string, symbol: string) =>
      edit(component(metadata), (sf) =>
        removeFromArrayProperty(sf, findDecoratedClasses(sf, 'Component')[0].metadata, 'schemas', symbol),
      );

    it('retire un élément', () => {
      expect(remove(`{ schemas: [A, CUSTOM_ELEMENTS_SCHEMA] }`, 'CUSTOM_ELEMENTS_SCHEMA')).toContain('schemas: [A]');
      expect(remove(`{ schemas: [CUSTOM_ELEMENTS_SCHEMA, A] }`, 'CUSTOM_ELEMENTS_SCHEMA')).toContain('schemas: [A]');
    });

    it('retire la propriété si le tableau devient vide (en conservant la virgule finale)', () => {
      expect(remove(`{\n  selector: 'x',\n  schemas: [CUSTOM_ELEMENTS_SCHEMA],\n}`, 'CUSTOM_ELEMENTS_SCHEMA')).toContain(
        `{\n  selector: 'x',\n}`,
      );
      expect(remove(`{ selector: 'x', schemas: [CUSTOM_ELEMENTS_SCHEMA] }`, 'CUSTOM_ELEMENTS_SCHEMA')).toContain(
        `{ selector: 'x' }`,
      );
      expect(remove(`{ schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'x' }`, 'CUSTOM_ELEMENTS_SCHEMA')).toContain(
        `{ selector: 'x' }`,
      );
    });
  });

  describe('imports', () => {
    it('addNamedImports complète un import existant ou en crée un nouveau', () => {
      const text = `import { A } from 'lib';\nimport { X } from 'other';\n\nconst a = 1;\n`;
      const out = edit(text, (sf) =>
        addNamedImports(sf, [
          { name: 'B', from: 'lib' },
          { name: 'A', from: 'lib' },
          { name: 'C', from: 'new-lib' },
        ]),
      );
      expect(out).toContain(`import { A, B } from 'lib';`);
      expect(out).toContain(`import { C } from 'new-lib';`);
      expect(out.indexOf('new-lib')).toBeLessThan(out.indexOf('const a'));
    });

    it('removeNamedImport retire un symbole ou toute la déclaration', () => {
      const text = `import { A, B } from 'lib';\nimport { C } from 'c';\n`;
      expect(edit(text, (sf) => removeNamedImport(sf, 'A', 'lib'))).toBe(`import { B } from 'lib';\nimport { C } from 'c';\n`);
      expect(edit(text, (sf) => removeNamedImport(sf, 'C', 'c'))).toBe(`import { A, B } from 'lib';\n`);
    });

    it('removeStatement supprime la ligne complète', () => {
      const text = `import '@lion/ui/define/lion-input.js';\nimport { A } from 'a';\n`;
      expect(edit(text, (sf) => [removeStatement(sf, sf.statements[0])])).toBe(`import { A } from 'a';\n`);
    });

    it('listImports / listDynamicImports / countIdentifierUsages', () => {
      const sf = parseSource(
        'a.ts',
        `import '@lion/ui/define/lion-button.js';\nimport { LionInput } from '@lion/ui/input.js';\nimport('@lion/ui/define/lion-tabs.js');\nconst x = LionInput;\n`,
      );
      expect(listImports(sf).map((i) => i.moduleName)).toEqual(['@lion/ui/define/lion-button.js', '@lion/ui/input.js']);
      expect(listDynamicImports(sf).map((i) => i.moduleName)).toEqual(['@lion/ui/define/lion-tabs.js']);
      expect(countIdentifierUsages(sf, 'LionInput')).toBe(1);
    });
  });
});
