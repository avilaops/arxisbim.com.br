import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import BimWorkspace from '../BimWorkspace'

vi.mock('@/components/layout/AppShell',()=>({default:({children}:any)=><main>{children}</main>}))
beforeEach(()=>localStorage.setItem('arxisvr_token','synthetic-test-token'))
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear()})
const mount=()=>render(<MemoryRouter><BimWorkspace title="Orçamento 5D" description="Custos reais">{w=><p>{w.projectId} • {w.scenarioId} • {w.modelId}</p>}</BimWorkspace></MemoryRouter>)
describe('contexto compartilhado BIM',()=>{
 it('troca projeto e carrega somente seus cenários e modelos',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:any)=>{const url=new URL(String(input),'http://localhost');const p=url.pathname;const id=p.includes('/p2')?'p2':'p1';return {ok:true,json:async()=>p.endsWith('/projects')?{items:[{id:'p1',name:'Torre A'},{id:'p2',name:'Torre B'}]}:p.includes('/ifc/project/')?[{id:'m-'+id,originalName:id+'.ifc'}]:[{id:'s-'+id,name:'Cenário '+id}]}}))
  mount();await screen.findByText('p1 • s-p1 • m-p1')
  fireEvent.change(screen.getByLabelText('Projeto'),{target:{value:'p2'}})
  await screen.findByText('p2 • s-p2 • m-p2')
  expect(localStorage.getItem('arxisvr_project_id')).toBe('p2')
  expect(screen.queryByRole('option',{name:'Cenário p1'})).not.toBeInTheDocument()
 })
 it('explica quando ainda não há projetos sem inventar modelos',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({items:[]})})))
  mount();await screen.findByText('Comece pelo seu projeto BIM')
  expect(screen.getByRole('link',{name:'Criar projeto e enviar IFC'})).toHaveAttribute('href','/app')
 })
 it('mostra falha da API em vez de apresentar dados vazios como sucesso',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:503,json:async()=>({error:'Serviço temporariamente indisponível'})})))
  mount();await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Serviço temporariamente indisponível'))
 })
})
