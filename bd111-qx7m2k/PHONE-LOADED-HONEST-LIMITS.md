# HONEST LIMITS — BotDawg Phone, LOADED build: what it carries and what it does not

© 2026 Joshua Dawson — J-Dawgs Industries LLC. All rights reserved.

This is the Loaded phone build: one file that opens in your
phone's browser. No install, no account with us, no server. It
carries more than the standard phone build — and it still has
real limits. Here they are, plainly, so nothing surprises you.

## What this build carries

- **The Brain.** Connect your own model (endpoint + model name +
  your key, typed on the Brain card in the page) and jobs that
  match no built-in skill get planned by your model and run step
  by step right here. Without a model connected, the built-in
  skills run exactly as they do in the standard phone build.
- **Your memory, with the files-first check** (below).
- **The J-Dawgs playbooks** — 3 knowledge files, whole — and the
  **seed pack tools** — 3, whole.
- **The tool-library index** — all 817 library tools by name and
  what each does, searched before every job.
- **The 400 runnable library tools as source**, run on this phone
  through a compatibility shim.

## Files first — what this build checks before every job

- Before any job, BotDawg checks its own record on this phone —
  your memory, the playbooks, the seed tools, and the library
  index — for anything related to the job, and plans from what it
  finds. Hits ride into the Brain's planning prompt and the
  built-in skills' fact pool.
- If a saved note clashes with a job — a standing order like
  "never offer discounts" against a job asking for a discount, or
  two different prices for the same thing — the job stops before
  it runs and BotDawg asks which stands, in plain words. Your
  saved notes are never silently overridden.
- Every check is written to the activity log ("files-first",
  with counts). The check is local file work: no model, no
  network, and it runs in built-in mode exactly as it does with
  a model connected.

## How the library travels inside the file

- The playbooks' full text, the seed tools' method files, and the
  400 library tools' source ride inside this file **encoded**
  (base64) and are decoded on this phone, by the decoder printed
  in the page, before anything reads or runs them. The decoded
  content is byte-identical to the desktop edition's files —
  nothing is removed or altered. The encoding exists because
  several safety-auditor tools carry **example** keys in their
  test fixtures (Stripe's public documentation key; tokens with
  "example" in them), and hosting sites' automated secret
  scanners mistake those fixtures for real secrets and refuse
  the file. The tool index — every tool's name and what it does —
  stays plain and searchable.

## What is NOT carried — named, not dropped quietly

- **The 417 open-only library tools are index entries here.**
  Their full pages (about 39 MB) live in the desktop Loaded
  edition. This build tells you what each one does and how the
  Brain may cite it as a method — it never pretends to open or
  run the page.
- **A library tool that cannot run in a phone browser says so in
  the open.** The 400 runnable tools ship as source and run
  through a compatibility shim; one that needs something a phone
  browser does not have fails plainly, with the reason — never a
  faked result.

## The Brain on a phone — its own limits

- **Your key lives in this page's storage on this phone only.**
  The desktop reads its key from an environment variable; a phone
  page has no environment, so here the key is kept in the page's
  storage and sent only to the endpoint you name. Clear the
  browser's site data and it is gone.
- **Your endpoint must accept calls from a browser page (CORS).**
  If it refuses, the Brain says so plainly and the built-in
  skills keep working. The desktop Brain has no such limit.

## How it runs — the limits of one file on a phone

- **It works when it is open.** BotDawg runs while the page is
  open in your browser. It does not run in the background, it has
  no schedules, and nothing happens while it is closed. It says
  so rather than pretending to be always on.
- **No watching pages, no research runs, no folder organizing,
  no proof-runs, no human-check clicking.** Those need things a
  phone browser will not give one page (reading other pages,
  seeing your folders, clicking as you). They are desktop jobs,
  and BotDawg says so plainly when asked.
- **Everything stays on this phone.** Your setup, facts, drafts,
  usage meter, activity log, and chat history are kept in this
  page's storage on this phone only. They do not sync anywhere,
  and the desktop BotDawg does not see them — the two keep
  separate memories. Clear the browser's site data and they are
  gone.
- **Save the file on your phone.** Opened from your phone's own
  files, BotDawg works with no signal at all. If you open it from
  a web link instead, whether it reopens offline is up to your
  browser's cache — save the file to be sure.
- **Finished work lives in the page.** Drafts, prepared messages,
  and prompt sets are saved under "Finished work" in the page,
  with a Copy button. There are no files in a folder like the
  desktop version has.

## What it will never do, by design — same as desktop

- It does **not** send, post, buy, pay, delete, or log in as you.
  Ask in chat and it refuses in plain words — and, where a draft
  is the useful thing, prepares the draft instead. You read it,
  you send it, with your own hand.
- It does **not** invent facts, prices, or results. It answers
  from what you taught it and says plainly when something is not
  in what it knows.
- It never asks for or stores your passwords. The only key it
  ever holds is your own model key, on this phone, for the Brain
  — see above.
