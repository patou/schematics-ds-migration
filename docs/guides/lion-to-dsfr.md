# Guide de migration Lion → DSFR (ngx-dsfr)

<!-- Fichier généré par `npm run docs` (src/tools/generate-docs.ts) : ne pas modifier manuellement. -->

- **Source** : Lion — Web components accessibles de ING (@lion/ui).
  - Documentation : https://lion.js.org/
  - Packages : `@lion/ui@^0.21.1`
- **Cible** : DSFR (ngx-dsfr) — Système de Design de l'État français, implémentation Angular @edugouvfr/ngx-dsfr (composants standalone).
  - Documentation : https://www.systeme-de-design.gouv.fr/version-courante/
  - Packages : `@edugouvfr/ngx-dsfr@^1.18.1`, `@gouvfr/dsfr@~1.14.4`, `uuid@^13.0.0`, `args-parser@^1.3.0`

Les éléments qui ne peuvent pas être convertis automatiquement sont signalés par un commentaire `<!-- TODO(ds-migration): ... -->` ajouté au-dessus du composant.

Avec l'option `--prefix` (ex : `my`), les balises source sont recherchées avec ce préfixe (`<my-lion-button>` au lieu de `<lion-button>`).

## Statuts

- ✅ automatique : conversion complète.
- ⚠️ partielle : conversion automatique, certains attributs ou comportements sont à reprendre (TODO).
- ❌ manuelle : pas d'équivalent, la balise est conservée avec un TODO.

## Correspondance des composants

| Lion | DSFR (ngx-dsfr) | Conversion | Description |
| --- | --- | --- | --- |
| [`<lion-button>`](#lion-button) | `<dsfr-button>` | ✅ automatique | Bouton. |
| [`<lion-button-submit>`](#lion-button-submit) | `<dsfr-button>` | ✅ automatique | Bouton de soumission de formulaire. |
| [`<lion-button-reset>`](#lion-button-reset) | `<dsfr-button>` | ✅ automatique | Bouton de réinitialisation de formulaire. |
| [`<lion-input>`](#lion-input) | `<dsfr-form-input>` | ✅ automatique | Champ de saisie texte. |
| [`<lion-textarea>`](#lion-textarea) | `<dsfr-form-input>` | ✅ automatique | Zone de texte multi-lignes. |
| [`<lion-input-email>`](#lion-input-email) | `<dsfr-form-email>` | ✅ automatique | Champ e-mail (validation du format incluse dans ngx-dsfr). |
| [`<lion-input-tel>`](#lion-input-tel) | `<dsfr-form-tel>` | ⚠️ partielle | Champ téléphone. |
| [`<lion-input-tel-dropdown>`](#lion-input-tel-dropdown) | `<dsfr-form-tel>` | ⚠️ partielle | Champ téléphone avec choix du pays. |
| [`<lion-input-iban>`](#lion-input-iban) | `<dsfr-form-input>` | ⚠️ partielle | Champ IBAN. |
| [`<lion-input-amount>`](#lion-input-amount) | `<dsfr-form-input>` | ⚠️ partielle | Champ montant. |
| [`<lion-input-amount-dropdown>`](#lion-input-amount-dropdown) | `<dsfr-form-input>` | ⚠️ partielle | Champ montant avec choix de la devise. |
| [`<lion-input-stepper>`](#lion-input-stepper) | `<dsfr-form-input>` | ⚠️ partielle | Champ numérique avec boutons +/-. |
| [`<lion-checkbox>`](#lion-checkbox) | `<dsfr-form-checkbox>` | ✅ automatique | Case à cocher. |
| [`<lion-checkbox-group>`](#lion-checkbox-group) | `<dsfr-form-fieldset>` | ⚠️ partielle | Groupe de cases à cocher → fieldset DSFR contenant des cases (directive `dsfrFieldsetElement`). |
| [`<lion-checkbox-indeterminate>`](#lion-checkbox-indeterminate) | `<dsfr-form-checkbox>` | ⚠️ partielle | Case à cocher parente (état indéterminé) → case `[indeterminate]` suivie des cases enfants. |
| [`<lion-radio-group>`](#lion-radio-group) | `<dsfr-form-radio>` | ✅ automatique | Groupe de boutons radio → `dsfr-form-radio` avec `[options]` généré à partir des `lion-radio`. |
| [`<lion-radio>`](#lion-radio) | — | ❌ manuelle | Bouton radio isolé (hors lion-radio-group). |
| [`<lion-switch>`](#lion-switch) | `<dsfr-form-toggle>` | ✅ automatique | Interrupteur. |
| [`<lion-switch-button>`](#lion-switch-button) | `<dsfr-form-toggle>` | ⚠️ partielle | Bouton interrupteur sans libellé. |
| [`<lion-select>`](#lion-select) | `<dsfr-form-select>` | ✅ automatique | Liste déroulante native (`<select slot="input">`) → `dsfr-form-select` avec `[options]`. |
| [`<lion-select-rich>`](#lion-select-rich) | `<dsfr-form-select>` | ⚠️ partielle | Liste déroulante riche → `dsfr-form-select` (le contenu riche des options devient du texte). |
| [`<lion-option>`](#lion-option) | — | ❌ manuelle | Option isolée (hors lion-select-rich). |
| [`<lion-options>`](#lion-options) | — | ❌ manuelle | Conteneur d’options isolé. |
| [`<lion-combobox>`](#lion-combobox) | — | ❌ manuelle | Liste avec saisie et autocomplétion : pas d’équivalent dans ngx-dsfr. |
| [`<lion-listbox>`](#lion-listbox) | — | ❌ manuelle | Liste de sélection : pas d’équivalent dans ngx-dsfr. |
| [`<lion-input-date>`](#lion-input-date) | `<dsfr-form-input>` | ⚠️ partielle | Champ date → champ natif `type="date"`. |
| [`<lion-input-datepicker>`](#lion-input-datepicker) | `<dsfr-form-input>` | ⚠️ partielle | Champ date avec calendrier → champ natif `type="date"` (calendrier du navigateur). |
| [`<lion-calendar>`](#lion-calendar) | — | ❌ manuelle | Calendrier autonome : pas d’équivalent dans ngx-dsfr. |
| [`<lion-fieldset>`](#lion-fieldset) | `<dsfr-form-fieldset>` | ✅ automatique | Groupe de champs → `dsfr-form-fieldset` ; les champs enfants reçoivent la directive `dsfrFieldsetElement`. |
| [`<lion-form>`](#lion-form) | `<form>` | ⚠️ partielle | Enveloppe de formulaire supprimée : le `<form>` natif est conservé. |
| [`<lion-tabs>`](#lion-tabs) | `<dsfr-tabs>` | ✅ automatique | Onglets : chaque paire `slot="tab"` / `slot="panel"` devient un `<dsfr-tab tabId="tab-N" label="…">` contenant le panneau. |
| [`<lion-accordion>`](#lion-accordion) | `<dsfr-accordions-group>` | ✅ automatique | Accordéon : chaque paire `slot="invoker"` / `slot="content"` devient un `<dsfr-accordion heading="…">` contenant le contenu. |
| [`<lion-collapsible>`](#lion-collapsible) | `<dsfr-accordion>` | ✅ automatique | Section repliable → accordéon DSFR isolé. |
| [`<lion-pagination>`](#lion-pagination) | `<dsfr-pagination>` | ✅ automatique | Pagination. |
| [`<lion-steps>`](#lion-steps) | — | ❌ manuelle | Parcours en étapes : `dsfr-stepper` n’affiche que l’indicateur d’étapes. |
| [`<lion-step>`](#lion-step) | — | ❌ manuelle | Étape (voir lion-steps). |
| [`<lion-dialog>`](#lion-dialog) | `<dsfr-modal>` | ⚠️ partielle | Fenêtre modale : l’invoker devient un bouton `aria-controls="dialog-N"`, le contenu est placé dans `<dsfr-modal dialogId="dialog-N">`. |
| [`<lion-tooltip>`](#lion-tooltip) | directive `[tooltip]` | ✅ automatique | Infobulle : l’invoker reçoit la directive `tooltip="…"` avec le texte du contenu. |
| [`<lion-input-range>`](#lion-input-range) | `<dsfr-range>` | ✅ automatique | Curseur. |
| [`<lion-input-file>`](#lion-input-file) | `<dsfr-upload>` | ⚠️ partielle | Envoi de fichier. |
| [`<lion-progress-indicator>`](#lion-progress-indicator) | — | ❌ manuelle | Indicateur de progression : pas de composant ngx-dsfr. |
| [`<lion-icon>`](#lion-icon) | — | ❌ manuelle | Icône : le DSFR utilise des classes CSS (`fr-icon-*`). |
| [`<lion-drawer>`](#lion-drawer) | — | ❌ manuelle | Panneau latéral repliable : pas d’équivalent DSFR. |
| [`<lion-validation-feedback>`](#lion-validation-feedback) | — | ❌ manuelle | Messages de validation : gérés par les inputs `error` / `message` des champs ngx-dsfr. |
| [`<lion-field>`](#lion-field) | — | ❌ manuelle | Champ générique (classe de base) : pas d’équivalent direct. |
| [`<lion-select-invoker>`](#lion-select-invoker) | — | ❌ manuelle | Bouton interne de lion-select-rich. |
| [`<lion-selected-file-list>`](#lion-selected-file-list) | — | ❌ manuelle | Liste des fichiers sélectionnés (interne à lion-input-file). |

47 composants : 17 automatiques, 15 partiels, 15 manuels.

## Règles communes

Ces règles s’appliquent à tous les composants (sauf règle spécifique au composant).

**Attributs communs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `ngDefaultControl` | supprimé | Inutile : les composants ngx-dsfr implémentent ControlValueAccessor. |
| `modelValue` | `[(ngModel)]` / `ngModel` | `[modelValue]` + `(model-value-changed)="x = $event.target.modelValue"` deviennent `[(ngModel)]="x"`. Fusionné avec `(model-value-changed)` en liaison bidirectionnelle. Import : `FormsModule`. |
| `validators` | — (TODO) | TODO : Les validateurs Lion ([validators]) ne sont pas supportés : utilisez les Validators Angular (ngModel / FormControl) et les inputs error / message de ngx-dsfr. |
| `serializedValue` | — (TODO) | TODO : `serializedValue` n’existe pas dans ngx-dsfr : utilisez ngModel / FormControl. |
| `formattedValue` | — (TODO) | TODO : `formattedValue` n’existe pas dans ngx-dsfr : utilisez ngModel / FormControl. |

**Événements communs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(model-value-changed)` | `(ngModelChange)` | `$event.target.modelValue` devient `$event`. Expression du gestionnaire adaptée (`$event`). Import : `FormsModule`. |
| `(user-input-changed)` | `(ngModelChange)` | `$event.target.modelValue` devient `$event`. Expression du gestionnaire adaptée (`$event`). Import : `FormsModule`. |

**Attributs conservés tels quels** : `id`, `class`, `style`, `title`, `role`, `slot`, `ngClass`, `ngStyle`, `ngModel`, `ngModelOptions`, `formControl`, `formControlName`, `formGroup`, `formGroupName`, `formArrayName`, `aria-*`, `data-*`, directives structurelles (`*ngIf`, ...), références (`#ref`), `attr.*`, `i18n-*`.

**Événements conservés tels quels** : `(click)`, `(dblclick)`, `(focus)`, `(blur)`, `(focusin)`, `(focusout)`, `(keydown)`, `(keyup)`, `(keypress)`, `(mouseenter)`, `(mouseleave)`, `(mouseover)`, `(mouseout)`, `(ngModelChange)`.

Tout autre attribut ou événement sans règle est supprimé et signalé par un TODO.

## Détail par composant

### `<lion-button>`

- **Cible** : `<dsfr-button>`
- **Conversion** : ✅ automatique
- **Description** : Bouton.
- **Imports** : `DsfrButtonComponent`
- **Contenu** : Le contenu texte devient l'attribut `label`.

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `type` | `type` | Valeurs : `button` → `button`, `submit` → `submit`, `reset` → `reset`. |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `ariaLabel` | `ariaLabel` | `aria-label` est porté par le `<button>` interne. |
| `tabindex` | `tabIndex` | Valeur statique convertie en liaison de propriété. |
| `tabIndex` | `tabIndex` | Valeur statique convertie en liaison de propriété. |
| `active` | supprimé | État interne Lion, supprimé. |

**Remarques**

- Le texte du bouton devient l’input `label` (les interpolations `{{ }}` sont conservées).
- Le style se choisit avec `variant` (primary, secondary, tertiary, tertiary-no-outline) et la taille avec `size` (SM, MD, LG).
- Les icônes Lion (`<lion-icon>`) contenues dans le bouton sont à remplacer par l’input `icon` (classe `fr-icon-*`).

### `<lion-button-submit>`

- **Cible** : `<dsfr-button>`
- **Conversion** : ✅ automatique
- **Description** : Bouton de soumission de formulaire.
- **Imports** : `DsfrButtonComponent`
- **Attributs ajoutés** : `type="submit"`
- **Contenu** : Le contenu texte devient l'attribut `label`.

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `type` | `type` | Valeurs : `button` → `button`, `submit` → `submit`, `reset` → `reset`. |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `ariaLabel` | `ariaLabel` | `aria-label` est porté par le `<button>` interne. |
| `tabindex` | `tabIndex` | Valeur statique convertie en liaison de propriété. |
| `tabIndex` | `tabIndex` | Valeur statique convertie en liaison de propriété. |
| `active` | supprimé | État interne Lion, supprimé. |

**Remarques**

- Le texte du bouton devient l’input `label` (les interpolations `{{ }}` sont conservées).
- Le style se choisit avec `variant` (primary, secondary, tertiary, tertiary-no-outline) et la taille avec `size` (SM, MD, LG).
- Les icônes Lion (`<lion-icon>`) contenues dans le bouton sont à remplacer par l’input `icon` (classe `fr-icon-*`).

### `<lion-button-reset>`

- **Cible** : `<dsfr-button>`
- **Conversion** : ✅ automatique
- **Description** : Bouton de réinitialisation de formulaire.
- **Imports** : `DsfrButtonComponent`
- **Attributs ajoutés** : `type="reset"`
- **Contenu** : Le contenu texte devient l'attribut `label`.

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `type` | `type` | Valeurs : `button` → `button`, `submit` → `submit`, `reset` → `reset`. |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `ariaLabel` | `ariaLabel` | `aria-label` est porté par le `<button>` interne. |
| `tabindex` | `tabIndex` | Valeur statique convertie en liaison de propriété. |
| `tabIndex` | `tabIndex` | Valeur statique convertie en liaison de propriété. |
| `active` | supprimé | État interne Lion, supprimé. |

**Remarques**

- Le texte du bouton devient l’input `label` (les interpolations `{{ }}` sont conservées).
- Le style se choisit avec `variant` (primary, secondary, tertiary, tertiary-no-outline) et la taille avec `size` (SM, MD, LG).
- Les icônes Lion (`<lion-icon>`) contenues dans le bouton sont à remplacer par l’input `icon` (classe `fr-icon-*`).

### `<lion-input>`

- **Cible** : `<dsfr-form-input>`
- **Conversion** : ✅ automatique
- **Description** : Champ de saisie texte.
- **Imports** : `DsfrFormInputComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `readonly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `readOnly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `autocomplete` | `autocomplete` |  |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `pattern` | `pattern` |  |
| `maxlength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `maxLength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `minlength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `minLength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `type` | `type` | Valeurs : `date` → `date`, `datetime-local` → `datetime-local`, `email` → `email`, `number` → `number`, `password` → `password`, `search` → `search`, `tel` → `tel`, `text` → `text`, `time` → `time`. |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |
| `slot="prefix"` | Supprimé — TODO : Préfixe du champ non supporté par ngx-dsfr (utilisez `icon` ou le libellé). |
| `slot="suffix"` | Supprimé — TODO : Suffixe du champ non supporté par ngx-dsfr (utilisez `icon`, `buttonLabel` ou le libellé). |
| `slot="before"` | Supprimé — TODO : Slot "before" non supporté par ngx-dsfr. |
| `slot="after"` | Supprimé — TODO : Slot "after" non supporté par ngx-dsfr. |
| `slot="input"` | Supprimé — TODO : Élément <input> personnalisé non supporté : ngx-dsfr génère son propre champ. |

**Remarques**

- ngx-dsfr implémente `ControlValueAccessor` : utilisez `[(ngModel)]`, `formControlName` ou `[formControl]`.
- Les messages d’erreur se passent via les inputs `error`, `valid`, `message` / `messageSeverity`.

### `<lion-textarea>`

- **Cible** : `<dsfr-form-input>`
- **Conversion** : ✅ automatique
- **Description** : Zone de texte multi-lignes.
- **Imports** : `DsfrFormInputComponent`
- **Attributs ajoutés** : `type="textarea"`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `readonly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `readOnly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `autocomplete` | `autocomplete` |  |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `pattern` | `pattern` |  |
| `maxlength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `maxLength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `minlength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `minLength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `rows` | `rows` | Valeur statique convertie en liaison de propriété. |
| `maxRows` | — (TODO) | TODO : `max-rows` (agrandissement automatique) n’existe pas dans ngx-dsfr. |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |
| `slot="prefix"` | Supprimé — TODO : Préfixe du champ non supporté par ngx-dsfr (utilisez `icon` ou le libellé). |
| `slot="suffix"` | Supprimé — TODO : Suffixe du champ non supporté par ngx-dsfr (utilisez `icon`, `buttonLabel` ou le libellé). |
| `slot="before"` | Supprimé — TODO : Slot "before" non supporté par ngx-dsfr. |
| `slot="after"` | Supprimé — TODO : Slot "after" non supporté par ngx-dsfr. |
| `slot="input"` | Supprimé — TODO : Élément <input> personnalisé non supporté : ngx-dsfr génère son propre champ. |

**Remarques**

- ngx-dsfr implémente `ControlValueAccessor` : utilisez `[(ngModel)]`, `formControlName` ou `[formControl]`.
- Les messages d’erreur se passent via les inputs `error`, `valid`, `message` / `messageSeverity`.

### `<lion-input-email>`

- **Cible** : `<dsfr-form-email>`
- **Conversion** : ✅ automatique
- **Description** : Champ e-mail (validation du format incluse dans ngx-dsfr).
- **Imports** : `DsfrFormEmailComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `readonly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `readOnly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `autocomplete` | `autocomplete` |  |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `pattern` | `pattern` |  |
| `maxlength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `maxLength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `minlength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `minLength` | `minLength` | Valeur statique convertie en liaison de propriété. |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |
| `slot="prefix"` | Supprimé — TODO : Préfixe du champ non supporté par ngx-dsfr (utilisez `icon` ou le libellé). |
| `slot="suffix"` | Supprimé — TODO : Suffixe du champ non supporté par ngx-dsfr (utilisez `icon`, `buttonLabel` ou le libellé). |
| `slot="before"` | Supprimé — TODO : Slot "before" non supporté par ngx-dsfr. |
| `slot="after"` | Supprimé — TODO : Slot "after" non supporté par ngx-dsfr. |
| `slot="input"` | Supprimé — TODO : Élément <input> personnalisé non supporté : ngx-dsfr génère son propre champ. |

**Remarques**

- ngx-dsfr implémente `ControlValueAccessor` : utilisez `[(ngModel)]`, `formControlName` ou `[formControl]`.
- Les messages d’erreur se passent via les inputs `error`, `valid`, `message` / `messageSeverity`.

### `<lion-input-tel>`

- **Cible** : `<dsfr-form-tel>`
- **Conversion** : ⚠️ partielle
- **Description** : Champ téléphone.
- **Imports** : `DsfrFormTelComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `readonly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `readOnly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `autocomplete` | `autocomplete` |  |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `pattern` | `pattern` |  |
| `maxlength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `maxLength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `minlength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `minLength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `allowedRegions` | — (TODO) | TODO : Régions téléphoniques (`allowed-regions`) non supportées par ngx-dsfr. |
| `preferredRegions` | — (TODO) | TODO : Régions téléphoniques (`preferred-regions`) non supportées par ngx-dsfr. |
| `activeRegion` | — (TODO) | TODO : Région téléphonique (`active-region`) non supportée par ngx-dsfr. |
| `formatStrategy` | — (TODO) | TODO : Le formatage du numéro (`format-strategy`) n’existe pas dans ngx-dsfr. |
| `formatCountryCodeStyle` | — (TODO) | TODO : Le formatage du numéro (`format-country-code-style`) n’existe pas dans ngx-dsfr. |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |
| `slot="prefix"` | Supprimé — TODO : Préfixe du champ non supporté par ngx-dsfr (utilisez `icon` ou le libellé). |
| `slot="suffix"` | Supprimé — TODO : Suffixe du champ non supporté par ngx-dsfr (utilisez `icon`, `buttonLabel` ou le libellé). |
| `slot="before"` | Supprimé — TODO : Slot "before" non supporté par ngx-dsfr. |
| `slot="after"` | Supprimé — TODO : Slot "after" non supporté par ngx-dsfr. |
| `slot="input"` | Supprimé — TODO : Élément <input> personnalisé non supporté : ngx-dsfr génère son propre champ. |

**Remarques**

- ngx-dsfr implémente `ControlValueAccessor` : utilisez `[(ngModel)]`, `formControlName` ou `[formControl]`.
- Les messages d’erreur se passent via les inputs `error`, `valid`, `message` / `messageSeverity`.

### `<lion-input-tel-dropdown>`

- **Cible** : `<dsfr-form-tel>`
- **Conversion** : ⚠️ partielle
- **Description** : Champ téléphone avec choix du pays.
- **Imports** : `DsfrFormTelComponent`
- **TODO systématique** : Le choix du pays (dropdown) n’existe pas dans ngx-dsfr : ajoutez un <dsfr-form-select> séparé si nécessaire.

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `readonly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `readOnly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `autocomplete` | `autocomplete` |  |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `pattern` | `pattern` |  |
| `maxlength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `maxLength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `minlength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `minLength` | `minLength` | Valeur statique convertie en liaison de propriété. |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |
| `slot="prefix"` | Supprimé — TODO : Préfixe du champ non supporté par ngx-dsfr (utilisez `icon` ou le libellé). |
| `slot="suffix"` | Supprimé — TODO : Suffixe du champ non supporté par ngx-dsfr (utilisez `icon`, `buttonLabel` ou le libellé). |
| `slot="before"` | Supprimé — TODO : Slot "before" non supporté par ngx-dsfr. |
| `slot="after"` | Supprimé — TODO : Slot "after" non supporté par ngx-dsfr. |
| `slot="input"` | Supprimé — TODO : Élément <input> personnalisé non supporté : ngx-dsfr génère son propre champ. |

**Remarques**

- ngx-dsfr implémente `ControlValueAccessor` : utilisez `[(ngModel)]`, `formControlName` ou `[formControl]`.
- Les messages d’erreur se passent via les inputs `error`, `valid`, `message` / `messageSeverity`.

### `<lion-input-iban>`

- **Cible** : `<dsfr-form-input>`
- **Conversion** : ⚠️ partielle
- **Description** : Champ IBAN.
- **Imports** : `DsfrFormInputComponent`
- **TODO systématique** : Validation et formatage IBAN de Lion à recréer (validateur Angular, ex : pattern).

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `readonly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `readOnly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `autocomplete` | `autocomplete` |  |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `pattern` | `pattern` |  |
| `maxlength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `maxLength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `minlength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `minLength` | `minLength` | Valeur statique convertie en liaison de propriété. |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |
| `slot="prefix"` | Supprimé — TODO : Préfixe du champ non supporté par ngx-dsfr (utilisez `icon` ou le libellé). |
| `slot="suffix"` | Supprimé — TODO : Suffixe du champ non supporté par ngx-dsfr (utilisez `icon`, `buttonLabel` ou le libellé). |
| `slot="before"` | Supprimé — TODO : Slot "before" non supporté par ngx-dsfr. |
| `slot="after"` | Supprimé — TODO : Slot "after" non supporté par ngx-dsfr. |
| `slot="input"` | Supprimé — TODO : Élément <input> personnalisé non supporté : ngx-dsfr génère son propre champ. |

**Remarques**

- ngx-dsfr implémente `ControlValueAccessor` : utilisez `[(ngModel)]`, `formControlName` ou `[formControl]`.
- Les messages d’erreur se passent via les inputs `error`, `valid`, `message` / `messageSeverity`.

### `<lion-input-amount>`

- **Cible** : `<dsfr-form-input>`
- **Conversion** : ⚠️ partielle
- **Description** : Champ montant.
- **Imports** : `DsfrFormInputComponent`
- **Attributs ajoutés** : `type="number"`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `readonly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `readOnly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `autocomplete` | `autocomplete` |  |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `pattern` | `pattern` |  |
| `maxlength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `maxLength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `minlength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `minLength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `currency` | — (TODO) | TODO : La devise (`currency`) n’est pas gérée par ngx-dsfr : indiquez-la dans le libellé. |
| `locale` | — (TODO) | TODO : Le formatage localisé des montants n’existe pas dans ngx-dsfr. |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |
| `slot="prefix"` | Supprimé — TODO : Préfixe du champ non supporté par ngx-dsfr (utilisez `icon` ou le libellé). |
| `slot="suffix"` | Supprimé — TODO : Suffixe du champ non supporté par ngx-dsfr (utilisez `icon`, `buttonLabel` ou le libellé). |
| `slot="before"` | Supprimé — TODO : Slot "before" non supporté par ngx-dsfr. |
| `slot="after"` | Supprimé — TODO : Slot "after" non supporté par ngx-dsfr. |
| `slot="input"` | Supprimé — TODO : Élément <input> personnalisé non supporté : ngx-dsfr génère son propre champ. |

**Remarques**

- ngx-dsfr implémente `ControlValueAccessor` : utilisez `[(ngModel)]`, `formControlName` ou `[formControl]`.
- Les messages d’erreur se passent via les inputs `error`, `valid`, `message` / `messageSeverity`.

### `<lion-input-amount-dropdown>`

- **Cible** : `<dsfr-form-input>`
- **Conversion** : ⚠️ partielle
- **Description** : Champ montant avec choix de la devise.
- **Imports** : `DsfrFormInputComponent`
- **Attributs ajoutés** : `type="number"`
- **TODO systématique** : Le choix de la devise (dropdown) n’existe pas dans ngx-dsfr : ajoutez un <dsfr-form-select> séparé si nécessaire.

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `readonly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `readOnly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `autocomplete` | `autocomplete` |  |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `pattern` | `pattern` |  |
| `maxlength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `maxLength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `minlength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `minLength` | `minLength` | Valeur statique convertie en liaison de propriété. |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |
| `slot="prefix"` | Supprimé — TODO : Préfixe du champ non supporté par ngx-dsfr (utilisez `icon` ou le libellé). |
| `slot="suffix"` | Supprimé — TODO : Suffixe du champ non supporté par ngx-dsfr (utilisez `icon`, `buttonLabel` ou le libellé). |
| `slot="before"` | Supprimé — TODO : Slot "before" non supporté par ngx-dsfr. |
| `slot="after"` | Supprimé — TODO : Slot "after" non supporté par ngx-dsfr. |
| `slot="input"` | Supprimé — TODO : Élément <input> personnalisé non supporté : ngx-dsfr génère son propre champ. |

**Remarques**

- ngx-dsfr implémente `ControlValueAccessor` : utilisez `[(ngModel)]`, `formControlName` ou `[formControl]`.
- Les messages d’erreur se passent via les inputs `error`, `valid`, `message` / `messageSeverity`.

### `<lion-input-stepper>`

- **Cible** : `<dsfr-form-input>`
- **Conversion** : ⚠️ partielle
- **Description** : Champ numérique avec boutons +/-.
- **Imports** : `DsfrFormInputComponent`
- **Attributs ajoutés** : `type="number"`
- **TODO systématique** : Les boutons +/- de lion-input-stepper n’existent pas dans ngx-dsfr (champ numérique simple).

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `readonly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `readOnly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `autocomplete` | `autocomplete` |  |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `pattern` | `pattern` |  |
| `maxlength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `maxLength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `minlength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `minLength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `min` | `min` |  |
| `max` | `max` |  |
| `step` | — (TODO) | TODO : `step` n’est pas supporté par <dsfr-form-input>. |
| `valueTextMapping` | — (TODO) | TODO : `valueTextMapping` n’existe pas dans ngx-dsfr. |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |
| `slot="prefix"` | Supprimé — TODO : Préfixe du champ non supporté par ngx-dsfr (utilisez `icon` ou le libellé). |
| `slot="suffix"` | Supprimé — TODO : Suffixe du champ non supporté par ngx-dsfr (utilisez `icon`, `buttonLabel` ou le libellé). |
| `slot="before"` | Supprimé — TODO : Slot "before" non supporté par ngx-dsfr. |
| `slot="after"` | Supprimé — TODO : Slot "after" non supporté par ngx-dsfr. |
| `slot="input"` | Supprimé — TODO : Élément <input> personnalisé non supporté : ngx-dsfr génère son propre champ. |

**Remarques**

- ngx-dsfr implémente `ControlValueAccessor` : utilisez `[(ngModel)]`, `formControlName` ou `[formControl]`.
- Les messages d’erreur se passent via les inputs `error`, `valid`, `message` / `messageSeverity`.

### `<lion-checkbox>`

- **Cible** : `<dsfr-form-checkbox>`
- **Conversion** : ✅ automatique
- **Description** : Case à cocher.
- **Imports** : `DsfrFormCheckboxComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `checked` | `value` | Valeur initiale : la case est cochée si la valeur du modèle (ngModel / FormControl) est `true`. Attribut booléen : `x` devient `[x]="true"`. |
| `choiceValue` | — (TODO) | TODO : `choiceValue` : <dsfr-form-checkbox> a une valeur booléenne (cochée / non cochée), adaptez le modèle. |
| `slot` | supprimé | Supprimé (case d’une lion-checkbox-indeterminate). |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(checked-changed)` | `(ngModelChange)` | Expression du gestionnaire adaptée (`$event`). |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |

**Remarques**

- La valeur du modèle est un booléen. Utilisez `[(ngModel)]` ou `formControlName`.

### `<lion-checkbox-group>`

- **Cible** : `<dsfr-form-fieldset>`
- **Conversion** : ⚠️ partielle (transformation structurelle)
- **Description** : Groupe de cases à cocher → fieldset DSFR contenant des cases (directive `dsfrFieldsetElement`).
- **Imports** : `DsfrFormFieldsetComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `legend` | Légende du groupe. |
| `helpText` | `hint` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `legendSrOnly` | Attribut booléen : `x` devient `[x]="true"`. |
| `name` | — (TODO) | TODO : `name` du groupe : renseignez `name` sur chaque <dsfr-form-checkbox>. |
| `modelValue` | — (TODO) | TODO : La valeur du groupe (tableau des cases cochées) n’existe pas en DSFR : liez chaque <dsfr-form-checkbox> à un booléen. |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(model-value-changed)` | — (TODO) | TODO : Événement du groupe : écoutez (ngModelChange) sur chaque <dsfr-form-checkbox>. |

**Remarques**

- Chaque case est un champ indépendant à valeur booléenne.

### `<lion-checkbox-indeterminate>`

- **Cible** : `<dsfr-form-checkbox>`
- **Conversion** : ⚠️ partielle (transformation structurelle)
- **Description** : Case à cocher parente (état indéterminé) → case `[indeterminate]` suivie des cases enfants.
- **Imports** : `DsfrFormCheckboxComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `checked` | `value` | Valeur initiale : la case est cochée si la valeur du modèle (ngModel / FormControl) est `true`. Attribut booléen : `x` devient `[x]="true"`. |
| `choiceValue` | — (TODO) | TODO : `choiceValue` : <dsfr-form-checkbox> a une valeur booléenne (cochée / non cochée), adaptez le modèle. |
| `slot` | supprimé | Supprimé (case d’une lion-checkbox-indeterminate). |

### `<lion-radio-group>`

- **Cible** : `<dsfr-form-radio>`
- **Conversion** : ✅ automatique (transformation structurelle)
- **Description** : Groupe de boutons radio → `dsfr-form-radio` avec `[options]` généré à partir des `lion-radio`.
- **Imports** : `DsfrFormRadioComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `legendSrOnly` | Attribut booléen : `x` devient `[x]="true"`. |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |

**Remarques**

- Chaque `<lion-radio label="…" choice-value="…">` devient une entrée `{ label, value }` de `[options]`.
- Les options générées par `*ngFor` / `@for` doivent être construites dans le composant.

### `<lion-radio>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Bouton radio isolé (hors lion-radio-group).
- **TODO systématique** : lion-radio hors d’un lion-radio-group : utilisez <dsfr-form-radio [options]="…">.

### `<lion-switch>`

- **Cible** : `<dsfr-form-toggle>`
- **Conversion** : ✅ automatique
- **Description** : Interrupteur.
- **Imports** : `DsfrFormToggleComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `checked` | `value` | Valeur initiale : la case est cochée si la valeur du modèle (ngModel / FormControl) est `true`. Attribut booléen : `x` devient `[x]="true"`. |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(checked-changed)` | `(ngModelChange)` | Expression du gestionnaire adaptée (`$event`). |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |

**Remarques**

- La valeur du modèle est un booléen.

### `<lion-switch-button>`

- **Cible** : `<dsfr-form-toggle>`
- **Conversion** : ⚠️ partielle
- **Description** : Bouton interrupteur sans libellé.
- **Imports** : `DsfrFormToggleComponent`
- **TODO systématique** : lion-switch-button n’a pas de libellé : renseignez label (éventuellement avec [labelSrOnly]="true").

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `checked` | `value` | Valeur initiale : la case est cochée si la valeur du modèle (ngModel / FormControl) est `true`. Attribut booléen : `x` devient `[x]="true"`. |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(checked-changed)` | `(ngModelChange)` | Expression du gestionnaire adaptée (`$event`). |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |

**Remarques**

- La valeur du modèle est un booléen.

### `<lion-select>`

- **Cible** : `<dsfr-form-select>`
- **Conversion** : ✅ automatique (transformation structurelle)
- **Description** : Liste déroulante native (`<select slot="input">`) → `dsfr-form-select` avec `[options]`.
- **Imports** : `DsfrFormSelectComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(change)` | `(selectChange)` | TODO : (change) → (selectChange) : vérifiez l’usage de $event (valeur sélectionnée). |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="input"` | Supprimé — TODO : Le <select slot="input"> est remplacé par [options]. |

**Remarques**

- Les `<option>` deviennent des entrées `{ label, value }` de `[options]` ; une première option à valeur vide devient le `placeholder`.
- Les `<optgroup>` deviennent des entrées `{ label, options: [...] }`.
- Les options générées par `@for` / `*ngFor` doivent être construites dans le composant.

### `<lion-select-rich>`

- **Cible** : `<dsfr-form-select>`
- **Conversion** : ⚠️ partielle (transformation structurelle)
- **Description** : Liste déroulante riche → `dsfr-form-select` (le contenu riche des options devient du texte).
- **Imports** : `DsfrFormSelectComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `interactionMode` | supprimé | Supprimé. |

**Remarques**

- Les `<option>` deviennent des entrées `{ label, value }` de `[options]` ; une première option à valeur vide devient le `placeholder`.
- Les `<optgroup>` deviennent des entrées `{ label, options: [...] }`.
- Les options générées par `@for` / `*ngFor` doivent être construites dans le composant.

### `<lion-option>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Option isolée (hors lion-select-rich).
- **TODO systématique** : lion-option hors d’un lion-select-rich : utilisez [options] sur <dsfr-form-select>.

### `<lion-options>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Conteneur d’options isolé.
- **TODO systématique** : lion-options hors d’un lion-select-rich : utilisez [options] sur <dsfr-form-select>.

### `<lion-combobox>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Liste avec saisie et autocomplétion : pas d’équivalent dans ngx-dsfr.
- **TODO systématique** : lion-combobox n’a pas d’équivalent dans ngx-dsfr : utilisez <dsfr-form-select>, <dsfr-search-bar> ou un composant spécifique.

### `<lion-listbox>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Liste de sélection : pas d’équivalent dans ngx-dsfr.
- **TODO systématique** : lion-listbox n’a pas d’équivalent dans ngx-dsfr : utilisez <dsfr-form-select> ou <dsfr-form-radio>.

### `<lion-input-date>`

- **Cible** : `<dsfr-form-input>`
- **Conversion** : ⚠️ partielle
- **Description** : Champ date → champ natif `type="date"`.
- **Imports** : `DsfrFormInputComponent`
- **Attributs ajoutés** : `type="date"`
- **TODO systématique** : La valeur de <dsfr-form-input type="date"> est une chaîne "AAAA-MM-JJ" (objet Date en Lion) : adaptez le modèle et les validateurs (MinDate, MaxDate, ...). Alternative : <dsfr-date>.

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `readonly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `readOnly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `autocomplete` | `autocomplete` |  |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `pattern` | `pattern` |  |
| `maxlength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `maxLength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `minlength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `minLength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `min` | `min` |  |
| `max` | `max` |  |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |

### `<lion-input-datepicker>`

- **Cible** : `<dsfr-form-input>`
- **Conversion** : ⚠️ partielle
- **Description** : Champ date avec calendrier → champ natif `type="date"` (calendrier du navigateur).
- **Imports** : `DsfrFormInputComponent`
- **Attributs ajoutés** : `type="date"`
- **TODO systématique** : La valeur de <dsfr-form-input type="date"> est une chaîne "AAAA-MM-JJ" (objet Date en Lion) : adaptez le modèle et les validateurs (MinDate, MaxDate, ...). Alternative : <dsfr-date>.

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `placeholder` | `placeholder` |  |
| `readonly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `readOnly` | `readonly` | Attribut booléen : `x` devient `[x]="true"`. |
| `autocomplete` | `autocomplete` |  |
| `required` | `required` | Attribut booléen : `x` devient `[x]="true"`. |
| `pattern` | `pattern` |  |
| `maxlength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `maxLength` | `maxLength` | Valeur statique convertie en liaison de propriété. |
| `minlength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `minLength` | `minLength` | Valeur statique convertie en liaison de propriété. |
| `min` | `min` |  |
| `max` | `max` |  |
| `calendarHeading` | supprimé | Supprimé (calendrier natif). |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |

### `<lion-calendar>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Calendrier autonome : pas d’équivalent dans ngx-dsfr.
- **TODO systématique** : lion-calendar n’a pas d’équivalent dans ngx-dsfr : utilisez <dsfr-form-input type="date"> ou <dsfr-date>.

### `<lion-fieldset>`

- **Cible** : `<dsfr-form-fieldset>`
- **Conversion** : ✅ automatique (transformation structurelle)
- **Description** : Groupe de champs → `dsfr-form-fieldset` ; les champs enfants reçoivent la directive `dsfrFieldsetElement`.
- **Imports** : `DsfrFormFieldsetComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `legend` | Légende du groupe. |
| `helpText` | `hint` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `legendSrOnly` | Attribut booléen : `x` devient `[x]="true"`. |
| `name` | — (TODO) | TODO : `name` de lion-fieldset (regroupement des valeurs) : utilisez `formGroupName` ou `ngModelGroup`. |
| `modelValue` | — (TODO) | TODO : La valeur agrégée de lion-fieldset n’existe pas en DSFR : utilisez un FormGroup (`formGroupName`). |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(model-value-changed)` | — (TODO) | TODO : Événement de lion-fieldset : écoutez `valueChanges` du FormGroup Angular. |

### `<lion-form>`

- **Cible** : `<form>`
- **Conversion** : ⚠️ partielle (transformation structurelle)
- **Description** : Enveloppe de formulaire supprimée : le `<form>` natif est conservé.
- **TODO systématique** : lion-form supprimé : gérez la soumission avec (ngSubmit) et la validation avec Angular Forms.

**Remarques**

- L’élément `<lion-form>` est retiré, son `<form>` enfant est conservé tel quel (indentation réajustée).

### `<lion-tabs>`

- **Cible** : `<dsfr-tabs>`
- **Conversion** : ✅ automatique (transformation structurelle)
- **Description** : Onglets : chaque paire `slot="tab"` / `slot="panel"` devient un `<dsfr-tab tabId="tab-N" label="…">` contenant le panneau.
- **Imports** : `DsfrTabsComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `selectedIndex` | `selectedTabIndex` | Valeur statique convertie en liaison de propriété. |
| `vertical` | — (TODO) | TODO : Onglets verticaux non supportés par le DSFR. |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(selected-changed)` | `(tabIndexSelect)` | Expression du gestionnaire adaptée (`$event`). |

**Remarques**

- Les identifiants `tabId` sont générés (`tab-1`, `tab-2`, ...) : renommez-les si besoin.

### `<lion-accordion>`

- **Cible** : `<dsfr-accordions-group>`
- **Conversion** : ✅ automatique (transformation structurelle)
- **Description** : Accordéon : chaque paire `slot="invoker"` / `slot="content"` devient un `<dsfr-accordion heading="…">` contenant le contenu.
- **Imports** : `DsfrAccordionsGroupComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `exclusive` | supprimé | Sans `exclusive`, `[ungroup]="true"` est ajouté (plusieurs sections ouvertes). |
| `expanded` | — (TODO) | TODO : `expanded` (sections ouvertes) : utilisez [(expanded)] sur chaque <dsfr-accordion>. |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(expanded-changed)` | — (TODO) | TODO : Écoutez (expandedChange) sur chaque <dsfr-accordion>. |

**Remarques**

- Le niveau de titre de l’invoker (`<h3 slot="invoker">`) devient `headingLevel="H3"`.

### `<lion-collapsible>`

- **Cible** : `<dsfr-accordion>`
- **Conversion** : ✅ automatique (transformation structurelle)
- **Description** : Section repliable → accordéon DSFR isolé.
- **Imports** : `DsfrAccordionComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `opened` | `[(expanded)]` / `expanded` | Attribut booléen : `x` devient `[x]="true"`. Fusionné avec `(opened-changed)` en liaison bidirectionnelle. |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(opened-changed)` | `(expandedChange)` | Expression du gestionnaire adaptée (`$event`). |

### `<lion-pagination>`

- **Cible** : `<dsfr-pagination>`
- **Conversion** : ✅ automatique
- **Description** : Pagination.
- **Imports** : `DsfrPaginationComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `current` | `currentPage` | Valeur statique convertie en liaison de propriété. |
| `count` | `pageCount` | Valeur statique convertie en liaison de propriété. |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(current-changed)` | `(pageSelect)` | Expression du gestionnaire adaptée (`$event`). |

**Remarques**

- `(pageSelect)` émet directement le numéro de page sélectionné.

### `<lion-steps>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Parcours en étapes : `dsfr-stepper` n’affiche que l’indicateur d’étapes.
- **TODO systématique** : lion-steps : utilisez <dsfr-stepper [currentStep]="…" [totalSteps]="…" currentStepTitle="…" nextStepTitle="…"> et affichez le contenu de l’étape courante (@switch).

### `<lion-step>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Étape (voir lion-steps).
- **TODO systématique** : lion-step : voir la migration de lion-steps vers <dsfr-stepper>.

### `<lion-dialog>`

- **Cible** : `<dsfr-modal>`
- **Conversion** : ⚠️ partielle (transformation structurelle)
- **Description** : Fenêtre modale : l’invoker devient un bouton `aria-controls="dialog-N"`, le contenu est placé dans `<dsfr-modal dialogId="dialog-N">`.
- **Imports** : `DsfrModalComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `config` | — (TODO) | TODO : La configuration de lion-dialog ([config]) n’a pas d’équivalent : voir size, concealingBackdrop, mobileTop. |
| `opened` | — (TODO) | TODO : `opened` : ouvrez la modale avec la méthode open() du composant <dsfr-modal>. |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(opened-changed)` | — (TODO) | TODO : `opened-changed` : utilisez les événements (disclose) / (conceal) de <dsfr-modal>. |

**Remarques**

- Le titre `titleModal` doit être renseigné manuellement.
- Les boutons de fermeture du contenu peuvent être remplacés par l’input `actions` de `dsfr-modal`.

### `<lion-tooltip>`

- **Cible** : directive `[tooltip]`
- **Conversion** : ✅ automatique (transformation structurelle)
- **Description** : Infobulle : l’invoker reçoit la directive `tooltip="…"` avec le texte du contenu.
- **Imports** : `DsfrTooltipDirective`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `hasArrow` | supprimé | Supprimé (flèche native DSFR). |
| `invokerRelation` | supprimé | Supprimé (géré par la directive). |
| `config` | — (TODO) | TODO : La configuration de lion-tooltip ([config]) n’a pas d’équivalent. |

### `<lion-input-range>`

- **Cible** : `<dsfr-range>`
- **Conversion** : ✅ automatique
- **Description** : Curseur.
- **Imports** : `DsfrRangeComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | — (TODO) | TODO : `label-sr-only` n’est pas supporté par <dsfr-range>. |
| `min` | `min` | Valeur statique convertie en liaison de propriété. |
| `max` | `max` | Valeur statique convertie en liaison de propriété. |
| `step` | `step` | Valeur statique convertie en liaison de propriété. |
| `unit` | `suffix` | Unité affichée après la valeur. |
| `noMinMaxLabels` | `hideMinMax` | Attribut booléen : `x` devient `[x]="true"`. |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |

### `<lion-input-file>`

- **Cible** : `<dsfr-upload>`
- **Conversion** : ⚠️ partielle
- **Description** : Envoi de fichier.
- **Imports** : `DsfrUploadComponent`

**Attributs**

| Source | Cible | Remarques |
| --- | --- | --- |
| `label` | `label` | Libellé du champ. |
| `helpText` | `hint` | Texte d'aide. |
| `name` | `name` |  |
| `disabled` | `disabled` | Attribut booléen : `x` devient `[x]="true"`. |
| `labelSrOnly` | `labelSrOnly` | Libellé visible uniquement des lecteurs d’écran. Attribut booléen : `x` devient `[x]="true"`. |
| `accept` | `accept` |  |
| `multiple` | `multiple` | Attribut booléen : `x` devient `[x]="true"`. |
| `buttonLabel` | — (TODO) | TODO : `button-label` : le libellé du bouton est fourni par le navigateur. |
| `maxFileSize` | — (TODO) | TODO : `max-file-size` : validez la taille des fichiers dans (fileSelect). |
| `enableDropZone` | — (TODO) | TODO : `enable-drop-zone` : zone de dépôt non supportée par <dsfr-upload>. |
| `uploadOnSelect` | — (TODO) | TODO : `upload-on-select` : déclenchez l’envoi dans (fileSelect). |

**Événements**

| Source | Cible | Remarques |
| --- | --- | --- |
| `(file-list-changed)` | `(fileSelect)` | TODO : (file-list-changed) → (fileSelect) : $event est désormais la liste des fichiers sélectionnés. |

**Slots**

| Slot | Conversion |
| --- | --- |
| `slot="label"` | Texte → attribut `label`. Le texte du slot devient l’input `label`. |
| `slot="help-text"` | Texte → attribut `hint`. Le texte du slot devient l’input `hint`. |
| `slot="feedback"` | Supprimé — TODO : Message de validation : utilisez les inputs error / message de ngx-dsfr. |
| `slot="file-select-button"` | Supprimé — TODO : Bouton de sélection personnalisé non supporté. |

### `<lion-progress-indicator>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Indicateur de progression : pas de composant ngx-dsfr.
- **TODO systématique** : lion-progress-indicator : pas d’équivalent ngx-dsfr, utilisez l’élément natif <progress> ou [loader]="true" sur <dsfr-button>.

### `<lion-icon>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Icône : le DSFR utilise des classes CSS (`fr-icon-*`).
- **TODO systématique** : lion-icon : utilisez une icône DSFR (<span class="fr-icon-xxx" aria-hidden="true"></span>) ou l’input `icon` des composants.

### `<lion-drawer>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Panneau latéral repliable : pas d’équivalent DSFR.
- **TODO systématique** : lion-drawer : pas d’équivalent DSFR (envisagez <dsfr-sidemenu> ou <dsfr-accordion>).

### `<lion-validation-feedback>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Messages de validation : gérés par les inputs `error` / `message` des champs ngx-dsfr.
- **TODO systématique** : lion-validation-feedback : utilisez les inputs error / message / messageSeverity du champ ngx-dsfr.

### `<lion-field>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Champ générique (classe de base) : pas d’équivalent direct.
- **TODO systématique** : lion-field : remplacez par le champ ngx-dsfr adapté (<dsfr-form-input>, <dsfr-form-select>, ...).

### `<lion-select-invoker>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Bouton interne de lion-select-rich.
- **TODO systématique** : lion-select-invoker : élément interne de lion-select-rich, à supprimer (voir <dsfr-form-select>).

### `<lion-selected-file-list>`

- **Cible** : —
- **Conversion** : ❌ manuelle
- **Description** : Liste des fichiers sélectionnés (interne à lion-input-file).
- **TODO systématique** : lion-selected-file-list : affichez la liste des fichiers reçus via (fileSelect) de <dsfr-upload>.
