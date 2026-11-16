import { APIRequestContext } from '@playwright/test';

export class ApiClient {
  constructor(private request: APIRequestContext, private baseHeaders: Record<string, string> = {}) {}

  private headers(extra?: Record<string, string>) {
    return {
      'Content-Type': 'application/json',
      ...(process.env.API_BEARER_TOKEN ? { Authorization: `Bearer ${process.env.API_BEARER_TOKEN}` } : {}),
      ...(process.env.API_KEY ? { 'x-api-key': process.env.API_KEY } : {}),
      ...this.baseHeaders,
      ...extra,
    };
  }

  async get(url: string, params?: Record<string, string | number>) {
    return this.request.get(url, { headers: this.headers(), params: params as Record<string, string> });
  }

  async post(url: string, body?: unknown, extraHeaders?: Record<string, string>) {
    return this.request.post(url, { headers: this.headers(extraHeaders), data: body });
  }

  async put(url: string, body?: unknown) {
    return this.request.put(url, { headers: this.headers(), data: body });
  }

  async patch(url: string, body?: unknown) {
    return this.request.patch(url, { headers: this.headers(), data: body });
  }

  async delete(url: string) {
    return this.request.delete(url, { headers: this.headers() });
  }
}
