import { DesignSystem } from '../core/types';
import { dsfrDesignSystem } from './dsfr';
import { lionDesignSystem } from './lion';

/** Registre des design systems connus. Ajoutez ici un nouveau DS. */
export const DESIGN_SYSTEMS: Record<string, DesignSystem> = {
  [lionDesignSystem.id]: lionDesignSystem,
  [dsfrDesignSystem.id]: dsfrDesignSystem,
};

export function getDesignSystem(id: string): DesignSystem {
  const ds = DESIGN_SYSTEMS[id];
  if (!ds) {
    throw new Error(`Design system inconnu : "${id}". Valeurs possibles : ${Object.keys(DESIGN_SYSTEMS).join(', ')}.`);
  }
  return ds;
}
