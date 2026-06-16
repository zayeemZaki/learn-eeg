/**
 * Promote a user to ADMIN by email.
 *
 * There is no in-app "grant admin" UI in this phase — this script is how the
 * first (and any further) admin is minted. Run it from a trusted shell:
 *
 *   npm run make-admin -- me@example.com
 *
 * The `--` passes the email through npm to the script. Exits non-zero with a
 * clear message if no email is given or no user matches, so it's safe to wire
 * into setup docs.
 */
import { PrismaClient, Role } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // argv: [node, script, <email>]. Trim + lowercase to match how emails are
  // stored at registration (see lib/validations/auth.ts).
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exit(1);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  if (user.role === Role.ADMIN) {
    console.log(`${email} is already an ADMIN.`);
    return;
  }

  await db.user.update({ where: { email }, data: { role: Role.ADMIN } });
  console.log(`Promoted ${email} to ADMIN.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
