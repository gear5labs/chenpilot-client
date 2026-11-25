const MAX_REPORT_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REPORT_BYTES) {
    return new Response(null, { status: 413 });
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_REPORT_BYTES) {
    return new Response(null, { status: 413 });
  }

  let report: unknown;
  try {
    report = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400 });
  }

  // Log only browser policy fields; omit cookies, headers, and request bodies.
  const record = report && typeof report === 'object' ? report as {
    'csp-report'?: Record<string, unknown>;
    body?: Record<string, unknown>;
  } : {};
  const candidate = record['csp-report'] ?? record.body;
  const details = candidate && typeof candidate === 'object' ? candidate : {};
  console.warn('Content Security Policy violation', {
    documentUri: details['document-uri'] ?? details['documentURL'] ?? null,
    blockedUri: details['blocked-uri'] ?? details['blockedURL'] ?? null,
    violatedDirective: details['violated-directive'] ?? details['effectiveDirective'] ?? null,
  });

  return new Response(null, { status: 204 });
}
