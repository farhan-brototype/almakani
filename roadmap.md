# Roadmap

Working through the large feature request in phases.

## Phase A — schema (migration)
- [ ] documents.sort_order, drop category usage
- [ ] gallery.sort_order + mobile image url, drop album usage
- [ ] timetable.end_time (start–end times)
- [x] fest_settings: logo_url (done) — motto, icon_url pending
- [ ] program_registration.max_entries (registration limit)
- [ ] categories / category_items become the single source for categories & item types (Kulliyya replaces General)

## Phase B — quick UI fixes
- [ ] Loading popup only on menu/route navigation (not every fetch)
- [ ] Documents: rectangular cards w/ file type + name, admin reorder, no category
- [ ] Gallery: no search bar, no album, full-width images, no gaps, reorder, edit/delete, laptop+mobile upload, show size
- [ ] Full registered: show programme code + name only
- [ ] Registration admin: remove type filter, single live search
- [ ] All search bars live/real-time
- [ ] Fest name only in Overview (removed from Fest control) + motto/logo/icon upload

## Phase C — data model consistency
- [ ] Remove hardcoded General / Stage / Non-stage / Group everywhere; read from admin-managed categories & category_items
- [ ] Kulliyya terminology
- [ ] Group + Kulliyya programmes mark the team directly (judgement, results, enrolled)

## Phase D — features
- [ ] Live results toggle fix + grade-only publish + realtime
- [ ] Programme list open/closed controls assigning
- [ ] Schedule: start–end time, date sidebar, today first, candidate photos in eye dialog
- [ ] Assigning: eye button showing all teams' candidates
- [ ] Announcements + registration bell icons with unread red dot
- [ ] Registration: bulk add, entry limit, filters
- [ ] Grading: bulk upload, explain group multiplier
- [x] Results: manual edit (position/grade override), filters, sorting, draft print, totals page
- [ ] Dashboard/Overview rename + team points line chart
- [ ] AI: answer from uploaded concept note/bylaw
- [ ] Static HTML output on build

## Certificate page
- [x] /certificate route with Certificate + My Card tabs (PDF/PNG download)
- [ ] Run supabase/certificate-cards.sql so the card page can filter by class

- [x] Certificate/My Card verification: typecheck clean, browser pass done. Class list needs supabase/certificate-cards.sql.
- [x] .env kept as originally uploaded (unchanged).
