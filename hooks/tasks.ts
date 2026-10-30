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
  const at = rel ? now + Number(rel[1]) * (rel[2].toLowerCase().startsWith('h') ? 3_600_000 : 60_000) : Date.parse(raw.trim())
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
    const field = m ? LABELS[m[1].toLowerCase().replace(/\s+/g, ' ')] : undefined
    if (m && field) {
      current = field
      fields[field] = [...(fields[field] ?? []), m[2]]
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
  return OUTCOMES[state] ?? state
}

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
