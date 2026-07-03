import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { CopyLinkButton } from '@/components/copy-link-button'
import type { RuleCategory } from '@/lib/rules-data'

export function RuleCard({ category }: { category: RuleCategory }) {
  return (
    <section
      id={category.id}
      aria-labelledby={`${category.id}-heading`}
      className="scroll-mt-24 rounded-2xl border border-blue-500/20 bg-slate-900/70 p-5 shadow-[0_0_40px_-20px_rgba(59,130,246,0.5)] sm:p-6"
    >
      {/* Section title with thick vertical blue accent line */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-6 w-1.5 shrink-0 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
        />
        <h2
          id={`${category.id}-heading`}
          className="text-base font-bold tracking-wide text-slate-100 sm:text-lg"
        >
          {category.heading}
        </h2>
      </div>

      {/* Hapus type="multiple" di sini, sisa kodenya sama persis */}
      <Accordion
        className="mt-4 gap-1"
        defaultValue={[category.items[0]?.id]}
      >
        {category.items.map((item) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            id={item.id}
            className="scroll-mt-24 rounded-xl border-b-0"
          >
            <div className="flex items-center gap-2">
              <AccordionTrigger className="flex-1 px-3 text-sm font-semibold text-slate-100 hover:no-underline hover:text-blue-200">
                {item.title}
              </AccordionTrigger>
              <CopyLinkButton anchor={`#${item.id}`} label={item.title} />
            </div>
            <AccordionContent className="whitespace-pre-line px-3 text-sm leading-relaxed text-slate-400">
              {item.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
    )
}

