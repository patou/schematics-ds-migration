import { describe, expect, it } from 'vitest';
import { lion, todosOf, toDsfr } from '../../../testing/helpers';

describe('Lion -> DSFR : choix', () => {
  it('lion-checkbox -> dsfr-form-checkbox', () => {
    const result = lion('<lion-checkbox label="J’accepte" name="cgu" formControlName="cgu" disabled></lion-checkbox>');
    expect(result.content).toBe(
      '<dsfr-form-checkbox label="J’accepte" name="cgu" formControlName="cgu" [disabled]="true"></dsfr-form-checkbox>',
    );
    expect(result.imports.map((i) => i.name)).toEqual(['DsfrFormCheckboxComponent']);
  });

  it('checked -> [value]="true", checked-changed -> ngModelChange', () => {
    expect(
      toDsfr('<lion-checkbox label="A" checked [(ngModel)]="a" (checked-changed)="on($event.target.checked)"></lion-checkbox>'),
    ).toBe('<dsfr-form-checkbox label="A" [value]="true" [(ngModel)]="a" (ngModelChange)="on($event)"></dsfr-form-checkbox>');
  });

  it('lion-checkbox-group -> dsfr-form-fieldset + dsfrFieldsetElement', () => {
    const result = lion(
      [
        '<lion-checkbox-group help-text="Plusieurs choix possibles">',
        '  <span slot="label">Loisirs</span>',
        '  <lion-checkbox label="Sport" [(ngModel)]="sport"></lion-checkbox>',
        '  <lion-checkbox label="Musique" [(ngModel)]="music"></lion-checkbox>',
        '</lion-checkbox-group>',
      ].join('\n'),
    );
    expect(result.content).toBe(
      [
        '<dsfr-form-fieldset hint="Plusieurs choix possibles" legend="Loisirs">',
        '  <dsfr-form-checkbox dsfrFieldsetElement label="Sport" [(ngModel)]="sport"></dsfr-form-checkbox>',
        '  <dsfr-form-checkbox dsfrFieldsetElement label="Musique" [(ngModel)]="music"></dsfr-form-checkbox>',
        '</dsfr-form-fieldset>',
      ].join('\n'),
    );
    expect(result.imports.map((i) => i.name).sort()).toEqual([
      'DsfrFieldsetElementDirective',
      'DsfrFormCheckboxComponent',
      'DsfrFormFieldsetComponent',
    ]);
    expect(result.todos).toEqual([]);
  });

  it('lion-checkbox-group : modelValue et name en TODO', () => {
    const todos = todosOf('<lion-checkbox-group label="L" name="n" [modelValue]="vals"></lion-checkbox-group>');
    expect(todos).toHaveLength(2);
  });

  it('lion-checkbox-indeterminate -> case [indeterminate] suivie des cases enfants', () => {
    const result = lion(
      [
        '<lion-checkbox-indeterminate label="Tout">',
        '  <lion-checkbox slot="checkbox" label="A"></lion-checkbox>',
        '</lion-checkbox-indeterminate>',
      ].join('\n'),
    );
    expect(result.content).toContain('<dsfr-form-checkbox label="Tout" [indeterminate]="false"></dsfr-form-checkbox>');
    expect(result.content).toContain('<dsfr-form-checkbox label="A"></dsfr-form-checkbox>');
    expect(result.content).not.toContain('slot=');
    expect(result.todos).toHaveLength(1);
  });

  it('lion-radio-group -> dsfr-form-radio [options]', () => {
    const result = lion(
      [
        '<lion-radio-group label="Couleur" name="color" [(ngModel)]="color">',
        '  <lion-radio label="Rouge" choice-value="red"></lion-radio>',
        '  <lion-radio [label]="blueLabel" [choiceValue]="blue" help-text="Ciel" disabled></lion-radio>',
        '</lion-radio-group>',
      ].join('\n'),
    );
    expect(result.content).toBe(
      `<dsfr-form-radio label="Couleur" name="color" [(ngModel)]="color" [options]="[{ label: 'Rouge', value: 'red' }, { label: blueLabel, value: blue, hint: 'Ciel', disabled: true }]"></dsfr-form-radio>`,
    );
    expect(result.imports.map((i) => i.name)).toEqual(['DsfrFormRadioComponent']);
    expect(result.todos).toEqual([]);
  });

  it('lion-radio-group : options dynamiques, cochées ou sans valeur en TODO', () => {
    const todos = todosOf(
      [
        '<lion-radio-group label="C">',
        '  <lion-radio label="A" checked choice-value="a"></lion-radio>',
        '  <lion-radio label="B"></lion-radio>',
        '  <lion-radio *ngFor="let c of colors" [label]="c" [choiceValue]="c"></lion-radio>',
        '</lion-radio-group>',
      ].join('\n'),
    );
    expect(todos).toHaveLength(3);
  });

  it('lion-radio isolé : migration manuelle', () => {
    expect(todosOf('<lion-radio label="A"></lion-radio>')[0]).toContain('dsfr-form-radio');
  });

  it('lion-switch -> dsfr-form-toggle', () => {
    const result = lion('<lion-switch label="Notifications" [(ngModel)]="notif"></lion-switch>');
    expect(result.content).toBe('<dsfr-form-toggle label="Notifications" [(ngModel)]="notif"></dsfr-form-toggle>');
    expect(result.imports.map((i) => i.name)).toEqual(['DsfrFormToggleComponent']);
  });

  it('lion-switch-button -> dsfr-form-toggle + TODO libellé', () => {
    const result = lion('<lion-switch-button [(ngModel)]="on"></lion-switch-button>');
    expect(result.content).toContain('<dsfr-form-toggle [(ngModel)]="on"></dsfr-form-toggle>');
    expect(result.todos).toHaveLength(1);
  });
});
