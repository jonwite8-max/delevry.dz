import bcrypt from "bcryptjs";
import { prisma } from "@/infrastructure/db/prisma";
import { createSession } from "@/shared/auth/session";

export async function authenticate(
  identifier: string,
  password: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: identifier.trim().toLowerCase() },
  });

  if (!user || user.status !== "ACTIVE") return null;
  if (!(await bcrypt.compare(password, user.passwordHash))) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return createSession(user.id, user.role);
}
