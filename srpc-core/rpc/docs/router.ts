import express, { type Request, type Response, type Router } from "express";
import {
  buildContractDocs,
  type ContractDocsStore,
  implementedMethodsFromServices,
} from "../../src/contract-docs.ts";
import type { DefinedService } from "../registry.ts";
import { buildContractGraph } from "./contract-graph.ts";
import {
  renderDocsIndex,
  renderDocsNotFound,
  renderEnumDocs,
  renderPackageDocs,
  renderPackageEnums,
  renderPackageStructs,
  renderServiceDocs,
  renderStructDocs,
  renderTypesIndex,
  renderVisualizer,
} from "./render/index.ts";

export const SRPC_DOCS_PATH = "/docs";

export interface CreateSrpcDocsOptions {
  contractDir: string;
  /** Annotate methods with `implemented` when handlers are registered. */
  services?: DefinedService[];
}

export function createSrpcDocsRouter(options: CreateSrpcDocsOptions): Router {
  const router = express.Router();
  const store = buildContractDocs({
    contractDir: options.contractDir,
    implementedMethods: options.services
      ? implementedMethodsFromServices(options.services)
      : undefined,
  });

  router.get("/", (req, res) => {
    if (wantsJson(req)) {
      sendJson(res, store.index);
      return;
    }

    sendHtml(res, renderDocsIndex(store));
  });

  router.get("/types", (req, res) => {
    if (wantsJson(req)) {
      sendJson(res, {
        structs: store.getAllStructs(),
        enums: store.getAllEnums(),
      });
      return;
    }

    sendHtml(res, renderTypesIndex(store));
  });

  router.get("/visualizer", (req, res) => {
    if (wantsJson(req)) {
      sendJson(res, buildContractGraph(store));
      return;
    }

    sendHtml(res, renderVisualizer(store));
  });

  router.get("/:package/structs", (req, res) => {
    const pkg = store.getPackage(req.params.package);
    if (!pkg) {
      sendNotFound(res, req, store, "package", req.params.package);
      return;
    }

    if (wantsJson(req)) {
      sendJson(res, { package: pkg.package, structs: pkg.structs });
      return;
    }

    sendHtml(res, renderPackageStructs(store, pkg));
  });

  router.get("/:package/enums", (req, res) => {
    const pkg = store.getPackage(req.params.package);
    if (!pkg) {
      sendNotFound(res, req, store, "package", req.params.package);
      return;
    }

    if (wantsJson(req)) {
      sendJson(res, { package: pkg.package, enums: pkg.enums });
      return;
    }

    sendHtml(res, renderPackageEnums(store, pkg));
  });

  router.get("/:package/structs/:name", (req, res) => {
    const struct = store.getStruct(req.params.package, req.params.name);
    if (!struct) {
      sendNotFound(
        res,
        req,
        store,
        "struct",
        `${req.params.package}.${req.params.name}`
      );
      return;
    }

    if (wantsJson(req)) {
      sendJson(res, { package: req.params.package, ...struct });
      return;
    }

    sendHtml(res, renderStructDocs(store, req.params.package, struct));
  });

  router.get("/:package/enums/:name", (req, res) => {
    const enumDoc = store.getEnum(req.params.package, req.params.name);
    if (!enumDoc) {
      sendNotFound(
        res,
        req,
        store,
        "enum",
        `${req.params.package}.${req.params.name}`
      );
      return;
    }

    if (wantsJson(req)) {
      sendJson(res, { package: req.params.package, ...enumDoc });
      return;
    }

    sendHtml(res, renderEnumDocs(store, req.params.package, enumDoc));
  });

  router.get("/:package", (req, res) => {
    const pkg = store.getPackage(req.params.package);
    if (!pkg) {
      sendNotFound(res, req, store, "package", req.params.package);
      return;
    }

    if (wantsJson(req)) {
      sendJson(res, pkg);
      return;
    }

    sendHtml(res, renderPackageDocs(store, pkg));
  });

  router.get("/:package/:service", (req, res) => {
    const service = store.getService(req.params.package, req.params.service);
    if (!service) {
      sendNotFound(
        res,
        req,
        store,
        "service",
        `${req.params.package}.${req.params.service}`
      );
      return;
    }

    if (wantsJson(req)) {
      sendJson(res, {
        package: req.params.package,
        ...service,
      });
      return;
    }

    sendHtml(res, renderServiceDocs(store, req.params.package, service));
  });

  return router;
}

export function createSrpcDocsStore(
  options: CreateSrpcDocsOptions
): ContractDocsStore {
  return buildContractDocs({
    contractDir: options.contractDir,
    implementedMethods: options.services
      ? implementedMethodsFromServices(options.services)
      : undefined,
  });
}

function wantsJson(req: Request): boolean {
  const format = req.query.format;
  if (format === "json") {
    return true;
  }

  if (format === "html") {
    return false;
  }

  const accept = req.get("accept") ?? "";
  return (
    accept.includes("application/json") &&
    !accept.includes("text/html") &&
    !accept.includes("*/*")
  );
}

function sendHtml(res: Response, html: string, status = 200): void {
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

function sendJson(res: Response, body: unknown): void {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).json(body);
}

function sendNotFound(
  res: Response,
  req: Request,
  store: ContractDocsStore,
  kind: string,
  name: string
): void {
  if (wantsJson(req)) {
    res.status(404).json({
      error: "not_found",
      kind,
      name,
    });
    return;
  }

  sendHtml(res, renderDocsNotFound(store, kind, name), 404);
}
