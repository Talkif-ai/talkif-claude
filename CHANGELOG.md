# Changelog

## 0.30.2 — 2026-10-30

- **The command is `/talkif`.** `/cm` was left over from the call-me name; every command, hint and message now says `/talkif` (`/talkif setup`, `/talkif on`, `/talkif ring`, `/talkif help`, …). There is no `/cm` any more.

## 0.30.1 — 2026-10-30

- **Fix: with Talkif's MCP server also added by hand, the plugin's own part did not start.** The plugin's tools are named `mcp__talkif__…`, the same names a hand-added server called "talkif" uses. Claude Code refused them, and that stopped the rest: no call_me, no task tools, the session never joined Talkif. Now a refused tool no longer stops anything else; the session joins as usual and says once which tools were not added and what to do: remove the hand-added server (`claude mcp remove talkif`), since the plugin brings it, and run `/reload-plugins`.

## 0.30.0 — 2026-10-30

- **One plugin: Talkif for Claude Code.** The call-me plugin is now `talkif`, in its own marketplace: `claude plugin marketplace add Talkif-ai/talkif-claude && claude plugin install talkif@talkif-claude`. Everything call-me did stays: calls with your sessions, call_me, `/cm`, tasks between sessions.
- **The Talkif API as tools.** The plugin brings Talkif's MCP server with your API key, so Claude can work with your voice agents, calls, campaigns, contacts and phone numbers. Your key's scopes decide which tools appear. If you added Talkif's MCP server yourself before, remove it: the plugin brings it.
- The MCP server's own session tools (`talkif_send`, `talkif_inbox`, …) act as a separate cloud agent, not as your Claude Code session, so the plugin keeps them out of the way. A session keeps using SendMessage, ListAgents, call_me and its own task tools.
- The status line reads `☎ Talkif: on`; the plugin's options are under `/plugin` → talkif.
- `yarn test` runs the tests, `yarn validate` the plugin checks.

The entries below are from the call-me plugin.

## 0.29.0 — 2026-10-30

- **Tasks between sessions have a contract.** When Claude hands a task to another session with SendMessage, it can write it as labelled lines: `Goal:`, `Done when:`, `Deliverable:`, `Autonomy:` (`propose` or `ask_first`), `Deadline:` and `Context:`. The session that gets it sees the contract, asks a question when something is unclear instead of guessing, asks before it changes, deletes, spends or contacts anyone, and finishes by submitting what it did with the evidence and what it did not check. The session that sent it reviews the submission against "Done when" and accepts it or sends it back with what is missing. A message without a `Goal:` line still goes as plain text. Five new tools carry this: `talkif_question`, `talkif_submit`, `talkif_decline`, `talkif_answer` and `talkif_review`. Needs the current Talkif API.
- **Calls to a teammate:** when they say "you decide", the voice agent no longer decides for them; it notes that they left the question to you.
- The voice agent says goodbye in the language of the call, and never says it is "implementing" anything.
- The transcript of a call to a teammate comes back to the session that rang. Such a call belongs to the teammate, so Talkif does not send its transcript with the outcome; call-me fetches it when the API key has the **Calls (read)** scope, and otherwise says where to find it.
- An unanswered ring says so in plain words ("not answered", "declined", "failed to connect") instead of "reason unknown".
- The instructions for a call that rings you are shorter, so up to eight questions fit Talkif's 4000-character limit.

## 0.28.2 — 2026-10-30

- Calling a teammate works: the call's instructions were over Talkif's 4000-character limit; a teammate's call leaves out the parts about your sessions.

## 0.28.1 — 2026-10-30

- call_me's `to` takes a Talkif user id as well as a name, so Claude can look the person up first (Talkif's `list_members`) and never ring the wrong teammate by a similar name.

## 0.28.0 — 2026-10-30

- **call_me can ring a teammate.** Ask Claude to call someone else in your Talkif account ("call Ömer and ask him …") and that one call rings their Talkif app; your own calls still ring you. The voice agent says whose session is calling, asks the questions, and the answers come back to the session.
- **Claude Code's own ListAgents and SendMessage reach your Talkif sessions.** ListAgents lists your sessions and bots on other computers and agents (Grok, Codex, Gemini, …) after the ones on this computer, and SendMessage to one of those names hands it over through Talkif; the answer or updates come back as messages. The separate `talkif_sessions` and `talkif_send` tools are gone. A local agent with the same name always wins.

## 0.27.0 — 2026-10-30

- **Your sessions know about each other, on any computer and any agent.** At start, and every ten minutes, a session learns which of your other sessions Talkif can reach and what each works on. Two new tools: `talkif_sessions` lists them, `talkif_send` asks one a question (answered at once from its own work) or hands it a task (its updates come back as messages). Roles decide who reaches what in an organization. A task can be handed on up to three times from where it started (never back into its own chain), and nothing a session sends can approve anything. Claude Code's own `SendMessage` still works for sessions on the same computer. Needs the current Talkif API.
- Secret redaction also catches xAI, Stripe and Google API keys and Slack refresh tokens, and Talkif keys with dashes or underscores.
- **You choose whose phone rings.** call_me used to ring whoever created the Talkif key, which in a shared organization key could be the wrong person. Now, in an account with one person, that person is rung; with several, pick yours once with `/cm ring` (it lists the people; `/cm ring 2` or `/cm ring ada` picks), and every session on the computer rings them. Until you pick, call_me says so instead of ringing someone. Needs the current Talkif API.
- **Nothing call-me adds changes the system prompt any more**, so a long session keeps its prompt cache. The list of other sessions and new call summaries come beside your next message, once, when they change; before, call summaries sat in the system prompt and a new call threw the cache away.
- Every update on a task names that task, so a session working on a call's task and another session's task at once sends each update to the right place.

## 0.26.2 — 2026-10-28

- **call-me tells you when your phone agent is out of date.** The agent on calls you place follows the instructions stored in your call flow, and only `/cm publish` updates them, so after a plugin update they stayed old until you ran it. Now, once per plugin version, call-me compares them and says so when they differ. `/cm help` explains `/cm publish` in plain words.
- In an organization, roles decide who reaches your sessions: owners and admins fully, members as `sharing` allows, agents (call staff) not at all. A team can share one key across people and machines. Needs the current Talkif API.

## 0.26.1 — 2026-10-28

- Messages in the chat no longer say "call-me: call-me: …": Claude Code already names the plugin, so call-me's own lines no longer repeat it.
- **When a session rings you, the call answers you there and then.** Ask the session something ("how is the training going?", "why is the GPU at 65%?") or tell it to do something now, and the voice agent sends it to that session during the call and tells you the result, instead of saying "Noted, I'll pass that on" and keeping it for after you hang up. It no longer says it sent something it did not send, and it asks its own open question at most twice instead of asking it again over yours.
- **You are no longer the messenger between your sessions.** When a session says it does not know something another one may know (where some data lives, a path, a setting), the voice agent asks your other sessions itself and hands the answer back, and asks you only when none of them knows.
- In the debug traffic pane, a dropped connection that recovers on the next try is a plain "connection dropped, retrying" line instead of a red error; it turns red from the third failure in a row.
- **Calls that sound more like a person.** From the call transcripts: when a session rings you, the agent first says who is calling and about what, and waits for you before asking (you no longer miss the first question while saying hello). It lets you go when you say goodbye or that you will deal with it later, instead of asking the open question again, and it says goodbye once. Questions from sessions come in plain words with what each choice changes. "Sezon" and "season" are understood as session, and a session you describe by its work ("the one waiting for staging") is matched by what it works on, not its name.
- **The agent knows what each session is doing now.** A session's recap leads with its work in plain words and what it needs from you ("training the speaker model, waiting for your top-up"), not its project and branch; with the current Talkif API, the recap a session refreshes when a call starts reaches that call. The agent never reads out IDs, hashes, paths, URLs or branch names.
- **Sessions have names you can say.** Each session names its own work in a few words ("speaker focus training", "mobile app review watcher") and the phone agent uses that name instead of "deploy (main)": in the list of sessions, when a session rings you, and when you hand it a job. Until its first recap, a session keeps its folder name.
- A session sends one recap at a time and not again within a minute: registering, a turn ending and a call starting could each send one, so the agent got two different recaps in a row.
- **You choose what colleagues may do with your sessions.** In a Talkif organization, other members could reach your sessions on their calls and give them tasks. New option `sharing` (default `ask`): `private` (nobody but you), `ask` (questions only, answered read-only) or `work` (questions and tasks). `/cm share private | ask | work` changes it for one session. Your own calls always reach your sessions fully, and only you ever approve anything. Needs the current Talkif API; with an older one, members keep reaching sessions as before.
- The debug traffic pane (`/cm traffic`) shows whole lines: long entries wrap instead of being cut off at the pane's edge, and an error shows its reason without the request wrapper in front of it.
- README, Troubleshooting: why `/plugin` lists call-me twice (the plugin and its MCP server), and why a Full access key still lacks Connectors (granted by name only).

## 0.26.0 — 2026-10-26

- **No more polling.** call-me no longer asks the calls API every 15 seconds whether a call has ended. Talkif now tells the session itself, on the connection it already holds: how a call it took part in ended and, for your own calls, the transcript. A session that was offline gets it when it reconnects (kept for a day), and each outcome is confirmed, so one lost on the way comes again. Needs the current Talkif API; with an older one call-me says once that transcripts will not arrive.
- **Quiet on a flaky network.** A dropped or timed-out request (laptop asleep, Wi-Fi change, no DNS) no longer writes a line into the chat. The status line says `offline, retrying…` after two failures in a row and goes back to `on` by itself; `/cm` says the same. The details stay in `/cm traffic` with the debug option.
- **One scope fewer.** The API key needs only **Connectors** and **Flows (read)**; **Calls (read)** is no longer used, and `/cm setup` no longer checks it.
- Fix: a call after the first ten since the session started was never picked up (the old check always read the same ten calls). Gone with the polling.
- **Fix: who asked was never shown.** In an organization the session told Talkif it names the teammate who asks or gives a task, but it dropped the name, so a teammate's question or task read as your own. It now says who asked.

## 0.25.2 — 2026-10-17

- `/cm help` fits narrow terminals: when the two columns don't fit, each description goes on its own line under the command. Shorter descriptions.

## 0.25.1 — 2026-10-17

- `/cm help` lists the commands in two aligned columns.

## 0.25.0 — 2026-10-17

- **Fix: call-me no longer stays "not set up" after the problem is fixed.** When Talkif refused the key (for example Connectors not turned on yet), call-me waited 5 minutes before trying again, and `/cm setup` could report everything ok while `/cm` still said "Connectors are not turned on". Now it tries again every 30 seconds and comes back on by itself; `/cm setup` tries again at once and ends with the same live line `/cm` shows, so the two never disagree.
- **`/cm` is two or three lines:** on (through which account, and which agent to call), off (and how to turn it on), connecting, or not set up (the reason in plain words and exactly one next step). The details (key, server, flow, accounts, folders, switches) moved to `/cm setup`.
- **New `/cm help`:** one plain line per command, the common ones first. An unknown command answers "Unknown command. See /cm help." instead of the whole status.
- Accounts are shown only by their name in Talkif, never by key slot ("personal key"); without a name, "your Talkif account". The status line follows the same words and says `connecting…` instead of `reconnecting…`.
- `/cm off all` now says to turn it back on with `/cm on all` (`/cm on` alone did not, while every session was off). `/cm on` reconnects at once instead of within 20 seconds.
- `/cm traffic` without the debug option says how to turn it on instead of opening an empty pane.
- A flow set with the `flowId` option is shown by its name.

## 0.24.0 — 2026-10-17

- **Organizations share their connectors.** In an organization, every owner, admin and member on a proven call reaches all of its connectors, your coding sessions included, for questions and tasks. In a personal account only you do. See "Who can reach what" in the README.
- **Who asked:** a question or task from a call now starts with the asker's name ("Question from Ada on a call", "Task from Ada on a call") when Talkif sends it, and `/cm traffic` shows it. The name is cleaned to one short line before it reaches the prompt.
- Tasks from a call stay read-only by default, whoever gives them. A task from another member never rings you back.
- Registers with `callerNames`: in an organization, other members reach a session only when its call-me says who asked, so sessions on older versions stay yours alone.

## 0.23.0 — 2026-10-17

- **Is it on?** A status line under the prompt always says: `on · <account>`, `on a call`, `reconnecting…`, `off`, or `not set up — run /cm setup`. See "Is it on?" in the README.
- The account is shown by its name in Talkif (status line, `/cm`, `/cm setup`, traffic pane). Older servers that do not send the name show the key's slot name (`personal`) instead.
- `/cm` starts with one line: on and through which account, off, or not set up. The details follow.
- **Fix:** read-only mode for tasks from a call no longer reaches agents that were started outside that task (by you, or before the call). Only the task itself and the agents it starts are read-only.
- **Fix:** the User-Agent now carries the plugin's real version (it said 0.21.1 in 0.22.0).

## 0.22.0 — 2026-10-16

- **The `environment` option is gone.** call-me always connects to Talkif (https://api.talkif.ai). A new optional **API URL (advanced)** option (`apiUrl`) takes another address; leave it empty unless Talkif support tells you otherwise. An address that is not `http://` or `https://` is reported by `/cm setup` instead of being ignored.
- **Breaking for the connector scripts:** `--env` is removed; pass `--url URL` (or set `TALKIF_API_URL`) for another backend. `--env-file PATH` still picks the developer file.
- The developer file is now `~/.config/talkif/dev.env`; its `TALKIF_API_URL` is optional (empty means Talkif), and the `apiUrl` option beats it.

## 0.21.1 — 2026-10-16

- README rewritten for new users: what call-me is, what you need first, setup in 3 steps with the expected `/cm setup` output, spoken examples, safety, commands, options and troubleshooting.
- Plugin and marketplace descriptions are one plain sentence; the marketplace owner is Talkif.
- The `debug` option's description names `/cm traffic` (the old `/call-me-traffic` name is gone).
- Internal details removed from code comments, tests and this changelog. Test secrets are obviously fake.

## 0.21.0 — 2026-10-16

- New `/cm setup`: checks your API key, the connection to Talkif, whether Connectors are turned on for your account, the key's scopes and the flow your calls use, and prints the next step for the first thing missing. It only reads and never prints the key.
- The connector scripts (knowledge folder, launcher, local agent) use Talkif by default, take `--url` for another backend, and read the key from `$TALKIF_API_KEY` (or `--key-env VAR`).
- **Breaking for the scripts:** a developer file path goes in `--env-file`. `--key VAR` still works as the old name of `--key-env`.
- The launcher no longer passes its key to the Claude Code runs it starts, and `--cwd` defaults to the current folder.

## 0.20.0 — 2026-10-16

- Set up from the plugin options: `apiKey` (kept in the keychain), `environment`, `flowId` and `folders`.
- With `flowId` empty, the plugin picks the first published flow with a Connectors node and remembers it.
- Every session can join (before, only sessions in one fixed folder). The `folders` option limits it.
- Clear setup messages for a missing key, a missing scope, Connectors not turned on, and no Connectors flow.

## 0.19.3 — 2026-10-15

- Read-only call tasks: credential files can no longer be reached through shell wildcards, braces, `..` or git revision paths (`git show HEAD:.env`). More credential locations are covered (`~/.kube`, `~/.docker`, `~/.gnupg`, `~/.config/gh`, `secrets/`, `*.env`, `.npmrc`, `.pypirc`, SSH keys).
- Text from a call can no longer close the fence around it with spaced or HTML-escaped tags.
- The connector scripts send the `talkif-call-me/<version>` User-Agent too.

## 0.19.2 — 2026-10-15

- A finished call's transcript now runs as a call task, so read-only mode applies to it.
- Text from calls (transcripts, call notes, relayed questions) reaches the model marked as untrusted data, never as instructions.
- Read-only call tasks do not read credential files (`~/.ssh`, `~/.aws`, `.env` files, keys and similar).
- Requests send a `talkif-call-me/<version>` User-Agent.

## 0.19.1 — 2026-10-15

- Read-only call tasks are an allowlist: only reading tools work; everything else (web fetches, MCP tools, publishes, messages, schedules) is refused.
- Call tasks cannot escape read-only mode through background commands, remote agents or subagents.
- Text that looks like a secret is replaced with `[redacted]` in everything the plugin sends.

## 0.19.0 — 2026-10-15

- Tasks from a call run read-only by default. New option `callTasks`: `read-only` or `session` (the session's own permissions).
- The voice agent and sessions are told never to say secrets.
- Connectors have an audience: coding sessions and the launcher are private; a knowledge folder takes `--audience private|team|public`.
- Debug, parallel and callback settings moved to the plugin options.

## 0.18.0 — 2026-10-14

- Experimental local agent (`connectors/agent.mjs`) that holds a WebSocket per session instead of long polling. Not needed.
- `/cm off all` takes effect within about 2 seconds.

## 0.17.0 — 2026-10-14

- Coding sessions are private: teammates cannot reach them.
- Commands moved under `/cm`: `/cm traffic`, `/cm publish`, `/cm latency`.
- `/cm publish` writes the call instructions into the flow's Connectors node.

## 0.16.1 — 2026-10-14

- Say how you want a late result ("call me when it's done" or "just tell me next time") and the agent remembers it.

## 0.16.0 — 2026-10-14

- Summaries of your last three calls reach every session.
- Sessions refresh their recap when a call starts.
- When it is unclear which session a request is for, the best-fitting session takes it.

## 0.15.0 — 2026-10-14

- The plugin never grants a permission. A call task waiting at a permission prompt tells you on the call, or rings you.

## 0.14.0 — 2026-10-14

- Plugin options: `debug`, `parallel`, `callback`.

## 0.13.0 — 2026-10-14

- `/cm` turns call-me on or off for this session, all sessions, or new sessions.

## 0.12.0 — 2026-10-14

- Ring-back: a task from a call that finishes or gets stuck after you hung up rings you with the result.

## 0.11.0 — 2026-10-14

- The voice agent says in one sentence what task it sends, and sends it without asking for confirmation.

## 0.10.0 — 2026-10-14

- A request that names a session ("the docs session") goes straight to it.
- Clearer call instructions for the voice agent.

## 0.9.0 — 2026-10-13

- Better call behaviour: "pass it" sends at once, misheard names are understood, no repeats, the agent speaks your language.

## Connector scripts

- `connectors/knowledge-folder.mjs`: answers questions from a folder of documents.
- `connectors/launcher.mjs`: answers questions with a read-only Claude Code run (plan mode).

## 0.8.0 — 2026-10-13

- Debug pane showing this session's call-me traffic live.

## 0.7.0 — 2026-10-13

- The session confirms a question the moment it arrives, so the agent can say it is working on it; a slow answer arrives as a note.
- Several questions are handled at once.
- While a task runs, a new one is declined ("still on the last task"), or queued with the `parallel` option.

## 0.6.1 — 2026-10-13

- The voice agent never asks you which session you mean.

## 0.6.0 — 2026-10-13

- Sessions describe themselves by their git repository, so the agent can route by project.

## 0.5.0 — 2026-10-13

- When the agent cannot tell which session a request is for, the session it fits takes it.

## 0.4.0 — 2026-10-13

- A session can join several Talkif accounts at once.

## 0.3.3 — 2026-10-13

- A single dropped connection no longer prints a message.

## 0.3.2 — 2026-10-13

- Session recaps cost much less and refresh every 15 minutes.
- The call hangs up as soon as you say to close it.

## 0.3.1 — 2026-10-13

- A restarted session no longer shows twice.
- A session leaves at once when it exits.
- New sessions are reachable right after they start.

## 0.3.0 — 2026-10-13

- First release: a session can ring your phone with questions, take instructions during a call, report when it is done, and gets back only its own calls.
