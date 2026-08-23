const fs = require('fs');
let content = fs.readFileSync('app/app/daily/page.tsx', 'utf8');

const lines = content.split('\n');
const markerIdx = lines.findIndex(l => l.includes('setPreMarketScreenshots([])'));

const restoredCode = `        setPostSessionScreenshots([])
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [date])

  const [uploadingImg, setUploadingImg] = useState(false)
  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>, target: 'pre' | 'post') => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImg(true)
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        formData.append("prefix", "daily_" + target + "_" + date)
        const url = await uploadImageFormData(formData)
        newUrls.push(url)
      }
      if (target === 'pre') setPreMarketScreenshots((s: string[]) => [...s, ...newUrls])
      else setPostSessionScreenshots((s: string[]) => [...s, ...newUrls])
    } catch {
      toast.error("Image upload failed")
    } finally {
      setUploadingImg(false)
    }
    e.target.value = ""
  }

  const [viewImage, setViewImage] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)`;

lines.splice(markerIdx + 1, 0, restoredCode);
fs.writeFileSync('app/app/daily/page.tsx', lines.join('\n'), 'utf8');