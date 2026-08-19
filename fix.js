const fs = require('fs');
let content = fs.readFileSync('app/app/daily/page.tsx', 'utf8');

const newAutoTextarea = \unction AutoTextarea(props: React.ComponentProps<typeof Textarea>) {
  const [val, setVal] = useState(props.value || '')
  
  useEffect(() => {
    setVal(props.value || '')
  }, [props.value])

  return (
    <Textarea 
      {...props} 
      value={val}
      onChange={(e) => {
        setVal(e.target.value)
      }}
      onBlur={(e) => {
        if (props.onChange) {
          props.onChange(e as any)
        }
      }}
      onInput={(e) => {
        e.currentTarget.style.height = 'auto'
        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
        if (props.onInput) props.onInput(e)
      }}
      className={cn("resize-none overflow-hidden min-h-[40px] px-3 py-2", props.className)}
    />
  )
}\

content = content.replace(/function AutoTextarea\([\s\S]*?className=\{cn\("resize-none overflow-hidden min-h-\[40px\] px-3 py-2", props\.className\)\}\n    \/>\n  \)\n\}/, newAutoTextarea);

fs.writeFileSync('app/app/daily/page.tsx', content, 'utf8');
