import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb({
  host: process.env["DATABASE_HOST"] ?? "127.0.0.1",
  port: Number(process.env["DATABASE_PORT"] ?? 3306),
  user: process.env["DATABASE_USER"] ?? "root",
  password: process.env["DATABASE_PASSWORD"] ?? "",
  database: process.env["DATABASE_NAME"] ?? "DELVRYDZ",
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
