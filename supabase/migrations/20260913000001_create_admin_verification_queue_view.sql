-- Migration: Re-create live admin_verification_queue view with full details
-- Allows admin queries to fetch live verification queue records ordered by created_at

CREATE OR REPLACE VIEW public.admin_verification_queue AS
SELECT
  v.id,
  v.user_id,
  v.document_type,
  v.id_front_url,
  v.id_back_url,
  v.selfie_url,
  v.status,
  v.rejection_reason,
  v.created_at,
  v.updated_at,
  COALESCE(p.full_name, TRIM(CONCAT(p.first_name, ' ', p.last_name)), p.email, 'Artist') AS full_name,
  COALESCE(p.email, u.email) AS email,
  COALESCE(p.avatar_url, p.profile_picture) AS avatar_url,
  p.role,
  p.client_type,
  COALESCE(p.is_verified, false) AS is_verified,
  p.company_name
FROM public.verifications v
LEFT JOIN public.profiles p ON v.user_id = p.id
LEFT JOIN auth.users u ON v.user_id = u.id;

-- Grant select to authenticated and service_role
GRANT SELECT ON public.admin_verification_queue TO authenticated;
GRANT SELECT ON public.admin_verification_queue TO service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
