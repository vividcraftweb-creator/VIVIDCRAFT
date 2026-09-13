-- Migration: Re-create live admin_verification_queue view without coalesce
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
  p.full_name,
  p.email,
  p.avatar_url,
  p.role,
  p.client_type,
  p.is_verified,
  p.verification_status,
  p.company_name
FROM public.verifications v
LEFT JOIN public.profiles p ON v.user_id = p.id;

-- Grant select to authenticated, anon, and service_role
GRANT SELECT ON public.admin_verification_queue TO authenticated;
GRANT SELECT ON public.admin_verification_queue TO anon;
GRANT SELECT ON public.admin_verification_queue TO service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
