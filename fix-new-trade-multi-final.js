const fs = require('fs');
let content = fs.readFileSync('app/app/journal/new/page.tsx', 'utf8');

// 1
content = content.replace(
  'const [screenshot, setScreenshot] = useState<string | null>(null)',
  'const [screenshots, setScreenshots] = useState<string[]>([])'
);

// 2
content = content.replace(
  'reader.onloadend = () => {\n            setScreenshot(reader.result as string)',
  'reader.onloadend = () => {\n            setScreenshots(s => [...s, reader.result as string])'
);

// 3
const origUpload = `  const handleUploadScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setScreenshot(reader.result as string)
    reader.readAsDataURL(file)
          e.preventDefault()
    e.target.value = ""
  }`;
const newUpload = `  const handleUploadScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => setScreenshots(s => [...s, reader.result as string])
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }`;
content = content.replace(origUpload, newUpload);

// 4
const origSave = `      if (screenshot) {
        await addScreenshot(createdTrade.id, "entry", screenshot)
      }`;
const newSave = `      if (screenshots.length > 0) {
        for (let i = 0; i < screenshots.length; i++) {
          await addScreenshot(createdTrade.id, "entry_" + i, screenshots[i])
        }
      }`;
content = content.replace(origSave, newSave);

// 5
const origUi = `            {!screenshot ? (
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-xl py-12 text-center cursor-pointer hover:bg-muted/10 transition-colors group">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Upload Image</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadScreenshot} />
              </label>
            ) : (
              <div className="relative rounded-lg overflow-hidden border">
                <img src={screenshot} alt="Screenshot" className="w-full h-auto object-cover" />
                <button 
                  onClick={() => setScreenshot(null)}
                  className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-destructive text-white rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}`;
const newUi = `{screenshots.length === 0 ? (
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
            )}`;
content = content.replace(origUi, newUi);

// 6
content = content.replace('Chart Screenshot', 'Chart Screenshots');

fs.writeFileSync('app/app/journal/new/page.tsx', content, 'utf8');