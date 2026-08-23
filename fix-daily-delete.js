const fs = require('fs');
let content = fs.readFileSync('app/app/daily/page.tsx', 'utf8');

const replacement = `            >
              <img src={sc} alt="Screenshot" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
              {onRemove && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    if (window.confirm("Are you sure you want to remove this screenshot?")) {
                      onRemove(idx)
                    }
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-destructive text-white rounded opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <label
            htmlFor={\`upload-more-\${id}\`}
`;

// It looks like replace_file_content accidentally removed lines. Let's fix lines 95-103 using regex replace
content = content.replace(/className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted\/20 cursor-pointer"\s*onClick=\{\(\) => onView\(sc\)\}\s*className="aspect-video/m, 
`className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer"
              onClick={() => onView(sc)}
${replacement}            className="aspect-video`);

fs.writeFileSync('app/app/daily/page.tsx', content, 'utf8');