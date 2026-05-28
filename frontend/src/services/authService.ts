// Interface e implementação base do AuthService
export interface AuthService {
  login(email: string, password: string): Promise<User | null>;
  logout(): void;
  getUser(): User | null;
  onAuthChange(callback: (user: User | null) => void): void;
}

type User = { id: string; email: string; name: string };

let currentUser: User | null = null;
const listeners: Array<(user: User | null) => void> = [];

export const authService: AuthService = {
  async login(email, password) {
    console.log('[authService] login attempt', { email });
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!resp.ok) {
      console.error('[authService] login failed', { email, status: resp.status });
      throw new Error('Falha no login');
    }
    const user = await resp.json();
    currentUser = user;
    listeners.forEach(cb => cb(currentUser));
    console.log('[authService] login success', { user });
    return currentUser;
  },
  logout() {
    console.log('[authService] logout', { user: currentUser });
    // Opcional: chamada à API de logout
    currentUser = null;
    listeners.forEach(cb => cb(null));
  },
  getUser() {
    return currentUser;
  },
  onAuthChange(cb) {
    listeners.push(cb);
  }
};
