import * as fs from 'fs';

export class EKSClient {
  private isK8s: boolean = false;
  private token: string = '';
  private caCert: string = '';
  private apiServerUrl: string = 'https://kubernetes.default.svc';

  constructor() {
    this.detectEnvironment();
  }

  private detectEnvironment(): void {
    const tokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';
    const certPath = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt';

    if (fs.existsSync(tokenPath) && fs.existsSync(certPath)) {
      this.isK8s = true;
      this.token = fs.readFileSync(tokenPath, 'utf8');
      this.caCert = fs.readFileSync(certPath, 'utf8');
      console.log('[EKSClient] Running inside Kubernetes cluster');
    } else {
      console.log('[EKSClient] Kubernetes context not found. Running in MOCK mode');
    }
  }

  public isMockMode(): boolean {
    return !this.isK8s;
  }

  public async request(
    method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
    path: string,
    body?: any
  ): Promise<any> {
    if (this.isMockMode()) {
      return { status: 'mock_success', mock: true, path, body };
    }

    const url = `${this.apiServerUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw new Error(`Kubernetes API error ${res.status}: ${await res.text()}`);
    }

    return res.json();
  }
}

export const eksClient = new EKSClient();
