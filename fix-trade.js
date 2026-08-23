const fs = require('fs');
let content = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8');

const regex = /const handleFileUpload = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?e\.target\.value = ""\n\s*\}/;

const replacement = `const [uploadingImg, setUploadingImg] = useState(false)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !trade) return
    setUploadingImg(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        formData.append("prefix", "trade_" + trade.id)
        const url = await uploadImageFormData(formData)
        await addScreenshot(trade.id, "gallery-" + Date.now() + "-" + i, url)
      }
      toast.success("Screenshots uploaded!")
    } catch {
      toast.error("Screenshot upload failed")
    } finally {
      setUploadingImg(false)
    }
    e.target.value = ""
  }`;

content = content.replace(regex, replacement);

content = content.replace(/handleDeleteScreenshot\(sc\.id\) \}\}/, 
`handleDeleteScreenshot(sc.id)
                          }
                        }}`);

content = content.replace(/const handleDeleteScreenshot = async \(id: string\) => \{/,
`const handleDeleteScreenshot = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this screenshot?")) return;`);

content = content.replace(/<input id="sc-upload" type="file" accept="image\/\*" className="hidden" onChange=\{handleFileUpload\} \/>/,
`<input id="sc-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />`);

content = content.replace(/<input id="sc-upload-more" type="file" accept="image\/\*" className="hidden" onChange=\{handleFileUpload\} \/>/,
`<input id="sc-upload-more" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploadingImg} />`);

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', content, 'utf8');