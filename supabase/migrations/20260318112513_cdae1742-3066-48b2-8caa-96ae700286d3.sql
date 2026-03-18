INSERT INTO email_templates (slug, subject, body, audience)
VALUES ('new_scan', 'Scanning klar – {{company_name}}', 'Hej {{name}}\n\nDin forsendelse er blevet scannet og er klar til download.\n\nLog ind for at se din scannede post.', 'tenant')
ON CONFLICT DO NOTHING;