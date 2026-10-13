import { SchematicContext } from '@angular-devkit/schematics';

/** Option commune à tous les schematics. */
export interface VerboseSchema {
  /** Affiche le détail de ce qui est analysé et fait. */
  verbose?: boolean;
}

export type VerboseLogger = (message: string) => void;

/** Retourne une fonction qui journalise (`[verbose] ...`) uniquement si l'option `verbose` est active. */
export function createVerboseLogger(context: SchematicContext, options: VerboseSchema): VerboseLogger {
  return options.verbose ? (message) => context.logger.info(`[verbose] ${message}`) : () => undefined;
}
