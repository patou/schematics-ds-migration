# schematics-ds-migration

Schematics Angular pour migrer une application d'un **design system** (DS) vers un autre.

La première migration disponible convertit [Lion](https://github.com/ing-bank/lion) (`@lion/ui`) vers le
[Système de Design de l'État (DSFR)](https://www.systeme-de-design.gouv.fr/version-courante/) via l'implémentation
Angular [ngx-dsfr](https://gitlab.mim-libre.fr/men/transverse/dsmen/ngx-dsfr-components) (`@edugouvfr/ngx-dsfr`).

La collection propose trois schematics :

| Schematic   | Rôle                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `add-ds`    | Ajoute le nouveau DS : dépendances `package.json`, styles et scripts globaux dans `angular.json`.      |
| `migrate`   | Migre les composants d'un dossier : balises, attributs, événements, imports TypeScript, schémas.       |
| `remove-ds` | Supprime l'ancien DS : dépendances, imports TypeScript (`@lion/ui/...`), styles et scripts globaux.    |

👉 Le [guide de correspondance Lion → DSFR](docs/guides/lion-to-dsfr.md) liste tous les composants et attributs
convertis. L'[architecture](docs/architecture.md) explique comment ajouter un composant ou un nouveau design system.

## Installation

```bash
npm install
npm run build
```

Puis, dans l'application Angular à migrer :

```bash
npm install --save-dev /chemin/vers/schematics-ds-migration
```

## Utilisation

Procédure recommandée (sur une branche Git propre, pour relire le diff) :

```bash
# 1. Migrer les composants (tout le projet ou un dossier)
ng generate schematics-ds-migration:migrate --path=src/app/registration

# 2. Ajouter le nouveau design system
ng generate schematics-ds-migration:add-ds --ds=dsfr

# 3. Une fois toute l'application migrée, supprimer l'ancien design system
ng generate schematics-ds-migration:remove-ds --ds=lion
```

Sans Angular CLI, avec le CLI `schematics` (`@angular-devkit/schematics-cli`) :

```bash
schematics /chemin/vers/schematics-ds-migration/src/collection.json:migrate --path=src/app --dry-run=false
```

Recherchez ensuite `TODO(ds-migration)` dans le code : chaque point qui n'a pas pu être converti automatiquement est
signalé par un commentaire placé au-dessus du composant concerné, par exemple :

```html
<!-- TODO(ds-migration): Attribut "fieldName" de <lion-input> sans équivalent sur <dsfr-form-input> : field-name="Nom" -->
<dsfr-form-input label="Nom" name="lastName" [(ngModel)]="model.lastName"></dsfr-form-input>
```

### Options

#### `migrate`

| Option                         | Défaut              | Description                                                                                                   |
| ------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `--path`                       | `sourceRoot` du projet | Dossier à migrer (relatif à la racine du workspace).                                                       |
| `--from`                       | `lion`              | Design system source.                                                                                         |
| `--to`                         | `dsfr`              | Design system cible.                                                                                          |
| `--prefix`                     | (vide)              | Remplace le préfixe du design system : avec `my`, `<my-button>` est migré au lieu de `<lion-button>`.         |
| `--project`                    | projet par défaut   | Projet Angular du workspace.                                                                                  |
| `--remove-custom-elements-schema` | `true`           | Retire `CUSTOM_ELEMENTS_SCHEMA` des composants standalone quand il n'est plus nécessaire.                    |

Ce qui est migré :

- les templates `*.html` et les templates inline (`template:`) des composants ;
- les balises, attributs, liaisons (`[x]`, `[(x)]`), événements et slots, selon le
  [guide de correspondance](docs/guides/lion-to-dsfr.md) ;
- les `imports` des composants standalone (ajout des composants ngx-dsfr, de `FormsModule`...) et des NgModules
  déclarant les composants migrés ;
- les imports `@lion/ui/define/lion-*.js` devenus inutiles ;
- `CUSTOM_ELEMENTS_SCHEMA` lorsqu'il n'y a plus d'éléments personnalisés (un avertissement est affiché pour les
  NgModules, dont le schéma est conservé).

#### `add-ds`

| Option          | Défaut            | Description                                       |
| --------------- | ----------------- | ------------------------------------------------- |
| `--ds`          | `dsfr`            | Design system à ajouter (`dsfr`, `lion`).         |
| `--project`     | projet par défaut | Projet Angular du workspace.                      |
| `--skip-install`| `false`           | N'exécute pas `npm install`.                      |

#### `remove-ds`

| Option               | Défaut            | Description                                                                                    |
| -------------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| `--ds`               | `lion`            | Design system à supprimer (`lion`, `dsfr`).                                                    |
| `--prefix`           | (vide)            | Préfixe remplaçant celui des balises du DS (voir `migrate`).                                   |
| `--ignore-remaining` | `false`           | Supprime le DS même si des balises sont encore utilisées (sinon le schematic s'arrête en erreur). |
| `--project`          | projet par défaut | Projet Angular du workspace.                                                                   |
| `--skip-install`     | `false`           | N'exécute pas `npm install`.                                                                   |

Les imports nommés encore utilisés (ex : `import { LionButton } from '@lion/ui/button.js'`) sont remplacés par un
commentaire `TODO(ds-migration)`.

> ⚠️ `--force` est une option réservée du CLI Angular / schematics : elle ne peut pas être utilisée pour `remove-ds`,
> d'où le nom `--ignore-remaining`.

## Limites

- Le code TypeScript manipulant les web components Lion (`querySelector('lion-input')`, `modelValue`, validateurs
  Lion, `@lion/ui/form-core.js`...) n'est pas réécrit : il est signalé par `remove-ds` ou doit être repris à la main.
- Les styles CSS ciblant les balises ou parties Lion (`lion-button::part(...)`) ne sont pas migrés.
- Les composants sans équivalent DSFR (combobox, calendrier, steps, drawer...) sont conservés avec un TODO.
- Les listes d'options générées dynamiquement (`@for`, `*ngFor`) dans les selects et groupes radio sont signalées
  par un TODO : le tableau `[options]` est à construire dans le composant.
- Le DSFR impose l'acceptation de ses conditions d'utilisation : `add-ds` affiche la commande à exécuter.

## Développement

```bash
npm run build      # compile les schematics (les .js sont générés à côté des .ts)
npm test           # build + tests unitaires (Vitest)
npm run typecheck  # vérifie aussi les specs
npm run docs       # régénère docs/guides/*.md à partir des mappings
npm run example -- lion-app            # migre examples/lion-app dans tmp/examples/lion-app
npm run example -- lion-app-prefixed   # idem avec le préfixe "my"
```

### Tests

Les tests utilisent [Vitest](https://vitest.dev/) (`src/**/*_spec.ts`) :

- `src/core/**` : moteur de migration (parseur HTML, attributs, utilitaires TypeScript) ;
- `src/migrations/lion-to-dsfr/components/*_spec.ts` : conversions de chaque famille de composants ;
- `src/migrations/lion-to-dsfr/index_spec.ts` : toutes les balises Lion ont une correspondance ;
- `src/{add-ds,migrate,remove-ds}/index_spec.ts` : schematics exécutés sur un workspace Angular généré ;
- `src/migrate/examples_spec.ts` : migration complète des applications d'exemple, comparée aux snapshots
  `src/migrate/__snapshots__/examples/` (mise à jour : `npx vitest run -u`) ;
- `src/tools/generate-docs_spec.ts` : le guide de correspondance est à jour.

### Applications d'exemple

| Exemple                      | Contenu                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `examples/lion-app`          | Formulaire d'inscription complet, catalogue (onglets, accordéon, pagination, dialog...), NgModule.  |
| `examples/lion-app-prefixed` | Balises préfixées `<my-*>` enregistrées via `customElements.define`.                                 |

## Structure

```text
src/
  collection.json            # déclaration des 3 schematics
  add-ds/ migrate/ remove-ds/  # factories + schema.json
  core/                      # moteur générique (HTML, TypeScript, types du DSL de mapping)
  design-systems/            # description des DS (packages, styles, préfixes)
  migrations/                # registre des migrations + lion-to-dsfr/
  tools/generate-docs.ts     # génération du guide de correspondance
docs/
  architecture.md
  guides/lion-to-dsfr.md     # généré
examples/                    # applications Lion à migrer
scripts/run-example.mjs
```
