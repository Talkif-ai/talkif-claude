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

**Full access does not include Connectors.** Tick **Connectors** as well; it sits right under Full access.

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

On. This session can be reached through Acme.
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
| `Talkif: on · Acme` | this session can be reached through your voice agent, in the account named after the dot |
| `Talkif: on, away · Acme` | the same, and you are set as away: a waiting session rings you (see Away mode) |
| `Talkif: on a call` | a call is ringing or running for this session, or a task from a call is running or queued |
| `Talkif: connecting…` | the connection to Talkif is coming up, or dropped and retries by itself |
| `Talkif: off` | this session is switched off (`/talkif on` turns it back on) |
| `Talkif: not connected — run /talkif` | no API key, a setup problem, or Talkif refused the key: `/talkif` says why, `/talkif setup` checks everything |

`/talkif` gives the same answer in two or three lines, for example:

```
On. This session can be reached through Acme.
Call "Claude Code calls" in the Talkif app.
More: /talkif help
```

```
Not connected: Connectors are not turned on for your Talkif account.
Next: An owner or admin turns them on in app.talkif.ai under Developer → Integrations. The plugin checks again every 30 seconds.
More: /talkif help
```

When Talkif refuses the key (Connectors off, a missing scope, an IP allowlist), the plugin tries again every 30 seconds and comes back on by itself once it is fixed. `/talkif` tries again at once.

## Using it

**You call in.** Open the Talkif app, signed in, and call your voice agent. It knows which Claude Code sessions are connected and what each one is working on. Say what you want:

- "Ask the web app session why the build failed."
- "What did the API session change today?"
- "Tell the mobile app session to look into the login crash."
- "Call me back when it's done."

**Ask or task.** A question is an **ask**: the session answers right away and the agent reads you the answer. Something to do is a **task**: the agent tells you in one sentence what it sends and to which session, and sends it. When the task finishes, you hear the result on the call. If you have hung up by then, the session rings you with the result. Say "just tell me next time" and it waits for your next call instead.

**The session calls you.** When a session needs a decision from you, it uses the `call_me` tool. Your Talkif app rings. The agent asks the session's questions one by one, and the answers go back to the session when the call ends.

**What you say reaches every session.** After each call, a short summary goes to all your connected sessions, so what you explained on one call is known everywhere.

**Tell all sessions at once.** On a call, say something to all of them ("tell all my sessions I'm out, call me if you need me"). The agent sends it once to every one of your own sessions: no session claims it, none starts working on it; each one has it beside your next message.

## Away mode

One switch, kept by Talkif, that every one of your sessions in that Talkif account knows: on this computer and on your others. (It is kept per person; sessions of yours in another Talkif account learn it when they connect again.)

- `/talkif away` (or `/talkif away 30m`, `/talkif away 2h`): you are out. Without a time it lasts 12 hours, at most a day.
- `/talkif back`: you are at the terminal again.
- On a call: "I'm going out for an hour" or "I'm back". The agent sets it for you.

While you are away, a session that waits for you rings your own Talkif app after a minute instead of waiting in the terminal, once per situation:

- **An open question**: it stopped with a question or a decision only you can make, or it shows you a question to pick an answer from. The call asks it in plain words; your answers come back to the session.
- **A permission prompt**: its permission dialog stays open with nobody typing (Claude Code's own signal, after a few seconds). The call says in plain words what it wants to do and why, never the command itself. It can only be allowed at your computer.
- **A long task done** (off by default): a turn of 10 minutes or more finished.

When you are not set away, nothing rings unless you set **Ring me when a session waits** to 5, 10 or 30 minutes. Typing in a session counts as an answer: it does not ring for what you already answered. A call that is already pending is never doubled, sessions on one computer ring at least 3 minutes apart, and one session rings at most 3 times an hour. When you do not answer a call, that session rings you no more for 15 minutes (call_me included), and a turn a call started never rings by itself. Automatic rings go to your own phone only, never to the person picked with `/talkif ring`; in an account where several people take calls, sessions do not ring by themselves (call_me still works). The away state reaches a session beside its next message, never in the system prompt, so it does not cost the session its prompt cache.

**Nothing is allowed by phone.** A permission ring only tells you a session waits and what for; you allow it at your computer.

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
- **Call text is treated as data.** Transcripts, call summaries, notes to all sessions and the away note reach the session marked as text from a call, not as instructions.
- **No permission by phone.** A call can never allow a tool: a permission ring only tells you a session waits. A turn a call started never rings by itself, and an unanswered call pauses that session's rings for 15 minutes.
- **Away mode is per person.** With an API key, `/talkif away` and notes to all sessions work only in an account where one person takes calls: a key can be shared, and its sessions would be someone else's.

## Who can reach what

- **Personal account:** only you reach your sessions and connectors.
- **Organization:** every owner, admin and member of the organization on a proven call reaches all of its connectors, your coding sessions included: they can ask questions and give tasks. Each question or task names who asked by their Talkif profile name ("Question from Ada on a call", "Task from Ada on a call"), and the session's traffic shows it too. A task from someone else never rings you back. Sessions running the older call-me plugin before 0.24.0 stay reachable by you alone.
- **Tasks from a call stay read-only by default**, whoever gives them (see `callTasks`).
- **Callers who are not proven** (phone numbers, embeds, API keys) reach nothing, except connectors you made public, and those only for look-ups.

## What this plugin does on your computer

Everything the plugin's own code does, in one place. Its code is the files in `hooks/`: it downloads and runs no other code, builds no code from text, and reads no file on your computer.

### Your API key

The key comes only from the plugin's **Talkif API key** option, which Claude Code keeps in your system keychain. The plugin reads no key or token from anywhere else: not from environment variables, files, or other tools' settings. It sends the key only to the Talkif API, as the `Authorization` header.

### Hosts it contacts

- **The Talkif API**, `https://api.talkif.ai` (or the address in **API URL (advanced)** when you set one). Every request carries your key and the header `User-Agent: talkif-claude/<version>`. No other host.
- **The Talkif MCP server**, `https://api.talkif.ai/api/v1/mcp`, for the Talkif tools. Claude Code connects to it from `.mcp.json` with your key; the plugin's code does not.
- Short summaries (see below) are written by Claude through Claude Code's own model access, not through any other host.

### What it sends to Talkif

Text bound for Talkif's session bridge goes through a redaction step first: anything that looks like a key, token or password becomes `[redacted]`.

The plugin reads the conversation only to write what it sends: the recap, its answers on a call, the score for an offered request, and the plain words of a ring. Claude writes these from the conversation through Claude Code; what leaves your computer is only what is listed here.

- **To join your voice agent**: a short name for the session (a name of its work, else `repo (branch)`, else the folder's name), Claude Code's id for the session, the repository's GitHub name and folder name as topics, the sharing level, and a recap.
- **The recap**: up to four short lines on what the session is working on and where it stands, written by Claude from the session's last 30 messages (each cut to 400 characters). Sent when the session joins, after a turn at most every 15 minutes, when a call starts and before `call_me` rings.
- **On a call**: the session's answers to questions put to it, a short "I have started on it", and at the end of a task from a call the turn's final answer (its last 1,400 characters). When such a task waits at a permission prompt, the call hears which tool waits and, for a shell command, its text. When your voice agent offers a request to several sessions, only a score of how well it fits this session goes back.
- **Rings**: for `call_me`, its questions and background line, and the person to ring when you name one. For an automatic ring (away mode, ring options): the session's name and what it waits for in plain words (the open questions, what a waiting permission prompt would do, or a one-line summary of a finished task), never the command itself. When a task from a call ends after you hung up: its result, or what blocks it.
- **Between sessions**: the text of a SendMessage to a Talkif session, and each task move (questions, answers, submissions with their evidence, reviews, declines).
- **Away mode**: away or back, and for how long.
- **/talkif publish** (only when you run it): writes the call prompt into your flow's Connectors node and publishes the flow.

It also reads from Talkif: your published flows (to find the one with a Connectors node), whether Connectors are on, the people a call can ring, your other reachable sessions, and, with the Calls (read) scope, the transcript of a `call_me` call to a teammate.

### Programs it starts

Only `git`, in the session's folder, to name the session and its topics: `git rev-parse --show-toplevel`, `git branch --show-current` and `git remote get-url origin`. Nothing else. It reads one environment variable, `HOME`, to expand `~/` in the **Folders** option and to never name a session after your home folder.

### Files it writes

None. It keeps a few small values in Claude Code's own store for this plugin: the on/off switches, the flow picked and the person `/talkif ring` picked (per API address), a `call_me` call still waiting for its outcome (per session; removed when the call ends, or after a day), when a session last rang you automatically, and which plugin version last said the phone agent needs `/talkif publish`. With the **Debug traffic pane** option on, the traffic it shows is kept in the session's memory only.

### What it puts in the prompts it submits

The plugin starts a turn of the session (a prompt it submits) only for something from Talkif:

- the outcome of a `call_me` call or an automatic ring: the questions, then the call's transcript, or that nobody answered, or that no outcome came within 30 minutes;
- the transcript of a call the session took part in;
- a task given on a call (the spoken instruction);
- a task from another session, and its answers, reviews, cancellations and results; updates on a task this session handed over.

Each prompt says where it comes from. Transcripts, notes, answers and other sessions' text come fenced and marked as data from Talkif, not instructions; a task's own words come marked as speech-to-text from a call, or as a hand-over from another session. Each carries the rules for its turn: tasks from a call run read-only (unless **Tasks from calls** is `session`), nothing in them approves an action, and no secret is to be said.

Beside the messages you type, it adds context only when something changed: that you are away or back (and your away note), notes you sent from a call to all sessions, summaries of your recent calls, and the list of your other reachable sessions. Your own text is never changed. The system prompt gets one fixed section that never changes: when to use `call_me`, how Talkif sessions appear in ListAgents and SendMessage, and how to write a task.

### Tools and commands it adds

- `call_me`, and the task tools `talkif_question`, `talkif_submit`, `talkif_decline`, `talkif_answer` and `talkif_review` (each sends one thing to Talkif, see above);
- the `/talkif` command;
- the Talkif MCP server's tools, through `.mcp.json`;
- the **Talkif traffic** pane (`/talkif traffic`, debug option only).

### What each hook decides, and when

| Hook | What it does |
|---|---|
| system prompt | adds the one fixed section above |
| your message | adds the context above beside it; never blocks or changes it. Typing counts as an answer, so no ring follows for what you answered |
| session start / end | joins Talkif (when the session's folder is allowed by **Folders**), adds the tools and `/talkif`, restores a waiting `call_me` call / leaves Talkif |
| compaction | sends the session list and the away state again after it |
| turn start / end | knows which turn is a task from a call (read-only), sends that task's result to its call, rings later for an open question or a long task only as the ring options say, refreshes the recap |
| every tool call | during a task from a call with **Tasks from calls** `read-only`: refuses tools that change anything (only reading tools and a short list of read-only commands pass) and any read of credential files. At any time: refuses the Talkif MCP server's own session tools (`talkif_send`, `talkif_inbox`, …), which act as a separate cloud agent. Every other call goes on unchanged |
| tool descriptions | marks those session tools as not for this session |
| ListAgents | adds your reachable Talkif sessions to its answer |
| SendMessage | only when Claude Code found no agent of that name and the name is one of your Talkif sessions: delivers the message through Talkif and answers with whether it was delivered, in place of the "no such agent" error |
| starting a subagent | only during a read-only task from a call: refuses teammates, workflows and background subagents, and keeps the subagents it lets start read-only. Otherwise every spawn goes on unchanged; it never changes a subagent's permission mode |
| permission request | **never answers it**: every request goes on to Claude Code exactly as it came, and you allow or refuse it at your computer. It only notes that the session waits at a permission dialog: in your own work, a ring (when you are away or a ring option says so) tells you that it waits and what for; in a task from a call, that call hears which tool waits |
| notifications | when Claude Code says a permission dialog is open with nobody typing, the wait for that ring starts |
| `/talkif` | answers the command |
| traffic pane | draws the debug pane |

Nothing the plugin does can allow a tool call or change a permission rule, a permission mode or Remote Control.

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
| `/talkif away [30m · 2h]` · `/talkif back` | you are out (waiting sessions ring you) / at the terminal again; every session of yours knows |

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
| `ringAfter` | `never` | ring when a session waits this many minutes for you (`5`, `10`, `30`); `never`: only while you are set away, then after a minute |
| `ringOnQuestion` | on | ring for an open question |
| `ringOnPermission` | on | ring for a permission prompt |
| `ringOnFinish` | off | ring when a turn of 10 minutes or more finished |
| `parallel` | off | queue more tasks from a call while one runs, instead of saying "still on the last task" |
| `debug` | off | record this session's traffic for `/talkif traffic` |

## Troubleshooting

| You see | Fix |
|---|---|
| `no API key is set yet` | Create a key (step 1) and paste it in `/plugin` → Installed → talkif → Configure options. |
| `Connectors are not turned on for your Talkif account` | An owner or admin turns them on in the dashboard: Developer → Integrations. The plugin notices within 30 seconds, or at once with `/talkif`. |
| `your API key is set, but it is missing a permission` | Run `/talkif`: it names the row to tick in Developer → Credentials. |
| `missing a permission`, although the key has **Full access** | Full access does not include Connectors. In Developer → Credentials, open the key, tick **Connectors** under Full access and save. The key itself stays the same. |
| `this computer's IP address is not on the API key's allowlist` | Add your current IP address to the key, or remove the restriction. The plugin checks again every 30 seconds. |
| `your Talkif account has no published flow with a Connectors node` | Add a Connectors node to an agent in the flow builder and publish it, or set `flowId`. |
| `the API key was refused (expired or revoked?)` | Create a new key and paste it in Configure options. |
| `/talkif` is an unknown command in a session | The session's folder is not in the `folders` option. Add it, or empty the option. |
| Your call does not reach the session | Call from the Talkif app while signed in, and check `/talkif` says `On`. |
| `/plugin` lists **talkif** more than once | One is the plugin, the others its tools: Claude Code shows the plugin's own tools (`call_me` and the task tools) as an MCP server named after the plugin, and the bundled Talkif API server as a second one. Same plugin, nothing extra to connect. |
| Talkif tools appear twice, or `talkif_submit` from two places | You also added Talkif's MCP server yourself (for example `claude mcp add talkif …`). Remove that one: the plugin brings it. |
| The bundled Talkif server asks you to sign in | The API key option is empty. Paste the key in `/plugin` → Installed → talkif → Configure options; signing in through the browser gives no Talkif tools here. |

After a plugin update, run `/reload-plugins` to use it without restarting.

## For Talkif developers

To point the plugin at another Talkif API, set **API URL (advanced)**; the key always comes from the **Talkif API key** option.

Checks before a release: `claude plugin validate --strict .` and `claude plugin test .`.

## License

MIT. See [LICENSE](LICENSE).
