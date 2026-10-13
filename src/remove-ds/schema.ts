import { VerboseSchema } from '../utility/verbose';

export interface RemoveDsSchema extends VerboseSchema {
  /** Design system à supprimer (ex : `lion`). */
  ds: string;
  /** Projet Angular. */
  project?: string;
  /** Préfixe remplaçant celui des balises (`my` pour `<my-button>`). */
  prefix?: string;
  /** Supprime même si des balises du DS sont encore présentes. */
  ignoreRemaining?: boolean;
  /** N'exécute pas `npm install`. */
  skipInstall?: boolean;
}
