declare module '@avilaops/email' {
  export class EmailService {
    constructor(appName: string);
    initialize(): Promise<void>;
    sendEmailVerification(to: string, name: string, code: string, url: string, expiresIn: string): Promise<void>;
    sendPasswordReset(to: string, name: string, url: string, expiresIn: string): Promise<void>;
    sendWelcome(to: string, name: string, url: string): Promise<void>;
    sendEmail(message: { to: string; subject: string; html: string }): Promise<void>;
  }
}
