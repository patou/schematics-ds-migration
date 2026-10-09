import { AttributeRuleInput, ComponentMapping } from '../../../core/types';
import { dsfr } from '../shared';

const BUTTON_ATTRIBUTES: Record<string, AttributeRuleInput> = {
  type: { to: 'type', values: { button: 'button', submit: 'submit', reset: 'reset' } },
  disabled: { to: 'disabled', boolean: true },
  ariaLabel: { to: 'ariaLabel', doc: '`aria-label` est porté par le `<button>` interne.' },
  tabindex: { to: 'tabIndex', asProperty: true },
  tabIndex: { to: 'tabIndex', asProperty: true },
  active: { remove: true, doc: 'État interne Lion, supprimé.' },
};

const common = {
  target: 'dsfr-button',
  status: 'auto' as const,
  content: { toAttribute: 'label' },
  attributes: BUTTON_ATTRIBUTES,
  imports: [dsfr('DsfrButtonComponent')],
  notes: [
    'Le texte du bouton devient l’input `label` (les interpolations `{{ }}` sont conservées).',
    'Le style se choisit avec `variant` (primary, secondary, tertiary, tertiary-no-outline) et la taille avec `size` (SM, MD, LG).',
    'Les icônes Lion (`<lion-icon>`) contenues dans le bouton sont à remplacer par l’input `icon` (classe `fr-icon-*`).',
  ],
};

/** Incrément 1 : boutons. */
export const BUTTON_MAPPINGS: ComponentMapping[] = [
  { source: 'lion-button', description: 'Bouton.', ...common },
  {
    source: 'lion-button-submit',
    description: 'Bouton de soumission de formulaire.',
    ...common,
    addAttributes: { type: 'submit' },
  },
  {
    source: 'lion-button-reset',
    description: 'Bouton de réinitialisation de formulaire.',
    ...common,
    addAttributes: { type: 'reset' },
  },
];
