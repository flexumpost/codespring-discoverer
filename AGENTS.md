# Architecture Rules

- Store separate default pickup weekday and hour values for letters and packages on each tenant, because automation schedules both independently.- Sync tenant-made shipping address changes to Zoho CRM from a database trigger on tenants (calling an edge function), so every save path is covered and operator edits are not echoed back.
