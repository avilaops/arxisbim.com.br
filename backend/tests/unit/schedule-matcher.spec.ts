import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  tokenize,
  inferIfcTypes,
  extractStoreyLevel,
  levenshtein,
  stringSimilarity,
  tokenJaccard,
  scorePair,
  matchSchedule,
  type MatcherActivity,
  type MatcherElement,
} from '../../src/modules/scheduling/schedule-matcher.service.js';

describe('normalizeText', () => {
  it('remove acentos, baixa caixa e colapsa separadores', () => {
    expect(normalizeText('Vigas do 3º Pavimento')).toBe('vigas do 3 pavimento');
    expect(normalizeText('Fundação-Sapata_01')).toBe('fundacao sapata 01');
  });
});

describe('tokenize', () => {
  it('remove stopwords e tokens de 1 char', () => {
    expect(tokenize('vigas do 3º pavimento')).toEqual(['vigas', '3', 'pavimento']);
  });
});

describe('inferIfcTypes', () => {
  it('mapeia termos PT para tipos IFC', () => {
    expect(inferIfcTypes('Concretagem das vigas').has('IFCBEAM')).toBe(true);
    expect(inferIfcTypes('Execução de pilares').has('IFCCOLUMN')).toBe(true);
    expect(inferIfcTypes('Alvenaria de vedação').has('IFCWALL')).toBe(true);
    expect(inferIfcTypes('Lançamento da laje').has('IFCSLAB')).toBe(true);
  });
  it('retorna vazio quando não há termo conhecido', () => {
    expect(inferIfcTypes('Mobilização do canteiro').size).toBe(0);
  });
});

describe('extractStoreyLevel', () => {
  it('reconhece ordinais e rótulos', () => {
    expect(extractStoreyLevel('Vigas do 3º pavimento')).toBe(3);
    expect(extractStoreyLevel('pavimento 5')).toBe(5);
    expect(extractStoreyLevel('Terceiro pavimento')).toBe(3);
    expect(extractStoreyLevel('nivel 2 estrutura')).toBe(2);
  });
  it('reconhece térreo e subsolo', () => {
    expect(extractStoreyLevel('Laje do térreo')).toBe(0);
    expect(extractStoreyLevel('Fundação no subsolo')).toBe(-1);
  });
  it('retorna null sem indicação', () => {
    expect(extractStoreyLevel('Mobilização')).toBeNull();
  });
});

describe('similaridade', () => {
  it('levenshtein básico', () => {
    expect(levenshtein('viga', 'viga')).toBe(0);
    expect(levenshtein('viga', 'vigas')).toBe(1);
  });
  it('stringSimilarity normaliza 0..1', () => {
    expect(stringSimilarity('Viga', 'viga')).toBe(1);
    expect(stringSimilarity('viga', 'pilar')).toBeLessThan(0.5);
  });
  it('tokenJaccard mede sobreposição de tokens', () => {
    expect(tokenJaccard('viga pavimento 3', 'viga pavimento 3')).toBe(1);
    expect(tokenJaccard('viga 3', 'pilar 3')).toBeCloseTo(1 / 3, 5);
  });
});

describe('scorePair', () => {
  const activity: MatcherActivity = { id: 'a1', name: 'Concretagem das vigas do 3º pavimento' };

  it('pontua alto quando tipo + pavimento + nome batem', () => {
    const el: MatcherElement = { globalId: 'g1', name: 'Viga V1 - Pav 3', ifcType: 'IFCBEAM', storeyId: 3 };
    expect(scorePair(activity, el)).toBeGreaterThan(0.7);
  });

  it('pontua baixo quando tipo e pavimento divergem', () => {
    const el: MatcherElement = { globalId: 'g2', name: 'Pilar P1', ifcType: 'IFCCOLUMN', storeyId: 1 };
    expect(scorePair(activity, el)).toBeLessThan(0.4);
  });
});

describe('matchSchedule', () => {
  const activities: MatcherActivity[] = [
    { id: 'a1', name: 'Concretagem das vigas do 3º pavimento' },
    { id: 'a2', name: 'Execução dos pilares do térreo' },
    { id: 'a3', name: 'Mobilização do canteiro' }, // sem elemento correspondente
  ];
  const elements: MatcherElement[] = [
    { globalId: 'v3', name: 'Viga V1', ifcType: 'IFCBEAM', storeyId: 3 },
    { globalId: 'v3b', name: 'Viga V2', ifcType: 'IFCBEAM', storeyId: 3 },
    { globalId: 'p0', name: 'Pilar P1', ifcType: 'IFCCOLUMN', storeyId: 0 },
    { globalId: 'orf', name: 'Tomada elétrica', ifcType: 'IFCOUTLET', storeyId: 9 },
  ];

  it('vincula tarefas estruturais e identifica órfãos/não-mapeados', () => {
    const r = matchSchedule(activities, elements, { threshold: 0.5 });

    const a1 = r.mappings.find((m) => m.activityId === 'a1')!;
    expect(a1.matchedElements.map((e) => e.globalId).sort()).toEqual(['v3', 'v3b']);

    const a2 = r.mappings.find((m) => m.activityId === 'a2')!;
    expect(a2.matchedElements.map((e) => e.globalId)).toEqual(['p0']);

    expect(r.unmatchedActivityIds).toContain('a3');
    expect(r.orphanElementIds).toContain('orf');
  });

  it('atinge >= 75% de match em tarefas estruturais (critério S35)', () => {
    const structural = activities.slice(0, 2);
    const r = matchSchedule(structural, elements, { threshold: 0.5 });
    expect(r.stats.matchRate).toBeGreaterThanOrEqual(0.75);
  });

  it('respeita maxElementsPerActivity', () => {
    const r = matchSchedule([activities[0]], elements, { threshold: 0.5, maxElementsPerActivity: 1 });
    expect(r.mappings[0].matchedElements).toHaveLength(1);
    expect(r.mappings[0].matchedElements[0].globalId).toMatch(/v3/);
  });

  it('ordena por confiança decrescente', () => {
    const r = matchSchedule([activities[0]], elements, { threshold: 0.3 });
    const confs = r.mappings[0].matchedElements.map((e) => e.confidence);
    expect(confs).toEqual([...confs].sort((a, b) => b - a));
  });
});
