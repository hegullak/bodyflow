# Reminder engine

Generic, reusable reminder settings for bodyflow. Issue **#18** (engine) + **#17** (weigh-in UI).

## Model

Table: `reminder` (singular, per `DATABASE_STANDARDS.md`)

| Column | Purpose |
|--------|---------|
| `reminder_type` | e.g. `weigh_in` (extensible enum) |
| `enabled` | on/off |
| `weekdays` | `integer[]` — 0=Mon … 6=Sun |
| `reminder_time` | `HH:MM` in 24h format |
| `timezone` | IANA timezone (e.g. `Europe/Oslo`) |
| `target_route` | deep link when notification is tapped |
| `last_triggered_at` | last fired notification |
| `deleted_at` | soft delete |

One active row per `(user_id, reminder_type)` via partial unique index.

## Scheduling (web / PWA)

1. User saves settings on **Profile** → `upsertReminderAction`
2. `ReminderSync` (app layout) registers `/sw.js` and fetches `/api/reminders`
3. Client computes next fire times (`lib/reminders/schedule.ts`) in the user timezone
4. `setTimeout` schedules `Notification` / service worker notification (up to 7 days ahead)
5. On app focus, visibility change, or hourly tick → reschedule from server settings

### Limitations

- **Not a native alarm.** Notifications fire when the browser/PWA is allowed to run timers; iOS may defer background work.
- **Reschedule on open.** After restart, reminders are rebuilt when the user opens the app (or returns to the tab).
- **Permission required.** User must grant notification permission on Profile.

## Weigh-in reminder (#17)

- UI: Profile → Weigh-in section (`ReminderSettingsForm`)
- Default route: `/check-in?focus=weight`
- Check-in scrolls to weight field and focuses input

## Adding a new reminder type

1. Add value to `reminder_type` enum (migration)
2. Register in `REMINDER_DEFINITIONS` (`lib/reminders/constants.ts`)
3. Add settings UI (reuse `ReminderSettingsForm` with new type)

No changes to scheduler or service worker required.
