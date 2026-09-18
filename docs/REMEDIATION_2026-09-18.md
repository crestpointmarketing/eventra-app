# Audit remediation

- Enforced the dedicated Eventra Supabase project in every client, including the privileged worker. Pomelo configuration was inspected read-only and is a different project.
- Normalized five verified real file records to Eventra storage; retained an out-of-repository original-row backup. Reused the shared storage-path parser for deletion.
- Replaced fake note success with authenticated lead_activities inserts, pending/error states and refreshable history. Test notes are removed by exact generated IDs after persistence checks.
- Fixed ScrollArea to render its viewport/children; rebuilt the lead side panel around real notes and working detail/email/task actions.
- Removed invented lead timelines, companies, locations, company sizes, owners, contact times and default ICP claims. Missing values are explicit. Owner display reads the actual public profile.
- Made full lead detail responsive and prevented contact actions for missing email/phone.
- Required event selection when creating tasks from an unlinked lead; verified that branch using a browser response fixture without changing an existing lead.
- Escaped template content before preview HTML insertion. Added database-isolation and hostile-markup regression tests.
- Connected single-template recommendation preview to the real template dialog. Removed inactive feedback/filter controls and linked the home demo action to the actual help guide.
- Account name save also updates public.users and explicitly reports partial synchronization failure.
- Replaced the nonfunctional contact form with an explicit prepare/copy/download support request. This does not send email or pretend to offer live chat or booking.

Verification: full lint/typecheck/test/build; real note insert and reload, exact cleanup, contact preparation, mobile detail layout; provider generation, actual email sending and arbitrary destructive actions are not claimed as tested by these checks. Existing AI generation APIs remain unchanged. Long-term schema refactoring is documented separately in DATABASE_CONNECTIONS.md.
