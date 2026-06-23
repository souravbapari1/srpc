import { createServiceClient } from "srpc-client";
import { UserService } from "../generated/srpc-types.ts";

const baseUrl = process.env.SRPC_URL ?? "http://localhost:3100";

export const user = createServiceClient(UserService, {
  baseUrl,
  headers: {
    Authorization: "Bearer example-token",
  },
});
