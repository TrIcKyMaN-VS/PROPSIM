const fs = require('fs');
let content = fs.readFileSync('app/app/journal/new/page.tsx', 'utf8');

// Replace string | null with string[]
content = content.replace(/const \[screenshot, setScreenshot\] = useState<string \| null>\(null\)/,
`const [screenshots, setScreenshots] = useState<string[]>([])
  const [uploadingImg, setUploadingImg] = useState(false)`);

// Import uploadImageFormData
content = content.replace(/import \{ addTrade \} from "@\/app\/actions\/trade-actions"/,
`import { addTrade } from "@/app/actions/trade-actions"
import { uploadImageFormData } from "@/app/actions/journal-actions"`);

// Handle Paste (to support multiple)
content = content.replace(/reader\.onloadend = \(\) => \{\s*setScreenshot\(reader\.result as string\)\s*toast\.success\("Screenshot pasted!"\)\s*\}/,
`reader.onloadend = async () => {
            setUploadingImg(true)
            try {
              const formData = new FormData()
              formData.append("file", file)
              formData.append("prefix", "new_trade_paste")
              const url = await uploadImageFormData(formData)
              setScreenshots(s => [...s, url])
              toast.success("Screenshot pasted!")
            } catch {
              toast.error("Paste upload failed")
            } finally {
              setUploadingImg(false)
            }
          }`);

// Handle upload
content = content.replace(/const handleUploadScreenshot = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?reader\.readAsDataURL\(file\)\n\s*e\.target\.value = ""\n\s*\}/,
`const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImg(true)
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        formData.append("prefix", "new_trade")
        const url = await uploadImageFormData(formData)
        newUrls.push(url)
      }
      setScreenshots(s => [...s, ...newUrls])
    } catch {
      toast.error("Image upload failed")
    } finally {
      setUploadingImg(false)
    }
    e.target.value = ""
  }`);

// Handle Save
content = content.replace(/if \(screenshot\) \{\s*await addScreenshot\(createdTrade\.id, "entry", screenshot\)\s*\}/,
`if (screenshots.length > 0) {
        for (let i = 0; i < screenshots.length; i++) {
          await addScreenshot(createdTrade.id, "entry_" + i, screenshots[i])
        }
      }`);

// UI Section
const uiRegex = /\{!screenshot \? \([\s\S]*?\}\s*<\/button>\s*<\/div>\s*\)\}/;
const newUi = `{screenshots.length === 0 ? (
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-xl py-12 text-center cursor-pointer hover:bg-muted/10 transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {uploadingImg ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{uploadingImg ? "Uploading..." : "Upload Images"}</p>
                  </div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadScreenshot} disabled={uploadingImg} />
                </label>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {screenshots.map((url, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border aspect-video">
                      <img src={url} alt="Screenshot" className="w-full h-full object-cover" />
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
                    {uploadingImg ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                    <span className="text-xs font-medium">Add More</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadScreenshot} disabled={uploadingImg} />
                  </label>
                </div>
              )}`;
content = content.replace(uiRegex, newUi);

fs.writeFileSync('app/app/journal/new/page.tsx', content, 'utf8');