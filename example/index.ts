import express from "express";
import { createSrpcRouter } from "srpc-core/rpc";
import { user } from "./rpc/user.ts";
import services from "./services/index.ts";

const PORT = Number(process.env.PORT ?? 3100);

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

app.use(createSrpcRouter({ services }));

app.listen(PORT, async () => {
  console.log(`SRPC server listening on http://localhost:${PORT}`);

  const result = await user.getUser({ id: "user-1" });
  console.log("getUser:", JSON.stringify(result, null, 2));
});
