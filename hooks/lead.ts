// The lead: one session the developer chooses to answer for all of their sessions.
// Pure functions only, so they are tested without the engine.
//
// Talkif keeps one lead per person: `/talkif lead` makes this session the lead,
// `/talkif lead off` ends it, and the developer can say it on a call ("make the
// deploy one the lead"). On a call, what they ask without naming a session goes
// to the lead instead of being offered to every session. It ends when the session
// goes offline or another session becomes the lead.

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Whether this session is the developer's lead, as a register answer, a lead turn or
 * PUT /lead says it; undefined when Talkif does not say (a Talkif without leads).
 */
export const parseLead = (body: unknown): boolean | undefined => (isRecord(body) && typeof body.lead === 'boolean' ? body.lead : undefined)

/** `/talkif lead [on | off]`: true to lead, false to stop; undefined for anything else. */
export function parseLeadArg(arg: string | undefined): boolean | undefined {
  const raw = (arg ?? '').trim().toLowerCase()
  if (raw === '' || raw === 'on') return true
  if (raw === 'off') return false
  return undefined
}

export const LEAD_USAGE = 'Usage: /talkif lead (this session answers for all of yours) or /talkif lead off.'

/**
 * What the session gets with its next message once it became the lead. Not in the
 * system prompt: it changes, and that would cost the session's cache.
 */
export const LEAD_CONTEXT = [
  "Talkif: this session is now the developer's lead: it answers for all of their sessions.",
  'On a call, what they ask without naming a session comes here ("what is waiting on me?", "how is everything going?").',
  'Answer from what their other sessions say they work on (ListAgents lists them with their recaps) and from the messages they sent you, and hand work on to the session it belongs to with SendMessage.',
  'Never say what another session did or where it stands unless its recap, its message or a tool result says so.',
].join(' ')

/** The same once it is no longer the lead (switched off, or another session took over). */
export const LEAD_ENDED_CONTEXT = "Talkif: this session is no longer the developer's lead. Answer for its own work only."

/** What `/talkif lead` and `/talkif lead off` answer once Talkif saved it. */
export function leadLine(isLead: boolean): string {
  return isLead
    ? 'Lead: this session answers for all of your sessions. On a call, what you ask without naming a session comes here. Another session that becomes the lead replaces it; it ends when this session goes offline.'
    : 'Not the lead: on a call, what you ask without naming a session is offered to all of your sessions again.'
}

/** What `/talkif lead` says when Talkif did not take it; `detail` is Talkif's own message. */
export function leadRefusal(status: number, detail: string): string {
  if (status === 404 || status === 405) return 'This Talkif does not know lead sessions yet, or this session just reconnected: try again in a moment.'
  if (status === 429) return 'Too many lead changes in a minute: try again shortly.'
  if (status === 403 && detail) return `Talkif did not take it: ${detail}`
  return `Talkif did not take it (${status})${detail ? `: ${detail}` : ''}`
}
