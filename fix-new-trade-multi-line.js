const fs = require('fs');
let lines = fs.readFileSync('app/app/journal/new/page.tsx', 'utf8').split('\n').map(l => l.replace('\r', ''));

// 1. handlePaste
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('setScreenshot(reader.result as string)') && lines[i].includes('reader.onloadend')) {
    lines[i] = lines[i].replace('setScreenshot(reader.result as string)', 'setScreenshots(s => [...s, reader.result as string])');
  } else if (lines[i].includes('setScreenshot(reader.result as string)')) {
    lines[i] = lines[i].replace('setScreenshot(reader.result as string)', 'setScreenshots(s => [...s, reader.result as string])');
  }
}

// 2. handleUploadScreenshot
const uploadIdx = lines.findIndex(l => l.includes('const handleUploadScreenshot ='));
if (uploadIdx !== -1) {
  let endIdx = uploadIdx;
  while (!lines[endIdx].includes('e.target.value = ""')) endIdx++;
  lines.splice(uploadIdx, endIdx - uploadIdx + 2,
`  const handleUploadScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => setScreenshots(s => [...s, reader.result as string])
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }`
  );
}

// 3. handleSave
const saveIdx = lines.findIndex(l => l.includes('if (screenshot) {'));
if (saveIdx !== -1) {
  let endIdx = saveIdx;
  while (!lines[endIdx].includes('await addScreenshot')) endIdx++;
  endIdx++; // skip the }
  lines.splice(saveIdx, endIdx - saveIdx + 1,
`      if (screenshots.length > 0) {
        for (let i = 0; i < screenshots.length; i++) {
          await addScreenshot(createdTrade.id, "entry_" + i, screenshots[i])
        }
      }`
  );
}

// 4. UI
const uiIdx = lines.findIndex(l => l.includes('{!screenshot ? ('));
if (uiIdx !== -1) {
  let endIdx = uiIdx;
  while (!lines[endIdx].includes('onClick={() => setScreenshot(null)}')) endIdx++;
  endIdx += 6; // skip the rest of the block
  
  lines.splice(uiIdx, endIdx - uiIdx,
`            {screenshots.length === 0 ? (
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-xl py-12 text-center cursor-pointer hover:bg-muted/10 transition-colors group">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Upload Images</p>
                </div>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadScreenshot} />
              </label>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screenshots.map((sc, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border aspect-video">
                    <img src={sc} alt="Screenshot" className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        if (window.confirm("Are you sure you want to remove this screenshot?")) {
                          setScreenshots(s => s.filter((_, i) => i !== idx))
                        }
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-destructive text-white rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-xl py-12 text-center cursor-pointer hover:bg-muted/10 transition-colors group aspect-video">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-medium">Add More</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadScreenshot} />
                </label>
              </div>
            )}`
  );
}

fs.writeFileSync('app/app/journal/new/page.tsx', lines.join('\n'), 'utf8');