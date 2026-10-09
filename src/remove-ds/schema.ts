export interface RemoveDsSchema {
  /** Design system à supprimer (ex : `lion`). */
  ds: string;
  /** Projet Angular. */
  project?: string;
  /** Préfixe des balises (`my` pour `<my-lion-button>`). */
  prefix?: string;
  /** Supprime même si des balises du DS sont encore présentes. */
  force?: boolean;
  /** N'exécute pas `npm install`. */
  skipInstall?: boolean;
}
