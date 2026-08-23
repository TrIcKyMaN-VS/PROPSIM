const fs = require('fs');
let content = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8');

const target = `  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !trade) return
    const reader = new FileReader()
    reader.onloadend = async () => {
      await addScreenshot(trade.id, \`gallery-\${Date.now()}\`, reader.result as string)
      toast.success("Screenshot uploaded!")
    }
    reader.readAsDataURL(file)
          e.preventDefault()
    e.target.value = ""
  }`;

const repl = `  const [uploadingImg, setUploadingImg] = useState(false)
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

content = content.replace(target, repl);
fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', content, 'utf8');