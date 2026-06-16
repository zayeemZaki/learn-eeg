/**
 * Module augmentation so the domain fields we attach in callbacks are typed
 * everywhere `session.user` or the JWT is read. Without this, TypeScript would
 * not know about `position` / `institution`.
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
  }
}
