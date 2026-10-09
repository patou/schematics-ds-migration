import { describe, expect, it } from 'vitest';
import { lionToDsfr } from '.';

/** Balises exposées par @lion/ui 0.21 (`@lion/ui/define/*`). */
const LION_TAGS = [
  'lion-accordion',
  'lion-button',
  'lion-button-reset',
  'lion-button-submit',
  'lion-calendar',
  'lion-checkbox',
  'lion-checkbox-group',
  'lion-checkbox-indeterminate',
  'lion-collapsible',
  'lion-combobox',
  'lion-dialog',
  'lion-drawer',
  'lion-field',
  'lion-fieldset',
  'lion-form',
  'lion-icon',
  'lion-input',
  'lion-input-amount',
  'lion-input-amount-dropdown',
  'lion-input-date',
  'lion-input-datepicker',
  'lion-input-email',
  'lion-input-file',
  'lion-input-iban',
  'lion-input-range',
  'lion-input-stepper',
  'lion-input-tel',
  'lion-input-tel-dropdown',
  'lion-listbox',
  'lion-option',
  'lion-options',
  'lion-pagination',
  'lion-progress-indicator',
  'lion-radio',
  'lion-radio-group',
  'lion-select',
  'lion-select-invoker',
  'lion-select-rich',
  'lion-selected-file-list',
  'lion-step',
  'lion-steps',
  'lion-switch',
  'lion-switch-button',
  'lion-tabs',
  'lion-textarea',
  'lion-tooltip',
  'lion-validation-feedback',
];

describe('Lion -> DSFR : définition', () => {
  const sources = lionToDsfr.components.map((c) => c.source);

  it('couvre toutes les balises de @lion/ui', () => {
    expect(LION_TAGS.filter((t) => !sources.includes(t))).toEqual([]);
  });

  it('ne contient pas de doublon ni de balise inconnue', () => {
    expect(new Set(sources).size).toBe(sources.length);
    expect(sources.filter((s) => !LION_TAGS.includes(s))).toEqual([]);
  });

  it('chaque mapping est cohérent avec son statut', () => {
    for (const c of lionToDsfr.components) {
      expect(c.description, c.source).toBeTruthy();
      if (c.status === 'manual') expect(c.target, c.source).toBeNull();
      else expect(c.target, c.source).toBeTruthy();
      if (!c.target) expect(c.todo, c.source).toBeTruthy();
    }
  });

  it('les imports ciblent ngx-dsfr ou @angular/forms', () => {
    const froms = new Set(lionToDsfr.components.flatMap((c) => (c.imports ?? []).map((i) => i.from)));
    expect([...froms].every((f) => f === '@edugouvfr/ngx-dsfr' || f === '@angular/forms')).toBe(true);
  });

  it('reconnaît les imports de définition Lion', () => {
    const re = lionToDsfr.sourceDefineImport!('lion-input');
    expect(re.test('@lion/ui/define/lion-input.js')).toBe(true);
    expect(re.test('@lion/ui/define/lion-input-date.js')).toBe(false);
  });
});
