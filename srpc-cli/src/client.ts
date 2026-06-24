import type { ContractDocsIndex } from "srpc-core";

export interface ContractsClientOptions {
  baseUrl: string;
  apiKey?: string;
}

export interface ContractListResponse {
  contractDir: string;
  index: ContractDocsIndex;
  contracts: Array<{ package: string; file: string }>;
}

export interface ContractEntry {
  package: string;
  file: string;
  source: string;
}

export interface ContractValidationResponse {
  valid: boolean;
  diagnostics: Array<{ message: string; severity: string }>;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  diagnostics?: Array<{ message: string; severity: string }>;
}

export class ContractsApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody
  ) {
    super(body.message);
    this.name = "ContractsApiError";
  }
}

export function createContractsClient(options: ContractsClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  async function request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (options.apiKey) {
      headers.Authorization = `Bearer ${options.apiKey}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const json = await response.json();
      if (!response.ok) {
        throw new ContractsApiError(response.status, json as ApiErrorBody);
      }
      return json as T;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ContractsApiError(response.status, {
        error: "request_failed",
        message: text || response.statusText,
      });
    }

    return (await response.text()) as T;
  }

  return {
    list(): Promise<ContractListResponse> {
      return request("GET", "/api/contracts");
    },

    get(packageName: string): Promise<ContractEntry & { docs?: unknown }> {
      return request("GET", `/api/contracts/${encodeURIComponent(packageName)}`);
    },

    getSource(packageName: string): Promise<string> {
      return request("GET", `/api/contracts/${encodeURIComponent(packageName)}/source`);
    },

    validate(input: {
      source: string;
      package?: string;
      file?: string;
      excludePackage?: string;
    }): Promise<ContractValidationResponse> {
      return request("POST", "/api/contracts/validate", input);
    },

    create(input: {
      package: string;
      source: string;
      file?: string;
    }): Promise<ContractEntry> {
      return request("POST", "/api/contracts", input);
    },

    update(packageName: string, source: string): Promise<ContractEntry> {
      return request("PUT", `/api/contracts/${encodeURIComponent(packageName)}`, {
        source,
      });
    },

    delete(packageName: string): Promise<void> {
      return request("DELETE", `/api/contracts/${encodeURIComponent(packageName)}`);
    },
  };
}
