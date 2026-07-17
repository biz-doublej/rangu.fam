# Rangu Tactics Noxus Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the live battle screen as an original Noxus iron-war-chamber board with clear two-sided lanes, bastion Nexuses, a central command action, and an accessible fanned player hand.

**Architecture:** Keep the existing battle snapshot, target anchors, WebSocket dispatchers, combat FX, and tutorial state intact. Move command selection into a pure module, split visual regions into focused battle components, and use a scoped CSS token system to replace the old forest-card-board treatment without importing or copying Riot assets.

**Tech Stack:** React 18, TypeScript, Framer Motion, Zustand battle store, Lucide icons, Tailwind utilities, CSS custom properties, Vitest.

## Global Constraints

- The redesign uses original CSS and bundled Rangu assets only; it must not use Riot artwork, frames, trademarks, or copied UI assets.
- The battle snapshot, action dispatch, targeting arrows, nexus seat anchors, combat FX, logs, and tutorial masking remain server-authoritative and functional.
- A player action is rendered only when legal according to the live phase and priority state; an opponent turn or completed game is status text, not a disabled button.
- Temporary disabling is allowed only while a legal command is already being sent.
- The lower hand supports pointer targeting, keyboard focus, reduced motion, and responsive sizes down to 768px wide.
- Player and opponent unit rows preserve every current `data-instance-id` and player board `data-drop="my-board"` anchor.

---

## File structure

- Create `rangu-tactics-heavy/src/components/battle/battle-command.ts`: pure command derivation from battle state.
- Create `rangu-tactics-heavy/src/components/battle/battle-command.test.ts`: legal-action/status test cases.
- Create `rangu-tactics-heavy/src/components/battle/CommandStandard.tsx`: central command button or non-interactive priority status.
- Create `rangu-tactics-heavy/src/components/battle/BattleLane.tsx`: six-column unit lane that retains animation and targeting anchors.
- Create `rangu-tactics-heavy/src/components/battle/HandFan.tsx`: keyboard-friendly lower hand layout.
- Modify `rangu-tactics-heavy/src/components/battle/nexus-crystal.tsx`: Noxus bastion treatment while keeping `data-nexus-seat`.
- Modify `rangu-tactics-heavy/src/components/battle/mana-bar.tsx`: compact side reservoir treatment.
- Modify `rangu-tactics-heavy/src/components/battle/game-card.tsx`: visible focus ring and card-size variants needed by the lanes/hand.
- Modify `rangu-tactics-heavy/src/components/battle/battle-board.tsx`: wire existing live behavior into the new component structure.
- Modify `rangu-tactics-heavy/src/index.css`: scoped `.theme-battle` color tokens, board texture, lane, command, hand, and reduced-motion rules.

## Task 1: Extract legal command selection from the battle component

**Files:**

- Create: `rangu-tactics-heavy/src/components/battle/battle-command.ts`
- Create: `rangu-tactics-heavy/src/components/battle/battle-command.test.ts`
- Modify: `rangu-tactics-heavy/src/components/battle/battle-board.tsx:90-320`

**Interfaces:**

- Produces `BattleCommand` with `kind: 'action' | 'status'`, `label`, `hint`, and `action?: 'mulligan' | 'pass' | 'attack' | 'block'`.
- Consumes only primitive phase/priority/selection facts, so it cannot dispatch directly.
- `BattleBoard` maps the returned action to its existing `doMulligan`, `doPass`, `doDeclareAttack`, or `doDeclareBlock` handler.

- [ ] **Step 1: Write failing legal-command tests**

Create `src/components/battle/battle-command.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { deriveBattleCommand } from './battle-command'

describe('deriveBattleCommand', () => {
  it('renders a status instead of a disabled control during the opponent turn', () => {
    expect(deriveBattleCommand({ over: false, busy: false, isMulligan: false, isBlock: false, isAction: false, priorityIsMine: false, attackers: 0, blocks: 0 })).toMatchObject({
      kind: 'status', label: '상대의 명령을 기다리는 중',
    })
  })

  it('promotes selected attackers to a legal attack command', () => {
    expect(deriveBattleCommand({ over: false, busy: false, isMulligan: false, isBlock: false, isAction: true, priorityIsMine: true, attackers: 2, blocks: 0 })).toMatchObject({
      kind: 'action', action: 'attack', label: '공격 2',
    })
  })

  it('keeps temporary transport work as status rather than an enabled duplicate command', () => {
    expect(deriveBattleCommand({ over: false, busy: true, isMulligan: false, isBlock: false, isAction: true, priorityIsMine: true, attackers: 1, blocks: 0 })).toMatchObject({
      kind: 'status', label: '명령 전달 중',
    })
  })
})
```

- [ ] **Step 2: Run the test and verify the import fails**

```powershell
Set-Location C:\Users\jaewo\Desktop\rangu-tactics-heavy
npm test -- src/components/battle/battle-command.test.ts
```

Expected: Vitest cannot resolve `./battle-command`.

- [ ] **Step 3: Implement the pure command contract**

Create `src/components/battle/battle-command.ts`:

```ts
export type BattleAction = 'mulligan' | 'pass' | 'attack' | 'block'
export type BattleCommand =
  | { kind: 'action'; action: BattleAction; label: string; hint: string }
  | { kind: 'status'; label: string; hint: string }

export type BattleCommandFacts = {
  over: boolean; busy: boolean; isMulligan: boolean; isBlock: boolean; isAction: boolean
  priorityIsMine: boolean; attackers: number; blocks: number
}

export function deriveBattleCommand(facts: BattleCommandFacts): BattleCommand {
  if (facts.over) return { kind: 'status', label: '전투가 종료되었습니다', hint: '결산 화면으로 이동합니다' }
  if (facts.busy) return { kind: 'status', label: '명령 전달 중', hint: '서버 응답을 기다리는 중입니다' }
  if (facts.isMulligan) return { kind: 'action', action: 'mulligan', label: '멀리건', hint: '선택한 카드를 교체합니다' }
  if (facts.isBlock) return facts.blocks > 0
    ? { kind: 'action', action: 'block', label: `방어 ${facts.blocks}`, hint: '방어 배치를 확정합니다' }
    : { kind: 'action', action: 'pass', label: '방어하지 않기', hint: '방어 없이 전투를 진행합니다' }
  if (facts.isAction) return facts.attackers > 0
    ? { kind: 'action', action: 'attack', label: `공격 ${facts.attackers}`, hint: '선택한 유닛으로 공격합니다' }
    : { kind: 'action', action: 'pass', label: '패스', hint: '카드를 내거나 우선권을 넘깁니다' }
  if (facts.priorityIsMine) return { kind: 'action', action: 'pass', label: '패스', hint: '대응 없이 진행합니다' }
  return { kind: 'status', label: '상대의 명령을 기다리는 중', hint: '상대가 행동하면 우선권이 돌아옵니다' }
}
```

In `battle-board.tsx`, replace `BtnDesc`, `BTN_STYLE.wait`, and the existing phase `if` ladder with `deriveBattleCommand`. Create an action map that dispatches only from `command.kind === 'action'`:

```ts
const commandHandlers: Record<BattleAction, () => void> = {
  mulligan: () => doMulligan([]), pass: () => doPass(), attack: submitAttack, block: submitBlock,
}
```

- [ ] **Step 4: Run command tests and build**

```powershell
npm test -- src/components/battle/battle-command.test.ts
npm run build
```

Expected: all three command tests pass and the battle board compiles with no reference to `BtnDesc` or `wait`.

- [ ] **Step 5: Commit legal command extraction**

```powershell
git add src/components/battle/battle-command.ts src/components/battle/battle-command.test.ts src/components/battle/battle-board.tsx
git commit -m "refactor(battle): derive legal command states"
```

## Task 2: Build the Noxus board primitives

**Files:**

- Create: `rangu-tactics-heavy/src/components/battle/CommandStandard.tsx`
- Create: `rangu-tactics-heavy/src/components/battle/BattleLane.tsx`
- Create: `rangu-tactics-heavy/src/components/battle/HandFan.tsx`
- Modify: `rangu-tactics-heavy/src/components/battle/nexus-crystal.tsx`
- Modify: `rangu-tactics-heavy/src/components/battle/mana-bar.tsx`
- Modify: `rangu-tactics-heavy/src/components/battle/game-card.tsx`

**Interfaces:**

- `CommandStandard({ command, onAction, round })` renders a `<button>` only for `command.kind === 'action'` and a `role="status"` element otherwise.
- `BattleLane({ side, cards, renderCard, emptyLabel, dropZone })` gives player rows `data-drop="my-board"` and each card wrapper its existing identifier.
- `HandFan({ children, count, masked })` owns only the lower-hand geometry; card casting remains supplied by `BattleBoard`.
- `NexusCrystal` continues accepting `{ health, variant, label, seat }` and emits `data-nexus-seat={seat}`.

- [ ] **Step 1: Create the command standard without a disabled branch**

Create `CommandStandard.tsx`:

```tsx
import { Shield, Swords, RotateCcw, ChevronsRight } from 'lucide-react'
import type { BattleAction, BattleCommand } from './battle-command'

const icons: Record<BattleAction, typeof Swords> = { attack: Swords, block: Shield, mulligan: RotateCcw, pass: ChevronsRight }

export function CommandStandard({ command, onAction, round }: { command: BattleCommand; onAction: (action: BattleAction) => void; round: number }) {
  if (command.kind === 'status') return <div role="status" className="battle-command-status"><span>{command.label}</span><small>{command.hint}</small></div>
  const Icon = icons[command.action]
  return <button type="button" onClick={() => onAction(command.action)} className="battle-command" aria-label={command.label}><Icon aria-hidden /><span>{command.label}</span><small>라운드 {round}</small></button>
}
```

- [ ] **Step 2: Create a six-slot battle lane preserving all card anchors**

Create `BattleLane.tsx`:

```tsx
import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function BattleLane<T extends { instanceId: string }>({ side, cards, renderCard, emptyLabel, dropZone }: { side: 'enemy' | 'player'; cards: T[]; renderCard: (card: T) => ReactNode; emptyLabel: string; dropZone?: boolean }) {
  return <div data-drop={dropZone ? 'my-board' : undefined} className={`battle-lane battle-lane--${side}`}>
    <AnimatePresence mode="popLayout">{cards.map((card) => <motion.div key={card.instanceId} layout initial={{ opacity: 0, y: side === 'enemy' ? -24 : 24, scale: 0.72 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.55 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }}>{renderCard(card)}</motion.div>)}</AnimatePresence>
    {cards.length === 0 && <p className="battle-lane-empty">{emptyLabel}</p>}
  </div>
}
```

The generic `T` keeps the original `CardVM` fields available to the card render callbacks without casts.

- [ ] **Step 3: Create the hand geometry and reinforce keyboard card focus**

Create `HandFan.tsx`:

```tsx
import type { ReactNode } from 'react'

export function HandFan({ children, count, masked }: { children: ReactNode; count: number; masked: boolean }) {
  return <section aria-label={`나의 손패 ${count}장`} className={`battle-hand ${masked ? 'battle-hand--masked' : ''}`}>{children}</section>
}
```

In `game-card.tsx`, append `focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#11100f]` to the interactive branch and add the `battle-card` class to every card root. Keep all existing click and pointer callbacks intact.

- [ ] **Step 4: Restyle the existing Nexus and mana components without changing their data anchors**

Replace the diamond heart visual in `nexus-crystal.tsx` with a two-layer bastion: a `battle-nexus__plinth`, an inset `battle-nexus__core`, and the health text. Keep this outer element unchanged:

```tsx
<div data-nexus-seat={seat} className={cn('battle-nexus', isEnemy ? 'battle-nexus--enemy' : 'battle-nexus--player')}>
```

In `mana-bar.tsx`, retain the `current/max` and spell loop, but replace the labels with `전투 마나` and `주문 마나`, then apply `battle-mana` and `battle-mana-gem` classes. Do not alter its props or its number of gems.

- [ ] **Step 5: Build the new primitives before integration**

```powershell
npm run build
```

Expected: Vite completes; the new component files are type-checked even though `BattleBoard` still renders the old layout.

- [ ] **Step 6: Commit the visual primitives**

```powershell
git add src/components/battle/CommandStandard.tsx src/components/battle/BattleLane.tsx src/components/battle/HandFan.tsx src/components/battle/nexus-crystal.tsx src/components/battle/mana-bar.tsx src/components/battle/game-card.tsx
git commit -m "feat(battle): add Noxus board primitives"
```

## Task 3: Recompose the live battle board around the new hierarchy

**Files:**

- Modify: `rangu-tactics-heavy/src/components/battle/battle-board.tsx`
- Modify: `rangu-tactics-heavy/src/components/battle/action-log.tsx:45-113`
- Modify: `rangu-tactics-heavy/src/components/battle/round-banner.tsx:20-72`

**Interfaces:**

- Consumes Task 1 command and Task 2 primitives.
- Keeps current `TargetingArrow`, `FxLayer`, `RoundBanner`, `ActionLog`, `useDragTargeting`, and `do*` battle-client calls.
- Produces the stable visual order: opponent hand/bastion, opponent lane, siege line/command, player lane, player hand/bastion.

- [ ] **Step 1: Replace the old three sections with the new five regions**

In `battle-board.tsx`, make the root main element use this scaffold:

```tsx
<motion.main animate={shake} className="battle-shell">
  <div className="battle-backdrop" aria-hidden />
  <section className="battle-side battle-side--enemy">
    <ManaBar current={vm.opponent.mana} max={vm.opponent.manaMax} spellCurrent={vm.opponent.spellMana} spellMax={SPELL_MANA_MAX} />
    <OpponentHand count={vm.opponent.handCount} />
    <NexusCrystal health={vm.opponent.nexusHealth} variant="enemy" label="적 넥서스" seat={oppSeat} />
  </section>
  <BattleLane side="enemy" cards={vm.opponent.board} emptyLabel="상대 전열이 비어 있습니다" renderCard={renderEnemyCard} />
  <section className="battle-siege-line"><ActionLog /><CommandStandard command={command} onAction={(action) => commandHandlers[action]()} round={vm.round} /></section>
  <BattleLane side="player" cards={vm.me.board} emptyLabel="내 전열이 비어 있습니다" dropZone renderCard={renderPlayerCard} />
  <section className="battle-side battle-side--player">
    <NexusCrystal health={vm.me.nexusHealth} variant="player" label="내 넥서스" seat={mySeat} />
    <HandFan count={vm.myHand.length} masked={handMasked}>{renderedHandCards}</HandFan>
    <ManaBar current={vm.me.mana} max={vm.me.manaMax} spellCurrent={vm.me.spellMana} spellMax={SPELL_MANA_MAX} align="end" />
  </section>
</motion.main>
```

Define `OpponentHand` in `battle-board.tsx` as a local component that maps `Array.from({ length: count })` to the existing `card-back.png` cards. `renderEnemyCard` must pass `instanceId`, `cardVMToGameCardData`, and `cardState` to `GameCard`. `renderPlayerCard` must preserve these exact live interaction props: `onClick={canAttack && !c.exhausted ? () => toggleAttacker(c) : undefined}` and `onPointerDown={canDragUnit(c) ? startTarget(c) : undefined}`. The `BattleLane` used for the player row is the sole `data-drop="my-board"` element.

Use this exact local component above `BattleBoard`:

```tsx
function OpponentHand({ count }: { count: number }) {
  return <div className="battle-opponent-hand" aria-label={`상대 손패 ${count}장`}>
    {Array.from({ length: count }).map((_, index) => <img key={index} src="/card-back.png" alt="" aria-hidden className="battle-opponent-hand__card" style={{ transform: `rotate(${(index - (count - 1) / 2) * 4}deg)` }} />)}
  </div>
}
```

- [ ] **Step 2: Preserve targeting, tutorial, and action-log behavior during the move**

Keep `<TargetingArrow arrow={targeting.arrow} variant={targeting.variant} />`, `<FxLayer shake={shake} />`, and `<RoundBanner round={vm.round} myAttackTurn={vm.me.hasAttackToken} />` as siblings before the main board. Place the current `boardMasked` and `spotlightBoard` styles on the player `BattleLane` wrapper. Place `handMasked` on `HandFan`; it must use opacity and `pointer-events-none` only during the existing tutorial mask, never as a normal turn-state substitute.

Move `ActionLog` into `battle-siege-line`; do not change its store selector or history count. Update the action-log popover placement class from `left-0 top-full` to `left-1/2 top-1/2 -translate-x-[calc(100%+1rem)] -translate-y-1/2` so it opens beside the center line without covering the command standard. Keep its trigger a working button.

- [ ] **Step 3: Build and use a live snapshot smoke test**

```powershell
npm run build
npm test -- src/components/battle/battle-command.test.ts
```

Expected: build and command tests pass. Start `npm run dev`, enter a local tutorial match, and confirm that dragging a card to the player lane still selects the `data-drop="my-board"` target and dragging a unit to an enemy unit or Nexus still draws an arrow.

- [ ] **Step 4: Commit the recomposed board**

```powershell
git add src/components/battle/battle-board.tsx src/components/battle/action-log.tsx src/components/battle/round-banner.tsx
git commit -m "feat(battle): compose Noxus combat board"
```

## Task 4: Apply the Noxus visual system and responsive motion rules

**Files:**

- Modify: `rangu-tactics-heavy/src/index.css`

**Interfaces:**

- `.theme-battle` defines every color used by the new battle components.
- `.battle-shell`, `.battle-lane`, `.battle-command`, `.battle-nexus`, `.battle-hand`, and `.battle-card` are the only new battle selectors.

- [ ] **Step 1: Define the scoped iron-war-chamber tokens**

Replace the current `.theme-battle` token block with these core values:

```css
.theme-battle {
  --battle-void: #11100f;
  --battle-iron: #2b2926;
  --battle-brass: #9a6b32;
  --battle-crimson: #9e1d24;
  --battle-ember: #e36b2c;
  --battle-ash: #c9c0b5;
  --color-background: var(--battle-void);
  --color-card: #1b1917;
  --color-foreground: #f2ede5;
  --color-primary: var(--battle-ember);
  --color-accent: var(--battle-brass);
  --color-border: rgb(154 107 50 / 38%);
}
```

- [ ] **Step 2: Add the board surface, lane, and command treatments**

Add these rules after the theme tokens:

```css
.battle-shell { position: relative; display: grid; min-height: 100svh; grid-template-rows: auto minmax(9rem, 1fr) auto minmax(9rem, 1fr) auto; overflow: hidden; background: radial-gradient(circle at 50% 48%, rgb(227 107 44 / 16%), transparent 26%), linear-gradient(180deg, #17130f 0%, var(--battle-void) 48%, #1a1110 100%); }
.battle-backdrop { position: absolute; inset: 0; pointer-events: none; opacity: .9; background-image: linear-gradient(115deg, transparent 0 43%, rgb(227 107 44 / 19%) 43.2% 43.5%, transparent 43.7% 100%), repeating-linear-gradient(90deg, rgb(255 234 192 / 3%) 0 1px, transparent 1px 68px); }
.battle-lane { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); align-items: end; gap: clamp(.4rem, 1.4vw, 1.2rem); width: min(78rem, 78vw); margin: auto; padding: 1.25rem 1.75rem; border: 1px solid rgb(154 107 50 / 30%); background: linear-gradient(180deg, rgb(20 18 15 / 76%), rgb(43 41 38 / 60%)); clip-path: polygon(1.2rem 0, calc(100% - 1.2rem) 0, 100% 1.2rem, 100% calc(100% - 1.2rem), calc(100% - 1.2rem) 100%, 1.2rem 100%, 0 calc(100% - 1.2rem), 0 1.2rem); }
.battle-siege-line { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; min-height: 8rem; border-block: 1px solid rgb(227 107 44 / 42%); background: linear-gradient(90deg, transparent, rgb(158 29 36 / 28%), transparent); }
.battle-command { display: grid; place-items: center; gap: .15rem; min-width: 8.5rem; min-height: 8.5rem; border: 2px solid var(--battle-ember); border-radius: 50%; color: #fff1df; background: radial-gradient(circle, #5d1919, #22110f 68%); box-shadow: 0 0 0 5px rgb(154 107 50 / 18%), 0 0 30px rgb(227 107 44 / 40%); }
.battle-command-status { display: grid; place-items: center; gap: .35rem; min-width: 12rem; color: var(--battle-ash); text-align: center; }
```

- [ ] **Step 3: Add hand, nexus, focus, and reduced-motion rules**

Implement `.battle-hand` with `display:flex`, `justify-content:center`, `align-items:flex-end`, `min-height:13rem`, and child cards that use `margin-left:-1.75rem`; on `:hover` and `:focus-within`, elevate only the focused card with `translateY(-2.25rem) scale(1.08)`. Implement `.battle-nexus` as a fixed-width bastion with an ember outer glow for the enemy and a brass outer glow for the player.

Add exactly this motion guard:

```css
@media (prefers-reduced-motion: reduce) {
  .theme-battle *, .theme-battle *::before, .theme-battle *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
}
@media (max-width: 768px) {
  .battle-lane { width: calc(100vw - 1rem); gap: .2rem; padding: .65rem; }
  .battle-command { min-width: 5.5rem; min-height: 5.5rem; font-size: .75rem; }
  .battle-hand { min-height: 10rem; transform: scale(.82); transform-origin: bottom center; }
}
```

- [ ] **Step 4: Build and visually inspect both desktop and narrow layouts**

```powershell
npm run build
npm run dev
```

Expected: production build passes. In the browser, inspect a 1440px battle and a 768px battle: both unit rows remain distinct, the command is centered, the Nexus values are visible, and no card is clipped outside the hand area.

- [ ] **Step 5: Commit the visual system**

```powershell
git add src/index.css
git commit -m "style(battle): establish Noxus board visual system"
```

## Task 5: Verify all live battle controls and accessibility paths

**Files:**

- Modify only files from Tasks 1-4 when verification exposes a reproducible fault.

**Interfaces:**

- Valid commands dispatch once through the existing battle client.
- Invalid turn states render a non-interactive status and never produce an unavailable-looking action button.

- [ ] **Step 1: Exercise each legal command in the tutorial flow**

Use the existing tutorial and verify this exact matrix:

```text
Mulligan phase: command standard sends doMulligan([]).
Action phase with a selected unit: command standard sends doDeclareAttack(selectedIds).
Block phase with assignments: command standard sends doDeclareBlock(assignments).
Priority phase with no action: command standard sends doPass().
Opponent priority: only “상대의 명령을 기다리는 중” status is shown.
Pending outbound intent: only “명령 전달 중” status is shown.
```

- [ ] **Step 2: Exercise pointer and keyboard targeting**

```text
Drag a playable unit card into the player lane and confirm its play command is emitted once.
Drag an attack-capable unit onto the opposing Nexus and confirm it becomes selected for attack.
Drag a target spell onto an opponent unit and confirm the cast carries that instance id.
Tab to an interactive card, confirm the amber focus ring is visible, then activate it with Enter.
```

- [ ] **Step 3: Run automated regression checks**

```powershell
npm test -- src/components/battle/battle-command.test.ts
npm run build
```

Expected: all automated checks pass after the manual interaction sequence.

- [ ] **Step 4: Commit only verified fixes**

If a verification step changed concrete files, stage exactly those named files and use one focused message such as:

```powershell
git add src/components/battle/battle-board.tsx src/components/battle/HandFan.tsx
git commit -m "fix(battle): preserve card targeting on Noxus board"
```

If verification did not change files, do not create an empty commit.
