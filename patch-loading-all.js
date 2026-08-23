const fs = require("fs");

// ===== 1. RULE BOOK - skeleton loading state + fade-in outer + Loader2 on save =====
let rb = fs.readFileSync("app/app/rule-book/page.tsx", "utf8");

// Add Skeleton import
if (!rb.includes("Skeleton")) {
  rb = rb.replace(
    'import { toast } from "sonner"',
    'import { toast } from "sonner"\nimport { Skeleton } from "@/components/ui/skeleton"'
  );
}
// Add Loader2 import if missing
if (!rb.includes("Loader2")) {
  rb = rb.replace(
    "Plus, Save, Trash2, ChevronDown, ChevronRight, History",
    "Plus, Save, Trash2, ChevronDown, ChevronRight, History, Loader2"
  );
}

// Replace loading spinner
rb = rb.replace(
  '<div className="text-center py-12 text-muted-foreground">Loading...</div>',
  `<div className="space-y-4 animate-in fade-in duration-300">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4 pt-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>`
);

// Add animate-in to outer div
rb = rb.replace(
  '<div className="max-w-4xl mx-auto space-y-8 pb-12">',
  '<div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">'
);

// Fix Save Rule button to show Loader2
rb = rb.replace(
  '<Save className="w-4 h-4 mr-2" /> Save Rule',
  '{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}\n              {saving ? "Saving..." : "Save Rule"}'
);

fs.writeFileSync("app/app/rule-book/page.tsx", rb, "utf8");
console.log("DONE: rule-book");

// ===== 2. DAILY - fix saving text =====
let daily = fs.readFileSync("app/app/daily/page.tsx", "utf8");
daily = daily.replace(
  '{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}\n              Save',
  '{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}\n              {saving ? "Saving..." : "Save"}'
);
fs.writeFileSync("app/app/daily/page.tsx", daily, "utf8");
console.log("DONE: daily saving text");

// ===== 3. MONTHLY REVIEW - fix saving text =====
let monthly = fs.readFileSync("app/app/monthly-review/page.tsx", "utf8");
monthly = monthly.replace(
  '{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}\n              Save',
  '{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}\n              {saving ? "Saving..." : "Save"}'
);
fs.writeFileSync("app/app/monthly-review/page.tsx", monthly, "utf8");
console.log("DONE: monthly saving text");
