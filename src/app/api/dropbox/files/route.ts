import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDropboxToken } from "@/lib/dropbox";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") ?? "";

  const token = await getDropboxToken("demo-user");
  if (!token) return NextResponse.json({ error: "Dropbox not connected" }, { status: 401 });

  const res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: path || "",
      recursive: false,
      include_media_info: true,
      include_deleted: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: "Dropbox API error", detail: err }, { status: 502 });
  }

  const data = await res.json();

  // Filter to supported file types
  const SUPPORTED = [".pdf", ".docx", ".doc", ".txt", ".jpg", ".jpeg", ".png", ".heic", ".webp"];
  const entries = (data.entries as DropboxEntry[]).filter((e) => {
    if (e[".tag"] === "folder") return true;
    const name = e.name.toLowerCase();
    return SUPPORTED.some((ext) => name.endsWith(ext));
  });

  return NextResponse.json({ entries, cursor: data.cursor, has_more: data.has_more });
}

interface DropboxEntry {
  ".tag": "file" | "folder";
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
  size?: number;
  client_modified?: string;
}
