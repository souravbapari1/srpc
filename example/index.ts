import express from "express";
import {
  createDevToolsAuth,
  createSrpcRouter,
  readDevToolsAuthFromEnv,
} from "srpc-core/rpc";
import { user } from "./rpc/user.ts";
import services from "./services/index.ts";

const PORT = Number(process.env.PORT ?? 3100);

const auth = readDevToolsAuthFromEnv();

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, X-SRPC-API-KEY"
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

app.use(
  createSrpcRouter({
    services,
    logger: true,
    auth,
    docs: { contractDir: "./contract" },
    playground: { contractDir: "./contract" },
  })
);

// Or define auth inline once:
// const auth = createDevToolsAuth({
//   apiKey: "1234567890",
//   username: "admin",
//   password: "password",
// });

app.listen(PORT, async () => {
  console.log(`SRPC server listening on http://localhost:${PORT}`);
  console.log(`Contract docs at http://localhost:${PORT}/docs`);
  console.log(`Playground at http://localhost:${PORT}/playground`);
  console.log(`Contract API at http://localhost:${PORT}/api/contracts`);
  if (auth) {
    console.log("DevTools auth enabled (API key and/or HTTP Basic)");
  }

  const result = await user.getUser({ id: "user-1" });
  console.log("getUser:", JSON.stringify(result, null, 2));
});
