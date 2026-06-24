import type { Request, RequestHandler, Response } from "express";

export interface SrpcDevToolsAuthOptions {
  /** Accept `Authorization: Bearer <key>` or `X-SRPC-API-KEY`. */
  apiKey?: string;
  /** Accept HTTP Basic auth (useful for /docs and /playground in the browser). */
  basicAuth?: {
    username: string;
    password: string;
  };
}

export interface CreateDevToolsAuthInput {
  apiKey?: string;
  basicAuth?: {
    username: string;
    password: string;
  };
  /** Shorthand for `basicAuth.username`. */
  username?: string;
  /** Shorthand for `basicAuth.password`. */
  password?: string;
}

/** Build one auth config shared by /docs, /playground, and /api/contracts. */
export function createDevToolsAuth(
  input: CreateDevToolsAuthInput | undefined
): SrpcDevToolsAuthOptions | undefined {
  if (!input) {
    return undefined;
  }

  const basicAuth =
    input.basicAuth ??
    (input.username && input.password
      ? { username: input.username, password: input.password }
      : undefined);

  return mergeDevToolsAuth({
    apiKey: input.apiKey,
    basicAuth,
  });
}

/** Read shared devtools auth from common environment variables. */
export function readDevToolsAuthFromEnv(
  env: Record<string, string | undefined> = process.env
): SrpcDevToolsAuthOptions | undefined {
  return createDevToolsAuth({
    apiKey: env.SRPC_API_KEY ?? env.SRPC_TOKEN,
    username: env.SRPC_DOCS_USER ?? env.SRPC_USER,
    password: env.SRPC_DOCS_PASSWORD ?? env.SRPC_PASSWORD,
  });
}

export function mergeDevToolsAuth(
  ...sources: Array<SrpcDevToolsAuthOptions | undefined>
): SrpcDevToolsAuthOptions | undefined {
  const merged: SrpcDevToolsAuthOptions = {};

  for (const source of sources) {
    if (!source) {
      continue;
    }
    if (source.apiKey) {
      merged.apiKey = source.apiKey;
    }
    if (source.basicAuth) {
      merged.basicAuth = source.basicAuth;
    }
  }

  if (!merged.apiKey && !merged.basicAuth) {
    return undefined;
  }

  return merged;
}

export function createSrpcDevToolsAuth(
  options: SrpcDevToolsAuthOptions | undefined
): RequestHandler | undefined {
  if (!options?.apiKey && !options?.basicAuth) {
    return undefined;
  }

  return (req, res, next) => {
    if (isAuthorized(req, options)) {
      next();
      return;
    }

    sendUnauthorized(res, options);
  };
}

function isAuthorized(
  req: Request,
  options: SrpcDevToolsAuthOptions
): boolean {
  if (options.apiKey && readApiKey(req) === options.apiKey) {
    return true;
  }

  if (options.basicAuth) {
    const credentials = readBasicAuth(req);
    if (
      credentials &&
      credentials.username === options.basicAuth.username &&
      credentials.password === options.basicAuth.password
    ) {
      return true;
    }
  }

  return false;
}

export function readApiKey(req: Request): string | undefined {
  const header = req.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  return req.get("x-srpc-api-key") ?? undefined;
}

function readBasicAuth(
  req: Request
): { username: string; password: string } | undefined {
  const header = req.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return undefined;
  }

  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString(
    "utf8"
  );
  const colon = decoded.indexOf(":");
  if (colon === -1) {
    return undefined;
  }

  return {
    username: decoded.slice(0, colon),
    password: decoded.slice(colon + 1),
  };
}

function sendUnauthorized(
  res: Response,
  options: SrpcDevToolsAuthOptions
): void {
  if (options.basicAuth) {
    res.setHeader("WWW-Authenticate", 'Basic realm="SRPC"');
  }

  const acceptsHtml = (res.req?.headers.accept ?? "").includes("text/html");
  if (acceptsHtml && options.basicAuth) {
    res.status(401).send("Authentication required");
    return;
  }

  res.status(401).json({
    error: "unauthorized",
    message: "Invalid or missing credentials",
  });
}
