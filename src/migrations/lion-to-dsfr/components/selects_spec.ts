import { describe, expect, it } from 'vitest';
import { lion, todosOf, toDsfr } from '../../../testing/helpers';

describe('Lion -> DSFR : listes déroulantes', () => {
  it('lion-select -> dsfr-form-select [options] + placeholder', () => {
    const result = lion(
      [
        '<lion-select label="Pays" name="country" [(ngModel)]="country">',
        '  <select slot="input">',
        '    <option value="">Choisir un pays</option>',
        '    <option value="fr">France</option>',
        '    <option [ngValue]="be" disabled>Belgique</option>',
        '  </select>',
        '</lion-select>',
      ].join('\n'),
    );
    expect(result.content).toBe(
      `<dsfr-form-select label="Pays" name="country" [(ngModel)]="country" placeholder="Choisir un pays" [options]="[{ label: 'France', value: 'fr' }, { label: 'Belgique', value: be, disabled: true }]"></dsfr-form-select>`,
    );
    expect(result.imports.map((i) => i.name)).toEqual(['DsfrFormSelectComponent']);
    expect(result.todos).toEqual([]);
  });

  it('convertit optgroup, interpolations et pipes', () => {
    expect(
      toDsfr(
        '<lion-select><select slot="input"><option value="a">{{ a | uppercase }}</option><optgroup label="G"><option value="b">B {{ n }}</option></optgroup></select></lion-select>',
      ),
    ).toBe(
      "<dsfr-form-select [options]=\"[{ label: (a | uppercase), value: 'a' }, { label: 'G', value: null, options: [{ label: `B ${n}`, value: 'b' }] }]\"></dsfr-form-select>",
    );
  });

  it('options dynamiques et option sélectionnée en TODO', () => {
    const result = lion(
      [
        '<lion-select label="Dyn">',
        '  <select slot="input">',
        '    @for (c of countries; track c.code) {',
        '      <option [value]="c.code">{{ c.name }}</option>',
        '    }',
        '  </select>',
        '</lion-select>',
      ].join('\n'),
    );
    expect(result.content).toContain('<dsfr-form-select label="Dyn" [options]="[]"></dsfr-form-select>');
    expect(result.todos[0]).toContain('@for (c of countries; track c.code)');
    expect(todosOf('<lion-select><select slot="input"><option *ngFor="let c of l">{{c}}</option></select></lion-select>')).toHaveLength(1);
    expect(todosOf('<lion-select><select slot="input"><option value="a" selected>A</option></select></lion-select>')[0]).toContain(
      "'a'",
    );
  });

  it('signale les attributs du <select> natif', () => {
    expect(todosOf('<lion-select><select slot="input" (change)="c()"></select></lion-select>')[0]).toContain('(change)="c()"');
  });

  it('lion-select-rich + lion-option -> dsfr-form-select', () => {
    const result = lion(
      [
        '<lion-select-rich label="Couleur" interaction-mode="mac">',
        '  <lion-option choice-value="red">Rouge</lion-option>',
        '  <lion-option [choiceValue]="blue"><b>Bleu</b></lion-option>',
        '</lion-select-rich>',
      ].join('\n'),
    );
    expect(result.content).toContain(
      `<dsfr-form-select label="Couleur" [options]="[{ label: 'Rouge', value: 'red' }, { label: 'Bleu', value: blue }]"></dsfr-form-select>`,
    );
    expect(result.todos).toEqual(['Contenu riche de l’option "Bleu" converti en texte.']);
  });

  it('lion-combobox / lion-listbox : migration manuelle, sans TODO en cascade', () => {
    const todos = todosOf('<lion-combobox label="Ville"><lion-option choice-value="p">Paris</lion-option></lion-combobox>');
    expect(todos).toHaveLength(1);
    expect(todos[0]).toContain('lion-combobox');
    expect(todosOf('<lion-listbox></lion-listbox>')).toHaveLength(1);
  });
});
