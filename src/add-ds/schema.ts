export interface AddDsSchema {
  /** Design system à ajouter (ex : `dsfr`). */
  ds: string;
  /** Projet Angular. */
  project?: string;
  /** N'exécute pas `npm install`. */
  skipInstall?: boolean;
}
