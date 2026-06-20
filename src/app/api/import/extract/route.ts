import { NextRequest, NextResponse } from "next/server";
import { downloadDropboxFile } from "@/lib/dropbox";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".heic", ".webp"];
const MEDIA_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".heic": "image/jpeg", ".webp": "image/webp",
};

export async function POST(req: NextRequest) {
  try {
    const { paths } = await req.json() as { paths: string[] };

    if (!paths?.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results = await Promise.all(paths.map((path) => extractFile(path)));
    const successful = results.filter((r) => r !== null);

    if (!successful.length) {
      return NextResponse.json({ error: "Could not extract data from any files. Make sure the files contain readable text (booking confirmations, itineraries, hotel/flight PDFs)." }, { status: 422 });
    }

    // Merge all extracted data into a single trip suggestion
    const merged = await mergeExtractions(successful as ExtractedData[]);
    return NextResponse.json(merged);
  } catch (err) {
    console.error("Extract route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function extractFile(path: string): Promise<ExtractedData | null> {
  const ext = path.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";

  try {
    const buffer = await downloadDropboxFile("demo-user", path);
    if (!buffer) return null;

    if (IMAGE_EXTS.includes(ext)) {
      return extractFromImage(buffer, path, MEDIA_TYPES[ext] ?? "image/jpeg");
    } else if (ext === ".pdf") {
      return extractFromPdf(buffer, path);
    } else if (ext === ".docx" || ext === ".doc") {
      return extractFromDocx(buffer, path);
    } else if (ext === ".txt") {
      return extractFromText(buffer.toString("utf-8"), path);
    }
  } catch (err) {
    console.error(`Failed to extract ${path}:`, err);
  }
  return null;
}

async function extractFromImage(buffer: Buffer, path: string, mediaType: string): Promise<ExtractedData | null> {
  const base64 = buffer.toString("base64");
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data: base64 },
        },
        { type: "text", text: EXTRACTION_PROMPT },
      ],
    }],
  });

  return parseClaudeResponse(response.content[0].type === "text" ? response.content[0].text : "");
}

async function extractFromPdf(buffer: Buffer, path: string): Promise<ExtractedData | null> {
  // Send PDF directly to Claude — it natively understands PDF documents
  const base64 = buffer.toString("base64");
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        } as never,
        { type: "text", text: EXTRACTION_PROMPT },
      ],
    }],
  });
  return parseClaudeResponse(response.content[0].type === "text" ? response.content[0].text : "");
}

async function extractFromDocx(buffer: Buffer, path: string): Promise<ExtractedData | null> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return extractFromText(result.value, path);
}

async function extractFromText(text: string, path: string): Promise<ExtractedData | null> {
  if (!text.trim()) return null;

  // Truncate very long docs to stay within context limits
  const truncated = text.length > 12000 ? text.slice(0, 12000) + "\n[...truncated]" : text;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `${EXTRACTION_PROMPT}\n\n<document filename="${path.split("/").pop()}">\n${truncated}\n</document>`,
    }],
  });

  return parseClaudeResponse(response.content[0].type === "text" ? response.content[0].text : "");
}

async function mergeExtractions(extractions: ExtractedData[]): Promise<ExtractedData> {
  if (extractions.length === 1) return extractions[0];

  const summary = extractions.map((e, i) => `File ${i + 1}:\n${JSON.stringify(e, null, 2)}`).join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `You are merging travel data extracted from multiple booking documents into a single trip.
Combine the information, removing duplicates. If dates conflict, use the most specific/earliest start date and latest end date.

${summary}

${EXTRACTION_PROMPT}

Return the merged result as a single JSON object.`,
    }],
  });

  return parseClaudeResponse(response.content[0].type === "text" ? response.content[0].text : "") ?? extractions[0];
}

function parseClaudeResponse(text: string): ExtractedData | null {
  // Extract JSON from Claude's response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1].trim());
  } catch {
    return null;
  }
}

const EXTRACTION_PROMPT = `Extract all travel booking and itinerary information from this document and return it as a JSON object with exactly this structure:

{
  "title": "Trip title (e.g. Tokyo Holiday Dec 2024)",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "primaryCountry": "Main destination country",
  "tripType": "family|solo|special_someone|friends|business|other",
  "companions": ["name1", "name2"],
  "summary": "1-2 sentence description of the trip",
  "places": [
    { "city": "City name", "country": "Country", "orderIndex": 0, "visitDate": "YYYY-MM-DD or null", "notes": "hotel name or any notes" }
  ],
  "itineraryItems": [
    { "date": "YYYY-MM-DD", "title": "Activity or leg title", "description": "Details", "transportMode": "flight|train|bus|car|ferry|walk|other or null" }
  ],
  "costItems": [
    { "category": "flights|hotels|transport|food|attractions|shopping|insurance|other", "description": "What it was", "amount": 0.00, "currency": "USD" }
  ],
  "currency": "USD",
  "confidence": "high|medium|low"
}

Only include fields you can actually find in the document. Use null for unknown dates. Return ONLY valid JSON, no explanation.`;

export interface ExtractedData {
  title?: string;
  startDate?: string;
  endDate?: string;
  primaryCountry?: string;
  tripType?: string;
  companions?: string[];
  summary?: string;
  places?: Array<{ city: string; country: string; orderIndex: number; visitDate?: string; notes?: string }>;
  itineraryItems?: Array<{ date: string; title: string; description?: string; transportMode?: string }>;
  costItems?: Array<{ category: string; description: string; amount: number; currency: string }>;
  currency?: string;
  confidence?: "high" | "medium" | "low";
}
