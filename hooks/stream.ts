// The live stream: Talkif pushes this session's turns the moment they arrive, as
// Server-Sent Events, instead of the session asking every 20 seconds. The plugin's
// runtime has no socket of its own, so curl holds the connection (it ships with
// macOS, Linux and Windows 10 and later). Everything here is pure: the curl command
// and its config, the reader of what curl writes, and what to do once a stream ends.

/** One frame of the stream: the JSON in an event's data. */
export type StreamFrame = { type: string; id?: string; data?: unknown }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * curl's arguments: nothing secret, the same for every stream (the URL and the key
 * go in on stdin, `--config -`). `-q` first: no ~/.curlrc. `--include`: the status
 * line and headers come first on stdout, so a refusal's status and body are read.
 */
export const CURL_ARGV: readonly string[] = [
  'curl',
  '-q',
  '--silent',
  '--show-error',
  '--no-buffer',
  '--include',
  '--suppress-connect-headers',
  // The address is used as written: no [ ] or { } ranges.
  '--globoff',
  '--connect-timeout',
  '15',
  // Talkif pings every 15 s: 50 s without a byte is a dead stream, and curl ends it (exit 28).
  '--speed-limit',
  '1',
  '--speed-time',
  '50',
  '--proto',
  '=https,http',
  '--config',
  '-',
]

const SAFE_KEY = /^[A-Za-z0-9._~+/=-]+$/
const SAFE_URL = /^https?:\/\/[^\s"'\\]+$/
const SAFE_AGENT = /^[A-Za-z0-9._/+-]+$/

/**
 * What curl reads on stdin: the URL and the key, never in argv (other users of the
 * machine can read a process's arguments). Undefined when one of them cannot be written
 * into curl's config as is (a quote or a line break would end the value early).
 */
export function curlConfig(url: string, key: string, userAgent: string): string | undefined {
  if (!SAFE_URL.test(url) || !SAFE_KEY.test(key) || !SAFE_AGENT.test(userAgent)) return undefined
  return [`url = "${url}"`, `header = "Authorization: Bearer ${key}"`, 'header = "Accept: text/event-stream"', `user-agent = "${userAgent}"`, ''].join('\n')
}

const MAX_HEAD = 16 * 1024
// A call outcome carries its transcript (at most 40 000 characters, escaped as JSON).
const MAX_EVENT = 1024 * 1024
const MAX_ANSWER = 8 * 1024

/** One event block: its data lines joined and read as a frame; comments and other fields are ignored. */
export function parseEvent(block: string): StreamFrame | undefined {
  const data: string[] = []
  for (const raw of block.split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw
    if (line.startsWith('data:')) data.push(line.slice(line.startsWith('data: ') ? 6 : 5))
  }
  if (!data.length) return undefined
  let value: unknown
  try {
    value = JSON.parse(data.join('\n'))
  } catch {
    return undefined
  }
  if (!isRecord(value) || typeof value.type !== 'string') return undefined
  return { type: value.type, ...(typeof value.id === 'string' ? { id: value.id } : {}), ...('data' in value ? { data: value.data } : {}) }
}

/**
 * Reads what curl writes as it comes, in pieces of any size: the HTTP status once
 * the headers are in, then each frame of a 200 stream, or the body of any other
 * answer (its first 8 KB) for the refusal check. Throws when it is not HTTP or a
 * part never ends.
 */
export class StreamReader {
  status: number | undefined
  answer = ''
  private buf = ''

  feed(text: string): StreamFrame[] {
    this.buf += text
    while (this.status === undefined) {
      const end = /\r?\n\r?\n/.exec(this.buf)
      if (!end) {
        if (this.buf.length > MAX_HEAD) throw new Error('the response headers never ended')
        return []
      }
      const head = this.buf.slice(0, end.index)
      this.buf = this.buf.slice(end.index + end[0].length)
      const code = Number(/^HTTP\/[\d.]+\s+(\d{3})/.exec(head)?.[1] ?? NaN)
      if (!Number.isInteger(code)) throw new Error('the answer is not HTTP')
      // An informational answer (1xx) comes before the real one.
      if (code >= 200) this.status = code
    }
    if (this.status !== 200) {
      this.answer = (this.answer + this.buf).slice(0, MAX_ANSWER)
      this.buf = ''
      return []
    }
    // Only a CRLF is joined: a lone CR at the end of a piece may be the first half of one.
    this.buf = this.buf.replace(/\r\n/g, '\n')
    const frames: StreamFrame[] = []
    for (let at = this.buf.indexOf('\n\n'); at >= 0; at = this.buf.indexOf('\n\n')) {
      const frame = parseEvent(this.buf.slice(0, at))
      this.buf = this.buf.slice(at + 2)
      if (frame) frames.push(frame)
    }
    if (this.buf.length > MAX_EVENT) throw new Error('a stream event never ended')
    return frames
  }
}

/** How one stream ended. */
export type StreamEnd =
  /** curl, or a process at all, could not start here. */
  | { kind: 'unstartable'; detail: string }
  /** Talkif answered with something other than a stream (a refusal, an expired session). */
  | { kind: 'answered'; status: number; answer: string }
  /** Talkif ended it and said why (`session.closed`). */
  | { kind: 'closed'; reason: string; livedMs: number }
  /** It ended without a word: the connection dropped, curl gave up, the network went away. */
  | { kind: 'dropped'; opened: boolean; livedMs: number; detail: string }
  /** This session left the bridge meanwhile (/talkif off, expired, the session ended). */
  | { kind: 'left' }

/**
 * What a bridge does next (a refusal, 401 or 403, is checked before this, as a poll's is).
 * `failed`: the stream counts one more failure in a row.
 */
export type StreamNext =
  | { then: 'reconnect'; afterMs: number; failed: boolean }
  /**
   * Long-poll, and try the stream again after `offMs` (Infinity: not in this session).
   * `failing`: it kept failing; after the wait it gets one try, and the next wait is longer.
   */
  | { then: 'poll'; offMs: number; why: string; failing?: true }
  /** The session is gone on the server: register again (then stream again). */
  | { then: 'register' }

/** Failures in a row (each one quick) before the bridge long-polls for a while instead. */
export const STREAM_FAILURES_BEFORE_POLL = 3
/** How long a bridge long-polls after the stream kept failing, before one more try; doubled each time that try fails too. */
export const STREAM_FAILING_OFF_MS = 10 * 60_000
/** The longest of those waits. */
export const STREAM_FAILING_MAX_OFF_MS = 2 * 60 * 60_000
/** How long it long-polls after Talkif refused another stream (429: too many, too often). */
export const STREAM_BUSY_OFF_MS = 5 * 60_000
/** How long it long-polls after Talkif did not find the stream before any opened (a server not updated yet). */
export const STREAM_MISSING_OFF_MS = 60_000
/** A stream that lived this long (pings came) and then dropped is no failure: it reconnects at once. */
export const STREAM_HEALTHY_MS = 20_000

/**
 * What came before a stream: its failures in a row, the waits after failing streams in
 * a row (`cooldowns`), and whether a stream opened since the session last registered.
 */
export type StreamHistory = { failures: number; cooldowns: number; openedSinceRegister: boolean }

/** It opened and lived long enough to count as working: the failure counts start over. */
export const wasHealthy = (end: StreamEnd): boolean =>
  (end.kind === 'closed' && end.livedMs >= STREAM_HEALTHY_MS) || (end.kind === 'dropped' && end.opened && end.livedMs >= STREAM_HEALTHY_MS)

/**
 * The next step after a stream ended. `random` in [0, 1) spreads the reconnects of many
 * sessions after a deploy.
 */
export function afterStream(end: StreamEnd, history: StreamHistory, random: number): StreamNext {
  const jitter = (base: number) => Math.round(base * (0.5 + random))
  const failure = (): StreamNext => {
    const failures = history.failures + 1
    if (failures >= STREAM_FAILURES_BEFORE_POLL) {
      const offMs = Math.min(STREAM_FAILING_MAX_OFF_MS, STREAM_FAILING_OFF_MS * 2 ** history.cooldowns)
      return { then: 'poll', offMs, why: `the live stream kept dropping; it is tried again in ${Math.round(offMs / 60_000)} minutes`, failing: true }
    }
    return { then: 'reconnect', afterMs: jitter(Math.min(30_000, 1_000 * 2 ** (failures - 1))), failed: true }
  }
  switch (end.kind) {
    case 'unstartable':
      return { then: 'poll', offMs: Infinity, why: `curl could not start here (${end.detail})` }
    case 'answered':
      // After a stream of this session opened, a 404 means the session expired. Before
      // any did, it is a server without the stream (one not updated yet, while Talkif
      // updates): registering again would land there again, so long-poll for a minute.
      if (end.status === 404) {
        return history.openedSinceRegister ? { then: 'register' } : { then: 'poll', offMs: STREAM_MISSING_OFF_MS, why: 'Talkif did not find the live stream; it is tried again in a minute' }
      }
      if (end.status === 429) return { then: 'poll', offMs: STREAM_BUSY_OFF_MS, why: 'Talkif refused another live stream for now; it is tried again in 5 minutes' }
      return failure()
    case 'closed':
      if (end.reason === 'session_ended') return { then: 'register' }
      // Every minute Talkif asks for the next stream, so a client that went away goes offline.
      if (end.reason === 'reconnect') return { then: 'reconnect', afterMs: 0, failed: false }
      // A deploy: another server takes it at once.
      if (end.reason === 'server_shutting_down') return { then: 'reconnect', afterMs: Math.round(1_000 * random), failed: false }
      // The next connect is refused if the key really is; that pauses like a poll.
      if (end.reason === 'credentials_revoked') return { then: 'reconnect', afterMs: 1_000, failed: false }
      return failure()
    case 'dropped':
      if (end.opened && end.livedMs >= STREAM_HEALTHY_MS) return { then: 'reconnect', afterMs: jitter(1_000), failed: false }
      return failure()
    case 'left':
      // The next round registers again or stays off, as the switches say.
      return { then: 'reconnect', afterMs: 0, failed: false }
  }
}
