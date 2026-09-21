import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!password) throw new Error("DEMO_ADMIN_PASSWORD must be set explicitly before seeding");
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: "admin@delevry.dz" },
    update: { passwordHash: hash, role: "SUPER_ADMIN", status: "ACTIVE" },
    create: { name: "Super Admin", email: "admin@delevry.dz", passwordHash: hash, role: "SUPER_ADMIN" },
  });
  await prisma.cashAccount.upsert({
    where: { id: "main-cash" }, update: {}, create: { id: "main-cash", name: "الخزينة الرئيسية", currency: "DZD" },
  });
  console.log("Seed complete");
}
main().catch(error => { console.error(error); process.exitCode=1; }).finally(async()=>{ await prisma.$disconnect(); });
