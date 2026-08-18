/**
 * Module augmentation so the domain fields we attach in callbacks are typed
 * everywhere `session.user` or the JWT is read. Without this, TypeScript would
 * not know about `position` / `institution` / `authTime`.
 */
import type { Position, Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    position: Position;
    institution: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      position: Position;
      institution: string;
      role: Role;
      /**
       * Epoch ms at which this session's token was minted. Compared against the
       * user's `sessionsValidFrom` column by the auth guards to revoke tokens
       * issued before a credential change. Undefined only for tokens minted
       * before this field existed — the guards treat that as invalid.
       */
      authTime?: number;
    } & DefaultSession["user"];
  }
}

// JWT is declared in @auth/core/jwt; augmenting the next-auth/jwt re-export
// does not merge into the original interface.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    position: Position;
    institution: string;
    role: Role;
    /** See Session["user"].authTime — the session-invalidation watermark. */
    authTime?: number;
  }
}
