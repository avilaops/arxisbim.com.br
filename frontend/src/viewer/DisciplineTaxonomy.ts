/**
 * Taxonomia de disciplina (S10) — CONFIG, não hard-code no viewer.
 *
 * Spec S10/S14: a classificação de disciplina é configuração. Se o S14 mudar a
 * taxonomia, os filtros se adaptam sem reescrita. Aqui fica o default; o S14
 * injeta a sua. Resolve tipo IFC → DisciplineGroup (case-insensitive).
 */
import type { DisciplineGroup } from './VisibilityState';

export type DisciplineResolver = (ifcType: string) => DisciplineGroup;

/** Mapa default tipo→grupo (substituível pela config do S14). */
export const DEFAULT_DISCIPLINE_MAP: Record<string, DisciplineGroup> = {
  // structural
  ifcbeam: 'structural', ifccolumn: 'structural', ifcslab: 'structural', ifcmember: 'structural',
  ifcplate: 'structural', ifcfooting: 'structural', ifcpile: 'structural', ifcreinforcingbar: 'structural',
  // architectural
  ifcwall: 'architectural', ifcwallstandardcase: 'architectural', ifcdoor: 'architectural',
  ifcwindow: 'architectural', ifcroof: 'architectural', ifcstair: 'architectural', ifcstairflight: 'architectural',
  ifcramp: 'architectural', ifcrailing: 'architectural', ifccovering: 'architectural', ifccurtainwall: 'architectural',
  // mep
  ifcductsegment: 'mep', ifcpipesegment: 'mep', ifccablecarriersegment: 'mep', ifccablesegment: 'mep',
  ifcflowsegment: 'mep', ifcflowfitting: 'mep', ifcflowterminal: 'mep', ifcflowcontroller: 'mep',
  // site
  ifcsite: 'site', ifcearthworksfill: 'site', ifcearthworkscut: 'site', ifcgeographicelement: 'site',
  // furniture
  ifcfurnishingelement: 'furniture', ifcfurniture: 'furniture', ifcsystemfurnitureelement: 'furniture',
};

/** Cria um resolver a partir de um mapa (default = DEFAULT_DISCIPLINE_MAP). */
export function makeDisciplineResolver(map: Record<string, DisciplineGroup> = DEFAULT_DISCIPLINE_MAP): DisciplineResolver {
  return (ifcType: string) => map[ifcType.toLowerCase()] ?? 'other';
}
