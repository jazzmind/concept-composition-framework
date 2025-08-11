import { randomUUID } from 'crypto';
export interface APIRequestRecord {
  request: string;
  method: string;
  path: string;
  input: any;
  output?: any;
  resolver?: (output: any) => void;
  createdAt: Date;
}

export class APIConcept {
  private requests: Map<string, APIRequestRecord> = new Map();

  async request({ method, path, ...input }: { method: string; path: string; [key: string]: any }): Promise<{ request: string }> {
    const request = randomUUID();
    let resolver: (output: any) => void = () => {};
    const promise = new Promise<any>((resolve) => (resolver = resolve));
    this.requests.set(request, {
      request,
      method,
      path,
      input,
      createdAt: new Date(),
      resolver,
    });
    // Fire and forget; syncs will pick this up and respond
    void promise.then(() => {});
    return { request };
  }

  async respond({ request, output }: { request: string; output: any }): Promise<{ request: string } | { error: string }> {
    const rec = this.requests.get(request);
    if (!rec) return { error: 'request_not_found' };
    rec.output = output;
    rec.resolver?.(output);
    return { request };
  }

  async _getRequest({ request }: { request: string }): Promise<Array<{ request: string; method: string; path: string; input: any; output: any }>> {
    const rec = this.requests.get(request);
    if (!rec) return [];
    return [{ request: rec.request, method: rec.method, path: rec.path, input: rec.input, output: rec.output }];
  }

  async _waitForResponse({ request }: { request: string }): Promise<any> {
    const rec = this.requests.get(request);
    if (!rec) return { error: 'request_not_found' };
    if (rec.output !== undefined) return rec.output;
    return await new Promise((resolve) => {
      rec.resolver = resolve;
    });
  }
}


