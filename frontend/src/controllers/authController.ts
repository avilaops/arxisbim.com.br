// AuthController: orquestra lógica de autenticação
import { AuthService } from '../services/authService';
import { emit } from '../core/eventBus';

export class AuthController {
  constructor(private authService: AuthService) {}


  async login(email: string, password: string) {
    console.log('[AuthController] login chamado', { email });
    const user = await this.authService.login(email, password);
    emit('auth:changed', user);
    emit('event:log', { type: 'login', user, timestamp: Date.now() });
    console.log('[AuthController] login bem-sucedido', { user });
    return user;
  }

  logout() {
    console.log('[AuthController] logout chamado');
    this.authService.logout();
    emit('auth:changed', null);
    emit('event:log', { type: 'logout', timestamp: Date.now() });
    console.log('[AuthController] logout emitido');
  }
}
