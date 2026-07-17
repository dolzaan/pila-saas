import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashAuthToken } from "@/lib/auth-tokens";

const Schema = z.object({
  token: z.string().length(64),
  password: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
});

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const stored = await prisma.verificationToken.findUnique({ where: { token: hashAuthToken(parsed.data.token) } });
  if (!stored || !stored.identifier.startsWith("password-reset:") || stored.expires <= new Date()) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
  }
  const userId = stored.identifier.slice("password-reset:".length);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.verificationToken.delete({ where: { identifier_token: { identifier: stored.identifier, token: stored.token } } }),
  ]);
  return NextResponse.json({ success: true });
}
