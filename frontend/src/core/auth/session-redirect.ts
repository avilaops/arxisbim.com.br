import {buildApiV1Url} from '@/config/apiBaseUrl'
import {clearSession,getToken} from './session'

export const RETURN_TO_KEY='arxisvr_return_to'
let redirectPending=false
function safeReturnTo(value:string):string{
  try{
    if(!value.startsWith('/')||value.startsWith('//')||decodeURIComponent(value).includes('\\')||value.length>4096)return '/dashboard'
    const url=new URL(value,window.location.origin)
    if(url.origin!==window.location.origin||!/^\/(dashboard|app(?:\/compare)?|planejamento|orcamento|account|admin)$/.test(url.pathname))return '/dashboard'
    for(const key of [...url.searchParams.keys()])if(['token','accesstoken','access_token','refreshtoken','refresh_token','id_token','code','state','user'].includes(key.toLowerCase()))url.searchParams.delete(key)
    return url.pathname+url.search
  }catch{return '/dashboard'}
}

/** A full-page OIDC entry clears the rejected session and coalesces concurrent401s. */
export function redirectToLogin(returnTo=window.location.pathname+window.location.search):void{
  if(redirectPending)return
  redirectPending=true
  try{sessionStorage.setItem(RETURN_TO_KEY,safeReturnTo(returnTo))}catch{/* Return to dashboard if storage is unavailable. */}
  clearSession()
  window.location.replace(buildApiV1Url('/auth/avilaops'))
}
export function consumeReturnTo():string{
  let saved:string|null=null
  try{saved=sessionStorage.getItem(RETURN_TO_KEY);sessionStorage.removeItem(RETURN_TO_KEY)}catch{/* Optional navigation state. */}
  return safeReturnTo(saved||'/dashboard')
}

/** Shared by protected JSON, multipart and download requests;403/network errors stay local. */
export async function sessionFetch(input:RequestInfo|URL,init:RequestInit={}):Promise<Response>{
  const token=getToken()
  if(!token){redirectToLogin();throw Object.assign(new Error('Redirecionando para o login oficial.'),{status:401})}
  const headers=new Headers(input instanceof Request?input.headers:undefined)
  new Headers(init.headers).forEach((value,key)=>headers.set(key,value))
  if(!headers.has('Authorization'))headers.set('Authorization',`Bearer ${token}`)
  const response=await fetch(input,{...init,headers})
  if(response.status===401&&getToken()===token)redirectToLogin()
  return response
}
