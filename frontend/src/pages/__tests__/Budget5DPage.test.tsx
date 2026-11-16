import {render,screen,fireEvent,waitFor} from '@testing-library/react'
import {beforeEach,describe,it,expect,vi} from 'vitest'
import Budget5DPage from '../Budget5DPage'
import {bimCosts} from '@/services/bim-costs.service'
vi.mock('@/components/bim/FinancialMatrix',()=>({default:()=> <h2>Matriz de teste</h2>}))
import {schedulesService} from '@/services/schedules.service'
vi.mock('@/services/schedules.service',()=>({schedulesService:{doCenario:vi.fn()}}))
vi.mock('@/services/bim-costs.service',async importOriginal=>({...await importOriginal<any>(),bimCosts:{quantities:vi.fn(),tables:vi.fn(),calculation:vi.fn(),items:vi.fn(),prepare:vi.fn(),createTable:vi.fn(),createItem:vi.fn(),priceCategory:vi.fn(),recalculate:vi.fn()}}))
vi.mock('@/components/bim/BimWorkspace',()=>({default:({children}:any)=>children({projectId:'project',scenarioId:'scenario',modelId:'model',models:[{id:'model',originalName:'A.ifc'},{id:'other-model',originalName:'B.ifc'}],project:{id:'project',name:'Torre'},scenario:{id:'scenario',name:'Base'},scenarios:[{id:'scenario',name:'Base'},{id:'other',name:'Alternativa'}]})}))
beforeEach(()=>{
 vi.clearAllMocks()
 vi.mocked(bimCosts.quantities).mockResolvedValue({items:[],total:0,categories:[]})
 vi.mocked(bimCosts.tables).mockResolvedValue([])
 vi.mocked(bimCosts.calculation).mockResolvedValue({scenario_id:'scenario',total_cost:'0.00',element_count:0,elements:[],breakdown:{by_type:{}}})
 vi.mocked(bimCosts.items).mockResolvedValue([])
})
describe('Orçamento 5D',()=>{
 it('aguarda a carga inicial antes de oferecer a matriz para evitar descartar uma comparação em andamento',async()=>{
  let resolve!: (value:any)=>void
  vi.mocked(bimCosts.calculation).mockReturnValue(new Promise(done=>{resolve=done}))
  render(<Budget5DPage/>);await screen.findByRole('button',{name:'Preparar quantitativos do IFC'})
  expect(screen.queryByRole('heading',{name:'Matriz de teste'})).not.toBeInTheDocument()
  resolve({scenario_id:'scenario',total_cost:'0.00',element_count:0,elements:[],breakdown:{by_type:{}}})
  expect(await screen.findByRole('heading',{name:'Matriz de teste'})).toBeInTheDocument()
 })
 it('identifica origem divergente e impede aplicar preço ao IFC diferente',async()=>{
  vi.mocked(bimCosts.quantities).mockResolvedValue({items:[],total:1,categories:[{ifcType:'IFCWALL',elementCount:1,areaM2:'10',volumeM3:null,lengthM:null}],modelVersionId:'v2',ifcModelId:'other-model'})
  vi.mocked(bimCosts.tables).mockResolvedValue([{id:'table',project_id:'project',scenario_id:'scenario',name:'Tabela base'}])
  vi.mocked(bimCosts.items).mockResolvedValue([{id:'item',cost_table_id:'table',description:'Alvenaria',unit:'m²',unit_price:'10'}])
  render(<Budget5DPage/>);
  expect(await screen.findByText(/quantitativos pertencem a B.ifc/)).toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Aplicar preço à categoria'})).toBeDisabled()
 })
 it('não recomenda prazo quando um cenário não possui cronograma',async()=>{
  vi.mocked(bimCosts.calculation).mockResolvedValue({scenario_id:'scenario',total_cost:'100',element_count:1,elements:[],breakdown:{by_type:{}}})
  vi.mocked(schedulesService.doCenario).mockResolvedValue(null)
  render(<Budget5DPage/>);await screen.findByRole('button',{name:'Comparar custo e prazo'})
  fireEvent.change(screen.getByLabelText('Comparar com'),{target:{value:'other'}})
  fireEvent.click(screen.getByRole('button',{name:'Comparar custo e prazo'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('Os dois cenários precisam de cronograma com atividades')
 })
 it('prepara o IFC selecionado no cenário antes de anunciar quantitativos',async()=>{
  vi.mocked(bimCosts.prepare).mockResolvedValue({modelVersionId:'version',status:'ready',elementCount:82,quantitiesCount:55})
  render(<Budget5DPage/>);await screen.findByRole('button',{name:'Preparar quantitativos do IFC'})
  fireEvent.click(screen.getByRole('button',{name:'Preparar quantitativos do IFC'}))
  await waitFor(()=>expect(bimCosts.prepare).toHaveBeenCalledWith('model','scenario'))
  await screen.findByText(/82 elementos preparados/)
  expect(screen.getByText('Sem preços vinculados')).toBeInTheDocument()
 })
 it('cria tabela de preços explicitamente associada ao cenário',async()=>{
  vi.mocked(bimCosts.createTable).mockResolvedValue({id:'table',project_id:'project',scenario_id:'scenario',name:'Tabela base'})
  render(<Budget5DPage/>);await screen.findByRole('button',{name:'Criar tabela de preços'})
  fireEvent.change(screen.getByLabelText('Nome da tabela'),{target:{value:'Tabela base'}})
  fireEvent.click(screen.getByRole('button',{name:'Criar tabela de preços'}))
  await waitFor(()=>expect(bimCosts.createTable).toHaveBeenCalledWith('project','scenario','Tabela base'))
 })
 it('cadastra preço decimal em texto sem arredondamento no navegador',async()=>{
  vi.mocked(bimCosts.tables).mockResolvedValue([{id:'table',project_id:'project',scenario_id:'scenario',name:'Tabela base'}])
  vi.mocked(bimCosts.createItem).mockResolvedValue({id:'item',cost_table_id:'table',description:'Alvenaria',unit:'m²',unit_price:'125.50'})
  render(<Budget5DPage/>);await screen.findByRole('button',{name:'Adicionar item de custo'})
  fireEvent.change(screen.getByLabelText('Descrição do serviço'),{target:{value:'Alvenaria'}})
  fireEvent.change(screen.getByLabelText('Preço unitário (R$)'),{target:{value:'125,50'}})
  fireEvent.click(screen.getByRole('button',{name:'Adicionar item de custo'}))
  await waitFor(()=>expect(bimCosts.createItem).toHaveBeenCalledWith('table',expect.objectContaining({description:'Alvenaria',unit_price:'125.50'})))
 })
})
