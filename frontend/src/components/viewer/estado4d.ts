/**
 * Estado 4D: que cara cada elemento do modelo tem numa data.
 *
 * É a fatia pura do S26 — sem three, sem DOM, sem rede — para poder ser testada
 * e reaproveitada nos dois lugares que precisam dela: o viewer com a régua de
 * tempo e cada lado do split A|B da comparação temporal.
 *
 * A regra vem do órfão `src/timeline/ElementStateResolver.ts`, que já lia a
 * rota de comparação: elemento sem vínculo com atividade nenhuma conta como
 * **concluído** (fica visível). O contrário esconderia o modelo inteiro assim
 * que alguém criasse a primeira atividade, e o cronograma serve para destacar o
 * que está em obra, não para apagar o que não foi cadastrado.
 *
 * As datas chegam do backend como `YYYY-MM-DD` (coluna `date` do Postgres) e
 * são tratadas em UTC, como no `cpm.service.ts`. Fuso local aqui erraria um dia
 * para quem está a oeste de Greenwich — o Brasil inteiro.
 */
import type { Atividade } from '@/services/schedules.service'

export type Estado4d = 'nao_iniciado' | 'ativo' | 'concluido'

export interface Janela {
  inicio: string
  fim: string
}

export function paraDataUtc(valor: string | Date): Date {
  if (valor instanceof Date) return valor
  const [ano, mes, dia] = String(valor).split('T')[0].split('-').map(Number)
  return new Date(Date.UTC(ano, (mes || 1) - 1, dia || 1))
}

export function formatarDataUtc(data: Date): string {
  return data.toISOString().slice(0, 10)
}

export function somarDias(data: Date, dias: number): Date {
  const saida = new Date(data.getTime())
  saida.setUTCDate(saida.getUTCDate() + dias)
  return saida
}

export function diferencaEmDias(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

/** Data em português, curta, para rótulo de régua e de painel. */
export function dataLegivel(valor: string | Date): string {
  const data = paraDataUtc(valor)
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

/** Início e fim de uma atividade, preferindo o que o CPM calculou. */
function intervalo(atividade: Atividade): { inicio: Date; fim: Date } {
  const inicio = paraDataUtc(atividade.earlyStart || atividade.plannedStart)
  const fim = paraDataUtc(atividade.earlyFinish || atividade.plannedEnd)
  // Fim antes do início é dado sujo (importação, digitação): trata como um dia.
  return fim.getTime() < inicio.getTime() ? { inicio, fim: inicio } : { inicio, fim }
}

/** Primeira e última data do cronograma, ou null quando não há atividade. */
export function janelaDoCronograma(atividades: Atividade[]): Janela | null {
  if (!atividades.length) return null
  let menor = Infinity
  let maior = -Infinity
  for (const atividade of atividades) {
    const { inicio, fim } = intervalo(atividade)
    menor = Math.min(menor, inicio.getTime())
    maior = Math.max(maior, fim.getTime())
  }
  if (!Number.isFinite(menor) || !Number.isFinite(maior)) return null
  return { inicio: formatarDataUtc(new Date(menor)), fim: formatarDataUtc(new Date(maior)) }
}

/** Janela que cobre os dois cronogramas (a régua do split A|B é uma só). */
export function janelaUnida(a: Janela | null, b: Janela | null): Janela | null {
  if (!a) return b
  if (!b) return a
  return {
    inicio: paraDataUtc(a.inicio) <= paraDataUtc(b.inicio) ? a.inicio : b.inicio,
    fim: paraDataUtc(a.fim) >= paraDataUtc(b.fim) ? a.fim : b.fim,
  }
}

/**
 * Estado de cada GlobalId vinculado, na data pedida.
 *
 * Um elemento pode estar em mais de uma atividade (demolir e reconstruir a
 * mesma parede). A ordem de prioridade é `ativo` > `concluido` > `nao_iniciado`:
 * se alguma atividade mexe nele agora, é isso que interessa ver.
 */
export function estadosNaData(atividades: Atividade[], data: string | Date): Map<string, Estado4d> {
  const instante = paraDataUtc(data).getTime()
  const estados = new Map<string, Estado4d>()

  for (const atividade of atividades) {
    const elementos = atividade.elements ?? []
    if (!elementos.length) continue

    const { inicio, fim } = intervalo(atividade)
    const estado: Estado4d =
      instante < inicio.getTime() ? 'nao_iniciado' : instante > fim.getTime() ? 'concluido' : 'ativo'

    for (const elemento of elementos) {
      const globalId = String(elemento.globalId ?? '').trim()
      if (!globalId) continue
      const anterior = estados.get(globalId)
      if (anterior === 'ativo') continue
      if (anterior === 'concluido' && estado === 'nao_iniciado') continue
      estados.set(globalId, estado)
    }
  }

  return estados
}

export interface ResumoEstados {
  naoIniciado: number
  ativo: number
  concluido: number
}

/** Quantos elementos vinculados estão em cada estado (rótulo da régua). */
export function resumirEstados(estados: Map<string, Estado4d>): ResumoEstados {
  const resumo: ResumoEstados = { naoIniciado: 0, ativo: 0, concluido: 0 }
  for (const estado of estados.values()) {
    if (estado === 'ativo') resumo.ativo += 1
    else if (estado === 'concluido') resumo.concluido += 1
    else resumo.naoIniciado += 1
  }
  return resumo
}

/** Atividades acontecendo na data (o que a régua mostra como "em obra"). */
export function atividadesNaData(atividades: Atividade[], data: string | Date): Atividade[] {
  const instante = paraDataUtc(data).getTime()
  return atividades.filter((atividade) => {
    const { inicio, fim } = intervalo(atividade)
    return instante >= inicio.getTime() && instante <= fim.getTime()
  })
}
