// Tasks between sessions (Talkif delegation): a task carries a contract (goal,
// done-when, deliverable, autonomy), its receiver may ask instead of guessing and
// submits with evidence, and its sender reviews the submission. These are the
// pure parts: the message convention Claude writes, and reading Talkif's task card.

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined)
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : [])

export type Autonomy = 'propose' | 'ask_first'

/** What a structured SendMessage asks for (Talkif's `send` fields). */
export type TaskRequest = {
  goal: string
  doneWhen?: string
  deliverable?: string
  autonomy?: Autonomy
  /** ISO time, within 24 hours. */
  deadline?: string
  context?: string
}

// The labels a SendMessage may start lines with. Only a message with a "Goal:" line
// is a structured task; anything else goes as plain text, as before.
const LABELS: Record<string, keyof TaskRequest> = {
  goal: 'goal',
  'done when': 'doneWhen',
  deliverable: 'deliverable',
  autonomy: 'autonomy',
  deadline: 'deadline',
  context: 'context',
}
const LABEL_LINE = /^\s*(goal|done when|deliverable|autonomy|deadline|context)\s*:\s?(.*)$/i
const MAX_DEADLINE_MS = 24 * 60 * 60_000
const MIN_DEADLINE_MS = 60_000

export const TASK_CONVENTION =
  'To hand over a task with a contract, write the message as labelled lines: "Goal:" (required), "Done when:" (how you will check it), "Deliverable:" (summary, links, a PR, …), "Autonomy:" (propose = change nothing and propose; ask_first = ask before changing, deleting, spending or contacting anyone; the default), "Deadline:" (a time within 24 hours, or 30m / 2h) and "Context:" (what it needs to know, up to 8 KB). A label\'s text runs until the next label. The receiver can ask you questions and submits with evidence; you review it. A message without a "Goal:" line goes as plain text.'

/** A deadline as an ISO time: an ISO time itself, or "30m" / "2h" / "in 2 hours" from now. */
export const parseDeadline = (raw: string, now: number): string | { error: string } => {
  const rel = /^(?:in\s+)?(\d+)\s*(m|min|mins|minutes?|h|hrs?|hours?)$/i.exec(raw.trim())
  const at = rel ? now + Number(rel[1]) * ((rel[2] ?? '').toLowerCase().startsWith('h') ? 3_600_000 : 60_000) : Date.parse(raw.trim())
  if (!Number.isFinite(at)) return { error: `Deadline "${raw.trim()}" is not a time: write an ISO time or 30m / 2h.` }
  if (at - now < MIN_DEADLINE_MS || at - now > MAX_DEADLINE_MS) return { error: 'Deadline must be between a minute and 24 hours from now.' }
  return new Date(at).toISOString()
}

/**
 * The task in a SendMessage text, when it has a "Goal:" line; undefined for plain text.
 * Text before the first label becomes context. An invalid autonomy or deadline is an error.
 */
export const parseTaskMessage = (text: string, now: number): TaskRequest | { error: string } | undefined => {
  const fields: Partial<Record<keyof TaskRequest, string[]>> = {}
  const before: string[] = []
  let current: keyof TaskRequest | undefined
  for (const line of text.split('\n')) {
    const m = LABEL_LINE.exec(line)
    const field = m ? LABELS[(m[1] ?? '').toLowerCase().replace(/\s+/g, ' ')] : undefined
    if (m && field) {
      current = field
      fields[field] = [...(fields[field] ?? []), m[2] ?? '']
    } else if (current) {
      fields[current]?.push(line)
    } else {
      before.push(line)
    }
  }
  const value = (k: keyof TaskRequest): string | undefined => {
    const v = fields[k]?.join('\n').trim()
    return v ? v : undefined
  }
  const goal = value('goal')
  if (!goal) return undefined
  const task: TaskRequest = { goal }
  const doneWhen = value('doneWhen')
  if (doneWhen) task.doneWhen = doneWhen
  const deliverable = value('deliverable')
  if (deliverable) task.deliverable = deliverable
  const autonomy = value('autonomy')?.toLowerCase().replace(/[\s-]+/g, '_')
  if (autonomy) {
    if (autonomy !== 'propose' && autonomy !== 'ask_first') return { error: `Autonomy must be propose or ask_first, not "${value('autonomy')}".` }
    task.autonomy = autonomy
  }
  const deadline = value('deadline')
  if (deadline) {
    const at = parseDeadline(deadline, now)
    if (typeof at !== 'string') return at
    task.deadline = at
  }
  const context = [before.join('\n').trim(), value('context')].filter(Boolean).join('\n\n')
  if (context) task.context = context
  return task
}

export type Submission = { summary: string; evidence: string[]; notVerified: string[]; noEvidence: boolean }

/** A task as one side of it sees it (Talkif's TaskCard). */
export type TaskCard = {
  taskId: string
  role: 'sender' | 'receiver'
  state: string
  with?: string
  /** What the other side is (`coding_session`, `cloud_agent`, …), when Talkif says it; older Talkif does not. */
  withKind?: string
  /** ISO time Talkif ends the task. */
  expiresAt?: string
  goal: string
  doneWhen?: string
  deliverable?: string
  deadline?: string
  context?: string
  autonomy: string
  review: boolean
  round: number
  question?: string
  answer?: string
  feedback?: string
  submission?: Submission
  outcome?: string
  reason?: string
}

export const parseTaskCard = (v: unknown): TaskCard | undefined => {
  if (!isRecord(v) || typeof v.taskId !== 'string' || typeof v.goal !== 'string') return undefined
  const s = isRecord(v.submission) ? v.submission : undefined
  return {
    taskId: v.taskId,
    role: v.role === 'sender' ? 'sender' : 'receiver',
    state: str(v.state) ?? 'offered',
    with: str(v.with),
    withKind: str(v.withKind),
    expiresAt: str(v.expiresAt),
    goal: v.goal,
    doneWhen: str(v.doneWhen),
    deliverable: str(v.deliverable),
    deadline: str(v.deadline),
    context: str(v.context),
    autonomy: str(v.autonomy) ?? 'ask_first',
    review: v.review === true,
    round: typeof v.round === 'number' ? v.round : 0,
    question: str(v.question),
    answer: str(v.answer),
    feedback: str(v.feedback),
    submission: s && typeof s.summary === 'string'
      ? { summary: s.summary, evidence: strList(s.evidence), notVerified: strList(s.notVerified), noEvidence: s.noEvidence === true }
      : undefined,
    outcome: str(v.outcome),
    reason: str(v.reason),
  }
}

/** The contract, one labelled line each, for the fenced part of a prompt. */
export const contractLines = (t: TaskCard): string =>
  [
    `Goal: ${t.goal}`,
    t.doneWhen ? `Done when: ${t.doneWhen}` : '',
    t.deliverable ? `Deliverable: ${t.deliverable}` : '',
    t.deadline ? `Deadline: ${t.deadline}` : '',
    t.context ? `Context: ${t.context}` : '',
  ]
    .filter(Boolean)
    .join('\n')

export const submissionLines = (s: Submission): string =>
  [
    `Summary: ${s.summary}`,
    s.noEvidence ? 'Evidence: none (submitted as a plain "done")' : s.evidence.length ? `Evidence:\n${s.evidence.map(e => `- ${e}`).join('\n')}` : 'Evidence: none given',
    s.notVerified.length ? `Not verified:\n${s.notVerified.map(e => `- ${e}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

export const autonomyRule = (autonomy: string): string =>
  autonomy === 'propose'
    ? 'Autonomy propose: change nothing (no edits, no deletions, no spending, no contacting anyone). Find out and submit a proposal.'
    : 'Autonomy ask_first: before you change or delete anything, spend money or contact anyone, ask with talkif_question and wait for the answer.'

// How a task ended, in words (Talkif's final states).
const OUTCOMES: Record<string, string> = {
  accepted_result: 'done, and the result was accepted',
  declined: 'declined',
  cancelled: 'cancelled',
  expired: 'ran out of time',
  failed: 'failed',
  closed: 'closed: it needs a person now',
}
export const outcomeWords = (t: TaskCard): string => {
  const state = t.outcome ?? t.state
  if (state === 'expired' && t.reason === 'no_answer') return 'not taken in time'
  // A state this version does not know, as plain words only: it is read by the turn it starts.
  return OUTCOMES[state] ?? (state.toLowerCase().replace(/[^a-z]+/g, ' ').trim().slice(0, 40) || 'over')
}

// ---- Who sent a task, as its prompts name them ----

/** A name from another agent, as one plain line: letters, digits, spaces and . ' _ - only. */
const plainName = (raw: string | undefined, max: number): string | undefined => {
  const name = (raw ?? '').normalize('NFC').replace(/[^\p{L}\p{M}\p{N} .'_-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim()
  return name || undefined
}

/** The other side's name on a card, safe to quote in a prompt line. */
export const senderName = (t: { with?: string }): string => plainName(t.with, 60) ?? 'another agent'

/**
 * What the other side is, as Talkif names it (`coding_session`, `cloud_agent` or another
 * connector kind: lowercase letters, digits and `_`), when the card says it; older Talkif does not.
 */
export const senderKind = (t: { withKind?: string }): string | undefined => {
  const kind = (t.withKind ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40)
  return /[a-z]/.test(kind) ? kind : undefined
}

// The kinds Talkif names, in plain words; any other is said from its own words.
const KIND_WORDS: Record<string, string> = {
  coding_session: 'a coding session',
  coding: 'a coding session',
  cloud_agent: 'a cloud agent',
}

/** A kind in plain words with its article: `cloud_agent` → "a cloud agent", `assistant` → "an assistant". */
export const kindWords = (kind: string): string => {
  const known = KIND_WORDS[kind]
  if (known) return known
  const words = kind.replace(/_+/g, ' ').trim()
  return `${/^[aeiou]/.test(words) ? 'an' : 'a'} ${words}`
}

/**
 * A short id for the first line of a task's prompts. The end of the id, not its start:
 * Talkif's ids start with the time, so two tasks in the same minute share their first characters.
 */
export const shortTaskId = (id: string): string => id.replace(/[^0-9A-Za-z]/g, '').slice(-8) || id.slice(0, 8)

// A live call (2026-11-15): a task from a voice assistant was answered in the terminal as if
// the developer had typed it, and the result never went back. Every task prompt says, first
// and last, where it came from and the only way back.
export const NOBODY_HERE = 'Whoever asked for it is not at this terminal; nobody reads replies here.'

/** The first line of a prompt about a task with a contract handed to this session (after its mark). */
export const contractTaskHeader = (t: { taskId: string; with?: string; withKind?: string }, news?: string): string => {
  const kind = senderKind(t)
  return [
    `TALKIF TASK ${shortTaskId(t.taskId)} from "${senderName(t)}"${kind ? ` (${kindWords(kind)})` : ', another agent,'} through Talkif${news ? `: ${news}` : ''}.`,
    NOBODY_HERE,
    'Ask with talkif_question; deliver with talkif_submit. That is the only way it reaches them.',
  ].join(' ')
}

/** The last line of the same prompt, with the id the tools take. */
export const contractTaskFooter = (t: { taskId: string; with?: string }): string =>
  `Remember: "${senderName(t)}" sees only talkif_question, talkif_submit and talkif_decline (taskId ${t.taskId}). A reply in this terminal reaches nobody.`

/** The first line of a prompt about a plain task (no contract) another session handed over (after its mark). */
export const sessionTaskHeader = (requestId: string, from: string): string =>
  `TALKIF TASK ${shortTaskId(requestId)} from "${plainName(from, 60) ?? 'another session'}", another of your sessions, through Talkif. ${NOBODY_HERE} Your final message goes back to it by itself: that is the only way it reaches them.`

/** The last line of the same prompt. */
export const sessionTaskFooter = (from: string): string =>
  `Remember: only your final message goes back to "${plainName(from, 60) ?? 'another session'}". Make it stand alone; if you need something from them, end it with that question. A reply in this terminal reaches nobody else.`

// ---- Tasks handed to this session that are still open ----
// Kept until talkif_submit, talkif_decline, a cancel or the task's end, and across a
// reload: a turn that leaves one unmoved gets a short reminder, at most MAX_NUDGES times.

/** Reminders per task after each offer, answer or revise. */
export const MAX_NUDGES = 2
/** A task lives a day at most (Talkif's limit): kept no longer when its card names no end. */
const OPEN_TASK_KEEP_MS = 24 * 60 * 60_000
/** The contract kept for a reminder that stands alone after a compaction. */
const KEPT_CONTRACT_CHARS = 4_000

export type OpenTask = {
  taskId: string
  /** The sender's name and kind, as senderName / senderKind give them. */
  sender: string
  senderKind?: string
  /** The account (bridge) the task lives in. */
  account: string
  /** The contract as labelled lines, for the reminder. */
  contract: string
  autonomy: string
  /** ISO time it ends on Talkif's side. */
  expiresAt: string
  /** A turn of it has run (the offer, an answer, a revise, a reminder). */
  started: boolean
  /** Prompts of it submitted whose turn has not started yet. */
  queued: number
  /** It asked with talkif_question and waits for the answer. */
  waiting: boolean
  /** Reminders since the last offer, answer or revise. */
  nudges: number
  /** The turn of it running now: kept across a reload, so its end is still known as its own. */
  turnId?: string
  /** The developer typed into a turn of it: no more reminders and nothing sent by itself; the task tools still move it. */
  takenOver?: true
  /** What its own turn left, not taken yet by Talkif (offline, busy): sent again until it is. */
  report?: { kind: 'question' | 'done' | 'blocked'; text: string; tries: number }
}

const validTime = (iso: string | undefined): string | undefined => (iso !== undefined && Number.isFinite(Date.parse(iso)) ? iso : undefined)

/** The card of an offer, answer or revise as an open task: its prompt is queued, its reminders start over. */
export const openTaskOf = (t: TaskCard, account: string, now: number, before?: OpenTask): OpenTask => {
  const kind = senderKind(t)
  return {
    taskId: t.taskId,
    sender: senderName(t),
    ...(kind ? { senderKind: kind } : {}),
    account,
    contract: contractLines(t).slice(0, KEPT_CONTRACT_CHARS),
    autonomy: t.autonomy,
    expiresAt: validTime(t.expiresAt) ?? before?.expiresAt ?? new Date(now + OPEN_TASK_KEEP_MS).toISOString(),
    started: before?.started ?? false,
    // A prompt of it still on its way (a reminder) is counted too.
    queued: (before?.queued ?? 0) + 1,
    waiting: false,
    nudges: 0,
  }
}

export const isOpenAt = (t: OpenTask, now: number): boolean => Date.parse(t.expiresAt) > now

/** Open tasks as the plugin's store kept them; anything malformed or over is dropped. */
export const parseOpenTasks = (v: unknown, now: number): OpenTask[] =>
  (Array.isArray(v) ? v : []).flatMap((r): OpenTask[] => {
    if (!isRecord(r)) return []
    const { taskId, sender, account, contract, autonomy, expiresAt, started, queued, waiting, nudges } = r
    if (typeof taskId !== 'string' || !taskId || typeof sender !== 'string' || typeof account !== 'string' || typeof contract !== 'string') return []
    if (typeof autonomy !== 'string' || typeof expiresAt !== 'string' || !validTime(expiresAt)) return []
    if (typeof started !== 'boolean' || typeof queued !== 'number' || typeof waiting !== 'boolean' || typeof nudges !== 'number') return []
    const task: OpenTask = { taskId, sender, account, contract, autonomy, expiresAt, started, queued: Math.max(0, queued), waiting, nudges }
    if (typeof r.senderKind === 'string' && r.senderKind) task.senderKind = r.senderKind
    if (typeof r.turnId === 'string' && r.turnId) task.turnId = r.turnId
    if (r.takenOver === true) task.takenOver = true
    const report = isRecord(r.report) ? r.report : undefined
    if (report && (report.kind === 'question' || report.kind === 'done' || report.kind === 'blocked') && typeof report.text === 'string' && typeof report.tries === 'number') {
      task.report = { kind: report.kind, text: report.text, tries: report.tries }
    }
    return isOpenAt(task, now) ? [task] : []
  })

/**
 * Whether an open task may be reminded now: no prompt of it waits, it is not waiting for an
 * answer, not taken over by the developer, nothing of it waits to be sent, and it has reminders left.
 */
export const mayRemind = (t: OpenTask, now: number): boolean =>
  t.queued === 0 && !t.waiting && !t.takenOver && !t.report && t.nudges < MAX_NUDGES && isOpenAt(t, now)

/** The open task a reminder is for after a turn that moved none: one whose own turn has run and may be reminded. Oldest first. */
export const nudgeCandidate = (list: readonly OpenTask[], now: number): OpenTask | undefined => list.find(t => t.started && mayRemind(t, now))

/** How a rung call ended, in plain words (call_ended `status`). */
export const callOutcomeWords = (status: string | undefined): string => {
  switch (status) {
    case 'completed':
      return 'answered'
    case 'noanswer':
    case 'canceled':
      return 'not answered'
    case 'busy':
      return 'declined'
    case 'failed':
      return 'failed to connect'
    default:
      return 'ended without an outcome Talkif could name'
  }
}
