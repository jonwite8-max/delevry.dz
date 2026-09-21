import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

const url = new URL(databaseUrl);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = process.env["DEMO_ADMIN_PASSWORD"] ?? "ChangeMe-123!";
  const hash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email: "admin@delevry.dz" },
    update: { passwordHash: hash, role: "SUPER_ADMIN", status: "ACTIVE" },
    create: {
      name: "Super Admin",
      email: "admin@delevry.dz",
      passwordHash: hash,
      role: "SUPER_ADMIN",
    },
  });

  await prisma.cashAccount.upsert({
    where: { id: "main-cash" },
    update: {},
    create: {
      id: "main-cash",
      name: "الخزينة الرئيسية",
      currency: "DZD",
    },
  });

  console.log("Seed complete: admin@delevry.dz");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
