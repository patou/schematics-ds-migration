import { DesignSystem } from '../../core/types';

/** Package Angular de l'implémentation ngx-dsfr du Système de Design de l'État. */
export const NGX_DSFR = '@edugouvfr/ngx-dsfr';

/** Système de Design de l'État (DSFR) via la librairie Angular ngx-dsfr. */
export const dsfrDesignSystem: DesignSystem = {
  id: 'dsfr',
  name: 'DSFR (ngx-dsfr)',
  description:
    "Système de Design de l'État français, implémentation Angular @edugouvfr/ngx-dsfr (composants standalone).",
  documentation: 'https://www.systeme-de-design.gouv.fr/version-courante/',
  packages: [
    { name: NGX_DSFR, version: '^1.20.0' },
    { name: '@gouvfr/dsfr', version: '~1.15.3' },
    { name: 'uuid', version: '^13.0.0' },
    { name: 'args-parser', version: '^1.3.0' },
  ],
  packagePatterns: [NGX_DSFR, '@gouvfr/dsfr'],
  importPatterns: [NGX_DSFR],
  styles: [
    'node_modules/@gouvfr/dsfr/dist/dsfr/dsfr.main.min.css',
    'node_modules/@gouvfr/dsfr/dist/utility/utility.main.min.css',
  ],
  scripts: ['node_modules/@gouvfr/dsfr/dist/dsfr/dsfr.module.js'],
  tagPrefix: 'dsfr-',
  setupNotes: [
    "Le DSFR impose l'acceptation de ses conditions d'utilisation : exécutez `npm create @gouvfr/dsfr -- --dsfr-version=1.15.3` (https://www.systeme-de-design.gouv.fr/version-courante/fr/premiers-pas/vous-etes-developpeur/prise-en-main).",
    'Ajoutez les meta tags DSFR et `lang="fr"` dans src/index.html (voir la page "Prise en main" du DSFR).',
    'Documentation des composants ngx-dsfr : https://foad.phm.education.gouv.fr/edugouvfr/ngx-dsfr/',
  ],
};
