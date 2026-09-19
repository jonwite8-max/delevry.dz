import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import * as bcrypt from "bcryptjs";

const databaseUrl = process.env["DATABASE_URL"];
const email = process.env["DEMO_ADMIN_USER"] ?? "admin@delevry.dz";

if (!databaseUrl) throw new Error("DATABASE_URL is required");

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = process.env["DEMO_ADMIN_PASSWORD"];
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error("DEMO_ADMIN_PASSWORD is required and must contain at least 12 characters");
  }

  const hash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash, role: "SUPER_ADMIN", status: "ACTIVE" },
    create: {
      name: "Super Admin", email, passwordHash: hash, role: "SUPER_ADMIN",
    },
  });

  await prisma.cashAccount.upsert({
    where: { id: "main-cash" }, update: {},
    create: { id: "main-cash", name: "الخزينة الرئيسية", currency: "DZD" },
  });

  console.log(`Seed complete: ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
