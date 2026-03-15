SELECT pgmq.delete('transactional_emails', 15);
SELECT pgmq.delete('transactional_emails', 16);
SELECT pgmq.delete('transactional_emails', 17);
SELECT pgmq.delete('transactional_emails', 18);
SELECT pgmq.delete('transactional_emails', 19);
SELECT pgmq.delete('transactional_emails', 20);
UPDATE email_send_state SET retry_after_until = NULL, updated_at = now() WHERE id = 1;