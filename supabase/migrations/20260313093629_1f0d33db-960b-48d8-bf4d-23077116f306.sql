INSERT INTO user_roles (user_id, role)
VALUES ('af6db4c8-9978-4470-9f10-d933fc991d55', 'tenant')
ON CONFLICT (user_id, role) DO NOTHING;