import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {redirectToLogin,consumeReturnTo} from './session-redirect'
const replace=vi.fn()
beforeEach(async()=>{
 vi.resetModules();replace.mockClear();localStorage.clear();sessionStorage.clear()
 vi.stubGlobal('window',{location:{origin:'http://localhost:3000',pathname:'/orcamento',search:'?projeto=p&matriz=a,b',replace}})
 localStorage.setItem('arxisvr_token','synthetic');localStorage.setItem('arxisvr_user','{}');localStorage.setItem('arxisvr_refresh_token','private-synthetic')
})
afterEach(()=>vi.unstubAllGlobals())
describe('expiração da sessão',()=>{
 it('leva ao Auth oficial uma única vez e guarda o destino seguro',async()=>{
  const module=await import('./session-redirect')
  module.redirectToLogin();module.redirectToLogin()
  expect(replace).toHaveBeenCalledTimes(1)
  expect(replace.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/avilaops$/)
  expect(localStorage.getItem('arxisvr_token')).toBeNull()
  expect(localStorage.getItem('arxisvr_user')).toBeNull()
  expect(localStorage.getItem('arxisvr_refresh_token')).toBeNull()
  expect(module.consumeReturnTo()).toBe('/orcamento?projeto=p&matriz=a,b')
  expect(module.consumeReturnTo()).toBe('/dashboard')
 })
 it('não aceita retorno externo, callback ou credenciais na URL',()=>{
  for(const unsafe of ['https://evil.example','//evil.example','/oauth-callback?token=secret','/login','/app/../../login','/app\\evil']){
   sessionStorage.setItem('arxisvr_return_to',unsafe);expect(consumeReturnTo()).toBe('/dashboard')
  }
  redirectToLogin('/planejamento?projeto=p&token=secret&refreshToken=secret')
  expect(consumeReturnTo()).toBe('/planejamento?projeto=p')
 })
 it('trata401 concorrentes e preserva403 como falta de permissão',async()=>{
  const module=await import('./session-redirect')
  vi.stubGlobal('fetch',vi.fn(async()=>({status:403})))
  await module.sessionFetch('/api');expect(replace).not.toHaveBeenCalled();expect(localStorage.getItem('arxisvr_token')).toBe('synthetic')
  vi.stubGlobal('fetch',vi.fn(async()=>({status:401})))
  await Promise.all([module.sessionFetch('/api'),module.sessionFetch('/api')])
  expect(replace).toHaveBeenCalledTimes(1)
 })
 it('não envia requisição sem token e não redireciona em falha de rede',async()=>{
  const module=await import('./session-redirect');const fetch=vi.fn().mockRejectedValue(new Error('Rede indisponível'));vi.stubGlobal('fetch',fetch)
  await expect(module.sessionFetch('/api')).rejects.toThrow('Rede indisponível');expect(replace).not.toHaveBeenCalled()
  localStorage.removeItem('arxisvr_token');await expect(module.sessionFetch('/api')).rejects.toMatchObject({status:401})
  expect(fetch).toHaveBeenCalledTimes(1);expect(replace).toHaveBeenCalledTimes(1)
 })
})
