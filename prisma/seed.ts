/**
 * Seed script — populates demo content + one demo account.
 *
 * Real clinical content (vetted questions, licensed EEG images) would be loaded
 * here or via an admin pipeline. Everything below is illustrative placeholder
 * data so the app is navigable on first run.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, Position, AtlasCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // Idempotent: clear content tables so re-seeding doesn't duplicate rows.
  await db.attempt.deleteMany();
  await db.choice.deleteMany();
  await db.question.deleteMany();
  await db.atlasEntry.deleteMany();

  await db.user.upsert({
    where: { email: "demo@eeg.test" },
    update: {},
    create: {
      name: "Demo Resident",
      email: "demo@eeg.test",
      passwordHash: await bcrypt.hash("password123", 12),
      position: Position.RESIDENT,
      institution: "Demo Medical Center",
    },
  });

  await db.question.create({
    data: {
      stem: "A 24-year-old presents with a posterior dominant rhythm of 10 Hz that attenuates with eye opening. What does this represent?",
      explanation:
        "A reactive 10 Hz posterior dominant rhythm that attenuates with eye opening is the normal alpha rhythm of a relaxed, awake adult.",
      difficulty: 1,
      choices: {
        create: [
          { text: "Normal alpha rhythm", isCorrect: true },
          { text: "Focal slowing", isCorrect: false },
          { text: "Generalized spike-and-wave", isCorrect: false },
          { text: "Triphasic waves", isCorrect: false },
        ],
      },
    },
  });

  await db.question.create({
    data: {
      stem: "Generalized 3 Hz spike-and-wave discharges with abrupt onset and offset are most characteristic of which syndrome?",
      explanation:
        "Bilaterally synchronous 3 Hz spike-and-wave is the hallmark of childhood absence epilepsy.",
      difficulty: 2,
      choices: {
        create: [
          { text: "Childhood absence epilepsy", isCorrect: true },
          { text: "Temporal lobe epilepsy", isCorrect: false },
          { text: "Juvenile myoclonic epilepsy", isCorrect: false },
          { text: "Lennox-Gastaut syndrome", isCorrect: false },
        ],
      },
    },
  });

  await db.atlasEntry.createMany({
    data: [
      {
        title: "Posterior Dominant (Alpha) Rhythm",
        category: AtlasCategory.NORMAL_VARIANT,
        description:
          "8–13 Hz rhythm over posterior head regions in a relaxed, awake adult; attenuates with eye opening.",
        imageUrl: "https://placehold.co/800x300?text=Alpha+Rhythm",
      },
      {
        title: "Mu Rhythm",
        category: AtlasCategory.NORMAL_VARIANT,
        description:
          "Arciform central rhythm that attenuates with contralateral limb movement.",
        imageUrl: "https://placehold.co/800x300?text=Mu+Rhythm",
      },
      {
        title: "Generalized Spike-and-Wave",
        category: AtlasCategory.ABNORMAL_VARIANT,
        description:
          "Bilaterally synchronous spike-and-wave complexes seen in generalized epilepsies.",
        imageUrl: "https://placehold.co/800x300?text=Spike-and-Wave",
      },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
