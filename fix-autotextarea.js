const fs = require('fs');
const glob = require('glob'); // Not available by default in standard node, I'll just use manual paths.

const files = [
  'app/app/daily/page.tsx',
  'app/app/journal/new/page.tsx',
  'app/app/journal/[tradeId]/page.tsx',
  'app/app/weekly-review/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace the onChange block
    const oldOnChange = `onChange={(e) => {
        setVal(e.target.value)
      }}`;
    
    const newOnChange = `onChange={(e) => {
        setVal(e.target.value)
        if (props.onChange) props.onChange(e as any)
      }}`;

    content = content.replace(oldOnChange, newOnChange);
    
    // Remove the onChange from onBlur
    const oldOnBlur = `onBlur={(e) => {
        if (props.onChange) {
          props.onChange(e as any)
        }
        if (props.onBlur) props.onBlur(e)
      }}`;
      
    const newOnBlur = `onBlur={(e) => {
        if (props.onBlur) props.onBlur(e)
      }}`;
      
    content = content.replace(oldOnBlur, newOnBlur);
    
    fs.writeFileSync(file, content, 'utf8');
  }
}