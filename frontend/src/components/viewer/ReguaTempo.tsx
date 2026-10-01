import { ReactNode, useEffect, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { diferencaEmDias, formatarDataUtc, paraDataUtc, somarDias, type Janela } from './estado4d'

interface ReguaTempoProps {
  janela: Janela
  data: string
  onChange: (data: string) => void
  /** Ligado toca sozinho, um passo por tique. Controlado pela tela. */
  tocando: boolean
  onTocandoChange: (tocando: boolean) => void
  /** Dias por tique: 1 para obra curta, mais para cronograma longo. */
  velocidade: number
  onVelocidadeChange: (velocidade: number) => void
  /** O que aparece à direita: contagem por estado, delta de prazo... */
  resumo?: ReactNode
}

const TIQUE_MS = 220

/**
 * Régua de tempo do 4D (S26): a data que decide como o modelo aparece.
 *
 * O órfão `src/timeline/TimelineSlider.ts` fazia isto com DOM manual e CSS
 * inline, como o `CameraSync` que o S18 aproveitou. A lógica (tocar, velocidade
 * em dias por tique, parar no fim) veio de lá; a montagem é React, como o resto
 * do viewer vivo.
 *
 * O slider anda em **dias inteiros**: é a granularidade das datas do cronograma
 * (colunas `date`), e meio dia não muda nada na tela.
 */
export default function ReguaTempo({
  janela,
  data,
  onChange,
  tocando,
  onTocandoChange,
  velocidade,
  onVelocidadeChange,
  resumo,
}: ReguaTempoProps) {
  const { inicio, fim, totalDias, diaAtual } = useMemo(() => {
    const inicioData = paraDataUtc(janela.inicio)
    const fimData = paraDataUtc(janela.fim)
    const total = Math.max(diferencaEmDias(fimData, inicioData), 0)
    const atual = Math.min(Math.max(diferencaEmDias(paraDataUtc(data), inicioData), 0), total)
    return { inicio: inicioData, fim: fimData, totalDias: total, diaAtual: atual }
  }, [janela.inicio, janela.fim, data])

  const irPara = (dia: number) => {
    const limitado = Math.min(Math.max(dia, 0), totalDias)
    onChange(formatarDataUtc(somarDias(inicio, limitado)))
  }

  // O tique precisa do dia corrente sem reiniciar o intervalo a cada frame:
  // recriar o setInterval a cada mudança de data faria a reprodução gaguejar.
  const diaRef = useRef(diaAtual)
  diaRef.current = diaAtual

  useEffect(() => {
    if (!tocando) return
    const tique = setInterval(() => {
      const proximo = diaRef.current + velocidade
      if (proximo >= totalDias) {
        // Chegou ao fim da obra: para no último dia em vez de voltar ao começo.
        onChange(formatarDataUtc(fim))
        onTocandoChange(false)
        return
      }
      onChange(formatarDataUtc(somarDias(inicio, proximo)))
    }, TIQUE_MS)
    return () => clearInterval(tique)
    // `inicio`/`fim` são derivados da janela e só mudam junto com ela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tocando, velocidade, totalDias, janela.inicio, janela.fim])

  const legivel = paraDataUtc(data).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="regua-tempo" role="group" aria-label="Régua de tempo do cronograma">
      <button
        className="regua-tempo__botao"
        type="button"
        onClick={() => onTocandoChange(!tocando)}
        aria-label={tocando ? 'Pausar' : 'Reproduzir'}
        title={tocando ? 'Pausar' : 'Reproduzir'}
      >
        {tocando ? <Pause size={17} strokeWidth={1.6} /> : <Play size={17} strokeWidth={1.6} />}
      </button>
      <button
        className="regua-tempo__botao"
        type="button"
        onClick={() => irPara(diaAtual - 1)}
        disabled={diaAtual <= 0}
        aria-label="Dia anterior"
        title="Dia anterior"
      >
        <ChevronLeft size={17} strokeWidth={1.6} />
      </button>

      <div className="regua-tempo__trilho">
        <input
          type="range"
          min={0}
          max={totalDias}
          step={1}
          value={diaAtual}
          onChange={(evento) => irPara(Number(evento.target.value))}
          aria-label="Data do cronograma"
          aria-valuetext={legivel}
        />
        <span className="regua-tempo__data">{legivel}</span>
      </div>

      <button
        className="regua-tempo__botao"
        type="button"
        onClick={() => irPara(diaAtual + 1)}
        disabled={diaAtual >= totalDias}
        aria-label="Próximo dia"
        title="Próximo dia"
      >
        <ChevronRight size={17} strokeWidth={1.6} />
      </button>

      <select
        className="regua-tempo__velocidade"
        value={velocidade}
        onChange={(evento) => onVelocidadeChange(Number(evento.target.value))}
        aria-label="Velocidade da reprodução"
      >
        <option value={1}>1 dia/passo</option>
        <option value={7}>1 semana/passo</option>
        <option value={30}>1 mês/passo</option>
      </select>

      {resumo && <div className="regua-tempo__resumo">{resumo}</div>}
    </div>
  )
}
