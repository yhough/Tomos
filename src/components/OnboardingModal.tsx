'use client'

import { BookOpen, Download, MessageSquare, Search, Sparkles, Users, Zap } from 'lucide-react'
import { useState } from 'react'

interface Step {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  body: string
  hint?: string
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'Welcome to Tomos',
    body: 'Your AI writing companion for long-form fiction. Tomos keeps track of every character, location, and plot thread so you can focus on the writing.',
    hint: 'This tour takes about 30 seconds.',
  },
  {
    icon: MessageSquare,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'Build your world through conversation',
    body: 'In the World tab, narrate events, establish facts, or ask questions. Tomos extracts characters and lore automatically — and flags contradictions in real time.',
    hint: 'The lore sidebar fills up as you write.',
  },
  {
    icon: Users,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
    title: 'Every character, tracked and connected',
    body: 'Characters are created automatically from your writing. The Characters tab shows a relationship map and full profiles that update as your story evolves.',
    hint: 'Click any node in the map to open a character.',
  },
  {
    icon: Zap,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-500/10',
    title: 'Upload chapters, catch issues early',
    body: 'Paste or upload a chapter and Tomos runs it against your entire world — surfacing continuity errors, character inconsistencies, and duplicate content before they compound.',
    hint: 'Analysis takes about 15–30 seconds per chapter.',
  },
  {
    icon: BookOpen,
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-500/10',
    title: 'Your world, ready to share',
    body: 'Export your full world bible as PDF or Markdown at any time — formatted for editors, co-authors, or sensitivity readers. Use ⌘K to search across everything instantly.',
    hint: 'Export lives in the download icon in the top nav.',
  },
]

interface Props {
  userName: string
  onDone: () => void
}

export function OnboardingModal({ userName, onDone }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const Icon = current.icon

  // Personalise the welcome title
  const title = step === 0
    ? `Welcome, ${userName.split(' ')[0]}`
    : current.title

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

        {/* Icon area */}
        <div className="flex justify-center pt-10 pb-6">
          <div className={`w-16 h-16 rounded-2xl ${current.iconBg} flex items-center justify-center`}>
            <Icon size={28} className={current.iconColor} />
          </div>
        </div>

        {/* Text */}
        <div className="px-8 pb-6 text-center">
          <h2
            className="text-xl font-semibold text-foreground mb-3 leading-snug"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            {title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {current.body}
          </p>
          {current.hint && (
            <p className="mt-3 text-xs text-muted-foreground/50 italic">
              {current.hint}
            </p>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all ${
                i === step
                  ? 'w-5 h-1.5 bg-primary'
                  : 'w-1.5 h-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 pb-6">
          <button
            onClick={onDone}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => isLast ? onDone() : setStep((s) => s + 1)}
            style={isLast ? { backgroundColor: 'hsl(var(--grimm-accent))' } : undefined}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isLast
                ? 'text-white hover:opacity-90'
                : 'bg-primary/10 text-primary hover:bg-primary/15'
            }`}
          >
            {isLast ? 'Start writing →' : 'Next'}
          </button>
        </div>

      </div>
    </div>
  )
}
