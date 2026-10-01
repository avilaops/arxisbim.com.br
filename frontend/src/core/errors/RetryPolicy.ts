/**
 * RetryPolicy - Política de retry com exponential backoff
 * Padrão usado por AWS SDK, Google Cloud, Mercado Pago, etc
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors?: (error: any) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

/**
 * Retry policy com exponential backoff e jitter
 */
export class RetryPolicy {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000, // 1s
    maxDelay: 30000, // 30s
    backoffMultiplier: 2,
    jitter: true
  };

  /**
   * Execute function with retry policy
   */
  public static async execute<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const finalConfig: RetryConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: any;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${finalConfig.maxAttempts}`);
        
        const data = await fn();
        
        return {
          success: true,
          data,
          attempts: attempt,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (finalConfig.retryableErrors && !finalConfig.retryableErrors(error)) {
          console.log('❌ Error is not retryable');
          break;
        }

        if (attempt < finalConfig.maxAttempts) {
          const delay = this.calculateDelay(
            attempt,
            finalConfig.initialDelay,
            finalConfig.maxDelay,
            finalConfig.backoffMultiplier,
            finalConfig.jitter
          );
          
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.delay(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   */
  private static calculateDelay(
    attempt: number,
    initialDelay: number,
    maxDelay: number,
    multiplier: number,
    jitter: boolean
  ): number {
    // Exponential backoff: initialDelay * (multiplier ^ (attempt - 1))
    let delay = initialDelay * Math.pow(multiplier, attempt - 1);

    // Cap at maxDelay
    delay = Math.min(delay, maxDelay);

    // Add jitter to prevent thundering herd
    if (jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * Helper: delay promise
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create retry config for network errors
   */
  public static networkRetryConfig(): Partial<RetryConfig> {
    return {
      maxAttempts: 5,
      initialDelay: 2000,
      maxDelay: 60000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: (error) => {
        // Retry on network errors, timeouts, 5xx errors
        if (error instanceof TypeError) return true; // Network error
        if (error.name === 'NetworkError') return true;
        if (error.code === 'ECONNREFUSED') return true;
        if (error.status >= 500) return true;
        return false;
      }
    };
  }

  /**
   * Create retry config for WebSocket
   */
  public static websocketRetryConfig(): Partial<RetryConfig> {
    return {
      maxAttempts: 10,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 1.5,
      jitter: true
    };
  }

  /**
   * Create retry config for file operations
   */
  public static fileRetryConfig(): Partial<RetryConfig> {
    return {
      maxAttempts: 3,
      initialDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitter: false
    };
  }
}
