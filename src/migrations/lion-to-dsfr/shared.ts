import { NGX_DSFR } from '../../design-systems/dsfr';
import { AttributeRuleInput, ImportSpec } from '../../core/types';

export const FORMS_MODULE: ImportSpec = { name: 'FormsModule', from: '@angular/forms' };

export function dsfr(name: string): ImportSpec {
  return { name, from: NGX_DSFR };
}

export const VALIDATORS_TODO =
  "Les validateurs Lion ([validators]) ne sont pas supportés : utilisez les Validators Angular (ngModel / FormControl) et les inputs error / message de ngx-dsfr.";

/** Attributs communs aux champs de formulaire Lion (FormControlMixin) -> DefaultControlComponent ngx-dsfr. */
export const FIELD_ATTRIBUTES: Record<string, AttributeRuleInput> = {
  label: { to: 'label', doc: 'Libellé du champ.' },
  helpText: { to: 'hint', doc: "Texte d'aide." },
  name: 'name',
  disabled: { to: 'disabled', boolean: true },
  labelSrOnly: { to: 'labelSrOnly', boolean: true, doc: 'Libellé visible uniquement des lecteurs d’écran.' },
};

/** Attributs des champs texte Lion (LionInput) -> BaseInputComponent ngx-dsfr. */
export const INPUT_ATTRIBUTES: Record<string, AttributeRuleInput> = {
  ...FIELD_ATTRIBUTES,
  placeholder: 'placeholder',
  readonly: { to: 'readonly', boolean: true },
  readOnly: { to: 'readonly', boolean: true },
  autocomplete: 'autocomplete',
  required: { to: 'required', boolean: true },
  pattern: 'pattern',
  maxlength: { to: 'maxLength', asProperty: true },
  maxLength: { to: 'maxLength', asProperty: true },
  minlength: { to: 'minLength', asProperty: true },
  minLength: { to: 'minLength', asProperty: true },
};
