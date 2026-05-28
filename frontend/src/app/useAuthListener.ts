// Hook/utilitário para escutar mudanças de autenticação e atualizar UI
import { useEffect, useState } from 'react';
import { authService, AuthService } from '../services/authService';

export function useAuthListener() {
  const [user, setUser] = useState(authService.getUser());
  useEffect(() => {
    authService.onAuthChange(setUser);
  }, []);
  return user;
}
