/**
 * schedule-matcher.service.ts (S35)
 *
 * Motor de auto-mapeamento entre tarefas de cronograma (activities) e
 * elementos geométricos BIM (element_properties). Puro/determinístico,
 * sem dependência de banco — recebe listas e devolve sugestões com confiança.
 *
 * Heurística: tipo IFC inferido do texto (dicionário PT→IFC) + nível/pavimento
 * extraído do texto + similaridade textual nome×nome (Jaccard de tokens +
 * Levenshtein normalizado). Score final pondera os três sinais.
 */

export interface MatcherActivity {
  id: string;
  name: string;
  wbsCode?: string | null;
}

export interface MatcherElement {
  globalId: string;
  name?: string | null;
  ifcType?: string | null;
  storeyId?: number | null;
}

export interface ElementMatch {
  globalId: string;
  confidence: number; // 0..1
}

export interface ActivityMapping {
  activityId: string;
  matchedElements: ElementMatch[];
  /** Maior confiança entre os elementos mapeados (0 se nenhum). */
  topConfidence: number;
}

export interface MatchResult {
  mappings: ActivityMapping[];
  /** globalIds de elementos que não foram vinculados a nenhuma tarefa. */
  orphanElementIds: string[];
  /** ids de tarefas que não encontraram nenhum elemento. */
  unmatchedActivityIds: string[];
  stats: {
    totalActivities: number;
    totalElements: number;
    matchedActivities: number;
    matchRate: number; // matchedActivities / totalActivities
  };
}

export interface MatchOptions {
  /** Confiança mínima para aceitar um vínculo. Default 0.5. */
  threshold?: number;
  /** Máximo de elementos vinculados por tarefa. Default ilimitado. */
  maxElementsPerActivity?: number;
}

// =====================================
// Normalização de texto
// =====================================

/** lowercase + remove acentos + colapsa não-alfanuméricos em espaço. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'o', 'a', 'os', 'as', 'no', 'na',
  'em', 'com', 'para', 'por', 'um', 'uma', 'the', 'of', 'and',
]);

export function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(' ')
    .filter((t) => (t.length > 1 || /^\d$/.test(t)) && !STOPWORDS.has(t));
}

// =====================================
// Dicionário PT → tipo IFC
// =====================================

const IFC_KEYWORDS: Array<{ words: string[]; ifcType: string }> = [
  { words: ['viga', 'vigas'], ifcType: 'IFCBEAM' },
  { words: ['pilar', 'pilares', 'coluna', 'colunas'], ifcType: 'IFCCOLUMN' },
  { words: ['parede', 'paredes', 'alvenaria', 'muro'], ifcType: 'IFCWALL' },
  { words: ['laje', 'lajes', 'piso', 'contrapiso'], ifcType: 'IFCSLAB' },
  { words: ['fundacao', 'fundacoes', 'sapata', 'sapatas', 'bloco', 'radier'], ifcType: 'IFCFOOTING' },
  { words: ['estaca', 'estacas'], ifcType: 'IFCPILE' },
  { words: ['escada', 'escadas'], ifcType: 'IFCSTAIR' },
  { words: ['rampa', 'rampas'], ifcType: 'IFCRAMP' },
  { words: ['telhado', 'cobertura', 'telhados'], ifcType: 'IFCROOF' },
  { words: ['porta', 'portas'], ifcType: 'IFCDOOR' },
  { words: ['janela', 'janelas', 'esquadria', 'esquadrias'], ifcType: 'IFCWINDOW' },
  { words: ['cobogo', 'guarda', 'corpo', 'corrimao'], ifcType: 'IFCRAILING' },
  { words: ['tubulacao', 'tubo', 'tubos', 'hidraulica', 'tubulacoes'], ifcType: 'IFCFLOWSEGMENT' },
  { words: ['forro', 'forros'], ifcType: 'IFCCOVERING' },
];

/** Tipos IFC inferidos a partir do texto da tarefa (pode retornar vários). */
export function inferIfcTypes(text: string): Set<string> {
  const tokens = new Set(tokenize(text));
  const out = new Set<string>();
  for (const entry of IFC_KEYWORDS) {
    if (entry.words.some((w) => tokens.has(w))) out.add(entry.ifcType);
  }
  return out;
}

// =====================================
// Extração de nível / pavimento
// =====================================

const ORDINAL_WORDS: Record<string, number> = {
  terreo: 0, primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, quinto: 5,
  sexto: 6, setimo: 7, oitavo: 8, nono: 9, decimo: 10,
};

/**
 * Extrai um número de pavimento/nível do texto. Reconhece:
 *  "3º pavimento", "pavimento 3", "nivel 3", "andar 2", "L3", "térreo" (0),
 *  "subsolo" (-1). Retorna null se não encontrar.
 */
export function extractStoreyLevel(text: string): number | null {
  const norm = normalizeText(text);

  if (/\bsubsolo\b/.test(norm) || /\bss\b/.test(norm)) return -1;
  if (/\bterreo\b/.test(norm)) return 0;

  for (const [word, num] of Object.entries(ORDINAL_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(norm)) return num;
  }

  // "pavimento 3", "nivel 3", "andar 3", "pav 3"
  const labeled = norm.match(/\b(?:pavimento|pav|nivel|andar|piso|laje)\s+(\d{1,3})\b/);
  if (labeled) return Number(labeled[1]);

  // "3 pavimento", "3 andar", "3 nivel"
  const pre = norm.match(/\b(\d{1,3})\s+(?:pavimento|pav|nivel|andar)\b/);
  if (pre) return Number(pre[1]);

  // "l3" / "n3" estilo nível
  const letter = norm.match(/\b[ln](\d{1,2})\b/);
  if (letter) return Number(letter[1]);

  return null;
}

// =====================================
// Similaridade textual
// =====================================

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Levenshtein normalizado para 0..1 (1 = idêntico). */
export function stringSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length);
}

/** Jaccard sobre conjuntos de tokens (0..1). */
export function tokenJaccard(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return inter / union;
}

/** Combina Jaccard de tokens (peso maior) e Levenshtein normalizado. */
export function nameSimilarity(a: string, b: string): number {
  return 0.7 * tokenJaccard(a, b) + 0.3 * stringSimilarity(a, b);
}

// =====================================
// Score de um par (tarefa, elemento)
// =====================================

/**
 * Pondera três sinais:
 *  - tipo IFC: tarefa menciona um tipo que bate com o do elemento (0.45)
 *  - pavimento: nível extraído da tarefa == storeyId do elemento (0.25)
 *  - nome: similaridade textual tarefa.name × elemento.name (0.30)
 * Sinais ausentes não pontuam (não penalizam negativamente).
 */
export function scorePair(activity: MatcherActivity, element: MatcherElement): number {
  const text = `${activity.name} ${activity.wbsCode ?? ''}`;

  let typeScore = 0;
  const inferred = inferIfcTypes(text);
  if (inferred.size > 0 && element.ifcType) {
    typeScore = inferred.has(element.ifcType.toUpperCase()) ? 1 : 0;
  }

  let storeyScore = 0;
  const level = extractStoreyLevel(text);
  if (level !== null && element.storeyId !== null && element.storeyId !== undefined) {
    storeyScore = level === element.storeyId ? 1 : 0;
  }

  let nameScore = 0;
  if (element.name) nameScore = nameSimilarity(activity.name, element.name);

  return 0.45 * typeScore + 0.25 * storeyScore + 0.3 * nameScore;
}

// =====================================
// Matching em lote
// =====================================

export function matchSchedule(
  activities: MatcherActivity[],
  elements: MatcherElement[],
  options: MatchOptions = {}
): MatchResult {
  const threshold = options.threshold ?? 0.5;
  const maxPer = options.maxElementsPerActivity ?? Infinity;

  const mappings: ActivityMapping[] = [];
  const matchedElementIds = new Set<string>();
  const unmatchedActivityIds: string[] = [];

  for (const activity of activities) {
    const scored: ElementMatch[] = [];
    for (const element of elements) {
      const confidence = scorePair(activity, element);
      if (confidence >= threshold) {
        scored.push({ globalId: element.globalId, confidence: round(confidence) });
      }
    }
    scored.sort((x, y) => y.confidence - x.confidence);
    const matched = Number.isFinite(maxPer) ? scored.slice(0, maxPer) : scored;

    for (const m of matched) matchedElementIds.add(m.globalId);
    if (matched.length === 0) unmatchedActivityIds.push(activity.id);

    mappings.push({
      activityId: activity.id,
      matchedElements: matched,
      topConfidence: matched.length > 0 ? matched[0].confidence : 0,
    });
  }

  const orphanElementIds = elements
    .map((e) => e.globalId)
    .filter((id) => !matchedElementIds.has(id));

  const matchedActivities = activities.length - unmatchedActivityIds.length;

  return {
    mappings,
    orphanElementIds,
    unmatchedActivityIds,
    stats: {
      totalActivities: activities.length,
      totalElements: elements.length,
      matchedActivities,
      matchRate: activities.length === 0 ? 0 : round(matchedActivities / activities.length),
    },
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
