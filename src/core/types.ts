import type { ElementNode } from './html/parser';
import type { TransformContext } from './template-migrator';

/** Symbole TypeScript à importer dans les composants qui utilisent le composant cible. */
export interface ImportSpec {
  /** Nom du symbole exporté, ex : `DsfrButtonComponent`. */
  name: string;
  /** Module, ex : `@edugouvfr/ngx-dsfr`. */
  from: string;
}

export interface PackageSpec {
  name: string;
  version: string;
  dev?: boolean;
}

/** Description d'un design system (packages npm, styles globaux, préfixe des balises...). */
export interface DesignSystem {
  /** Identifiant utilisé dans les options des schematics (`lion`, `dsfr`, ...). */
  id: string;
  name: string;
  description: string;
  /** Lien vers la documentation officielle. */
  documentation?: string;
  /** Packages à installer par `add-ds`. */
  packages: PackageSpec[];
  /**
   * Préfixes des packages appartenant au DS (utilisés par `remove-ds`), ex: `@lion/`.
   * Un nom exact est aussi accepté.
   */
  packagePatterns: string[];
  /** Préfixes des modules dont les imports TypeScript sont supprimés par `remove-ds`. */
  importPatterns: string[];
  /** Feuilles de style globales ajoutées dans `angular.json` (cible `build`). */
  styles?: string[];
  /** Scripts globaux ajoutés dans `angular.json` (cible `build`). */
  scripts?: string[];
  /** Préfixe des balises du DS (sans préfixe utilisateur), ex : `lion-`. */
  tagPrefix: string;
  /** Messages affichés à l'utilisateur après `add-ds`. */
  setupNotes?: string[];
}

/**
 * Règle de conversion d'un attribut (input, propriété, liaison bidirectionnelle) ou d'un événement.
 *
 * Une chaîne simple est un raccourci pour `{ to: '...' }`.
 */
export type AttributeRuleInput = string | AttributeRule;

export interface AttributeRule {
  /** Nom de l'input / output cible. Si absent, l'attribut est supprimé. */
  to?: string;
  /** Message TODO ajouté au-dessus du composant (migration manuelle nécessaire). */
  todo?: string;
  /** Suppression silencieuse (aucun TODO), par ex. pour `ngDefaultControl`. */
  remove?: boolean;
  /** Attribut booléen : `disabled` (attribut statique sans valeur) devient `[disabled]="true"`
   * pour être compatible avec les inputs Angular typés `boolean`.
   */
  boolean?: boolean;
  /**
   * Une valeur statique est convertie en liaison de propriété : `rows="3"` devient `[rows]="3"`
   * (inputs numériques).
   */
  asProperty?: boolean;
  /**
   * Remplacements appliqués à l'expression (événements), ex : `$event.target.modelValue` -> `$event`.
   * Chaque entrée est `[expression régulière (source), remplacement]`.
   */
  replace?: [string, string][];
  /** Conversion des valeurs statiques, ex : `{ submit: 'submit' }`. */
  values?: Record<string, string>;
  /**
   * Fusionne une liaison de propriété et l'événement associé en liaison bidirectionnelle :
   * `[modelValue]="x" (model-value-changed)="x = $event.target.modelValue"` devient `[(ngModel)]="x"`.
   */
  twoWay?: { event: string; to: string };
  /** La cible n'accepte pas de liaison bidirectionnelle : `[(x)]` devient `[x]` (avec TODO). */
  oneWayOnly?: boolean;
  /** Imports TypeScript nécessaires quand l'attribut est utilisé (ex : `FormsModule`). */
  imports?: ImportSpec[];
  /** Description pour la documentation générée. */
  doc?: string;
}

/** Règle de conversion d'un enfant portant `slot="..."`. */
export type SlotRule =
  /** Le contenu texte de l'enfant devient la valeur de l'attribut cible (l'enfant est supprimé). */
  | { toAttribute: string; doc?: string }
  /** L'attribut `slot="x"` est remplacé par l'attribut de projection `[name]` (ng-content select). */
  | { toContentSelector: string; doc?: string }
  /** L'enfant est supprimé et un TODO est ajouté. */
  | { todo: string; doc?: string }
  /** L'attribut slot est retiré, l'enfant est conservé tel quel. */
  | { keep: true; doc?: string };

/** Que faire du contenu (enfants hors slots) d'un composant. */
export type ContentRule =
  /** Le contenu est conservé (projection de contenu). */
  | 'keep'
  /** Le contenu texte devient un attribut (ex : libellé d'un bouton). */
  | { toAttribute: string };

/**
 * Transformation personnalisée : retourne le code HTML qui remplace complètement l'élément.
 * Utilisée pour les conversions structurelles (onglets, accordéons, listes d'options...).
 */
export type CustomTransform = (el: ElementNode, ctx: TransformContext) => string;

export type MappingStatus =
  /** Conversion complète. */
  | 'auto'
  /** Conversion automatique avec des points à vérifier (TODO). */
  | 'partial'
  /** Pas d'équivalent : migration manuelle. */
  | 'manual';

export interface ComponentMapping {
  /** Balise source sans préfixe utilisateur, ex : `lion-button`. */
  source: string;
  /** Balise cible, ex : `dsfr-button`. `null` si aucun équivalent (un TODO est ajouté). */
  target: string | null;
  status: MappingStatus;
  /** Description pour la documentation. */
  description?: string;
  /** Règles des attributs/inputs, indexées par le nom camelCase source (`helpText`, `label`...). */
  attributes?: Record<string, AttributeRuleInput>;
  /** Règles des événements, indexées par le nom de l'événement source (`model-value-changed`...). */
  events?: Record<string, AttributeRuleInput>;
  /** Règles des enfants `slot="..."`. */
  slots?: Record<string, SlotRule>;
  /** Traitement du contenu hors slots. `keep` par défaut. */
  content?: ContentRule;
  /** Attributs statiques ajoutés sur la balise cible, ex : `{ type: 'submit' }`. */
  addAttributes?: Record<string, string>;
  /** Imports TypeScript requis par le composant cible. */
  imports?: ImportSpec[];
  /** TODO systématiquement ajouté lors de la conversion de ce composant. */
  todo?: string;
  /** Remarques supplémentaires pour la documentation. */
  notes?: string[];
  /** Transformation personnalisée (remplace la transformation déclarative). */
  transform?: CustomTransform;
}

/** Définition complète d'une migration d'un DS vers un autre. */
export interface MigrationDefinition {
  /** Identifiant, ex : `lion-to-dsfr`. */
  id: string;
  from: DesignSystem;
  to: DesignSystem;
  components: ComponentMapping[];
  /**
   * Attributs conservés tels quels sur tous les composants (en plus des attributs génériques
   * Angular/HTML : `id`, `class`, `*ngIf`, `#ref`, `aria-*`, ...).
   */
  passthroughAttributes?: string[];
  /** Événements conservés tels quels sur tous les composants (`click`, `focus`...). */
  passthroughEvents?: string[];
  /** Règles d'attributs appliquées à tous les composants (surchargées par celles du composant). */
  commonAttributes?: Record<string, AttributeRuleInput>;
  /** Règles d'événements appliquées à tous les composants. */
  commonEvents?: Record<string, AttributeRuleInput>;
  /**
   * Retourne le chemin des imports "define" du DS source à supprimer d'un fichier TypeScript
   * lorsque la balise n'y est plus utilisée (ex : `@lion/ui/define/lion-button.js`).
   */
  sourceDefineImport?: (tag: string) => RegExp;
}
