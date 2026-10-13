import { VerboseSchema } from '../utility/verbose';

export interface MigrateSchema extends VerboseSchema {
  /** Design system source (ex : `lion`). */
  from: string;
  /** Design system cible (ex : `dsfr`). */
  to: string;
  /** Dossier à migrer, relatif à la racine du workspace. */
  path?: string;
  /** Préfixe remplaçant celui du DS source (`my` pour `<my-button>`). */
  prefix?: string;
  /** Projet Angular. */
  project?: string;
  /** Supprime `CUSTOM_ELEMENTS_SCHEMA` quand il n'est plus nécessaire. */
  removeCustomElementsSchema?: boolean;
}
