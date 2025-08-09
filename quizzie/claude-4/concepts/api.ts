import { ObjectId } from "mongodb";

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
    const request = new ObjectId().toString();
    
    const record: APIRequestRecord = {
      request,
      method,
      path,
      input,
      createdAt: new Date()
    };

    this.requests.set(request, record);
    return { request };
  }

  async respond({ request, output }: { request: string; output: any }): Promise<{ request: string } | { error: string }> {
    const record = this.requests.get(request);
    if (!record) {
      return { error: "Request not found" };
    }

    record.output = output;
    if (record.resolver) {
      record.resolver(output);
    }

    return { request };
  }

  async _getRequest({ request }: { request: string }): Promise<Array<{ request: string; method: string; path: string; input: any; output: any }>> {
    const record = this.requests.get(request);
    if (!record) {
      return [];
    }

    return [{
      request: record.request,
      method: record.method,
      path: record.path,
      input: record.input,
      output: record.output
    }];
  }

  async _waitForResponse({ request }: { request: string }): Promise<any> {
    const record = this.requests.get(request);
    if (!record) {
      return undefined;
    }

    if (record.output !== undefined) {
      return record.output;
    }

    return new Promise((resolve) => {
      record.resolver = resolve;
    });
  }
}
