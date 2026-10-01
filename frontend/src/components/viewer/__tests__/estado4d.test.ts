import { describe, expect, it } from 'vitest'
import type { Atividade } from '@/services/schedules.service'
import {
  atividadesNaData,
  estadosNaData,
  janelaDoCronograma,
  janelaUnida,
  resumirEstados,
} from '../estado4d'

function atividade(parcial: Partial<Atividade> & { id: string }): Atividade {
  return {
    name: parcial.id,
    plannedStart: '2026-01-01',
    plannedEnd: '2026-01-10',
    ...parcial,
  }
}

describe('janelaDoCronograma', () => {
  it('devolve null sem atividade: não há régua para mostrar', () => {
    expect(janelaDoCronograma([])).toBeNull()
  })

  it('vai do primeiro começo à última conclusão', () => {
    const janela = janelaDoCronograma([
      atividade({ id: 'fundacao', plannedStart: '2026-03-02', plannedEnd: '2026-03-20' }),
      atividade({ id: 'estrutura', plannedStart: '2026-02-10', plannedEnd: '2026-04-15' }),
    ])
    expect(janela).toEqual({ inicio: '2026-02-10', fim: '2026-04-15' })
  })

  it('prefere as datas do CPM às planejadas', () => {
    const janela = janelaDoCronograma([
      atividade({
        id: 'alvenaria',
        plannedStart: '2026-01-01',
        plannedEnd: '2026-01-10',
        earlyStart: '2026-02-01',
        earlyFinish: '2026-02-12',
      }),
    ])
    expect(janela).toEqual({ inicio: '2026-02-01', fim: '2026-02-12' })
  })
})

describe('janelaUnida', () => {
  it('cobre os dois cronogramas do split A|B', () => {
    expect(
      janelaUnida({ inicio: '2026-01-10', fim: '2026-05-01' }, { inicio: '2026-01-05', fim: '2026-04-01' }),
    ).toEqual({ inicio: '2026-01-05', fim: '2026-05-01' })
  })

  it('aceita um lado sem cronograma', () => {
    const so = { inicio: '2026-01-01', fim: '2026-02-01' }
    expect(janelaUnida(null, so)).toEqual(so)
    expect(janelaUnida(so, null)).toEqual(so)
    expect(janelaUnida(null, null)).toBeNull()
  })
})

describe('estadosNaData', () => {
  const cronograma = [
    atividade({
      id: 'fundacao',
      plannedStart: '2026-01-01',
      plannedEnd: '2026-01-10',
      elements: [{ globalId: 'SAPATA-1' }],
    }),
    atividade({
      id: 'alvenaria',
      plannedStart: '2026-02-01',
      plannedEnd: '2026-02-20',
      elements: [{ globalId: 'PAREDE-1' }, { globalId: 'PAREDE-2' }],
    }),
  ]

  it('antes do início: não iniciado', () => {
    expect(estadosNaData(cronograma, '2026-01-05').get('PAREDE-1')).toBe('nao_iniciado')
  })

  it('dentro do intervalo: em obra, inclusive no primeiro e no último dia', () => {
    expect(estadosNaData(cronograma, '2026-02-01').get('PAREDE-1')).toBe('ativo')
    expect(estadosNaData(cronograma, '2026-02-10').get('PAREDE-2')).toBe('ativo')
    expect(estadosNaData(cronograma, '2026-02-20').get('PAREDE-1')).toBe('ativo')
  })

  it('depois do fim: concluído', () => {
    expect(estadosNaData(cronograma, '2026-03-01').get('SAPATA-1')).toBe('concluido')
  })

  it('elemento em duas atividades: o que está em obra agora manda', () => {
    const reforma = [
      atividade({
        id: 'demolir',
        plannedStart: '2026-01-01',
        plannedEnd: '2026-01-05',
        elements: [{ globalId: 'PAREDE-1' }],
      }),
      atividade({
        id: 'reconstruir',
        plannedStart: '2026-01-04',
        plannedEnd: '2026-01-20',
        elements: [{ globalId: 'PAREDE-1' }],
      }),
    ]
    // 04/01 cai nas duas: uma terminando, outra começando.
    expect(estadosNaData(reforma, '2026-01-04').get('PAREDE-1')).toBe('ativo')
    // 10/01: a primeira acabou, a segunda ainda corre.
    expect(estadosNaData(reforma, '2026-01-10').get('PAREDE-1')).toBe('ativo')
    // 25/01: as duas acabaram.
    expect(estadosNaData(reforma, '2026-01-25').get('PAREDE-1')).toBe('concluido')
  })

  it('concluído em uma atividade ganha de não iniciado em outra', () => {
    const misto = [
      atividade({ id: 'a', plannedStart: '2026-01-01', plannedEnd: '2026-01-05', elements: [{ globalId: 'X' }] }),
      atividade({ id: 'b', plannedStart: '2026-06-01', plannedEnd: '2026-06-10', elements: [{ globalId: 'X' }] }),
    ]
    expect(estadosNaData(misto, '2026-03-01').get('X')).toBe('concluido')
  })

  it('elemento sem vínculo não entra no mapa: fica visível como estava', () => {
    expect(estadosNaData(cronograma, '2026-02-10').has('TELHADO-9')).toBe(false)
  })

  it('usa as datas do CPM quando o backend as calculou', () => {
    const comCpm = [
      atividade({
        id: 'laje',
        plannedStart: '2026-01-01',
        plannedEnd: '2026-01-10',
        earlyStart: '2026-03-01',
        earlyFinish: '2026-03-15',
        elements: [{ globalId: 'LAJE-1' }],
      }),
    ]
    // Pela data planejada já teria acabado; o CPM empurrou por causa da predecessora.
    expect(estadosNaData(comCpm, '2026-02-01').get('LAJE-1')).toBe('nao_iniciado')
    expect(estadosNaData(comCpm, '2026-03-10').get('LAJE-1')).toBe('ativo')
  })

  it('trata as datas em UTC: o dia não escorrega no fuso do Brasil', () => {
    const umDia = [
      atividade({
        id: 'concretagem',
        plannedStart: '2026-01-15',
        plannedEnd: '2026-01-15',
        elements: [{ globalId: 'LAJE-1' }],
      }),
    ]
    expect(estadosNaData(umDia, '2026-01-14').get('LAJE-1')).toBe('nao_iniciado')
    expect(estadosNaData(umDia, '2026-01-15').get('LAJE-1')).toBe('ativo')
    expect(estadosNaData(umDia, '2026-01-16').get('LAJE-1')).toBe('concluido')
  })

  it('fim antes do início (dado sujo) vira um dia só, em vez de sumir', () => {
    const invertida = [
      atividade({
        id: 'errada',
        plannedStart: '2026-05-10',
        plannedEnd: '2026-05-01',
        elements: [{ globalId: 'Y' }],
      }),
    ]
    expect(estadosNaData(invertida, '2026-05-10').get('Y')).toBe('ativo')
    expect(estadosNaData(invertida, '2026-05-11').get('Y')).toBe('concluido')
  })
})

describe('resumirEstados', () => {
  it('conta por estado para o rótulo da régua', () => {
    const estados = estadosNaData(
      [
        atividade({
          id: 'a',
          plannedStart: '2026-01-01',
          plannedEnd: '2026-01-10',
          elements: [{ globalId: 'X' }],
        }),
        atividade({
          id: 'b',
          plannedStart: '2026-02-01',
          plannedEnd: '2026-02-10',
          elements: [{ globalId: 'Y' }],
        }),
        atividade({
          id: 'c',
          plannedStart: '2026-03-01',
          plannedEnd: '2026-03-10',
          elements: [{ globalId: 'Z' }],
        }),
      ],
      '2026-02-05',
    )
    expect(resumirEstados(estados)).toEqual({ concluido: 1, ativo: 1, naoIniciado: 1 })
  })
})

describe('atividadesNaData', () => {
  it('lista o que está em obra na data', () => {
    const emObra = atividadesNaData(
      [
        atividade({ id: 'a', plannedStart: '2026-01-01', plannedEnd: '2026-01-10' }),
        atividade({ id: 'b', plannedStart: '2026-01-08', plannedEnd: '2026-01-20' }),
        atividade({ id: 'c', plannedStart: '2026-02-01', plannedEnd: '2026-02-10' }),
      ],
      '2026-01-09',
    )
    expect(emObra.map((a) => a.id)).toEqual(['a', 'b'])
  })
})
