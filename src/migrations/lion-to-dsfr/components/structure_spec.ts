import { describe, expect, it } from 'vitest';
import { lion, todosOf } from '../../../testing/helpers';

describe('Lion -> DSFR : structure et dates', () => {
  it('lion-fieldset -> dsfr-form-fieldset + dsfrFieldsetElement sur les champs', () => {
    const result = lion(
      [
        '<lion-fieldset label="Identité" help-text="Obligatoire" formGroupName="identity">',
        '  <lion-input label="Nom" formControlName="name"></lion-input>',
        '  <p>Texte</p>',
        '</lion-fieldset>',
      ].join('\n'),
    );
    expect(result.content).toBe(
      [
        '<dsfr-form-fieldset legend="Identité" hint="Obligatoire" formGroupName="identity">',
        '  <dsfr-form-input dsfrFieldsetElement label="Nom" formControlName="name"></dsfr-form-input>',
        '  <p>Texte</p>',
        '</dsfr-form-fieldset>',
      ].join('\n'),
    );
    expect(result.imports.map((i) => i.name).sort()).toEqual([
      'DsfrFieldsetElementDirective',
      'DsfrFormFieldsetComponent',
      'DsfrFormInputComponent',
    ]);
  });

  it('lion-fieldset : slot label -> legend, name en TODO', () => {
    const result = lion('<lion-fieldset name="address"><span slot="label">Adresse</span></lion-fieldset>');
    expect(result.content).toContain('<dsfr-form-fieldset legend="Adresse"></dsfr-form-fieldset>');
    expect(result.todos).toHaveLength(1);
  });

  it('les fieldsets imbriqués sont aussi des éléments du fieldset parent', () => {
    const content = lion('<lion-fieldset label="A"><lion-fieldset label="B"></lion-fieldset></lion-fieldset>').content;
    expect(content).toBe(
      '<dsfr-form-fieldset legend="A"><dsfr-form-fieldset dsfrFieldsetElement legend="B"></dsfr-form-fieldset></dsfr-form-fieldset>',
    );
  });

  it('lion-form : supprime l’enveloppe et réindente le <form>', () => {
    const result = lion(
      [
        '<section>',
        '  <lion-form (submit)="save()">',
        '    <form (ngSubmit)="save()">',
        '      <lion-input label="Nom"></lion-input>',
        '    </form>',
        '  </lion-form>',
        '</section>',
      ].join('\n'),
    );
    expect(result.content).toBe(
      [
        '<section>',
        '  <!-- TODO(ds-migration): lion-form supprimé : gérez la soumission avec (ngSubmit) et la validation avec Angular Forms. -->',
        '  <!-- TODO(ds-migration): Attributs de <lion-form> supprimés, à reporter sur le <form> si nécessaire : (submit)="save()" -->',
        '  <form (ngSubmit)="save()">',
        '    <dsfr-form-input label="Nom"></dsfr-form-input>',
        '  </form>',
        '</section>',
      ].join('\n'),
    );
  });

  it('lion-input-date / lion-input-datepicker -> dsfr-form-input type="date"', () => {
    const result = lion('<lion-input-date label="Naissance" [(ngModel)]="birth"></lion-input-date>');
    expect(result.content).toContain(
      '<dsfr-form-input label="Naissance" [(ngModel)]="birth" type="date"></dsfr-form-input>',
    );
    expect(result.todos[0]).toContain('AAAA-MM-JJ');
    expect(lion('<lion-input-datepicker label="D" calendar-heading="Choisir"></lion-input-datepicker>').content).toContain(
      '<dsfr-form-input label="D" type="date"></dsfr-form-input>',
    );
  });

  it('lion-calendar : migration manuelle', () => {
    expect(todosOf('<lion-calendar></lion-calendar>')[0]).toContain('lion-calendar');
  });
});
