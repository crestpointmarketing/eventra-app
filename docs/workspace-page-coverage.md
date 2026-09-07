# Workspace page coverage

Reviewed against the supplied Figma Make export and the existing application routes.

## Existing product pages

The export's Dashboard, EventPulse, Add Event, Event Detail, Leads, Tasks, Assets, Email Templates, Analytics, Settings, Login and Contact all have existing application equivalents. Discover, Portfolio, Review and Insights are separate EventPulse views. Evidence and import review use existing drawers/dialogs. No duplicate routes were added for these views.

## Completed gaps

| Route or state | Implementation |
| --- | --- |
| `/settings/account` | Load authenticated user, save display name through Supabase Auth, read-only sign-in email, browser theme preference, loading/save/error feedback. |
| `/settings/notifications` | Persist the existing in-app task reminder preference on this browser. The notifier respects the setting; email and push are explicitly unavailable. |
| `/settings/security` | Existing password update flow, team-access guidance, current-device sign-out with failure feedback. No user-editable authorization metadata. |
| `/help` | Search/evidence/import/task/lead/access/recovery guide linked from navigation; usable before sign-in. |
| `/about` | Product overview using actual capabilities; linked from the home-page footer. |
| Missing route | Branded 404 with workspace and help destinations. |
| Route exception | Error recovery UI using the installed Next.js `retry` callback. Raw exception details are not displayed. |
| Workspace navigation loading | Responsive skeleton and accessible loading status. |

The old home-page Privacy/Terms placeholder links now lead to a clearly named inquiry destination. No legal policy was invented or represented as approved. Team administration, billing, push delivery and other unsupported services are not simulated by static controls.

## Verification

- `npm run check`: lint, TypeScript, 23 existing tests and production build.
- Authenticated desktop/mobile visits for settings overview, three new settings pages, help, about and an invalid route: no horizontal overflow or page exceptions; invalid route returns 404.
- Supabase profile save using the current display-name value; injected save-failure feedback; browser reminder preference persists after reload.
- No events, tasks or leads were created in these checks. Passwords were not changed and no outgoing email was sent.
