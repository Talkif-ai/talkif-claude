// talkif_setup: the setup check an agent runs for the person ("set up Talkif"),
// on top of /talkif setup's checks. Pure functions only, so they are tested
// without the engine: what Talkif's own setup check says about the person's
// phone, which Claude Code permissions would stop a session that rings or
// reports while the person is away, and the plugin options worth changing,
// each with one reason. Values are the plugin's real option values.

import type { Check, FlowRef, Sharing } from './config'

export const SETUP_TOOL = 'talkif_setup'

export const SETUP_TOOL_SPEC = {
  name: SETUP_TOOL,
  description:
    'Check the Talkif setup of this Claude Code session and say what is missing: the API key, Connectors, the voice agent, whether the person\'s phone can ring, which Claude Code permissions would stop call_me or the task tools while the person is away, and suggested plugin options with one reason each. ' +
    'Reads only and changes nothing: tell the person each next step (most are in app.talkif.ai or in /config → talkif), then call it again. Call it when the person asks to set up or check Talkif, or when call_me or a task tool fails.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
} as const

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// ---- Talkif's own setup check (the MCP tool talkif_setup on the Talkif server) ----

/** Someone a ring can reach, and how many of their phones would ring. */
export type RingPerson = { userId: string; name: string | undefined; phones: number }

/** What this plugin reads from Talkif's setup check; absent fields: not sent (older server, or not shown to the key). */
export type ServerSetup = { organization: boolean | undefined; people: RingPerson[] | undefined }

/**
 * The JSON-RPC answer of tools/call talkif_setup, read for the account and the
 * people a ring reaches. `undefined` for anything else (an older server without
 * the tool answers "Unknown tool").
 */
export function parseServerSetup(body: unknown): ServerSetup | undefined {
  if (!isRecord(body) || !isRecord(body.result) || body.result.isError === true) return undefined
  const content = body.result.content
  const first: unknown = Array.isArray(content) ? content[0] : undefined
  if (!isRecord(first) || typeof first.text !== 'string') return undefined
  let report: unknown
  try {
    report = JSON.parse(first.text)
  } catch {
    return undefined
  }
  if (!isRecord(report) || !Array.isArray(report.checks)) return undefined
  const account = isRecord(report.account) ? report.account : {}
  const people = Array.isArray(report.people)
    ? report.people.flatMap(p =>
        isRecord(p) && typeof p.userId === 'string' && typeof p.phones === 'number'
          ? [{ userId: p.userId, name: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : undefined, phones: p.phones }]
          : [],
      )
    : undefined
  return { organization: typeof account.organization === 'boolean' ? account.organization : undefined, people }
}

export const INSTALL_APP_STEP =
  'Install Talkif from the App Store on your iPhone and sign in with the same Talkif account. Until then call_me reaches only a Talkif app or dashboard that is open at that moment.'
export const PICK_STEP = 'Pick whose phone call_me rings with /talkif ring <name> (/talkif ring lists them).'

const phones = (n: number): string =>
  n === 0 ? 'no iPhone with the Talkif app signed in' : n === 1 ? '1 iPhone with the Talkif app signed in' : `${n} iPhones with the Talkif app signed in`

/**
 * The phone check: whose phone call_me rings (the only person, or the one picked
 * with /talkif ring) and whether it can ring. `undefined` when Talkif did not say.
 */
export function phoneCheck(server: ServerSetup | undefined, pickedUserId: string | undefined): Check | undefined {
  const people = server?.people
  if (!people) return undefined
  const name = 'Phone'
  const who = (p: RingPerson) => p.name ?? 'the account\'s person'
  if (people.length === 0) {
    return { name, ok: false, detail: 'nobody in this account takes calls', next: 'Only an owner, admin or member takes calls: sign in to the Talkif app as one of them.' }
  }
  const only = people.length === 1 ? people[0] : undefined
  const target = only ?? people.find(p => p.userId === pickedUserId)
  if (!target) {
    return { name, ok: false, detail: `${people.length} people take calls in this account and nobody is picked`, next: PICK_STEP }
  }
  const whose = only ? `call_me rings ${who(target)}` : `call_me rings ${who(target)} (picked with /talkif ring)`
  return target.phones > 0
    ? { name, ok: true, detail: `${whose}, who has ${phones(target.phones)}` }
    : { name, ok: false, detail: `${whose}, who has ${phones(0)}`, next: INSTALL_APP_STEP }
}

// ---- Claude Code permissions: what would stop a session while the person is away ----

type McpToolName = `mcp__${string}__${string}`

/** The plugin's tools a session uses while the person is away: ringing, and reporting on tasks. */
export const AWAY_TOOLS: ReadonlyArray<{ tool: McpToolName; input: Record<string, unknown>; why: string }> = [
  { tool: 'mcp__talkif__call_me', input: { questions: ['A question'] }, why: 'rings you when the session needs a decision' },
  { tool: 'mcp__talkif__talkif_question', input: { taskId: 't', text: 'q' }, why: 'asks back on a task instead of guessing' },
  { tool: 'mcp__talkif__talkif_submit', input: { taskId: 't', summary: 's', evidence: [], notVerified: [] }, why: 'hands in a finished task' },
  { tool: 'mcp__talkif__talkif_decline', input: { taskId: 't', reason: 'r' }, why: 'declines a task it cannot do' },
  { tool: 'mcp__talkif__talkif_answer', input: { taskId: 't', text: 'a' }, why: 'answers a question on a task it handed over' },
  { tool: 'mcp__talkif__talkif_review', input: { taskId: 't', decision: 'accept' }, why: 'reviews a submitted task' },
]

export type Verdict = { tool: string; decision: 'allow' | 'ask' | 'deny'; rule?: string }

const shortName = (tool: string): string => tool.replace(/^mcp__talkif__/, '')

/** One line per tool, then the settings change that lets the asking ones run, when any ask. */
export function permissionLines(verdicts: readonly Verdict[]): string[] {
  const lines = ['Permissions (Claude Code)']
  const why = (tool: string) => AWAY_TOOLS.find(t => t.tool === tool)?.why ?? ''
  for (const v of verdicts) {
    const name = shortName(v.tool)
    if (v.decision === 'allow') lines.push(`[ok]      ${name}: runs without a prompt`)
    else if (v.decision === 'ask') lines.push(`[asks]    ${name}: stops at a permission prompt (it ${why(v.tool)}; while you are away nobody answers the prompt)`)
    else lines.push(`[denied]  ${name}: refused${v.rule ? ` by the rule ${v.rule}` : ''}; remove that rule if this session should ${why(v.tool)}`)
  }
  const asking = verdicts.filter(v => v.decision === 'ask').map(v => v.tool)
  if (asking.length === 0) {
    lines.push('No change needed. The plugin needs no hook settings of yours: it brings its own.')
  } else {
    lines.push(
      'To let them run while you are away, add these to "permissions" → "allow" in ~/.claude/settings.json (or /permissions → Allow):',
      `  ${asking.map(t => JSON.stringify(t)).join(', ')}`,
      'They only send text to Talkif or ring a phone in your Talkif account; Talkif\'s API tools (placing calls, editing agents) keep their own permissions.',
    )
  }
  return lines
}

// ---- Plugin options worth changing, each with one reason ----

/** The plugin options as the session runs with them (plugin.json userConfig). */
export type PluginSettings = {
  callTasks: 'read-only' | 'session'
  callback: boolean
  parallel: boolean
  sharing: Sharing
  folders: string
  flowId: string
  debug: boolean
}

export type Advice = { option: keyof PluginSettings; now: string; suggested: string; kind: 'keep' | 'change' | 'optional'; reason: string }

/**
 * What to keep or change, for a person who wants to be phoned by their sessions.
 * `flow`: the voice agent calls use now (picked when flowId is empty); `cwd`: this
 * session's folder; `organization`: whether the account is one (undefined: not known).
 */
export function optionAdvice(s: PluginSettings, ctx: { flow: FlowRef | undefined; cwd: string | undefined; organization: boolean | undefined }): Advice[] {
  const advice: Advice[] = []
  advice.push(
    s.callTasks === 'read-only'
      ? { option: 'callTasks', now: 'read-only', suggested: 'read-only', kind: 'keep', reason: 'a task given on a call only reads, and the session tells you what it would change; you approve that at the terminal' }
      : { option: 'callTasks', now: 'session', suggested: 'read-only', kind: 'change', reason: 'with session, a task given on a call runs with this session\'s own permissions, so whatever they allow happens without you at the screen' },
  )
  advice.push(
    s.callback
      ? { option: 'callback', now: 'on', suggested: 'on', kind: 'keep', reason: 'a task you give on a call rings you back with the result when it ends after you hung up' }
      : { option: 'callback', now: 'off', suggested: 'on', kind: 'change', reason: 'off, a task you give on a call that ends after you hung up waits for your next call instead of ringing you' },
  )
  advice.push(
    s.parallel
      ? { option: 'parallel', now: 'on', suggested: 'on', kind: 'keep', reason: 'more tasks from a call queue behind the running one; turn it off if you would rather hear at once that the session is busy' }
      : { option: 'parallel', now: 'off', suggested: 'off', kind: 'keep', reason: 'a second task from a call is declined while one runs, so the call hears at once that the session is busy; turn it on if you give several tasks per call' },
  )
  if (ctx.organization === false) {
    advice.push({ option: 'sharing', now: s.sharing, suggested: s.sharing, kind: 'keep', reason: 'a personal account: only you reach your sessions, so sharing has no effect' })
  } else if (s.sharing === 'work') {
    advice.push({ option: 'sharing', now: 'work', suggested: 'ask', kind: 'change', reason: 'with work, any member of the organization can give this session tasks on their calls; ask lets them ask questions only, answered read-only' })
  } else {
    advice.push({
      option: 'sharing',
      now: s.sharing,
      suggested: s.sharing,
      kind: 'keep',
      reason: s.sharing === 'ask' ? 'members of the organization may ask this session questions (answered read-only), not give it tasks' : 'members of the organization do not reach this session; owners and admins still do',
    })
  }
  if (s.folders.trim()) {
    advice.push({ option: 'folders', now: s.folders.trim(), suggested: s.folders.trim(), kind: 'keep', reason: 'only sessions in these folders join Talkif' })
  } else if (ctx.cwd) {
    advice.push({ option: 'folders', now: '(empty)', suggested: ctx.cwd, kind: 'optional', reason: 'empty, every Claude Code session on this computer joins and can be reached by phone; list the folders whose sessions should' })
  }
  if (!s.flowId.trim() && ctx.flow) {
    advice.push({ option: 'flowId', now: '(empty)', suggested: ctx.flow.id, kind: 'optional', reason: `pins "${ctx.flow.name}", the agent calls run on now, so publishing another flow with a Connectors node does not change it` })
  }
  if (s.debug) {
    advice.push({ option: 'debug', now: 'on', suggested: 'off', kind: 'change', reason: 'it records this session\'s Talkif traffic; only needed while troubleshooting' })
  }
  return advice
}

/** The advice as lines: what to change first, then the optional ones, then what to keep. */
export function adviceLines(advice: readonly Advice[]): string[] {
  const order = { change: 0, optional: 1, keep: 2 } as const
  const sorted = [...advice].sort((a, b) => order[a.kind] - order[b.kind])
  return [
    'Suggested options (/config → talkif)',
    ...sorted.map(a =>
      a.kind === 'keep'
        ? `keep      ${a.option} = ${a.now}: ${a.reason}`
        : `${a.kind.padEnd(10)}${a.option}: ${a.now} → ${a.suggested}: ${a.reason}`,
    ),
  ]
}
