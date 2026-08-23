const fs = require("fs");

// Check journal pagination was applied correctly
let journal = fs.readFileSync("app/app/journal/page.tsx", "utf8");
const hasPage = journal.includes("const [page, setPage] = useState(1)");
const hasSlice = journal.includes(".slice((page - 1) * perPage, page * perPage)");
console.log("Journal pagination - has state:", hasPage, "has slice:", hasSlice);

// Check profile page
let profile = fs.readFileSync("app/app/profile/page.tsx", "utf8");
const hasProfileSaving = profile.includes("saving") || profile.includes("isLoading");
console.log("Profile has loading state:", hasProfileSaving);
// Look for buttons without loading
const profileBtns = (profile.match(/onClick=\{handle/g) || []).length;
console.log("Profile action buttons:", profileBtns);

// Check settings page
let settings = fs.readFileSync("app/app/settings/page.tsx", "utf8");
const hasSettingsSaving = settings.includes("saving") || settings.includes("isLoading");
console.log("Settings has loading state:", hasSettingsSaving);
