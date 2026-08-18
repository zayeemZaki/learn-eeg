/**
 * Back-compat re-export of the shared Auth.js config.
 *
 * The config itself lives in src/auth.shared.ts, which is imported by BOTH the
 * server instance (src/auth.ts) and the request gate (src/proxy.ts). It used to
 * be defined here and hand-copied into proxy.ts; see auth.shared.ts for why that
 * copy is gone.
 */
export { authConfig } from "@/auth.shared";
