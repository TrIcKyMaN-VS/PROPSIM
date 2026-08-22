const fs = require('fs');
let c = fs.readFileSync('components/ui/calendar.tsx', 'utf8');
if(!c.includes('weeknumber')) {
    c = c.replace('row: "flex w-full mt-2",', 'row: "flex w-full mt-2",\n        weeknumber: "text-muted-foreground text-xs font-bold w-9 flex items-center justify-center",');
    fs.writeFileSync('components/ui/calendar.tsx', c, 'utf8');
}
