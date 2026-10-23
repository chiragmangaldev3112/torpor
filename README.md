# torpor

A lazy, fully-local overnight inbox digest. Point it at your messages, and
instead of reading all of them yourself, it reads them for you — entirely on
your own machine, using open-weight models through [Ollama](https://ollama.com).

Named after the energy-saving dormant state animals (sloths included) drop
into when there's no reason to spend effort. Built for
[Hacktoberfest's Open-Source AI Challenge, Week 3: "Slow and Steady"](https://dev.to/challenges/hacktoberfest-week3-2026-10-19).

## What it does

1. Reads a JSON file of messages (`sample-data/inbox.json` has a working example).
2. Embeds every message **locally** with `nomic-embed-text` via Ollama, and
   compares each one against a handful of "this needs a human" reference
   phrases — by meaning, not by keyword matching.
3. Splits messages into "needs you" and "can wait" using the inbox's own
   score distribution (mean + half a standard deviation), since raw cosine
   similarity on short text clusters tightly and a fixed cutoff
   misclassifies almost everything.
4. Asks a local chat model (`qwen3:8b` via Ollama) to write a genuine 2-3
   sentence summary of what needs you and why.

No step calls out to the internet. No API key exists anywhere in this
project because none is needed.

## Demo

```
$ ollama pull qwen3:8b
$ ollama pull nomic-embed-text
$ npm start

torpor: barely awake. 10 messages to get through, so I'll do it.

While you were asleep: 3 of 10 actually need you. The other 7 can wait.

In short (qwen3:8b, running right here):
The partner NDA requires your signature by Friday's kickoff call to avoid
delaying the start date. An overdue $3,200 invoice could trigger a service
interruption if not resolved by end of day. A critical production deploy
failed during database migration and remains unaddressed.

Worth getting up for:
  [0.64] legal@example.com — NDA needs your signature
  [0.59] billing@vendor-example.com — Invoice #4471 overdue
  [0.58] ops@example.com — Production deploy failing

Can stay asleep for these:
  [0.57] friend@example.com — lunch next week?
  [0.56] priya@example.com — Quarterly numbers due
  [0.55] security-alert@example.com — New sign-in detected
  ...
```

That whole run takes a few seconds, on a laptop, offline.

## Install & run

Requires [Ollama](https://ollama.com) installed and running locally.

```
ollama pull qwen3:8b
ollama pull nomic-embed-text
npm start
# or: node src/index.mjs path/to/your-own-inbox.json
```

Your own inbox file is a JSON array of `{ "from", "subject", "body" }`
objects — see `sample-data/inbox.json` for the shape.

## Why local, open-weight models — not a cloud API

- **Runs with no internet and no API key.** The whole pipeline — embeddings
  and the final summary — happens on `localhost:11434`.
- **Your messages never leave your machine.** An overnight digest is, by
  definition, a summary of everything you haven't read yet. Sending that to
  someone else's model every night is a real privacy cost a local model
  avoids entirely.
- **It's free to run forever.** No per-token billing on something meant to
  run every single day, unattended.
- **You can swap the model.** `TORPOR_CHAT_MODEL` and `TORPOR_EMBED_MODEL`
  env vars point at any model you've pulled — nothing here is tied to one
  vendor.

## Honest limitations

- The attention/FYI split is a simple statistical heuristic on top of
  embeddings, not a trained classifier — it does well on messages with a
  clear deadline or breakage, and misses softer signals (a security alert
  landed just under the threshold in the demo above).
- The summarization prompt explicitly tells the model to treat message
  content as text to summarize, never as instructions to follow — a basic
  prompt-injection guard, not a full one. Don't point this at genuinely
  adversarial input without more hardening.
- This is a weekend build, not a production tool.

## License

MIT
