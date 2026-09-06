# Reliable event search — Phase 1

Find broadly, verify narrowly, explain every result, and import only with user approval.

## Contract

The user explicitly selects discovery or a specific event. Natural-language parsing proposes editable conditions and never changes that mode or launches research. Required checks include date interval overlap, default exclusion of ended events, structured country/state/city, attendance, event type, organizer, audience, include-any/all and excluded keywords. Keywords cover name, description and organizer; industries and technologies remain separate lists with an explicit AND/OR relationship. An event name and its edition year are checked independently.

Matching and evidence are separate. Strict Match requires confirmed name, both edition dates, attendance and physical location when relevant, plus every requested constraint. Needs Verification retains missing facts, inaccessible or unestablished official sources, inferred audiences and conflicts. Excluded results remain inspectable with reasons. A strict match can still have Partial evidence when optional fields remain unknown; there is no confidence percentage or recommendation score.

## Evidence

Source order is official edition, organizer/official registration, official venue/partner, third party, discovery. Current automatic official identity checking requires a matching event name and organizer on linked event/organizer pages; supplied URLs are never inherently official. A successful HTTP response is insufficient. Extracted evidence includes value, exact excerpt, source URL, status and check timestamp. The server verifies excerpt presence and value support. Dates require explicit year/month/day, not a guessed edition year. Structured page data is retained for extraction. Conflicting official values are retained and prevent strict matching. Lower-authority evidence cannot replace verified official values.

This deliberately favors precision over coverage: sources with no accessible ownership relationship stay unverified even when the page looks plausible. Dynamic, inaccessible, unlinked or poorly documented sites can need human review. Source extraction is AI-assisted and is not a guarantee that every factual ambiguity is resolved. Different confirmed organizers and edition dates are not merged. Without sufficient identity evidence, candidates are retained for review instead of guessing a duplicate.

## Durable execution and completion

`event_search_jobs` stores owner, criteria, queries, candidates, results, warnings, counters, timestamps and leased execution state. Creating a search returns HTTP 202 before research. `after()` starts work; an authenticated minute cron recovers queued/expired work. A six-minute lease fences concurrent workers. Each verified batch is checkpointed; execution yields after roughly 215 seconds. Four attempts cap automatic/manual recovery. Cancellation clears the lease, preventing late worker writes. Only members may search and only the creator may read/cancel/import their job.

A processing cap of 16 discovered candidates bounds cost; it is not a minimum or target result count. A directly supplied page may add one candidate. Each stage reflects actual execution; counters count source-check attempts, including retries. There are no fabricated percentage progress indicators. Completion requires all persisted candidates to be processed, required filters applied and confirmed duplicates classified. Missing source evidence produces completion with warnings, not fabricated facts. Searches with zero findings are valid. Conditions can be saved on the device, and the last 20 searches can be restored from server history.

## Import boundary

Search never inserts Portfolio events or tasks. The user selects results and reviews potential Portfolio matches. Batch selections go to Review Queue without tasks. Single imports offer an explicit task choice. The current starter template has **28 tasks**, so the dialog derives its count from `buildDefaultEventTasks` instead of hard-coding the old count of five.

`import_event_search` reads the stored result, locks the job and edition identity, and atomically creates either the queue item or event plus explicitly requested tasks. Repeating an import returns its existing ID. Unknown names/types must first be reviewed. Evidence and series/edition keys are stored in event metadata; another edition is shown separately. Existing events are skipped, never silently overwritten. Review Queue approval is also transactional and idempotent; batch approval creates no tasks.

## Validation

Node tests exercise cross-year intervals, impossible/past dates, location/attendance/keyword violations, Chinese matching, official conflicts, missing evidence, duplicate editions versus organizers, membership isolation, job leasing, import rollback and idempotent review approval. An isolated authenticated smoke workflow additionally exercises Chinese parsing, immediate job creation, actual provider research, cancellation, history restoration, zero implicit imports, zero-task import and the explicit 28-task option. Real-source tests must report their actual category and counts; an empty Strict Match set is not evidence of perfect real-world accuracy.

## Deferred

Personalized recommendations, vector search, business-goal scoring, subscriptions, automatic event updates, price/budget/scale filters, deadline monitoring and ROI forecasts remain later phases. No automatic Portfolio synchronization or inferred opportunity availability is introduced.
