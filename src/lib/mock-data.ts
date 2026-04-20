import type { WorldMessageData } from '@/components/WorldMessage'
import type { LoreEntry } from '@/components/LoreSlideOver'
import type { CharacterFull } from '@/components/CharacterDetailSlideOver'

export const MOCK_BOOK_ID = 'mock-book-1'

// ── Characters ────────────────────────────────────────────────────────────────

export const mockCharacters: CharacterFull[] = [
  {
    id: 'char-1',
    name: 'Kael Ardenvoss',
    role: 'protagonist',
    status: 'alive',
    description:
      'A disgraced general who vanished three months ago after intercepting a courier meant for the Threadweavers. He carries a secret that could expose the society — and end him.',
    arc_status: 'Hunted. Moving south through the Eastern Provinces toward the Scholar\'s Quarter.',
    data: JSON.stringify({
      traits: ['Methodical', 'Haunted', 'Loyal to a fault', 'Tactically brilliant'],
      relationships: [
        { character_name: 'Queen Isaveth', description: 'His former liege. She signed his disgrace. He still believes in the empire she was supposed to be.' },
        { character_name: 'Renara Voss', description: 'Unknown to each other. Their paths have not yet crossed.' },
      ],
      notable_moments: [
        'Intercepted and read a Threadweaver courier — the first outsider to learn of their existence in a decade.',
        'Survived three assassination attempts since going dark.',
        'Left his general\'s signet at the wreckage of the Ashwall Gate as a message to whoever was following him.',
      ],
    }),
  },
  {
    id: 'char-2',
    name: 'Queen Isaveth Vranel',
    role: 'antagonist',
    status: 'alive',
    description:
      'The third monarch to rely on the Threadweavers. She does not know how deep their roots go — only that the price of their loyalty has been climbing for years.',
    arc_status: 'Consolidating power while quietly terrified of what Kael knows.',
    data: JSON.stringify({
      traits: ['Calculating', 'Publicly gracious', 'Privately paranoid', 'Pragmatic'],
      relationships: [
        { character_name: 'Kael Ardenvoss', description: 'She disgraced him to protect the Threadweavers. She is not certain she made the right call.' },
        { character_name: 'Lord Therin Mast', description: 'She tolerates his autonomy because the Eastern Provinces are too costly to discipline right now.' },
      ],
      notable_moments: [
        'Doubled the Valdris garrison on the advice of her Threadweaver handler — without knowing the real reason.',
        'Personally reviewed and approved Kael\'s arrest warrant, then destroyed her own copy.',
      ],
    }),
  },
  {
    id: 'char-3',
    name: 'Renara Voss',
    role: 'supporting',
    status: 'alive',
    description:
      'Guildmaster of the Merchant\'s Consortium. Built her power on neutrality and information. Currently watching the empire\'s behavior with growing concern and growing opportunity.',
    arc_status: 'Neutral — but accumulating leverage as the empire grows desperate.',
    data: JSON.stringify({
      traits: ['Patient', 'Brilliant networker', 'Ruthlessly transactional', 'Privately principled'],
      relationships: [
        { character_name: 'Queen Isaveth Vranel', description: 'A business relationship. The Queen buys Consortium neutrality; Voss sells it at a premium.' },
      ],
      notable_moments: [
        'Her informants noticed the Threadweaver network activating across the Scholar\'s Quarter — she doesn\'t know why yet.',
        'Quietly rerouted three northern trade ships after the early winter storms, personally absorbing the loss to keep member houses loyal.',
      ],
    }),
  },
  {
    id: 'char-4',
    name: 'Lord Therin Mast',
    role: 'supporting',
    status: 'alive',
    description:
      'Governor of the Eastern Provinces. A pragmatist who has kept his territory stable by knowing when to look the other way — and when not to.',
    arc_status: 'Unaware that Kael is in his territory. When he finds out, the calculus changes.',
    data: JSON.stringify({
      traits: ['Pragmatic', 'Quietly ambitious', 'Protective of his people', 'Skeptical of Valdris'],
      relationships: [
        { character_name: 'Queen Isaveth Vranel', description: 'Pays tribute. Resists overreach. A managed tension.' },
        { character_name: 'Kael Ardenvoss', description: 'They served together during the northern campaigns. Mast owes him a debt.' },
      ],
      notable_moments: [
        'Refused a direct imperial request to quarter two legions in his provinces — and got away with it.',
      ],
    }),
  },
]

export const mockBook = {
  id: MOCK_BOOK_ID,
  title: 'The Shattered Crown',
  genre: 'Dark Fantasy',
  logline:
    'The kingdom of Valdris teeters on collapse as magic fades and the Threadweavers tighten their grip on the throne.',
}

// ── Lore sidebar data ─────────────────────────────────────────────────────────

export const mockLoreSections: {
  characters: LoreEntry[]
  factions: LoreEntry[]
  locations: LoreEntry[]
  magic: LoreEntry[]
  misc: LoreEntry[]
} = {
  characters: [],
  factions: [
    {
      id: 'lore-1',
      category: 'faction',
      name: 'The Threadweavers',
      summary: 'A secret society embedded in the imperial court that can manipulate fate itself.',
      data: JSON.stringify({
        founded: 'Unknown — predates the current dynasty',
        power: 'Fate manipulation, imperial intelligence network',
        allegiance: 'The Queen, privately',
        publicFace: 'Do not officially exist',
        weakness: 'Each working of fate requires physical sacrifice',
      }),
    },
    {
      id: 'lore-2',
      category: 'faction',
      name: "The Merchant's Consortium",
      summary: 'Controls all northern trade routes. Currently neutral but economically vulnerable.',
      data: JSON.stringify({
        headquarters: 'Port Ashenveil, northern coast',
        power: 'Monopoly on northern shipping lanes',
        currentStatus: 'Struggling after early winter storms disrupted primary routes',
        leader: 'Guildmaster Renara Voss',
      }),
    },
  ],
  locations: [
    {
      id: 'lore-3',
      category: 'location',
      name: 'Valdris',
      summary: 'The imperial capital and seat of the throne.',
      data: JSON.stringify({
        population: 'Approximately 400,000',
        notableFeatures: 'The Spire, the imperial palace, the Scholar\'s Quarter',
        currentStatus: 'Tense — garrison doubled by royal decree last month',
        atmosphere: 'Paranoid, watchful, outwardly calm',
      }),
    },
    {
      id: 'lore-4',
      category: 'location',
      name: 'The Eastern Provinces',
      summary: 'Technically loyal to the empire but practically autonomous. Where Kael is hiding.',
      data: JSON.stringify({
        governor: 'Lord Therin Mast, a pragmatist',
        relationship: 'Pays tribute but resists imperial overreach',
        currentStatus: "Unaware of Kael's presence officially",
      }),
    },
  ],
  magic: [
    {
      id: 'lore-7',
      category: 'magic',
      name: 'Fate Manipulation',
      summary: "The Threadweavers' core ability. Requires physical sacrifice proportional to the scale of change.",
      data: JSON.stringify({
        cost: 'Minor changes — a bruise. Major changes — years of life. World-altering — death.',
        limitations: 'Cannot change what has already been witnessed by many',
        practitioners: 'Only confirmed among the Threadweavers',
      }),
    },
  ],
  misc: [
    {
      id: 'lore-5',
      category: 'misc',
      name: 'The Dying of Magic',
      summary:
        'Magic requires physical sacrifice — the more powerful the working, the greater the cost. It has been weakening for a generation.',
      data: JSON.stringify({
        cause: 'Unknown publicly. The Threadweavers know the truth.',
        symptoms: 'Spells failing mid-cast, scholars going mad, magical artifacts going dark',
        timeline: 'Began approximately 30 years ago, accelerating recently',
      }),
    },
    {
      id: 'lore-6',
      category: 'misc',
      name: 'The Ashwall Gate',
      summary: 'A gate at the northern border destroyed in the war of 412. Never rebuilt.',
      data: JSON.stringify({
        destroyed: 'Year 412, siege of the northern clans',
        significance: 'Its ruins mark the northernmost point of imperial territory',
        currentStatus: 'Rubble. Considered cursed by locals.',
      }),
    },
  ],
}

// ── Chat messages ─────────────────────────────────────────────────────────────

export const mockMessages: WorldMessageData[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    content:
      "The Shattered Crown awaits its chronicler. An empire frays at its edges while a throne built on secrets grows heavier by the day — and somewhere in the eastern dust, a disgraced general carries knowledge that could unravel everything. Where would you like to begin?",
    metadata: '{}',
    created_at: new Date('2024-01-15T09:00:00').getTime(),
    ripple_cards: [],
  },
  {
    id: 'msg-2',
    role: 'user',
    content:
      "The queen orders the Threadweavers to locate Kael before he reaches the Scholar's Quarter in Valdris.",
    metadata: '{}',
    created_at: new Date('2024-01-15T09:01:00').getTime(),
    ripple_cards: [],
  },
  {
    id: 'msg-3',
    role: 'assistant',
    content:
      "The order ripples through the Threadweavers' invisible network like a stone dropped in still water — quiet on the surface, violent beneath. Kael has been a ghost for three months, but the Queen does not issue such commands without reason. Whatever he took from that courier, she wants it back before it finds scholarly eyes.",
    metadata: '{}',
    created_at: new Date('2024-01-15T09:01:30').getTime(),
    ripple_cards: [
      {
        id: 'ripple-1',
        title: "Consortium Intelligence Risk",
        description:
          "The Merchant's Consortium has informants in the Scholar's Quarter — if the Threadweavers move openly, Guildmaster Renara Voss will know the empire is hunting someone important, which gives her unexpected leverage.",
        status: 'pending',
      },
      {
        id: 'ripple-2',
        title: 'Provincial Suspicion',
        description:
          'The eastern garrison doubling now makes sense to provincial lords as preparation for a manhunt rather than external threat — Lord Therin Mast may begin asking uncomfortable questions.',
        status: 'pending',
      },
    ],
  },
  {
    id: 'msg-4',
    role: 'user',
    content: "Kael arrives at the Ashwall Gate and passes through its intact archway.",
    metadata: '{}',
    created_at: new Date('2024-01-15T09:05:00').getTime(),
    ripple_cards: [],
  },
  {
    id: 'msg-5',
    role: 'assistant',
    content:
      "The Ashwall Gate was destroyed in the war of 412 and has never been rebuilt — its ruins mark the northernmost point of imperial territory and are considered cursed by locals. This contradicts established lore.",
    metadata: JSON.stringify({
      contradictions: [
        {
          description:
            "The Ashwall Gate was established as destroyed rubble in the war of 412 and never rebuilt. This input has Kael passing through its intact archway.",
          existing: "Ashwall Gate — Rubble. Destroyed in Year 412, siege of the northern clans. Never rebuilt.",
          resolution_options: [
            "Override: retcon the gate as partially rebuilt",
            "Override: it was a different gate Kael passed through",
            "Cancel and revise the narration",
          ],
        },
      ],
    }),
    created_at: new Date('2024-01-15T09:05:10').getTime(),
    ripple_cards: [],
  },
  {
    id: 'msg-6',
    role: 'user',
    content: "What would the Merchant's Consortium do if the northern war escalates?",
    metadata: '{}',
    created_at: new Date('2024-01-15T09:08:00').getTime(),
    ripple_cards: [],
  },
  {
    id: 'msg-7',
    role: 'assistant',
    content:
      "The Consortium would fracture before it would fight. Guildmaster Renara Voss has built her power on neutrality — the moment the empire demands sides, half her member houses would break for whoever promised to reopen the northern lanes fastest. If pressed, she would sell intelligence to both sides and call it pragmatism.",
    metadata: '{}',
    created_at: new Date('2024-01-15T09:08:20').getTime(),
    ripple_cards: [],
  },
  // ── Correction flow demo — pending state ──────────────────────────────────
  {
    id: 'msg-8',
    role: 'user',
    content:
      "Actually, Kael arrived on foot in chapter 3 — he had released his horse after the courier confrontation to avoid being tracked.",
    metadata: '{}',
    created_at: new Date('2024-01-15T09:10:00').getTime(),
    ripple_cards: [],
  },
  {
    id: 'msg-9',
    role: 'assistant',
    content:
      "You're updating Kael's arrival in Chapter 3 from horseback to on foot — this will resolve the continuity flag about his horse and update the chapter summary. Shall I apply this change?",
    metadata: JSON.stringify({
      input_type: 'correction',
      is_correction: true,
      correction_status: 'pending_confirmation',
      correction_data: {
        summary: "Kael's arrival in Chapter 3 corrected from horseback to on foot",
        whatChanged: 'Kael arrives on horseback in Chapter 3',
        whatItBecomes:
          'Kael arrives on foot in Chapter 3, having released his horse after the courier confrontation',
        affectedEntities: {
          loreEntries: [],
          characters: ['Kael Ardenvoss'],
          chapterFlags: ['flag-2'],
          chapterSummaries: [3],
        },
        proposedDiff: {
          loreEntryUpdates: [],
          characterUpdates: [],
          chapterSummaryUpdates: [
            {
              chapterNumber: 3,
              oldSentence:
                "Kael arrives at Lord Therin Mast's estate in the eastern provinces, exhausted and injured.",
              newSentence:
                "Kael arrives on foot at Lord Therin Mast's estate in the eastern provinces, exhausted and injured, having released his horse days earlier to avoid being tracked.",
            },
          ],
          flagsToResolve: ['flag-2'],
        },
      },
      state_updates: [],
      contradictions: [],
    }),
    created_at: new Date('2024-01-15T09:10:10').getTime(),
    ripple_cards: [],
  },
  // ── Correction flow demo — confirmed state ────────────────────────────────
  {
    id: 'msg-10',
    role: 'user',
    content:
      "Also — the queen's name should be Isaveth throughout chapter 2, not Seraphel. That was an earlier draft name.",
    metadata: '{}',
    created_at: new Date('2024-01-15T09:11:00').getTime(),
    ripple_cards: [],
  },
  {
    id: 'msg-11',
    role: 'assistant',
    content:
      "You're renaming the queen from Seraphel to Isaveth in Chapter 2 — this will update the chapter summary and her character profile. Shall I apply this change?",
    metadata: JSON.stringify({
      input_type: 'correction',
      is_correction: true,
      correction_status: 'confirmed',
      correction_data: {
        summary: "Queen's name corrected from Seraphel to Isaveth in Chapter 2",
        whatChanged: 'Queen referred to as Seraphel in Chapter 2',
        whatItBecomes: 'Queen referred to as Isaveth Vranel in Chapter 2',
        affectedEntities: {
          loreEntries: [],
          characters: ['Queen Isaveth Vranel'],
          chapterFlags: [],
          chapterSummaries: [2],
        },
        proposedDiff: {
          loreEntryUpdates: [],
          characterUpdates: [],
          chapterSummaryUpdates: [
            {
              chapterNumber: 2,
              oldSentence: 'Queen Seraphel receives word of the courier\'s disappearance',
              newSentence: 'Queen Isaveth receives word of the courier\'s disappearance',
            },
          ],
          flagsToResolve: [],
        },
      },
      state_updates: [],
      contradictions: [],
    }),
    created_at: new Date('2024-01-15T09:11:20').getTime(),
    ripple_cards: [],
  },
]
type CorrectionNote = { id: string; summary: string; appliedAt: string; worldMessageId: string }
type ChapterFlag = { id: string; severity: 'error' | 'warning'; description: string; resolved: boolean; resolvedBy?: string }

// Mock Chapters
export const mockChapters: Array<{
  id: string
  number: number
  title: string
  wordCount: number
  summary: string | null
  processed: boolean
  createdAt: Date
  flags: ChapterFlag[]
  charactersAppearing: string[]
  correctionNotes: CorrectionNote[]
}> = [
  {
    id: "chapter-1",
    number: 1,
    title: "The Courier's Last Mile",
    wordCount: 4821,
    summary:
      "Kael intercepts a Threadweaver courier on a mountain road three days east of Valdris. The confrontation is brief and brutal. What he finds in the courier's satchel — a sealed letter bearing the queen's private cipher — changes everything he thought he understood about his own disgrace. He rides east with no clear plan except distance.",
    processed: true,
    createdAt: new Date("2024-01-10T14:00:00"),
    flags: [
      {
        id: "flag-1",
        severity: "warning",
        resolved: false,
        description:
          "Kael is described as carrying his general's insignia in this chapter, but his rank was stripped before the story begins. This may be intentional — a character detail worth clarifying.",
      },
    ],
    charactersAppearing: ["Kael Drovyn", "The Courier"],
    correctionNotes: [],
  },
  {
    id: "chapter-2",
    number: 2,
    title: "The Weight of the Throne",
    wordCount: 5103,
    summary:
      "Queen Isaveth receives word of the courier's disappearance during a formal audience with Guildmaster Renara Voss. She does not react visibly. The chapter intercuts between the public performance of imperial stability and a private meeting afterward where Isaveth issues the order to locate Kael — not through the usual channels, but directly through the Threadweavers. Voss, watching from across the room, notices something is wrong.",
    processed: true,
    createdAt: new Date("2024-01-12T10:00:00"),
    flags: [],
    charactersAppearing: ["Queen Isaveth Vranel", "Guildmaster Renara Voss"],
    correctionNotes: [
      {
        id: "cn-2",
        summary: "Queen's name corrected from Seraphel to Isaveth throughout Chapter 2",
        appliedAt: "2024-01-15T09:11:20",
        worldMessageId: "msg-11",
      },
    ],
  },
  {
    id: "chapter-3",
    number: 3,
    title: "Eastern Hospitality",
    wordCount: 3967,
    summary:
      "Kael arrives on foot at Lord Therin Mast's estate in the eastern provinces, exhausted and injured, having released his horse days earlier to avoid being tracked. Therin takes him in without asking questions — which Kael understands is its own kind of question. The chapter is quiet: a meal, a fire, two men who've known each other a long time not saying the important things. By the end Kael has decided he needs to reach Valdris, specifically the Scholar's Quarter. He doesn't tell Therin why.",
    processed: true,
    createdAt: new Date("2024-01-14T16:00:00"),
    flags: [
      {
        id: "flag-2",
        severity: "error",
        resolved: true,
        resolvedBy: "msg-9",
        description:
          "Chapter 3 describes Kael arriving on horseback, but Chapter 1 established he released his horse after the courier confrontation to avoid being tracked. This is a direct continuity error.",
      },
      {
        id: "flag-3",
        severity: "warning",
        resolved: false,
        description:
          "Therin's estate is described as being in 'the northern reaches of the eastern provinces' — this places it very close to the Ashwall Gate ruins. Worth confirming this is intentional given the Gate's significance.",
      },
    ],
    charactersAppearing: ["Kael Ardenvoss", "Lord Therin Mast"],
    correctionNotes: [
      {
        id: "cn-1",
        summary: "Kael's arrival corrected from horseback to on foot",
        appliedAt: "2024-01-15T09:10:10",
        worldMessageId: "msg-9",
      },
    ],
  },
  {
    id: "chapter-4",
    number: 4,
    title: "What the Scholars Keep",
    wordCount: 0,
    summary: null,
    processed: false,
    createdAt: new Date("2024-01-18T09:00:00"),
    flags: [],
    charactersAppearing: [],
    correctionNotes: [],
  },
];

export const mockProcessingSteps = [
  {
    id: "step-1",
    label: "Summarizing chapter",
    description: "Reading and distilling what happened",
    status: "complete" as const,
  },
  {
    id: "step-2",
    label: "Extracting characters",
    description: "Finding who appears and what we learn about them",
    status: "complete" as const,
  },
  {
    id: "step-3",
    label: "Extracting world facts",
    description: "Logging new locations, lore, and events",
    status: "complete" as const,
  },
  {
    id: "step-4",
    label: "Checking continuity",
    description: "Comparing against established canon",
    status: "active" as const,
  },
  {
    id: "step-5",
    label: "Updating character arcs",
    description: "Reflecting what changed for each character",
    status: "pending" as const,
  },
];

// -- Mock Timeline Events ----------
export const mockTimelineEvents = [
  {
    id: "tl-1",
    title: "The War of 412 — Ashwall Gate Destroyed",
    description:
      "Imperial forces clash with the northern clans at the border crossing. The Ashwall Gate is destroyed in the siege and never rebuilt. The ruins become the northernmost point of imperial territory.",
    source: "world_chat",
    inStoryDate: "Year 412, Third Age",
    category: "historical",
    characters: [],
    createdAt: new Date("2024-01-15T09:00:00"),
  },
  {
    id: "tl-2",
    title: "The Magic Begins to Fade",
    description:
      "Approximately thirty years before the story's present, magic begins weakening across the empire. Spells fail mid-cast, scholars go mad, magical artifacts go dark. The cause is unknown publicly — the Threadweavers know the truth.",
    source: "world_chat",
    inStoryDate: "Approximately 30 years before present",
    category: "historical",
    characters: [],
    createdAt: new Date("2024-01-15T09:02:00"),
  },
  {
    id: "tl-3",
    title: "Kael Drovyn Stripped of His Rank",
    description:
      "General Kael Drovyn is discharged from imperial service on a manufactured charge of insubordination. The real reason is never stated publicly. Kael believes his disgrace was engineered — he is right.",
    source: "world_chat",
    inStoryDate: "6 months before present",
    category: "political",
    characters: ["Kael Drovyn"],
    createdAt: new Date("2024-01-15T09:04:00"),
  },
  {
    id: "tl-4",
    title: "The Threadweavers Embedded in the Throne",
    description:
      "At an unknown point in recent history, the Threadweavers cease being an external force and become structurally embedded in the imperial court. Queen Seraphel is their primary contact — whether she controls them or they control her is unclear.",
    source: "world_chat",
    inStoryDate: "Exact date unknown",
    category: "political",
    characters: ["Queen Seraphel"],
    createdAt: new Date("2024-01-15T09:06:00"),
  },
  {
    id: "tl-5",
    title: "Kael Intercepts the Courier",
    description:
      "On a mountain road three days east of Valdris, Kael intercepts a Threadweaver courier carrying a sealed letter bearing the queen's private cipher. The confrontation is brief and brutal. The courier does not survive.",
    source: "chapter_1",
    inStoryDate: "3 months before present",
    category: "conflict",
    characters: ["Kael Drovyn", "The Courier"],
    createdAt: new Date("2024-01-15T09:08:00"),
  },
  {
    id: "tl-6",
    title: "Eastern Garrison Doubled",
    description:
      "Queen Seraphel orders the eastern garrison doubled without explanation to the provincial lords. Lord Therin Mast notices. He begins stockpiling grain — officially for winter.",
    source: "world_chat",
    inStoryDate: "2 months before present",
    category: "political",
    characters: ["Queen Seraphel", "Lord Therin Mast"],
    createdAt: new Date("2024-01-15T09:10:00"),
  },
  {
    id: "tl-7",
    title: "Mira Goes Silent",
    description:
      "Kael's former intelligence contact Mira stops responding to any communication the same week the garrison is doubled. She was last seen entering the Scholar's Quarter in Valdris. Her current status is unknown.",
    source: "world_chat",
    inStoryDate: "2 months before present",
    category: "mystery",
    characters: ["Mira"],
    createdAt: new Date("2024-01-15T09:11:00"),
  },
  {
    id: "tl-8",
    title: "Three Threadweaver Assassination Attempts",
    description:
      "Over the course of a month, Kael survives three separate Threadweaver assassination attempts while moving east. He does not sleep in the same place twice. He tells no one.",
    source: "world_chat",
    inStoryDate: "2–1 months before present",
    category: "conflict",
    characters: ["Kael Drovyn"],
    createdAt: new Date("2024-01-15T09:13:00"),
  },
  {
    id: "tl-9",
    title: "Seraphel Meets with Guildmaster Voss",
    description:
      "A formal imperial audience between Queen Seraphel and Guildmaster Renara Voss. Publicly a routine trade discussion. Seraphel receives word of the courier's disappearance mid-audience and does not react visibly. Voss notices something is wrong.",
    source: "chapter_2",
    inStoryDate: "6 weeks before present",
    category: "political",
    characters: ["Queen Seraphel", "Guildmaster Renara Voss"],
    createdAt: new Date("2024-01-15T09:15:00"),
  },
  {
    id: "tl-10",
    title: "The Queen Issues the Order",
    description:
      "Privately, after the audience with Voss, Seraphel issues the order to locate Kael — not through usual channels, but directly through the Threadweavers. This is unusual enough that it suggests personal stakes.",
    source: "chapter_2",
    inStoryDate: "6 weeks before present",
    category: "political",
    characters: ["Queen Seraphel"],
    createdAt: new Date("2024-01-15T09:16:00"),
  },
  {
    id: "tl-11",
    title: "Kael Arrives at Therin's Estate",
    description:
      "Exhausted and injured, Kael arrives at Lord Therin Mast's estate in the eastern provinces. Therin takes him in without asking questions. By the end of the evening Kael has decided he needs to reach the Scholar's Quarter in Valdris.",
    source: "chapter_3",
    inStoryDate: "Present — Day 1",
    category: "story",
    characters: ["Kael Drovyn", "Lord Therin Mast"],
    createdAt: new Date("2024-01-15T09:18:00"),
  },
  {
    id: "tl-12",
    title: "Northern Trade Routes Disrupted",
    description:
      "Early winter storms disrupt the Merchant's Consortium's primary northern shipping lanes. Guildmaster Voss quietly reroutes three ships — destination logged as routine, actual cargo unknown. The Consortium's economic vulnerability increases.",
    source: "world_chat",
    inStoryDate: "Present — ongoing",
    category: "economic",
    characters: ["Guildmaster Renara Voss"],
    createdAt: new Date("2024-01-15T09:20:00"),
  },
];