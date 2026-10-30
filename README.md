# Talkif for Claude Code

One plugin for Talkif in Claude Code:

- **The Talkif API as tools.** Claude can work with your voice agents, calls, campaigns, contacts, phone numbers and more, through Talkif's MCP server (bundled, nothing to set up). What it may do is decided by the scopes of your API key.
- **Your sessions by voice.** You call your Talkif voice agent from the Talkif app and ask your Claude Code sessions questions or give them tasks. A session can call you when it needs a decision.
- **Sessions working together.** Your sessions, on any computer and any agent, ask each other questions and hand each other tasks with a contract and a review.

## Before you start

You need:

- **A Talkif account.** You sign in to the Talkif app (iPhone, web dashboard or desktop) with it.
- **Connectors turned on.** An owner or admin of the account turns them on in the Talkif dashboard: **Developer → Integrations**.
- **A voice agent with a Connectors node.** In the Talkif flow builder, add a **Connectors** node to an agent and publish the flow. The plugin uses the first published flow that has one. To use another flow, set the `flowId` option.

## Setup in 3 steps

**1. Create an API key.** In the Talkif dashboard go to **Developer → Credentials** and create a key with these scopes:

| Scope | Why |
|---|---|
| **Connectors** (`session_bridge:write`) | your sessions join your voice agent, answer it, ring you, and get each call's outcome and transcript |
| **Flows** (`flows:read`) | the plugin finds the flow your calls run on |
| **Calls** (`calls:read`), optional | call_me gets the transcript of a call to a teammate (a call to you comes back without it) |
| anything else, optional | the Talkif tools Claude may use: each tool is listed only when the key has its scope (for example **Calls** to read call history, **Flows (write)** to edit voice agents) |

Create the key yourself, signed in as you: what the key registers belongs to the person who created it.

**2. Install the plugin.** At the Claude Code prompt:

```
claude plugin marketplace add Talkif-ai/talkif-claude && claude plugin install talkif@talkif-claude
```

Or at the Claude Code prompt: `/plugin marketplace add Talkif-ai/talkif-claude`, then `/plugin install talkif@talkif-claude`, and choose the **user** scope.

**3. Paste the key and check.** The install asks for the plugin's options. Paste the key into **Talkif API key** and leave **API URL (advanced)** empty. To change the key later: `/plugin` → Installed → talkif → **Configure options**. The key is kept in your system keychain, not in a settings file.

Then run:

```
/talkif setup
```

When everything is ready you see:

```
Talkif setup
[ok]      API key: from the apiKey option (keychain)
[ok]      Backend: https://api.talkif.ai (Talkif, the default)
[ok]      Connectors: turned on for the account Acme (by Ada Lovelace)
[ok]      Call history: the key can read calls and transcripts
[ok]      Flow: "Claude Code calls" (<flow id>, the first published flow with a Connectors node; set flowId in /config → talkif to choose another)

All set. Call your Talkif agent from the Talkif app (signed in), or let a session ring you with call_me.

Details
Accounts: Acme (connected)
Folders: every session (set folders in /config → talkif to limit)
This session: follows the default
All sessions: on. New sessions start on.

☎ On. This session can be reached through Acme.
Call "Claude Code calls" in the Talkif app.
More: /talkif help
```

If something is missing, it says what to do next, for example:

```
[missing] Connectors: not turned on for this account

Next step: An owner or admin of the Talkif account turns Connectors on in the dashboard: Developer → Integrations.
Run /talkif setup again after each step.
```

`/talkif setup` only reads. It never prints your key.

## Is it on?

Under the prompt, the plugin shows one status line:

| Status line | What it means |
|---|---|
| `☎ Talkif: on · Acme` | this session can be reached through your voice agent, in the account named after the dot |
| `☎ Talkif: on a call` | a call is ringing or running for this session, or a task from a call is running or queued |
| `☎ Talkif: connecting…` | the connection to Talkif is coming up, or dropped and retries by itself |
| `☎ Talkif: off` | this session is switched off (`/talkif on` turns it back on) |
| `☎ Talkif: not set up — run /talkif setup` | no API key, a setup problem, or Talkif refused the key: `/talkif` says why, `/talkif setup` checks everything |

`/talkif` gives the same answer in two or three lines, for example:

```
☎ On. This session can be reached through Acme.
Call "Claude Code calls" in the Talkif app.
More: /talkif help
```

```
☎ Not set up: Connectors are not turned on for your Talkif account.
Next: An owner or admin turns them on in the Talkif dashboard (Developer → Integrations).
More: /talkif help
```

When Talkif refuses the key (Connectors off, a missing scope, an IP allowlist), the plugin tries again every 30 seconds and comes back on by itself once it is fixed. `/talkif setup` tries again at once.

## Using it

**You call in.** Open the Talkif app, signed in, and call your voice agent. It knows which Claude Code sessions are connected and what each one is working on. Say what you want:

- "Ask the web app session why the build failed."
- "What did the API session change today?"
- "Tell the mobile app session to look into the login crash."
- "Call me back when it's done."

**Ask or task.** A question is an **ask**: the session answers right away and the agent reads you the answer. Something to do is a **task**: the agent tells you in one sentence what it sends and to which session, and sends it. When the task finishes, you hear the result on the call. If you have hung up by then, the session rings you with the result. Say "just tell me next time" and it waits for your next call instead.

**The session calls you.** When a session needs a decision from you, it uses the `call_me` tool. Your Talkif app rings. The agent asks the session's questions one by one, and the answers go back to the session when the call ends.

**What you say reaches every session.** After each call, a short summary goes to all your connected sessions, so what you explained on one call is known everywhere.

## The Talkif tools

The plugin brings Talkif's MCP server (`https://api.talkif.ai/api/v1/mcp`) with your API key: every Talkif API operation your key's scopes allow is a tool Claude can use ("which calls failed today?", "publish the support flow", "add these contacts to the campaign"). Tools that cost money or reach people outside your account (placing calls, buying numbers, starting campaigns) say so, and Claude asks you first.

The server also has tools for an agent that reaches Talkif only through it (`talkif_send`, `talkif_inbox`, …). They act as a separate cloud agent, not as your Claude Code session, so the plugin keeps them out of the way: a session uses SendMessage, ListAgents, call_me and its own task tools below.

## Sessions talking to each other

Each session learns which of your other sessions Talkif can reach, on any computer and any agent, and what each is working on. The list comes beside your next message when it changes, never in the system prompt, so it does not cost the session its prompt cache. Claude uses its own tools for them:

- **ListAgents** (Claude Code's own) lists them after the agents on this computer, with each one's name and recap
- **SendMessage** (Claude Code's own) to one of those names hands it over through Talkif; the answer or updates come back as messages

A task can carry a contract. Claude writes the SendMessage as labelled lines:

```
Goal: Find why the iOS build fails on main
Done when: the failing step and its cause are named, with the log line
Deliverable: a short summary with links
Autonomy: propose
Deadline: 2h
Context: it started after this morning's dependency update
```

`Goal:` is required, the rest is optional, and a label's text runs until the next label. `Autonomy: propose` means change nothing and propose; `ask_first` (the default) means ask before changing, deleting, spending money or contacting anyone. `Deadline:` is a time within 24 hours, or `30m` / `2h`. The session that gets it asks with `talkif_question` when something is unclear, finishes with `talkif_submit` (a summary, the evidence, and what it did not check) or declines with `talkif_decline`. The session that sent it answers with `talkif_answer` and reviews the submission with `talkif_review`: accept, or revise with what is missing. A message without a `Goal:` line goes as plain text, as before.

A task can be handed on from session to session (and to connected bots such as a Grok Bot) up to three times from where it started, never back into its own chain; work between sessions never rings a phone, and nothing a session sends can approve anything for another. In an organization, roles decide who reaches what (see below).

## Safety

- **Tasks from a call are read-only by default.** While such a task runs, only tools that read work: reading files, searching, `git status`, `git log`, `git diff` and a few other read-only commands. Anything that changes something is refused, and the session tells you what it would change. You approve that at the terminal. To let call tasks use the session's normal Claude Code permissions, set the option `callTasks` to `session`. The plugin never grants a permission by itself.
- **Credential files are not read during a call task**: for example `~/.ssh`, `~/.aws`, `.env` files and key files.
- **Secrets are kept off the call, as well as possible.** The voice agent and the sessions are told never to say keys, tokens or passwords. The plugin also replaces text that looks like a secret with `[redacted]` before it leaves your machine. This is best effort: a secret in an unusual format can still get through.
- **Only proven callers count.** A call reaches sessions only when it is started from the Talkif app or dashboard while signed in, when a session places it to you, or when you confirm on your signed-in Talkif app that a call from your phone number is you. Any other call from a phone number, an embed or an API key does not.
- **Call text is treated as data.** Transcripts and call summaries reach the session marked as text from a call, not as instructions.

## Who can reach what

- **Personal account:** only you reach your sessions and connectors.
- **Organization:** every owner, admin and member of the organization on a proven call reaches all of its connectors, your coding sessions included: they can ask questions and give tasks. Each question or task names who asked by their Talkif profile name ("Question from Ada on a call", "Task from Ada on a call"), and the session's traffic shows it too. A task from someone else never rings you back. Sessions running the older call-me plugin before 0.24.0 stay reachable by you alone.
- **Tasks from a call stay read-only by default**, whoever gives them (see `callTasks`).
- **Callers who are not proven** (phone numbers, embeds, API keys) reach nothing, except connectors you made public, and those only for look-ups.
## Commands

`/talkif help` shows this list.

| Command | What it does |
|---|---|
| `/talkif` | is this session reachable? |
| `/talkif on` · `/talkif off` | make this session reachable / not reachable |
| `/talkif on all` · `/talkif off all` | all open sessions on / off |
| `/talkif default on` · `/talkif default off` | how new sessions start |
| `/talkif setup` | check the connection and show what's missing (also shows the key, flow, accounts and folders in use) |
| `/talkif traffic` | see what went back and forth (needs the `debug` option) |
| `/talkif ring` | list who call_me may ring; `/talkif ring <number or name>` picks whose phone rings (needed when several people share the Talkif account) |

Advanced:

| Command | What it does |
|---|---|
| `/talkif publish` | write the call prompt into your flow's Connectors node (the key also needs `flows:write`) |
| `/talkif latency` | time a spoken answer |

## Options

Change them in `/config` → talkif. The API key is in `/plugin` → Installed → talkif → **Configure options**.

| Option | Default | What it does |
|---|---|---|
| `apiKey` | empty | your Talkif API key, kept in the keychain |
| `apiUrl` | empty | API URL (advanced). Empty: Talkif (https://api.talkif.ai). Only change it if Talkif support tells you to |
| `flowId` | empty | the flow your calls run on. Empty: the first published flow with a Connectors node |
| `folders` | empty | only sessions in these folders join, comma-separated (`~/work/app, ~/notes`). Empty: every session |
| `sharing` | `ask` | in an organization, what other members may do with your sessions: `private`, `ask` (questions only) or `work` (questions and tasks); `/talkif share` changes one session |
| `callTasks` | `read-only` | `read-only`: tasks from a call can only read. `session`: they use the session's own permissions |
| `callback` | on | ring you when a task from a call ends after you hung up |
| `parallel` | off | queue more tasks from a call while one runs, instead of saying "still on the last task" |
| `debug` | off | record this session's traffic for `/talkif traffic` |

## Other connectors

Besides Claude Code sessions, two small scripts can join your voice agent. They run on your machine with Node 22 or newer and take the key from the environment (a key with the Connectors scope):

```
export TALKIF_API_KEY=…
```

**Knowledge folder**: answers questions from a folder of `.md`, `.mdx` and `.txt` files.

```
node connectors/knowledge-folder.mjs ~/notes/product-docs --name "product docs"
```

Your organization's members can ask it too. Add `--audience public` to let any caller of your flows look things up in it (only for material you would publish).

**Launcher**: answers questions about GitHub, CI, logs and deploys by running Claude Code in plan mode (read-only) with your own tools.

```
node connectors/launcher.mjs --cwd ~/work --name ops
```

It only answers questions, never takes tasks, and only you can reach it (it runs with your own credentials). Both scripts take `--topics a,b,c` (what they are about).

## Troubleshooting

| You see | Fix |
|---|---|
| `no Talkif API key is set` | Create a key (step 1) and paste it in `/plugin` → Installed → talkif → Configure options. |
| `Connectors are not turned on for your Talkif account` | An owner or admin turns them on in the dashboard: Developer → Integrations. The plugin notices within 30 seconds, or at once with `/talkif setup`. |
| `the API key lacks a scope it needs` | Edit the key in Developer → Credentials and add the scope `/talkif setup` names. |
| `the API key lacks a scope it needs`, although the key has **Full access** | Full access does not include Connectors: it is granted by name only. In Developer → Credentials, untick Full access, tick All on every row including **session_bridge**, and save. The key itself stays the same. |
| `this computer's IP address is not on the API key's allowlist` | Add your current IP address to the key, or remove the restriction. The plugin checks again every 30 seconds. |
| `your Talkif account has no published flow with a Connectors node` | Add a Connectors node to an agent in the flow builder and publish it, or set `flowId`. |
| `the API key was refused (expired or revoked?)` | Create a new key and paste it in Configure options. |
| `/talkif` is an unknown command in a session | The session's folder is not in the `folders` option. Add it, or empty the option. |
| Your call does not reach the session | Call from the Talkif app while signed in, and check `/talkif` says `☎ On`. |
| `/plugin` lists **talkif** more than once | One is the plugin, the others its tools: Claude Code shows the plugin's own tools (`call_me` and the task tools) as an MCP server named after the plugin, and the bundled Talkif API server as a second one. Same plugin, nothing extra to connect. |
| Talkif tools appear twice, or `talkif_submit` from two places | You also added Talkif's MCP server yourself (for example `claude mcp add talkif …`). Remove that one: the plugin brings it. |
| The bundled Talkif server asks you to sign in | The API key option is empty. Paste the key in `/plugin` → Installed → talkif → Configure options; signing in through the browser gives no Talkif tools here. |

After a plugin update, run `/reload-plugins` to use it without restarting.

## For Talkif developers

To point the plugin at another Talkif API, set **API URL (advanced)**. Or leave the `apiKey` option empty and put the URL and keys in `~/.config/talkif/dev.env` (mode 600); this also lets one machine join several accounts at once:

```
TALKIF_API_URL=https://…  # optional: empty means https://api.talkif.ai
TALKIF_API_KEY=…         # scopes: flows
TALKIF_BRIDGE_KEY=…      # scope: Connectors (your personal account)
TALKIF_ORG_BRIDGE_KEY=…  # optional: Connectors in another account (any TALKIF_<NAME>_BRIDGE_KEY)
```

The **API URL (advanced)** option, when set, beats the file's `TALKIF_API_URL`; `flowId` and `folders` apply as usual. The connector scripts read the same file as a fallback (`--env-file PATH` picks another) and also take `--url URL` (or `TALKIF_API_URL`) and `--key-env VAR`. `node connectors/agent.mjs` is an experimental local helper that holds a WebSocket per session instead of long polling; it is not needed.

Checks before a release: `claude plugin validate . --strict`, `claude plugin test .` and `tsc -p . --noEmit`.

## License

MIT. See [LICENSE](LICENSE).
