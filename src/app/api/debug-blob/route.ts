import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 30;

export async function GET() {
  const env = {
    BLOB2_STORE_ID: process.env.BLOB2_STORE_ID ?? null,
    BLOB2_READ_WRITE_TOKEN: process.env.BLOB2_READ_WRITE_TOKEN ? "SET" : null,
  };

  try {
    const testBlob = new Blob(["hello world"], { type: "text/plain" });
    const { url } = await put("debug-test/hello.txt", testBlob, {
      access: "public",
      allowOverwrite: true,
      token: process.env.BLOB2_READ_WRITE_TOKEN,
    } as Parameters<typeof put>[2]);
    return NextResponse.json({ success: true, url, env });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : String(e),
      env,
    });
  }
}
