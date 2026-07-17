import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueEmailVerificationCode } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";

const Schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: true });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.emailVerified) return NextResponse.json({ success: true });

  const identifier = `email-verify:${user.id}`;
  const verificationCode = await issueEmailVerificationCode(identifier);
  if (verificationCode) {
    const sent = await sendEmail({
      to: user.email,
      template: "email-verification",
      name: user.name,
      verificationCode,
    });
    if (!sent) await prisma.verificationToken.deleteMany({ where: { identifier } });
  }
  return NextResponse.json({ success: true });
}
