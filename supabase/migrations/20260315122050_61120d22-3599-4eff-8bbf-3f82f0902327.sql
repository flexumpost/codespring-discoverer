
SELECT pgmq.delete('transactional_emails', 13);
SELECT pgmq.delete('transactional_emails', 14);
UPDATE email_send_state SET retry_after_until = NULL, updated_at = now() WHERE id = 1;
UPDATE tenants SET welcome_email_sent_at = NULL WHERE welcome_email_sent_at IS NOT NULL;
