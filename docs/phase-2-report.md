# Phase 2 report

Date: 2026-11-02.

## Built

All in `src/shared/ui`, imported from `@/shared/ui`.

| Group         | Components                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Actions       | Button, IconButton, Spinner                                                                                          |
| Forms         | Field, Input, Textarea, SearchInput, Select, Checkbox                                                                |
| Overlays      | Dialog, Sheet, Popover, Menu, Tooltip, Toast                                                                         |
| Navigation    | Tabs, SegmentedControl, ThemeToggle, Pagination                                                                      |
| Incident data | SeverityBadge, PriorityBadge, StatusPill, SlaIndicator, RoleBadge, UserStatusBadge, Avatar, DateTime, TraceReference |
| Page states   | Skeleton, EmptyState, ErrorState, InlineAlert, OfflineBanner                                                         |
| Layout        | Card, PageHeader, FilterBar, DataTable, StatCard, ChartCard                                                          |

Helpers: `lib/constants/domain.ts`, `lib/date.ts`, `lib/sla.ts`, `lib/forms.ts`, `lib/cn.ts`, `hooks/useNow.ts`, `hooks/useOnlineStatus.ts`.

Preview page: run `npm run dev` and open http://localhost:5173/ui. It exists only in development.

## How they fit this backend

- **Enums** match the Java enums, so an unknown status is a compile error, not a blank badge.
- **Pagination** takes a Spring Page's zero-based `number`, `size`, `totalPages` and `totalElements` directly.
- **DataTable** does no sorting or paging in the browser, because that would show one page as if it were all results.
- **Field and `applyServerFieldErrors`** put a backend `fieldErrors` entry on the right form field, and return any with no matching field so none is lost.
- **ErrorState and Toast** show the backend `traceId` as a Reference that can be copied.
- **DateTime and SlaIndicator** read `LocalDateTime` strings, including Java's 9 fractional digits. The backend's breached flag always wins over the browser clock.
- **SlaIndicator** never invents a countdown. With no deadline it says "No SLA". Real deadlines need BCR-07.
- **Avatar** takes a name. Until BCR-05 gives names for user ids, screens must not make names up.

## Verified

| Check                                                        | Result                                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Tests                                                        | 144 pass                                                                                  |
| axe scan, light and dark, desktop                            | 0 violations                                                                              |
| axe scan, light and dark, 360 px, plus open dialog and toast | 0 violations                                                                              |
| Sideways scrolling at 360 px                                 | None                                                                                      |
| Dialog: focus moves in, Escape closes, focus returns         | Works in the browser                                                                      |
| Touch targets at 360 px                                      | All 44 px or more. The checkbox box is 18 px, but its whole label row is the 44 px target |

### Not verified

- Real browsers other than Chromium: Firefox, Safari and iOS. Playwright's browsers are not downloaded yet (Phase 5).
- Opening Select, Menu, Sheet, Popover and Tooltip in a real browser. Select and Menu have unit tests; Sheet, Popover and Tooltip have none yet.
- Real keyboard and screen reader use. Tests cover focus and names, not the experience of NVDA or VoiceOver.
- 1920 px, which is the last width still to check when real screens exist.
- Animation in the preview pane: the pane runs in the background, which froze animations, so scans ran with them switched off.

## Differences from the canvas

- **Danger button:** uses `--crit` rather than `--critdot` with white text, which failed AA contrast.
- **Phone sizes:** controls grow to 44 px below 768 px wide. The canvas sizes are kept on desktop.
- **Phone form text:** 16 px, because iOS Safari zooms the page on smaller fields.

## Changes from the plan

- **`exactOptionalPropertyTypes` turned off.** It was a stricter extra I added in Phase 1, not part of `strict`. It clashes with passing optional props through to Radix and React Hook Form. `strict` stays on.
- **New setting `VITE_SERVER_UTC_OFFSET`.** Backend times use the server's own clock, so the frontend has to be told which clock.
- **Moved to Phase 3:** AppShell, Sidebar, TopBar, MobileNav and RoleGate, because they need the router and login state.
- **Moved to later phases:** UserName needs BCR-05. AiSuggestionPanel belongs with the AI feature in Phase 4.

## Open items

| Item                                 | Status                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Two light-theme severity dot colours | Fixed after this phase with the darker colours; contrast tests pass       |
| Server timezone                      | Set `VITE_SERVER_UTC_OFFSET` in `.env.local` if your laptop is not on UTC |
| Everything from `phase-1-report.md`  | Still open                                                                |
