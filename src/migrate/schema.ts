export interface MigrateSchema {
  /** Design system source (ex : `lion`). */
  from: string;
  /** Design system cible (ex : `dsfr`). */
  to: string;
  /** Dossier à migrer, relatif à la racine du workspace. */
  path?: string;
  /** Préfixe des balises du DS source (`my` pour `<my-lion-button>`). */
  prefix?: string;
  /** Projet Angular. */
  project?: string;
  /** Supprime `CUSTOM_ELEMENTS_SCHEMA` quand il n'est plus nécessaire. */
  removeCustomElementsSchema?: boolean;
}
