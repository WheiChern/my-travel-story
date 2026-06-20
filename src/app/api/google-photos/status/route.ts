import { NextResponse } from "next/server";
import { getGoogleToken } from "@/lib/google-photos";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const token = await getGoogleToken("demo-user");
  return NextResponse.json({ connected: !!token });
}

export async function DELETE() {
  const user = await prisma.user.findUnique({ where: { id: "demo-user" } });
  if (user?.authProvider) {
    try {
      const parsed = JSON.parse(user.authProvider);
      delete parsed.google;
      await prisma.user.update({
        where: { id: "demo-user" },
        data: { authProvider: JSON.stringify(parsed) },
      });
    } catch { /* ignore */ }
  }
  return NextResponse.json({ disconnected: true });
}
