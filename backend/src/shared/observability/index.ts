import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import * as Sentry from '@sentry/node';

let telemetrySdk: NodeSDK | undefined;

const SENSITIVE_KEY = /authorization|cookie|password|secret|token|api[-_]?key|dsn/i;

function stripUrlQuery(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    const url = new URL(value, 'http://localhost');
    url.search = '';
    url.hash = '';
    return value.startsWith('http') ? url.toString() : `${url.pathname}`;
  } catch {
    return value.split('?')[0].split('#')[0];
  }
}

function redactRecord(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redactRecord(item, depth + 1));
  if (typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[Filtered]' : redactRecord(item, depth + 1),
    ]),
  );
}

function sanitizeEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    event.request.url = stripUrlQuery(event.request.url) as string | undefined;
    event.request.headers = redactRecord(event.request.headers) as Record<string, string> | undefined;
    event.request.query_string = undefined;
  }

  event.extra = redactRecord(event.extra) as Sentry.Event['extra'];
  event.contexts = redactRecord(event.contexts) as Sentry.Event['contexts'];
  event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
    ...breadcrumb,
    message: SENSITIVE_KEY.test(breadcrumb.message || '') ? '[Filtered]' : breadcrumb.message,
    data: redactRecord({
      ...breadcrumb.data,
      url: stripUrlQuery(breadcrumb.data?.url),
      body: undefined,
      requestBody: undefined,
      responseBody: undefined,
    }) as Record<string, unknown>,
  }));

  return event;
}

function getRelease(): string | undefined {
  const commit = process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA;
  return commit ? `arxisvr-backend@${commit}` : undefined;
}

export function setupObservability(): void {
  // =====================================
  // SENTRY
  // =====================================
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: getRelease(),
      sendDefaultPii: false,
      enableLogs: true,
      attachStacktrace: true,
      tracesSampleRate: Number(
        process.env.SENTRY_TRACES_SAMPLE_RATE
        || (process.env.NODE_ENV === 'production' ? 0.2 : 1),
      ),
      integrations: (defaults) => [
        ...defaults.filter((integration) => integration.name !== 'Fastify'),
        Sentry.fastifyIntegration({ shouldHandleError: () => false }),
        Sentry.postgresJsIntegration(),
        Sentry.extraErrorDataIntegration({ depth: 5 }),
      ],
      beforeSend: sanitizeEvent,
    });
  }

  // =====================================
  // OPENTELEMETRY
  // =====================================
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  telemetrySdk = new NodeSDK({
    serviceName: 'arxisvr-backend',
    traceExporter: new OTLPTraceExporter({
      url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '')}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '')}/v1/metrics`,
      }),
      exportIntervalMillis: 60000, // 1 minute
    }) as any,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-http': {},
      }),
    ],
  });

  telemetrySdk.start();
}

export function captureRequestException(
  error: unknown,
  context: {
    method: string;
    route: string;
    statusCode: number;
    requestId?: string;
    userId?: string;
    tenantId?: string;
  },
): string | undefined {
  if (!Sentry.isEnabled()) return undefined;

  return Sentry.withScope((scope) => {
    scope.setLevel(context.statusCode >= 500 ? 'error' : 'warning');
    scope.setTags({
      request_id: context.requestId || 'unknown',
      tenant_id: context.tenantId || 'no-tenant',
      http_method: context.method,
      http_status: String(context.statusCode),
    });
    scope.setTransactionName(`${context.method} ${context.route}`);
    scope.setContext('request_summary', {
      method: context.method,
      route: context.route,
      statusCode: context.statusCode,
      requestId: context.requestId,
    });
    if (context.userId) scope.setUser({ id: context.userId });
    return Sentry.captureException(error);
  });
}

export async function shutdownObservability(timeoutMs = 2000): Promise<void> {
  await Promise.allSettled([
    Sentry.isEnabled() ? Sentry.flush(timeoutMs) : Promise.resolve(true),
    telemetrySdk?.shutdown() || Promise.resolve(),
  ]);
}
