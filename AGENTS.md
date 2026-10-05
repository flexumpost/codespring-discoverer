# Architecture Rules

- Store separate default pickup weekday and hour values for letters and packages on each tenant, because automation schedules both independently.
- After any shipping address save, the client calls one authenticated edge function (via a shared helper) that emails the tenant and, for tenant-made changes, syncs Zoho CRM and emails the operator; the DB trigger only creates in-app operator notices, because trigger-to-function calls depend on an unreliable vault key.
