const fs = require('fs');
let content = fs.readFileSync('components/app/import-dialog.tsx', 'utf8');

content = content.replace('import Papa from "papaparse"\n', '');
content = content.replace('import * as XLSX from "xlsx"\n', '');

content = content.replace(
  '      if (file.name.endsWith(\'.csv\')) {',
  `      if (file.name.endsWith('.csv')) {
        const Papa = (await import('papaparse')).default`
);

content = content.replace(
  '      } else if (file.name.endsWith(\'.xlsx\') || file.name.endsWith(\'.xls\')) {',
  `      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const XLSX = await import('xlsx')`
);

fs.writeFileSync('components/app/import-dialog.tsx', content, 'utf8');
console.log('Lazy loaded heavy parsing libraries.');
