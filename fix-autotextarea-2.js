const fs = require('fs');

const files = [
  'app/app/daily/page.tsx',
  'app/app/journal/new/page.tsx',
  'app/app/journal/[tradeId]/page.tsx',
  'app/app/weekly-review/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Some files might have slightly different spacing, so let's use regex
    content = content.replace(/onChange=\{\(e\) => \{\s*setVal\(e\.target\.value\)\s*\}\}/g, 
      `onChange={(e) => {
        setVal(e.target.value)
        if (props.onChange) props.onChange(e as any)
      }}`);
      
    content = content.replace(/onBlur=\{\(e\) => \{\s*if \(props\.onChange\) \{\s*props\.onChange\(e as any\)\s*\}\s*if \(props\.onBlur\) props\.onBlur\(e\)\s*\}\}/g, 
      `onBlur={(e) => {
        if (props.onBlur) props.onBlur(e)
      }}`);
      
    fs.writeFileSync(file, content, 'utf8');
  }
}