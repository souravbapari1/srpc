import express, { type Request, type Response, type Router } from "express";
import {
  ContractStoreError,
  createContractStore,
  type ContractStore,
} from "../src/contract-store.ts";

export const SRPC_CONTRACTS_API_PATH = "/api/contracts";

export interface CreateContractsApiOptions {
  contractDir: string;
}

export function createContractsApiRouter(
  options: CreateContractsApiOptions
): Router {
  const router = express.Router();
  const store = createContractStore({ contractDir: options.contractDir });

  router.get("/", (_req, res) => {
    sendJson(res, {
      contractDir: store.contractDir,
      index: store.docs.index,
      contracts: store.listSources().map(entry => ({
        package: entry.package,
        file: entry.file,
      })),
    });
  });

  router.post("/validate", express.json(), (req, res) => {
    const source = readString(req.body?.source);
    if (!source) {
      sendError(res, 400, "invalid_request", "Missing source");
      return;
    }

    const result = store.validateSource(source, {
      package: readString(req.body?.package),
      file: readString(req.body?.file),
      excludePackage: readString(req.body?.excludePackage),
    });

    sendJson(res, result, result.valid ? 200 : 422);
  });

  router.get("/:package/source", (req, res) => {
    const packageName = readParam(req.params.package);
    if (!packageName) {
      sendError(res, 400, "invalid_request", "Missing package");
      return;
    }

    const entry = store.getSource(packageName);
    if (!entry) {
      sendError(res, 404, "not_found", `Package '${packageName}' not found`);
      return;
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send(entry.source);
  });

  router.get("/:package", (req, res) => {
    const packageName = readParam(req.params.package);
    if (!packageName) {
      sendError(res, 400, "invalid_request", "Missing package");
      return;
    }

    const entry = store.getSource(packageName);
    if (!entry) {
      sendError(res, 404, "not_found", `Package '${packageName}' not found`);
      return;
    }

    sendJson(res, {
      ...entry,
      docs: store.docs.getPackage(entry.package),
    });
  });

  router.post("/", express.json(), (req, res) => {
    const packageName = readString(req.body?.package);
    const source = readString(req.body?.source);
    if (!packageName || !source) {
      sendError(res, 400, "invalid_request", "Missing package or source");
      return;
    }

    try {
      const entry = store.createContract({
        package: packageName,
        source,
        file: readString(req.body?.file),
      });
      sendJson(res, entry, 201);
    } catch (error) {
      handleStoreError(res, error);
    }
  });

  router.put("/:package", express.json(), (req, res) => {
    const packageName = readParam(req.params.package);
    if (!packageName) {
      sendError(res, 400, "invalid_request", "Missing package");
      return;
    }

    const source = readString(req.body?.source);
    if (!source) {
      sendError(res, 400, "invalid_request", "Missing source");
      return;
    }

    try {
      const entry = store.updateContract(packageName, { source });
      sendJson(res, entry);
    } catch (error) {
      handleStoreError(res, error);
    }
  });

  router.delete("/:package", (req, res) => {
    const packageName = readParam(req.params.package);
    if (!packageName) {
      sendError(res, 400, "invalid_request", "Missing package");
      return;
    }

    try {
      store.deleteContract(packageName);
      res.status(204).end();
    } catch (error) {
      handleStoreError(res, error);
    }
  });

  return router;
}

export function createContractsApiStore(
  options: CreateContractsApiOptions
): ContractStore {
  return createContractStore({ contractDir: options.contractDir });
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") {
    return value.length > 0 ? value : undefined;
  }

  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0];
  }

  return undefined;
}

function sendJson(res: Response, body: unknown, status = 200): void {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json(body);
}

function sendError(
  res: Response,
  status: number,
  error: string,
  message: string,
  diagnostics?: unknown
): void {
  res.status(status).json({
    error,
    message,
    ...(diagnostics ? { diagnostics } : {}),
  });
}

function handleStoreError(res: Response, error: unknown): void {
  if (error instanceof ContractStoreError) {
    const status =
      error.code === "not_found"
        ? 404
        : error.code === "validation_failed"
          ? 422
          : 409;

    sendError(res, status, error.code, error.message, error.diagnostics);
    return;
  }

  throw error;
}
