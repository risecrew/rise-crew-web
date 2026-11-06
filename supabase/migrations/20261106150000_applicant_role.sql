-- A new lowest role: someone who has signed up and is waiting for an operator to approve them.
-- On its own because a new enum value cannot be used in the transaction that adds it.

alter type public.app_role add value if not exists 'applicant' before 'guest';
