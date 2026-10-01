import { SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebounced } from '@/hooks/use-search-state'

export function SearchBox({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  const [draft, setDraft] = useDebounced(value, onChange)
  return (
    <div className={`relative min-w-48 flex-1 sm:max-w-80 ${className ?? ''}`}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} className="pl-8" aria-label={placeholder} />
    </div>
  )
}

export function Segmented<V extends string>({ value, options, onChange, label }: { value: V; options: [V, string][]; onChange: (v: V) => void; label: string }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(v) => onChange((v || options[0][0]) as V)}
      aria-label={label}
    >
      {options.map(([v, text]) => (
        <ToggleGroupItem key={v} value={v} className="px-3">
          {text}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
