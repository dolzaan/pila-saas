import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { appUrl, issueAuthToken } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";

const Schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: true });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = await issueAuthToken(user.id, "password-reset", 30);
    if (token) {
      const url = `${appUrl()}/reset-password?token=${token}`;
      await sendEmail({
        to: user.email,
        template: "password-reset",
        name: user.name,
        actionUrl: url,
      });
    }
  }
  return NextResponse.json({ success: true });
}
