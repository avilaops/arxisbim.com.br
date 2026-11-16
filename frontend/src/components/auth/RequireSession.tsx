import {useEffect} from 'react'
import {Outlet,useLocation} from 'react-router-dom'
import {isAuthenticated} from '@/core/auth/session'
import {redirectToLogin} from '@/core/auth/session-redirect'

export default function RequireSession(){
  const {pathname,search}=useLocation()
  const authenticated=isAuthenticated()
  useEffect(()=>{
    if(!authenticated)redirectToLogin(pathname+search)
  },[authenticated,pathname,search])
  if(!authenticated)return <div className="arx-carregando" role="status">Redirecionando para o login oficial…</div>
  return <Outlet/>
}
