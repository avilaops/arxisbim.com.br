import type { ReactNode, SVGProps } from 'react'

export type ArxisIconName =
  | 'home'
  | 'recent'
  | 'viewer'
  | 'compare'
  | 'account'
  | 'admin'
  | 'projects'
  | 'layers'
  | 'info'
  | 'upload'
  | 'reset'
  | 'fullscreen'
  | 'menu'
  | 'close'
  | 'support'

interface ArxisIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: ArxisIconName
  size?: number
}

/**
 * Iconografia proprietaria do Arxis: linhas técnicas, nós de coordenação e o
 * ângulo do símbolo A. O desenho continua leve em tamanhos pequenos e usa
 * currentColor para acompanhar estados ativos, hover e alto contraste.
 */
export default function ArxisIcon({ name, size = 18, ...props }: ArxisIconProps) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  const drawings: Record<ArxisIconName, ReactNode> = {
    home: <><path d="M3.5 10.5 12 3l8.5 7.5" {...common} /><path d="M5.5 9.5V20h13V9.5M9 20v-5h6v5" {...common} /><path d="m9.6 7.8 2.4-2.1 2.4 2.1" {...common} stroke="#f36b21" /></>,
    recent: <><circle cx="12" cy="12" r="8.5" {...common} /><path d="M12 7v5l3.4 2" {...common} /><path d="M5.8 5.8 4.5 4.5" {...common} stroke="#f36b21" /></>,
    viewer: <><path d="m12 2.8 8 4.6v9.2l-8 4.6-8-4.6V7.4l8-4.6Z" {...common} /><path d="M4.4 7.6 12 12l7.6-4.4M12 12v9" {...common} /><path d="m12 2.8 2.3 1.3" {...common} stroke="#f36b21" /></>,
    compare: <><path d="M5 5h5v5M19 19h-5v-5M10 5 5 10M14 19l5-5" {...common} /><path d="M5 14v5h5M19 10V5h-5" {...common} /><path d="m7.5 16.5 2-2" {...common} stroke="#f36b21" /></>,
    account: <><circle cx="12" cy="8" r="3.2" {...common} /><path d="M4.8 20c.8-3.4 3.2-5.1 7.2-5.1s6.4 1.7 7.2 5.1" {...common} /><path d="m17.5 4.5 1 1" {...common} stroke="#f36b21" /></>,
    admin: <><path d="m12 2.8 7.3 2.8v5.6c0 4.2-2.4 7.8-7.3 9.9-4.9-2.1-7.3-5.7-7.3-9.9V5.6L12 2.8Z" {...common} /><path d="m8.2 11.8 2.4 2.4 5.2-5.2" {...common} /><path d="m12 2.8 2.1.8" {...common} stroke="#f36b21" /></>,
    projects: <><path d="M3.5 7.5h6l1.8 2h9.2v9.8H3.5V7.5Z" {...common} /><path d="M3.5 7.5V5h5l1.7 2.5" {...common} /><path d="M16.5 12.5v4M14.5 14.5h4" {...common} stroke="#f36b21" /></>,
    layers: <><path d="m12 3 8.2 4.4L12 11.8 3.8 7.4 12 3Z" {...common} /><path d="m4.5 11.2 7.5 4 7.5-4M4.5 15.1l7.5 4 7.5-4" {...common} /><path d="m12 3 2.2 1.2" {...common} stroke="#f36b21" /></>,
    info: <><circle cx="12" cy="12" r="8.5" {...common} /><path d="M12 10.5v5M12 7.5h.01" {...common} /><path d="m17.8 6.2 1 1" {...common} stroke="#f36b21" /></>,
    upload: <><path d="M12 15V4.5M8.5 8 12 4.5 15.5 8" {...common} /><path d="M5 13.5v5h14v-5" {...common} /><path d="M17 18.5h2v-5" {...common} stroke="#f36b21" /></>,
    reset: <><path d="M5 9a7.5 7.5 0 1 1-.1 6.5" {...common} /><path d="M5 4.5v4.8h4.8" {...common} /><path d="m5 4.5 1.5 1.2" {...common} stroke="#f36b21" /></>,
    fullscreen: <><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" {...common} /><path d="m4 4 2 2M20 4l-2 2" {...common} stroke="#f36b21" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" {...common} /><path d="M4 6h3" {...common} stroke="#f36b21" /></>,
    close: <><path d="m5 5 14 14M19 5 5 19" {...common} /><path d="m16.5 5 2.5 2.5" {...common} stroke="#f36b21" /></>,
    support: <><path d="M4 13v-1a8 8 0 0 1 16 0v1" {...common} /><path d="M4 13h3v5H5a1 1 0 0 1-1-1v-4ZM20 13h-3v5h2a1 1 0 0 0 1-1v-4Z" {...common} /><path d="M10 20h4" {...common} /><path d="m17.5 5.5 1 1" {...common} stroke="#f36b21" /></>,
  }

  return <svg {...props} data-arxis-icon={name} width={size} height={size} viewBox="0 0 24 24" aria-hidden={props['aria-label'] ? undefined : true}>{drawings[name]}</svg>
}
