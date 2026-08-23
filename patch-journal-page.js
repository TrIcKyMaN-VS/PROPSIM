const fs = require("fs");
let content = fs.readFileSync("app/app/journal/page.tsx", "utf8");

// The slice is there but state declaration is missing. Add it.
if (!content.includes("const perPage")) {
  content = content.replace(
    "const [isImportOpen, setIsImportOpen] = useState(false)",
    "const [isImportOpen, setIsImportOpen] = useState(false)\n  const [page, setPage] = useState(1)\n  const perPage = 50"
  );
}

// Fix search reset page
if (!content.includes('setSearchQuery(e.target.value); setPage(1)')) {
  content = content.replace(
    "onChange={e => setSearchQuery(e.target.value)}",
    "onChange={e => { setSearchQuery(e.target.value); setPage(1); }}"
  );
}

fs.writeFileSync("app/app/journal/page.tsx", content, "utf8");
console.log("DONE: journal pagination state added");

// Check again
let final = fs.readFileSync("app/app/journal/page.tsx", "utf8");
console.log("Has perPage:", final.includes("const perPage"));
console.log("Has useState page:", final.includes("const [page, setPage]"));
