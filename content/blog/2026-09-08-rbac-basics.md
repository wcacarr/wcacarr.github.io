---
title: RBAC in plain English, and where teams get it wrong
date: 2026-09-08
read_time: 6 min
description: >
  Why role-based access control breaks down in practice, and three habits —
  job function over job title, scheduled reviews, time-bound temporary
  access — that keep it clean.
---

Role-based access control sounds like a solved problem until you actually sit down and design one. The idea is simple: users get roles, roles get permissions, nobody gets access directly. In practice most environments end up with a pile of one-off exceptions bolted onto the model, and six months later nobody can explain why a given account can do what it can.

The failure mode I see most often isn't a missing framework, it's role sprawl. Someone needs one extra permission for a one-off task, so a new role gets created just for them instead of being added to an existing one. Repeat that for a year and you have more roles than people, and an access review that takes a week instead of an afternoon.

A few things that keep it manageable:

- **Start from job functions, not job titles.** Two people with the same title can need different access depending on what they actually touch day to day.
- **Review roles on a schedule, not just at onboarding.** Access creeps up over time as people move teams and nobody removes the old permissions.
- **Treat "temporary" access as a ticket with an expiry, not a role change.** If it's genuinely temporary, it shouldn't outlive the task that needed it.

None of this is exotic. It's mostly discipline, plus a system that makes the boring path (request → approve → time-bound grant) easier than the shortcut (add them to an existing group because it's quicker).

```
$ az role assignment list --assignee user@domain.com --output table
Role                    Scope
-----------------------  --------------------------------
Reader                   /subscriptions/xxxxxxxx
Storage Blob Data Reader /subscriptions/xxxxxxxx/resourceGroups/prod
```
