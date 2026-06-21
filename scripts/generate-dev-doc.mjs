import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  Header, Footer, PageNumber, VerticalAlign, LevelFormat
} from "docx";
import { writeFileSync } from "fs";

const SAND = "C89B73";
const IVORY = "F8F5F0";
const GRAPHITE = "222222";
const LIGHT_GRAY = "F5F5F5";
const MID_GRAY = "E0E0E0";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: SAND, space: 6 } },
    children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: GRAPHITE })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: "444444" })],
  });
}

function body(text, options = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: "333333", ...options })],
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: "333333", bold })],
  });
}

function subBullet(text) {
  return new Paragraph({
    numbering: { reference: "sub-bullets", level: 0 },
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: "555555" })],
  });
}

function cell(text, { bg = "FFFFFF", bold = false, color = "222222", width = 2000, wrap = true } = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: bg, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    verticalAlign: VerticalAlign.TOP,
    children: [new Paragraph({
      children: [new TextRun({ text, font: "Arial", size: 18, bold, color })],
    })],
  });
}

function headerCell(text, width = 2000) {
  return cell(text, { bg: "C89B73", bold: true, color: "FFFFFF", width });
}

function spacer() {
  return new Paragraph({ spacing: { before: 200, after: 0 }, children: [new TextRun("")] });
}

const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "sub-bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      },
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: GRAPHITE },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "444444" },
        paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: SAND, space: 4 } },
          children: [new TextRun({ text: "my travel story  —  Development Log", font: "Arial", size: 18, color: "888888" })],
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD", space: 4 } },
          children: [
            new TextRun({ text: "Last updated: " + today + "   |   Page ", font: "Arial", size: 18, color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "888888" }),
            new TextRun({ text: " of ", font: "Arial", size: 18, color: "888888" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 18, color: "888888" }),
          ],
        })]
      })
    },
    children: [

      // ─── TITLE BLOCK ───────────────────────────────────────────────────
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 80 },
        children: [new TextRun({ text: "my travel story", font: "Arial", size: 52, bold: true, color: GRAPHITE })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "App Development Log", font: "Arial", size: 28, color: SAND })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 },
        children: [new TextRun({ text: "Living document  ·  " + today, font: "Arial", size: 20, color: "888888", italics: true })],
      }),

      // ─── SECTION 1: APP SUMMARY ────────────────────────────────────────
      heading1("1.  App Summary"),
      body("my travel story is a personal travel memory map — a rich, visual journal that lets you capture every trip, every place, and every story from your life of travel."),
      spacer(),

      heading2("What It Does"),
      bullet("Interactive World Map — visualise every destination you have visited, colour-coded by trip type (Family, Solo, Special Someone, Friends, Business)."),
      bullet("Trip Detail Pages — rich pages per trip with Gallery, Itinerary, Route, Cost Summary, and an AI-generated Story."),
      bullet("AI Travel Journal (Story Tab) — Claude AI reads your trip data (places, dates, companions, costs) and writes a vivid narrative, day-by-day breakdown, food highlights, sights, memories, and photo captions."),
      bullet("Photo Import — upload photos manually, or import them directly from Google Photos using the new Picker flow."),
      bullet("Booking Document Import — connect Dropbox and import PDF booking confirmations; Claude AI extracts trip details (destinations, dates, airlines, hotels, costs) automatically."),
      bullet("Wishlist — save dream destinations, tag them on the map, and set fare alerts."),
      bullet("Cost Tracking — log expenses by category and view per-night and per-person breakdowns."),
      spacer(),

      heading2("Brand Identity"),
      bullet("Name: my travel story"),
      bullet("Palette: Sand #C89B73  ·  Warm Ivory #F8F5F0  ·  Graphite #222222"),
      bullet("Typography: SF Pro Display / SF Pro Text (via -apple-system CSS stack)"),
      spacer(),

      // ─── SECTION 2: TECH REQUIREMENTS ──────────────────────────────────
      heading1("2.  Technical Requirements"),

      heading2("Core Stack"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2500, 2500, 4360],
        rows: [
          new TableRow({ children: [headerCell("Layer", 2500), headerCell("Technology", 2500), headerCell("Notes", 4360)] }),
          new TableRow({ children: [cell("Framework", { width: 2500 }), cell("Next.js 16.2.9 (App Router)", { width: 2500 }), cell("Turbopack dev server, TypeScript, React 18", { width: 4360 })] }),
          new TableRow({ children: [cell("Styling", { width: 2500, bg: LIGHT_GRAY }), cell("Tailwind CSS + shadcn/ui", { width: 2500, bg: LIGHT_GRAY }), cell("Custom brand CSS variables in globals.css", { width: 4360, bg: LIGHT_GRAY })] }),
          new TableRow({ children: [cell("Database", { width: 2500 }), cell("PostgreSQL + Prisma 7", { width: 2500 }), cell("@prisma/adapter-pg, schema at prisma/schema.prisma", { width: 4360 })] }),
          new TableRow({ children: [cell("Map", { width: 2500, bg: LIGHT_GRAY }), cell("Leaflet.js 1.9.4", { width: 2500, bg: LIGHT_GRAY }), cell("Loaded via CDN to bypass Turbopack PostCSS issues", { width: 4360, bg: LIGHT_GRAY })] }),
          new TableRow({ children: [cell("AI", { width: 2500 }), cell("Anthropic Claude SDK", { width: 2500 }), cell("Model: claude-sonnet-4-6. Used for PDF extraction, storyboard generation, photo filtering", { width: 4360 })] }),
          new TableRow({ children: [cell("Language", { width: 2500, bg: LIGHT_GRAY }), cell("TypeScript", { width: 2500, bg: LIGHT_GRAY }), cell("Strict mode, all routes and components typed", { width: 4360, bg: LIGHT_GRAY })] }),
        ]
      }),
      spacer(),

      heading2("Third-Party Services & Credentials"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 2000, 2560, 2600],
        rows: [
          new TableRow({ children: [headerCell("Service", 2200), headerCell("Purpose", 2000), headerCell("Env Variable(s)", 2560), headerCell("Notes", 2600)] }),
          new TableRow({ children: [
            cell("Anthropic", { width: 2200 }), cell("PDF extraction & AI story generation", { width: 2000 }),
            cell("ANTHROPIC_API_KEY", { width: 2560 }), cell("claude-sonnet-4-6 model; maxDuration=120 on routes", { width: 2600 })
          ]}),
          new TableRow({ children: [
            cell("Dropbox", { width: 2200, bg: LIGHT_GRAY }), cell("Cloud storage for booking PDFs", { width: 2000, bg: LIGHT_GRAY }),
            cell("DROPBOX_APP_KEY\nDROPBOX_APP_SECRET\nDROPBOX_REDIRECT_URI", { width: 2560, bg: LIGHT_GRAY }),
            cell("OAuth2 with refresh token; token stored in User.authProvider JSON", { width: 2600, bg: LIGHT_GRAY })
          ]}),
          new TableRow({ children: [
            cell("Google Photos", { width: 2200 }), cell("Import trip photos via Picker API", { width: 2000 }),
            cell("GOOGLE_CLIENT_ID\nGOOGLE_CLIENT_SECRET\nGOOGLE_REDIRECT_URI", { width: 2560 }),
            cell("Scope: photospicker.mediaitems.readonly (Library API deprecated for new projects)", { width: 2600 })
          ]}),
          new TableRow({ children: [
            cell("Vercel (optional)", { width: 2200, bg: LIGHT_GRAY }), cell("Deployment & Blob storage for photos", { width: 2000, bg: LIGHT_GRAY }),
            cell("BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID", { width: 2560, bg: LIGHT_GRAY }),
            cell("Falls back to local /public/uploads/ if no blob token set", { width: 2600, bg: LIGHT_GRAY })
          ]}),
        ]
      }),
      spacer(),

      heading2("Environment Variables (.env)"),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({
          text: "DATABASE_URL  ·  ANTHROPIC_API_KEY  ·  DROPBOX_APP_KEY  ·  DROPBOX_APP_SECRET  ·  DROPBOX_REDIRECT_URI  ·  GOOGLE_CLIENT_ID  ·  GOOGLE_CLIENT_SECRET  ·  GOOGLE_REDIRECT_URI  ·  BLOB_READ_WRITE_TOKEN (optional)",
          font: "Courier New", size: 18, color: "444444"
        })]
      }),
      spacer(),

      heading2("Local Setup Commands"),
      bullet("Install dependencies: npm install"),
      bullet("Set up database: npx prisma migrate dev"),
      bullet("Run dev server: npm run dev  (Turbopack)"),
      bullet("App runs at: http://localhost:3000"),
      spacer(),

      // ─── SECTION 3: ISSUES LOG ─────────────────────────────────────────
      heading1("3.  Issues Log"),
      body("A running record of every significant problem encountered during development, the options considered, and how each was ultimately resolved."),
      spacer(),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [300, 2200, 2800, 2360, 1700],
        rows: [
          // Header row
          new TableRow({
            tableHeader: true,
            children: [
              headerCell("#", 300),
              headerCell("Problem", 2200),
              headerCell("Options Considered / Root Cause", 2800),
              headerCell("Final Resolution", 2360),
              headerCell("Status", 1700),
            ]
          }),

          // Issue 1
          new TableRow({ children: [
            cell("1", { width: 300 }),
            cell("Leaflet 'Map container is already initialized' error on dashboard", { width: 2200 }),
            cell("React 18 Strict Mode fires useEffect cleanup + remount. Leaflet stores _leaflet_id on the DOM element. Even after map.remove(), the ID persists, so the second mount throws. Tried: (a) checking mapInstanceRef.current, (b) deleting _leaflet_id in cleanup.", { width: 2800 }),
            cell("Delete _leaflet_id BEFORE the async Leaflet import resolves (before L.map() is called). Added a second guard inside .then() for the race condition where the component unmounts during import.", { width: 2360 }),
            cell("Resolved ✓", { width: 1700, color: "16A34A", bold: true }),
          ]}),

          // Issue 2
          new TableRow({ children: [
            cell("2", { width: 300, bg: LIGHT_GRAY }),
            cell("PDF extraction — 'Unexpected end of JSON input'", { width: 2200, bg: LIGHT_GRAY }),
            cell("Server route crashing before returning JSON. Error swallowed silently, client got an empty response body. Caused by: missing top-level try/catch and route timing out (default 10s Vercel limit).", { width: 2800, bg: LIGHT_GRAY }),
            cell("Added top-level try/catch to POST handler. Added export const maxDuration = 120 to the route.", { width: 2360, bg: LIGHT_GRAY }),
            cell("Resolved ✓", { width: 1700, color: "16A34A", bold: true, bg: LIGHT_GRAY }),
          ]}),

          // Issue 3
          new TableRow({ children: [
            cell("3", { width: 300 }),
            cell("PDF extraction — 'pdfParse is not a function'", { width: 2200 }),
            cell("pdf-parse v2 changed its export to a named class (PDFParse). Tried: (a) default import, (b) named import, (c) dynamic import with createRequire, (d) static import of class, (e) Uint8Array conversion instead of Buffer.", { width: 2800 }),
            cell("Removed pdf-parse entirely. Sent PDF bytes as base64 directly to Claude using type: 'document' (native PDF support). Cleaner, more accurate, no dependency.", { width: 2360 }),
            cell("Resolved ✓", { width: 1700, color: "16A34A", bold: true }),
          ]}),

          // Issue 4
          new TableRow({ children: [
            cell("4", { width: 300, bg: LIGHT_GRAY }),
            cell("pdfjs-dist worker error: 'Cannot find module pdf.worker.mjs'", { width: 2200, bg: LIGHT_GRAY }),
            cell("pdfjs-dist requires a Web Worker which is incompatible with Next.js server-side routes. Worker file paths differ between dev and prod bundles.", { width: 2800, bg: LIGHT_GRAY }),
            cell("Same fix as Issue 3 — dropped pdfjs-dist in favour of Claude native PDF support.", { width: 2360, bg: LIGHT_GRAY }),
            cell("Resolved ✓", { width: 1700, color: "16A34A", bold: true, bg: LIGHT_GRAY }),
          ]}),

          // Issue 5
          new TableRow({ children: [
            cell("5", { width: 300 }),
            cell("Google Photos sync returned 403 'insufficient authentication scopes'", { width: 2200 }),
            cell("Old token obtained before photoslibrary.readonly scope was added to the OAuth consent screen Data Access settings. Token claimed scope but Google server rejected it.", { width: 2800 }),
            cell("(a) Added photoslibrary.readonly to Data Access in Google Cloud Console OAuth consent screen. (b) Added DELETE handler to /api/google-photos/status so disconnect actually cleared the token. User then reconnected to get a fresh token.", { width: 2360 }),
            cell("Superseded by Issue 6", { width: 1700, color: "B45309", bold: true }),
          ]}),

          // Issue 6
          new TableRow({ children: [
            cell("6", { width: 300, bg: LIGHT_GRAY }),
            cell("Google Photos sync — 'No photos found for this date range' even after reconnect", { width: 2200, bg: LIGHT_GRAY }),
            cell("Root cause confirmed via debug endpoint: Google Photos Library API (photoslibrary.googleapis.com) is CLOSED to new projects as of late 2024. Token tokeninfo shows correct scope, but every API call returns 403 PERMISSION_DENIED at the project level, not the token level.", { width: 2800, bg: LIGHT_GRAY }),
            cell("Switched to Google Photos Picker API (photospicker.googleapis.com). New scope: photospicker.mediaitems.readonly. Flow: app creates a Picker session → opens Google's own picker UI in new tab → polls for user to finish picking → downloads selected photos and saves to trip.", { width: 2360, bg: LIGHT_GRAY }),
            cell("Resolved ✓", { width: 1700, color: "16A34A", bold: true, bg: LIGHT_GRAY }),
          ]}),

          // Issue 7
          new TableRow({ children: [
            cell("7", { width: 300 }),
            cell("ConnectTimeoutError when calling photoslibrary.googleapis.com", { width: 2200 }),
            cell("Default Node.js fetch timeout (10s) too short for cold connections to Google APIs from local dev server.", { width: 2800 }),
            cell("Added signal: AbortSignal.timeout(60000) to all Google API fetch calls.", { width: 2360 }),
            cell("Resolved ✓", { width: 1700, color: "16A34A", bold: true }),
          ]}),

          // Issue 8
          new TableRow({ children: [
            cell("8", { width: 300, bg: LIGHT_GRAY }),
            cell("Google Photos disconnect button had no effect", { width: 2200, bg: LIGHT_GRAY }),
            cell("Settings page called DELETE /api/google-photos/status but the route only had GET handler. DELETE silently returned 405 and the token remained in the database.", { width: 2800, bg: LIGHT_GRAY }),
            cell("Added DELETE handler to /api/google-photos/status/route.ts that removes the google key from User.authProvider JSON blob and returns 200.", { width: 2360, bg: LIGHT_GRAY }),
            cell("Resolved ✓", { width: 1700, color: "16A34A", bold: true, bg: LIGHT_GRAY }),
          ]}),

          // Issue 9 — placeholder for next issue
          new TableRow({ children: [
            cell("9", { width: 300 }),
            cell("Google Photos Picker — token needs scope update", { width: 2200 }),
            cell("Existing stored token used photoslibrary.readonly scope. New Picker API requires photospicker.mediaitems.readonly. Token refresh does not add new scopes; user must explicitly reconnect.", { width: 2800 }),
            cell("Updated /api/google-photos/auth to request new scope. User must Disconnect then Connect again in Settings to obtain a Picker-capable token.", { width: 2360 }),
            cell("In Progress ⟳", { width: 1700, color: "2563EB", bold: true }),
          ]}),
        ]
      }),

      spacer(),
      spacer(),

      // ─── SECTION 4: PENDING / PLANNED ──────────────────────────────────
      heading1("4.  Pending & Planned Features"),
      bullet("Facebook post itinerary extraction — parse travel posts to auto-fill itinerary items"),
      bullet("Map year / country filters — filter the world map by year visited or country"),
      bullet("Merge import into existing trip — ReviewPanel option to add to an existing trip rather than create new"),
      bullet("Real user authentication — replace hardcoded 'demo-user' with proper auth (NextAuth / Clerk)"),
      bullet("Fare alerts — notify when wishlist destination prices drop"),
      bullet("Mobile-responsive polish — test and refine on small screens"),
      spacer(),
    ]
  }]
});

const buffer = await Packer.toBuffer(doc);
writeFileSync("/Users/howheichern/cherns_sandbox/travel-map/MY_TRAVEL_STORY_DEV_LOG.docx", buffer);
console.log("Document created successfully.");
