const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

const lines = content.split('\n');
const formStart = lines.findIndex(l => l.includes('{/* Add form */}'));
const formEnd = lines.findIndex(l => l.includes('{/* Logged missed trades list */}'));

// Extract the form JSX block inside the {showMissedForm && ( ... )} condition
let formJsxLines = lines.slice(formStart + 1, formEnd);
// The first line is `{showMissedForm && (` and the last line is `)}`
// We want to grab what's inside.
let formInner = formJsxLines.slice(1, -1).join('\n');

// We need to insert a function `renderMissedForm = () => ( ... )` right before the return statement of the component.
const returnIndex = lines.findIndex(l => l.match(/return \(\s*$/) || (l.includes('return (') && lines[lines.indexOf(l)+1].includes('<')));

const renderFunction = `
  const renderMissedForm = () => (
${formInner}
  );
`;

lines.splice(returnIndex, 0, renderFunction);

// Now replace the original form block with our conditional logic
const newFormBlock = `
            {/* Add new form at top */}
            {showMissedForm && !editingMissedId && renderMissedForm()}
`;

// Recalculate indices since we added lines
const newFormStart = lines.findIndex(l => l.includes('{/* Add form */}'));
const newFormEnd = lines.findIndex(l => l.includes('{/* Logged missed trades list */}'));

lines.splice(newFormStart, newFormEnd - newFormStart, newFormBlock);

// Now update the mapped list to render the form inline if editing
const mapStart = lines.findIndex(l => l.includes('{missedTrades.map(t => {'));
// Insert the condition right after `const expanded = expandedMissed[t.id]`
const expandedLine = lines.findIndex(l => l.includes('const expanded = expandedMissed[t.id]'));

const inlineCondition = `
                  if (t.id === editingMissedId) {
                    return <div key={t.id} className="my-2">{renderMissedForm()}</div>;
                  }
`;

lines.splice(expandedLine + 1, 0, inlineCondition);

fs.writeFileSync('app/app/weekly-review/page.tsx', lines.join('\n'), 'utf8');
console.log('Successfully patched the form inline logic!');
