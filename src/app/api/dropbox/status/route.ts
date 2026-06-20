import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await prisma.user.findUnique({ where: { id: "demo-user" } });
  if (!user?.authProvider) return NextResponse.json({ connected: false });

  try {
    const parsed = JSON.parse(user.authProvider);
    if (parsed.dropbox?.accessToken) {
      return NextResponse.json({ connected: true, accountId: parsed.dropbox.accountId });
    }
  } catch {}

  return NextResponse.json({ connected: false });
}

export async function DELETE() {
  await prisma.user.update({
    where: { id: "demo-user" },
    data: { authProvider: null },
  });
  return NextResponse.json({ success: true });
}
