import {StrictMode} from 'react'
import {render,screen} from '@testing-library/react'
import {MemoryRouter,Route,Routes,useLocation} from 'react-router-dom'
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import OAuthCallbackPage from '../OAuthCallbackPage'
beforeEach(()=>{localStorage.clear();sessionStorage.clear()})
afterEach(()=>{vi.unstubAllGlobals();window.history.replaceState({},'','/')})
function Destination(){return <p>Página retomada {useLocation().search}</p>}
function mount(){return render(<StrictMode><MemoryRouter initialEntries={['/oauth-callback']}><Routes><Route path="/oauth-callback" element={<OAuthCallbackPage/>}/><Route path="/orcamento" element={<Destination/>}/><Route path="/dashboard" element={<p>Dashboard indevido</p>}/></Routes></MemoryRouter></StrictMode>)}
it('consome retorno uma vez mesmo com StrictMode e retoma a página original',async()=>{
 sessionStorage.setItem('arxisvr_return_to','/orcamento?projeto=p')
 const hash=new URLSearchParams({token:'synthetic-callback-test',user:JSON.stringify({name:'Teste',email:'test@example.test'})})
 window.history.replaceState({},'','/oauth-callback#'+hash.toString())
 mount()
 expect(await screen.findByText('Página retomada ?projeto=p',{},{timeout:3000})).toBeInTheDocument()
 expect(screen.queryByText('Dashboard indevido')).not.toBeInTheDocument()
 expect(sessionStorage.getItem('arxisvr_return_to')).toBeNull()
})
it('mantém erro no callback rejeitado sem criar um ciclo automático de login',async()=>{
 window.history.replaceState({},'','/oauth-callback#token=rejected-synthetic-test')
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:401})))
 mount()
 expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível confirmar a sessão')
 expect(localStorage.getItem('arxisvr_token')).toBeNull()
})
