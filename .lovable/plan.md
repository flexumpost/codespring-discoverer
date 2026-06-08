## Plan

1. Trace and harden the shared scan upload flow
- Review the shared `uploadScanFile` helper used by both the dialog and the inline drag-and-drop row upload.
- Normalize validation for file type/size/path so drag-and-drop and button upload behave identically.
- Prevent row-level click side effects from interfering with drop handling.

2. Expose the real failure instead of the generic toast
- Capture and surface the exact storage/database error in the client logs.
- Show a more specific operator-facing error when the backend rejects the file (for example unsupported format, file too large, or permission/update failure).

3. Fix the backend mismatch causing the upload to fail
- Verify the upload sequence against existing storage and `mail_items` policies.
- Adjust the failing part of the flow so operators can complete scan uploads from inline drag-and-drop, including the follow-up `scan_url`/status update.
- Keep the fix scoped to scan upload only.

4. Validate both operator upload paths
- Test inline drag-and-drop on the dashboard row.
- Test the existing “Upload scan” button/dialog flow to ensure the shared helper still works.
- Confirm the scan is stored, `scan_url` is saved, and the item refreshes correctly in the dashboard.

## Technical notes
- Relevant files already identified: `src/pages/OperatorDashboard.tsx`, `src/components/ScanUploadDialog.tsx`, and the scan-related storage/`mail_items` migrations.
- The most likely breakage is in the handoff between storage upload and the `mail_items` update, so I’ll verify both paths before changing anything.