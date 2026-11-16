import {render,screen} from '@testing-library/react'
import {MemoryRouter,Routes,Route} from 'react-router-dom'
import {beforeEach,it,expect,vi} from 'vitest'
import RequireSession from './RequireSession'
import {isAuthenticated} from '@/core/auth/session'
import {redirectToLogin} from '@/core/auth/session-redirect'
vi.mock('@/core/auth/session',()=>({isAuthenticated:vi.fn()}))
vi.mock('@/core/auth/session-redirect',()=>({redirectToLogin:vi.fn()}))
beforeEach(()=>vi.clearAllMocks())
function mount(){return render(<MemoryRouter initialEntries={['/orcamento?projeto=p']}><Routes><Route element={<RequireSession/>}><Route path="/orcamento" element={<p>Orçamento protegido</p>}/></Route></Routes></MemoryRouter>)}
it('redireciona sessão ausente/expirada sem montar conteúdo protegido',()=>{
 vi.mocked(isAuthenticated).mockReturnValue(false);mount()
 expect(screen.queryByText('Orçamento protegido')).not.toBeInTheDocument()
 expect(redirectToLogin).toHaveBeenCalledWith('/orcamento?projeto=p')
})
it('mantém navegação quando a sessão é válida',()=>{
 vi.mocked(isAuthenticated).mockReturnValue(true);mount()
 expect(screen.getByText('Orçamento protegido')).toBeInTheDocument()
 expect(redirectToLogin).not.toHaveBeenCalled()
})
