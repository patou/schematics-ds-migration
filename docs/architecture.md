# Architecture

Ce document décrit le fonctionnement interne des schematics et la manière de les étendre (nouveau composant,
nouveau design system, nouvelle migration).

## Vue d'ensemble

```text
            ┌────────────────────┐
 options ──▶│ migrate/index.ts   │  résout le projet, le dossier, la migration (from/to)
            └─────────┬──────────┘
                      ▼
            ┌───────────────────────────┐
            │ core/ts/project-migrator  │  parcourt les fichiers .html / .ts du dossier
            └─────────┬─────────────────┘
          templates   │   composants TypeScript
                      ▼
            ┌───────────────────────────┐        ┌───────────────────────────────┐
            │ core/template-migrator    │◀───────│ migrations/lion-to-dsfr        │
            │ (moteur générique)        │ mappings│ (DSL déclaratif + transforms) │
            └─────────┬─────────────────┘        └───────────────────────────────┘
                      ▼
      HTML migré + TODO + imports TypeScript requis + balises source rencontrées
                      ▼
      project-migrator : imports `@Component.imports` / NgModule, imports "define",
                         CUSTOM_ELEMENTS_SCHEMA, rapport
```

| Dossier                    | Contenu                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `src/core/html`            | Parseur HTML tolérant (syntaxe Angular, blocs `@if`/`@for`) qui conserve les positions et le texte d'origine. |
| `src/core/template-migrator.ts` | Moteur de conversion d'un template à partir d'une `MigrationDefinition`.                 |
| `src/core/ts`              | Manipulations TypeScript (AST `typescript`) : templates inline, `imports`, `schemas`, imports ES. |
| `src/core/types.ts`        | Types du DSL de mapping (`DesignSystem`, `MigrationDefinition`, `ComponentMapping`, `AttributeRule`...). |
| `src/design-systems`       | Description de chaque DS : packages npm, styles/scripts globaux, préfixe des balises, notes.  |
| `src/migrations`           | Registre `MIGRATIONS` et une migration par couple de DS (`lion-to-dsfr/`).                    |
| `src/tools`                | Générateur du guide de correspondance (`docs/guides/<id>.md`).                                |

## Le moteur de templates

`migrateTemplate(html, migration, { prefix })` :

1. parse le template et relève toutes les balises du DS source (préfixe utilisateur compris : `my-*`) ;
2. pour chaque élément source, cherche le `ComponentMapping` correspondant et le remplace :
   - par la **transformation déclarative** (renommage de la balise, conversion des attributs, slots, contenu) ;
   - ou par une **transformation personnalisée** (`transform`) pour les changements de structure ;
3. le texte qui n'est pas concerné (mise en forme, commentaires, blocs de contrôle, autres balises) est recopié
   à l'identique : seules les balises migrées sont réécrites ;
4. les messages TODO collectés pendant la conversion d'un élément sont insérés au-dessus de celui-ci sous la forme
   `<!-- TODO(ds-migration): ... -->`, avec l'indentation de l'élément.

Le résultat contient le HTML migré, les TODO, les imports TypeScript requis (`ImportSpec`) et les balises source
rencontrées (pour supprimer les imports `define` devenus inutiles).

### Conversion des attributs

Pour chaque attribut d'un élément source :

| Type d'attribut                                         | Traitement                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `*ngIf`, `#ref`, `[attr.x]`, `i18n-*`, `@animation`, `let-*` | Conservé.                                               |
| Événement                                               | Règle `events` du composant, puis `commonEvents`, sinon conservé si générique (`click`...), sinon TODO. |
| Attribut / liaison                                      | Règle `attributes` (clé en camelCase : `help-text` → `helpText`), puis `commonAttributes`, sinon conservé si générique (`id`, `class`, `aria-*`...), sinon TODO. |

Une `AttributeRule` (voir `src/core/types.ts`) permet de :

- renommer (`to`), supprimer silencieusement (`remove`) ou supprimer avec un TODO (`todo` sans `to`) ;
- convertir un attribut booléen (`boolean` : `disabled` → `[disabled]="true"`) ou numérique (`asProperty`) ;
- traduire des valeurs statiques (`values`) ;
- adapter l'expression d'un gestionnaire d'événement (`replace` : `$event.target.modelValue` → `$event`) ;
- fusionner une liaison et son événement en liaison bidirectionnelle (`twoWay` :
  `[modelValue]="x" (model-value-changed)="x = $event.target.modelValue"` → `[(ngModel)]="x"`) ;
- déclarer les imports TypeScript nécessaires (`imports` : `FormsModule`) ;
- documenter la règle (`doc`), repris dans le guide généré.

### Transformations personnalisées

Une `CustomTransform` reçoit l'élément parsé et un `TransformContext` :

| Méthode                                  | Usage                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `ctx.is(el, 'lion-tab')`                 | Teste une balise source (gère le préfixe utilisateur).                  |
| `ctx.convertAttributes(el, mapping?)`    | Applique les règles d'attributs (retourne la liste des attributs cibles). |
| `ctx.buildElement(tag, attrs, content)`  | Construit une balise (reprend la mise en forme de l'élément source `el`). |
| `ctx.render(node)` / `ctx.renderChildren(el)` | Migre récursivement des enfants.                                   |
| `ctx.todo(message)`                      | Ajoute un TODO au-dessus de l'élément.                                  |
| `ctx.addImport(spec)`                    | Déclare un import TypeScript.                                           |
| `ctx.uniqueId('tab')`                    | Identifiant unique dans le template (`tab-1`, `tab-2`...).              |
| `ctx.text(el)`, `ctx.raw(node)`, `ctx.slotted(el, 'label')`, `ctx.attr(el, 'name')`, `ctx.indent(el)` | Lecture du contenu. |
| `ctx.tag('lion-tab')`                    | Balise source avec le préfixe utilisateur (`my-tab`).                   |

Les helpers propres à une migration sont regroupés dans `src/migrations/<id>/shared.ts` (ex : `renderGroup`,
`asFieldsetElement`, `splitControlFlow` pour séparer les options statiques des blocs `@for`).

## Le projet TypeScript

`core/ts/project-migrator.ts` :

- migre les fichiers `.html` et les templates inline des fichiers `.ts` du dossier ;
- associe chaque template à sa classe `@Component` (via `templateUrl`) ;
- composants standalone : ajoute les symboles requis à `imports` (en les important depuis leur module) ;
- composants non standalone : ajoute les imports au NgModule qui déclare le composant (recherché dans le projet) ;
- supprime les imports `define` du DS source (`sourceDefineImport`) dont les balises ne sont plus utilisées ;
- retire `CUSTOM_ELEMENTS_SCHEMA` des composants standalone qui n'utilisent plus d'éléments personnalisés.

Les modifications sont appliquées sous forme d'éditions textuelles ciblées (`TextEdit`) pour conserver la mise en
forme du fichier ; les listes trop longues (> 100 caractères) sont présentées sur plusieurs lignes.

## Ajouter un composant à une migration

1. Ajouter un `ComponentMapping` dans le fichier de la famille concernée
   (`src/migrations/lion-to-dsfr/components/*.ts`) et, si besoin, l'exporter dans la liste de `index.ts` :

   ```ts
   {
     source: 'lion-input-email',
     target: 'dsfr-form-email',
     status: 'auto',
     description: 'Champ e-mail.',
     imports: [dsfr('DsfrFormEmailComponent')],
     attributes: INPUT_ATTRIBUTES, // règles partagées : label, helpText → hint, disabled...
   }
   ```

2. Ajouter les tests dans le `*_spec.ts` correspondant (helpers `toDsfr`, `todosOf` de `src/testing/helpers.ts`).
3. Régénérer le guide : `npm run docs`.

## Ajouter un design system ou une migration

1. Décrire le DS dans `src/design-systems/<id>/index.ts` (`DesignSystem`) et l'ajouter à
   `src/design-systems/index.ts`.
2. Créer `src/migrations/<from>-to-<to>/index.ts` exportant une `MigrationDefinition` (composants, règles communes,
   `sourceDefineImport` si le DS source utilise des imports à effet de bord), puis l'ajouter à `MIGRATIONS` dans
   `src/migrations/index.ts`.
3. Ajouter les identifiants dans les `enum` des `schema.json` (`migrate` : `from`/`to`, `add-ds` et `remove-ds` :
   `ds`) et dans les types `schema.ts`.
4. Ajouter des tests, une application d'exemple dans `examples/` (et dans `src/migrate/examples_spec.ts`), puis
   `npm run docs` pour générer `docs/guides/<from>-to-<to>.md`.

Exemples de futures migrations : DSFR → Lion (migration inverse), Lion → Angular Material.
