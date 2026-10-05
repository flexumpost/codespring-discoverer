# Architecture Rules

- Store separate default pickup weekday and hour values for letters and packages on each tenant, because automation schedules both independently.
- Handle shipping address changes from a database trigger on tenants (calling one edge function): every user change emails the tenant a confirmation, while Zoho CRM sync and operator notice run only for tenant-made changes, so every save path is covered and operator edits are not echoed back.
