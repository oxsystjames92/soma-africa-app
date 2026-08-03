/**
 * The seam that keeps live money out of tests. Adapters never call fetch
 * directly; they call a transport, and tests inject a fake one.
 */
export interface HttpRequest {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  body: string;
}

export interface HttpTransport {
  send(request: HttpRequest): Promise<HttpResponse>;
}

export class FetchTransport implements HttpTransport {
  constructor(private readonly timeoutMs = 15_000) {}

  async send(request: HttpRequest): Promise<HttpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        ...(request.body === undefined ? {} : { body: request.body }),
        signal: controller.signal,
      });
      return { status: res.status, body: await res.text() };
    } finally {
      clearTimeout(timer);
    }
  }
}
