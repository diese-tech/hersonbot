# HersonBot North Star

## Vision
Build a private proof-of-concept for a multiplayer Civilization VI strategic coaching system that could be pitched to Herson as a creator-owned community tool.

Not a chatbot.
Not a wiki.
Not a transcript dump.
Not a paid end-user product by default.

A context-aware strategy engine that converts expert multiplayer knowledge into actionable, source-linked decision support.

## Business model
The intended business model is creator services / implementation work.

The goal is to charge Herson or his business for designing, building, deploying, and maintaining the assistant, not to charge his audience directly without his involvement.

Potential deal structures:

- fixed-price MVP build
- paid prototype / discovery sprint
- monthly maintenance retainer
- creator-owned tool with implementation fee
- revenue share only if Herson later chooses to monetize it
- white-label build that he can brand, control, and offer to his community

The preferred pitch is:

> "I built a private prototype showing how your existing Civ 6 knowledge could become a searchable assistant for your community. If you like it, I can help you turn it into an official tool you own and control."

## Long-term product concept
A player should be able to:

- describe their spawn
- explain lobby conditions
- ask strategic questions mid-game
- receive patch-aware multiplayer guidance
- see WHY the recommendation exists
- inspect timestamped source evidence
- compare conflicting strategic lines
- learn from elite content without watching thousands of hours of video

## Core philosophy
The assistant should behave more like:

- a multiplayer coach
- a VOD analyst
- a draft/build-order advisor
- a strategic explainer

And less like:

- a generic AI chatbot
- a fake creator clone
- a random Civ wiki summarizer

## Creator-safe positioning
The assistant should not impersonate Herson, clone his voice, or claim to speak for him.

It should be positioned as:

> "A searchable strategy assistant powered by timestamped references to Herson's public Civ 6 educational content."

For any public release, Herson should control:

- branding
- access model
- approved sources
- disclaimers
- monetization decisions
- whether the tool is public, private, Discord-only, or supporter-only

## Long-term capabilities

### 1. Source-grounded expert knowledge
Start with Herson's content only if pitching him directly.

Future expansion to other sources should happen only with clear positioning and permission where appropriate.

Potential additional sources later:
- official patch notes
- BBG changelogs
- tournament VODs
- community tier lists
- other expert creators if approved

The system should eventually reconcile competing strategic opinions, but the first version should stay tightly scoped.

### 2. Patch-aware strategic memory
Every recommendation should understand:
- BBG version
- game patch
- mod ruleset
- multiplayer meta shifts
- outdated recommendations

Old guidance should never silently override new meta.

## 3. Real-time game coaching
Future-state workflow:

```text
Game state input
→ civ/leader recognition
→ map + spawn analysis
→ strategic context engine
→ retrieval of relevant expert advice
→ recommendation engine
→ explainable output
```

Potential inputs:
- screenshots
- save files
- OCR
- manual state entry
- mod integration

## 4. Strategy graph / knowledge graph
The true moat is not transcripts.

The moat is structured strategy relationships.

Example:

```text
close neighbor
→ higher early war risk
→ fewer greedy settles
→ earlier military production
→ delayed district timing
```

The system should eventually understand strategic dependencies instead of only retrieving text.

## 5. Live stream ingestion
Future pipeline:

```text
Live stream audio
→ realtime transcription
→ transcript chunking
→ strategy extraction
→ confidence review
→ post-stream indexing
```

New strategy insights become searchable shortly after stream completion.

## 6. Personalized coaching
Eventually the assistant could adapt recommendations to:

- user skill level
- aggression preference
- civ pool
- comfort strategies
- known weaknesses
- lobby tendencies

This should only be built after the source-grounded assistant is reliable.

## North star UX
Ideal future interaction:

> "I spawned as Khmer on online speed with close neighbors and low production. Should I greed settlers or stabilize first?"

Assistant response:
- concise recommendation
- strategic reasoning
- risks/tradeoffs
- comparable examples
- timestamped expert sources
- confidence score
- note if the advice changed recently in BBG/meta

## Key moat
The moat is NOT:
- OpenAI access
- transcripts
- embeddings
- chat UI

The moat IS:
- curated strategic structure
- patch-aware knowledge handling
- multiplayer expertise indexing
- recommendation quality
- strategic reasoning graph
- high-quality metadata
- creator relationship / official positioning

## Product risk
Main risks:

- hallucinated strategy advice
- outdated recommendations
- over-indexing on one creator without clear approval
- copyright/community concerns
- insufficient metadata quality
- weak retrieval ranking
- pitching too late without a working demo
- pitching too aggressively and making the creator feel copied instead of empowered

## Guiding rule
Every answer should optimize for:

1. correctness
2. strategic usefulness
3. patch relevance
4. explainability
5. source transparency
6. creator control

Not entertainment.
