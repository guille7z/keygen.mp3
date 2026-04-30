import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRACKER_DIR = path.resolve(__dirname, "..", "static", "trackerfiles");
const OUTPUT_FILE = path.resolve(__dirname, "..", "src", "lib", "songs.ts");

// Simple terminal progress bar
function createProgressBar(label: string) {
  let lastPct = -1;
  return (current: number, total: number) => {
    if (!process.stdout.isTTY) return; // Fallback for non-TTY environments
    const pct = Math.min(100, Math.floor((current / total) * 100));
    if (pct === lastPct) return;
    lastPct = pct;
    
    const barLen = 30;
    const filled = Math.floor((pct / 100) * barLen);
    const empty = barLen - filled;
    process.stdout.write(`\r${label}: [${"█".repeat(filled)}${"░".repeat(empty)}] ${pct}%`);
  };
}

// Recursively collect all files
function walkDir(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  if (!fs.existsSync(TRACKER_DIR)) {
    console.error(`❌ Directory not found: ${TRACKER_DIR}`);
    process.exit(1);
  }

  console.log("📂 Scanning tracker files...");
  const allFiles = walkDir(TRACKER_DIR);
  const total = allFiles.length;

  if (total === 0) {
    console.log("⚠️ No tracker files found.");
    return;
  }

  const progress = createProgressBar("Processing");
  const songs: string[] = [];

  // Build paths with forward slashes & update progress
  for (let i = 0; i < total; i++) {
    const rel = path.relative(TRACKER_DIR, allFiles[i]).replace(/\\/g, "/");
    songs.push(`/trackerfiles/${rel}`);
    progress(i + 1, total);
  }
  process.stdout.write("\n");

  console.log("📝 Sorting by subdirectory & filename...");
  songs.sort((a, b) => {
    // Strip the common prefix to get relative path
    const relA = a.substring("/trackerfiles/".length);
    const relB = b.substring("/trackerfiles/".length);

    // Extract directory and filename
    const dirA = relA.includes("/") ? relA.substring(0, relA.lastIndexOf("/")) : "";
    const dirB = relB.includes("/") ? relB.substring(0, relB.lastIndexOf("/")) : "";
    const nameA = relA.includes("/") ? relA.substring(relA.lastIndexOf("/") + 1) : relA;
    const nameB = relB.includes("/") ? relB.substring(relB.lastIndexOf("/") + 1) : relB;

    // Sort by directory first, then by filename (case-insensitive)
    if (dirA !== dirB) return dirA.localeCompare(dirB);
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });

  console.log("💾 Writing src/lib/songs.ts...");
  const output = `export const songs = [\n${songs.map(s => `    "${s}",`).join("\n")}\n];\n`;
  
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, output, "utf-8");

  console.log(`✅ Done! Generated ${total} songs to ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});