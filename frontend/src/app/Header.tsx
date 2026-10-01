// Header: Cabeçalho do app

import { AuthController } from '../controllers/authController';
import { authService } from '../services/authService';
import { emit } from '../core/eventBus.simple';
import { useAuthListener } from './useAuthListener';

const authController = new AuthController(authService);

export default function Header() {
  // Exemplo: login rápido ao clicar no botão de usuário
  const user = useAuthListener();
  const handleLogin = async () => {
    const email = prompt('E-mail:') || '';
    const password = prompt('Senha:') || '';
    if (!email || !password) return;
    await authController.login(email, password);
    emit('user:login', { email });
    alert('Login realizado!');
  };
  return (
    <header className="header">
      <div className="header__left">
        <div className="header__logo">Arxis</div>
        <nav className="header__nav">
          <button className="nav-button active" data-view="viewer">
            <span className="nav-button__code">3D</span> Workspace
          </button>
          <button className="nav-button" data-view="ifc">
            <span className="nav-button__code">IFC</span> Modelos
          </button>
          <button className="nav-button" data-view="bim4d">
            <span className="nav-button__code">4D</span> Planejamento
          </button>
          <button className="nav-button" data-view="ar">
            <span className="nav-button__code">XR</span> Imersivo
          </button>
        </nav>
      </div>
      <div className="header__actions">
        <button className="icon-button" title="Notificações">NO</button>
        <button className="icon-button" title="Configurações">CFG</button>
        <button className="icon-button" title="Usuário" onClick={handleLogin}>
          {user ? user.name : 'US'}
        </button>
      </div>
    </header>
  );
}
