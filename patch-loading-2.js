const fs = require("fs");

// ===== WEEKLY REVIEW - add skeleton import + loading skeleton =====
let wr = fs.readFileSync("app/app/weekly-review/page.tsx", "utf8");

if (!wr.includes("Skeleton")) {
  wr = wr.replace(
    'import { Label } from "@/components/ui/label";',
    'import { Label } from "@/components/ui/label";\nimport { Skeleton } from "@/components/ui/skeleton";'
  );
}

// Find if there is a loading state return
if (wr.includes("if (loading)") || wr.includes("if(loading)")) {
  wr = wr.replace(
    /if\s*\(loading\)\s*\{[\s\S]*?return[\s\S]*?(?=\n\s*\})/m,
    `if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-28" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    )`
  );
}

fs.writeFileSync("app/app/weekly-review/page.tsx", wr, "utf8");
console.log("DONE: weekly-review loading skeleton");

// ===== NOTEBOOK - fade-in =====
let nb = fs.readFileSync("app/app/notebook/page.tsx", "utf8");
if (!nb.includes("animate-in fade-in")) {
  // Add to the outermost returned div
  nb = nb.replace(
    '<div className="flex flex-col md:flex-row gap-4',
    '<div className="flex flex-col md:flex-row gap-4 animate-in fade-in duration-300'
  );
  // Try another pattern if above didn't match
  if (!nb.includes("animate-in fade-in")) {
    nb = nb.replace(
      'return (\n    <div className="',
      'return (\n    <div className="animate-in fade-in duration-300 '
    );
  }
}
fs.writeFileSync("app/app/notebook/page.tsx", nb, "utf8");
console.log("DONE: notebook fade-in");

// ===== CALENDAR - fade-in =====
let cal = fs.readFileSync("app/app/calendar/page.tsx", "utf8");
if (!cal.includes("animate-in fade-in")) {
  cal = cal.replace(
    'return (\n    <div className="',
    'return (\n    <div className="animate-in fade-in duration-300 '
  );
}
fs.writeFileSync("app/app/calendar/page.tsx", cal, "utf8");
console.log("DONE: calendar fade-in");
