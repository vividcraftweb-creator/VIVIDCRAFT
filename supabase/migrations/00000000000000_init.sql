-- ============================================================================
-- JobHorizons - Initial Database Schema
-- ============================================================================
-- This migration sets up the complete database schema for JobHorizons.
-- It includes all tables, indexes, RLS policies, functions, and triggers.
-- 
-- Run this ONCE on a fresh Supabase database to set up everything needed
-- for the application to work.
-- 
-- IMPORTANT: This replaces all previous migrations. If you're setting up
-- a new development environment, just run this single file.
-- ============================================================================

Dumping schemas from remote database...
CREATE SCHEMA IF NOT EXISTS "public";
ALTER SCHEMA "public" OWNER TO "postgres";
COMMENT ON SCHEMA "public" IS 'Enterprise features migration completed on 2025-10-16';
CREATE TYPE "public"."ContractStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'TERMINATED'
);
ALTER TYPE "public"."ContractStatus" OWNER TO "postgres";
CREATE TYPE "public"."DocumentType" AS ENUM (
    'ID_VERIFICATION',
    'BUSINESS_REGISTRATION',
    'COMPANY_DOCUMENTS',
    'PORTFOLIO_ITEM'
);
ALTER TYPE "public"."DocumentType" OWNER TO "postgres";
CREATE TYPE "public"."InvoiceStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'PAID',
    'OVERDUE'
);
ALTER TYPE "public"."InvoiceStatus" OWNER TO "postgres";
CREATE TYPE "public"."JobStatus" AS ENUM (
    'OPEN',
    'PAUSED',
    'CLOSED'
);
ALTER TYPE "public"."JobStatus" OWNER TO "postgres";
CREATE TYPE "public"."MilestoneStatus" AS ENUM (
    'PENDING',
    'FUNDED',
    'SUBMITTED',
    'APPROVED',
    'CANCELED'
);
ALTER TYPE "public"."MilestoneStatus" OWNER TO "postgres";
CREATE TYPE "public"."NotificationType" AS ENUM (
    'PROPOSAL_RECEIVED',
    'CONTRACT_STARTED',
    'MILESTONE_FUNDED',
    'MILESTONE_COMPLETED',
    'PAYMENT_RECEIVED',
    'MESSAGE_RECEIVED',
    'MILESTONE_SUBMITTED',
    'INTERVIEW_SCHEDULED',
    'VERIFICATION_APPROVED',
    'VERIFICATION_REJECTED'
);
ALTER TYPE "public"."NotificationType" OWNER TO "postgres";
CREATE TYPE "public"."PaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'FAILED'
);
ALTER TYPE "public"."PaymentStatus" OWNER TO "postgres";
CREATE TYPE "public"."ProposalStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN'
);
ALTER TYPE "public"."ProposalStatus" OWNER TO "postgres";
CREATE TYPE "public"."Role" AS ENUM (
    'FREELANCER',
    'CLIENT',
    'ADMIN'
);
ALTER TYPE "public"."Role" OWNER TO "postgres";
CREATE TYPE "public"."StripePaymentStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REFUNDED'
);
ALTER TYPE "public"."StripePaymentStatus" OWNER TO "postgres";
CREATE TYPE "public"."StripePaymentType" AS ENUM (
    'CLIENT_VERIFICATION',
    'JOB_RENEWAL',
    'TOKEN_PURCHASE'
);
ALTER TYPE "public"."StripePaymentType" OWNER TO "postgres";
CREATE TYPE "public"."VerificationStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);
ALTER TYPE "public"."VerificationStatus" OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."auto_create_proposal_tracking"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  job_client_id TEXT;
BEGIN
  -- Get the client ID from the job
  SELECT "clientId" INTO job_client_id
  FROM "Job"
  WHERE "id" = NEW."jobId";
  -- Only create tracking if it doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 FROM "ProposalTracking"
    WHERE "proposalId" = NEW."id"
  ) THEN
    -- Create the tracking record
    INSERT INTO "ProposalTracking" (
      "id",
      "clientId",
      "proposalId",
      "freelancerId",
      "jobId",
      "status",
      "createdAt",
      "updatedAt"
    ) VALUES (
      gen_random_uuid()::TEXT,
      job_client_id,
      NEW."id",
      NEW."freelancerId",
      NEW."jobId",
      'new',
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."auto_create_proposal_tracking"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."auto_create_proposal_tracking"() IS 'Automatically creates a ProposalTracking record when a new proposal is submitted';
CREATE OR REPLACE FUNCTION "public"."calculate_support_response_time"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW."isStaffResponse" = TRUE THEN
    UPDATE "SupportTicket"
    SET
      "firstResponseAt" = NEW."createdAt",
      "responseTime" = EXTRACT(EPOCH FROM (NEW."createdAt" - "SupportTicket"."createdAt"))::INTEGER
    WHERE "id" = NEW."ticketId"
    AND "firstResponseAt" IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."calculate_support_response_time"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."find_duplicate_active_subscriptions"() RETURNS TABLE("user_id" "text", "subscription_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    "userId" as user_id,
    COUNT(*) as subscription_count
  FROM "Subscription"
  WHERE status = 'ACTIVE'
  GROUP BY "userId"
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC;
END;
$$;
ALTER FUNCTION "public"."find_duplicate_active_subscriptions"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."find_duplicate_active_subscriptions"() IS 'Identifies users who have multiple ACTIVE subscriptions';
CREATE OR REPLACE FUNCTION "public"."fix_duplicate_active_subscriptions"() RETURNS TABLE("user_id" "text", "canceled_count" integer, "kept_subscription_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  affected_user RECORD;
  keep_sub_id TEXT;
  cancel_count INTEGER;
BEGIN
  -- Loop through each user with multiple active subscriptions
  FOR affected_user IN
    SELECT * FROM find_duplicate_active_subscriptions()
  LOOP
    -- Get the most recent subscription to keep (based on createdAt)
    SELECT id INTO keep_sub_id
    FROM "Subscription"
    WHERE "userId" = affected_user.user_id
      AND status = 'ACTIVE'
    ORDER BY "createdAt" DESC, "updatedAt" DESC
    LIMIT 1;
    -- Mark all other active subscriptions as CANCELED
    UPDATE "Subscription"
    SET
      status = 'CANCELED',
      "cancelAtPeriodEnd" = true,
      "updatedAt" = NOW()
    WHERE "userId" = affected_user.user_id
      AND status = 'ACTIVE'
      AND id != keep_sub_id;
    -- Get count of canceled subscriptions
    GET DIAGNOSTICS cancel_count = ROW_COUNT;
    -- Return result for this user
    user_id := affected_user.user_id;
    canceled_count := cancel_count;
    kept_subscription_id := keep_sub_id;
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$$;
ALTER FUNCTION "public"."fix_duplicate_active_subscriptions"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."fix_duplicate_active_subscriptions"() IS 'Fixes users with multiple ACTIVE subscriptions by keeping the most recent and marking others as CANCELED';
CREATE OR REPLACE FUNCTION "public"."generate_ticket_number"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN 'TICKET-' || LPAD(nextval('support_ticket_number_seq')::TEXT, 6, '0');
END;
$$;
ALTER FUNCTION "public"."generate_ticket_number"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."generate_ticket_number"() IS 'Generates unique ticket numbers in format TICKET-XXXXXX';
CREATE OR REPLACE FUNCTION "public"."get_active_subscription"("user_id" "text") RETURNS TABLE("subscription_id" "text", "plan" "text", "status" "text", "current_period_end" timestamp with time zone, "cancel_at_period_end" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    "id",
    "plan",
    "status",
    "currentPeriodEnd",
    "cancelAtPeriodEnd"
  FROM "Subscription"
  WHERE "userId" = user_id
    AND "status" = 'ACTIVE'
  ORDER BY "createdAt" DESC
  LIMIT 1;
END;
$$;
ALTER FUNCTION "public"."get_active_subscription"("user_id" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_active_subscription"("user_id" "text") IS 'Returns the active subscription details for a user';
CREATE OR REPLACE FUNCTION "public"."get_job_owner"("job_id" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    SELECT "clientId" FROM "Job" WHERE id = job_id LIMIT 1;
$$;
ALTER FUNCTION "public"."get_job_owner"("job_id" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_job_owner"("job_id" "text") IS 'Returns the client ID (owner) of a job. search_path set for security.';
CREATE OR REPLACE FUNCTION "public"."get_job_priority_weight"("placement" "text") RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    AS $$
BEGIN
  CASE placement
    WHEN 'featured' THEN RETURN 3;
    WHEN 'priority' THEN RETURN 2;
    ELSE RETURN 1;
  END CASE;
END;
$$;
ALTER FUNCTION "public"."get_job_priority_weight"("placement" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_job_priority_weight"("placement" "text") IS 'Returns priority weight for job placement sorting (featured=3, priority=2, none=1)';
CREATE OR REPLACE FUNCTION "public"."get_verification_progress"("user_id" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  client_type TEXT;
  total_required INTEGER := 0;
  completed INTEGER := 0;
  payment_status TEXT;
  profile_complete BOOLEAN := FALSE;
  has_id_front BOOLEAN := FALSE;
  has_business_reg BOOLEAN := FALSE;
  has_proof_address BOOLEAN := FALSE;
BEGIN
  -- Get client type and payment status
  SELECT "clientType", "verificationPaymentStatus"
  INTO client_type, payment_status
  FROM "User"
  WHERE id = user_id;
  -- Check profile completion
  SELECT
    (firstName IS NOT NULL AND lastName IS NOT NULL AND
     (client_type = 'INDIVIDUAL' OR
      (client_type = 'BUSINESS' AND companyName IS NOT NULL AND businessRegistrationNumber IS NOT NULL)))
  INTO profile_complete
  FROM "Profile"
  WHERE userId = user_id;
  -- Check required documents
  SELECT
    COUNT(*) > 0 INTO has_id_front
  FROM "Verification"
  WHERE userId = user_id
    AND verificationType = 'ID_FRONT'
    AND status IN ('PENDING', 'APPROVED');
  IF client_type = 'BUSINESS' THEN
    SELECT
      COUNT(*) > 0 INTO has_business_reg
    FROM "Verification"
    WHERE userId = user_id
      AND verificationType = 'BUSINESS_REGISTRATION'
      AND status IN ('PENDING', 'APPROVED');
    SELECT
      COUNT(*) > 0 INTO has_proof_address
    FROM "Verification"
    WHERE userId = user_id
      AND verificationType = 'PROOF_OF_ADDRESS'
      AND status IN ('PENDING', 'APPROVED');
  END IF;
  -- Calculate progress
  IF client_type = 'INDIVIDUAL' THEN
    total_required := 3; -- Profile, Payment, ID
    IF profile_complete THEN completed := completed + 1; END IF;
    IF payment_status = 'PAID' THEN completed := completed + 1; END IF;
    IF has_id_front THEN completed := completed + 1; END IF;
  ELSE
    total_required := 5; -- Profile, Payment, ID, Business Reg, Proof of Address
    IF profile_complete THEN completed := completed + 1; END IF;
    IF payment_status = 'PAID' THEN completed := completed + 1; END IF;
    IF has_id_front THEN completed := completed + 1; END IF;
    IF has_business_reg THEN completed := completed + 1; END IF;
    IF has_proof_address THEN completed := completed + 1; END IF;
  END IF;
  RETURN (completed * 100) / total_required;
END;
$$;
ALTER FUNCTION "public"."get_verification_progress"("user_id" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_verification_progress"("user_id" "text") IS 'Calculates verification completion percentage based on client type and required documents';
CREATE OR REPLACE FUNCTION "public"."get_verification_progress"("user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  client_type TEXT;
  total_required INTEGER := 0;
  completed INTEGER := 0;
  payment_status TEXT;
  profile_complete BOOLEAN := FALSE;
  has_id_front BOOLEAN := FALSE;
  has_business_reg BOOLEAN := FALSE;
  has_proof_address BOOLEAN := FALSE;
BEGIN
  -- Get client type and payment status
  SELECT "clientType", "verificationPaymentStatus"
  INTO client_type, payment_status
  FROM "User"
  WHERE id = user_id::text;
  -- Check profile completion
  SELECT
    (firstName IS NOT NULL AND lastName IS NOT NULL AND
     (client_type = 'INDIVIDUAL' OR
      (client_type = 'BUSINESS' AND companyName IS NOT NULL AND businessRegistrationNumber IS NOT NULL)))
  INTO profile_complete
  FROM "Profile"
  WHERE userId = user_id::text;
  -- Check required documents
  SELECT
    COUNT(*) > 0 INTO has_id_front
  FROM "Verification"
  WHERE userId = user_id::text
    AND verificationType = 'ID_FRONT'
    AND status IN ('PENDING', 'APPROVED');
  IF client_type = 'BUSINESS' THEN
    SELECT
      COUNT(*) > 0 INTO has_business_reg
    FROM "Verification"
    WHERE userId = user_id::text
      AND verificationType = 'BUSINESS_REGISTRATION'
      AND status IN ('PENDING', 'APPROVED');
    SELECT
      COUNT(*) > 0 INTO has_proof_address
    FROM "Verification"
    WHERE userId = user_id::text
      AND verificationType = 'PROOF_OF_ADDRESS'
      AND status IN ('PENDING', 'APPROVED');
  END IF;
  -- Calculate progress
  IF client_type = 'INDIVIDUAL' THEN
    total_required := 3; -- Profile, Payment, ID
    IF profile_complete THEN completed := completed + 1; END IF;
    IF payment_status = 'PAID' THEN completed := completed + 1; END IF;
    IF has_id_front THEN completed := completed + 1; END IF;
  ELSE
    total_required := 5; -- Profile, Payment, ID, Business Reg, Proof of Address
    IF profile_complete THEN completed := completed + 1; END IF;
    IF payment_status = 'PAID' THEN completed := completed + 1; END IF;
    IF has_id_front THEN completed := completed + 1; END IF;
    IF has_business_reg THEN completed := completed + 1; END IF;
    IF has_proof_address THEN completed := completed + 1; END IF;
  END IF;
  RETURN (completed * 100) / total_required;
END;
$$;
ALTER FUNCTION "public"."get_verification_progress"("user_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_verification_progress"("user_id" "uuid") IS 'Calculates verification completion percentage based on client type and required documents';
CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "User"
    WHERE id = (auth.uid())::text
    AND role = 'ADMIN'
  );
END;
$$;
ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."is_admin"() IS 'Helper function to check if the current authenticated user has ADMIN role';
CREATE OR REPLACE FUNCTION "public"."is_verification_overdue"("user_id" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deadline TIMESTAMP WITH TIME ZONE;
  is_verified BOOLEAN;
BEGIN
  SELECT "verificationDeadline", "isVerified"
  INTO deadline, is_verified
  FROM "User"
  WHERE id = user_id;
  IF is_verified = TRUE THEN
    RETURN FALSE;
  END IF;
  IF deadline IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN NOW() > deadline;
END;
$$;
ALTER FUNCTION "public"."is_verification_overdue"("user_id" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."is_verification_overdue"("user_id" "text") IS 'Checks if a user verification deadline has passed and they are still unverified';
CREATE OR REPLACE FUNCTION "public"."is_verification_overdue"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deadline TIMESTAMP WITH TIME ZONE;
  is_verified BOOLEAN;
BEGIN
  SELECT "verificationDeadline", "isVerified"
  INTO deadline, is_verified
  FROM "User"
  WHERE id = user_id::text;
  IF is_verified = TRUE THEN
    RETURN FALSE;
  END IF;
  IF deadline IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN NOW() > deadline;
END;
$$;
ALTER FUNCTION "public"."is_verification_overdue"("user_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."is_verification_overdue"("user_id" "uuid") IS 'Checks if a user verification deadline has passed and they are still unverified';
CREATE OR REPLACE FUNCTION "public"."log_user_soft_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only log when deletedAt changes from NULL to a value
  IF OLD."deletedAt" IS NULL AND NEW."deletedAt" IS NOT NULL THEN
    INSERT INTO "AuditLog" (id, action, "entityType", "entityId", metadata, "createdAt")
    VALUES (
      gen_random_uuid()::text,
      'user.soft_deleted',
      'User',
      OLD.id,
      jsonb_build_object(
        'email', OLD.email,
        'role', OLD.role,
        'deletedAt', NEW."deletedAt"
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."log_user_soft_deletion"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."set_verification_deadline"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW."verificationStartedAt" IS NOT NULL AND OLD."verificationStartedAt" IS NULL THEN
    NEW."verificationDeadline" := NEW."verificationStartedAt" + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."set_verification_deadline"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."set_verification_deadline"() IS 'Automatically sets verification deadline to 7 days when user starts verification process';
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 'Trigger function to automatically update updatedAt timestamp. search_path set for security.';
CREATE OR REPLACE FUNCTION "public"."user_has_proposal_for_job"("job_id" "text", "user_id" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Proposal"
    WHERE "Proposal"."jobId" = job_id
    AND "Proposal"."freelancerId" = user_id
  );
$$;
ALTER FUNCTION "public"."user_has_proposal_for_job"("job_id" "text", "user_id" "text") OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ApiKey" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "userId" "text" NOT NULL,
    "name" character varying(100) NOT NULL,
    "keyHash" character varying(255) NOT NULL,
    "keyPrefix" character varying(20) NOT NULL,
    "scopes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "lastUsedAt" timestamp without time zone,
    "expiresAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "revokedAt" timestamp without time zone,
    CONSTRAINT "check_scopes" CHECK (("array_length"("scopes", 1) > 0))
);
ALTER TABLE "public"."ApiKey" OWNER TO "postgres";
COMMENT ON TABLE "public"."ApiKey" IS 'API keys for REST API access (Enterprise feature)';
COMMENT ON COLUMN "public"."ApiKey"."keyHash" IS 'SHA-256 hash of the actual API key';
COMMENT ON COLUMN "public"."ApiKey"."keyPrefix" IS 'First 8 characters for identification (jh_abc123...)';
COMMENT ON COLUMN "public"."ApiKey"."scopes" IS 'Array of permissions (read:contracts, write:jobs, etc.)';
CREATE TABLE IF NOT EXISTS "public"."ApiKeyIpWhitelist" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "apiKeyId" "text" NOT NULL,
    "ipAddress" character varying(45) NOT NULL,
    "description" "text",
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."ApiKeyIpWhitelist" OWNER TO "postgres";
COMMENT ON TABLE "public"."ApiKeyIpWhitelist" IS 'IP whitelist for API keys (Enterprise security feature)';
CREATE TABLE IF NOT EXISTS "public"."ApiRateLimit" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "apiKeyId" "text" NOT NULL,
    "endpoint" character varying(200) NOT NULL,
    "requestCount" integer DEFAULT 0 NOT NULL,
    "windowStart" timestamp without time zone NOT NULL
);
ALTER TABLE "public"."ApiRateLimit" OWNER TO "postgres";
COMMENT ON TABLE "public"."ApiRateLimit" IS 'API rate limiting tracking table. System managed - no user policies by design.';
CREATE TABLE IF NOT EXISTS "public"."ApiRequestLog" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "apiKeyId" "text",
    "method" character varying(10) NOT NULL,
    "endpoint" character varying(500) NOT NULL,
    "statusCode" integer NOT NULL,
    "responseTime" integer,
    "ipAddress" character varying(45),
    "userAgent" "text",
    "requestBody" "jsonb",
    "responseBody" "jsonb",
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."ApiRequestLog" OWNER TO "postgres";
COMMENT ON TABLE "public"."ApiRequestLog" IS 'Audit log for all API requests';
COMMENT ON COLUMN "public"."ApiRequestLog"."responseTime" IS 'Response time in milliseconds';
CREATE TABLE IF NOT EXISTS "public"."AuditLog" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "userId" "text",
    "action" character varying(100) NOT NULL,
    "entityType" character varying(50) NOT NULL,
    "entityId" "text",
    "ipAddress" character varying(45),
    "userAgent" "text",
    "metadata" "jsonb",
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."AuditLog" OWNER TO "postgres";
COMMENT ON TABLE "public"."AuditLog" IS 'Audit trail for all significant user actions';
COMMENT ON COLUMN "public"."AuditLog"."action" IS 'Action performed (job.created, contract.signed, etc.)';
CREATE TABLE IF NOT EXISTS "public"."BillingAddress" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "userId" "text" NOT NULL,
    "firstName" character varying(100) NOT NULL,
    "lastName" character varying(100) NOT NULL,
    "streetAddress" character varying(255) NOT NULL,
    "streetAddress2" character varying(255),
    "city" character varying(100) NOT NULL,
    "state" character varying(100) NOT NULL,
    "postalCode" character varying(20) NOT NULL,
    "country" character varying(2) DEFAULT 'US'::character varying NOT NULL,
    "isDefault" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."BillingAddress" OWNER TO "postgres";
COMMENT ON TABLE "public"."BillingAddress" IS 'User billing addresses for payment processing with AVS support';
COMMENT ON COLUMN "public"."BillingAddress"."firstName" IS 'Cardholder first name for AVS verification';
COMMENT ON COLUMN "public"."BillingAddress"."lastName" IS 'Cardholder last name for AVS verification';
COMMENT ON COLUMN "public"."BillingAddress"."state" IS 'State, province, or region name (supports international formats)';
COMMENT ON COLUMN "public"."BillingAddress"."postalCode" IS 'ZIP/Postal code for AVS verification (international format)';
COMMENT ON COLUMN "public"."BillingAddress"."country" IS 'ISO 3166-1 alpha-2 country code (e.g., US, CA, PH)';
COMMENT ON COLUMN "public"."BillingAddress"."isDefault" IS 'Primary billing address for user payments';
CREATE TABLE IF NOT EXISTS "public"."Certification" (
    "id" "text" NOT NULL,
    "profileId" "text" NOT NULL,
    "name" "text" NOT NULL,
    "issuer" "text" NOT NULL,
    "issueDate" timestamp(3) without time zone,
    "expiryDate" timestamp(3) without time zone,
    "credentialId" "text",
    "credentialUrl" "text",
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
ALTER TABLE "public"."Certification" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."Contract" (
    "id" "text" NOT NULL,
    "jobId" "text" NOT NULL,
    "clientId" "text" NOT NULL,
    "freelancerId" "text" NOT NULL,
    "status" "public"."ContractStatus" DEFAULT 'ACTIVE'::"public"."ContractStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp without time zone
);
ALTER TABLE "public"."Contract" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."Document" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "fileName" "text" NOT NULL,
    "filePath" "text" NOT NULL,
    "fileSize" integer,
    "mimeType" "text",
    "isApproved" boolean,
    "rejectionReason" "text",
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    CONSTRAINT "check_document_file_size" CHECK ((("fileSize" IS NULL) OR ("fileSize" <= 5242880)))
);
ALTER TABLE "public"."Document" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."EducationItem" (
    "id" "text" NOT NULL,
    "profileId" "text" NOT NULL,
    "institution" "text" NOT NULL,
    "degree" "text" NOT NULL,
    "fieldOfStudy" "text",
    "startDate" "text",
    "endDate" "text",
    "description" "text",
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
ALTER TABLE "public"."EducationItem" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."EmailVerificationToken" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "userId" "text" NOT NULL,
    "token" "text" NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "usedAt" timestamp(3) without time zone
);
ALTER TABLE "public"."EmailVerificationToken" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ExperienceItem" (
    "id" "text" NOT NULL,
    "profileId" "text" NOT NULL,
    "company" "text" NOT NULL,
    "position" "text" NOT NULL,
    "location" "text",
    "startDate" "text",
    "endDate" "text",
    "current" boolean DEFAULT false NOT NULL,
    "description" "text",
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
ALTER TABLE "public"."ExperienceItem" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."FraudFlag" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "riskScore" integer NOT NULL,
    "reason" "text" NOT NULL,
    "metadata" "text",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedBy" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "flagType" "text",
    "severity" integer
);
ALTER TABLE "public"."FraudFlag" OWNER TO "postgres";
COMMENT ON TABLE "public"."FraudFlag" IS 'Fraud detection flags. Admin/system access only - no user policies by design.';
COMMENT ON COLUMN "public"."FraudFlag"."flagType" IS 'Type of fraud detected (e.g., DISPOSABLE_EMAIL, SCAM_CONTENT, etc.)';
COMMENT ON COLUMN "public"."FraudFlag"."severity" IS 'Severity level of the fraud flag (0-10)';
CREATE TABLE IF NOT EXISTS "public"."FreelancerScore" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "freelancerId" "text" NOT NULL,
    "jobId" "text" NOT NULL,
    "totalScore" numeric(5,2) NOT NULL,
    "skillsMatch" numeric(5,2),
    "budgetAlignment" numeric(5,2),
    "pastSuccess" numeric(5,2),
    "rating" numeric(5,2),
    "availability" numeric(5,2),
    "responseTime" numeric(5,2),
    "calculatedAt" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."FreelancerScore" OWNER TO "postgres";
COMMENT ON TABLE "public"."FreelancerScore" IS 'AI-powered freelancer recommendation scores';
COMMENT ON COLUMN "public"."FreelancerScore"."totalScore" IS 'Overall match score (0-100)';
CREATE TABLE IF NOT EXISTS "public"."Invoice" (
    "id" "text" NOT NULL,
    "clientId" "text" NOT NULL,
    "contractId" "text" NOT NULL,
    "amount" double precision NOT NULL,
    "status" "public"."InvoiceStatus" DEFAULT 'DRAFT'::"public"."InvoiceStatus" NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "releasedAt" timestamp with time zone
);
ALTER TABLE "public"."Invoice" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."Job" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text" NOT NULL,
    "budget" double precision NOT NULL,
    "deadline" timestamp(3) without time zone NOT NULL,
    "tags" "text",
    "status" "public"."JobStatus" DEFAULT 'OPEN'::"public"."JobStatus" NOT NULL,
    "clientId" "text" NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "isApproved" boolean DEFAULT true NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "jobType" "text",
    "category" "text",
    "projectGoal" "text",
    "experienceLevel" "text",
    "projectSize" "text",
    "projectDuration" "text",
    "paymentType" "text",
    "hourlyRateMin" numeric(10,2),
    "hourlyRateMax" numeric(10,2),
    "milestones" "jsonb",
    "companyName" "text",
    "companyWebsite" "text",
    "companyLocation" "text",
    "companyLat" numeric(10,8),
    "companyLng" numeric(11,8),
    "locationVisibility" "text" DEFAULT 'public'::"text",
    "companyLogo" "text",
    "jobThumbnail" "text",
    "supportingImages" "jsonb" DEFAULT '[]'::"jsonb",
    "projectFiles" "jsonb" DEFAULT '[]'::"jsonb",
    "screeningQuestions" "jsonb" DEFAULT '[]'::"jsonb",
    "autoScreening" boolean DEFAULT true,
    "englishLevel" "text",
    "preferredLocations" "jsonb" DEFAULT '[]'::"jsonb",
    "projectStage" "text",
    "availabilityRequirement" "text",
    "deletedAt" timestamp without time zone,
    "priorityPlacement" "text" DEFAULT 'none'::"text" NOT NULL,
    CONSTRAINT "Job_priorityPlacement_check" CHECK (("priorityPlacement" = ANY (ARRAY['none'::"text", 'priority'::"text", 'featured'::"text"]))),
    CONSTRAINT "check_job_budget_positive" CHECK (("budget" >= (0)::double precision))
);
ALTER TABLE "public"."Job" OWNER TO "postgres";
COMMENT ON COLUMN "public"."Job"."priorityPlacement" IS 'Job placement priority level based on client subscription: none (free), priority (business), featured (enterprise)';
CREATE TABLE IF NOT EXISTS "public"."Message" (
    "id" "text" NOT NULL,
    "senderId" "text" NOT NULL,
    "receiverId" "text" NOT NULL,
    "content" "text" NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "jobId" "text",
    "proposalId" "text"
);
ALTER TABLE "public"."Message" OWNER TO "postgres";
COMMENT ON COLUMN "public"."Message"."jobId" IS 'Optional: The job this message is related to';
COMMENT ON COLUMN "public"."Message"."proposalId" IS 'Optional: The proposal this message is related to';
CREATE TABLE IF NOT EXISTS "public"."Milestone" (
    "id" "text" NOT NULL,
    "contractId" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "amount" double precision NOT NULL,
    "deadline" timestamp(3) without time zone NOT NULL,
    "status" "public"."MilestoneStatus" DEFAULT 'PENDING'::"public"."MilestoneStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "fundedAt" timestamp with time zone,
    "submittedAt" timestamp with time zone,
    "submissionNote" "text",
    "submissionFiles" "jsonb" DEFAULT '[]'::"jsonb",
    "approvedAt" timestamp with time zone,
    "approvalNote" "text"
);
ALTER TABLE "public"."Milestone" OWNER TO "postgres";
COMMENT ON COLUMN "public"."Milestone"."submissionFiles" IS 'Array of file metadata/URLs provided during submission';
CREATE TABLE IF NOT EXISTS "public"."MilestoneComment" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "milestoneId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "comment" "text" NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."MilestoneComment" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."Notification" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "message" "text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "link" "text",
    "createdAt" timestamp(3) without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."Notification" OWNER TO "postgres";
COMMENT ON COLUMN "public"."Notification"."createdAt" IS 'Timestamp when notification was created. Defaults to NOW() to prevent missing timestamps.';
CREATE TABLE IF NOT EXISTS "public"."PayPalPayment" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "type" "text" NOT NULL,
    "amount" double precision NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "paypalOrderId" "text",
    "paypalCaptureId" "text",
    "metadata" "text",
    "tokensPurchased" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "billingAddressId" "text"
);
ALTER TABLE "public"."PayPalPayment" OWNER TO "postgres";
COMMENT ON TABLE "public"."PayPalPayment" IS 'Payment records for all transactions processed through PayPal SDK v6';
COMMENT ON COLUMN "public"."PayPalPayment"."paypalOrderId" IS 'PayPal Order ID for one-time payments or subscription approvals';
COMMENT ON COLUMN "public"."PayPalPayment"."paypalCaptureId" IS 'PayPal Capture ID or Transaction ID for completed payments';
COMMENT ON COLUMN "public"."PayPalPayment"."billingAddressId" IS 'Reference to billing address used for this payment';
CREATE TABLE IF NOT EXISTS "public"."Payment" (
    "id" "text" NOT NULL,
    "invoiceId" "text" NOT NULL,
    "amount" double precision NOT NULL,
    "status" "public"."PaymentStatus" DEFAULT 'PENDING'::"public"."PaymentStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
ALTER TABLE "public"."Payment" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."PortfolioItem" (
    "id" "text" NOT NULL,
    "profileId" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "url" "text",
    "imageUrl" "text",
    "technologies" "text",
    "completedAt" timestamp(3) without time zone,
    "featured" boolean DEFAULT false NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
ALTER TABLE "public"."PortfolioItem" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."Profile" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "firstName" "text",
    "lastName" "text",
    "skills" "text",
    "rate" double precision,
    "portfolio" "text",
    "companyName" "text",
    "companyInfo" "text",
    "education" "text",
    "experience" "text",
    "verified" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "bio" "text",
    "title" "text",
    "location" "text",
    "isPublished" boolean DEFAULT false,
    "profilePicture" "text",
    "slug" "text" NOT NULL,
    "brandLogo" character varying(500),
    "brandPrimaryColor" character varying(7),
    "brandSecondaryColor" character varying(7),
    "phone" "text",
    "industry" "text",
    "country" "text",
    "timezone" "text",
    "website" "text",
    "businessRegistrationNumber" "text",
    "taxId" "text",
    "businessEmail" "text",
    "businessPhone" "text",
    "businessAddressLine1" "text",
    "businessAddressLine2" "text",
    "businessCity" "text",
    "businessState" "text",
    "businessPostalCode" "text",
    "businessCountry" "text",
    CONSTRAINT "check_profile_rate_positive" CHECK (("rate" >= (0)::double precision)),
    CONSTRAINT "profile_slug_format_check" CHECK ((("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text") AND ("length"("slug") >= 2) AND ("length"("slug") <= 100)))
);
ALTER TABLE "public"."Profile" OWNER TO "postgres";
COMMENT ON COLUMN "public"."Profile"."slug" IS 'URL-safe identifier for freelancer profiles. Required field. Format: lowercase-with-hyphens. Example: john-smith, john-smith-1';
COMMENT ON COLUMN "public"."Profile"."businessRegistrationNumber" IS 'Business registration/incorporation number for verification';
COMMENT ON COLUMN "public"."Profile"."taxId" IS 'Tax ID/EIN for business verification (US businesses)';
COMMENT ON COLUMN "public"."Profile"."businessEmail" IS 'Official business email address';
COMMENT ON COLUMN "public"."Profile"."businessPhone" IS 'Official business phone number';
COMMENT ON COLUMN "public"."Profile"."businessAddressLine1" IS 'Business registered address line 1';
COMMENT ON COLUMN "public"."Profile"."businessAddressLine2" IS 'Business registered address line 2 (suite, floor, etc.)';
COMMENT ON COLUMN "public"."Profile"."businessCity" IS 'Business registered city';
COMMENT ON COLUMN "public"."Profile"."businessState" IS 'Business registered state/province';
COMMENT ON COLUMN "public"."Profile"."businessPostalCode" IS 'Business registered postal/zip code';
COMMENT ON COLUMN "public"."Profile"."businessCountry" IS 'Business registered country';
CREATE TABLE IF NOT EXISTS "public"."ProfileView" (
    "id" "text" NOT NULL,
    "profileId" "text" NOT NULL,
    "viewerId" "text",
    "viewerIp" "text",
    "viewedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE "public"."ProfileView" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ProjectActivity" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clientId" "text" NOT NULL,
    "milestoneId" "text",
    "fileId" "text",
    "action" character varying(100) NOT NULL,
    "description" "text" NOT NULL,
    "metadata" "jsonb",
    "createdBy" "text" NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "projectMilestoneId" "text"
);
ALTER TABLE "public"."ProjectActivity" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ProjectFile" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clientId" "text" NOT NULL,
    "contractId" "text",
    "milestoneId" "text",
    "name" character varying(255) NOT NULL,
    "originalName" character varying(255) NOT NULL,
    "mimeType" character varying(100) NOT NULL,
    "size" bigint NOT NULL,
    "category" character varying(50) DEFAULT 'other'::character varying,
    "uploadedBy" "text" NOT NULL,
    "filePath" "text" NOT NULL,
    "description" "text",
    "tags" "text"[],
    "isPublic" boolean DEFAULT false,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "projectMilestoneId" "text",
    CONSTRAINT "check_projectfile_size" CHECK ((("size" IS NULL) OR ("size" <= 5242880)))
);
ALTER TABLE "public"."ProjectFile" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ProjectMilestone" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clientId" "text" NOT NULL,
    "contractId" "text",
    "title" character varying(255) NOT NULL,
    "description" "text",
    "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    "priority" character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    "dueDate" timestamp without time zone NOT NULL,
    "completedAt" timestamp without time zone,
    "assignedTo" "text",
    "progress" integer DEFAULT 0,
    "tags" "text"[],
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ProjectMilestone_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100)))
);
ALTER TABLE "public"."ProjectMilestone" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ProjectMilestoneComment" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "projectMilestoneId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "comment" "text" NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."ProjectMilestoneComment" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."Proposal" (
    "id" "text" NOT NULL,
    "jobId" "text" NOT NULL,
    "freelancerId" "text" NOT NULL,
    "coverLetter" "text" NOT NULL,
    "proposedRate" double precision NOT NULL,
    "status" "public"."ProposalStatus" DEFAULT 'PENDING'::"public"."ProposalStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "screeningAnswers" "jsonb" DEFAULT '[]'::"jsonb",
    "aiScore" integer,
    "aiAnalysis" "text",
    "tokenBid" integer DEFAULT 1 NOT NULL,
    "deletedAt" timestamp without time zone,
    CONSTRAINT "check_proposal_rate_positive" CHECK (("proposedRate" >= (0)::double precision))
);
ALTER TABLE "public"."Proposal" OWNER TO "postgres";
COMMENT ON COLUMN "public"."Proposal"."screeningAnswers" IS 'Array of screening question answers: [{question: string, answer: string}]';
COMMENT ON COLUMN "public"."Proposal"."aiScore" IS 'AI-generated relevance score (0-100) based on screening answers and job requirements';
COMMENT ON COLUMN "public"."Proposal"."aiAnalysis" IS 'AI-generated analysis summary of the candidate''s responses and fit for the role';
CREATE TABLE IF NOT EXISTS "public"."ProposalTracking" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clientId" "text" NOT NULL,
    "proposalId" "text" NOT NULL,
    "freelancerId" "text" NOT NULL,
    "jobId" "text" NOT NULL,
    "status" character varying(50) DEFAULT 'new'::character varying NOT NULL,
    "notes" "text",
    "tags" "text"[],
    "rating" integer,
    "contactedAt" timestamp without time zone,
    "interviewScheduledFor" timestamp without time zone,
    "interviewCompletedAt" timestamp without time zone,
    "offerSentAt" timestamp without time zone,
    "responseDeadline" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ProposalTracking_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);
ALTER TABLE "public"."ProposalTracking" OWNER TO "postgres";
COMMENT ON TABLE "public"."ProposalTracking" IS 'CRM for clients to track freelancers who submitted proposals';
COMMENT ON COLUMN "public"."ProposalTracking"."status" IS 'Tracking status: new, contacted, interview_scheduled, interview_completed, offer_sent, accepted, rejected, withdrawn';
COMMENT ON COLUMN "public"."ProposalTracking"."tags" IS 'Custom tags for categorizing freelancers (e.g., shortlisted, backup, top-tier)';
CREATE TABLE IF NOT EXISTS "public"."ProposalTrackingActivity" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "trackingId" "text" NOT NULL,
    "action" character varying(100) NOT NULL,
    "description" "text" NOT NULL,
    "metadata" "jsonb",
    "createdBy" "text" NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."ProposalTrackingActivity" OWNER TO "postgres";
COMMENT ON TABLE "public"."ProposalTrackingActivity" IS 'Activity log for proposal tracking changes';
CREATE TABLE IF NOT EXISTS "public"."SsoConfiguration" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "organizationId" "text" NOT NULL,
    "provider" character varying(50) NOT NULL,
    "config" "jsonb" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."SsoConfiguration" OWNER TO "postgres";
COMMENT ON TABLE "public"."SsoConfiguration" IS 'SSO configuration for Enterprise organizations';
COMMENT ON COLUMN "public"."SsoConfiguration"."provider" IS 'SSO provider (okta, azure, google, etc.)';
COMMENT ON COLUMN "public"."SsoConfiguration"."config" IS 'Provider-specific configuration (SAML metadata, OAuth credentials, etc.)';
CREATE TABLE IF NOT EXISTS "public"."StripePayment" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "type" "public"."StripePaymentType" NOT NULL,
    "amount" double precision NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "status" "public"."StripePaymentStatus" DEFAULT 'PENDING'::"public"."StripePaymentStatus" NOT NULL,
    "stripeSessionId" "text",
    "stripePaymentIntentId" "text",
    "metadata" "text",
    "tokensPurchased" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
ALTER TABLE "public"."StripePayment" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."Subscription" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "stripeSubscriptionId" "text",
    "stripePriceId" "text",
    "stripeProductId" "text",
    "paypalSubscriptionId" "text",
    "paypalPlanId" "text",
    "paypalOrderId" "text",
    "paypalPaymentId" "text",
    "plan" "text" NOT NULL,
    "status" "text" NOT NULL,
    "currentPeriodStart" timestamp(3) without time zone NOT NULL,
    "currentPeriodEnd" timestamp(3) without time zone NOT NULL,
    "cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
    "gracePeriodEnd" timestamp(3) without time zone,
    "reminderSentAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "paymentMethodId" "text"
);
ALTER TABLE "public"."Subscription" OWNER TO "postgres";
COMMENT ON TABLE "public"."Subscription" IS 'Subscriptions table: Users can have multiple subscription records (for history), but only ONE with status=ACTIVE at a time (enforced by idx_subscription_one_active_per_user index).';
COMMENT ON COLUMN "public"."Subscription"."paypalSubscriptionId" IS 'PayPal SDK v6 Subscription ID (I-XXXXXXXXXXXX)';
COMMENT ON COLUMN "public"."Subscription"."paypalPlanId" IS 'PayPal SDK v6 Billing Plan ID (P-XXXXXXXXXXXX)';
COMMENT ON COLUMN "public"."Subscription"."paymentMethodId" IS 'PayPal vaulted payment method ID (PMID-XXXX) used for recurring billing';
CREATE TABLE IF NOT EXISTS "public"."SubscriptionPlanConfig" (
    "id" "text" NOT NULL,
    "plan" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "priceAmount" double precision NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "interval" "text" NOT NULL,
    "stripeProductId" "text",
    "stripePriceId" "text",
    "paypalProductId" "text",
    "paypalPlanId" "text",
    "features" "text",
    "tokensPerWeek" integer,
    "maxJobPosts" integer,
    "priority" boolean DEFAULT false NOT NULL,
    "featured" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
ALTER TABLE "public"."SubscriptionPlanConfig" OWNER TO "postgres";
COMMENT ON COLUMN "public"."SubscriptionPlanConfig"."paypalProductId" IS 'PayPal SDK v6 Product ID (PROD-XXXXXXXXXXXX) - parent entity of billing plans';
COMMENT ON COLUMN "public"."SubscriptionPlanConfig"."paypalPlanId" IS 'PayPal SDK v6 Billing Plan ID (P-XXXXXXXXXXXX) for recurring subscriptions';
CREATE TABLE IF NOT EXISTS "public"."SupportTicket" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "ticketNumber" "text" DEFAULT "public"."generate_ticket_number"() NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "category" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "status" "text" DEFAULT 'OPEN'::"text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
ALTER TABLE "public"."SupportTicket" OWNER TO "postgres";
COMMENT ON COLUMN "public"."SupportTicket"."ticketNumber" IS 'User-friendly ticket identifier in format TICKET-XXXXXX';
CREATE TABLE IF NOT EXISTS "public"."SupportTicketMessage" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "ticketId" "text" NOT NULL,
    "senderId" "text" NOT NULL,
    "message" "text" NOT NULL,
    "isStaffResponse" boolean DEFAULT false NOT NULL,
    "attachmentUrl" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."SupportTicketMessage" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."TeamMember" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "organizationId" "text" NOT NULL,
    "userId" "text",
    "email" character varying(255) NOT NULL,
    "name" character varying(255),
    "role" character varying(50) DEFAULT 'VIEWER'::character varying NOT NULL,
    "invitedBy" "text" NOT NULL,
    "invitationToken" character varying(255),
    "invitationExpiresAt" timestamp without time zone,
    "acceptedAt" timestamp without time zone,
    "isActive" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "TeamMember_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['OWNER'::character varying, 'ADMIN'::character varying, 'MANAGER'::character varying, 'VIEWER'::character varying])::"text"[])))
);
ALTER TABLE "public"."TeamMember" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."TeamRole" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "organizationId" "text" NOT NULL,
    "name" character varying(100) NOT NULL,
    "permissions" "jsonb" NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."TeamRole" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."TicketResponse" (
    "id" "text" NOT NULL,
    "ticketId" "text" NOT NULL,
    "responderId" "text",
    "message" "text" NOT NULL,
    "isInternal" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE "public"."TicketResponse" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."TokenLog" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "action" "text" NOT NULL,
    "amount" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE "public"."TokenLog" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."TokenPurchasePlan" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "tokens" integer NOT NULL,
    "priceAmount" double precision NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "stripePriceId" "text",
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
ALTER TABLE "public"."TokenPurchasePlan" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."Role" NOT NULL,
    "tokens" integer DEFAULT 150 NOT NULL,
    "tokenResetAt" timestamp(3) without time zone,
    "isVerified" boolean DEFAULT false NOT NULL,
    "verificationPaidAt" timestamp(3) without time zone,
    "profileCompleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "verificationToken" "text",
    "verificationTokenExpiry" timestamp with time zone,
    "subscriptionPlan" "text" DEFAULT 'FREELANCER_FREE'::"text" NOT NULL,
    "paypalCustomerId" "text",
    "jobPostsUsed" integer DEFAULT 0 NOT NULL,
    "jobPostsResetAt" timestamp with time zone,
    "accountManagerId" "text",
    "lastLoginAt" timestamp without time zone,
    "twoFactorSecret" character varying(255),
    "twoFactorEnabled" boolean DEFAULT false,
    "twoFactorBackupCodes" "text"[],
    "organizationId" "text",
    "notificationPreferences" "jsonb" DEFAULT '{"newMessages": true, "newProposals": true, "weeklyTokens": true, "marketingEmails": false, "proposalUpdates": true, "jobStatusChanges": true, "emailNotifications": true, "interviewScheduled": true}'::"jsonb",
    "deletedAt" timestamp without time zone,
    "clientType" "text" DEFAULT 'INDIVIDUAL'::"text",
    "verificationDeadline" timestamp with time zone,
    "verificationStartedAt" timestamp with time zone,
    "verificationPaymentStatus" "text" DEFAULT 'PENDING'::"text",
    "verificationPaymentIntentId" "text",
    "verificationPaymentAmount" integer DEFAULT 100,
    "verificationPaymentMethodId" "text",
    "verificationSubmittedAt" timestamp with time zone,
    "autoLoginToken" "text",
    "autoLoginTokenExpiry" timestamp with time zone,
    "signupIp" "text",
    "lastLoginIp" "text",
    "linkedAccountIds" "text"[] DEFAULT '{}'::"text"[],
    "trustScore" integer DEFAULT 100,
    "lastFlaggedAt" timestamp with time zone,
    "fraudFlags" "jsonb" DEFAULT '[]'::"jsonb",
    "isSoftSuspended" boolean DEFAULT false,
    "paypalSetupTokenId" "text",
    CONSTRAINT "User_clientType_check" CHECK (("clientType" = ANY (ARRAY['INDIVIDUAL'::"text", 'BUSINESS'::"text"]))),
    CONSTRAINT "User_verificationPaymentStatus_check" CHECK (("verificationPaymentStatus" = ANY (ARRAY['PENDING'::"text", 'PAID'::"text", 'FAILED'::"text", 'REFUNDED'::"text"])))
);
ALTER TABLE "public"."User" OWNER TO "postgres";
COMMENT ON TABLE "public"."User" IS 'User table with all RLS policies removed. Access control is handled at application level using service role key for admin operations.';
COMMENT ON COLUMN "public"."User"."isVerified" IS 'User account verification status. Set to TRUE when admin approves ID verification (no payment required since Oct 2025). Clients must be verified to post jobs.';
COMMENT ON COLUMN "public"."User"."verificationPaidAt" IS 'DEPRECATED: Previously tracked when user paid $4.99 verification fee. Since Oct 2025, verification is FREE. Field kept for backward compatibility only.';
COMMENT ON COLUMN "public"."User"."lastLoginAt" IS 'Timestamp of last login for activity monitoring';
COMMENT ON COLUMN "public"."User"."notificationPreferences" IS 'JSON object storing user notification preferences';
COMMENT ON COLUMN "public"."User"."clientType" IS 'Distinguishes between individual clients and business clients. Individual = personal freelance hiring, Business = company/enterprise hiring';
COMMENT ON COLUMN "public"."User"."verificationDeadline" IS '7 days from registration start for clients to complete verification. After deadline, account features are restricted';
COMMENT ON COLUMN "public"."User"."verificationStartedAt" IS 'Timestamp when user started the verification process';
COMMENT ON COLUMN "public"."User"."verificationPaymentStatus" IS '$1 verification payment status to confirm payment method legitimacy and filter fake accounts';
COMMENT ON COLUMN "public"."User"."verificationPaymentIntentId" IS 'PayPal transaction ID for the $1 verification charge';
COMMENT ON COLUMN "public"."User"."verificationPaymentAmount" IS 'Amount charged for verification in cents (default $1.00 = 100 cents)';
COMMENT ON COLUMN "public"."User"."verificationPaymentMethodId" IS 'PayPal Payment Method ID stored for future use after verification';
COMMENT ON COLUMN "public"."User"."signupIp" IS 'IP address used during account registration for fraud detection';
COMMENT ON COLUMN "public"."User"."lastLoginIp" IS 'Most recent login IP address for impossible travel detection';
COMMENT ON COLUMN "public"."User"."linkedAccountIds" IS 'Array of user IDs that appear to be linked/duplicate accounts';
COMMENT ON COLUMN "public"."User"."trustScore" IS 'User trust score (0-100) based on fraud detection checks';
COMMENT ON COLUMN "public"."User"."lastFlaggedAt" IS 'Timestamp when user was last flagged for fraud';
COMMENT ON COLUMN "public"."User"."fraudFlags" IS 'JSON array of fraud flags associated with this user';
COMMENT ON COLUMN "public"."User"."isSoftSuspended" IS 'Whether user account is suspended due to fraud detection';
COMMENT ON COLUMN "public"."User"."paypalSetupTokenId" IS 'PayPal setup token for vaulting payment methods during subscription creation (card payments)';
CREATE TABLE IF NOT EXISTS "public"."Verification" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "status" "public"."VerificationStatus" DEFAULT 'PENDING'::"public"."VerificationStatus" NOT NULL,
    "files" "text",
    "details" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "idType" "text",
    "verificationType" "text" DEFAULT 'ID_FRONT'::"text",
    "documentType" "text",
    "expiryDate" timestamp with time zone,
    "rejectionReason" "text",
    "reviewedAt" timestamp with time zone,
    "adminNotes" "text",
    "reviewedBy" "text",
    CONSTRAINT "Verification_verificationType_check" CHECK (("verificationType" = ANY (ARRAY['ID_FRONT'::"text", 'ID_BACK'::"text", 'SELFIE'::"text", 'BUSINESS_REGISTRATION'::"text", 'PROOF_OF_ADDRESS'::"text", 'TAX_DOCUMENT'::"text", 'BUSINESS_LICENSE'::"text"])))
);
ALTER TABLE "public"."Verification" OWNER TO "postgres";
COMMENT ON TABLE "public"."Verification" IS 'Identity verification requests submitted by users. Users upload government-issued ID, admin reviews and approves/rejects. No payment required.';
COMMENT ON COLUMN "public"."Verification"."verificationType" IS 'Type of verification document: ID_FRONT (government ID front), ID_BACK (back of ID), SELFIE (selfie with ID), BUSINESS_REGISTRATION (business registration certificate), PROOF_OF_ADDRESS (utility bill/bank statement), TAX_DOCUMENT (tax ID/EIN cert), BUSINESS_LICENSE (industry license)';
COMMENT ON COLUMN "public"."Verification"."documentType" IS 'Specific document type submitted (e.g., Passport, Driver License, Utility Bill)';
COMMENT ON COLUMN "public"."Verification"."expiryDate" IS 'Expiry date of the document (for IDs, licenses)';
COMMENT ON COLUMN "public"."Verification"."rejectionReason" IS 'Reason provided by admin for rejection (required for rejected verifications)';
COMMENT ON COLUMN "public"."Verification"."reviewedAt" IS 'Timestamp when admin reviewed the verification';
COMMENT ON COLUMN "public"."Verification"."adminNotes" IS 'Internal notes for admin review and record keeping';
COMMENT ON COLUMN "public"."Verification"."reviewedBy" IS 'Admin user ID who reviewed this verification';
CREATE TABLE IF NOT EXISTS "public"."VideoInterview" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "jobId" "text" NOT NULL,
    "proposalId" "text",
    "clientId" "text" NOT NULL,
    "freelancerId" "text" NOT NULL,
    "roomUrl" character varying(500) NOT NULL,
    "scheduledAt" timestamp without time zone NOT NULL,
    "duration" integer DEFAULT 30 NOT NULL,
    "recordingUrl" character varying(500),
    "transcriptUrl" character varying(500),
    "status" character varying(50) DEFAULT 'scheduled'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "platform" character varying(50) DEFAULT 'OTHER'::character varying,
    "notes" "text"
);
ALTER TABLE "public"."VideoInterview" OWNER TO "postgres";
COMMENT ON TABLE "public"."VideoInterview" IS 'Video interview scheduling and recordings';
COMMENT ON COLUMN "public"."VideoInterview"."duration" IS 'Duration in minutes';
COMMENT ON COLUMN "public"."VideoInterview"."status" IS 'Status: scheduled, completed, cancelled';
COMMENT ON COLUMN "public"."VideoInterview"."platform" IS 'Meeting platform: GOOGLE_MEET, ZOOM, MICROSOFT_TEAMS, OTHER';
COMMENT ON COLUMN "public"."VideoInterview"."notes" IS 'Additional notes or agenda for the interview';
CREATE TABLE IF NOT EXISTS "public"."WebhookDelivery" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "endpointId" "text" NOT NULL,
    "event" character varying(100) NOT NULL,
    "payload" "jsonb" NOT NULL,
    "httpStatus" integer,
    "responseBody" "text",
    "attemptCount" integer DEFAULT 1 NOT NULL,
    "nextRetryAt" timestamp without time zone,
    "deliveredAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."WebhookDelivery" OWNER TO "postgres";
COMMENT ON TABLE "public"."WebhookDelivery" IS 'Webhook delivery log with retry tracking';
COMMENT ON COLUMN "public"."WebhookDelivery"."attemptCount" IS 'Number of delivery attempts (max 5)';
CREATE TABLE IF NOT EXISTS "public"."WebhookEndpoint" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "userId" "text" NOT NULL,
    "url" character varying(500) NOT NULL,
    "events" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "secret" character varying(255) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "description" "text",
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "lastUsedAt" timestamp without time zone
);
ALTER TABLE "public"."WebhookEndpoint" OWNER TO "postgres";
COMMENT ON TABLE "public"."WebhookEndpoint" IS 'Webhook endpoint configurations for real-time event notifications';
COMMENT ON COLUMN "public"."WebhookEndpoint"."events" IS 'Array of subscribed events (proposal.submitted, contract.signed, etc.)';
COMMENT ON COLUMN "public"."WebhookEndpoint"."secret" IS 'Secret key for HMAC signature verification';
CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" "text",
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_steps_count" integer DEFAULT 0 NOT NULL
);
ALTER TABLE "public"."_prisma_migrations" OWNER TO "postgres";
COMMENT ON TABLE "public"."_prisma_migrations" IS 'Prisma migration tracking table - RLS enabled (service role bypasses policies).';
CREATE SEQUENCE IF NOT EXISTS "public"."support_ticket_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE "public"."support_ticket_number_seq" OWNER TO "postgres";
COMMENT ON SEQUENCE "public"."support_ticket_number_seq" IS 'Sequence for generating sequential ticket numbers';
ALTER TABLE ONLY "public"."ApiKeyIpWhitelist"
    ADD CONSTRAINT "ApiKeyIpWhitelist_apiKeyId_ipAddress_key" UNIQUE ("apiKeyId", "ipAddress");
ALTER TABLE ONLY "public"."ApiKeyIpWhitelist"
    ADD CONSTRAINT "ApiKeyIpWhitelist_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ApiKey"
    ADD CONSTRAINT "ApiKey_keyHash_key" UNIQUE ("keyHash");
ALTER TABLE ONLY "public"."ApiKey"
    ADD CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ApiRateLimit"
    ADD CONSTRAINT "ApiRateLimit_apiKeyId_endpoint_windowStart_key" UNIQUE ("apiKeyId", "endpoint", "windowStart");
ALTER TABLE ONLY "public"."ApiRateLimit"
    ADD CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ApiRequestLog"
    ADD CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."BillingAddress"
    ADD CONSTRAINT "BillingAddress_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Certification"
    ADD CONSTRAINT "Certification_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Contract"
    ADD CONSTRAINT "Contract_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."EducationItem"
    ADD CONSTRAINT "EducationItem_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_token_key" UNIQUE ("token");
ALTER TABLE ONLY "public"."ExperienceItem"
    ADD CONSTRAINT "ExperienceItem_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."FraudFlag"
    ADD CONSTRAINT "FraudFlag_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."FreelancerScore"
    ADD CONSTRAINT "FreelancerScore_freelancerId_jobId_key" UNIQUE ("freelancerId", "jobId");
ALTER TABLE ONLY "public"."FreelancerScore"
    ADD CONSTRAINT "FreelancerScore_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Job"
    ADD CONSTRAINT "Job_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."MilestoneComment"
    ADD CONSTRAINT "MilestoneComment_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Milestone"
    ADD CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."PayPalPayment"
    ADD CONSTRAINT "PayPalPayment_paypalCaptureId_key" UNIQUE ("paypalCaptureId");
ALTER TABLE ONLY "public"."PayPalPayment"
    ADD CONSTRAINT "PayPalPayment_paypalOrderId_key" UNIQUE ("paypalOrderId");
ALTER TABLE ONLY "public"."PayPalPayment"
    ADD CONSTRAINT "PayPalPayment_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."PortfolioItem"
    ADD CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ProfileView"
    ADD CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Profile"
    ADD CONSTRAINT "Profile_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ProjectActivity"
    ADD CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ProjectFile"
    ADD CONSTRAINT "ProjectFile_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ProjectMilestoneComment"
    ADD CONSTRAINT "ProjectMilestoneComment_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ProjectMilestone"
    ADD CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ProposalTrackingActivity"
    ADD CONSTRAINT "ProposalTrackingActivity_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ProposalTracking"
    ADD CONSTRAINT "ProposalTracking_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ProposalTracking"
    ADD CONSTRAINT "ProposalTracking_proposalId_key" UNIQUE ("proposalId");
ALTER TABLE ONLY "public"."Proposal"
    ADD CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."SsoConfiguration"
    ADD CONSTRAINT "SsoConfiguration_organizationId_key" UNIQUE ("organizationId");
ALTER TABLE ONLY "public"."SsoConfiguration"
    ADD CONSTRAINT "SsoConfiguration_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."StripePayment"
    ADD CONSTRAINT "StripePayment_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."SubscriptionPlanConfig"
    ADD CONSTRAINT "SubscriptionPlanConfig_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."SubscriptionPlanConfig"
    ADD CONSTRAINT "SubscriptionPlanConfig_plan_key" UNIQUE ("plan");
ALTER TABLE ONLY "public"."Subscription"
    ADD CONSTRAINT "Subscription_paypalSubscriptionId_key" UNIQUE ("paypalSubscriptionId");
ALTER TABLE ONLY "public"."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Subscription"
    ADD CONSTRAINT "Subscription_stripeSubscriptionId_key" UNIQUE ("stripeSubscriptionId");
ALTER TABLE ONLY "public"."SupportTicketMessage"
    ADD CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."SupportTicket"
    ADD CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."SupportTicket"
    ADD CONSTRAINT "SupportTicket_ticketNumber_key" UNIQUE ("ticketNumber");
ALTER TABLE ONLY "public"."TeamMember"
    ADD CONSTRAINT "TeamMember_invitationToken_key" UNIQUE ("invitationToken");
ALTER TABLE ONLY "public"."TeamMember"
    ADD CONSTRAINT "TeamMember_organizationId_userId_key" UNIQUE ("organizationId", "userId");
ALTER TABLE ONLY "public"."TeamMember"
    ADD CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."TeamRole"
    ADD CONSTRAINT "TeamRole_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."TicketResponse"
    ADD CONSTRAINT "TicketResponse_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."TokenLog"
    ADD CONSTRAINT "TokenLog_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."TokenPurchasePlan"
    ADD CONSTRAINT "TokenPurchasePlan_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Verification"
    ADD CONSTRAINT "Verification_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."VideoInterview"
    ADD CONSTRAINT "VideoInterview_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."WebhookDelivery"
    ADD CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."WebhookEndpoint"
    ADD CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."_prisma_migrations"
    ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."Proposal"
    ADD CONSTRAINT "unique_job_freelancer" UNIQUE ("jobId", "freelancerId");
CREATE UNIQUE INDEX "Contract_jobId_key" ON "public"."Contract" USING "btree" ("jobId");
CREATE INDEX "EmailVerificationToken_token_idx" ON "public"."EmailVerificationToken" USING "btree" ("token");
CREATE INDEX "EmailVerificationToken_userId_idx" ON "public"."EmailVerificationToken" USING "btree" ("userId");
CREATE INDEX "Job_priorityPlacement_weight_idx" ON "public"."Job" USING "btree" ("public"."get_job_priority_weight"("priorityPlacement") DESC, "createdAt" DESC);
CREATE UNIQUE INDEX "Job_slug_key" ON "public"."Job" USING "btree" ("slug");
CREATE UNIQUE INDEX "Payment_invoiceId_key" ON "public"."Payment" USING "btree" ("invoiceId");
CREATE UNIQUE INDEX "Profile_userId_key" ON "public"."Profile" USING "btree" ("userId");
CREATE UNIQUE INDEX "StripePayment_stripePaymentIntentId_key" ON "public"."StripePayment" USING "btree" ("stripePaymentIntentId");
CREATE UNIQUE INDEX "StripePayment_stripeSessionId_key" ON "public"."StripePayment" USING "btree" ("stripeSessionId");
CREATE INDEX "SupportTicketMessage_createdAt_idx" ON "public"."SupportTicketMessage" USING "btree" ("createdAt");
CREATE INDEX "SupportTicketMessage_ticketId_idx" ON "public"."SupportTicketMessage" USING "btree" ("ticketId");
CREATE INDEX "SupportTicket_category_idx" ON "public"."SupportTicket" USING "btree" ("category");
CREATE INDEX "SupportTicket_createdAt_idx" ON "public"."SupportTicket" USING "btree" ("createdAt" DESC);
CREATE INDEX "SupportTicket_status_idx" ON "public"."SupportTicket" USING "btree" ("status");
COMMENT ON INDEX "public"."SupportTicket_ticketNumber_key" IS 'Unique constraint on ticket number (duplicate removed for performance)';
CREATE INDEX "SupportTicket_userId_idx" ON "public"."SupportTicket" USING "btree" ("userId");
CREATE INDEX "User_autoLoginToken_idx" ON "public"."User" USING "btree" ("autoLoginToken");
CREATE UNIQUE INDEX "User_email_key" ON "public"."User" USING "btree" ("email");
CREATE INDEX "User_verificationToken_idx" ON "public"."User" USING "btree" ("verificationToken");
CREATE UNIQUE INDEX "Verification_userId_verificationType_key" ON "public"."Verification" USING "btree" ("userId", "verificationType");
CREATE INDEX "idx_apikey_hash" ON "public"."ApiKey" USING "btree" ("keyHash");
CREATE INDEX "idx_apikey_user" ON "public"."ApiKey" USING "btree" ("userId") WHERE ("revokedAt" IS NULL);
CREATE INDEX "idx_apilog_key_created" ON "public"."ApiRequestLog" USING "btree" ("apiKeyId", "createdAt" DESC);
CREATE INDEX "idx_audit_log_entity" ON "public"."AuditLog" USING "btree" ("entityType", "entityId", "createdAt" DESC);
CREATE INDEX "idx_audit_log_user" ON "public"."AuditLog" USING "btree" ("userId", "createdAt" DESC);
CREATE INDEX "idx_billing_address_default" ON "public"."BillingAddress" USING "btree" ("userId", "isDefault") WHERE ("isDefault" = true);
CREATE INDEX "idx_billing_address_user" ON "public"."BillingAddress" USING "btree" ("userId");
CREATE INDEX "idx_certification_profileid" ON "public"."Certification" USING "btree" ("profileId");
CREATE INDEX "idx_contract_clientid" ON "public"."Contract" USING "btree" ("clientId");
CREATE INDEX "idx_contract_freelancerid" ON "public"."Contract" USING "btree" ("freelancerId");
CREATE INDEX "idx_document_userid" ON "public"."Document" USING "btree" ("userId");
CREATE INDEX "idx_educationitem_profileid" ON "public"."EducationItem" USING "btree" ("profileId");
CREATE INDEX "idx_experienceitem_profileid" ON "public"."ExperienceItem" USING "btree" ("profileId");
CREATE INDEX "idx_fraud_flag_severity" ON "public"."FraudFlag" USING "btree" ("severity" DESC) WHERE ("severity" >= 7);
CREATE INDEX "idx_fraud_flag_status_pending" ON "public"."FraudFlag" USING "btree" ("status") WHERE ("status" = 'PENDING'::"text");
COMMENT ON INDEX "public"."idx_fraud_flag_status_pending" IS 'Partial index for fast pending fraud flag queries in admin dashboard';
CREATE INDEX "idx_fraud_flag_type" ON "public"."FraudFlag" USING "btree" ("flagType") WHERE ("flagType" IS NOT NULL);
CREATE INDEX "idx_fraud_flag_user_created" ON "public"."FraudFlag" USING "btree" ("userId", "createdAt" DESC);
CREATE INDEX "idx_fraudflag_userid" ON "public"."FraudFlag" USING "btree" ("userId");
CREATE INDEX "idx_freelancer_score_job" ON "public"."FreelancerScore" USING "btree" ("jobId", "totalScore" DESC);
CREATE INDEX "idx_invoice_clientid" ON "public"."Invoice" USING "btree" ("clientId");
CREATE INDEX "idx_invoice_contractid" ON "public"."Invoice" USING "btree" ("contractId");
CREATE INDEX "idx_job_clientid" ON "public"."Job" USING "btree" ("clientId");
CREATE INDEX "idx_job_expiresat" ON "public"."Job" USING "btree" ("expiresAt") WHERE ("expiresAt" IS NOT NULL);
CREATE INDEX "idx_job_status" ON "public"."Job" USING "btree" ("status");
CREATE INDEX "idx_message_createdat" ON "public"."Message" USING "btree" ("createdAt" DESC);
CREATE INDEX "idx_message_job_id" ON "public"."Message" USING "btree" ("jobId");
CREATE INDEX "idx_message_proposal_id" ON "public"."Message" USING "btree" ("proposalId");
CREATE INDEX "idx_message_receiverid" ON "public"."Message" USING "btree" ("receiverId");
COMMENT ON INDEX "public"."idx_message_receiverid" IS 'Improves query performance for finding messages by receiver';
CREATE INDEX "idx_message_senderid" ON "public"."Message" USING "btree" ("senderId");
CREATE INDEX "idx_milestone_contractid" ON "public"."Milestone" USING "btree" ("contractId");
CREATE INDEX "idx_milestone_status" ON "public"."Milestone" USING "btree" ("status");
CREATE INDEX "idx_milestonecomment_milestone" ON "public"."MilestoneComment" USING "btree" ("milestoneId");
CREATE INDEX "idx_milestonecomment_user" ON "public"."MilestoneComment" USING "btree" ("userId");
CREATE INDEX "idx_notification_unread" ON "public"."Notification" USING "btree" ("userId", "read") WHERE ("read" = false);
CREATE INDEX "idx_notification_userid" ON "public"."Notification" USING "btree" ("userId");
CREATE INDEX "idx_paypal_payment_billing_address" ON "public"."PayPalPayment" USING "btree" ("billingAddressId");
CREATE INDEX "idx_paypalpayment_userid" ON "public"."PayPalPayment" USING "btree" ("userId");
CREATE INDEX "idx_portfolioitem_profileid" ON "public"."PortfolioItem" USING "btree" ("profileId");
CREATE INDEX "idx_profile_ispublished" ON "public"."Profile" USING "btree" ("isPublished");
CREATE INDEX "idx_profileview_profileid" ON "public"."ProfileView" USING "btree" ("profileId");
CREATE INDEX "idx_projectactivity_client" ON "public"."ProjectActivity" USING "btree" ("clientId");
CREATE INDEX "idx_projectactivity_created" ON "public"."ProjectActivity" USING "btree" ("createdAt" DESC);
CREATE INDEX "idx_projectactivity_createdby" ON "public"."ProjectActivity" USING "btree" ("createdBy");
COMMENT ON INDEX "public"."idx_projectactivity_createdby" IS 'Improves query performance for finding activities by creator';
CREATE INDEX "idx_projectactivity_fileid" ON "public"."ProjectActivity" USING "btree" ("fileId");
CREATE INDEX "idx_projectactivity_milestone" ON "public"."ProjectActivity" USING "btree" ("milestoneId");
CREATE INDEX "idx_projectactivity_projectmilestone" ON "public"."ProjectActivity" USING "btree" ("projectMilestoneId");
CREATE INDEX "idx_projectfile_category" ON "public"."ProjectFile" USING "btree" ("category");
CREATE INDEX "idx_projectfile_client" ON "public"."ProjectFile" USING "btree" ("clientId");
CREATE INDEX "idx_projectfile_contract" ON "public"."ProjectFile" USING "btree" ("contractId");
CREATE INDEX "idx_projectfile_milestone" ON "public"."ProjectFile" USING "btree" ("milestoneId");
CREATE INDEX "idx_projectfile_projectmilestone" ON "public"."ProjectFile" USING "btree" ("projectMilestoneId");
CREATE INDEX "idx_projectfile_uploadedby" ON "public"."ProjectFile" USING "btree" ("uploadedBy");
CREATE INDEX "idx_projectmilestone_assignedto" ON "public"."ProjectMilestone" USING "btree" ("assignedTo");
CREATE INDEX "idx_projectmilestone_client" ON "public"."ProjectMilestone" USING "btree" ("clientId");
CREATE INDEX "idx_projectmilestone_contract" ON "public"."ProjectMilestone" USING "btree" ("contractId");
CREATE INDEX "idx_projectmilestone_dueDate" ON "public"."ProjectMilestone" USING "btree" ("dueDate");
CREATE INDEX "idx_projectmilestone_status" ON "public"."ProjectMilestone" USING "btree" ("status");
CREATE INDEX "idx_projectmilestonecomment_milestone" ON "public"."ProjectMilestoneComment" USING "btree" ("projectMilestoneId");
CREATE INDEX "idx_projectmilestonecomment_user" ON "public"."ProjectMilestoneComment" USING "btree" ("userId");
CREATE INDEX "idx_proposal_aiscore" ON "public"."Proposal" USING "btree" ("aiScore" DESC) WHERE ("aiScore" IS NOT NULL);
CREATE INDEX "idx_proposal_freelancerid" ON "public"."Proposal" USING "btree" ("freelancerId");
CREATE INDEX "idx_proposal_jobid" ON "public"."Proposal" USING "btree" ("jobId");
CREATE INDEX "idx_proposal_jobid_aiscore" ON "public"."Proposal" USING "btree" ("jobId", "aiScore" DESC) WHERE ("aiScore" IS NOT NULL);
CREATE INDEX "idx_proposal_status_job" ON "public"."Proposal" USING "btree" ("status", "jobId");
CREATE INDEX "idx_proposal_tracking_activity_tracking" ON "public"."ProposalTrackingActivity" USING "btree" ("trackingId", "createdAt" DESC);
CREATE INDEX "idx_proposal_tracking_client" ON "public"."ProposalTracking" USING "btree" ("clientId", "status");
CREATE INDEX "idx_proposal_tracking_freelancer" ON "public"."ProposalTracking" USING "btree" ("freelancerId");
CREATE INDEX "idx_proposal_tracking_freelancer_search" ON "public"."ProposalTracking" USING "btree" ("freelancerId", "clientId");
CREATE INDEX "idx_proposal_tracking_job" ON "public"."ProposalTracking" USING "btree" ("jobId", "status");
CREATE INDEX "idx_proposal_tracking_status_date" ON "public"."ProposalTracking" USING "btree" ("clientId", "status", "createdAt" DESC);
CREATE INDEX "idx_proposaltrackingactivity_createdby" ON "public"."ProposalTrackingActivity" USING "btree" ("createdBy");
CREATE INDEX "idx_ratelimit_window" ON "public"."ApiRateLimit" USING "btree" ("apiKeyId", "windowStart");
CREATE INDEX "idx_stripepayment_userid" ON "public"."StripePayment" USING "btree" ("userId");
CREATE UNIQUE INDEX "idx_subscription_one_active_per_user" ON "public"."Subscription" USING "btree" ("userId") WHERE ("status" = 'ACTIVE'::"text");
COMMENT ON INDEX "public"."idx_subscription_one_active_per_user" IS 'Ensures only one ACTIVE subscription exists per user at any time. Prevents price stacking bug where users are charged for both old and new subscriptions during plan changes.';
CREATE INDEX "idx_subscription_payment_method" ON "public"."Subscription" USING "btree" ("paymentMethodId") WHERE ("paymentMethodId" IS NOT NULL);
CREATE INDEX "idx_subscription_userid" ON "public"."Subscription" USING "btree" ("userId");
CREATE INDEX "idx_subscription_userid_status" ON "public"."Subscription" USING "btree" ("userId", "status");
CREATE INDEX "idx_subscriptionplanconfig_isactive" ON "public"."SubscriptionPlanConfig" USING "btree" ("isActive");
CREATE INDEX "idx_supportticket_userid" ON "public"."SupportTicket" USING "btree" ("userId");
CREATE INDEX "idx_supportticketmessage_senderid" ON "public"."SupportTicketMessage" USING "btree" ("senderId");
CREATE UNIQUE INDEX "idx_team_member_invitation_token" ON "public"."TeamMember" USING "btree" ("invitationToken") WHERE ("invitationToken" IS NOT NULL);
CREATE INDEX "idx_team_member_org_active" ON "public"."TeamMember" USING "btree" ("organizationId", "isActive") WHERE ("isActive" = true);
CREATE INDEX "idx_teammember_invitedby" ON "public"."TeamMember" USING "btree" ("invitedBy");
CREATE INDEX "idx_teammember_userid" ON "public"."TeamMember" USING "btree" ("userId");
CREATE INDEX "idx_teamrole_organizationid" ON "public"."TeamRole" USING "btree" ("organizationId");
CREATE INDEX "idx_ticketresponse_ticketid" ON "public"."TicketResponse" USING "btree" ("ticketId");
CREATE INDEX "idx_tokenlog_userid" ON "public"."TokenLog" USING "btree" ("userId");
CREATE INDEX "idx_user_client_type" ON "public"."User" USING "btree" ("clientType") WHERE ("role" = 'CLIENT'::"public"."Role");
CREATE INDEX "idx_user_email" ON "public"."User" USING "btree" ("email");
CREATE INDEX "idx_user_last_login" ON "public"."User" USING "btree" ("lastLoginAt" DESC) WHERE ("lastLoginAt" IS NOT NULL);
CREATE INDEX "idx_user_lastlogin" ON "public"."User" USING "btree" ("lastLoginAt" DESC);
CREATE INDEX "idx_user_organization" ON "public"."User" USING "btree" ("organizationId") WHERE ("organizationId" IS NOT NULL);
CREATE INDEX "idx_user_paypal_setup_token" ON "public"."User" USING "btree" ("paypalSetupTokenId") WHERE ("paypalSetupTokenId" IS NOT NULL);
CREATE INDEX "idx_user_signup_ip" ON "public"."User" USING "btree" ("signupIp") WHERE ("signupIp" IS NOT NULL);
CREATE INDEX "idx_user_trust_score" ON "public"."User" USING "btree" ("trustScore") WHERE ("trustScore" IS NOT NULL);
CREATE INDEX "idx_user_verification_deadline" ON "public"."User" USING "btree" ("verificationDeadline") WHERE (("verificationDeadline" IS NOT NULL) AND ("isVerified" = false));
CREATE INDEX "idx_user_verification_payment_status" ON "public"."User" USING "btree" ("verificationPaymentStatus") WHERE ("verificationPaymentStatus" <> 'PAID'::"text");
CREATE INDEX "idx_verification_pending_review" ON "public"."Verification" USING "btree" ("status", "createdAt") WHERE ("status" = 'PENDING'::"public"."VerificationStatus");
CREATE INDEX "idx_verification_reviewedby" ON "public"."Verification" USING "btree" ("reviewedBy");
COMMENT ON INDEX "public"."idx_verification_reviewedby" IS 'Index on reviewedBy foreign key to improve JOIN and filter performance';
CREATE INDEX "idx_verification_type_status" ON "public"."Verification" USING "btree" ("verificationType", "status");
CREATE INDEX "idx_verification_user_type" ON "public"."Verification" USING "btree" ("userId", "verificationType");
CREATE INDEX "idx_video_interview_platform" ON "public"."VideoInterview" USING "btree" ("platform");
CREATE INDEX "idx_video_interview_scheduled" ON "public"."VideoInterview" USING "btree" ("scheduledAt") WHERE (("status")::"text" = 'scheduled'::"text");
CREATE INDEX "idx_videointerview_clientid" ON "public"."VideoInterview" USING "btree" ("clientId");
CREATE INDEX "idx_videointerview_freelancerid" ON "public"."VideoInterview" USING "btree" ("freelancerId");
CREATE INDEX "idx_videointerview_jobid" ON "public"."VideoInterview" USING "btree" ("jobId");
COMMENT ON INDEX "public"."idx_videointerview_jobid" IS 'Improves query performance for finding video interviews by job';
CREATE INDEX "idx_videointerview_proposalid" ON "public"."VideoInterview" USING "btree" ("proposalId");
CREATE INDEX "idx_webhook_delivery_retry" ON "public"."WebhookDelivery" USING "btree" ("nextRetryAt") WHERE (("deliveredAt" IS NULL) AND ("attemptCount" < 5));
CREATE INDEX "idx_webhook_user" ON "public"."WebhookEndpoint" USING "btree" ("userId") WHERE ("isActive" = true);
CREATE INDEX "idx_webhookdelivery_endpointid" ON "public"."WebhookDelivery" USING "btree" ("endpointId");
CREATE UNIQUE INDEX "profile_slug_unique_idx" ON "public"."Profile" USING "btree" ("slug");
CREATE INDEX "user_account_manager_idx" ON "public"."User" USING "btree" ("accountManagerId");
CREATE INDEX "user_subscription_plan_idx" ON "public"."User" USING "btree" ("subscriptionPlan");
CREATE OR REPLACE TRIGGER "auto_track_new_proposals" AFTER INSERT ON "public"."Proposal" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_proposal_tracking"();
COMMENT ON TRIGGER "auto_track_new_proposals" ON "public"."Proposal" IS 'Triggers automatic creation of ProposalTracking record for CRM';
CREATE OR REPLACE TRIGGER "calculate_response_time" AFTER INSERT ON "public"."SupportTicketMessage" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_support_response_time"();
CREATE OR REPLACE TRIGGER "trigger_set_verification_deadline" BEFORE UPDATE ON "public"."User" FOR EACH ROW EXECUTE FUNCTION "public"."set_verification_deadline"();
CREATE OR REPLACE TRIGGER "update_proposal_tracking_updated_at" BEFORE UPDATE ON "public"."ProposalTracking" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_sso_configuration_updated_at" BEFORE UPDATE ON "public"."SsoConfiguration" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_support_ticket_updated_at" BEFORE UPDATE ON "public"."SupportTicket" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_team_member_updated_at" BEFORE UPDATE ON "public"."TeamMember" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_webhook_endpoint_updated_at" BEFORE UPDATE ON "public"."WebhookEndpoint" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "user_soft_deletion_audit" AFTER UPDATE OF "deletedAt" ON "public"."User" FOR EACH ROW EXECUTE FUNCTION "public"."log_user_soft_deletion"();
ALTER TABLE ONLY "public"."ApiKeyIpWhitelist"
    ADD CONSTRAINT "ApiKeyIpWhitelist_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "public"."ApiKey"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ApiKey"
    ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ApiRateLimit"
    ADD CONSTRAINT "ApiRateLimit_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "public"."ApiKey"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ApiRequestLog"
ALTER TABLE ONLY "public"."AuditLog"
ALTER TABLE ONLY "public"."BillingAddress"
    ADD CONSTRAINT "BillingAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."Certification"
    ADD CONSTRAINT "Certification_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."Contract"
    ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."Contract"
    ADD CONSTRAINT "Contract_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."Contract"
    ADD CONSTRAINT "Contract_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."Document"
    ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."EducationItem"
    ADD CONSTRAINT "EducationItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ExperienceItem"
    ADD CONSTRAINT "ExperienceItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."FraudFlag"
    ADD CONSTRAINT "FraudFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."FreelancerScore"
    ADD CONSTRAINT "FreelancerScore_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."FreelancerScore"
    ADD CONSTRAINT "FreelancerScore_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."Invoice"
    ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."Invoice"
    ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."Contract"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."Job"
    ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."Message"
ALTER TABLE ONLY "public"."Message"
ALTER TABLE ONLY "public"."Message"
    ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."Message"
    ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."MilestoneComment"
    ADD CONSTRAINT "MilestoneComment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "public"."Milestone"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."MilestoneComment"
    ADD CONSTRAINT "MilestoneComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."Milestone"
    ADD CONSTRAINT "Milestone_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."Contract"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."PayPalPayment"
ALTER TABLE ONLY "public"."PayPalPayment"
    ADD CONSTRAINT "PayPalPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."Payment"
    ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."PortfolioItem"
    ADD CONSTRAINT "PortfolioItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProfileView"
    ADD CONSTRAINT "ProfileView_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."Profile"
    ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ProjectActivity"
    ADD CONSTRAINT "ProjectActivity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProjectActivity"
    ADD CONSTRAINT "ProjectActivity_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProjectActivity"
    ADD CONSTRAINT "ProjectActivity_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."ProjectFile"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProjectActivity"
    ADD CONSTRAINT "ProjectActivity_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "public"."Milestone"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProjectActivity"
    ADD CONSTRAINT "ProjectActivity_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES "public"."ProjectMilestone"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProjectFile"
    ADD CONSTRAINT "ProjectFile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProjectFile"
ALTER TABLE ONLY "public"."ProjectFile"
ALTER TABLE ONLY "public"."ProjectFile"
ALTER TABLE ONLY "public"."ProjectFile"
    ADD CONSTRAINT "ProjectFile_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProjectMilestoneComment"
    ADD CONSTRAINT "ProjectMilestoneComment_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES "public"."ProjectMilestone"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProjectMilestoneComment"
    ADD CONSTRAINT "ProjectMilestoneComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProjectMilestone"
ALTER TABLE ONLY "public"."ProjectMilestone"
    ADD CONSTRAINT "ProjectMilestone_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProjectMilestone"
ALTER TABLE ONLY "public"."ProposalTrackingActivity"
    ADD CONSTRAINT "ProposalTrackingActivity_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProposalTrackingActivity"
    ADD CONSTRAINT "ProposalTrackingActivity_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "public"."ProposalTracking"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProposalTracking"
    ADD CONSTRAINT "ProposalTracking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProposalTracking"
    ADD CONSTRAINT "ProposalTracking_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProposalTracking"
    ADD CONSTRAINT "ProposalTracking_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ProposalTracking"
    ADD CONSTRAINT "ProposalTracking_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."Proposal"
    ADD CONSTRAINT "Proposal_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."Proposal"
    ADD CONSTRAINT "Proposal_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."SsoConfiguration"
    ADD CONSTRAINT "SsoConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."StripePayment"
    ADD CONSTRAINT "StripePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."Subscription"
    ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."SupportTicketMessage"
    ADD CONSTRAINT "SupportTicketMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."SupportTicketMessage"
    ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."SupportTicket"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."SupportTicket"
    ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."TeamMember"
    ADD CONSTRAINT "TeamMember_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "public"."User"("id");
ALTER TABLE ONLY "public"."TeamMember"
    ADD CONSTRAINT "TeamMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."TeamMember"
    ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."TeamRole"
    ADD CONSTRAINT "TeamRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."TicketResponse"
    ADD CONSTRAINT "TicketResponse_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."SupportTicket"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."TokenLog"
    ADD CONSTRAINT "TokenLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "public"."User"("id");
ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."User"("id");
ALTER TABLE ONLY "public"."Verification"
ALTER TABLE ONLY "public"."Verification"
    ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."VideoInterview"
    ADD CONSTRAINT "VideoInterview_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id");
ALTER TABLE ONLY "public"."VideoInterview"
    ADD CONSTRAINT "VideoInterview_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "public"."User"("id");
ALTER TABLE ONLY "public"."VideoInterview"
    ADD CONSTRAINT "VideoInterview_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."VideoInterview"
ALTER TABLE ONLY "public"."WebhookDelivery"
    ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "public"."WebhookEndpoint"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."WebhookEndpoint"
    ADD CONSTRAINT "WebhookEndpoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
CREATE POLICY "Admin can manage fraud flags" ON "public"."FraudFlag" USING ("public"."is_admin"());
CREATE POLICY "Admin can manage rate limits" ON "public"."ApiRateLimit" USING ("public"."is_admin"());
CREATE POLICY "Allow profile view tracking" ON "public"."ProfileView" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));
ALTER TABLE "public"."ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ApiKeyIpWhitelist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ApiRateLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ApiRequestLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BillingAddress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Certification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Certification select policy" ON "public"."Certification" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "Certification"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "Certification"."profileId") AND ("Profile"."isPublished" = true))))));
CREATE POLICY "Clients can create contracts" ON "public"."Contract" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId"));
CREATE POLICY "Clients can create proposal tracking" ON "public"."ProposalTracking" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId"));
COMMENT ON POLICY "Clients can create proposal tracking" ON "public"."ProposalTracking" IS 'Clients can create tracking records for proposals on their jobs';
CREATE POLICY "Clients can delete own tracked proposals" ON "public"."ProposalTracking" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId"));
CREATE POLICY "Clients can update own tracked proposals" ON "public"."ProposalTracking" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId"));
ALTER TABLE "public"."Contract" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contract parties can add milestone comments" ON "public"."ProjectMilestoneComment" FOR INSERT WITH CHECK ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId") AND (EXISTS ( SELECT 1
   FROM ("public"."ProjectMilestone" "pm"
     LEFT JOIN "public"."Contract" "c" ON (("c"."id" = "pm"."contractId")))
  WHERE (("pm"."id" = "ProjectMilestoneComment"."projectMilestoneId") AND (("c"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("c"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("pm"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))))));
CREATE POLICY "Contract parties can update contracts" ON "public"."Contract" FOR UPDATE USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId") OR ((( SELECT "auth"."uid"() AS "uid"))::"text" = "freelancerId")));
CREATE POLICY "Contract parties can view milestone comments" ON "public"."ProjectMilestoneComment" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."ProjectMilestone" "pm"
     LEFT JOIN "public"."Contract" "c" ON (("c"."id" = "pm"."contractId")))
  WHERE (("pm"."id" = "ProjectMilestoneComment"."projectMilestoneId") AND (("c"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("c"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("pm"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"())))));
COMMENT ON POLICY "Contract parties can view milestone comments" ON "public"."ProjectMilestoneComment" IS 'Users can view comments on milestones for contracts they are party to. Optimized with auth.uid() subqueries.';
CREATE POLICY "Contract select policy" ON "public"."Contract" FOR SELECT USING (((((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId") OR ((( SELECT "auth"."uid"() AS "uid"))::"text" = "freelancerId")) AND ("deletedAt" IS NULL)));
COMMENT ON POLICY "Contract select policy" ON "public"."Contract" IS 'Consolidated policy: Users can view their own non-deleted contracts';
ALTER TABLE "public"."Document" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Education select policy" ON "public"."EducationItem" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "EducationItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "EducationItem"."profileId") AND ("Profile"."isPublished" = true))))));
ALTER TABLE "public"."EducationItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Email verification token select policy" ON "public"."EmailVerificationToken" FOR SELECT USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId") OR true));
CREATE POLICY "Email verification token update policy" ON "public"."EmailVerificationToken" FOR UPDATE USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId") OR true));
ALTER TABLE "public"."EmailVerificationToken" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Experience select policy" ON "public"."ExperienceItem" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "ExperienceItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "ExperienceItem"."profileId") AND ("Profile"."isPublished" = true))))));
ALTER TABLE "public"."ExperienceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FraudFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FreelancerScore" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "FreelancerScore select policy" ON "public"."FreelancerScore" FOR SELECT USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "freelancerId") OR (EXISTS ( SELECT 1
   FROM "public"."Job"
  WHERE (("Job"."id" = "FreelancerScore"."jobId") AND ("Job"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
ALTER TABLE "public"."Invoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoice insert policy" ON "public"."Invoice" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."Contract"
  WHERE (("Contract"."id" = "Invoice"."contractId") AND (("Contract"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("Contract"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
CREATE POLICY "Invoice select policy" ON "public"."Invoice" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."Contract"
  WHERE (("Contract"."id" = "Invoice"."contractId") AND (("Contract"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("Contract"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
CREATE POLICY "Invoice update policy" ON "public"."Invoice" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."Contract"
  WHERE (("Contract"."id" = "Invoice"."contractId") AND (("Contract"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("Contract"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
ALTER TABLE "public"."Job" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Job delete policy" ON "public"."Job" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId"));
CREATE POLICY "Job insert policy" ON "public"."Job" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId"));
CREATE POLICY "Job select policy" ON "public"."Job" FOR SELECT USING (((((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId") OR (("isApproved" = true) AND ("status" = 'OPEN'::"public"."JobStatus")) OR "public"."user_has_proposal_for_job"("id", (( SELECT "auth"."uid"() AS "uid"))::"text")) AND ("deletedAt" IS NULL)));
COMMENT ON POLICY "Job select policy" ON "public"."Job" IS 'Consolidated policy: Users can view their jobs, approved open jobs, or jobs they have proposals for (non-deleted only)';
CREATE POLICY "Job update policy" ON "public"."Job" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId"));
ALTER TABLE "public"."Message" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Message insert policy" ON "public"."Message" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "senderId"));
CREATE POLICY "Message select policy" ON "public"."Message" FOR SELECT USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "senderId") OR ((( SELECT "auth"."uid"() AS "uid"))::"text" = "receiverId")));
CREATE POLICY "Message update policy" ON "public"."Message" FOR UPDATE USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "senderId") OR ((( SELECT "auth"."uid"() AS "uid"))::"text" = "receiverId")));
ALTER TABLE "public"."Milestone" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Milestone insert policy" ON "public"."Milestone" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."Contract"
  WHERE (("Contract"."id" = "Milestone"."contractId") AND (("Contract"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("Contract"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
CREATE POLICY "Milestone select policy" ON "public"."Milestone" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."Contract"
  WHERE (("Contract"."id" = "Milestone"."contractId") AND (("Contract"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("Contract"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
CREATE POLICY "Milestone update policy" ON "public"."Milestone" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."Contract"
  WHERE (("Contract"."id" = "Milestone"."contractId") AND (("Contract"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("Contract"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
ALTER TABLE "public"."MilestoneComment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MilestoneComment insert policy" ON "public"."MilestoneComment" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."Milestone"
     JOIN "public"."Contract" ON (("Contract"."id" = "Milestone"."contractId")))
  WHERE (("Milestone"."id" = "MilestoneComment"."milestoneId") AND (("Contract"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("Contract"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
CREATE POLICY "MilestoneComment select policy" ON "public"."MilestoneComment" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."Milestone"
     JOIN "public"."Contract" ON (("Contract"."id" = "Milestone"."contractId")))
  WHERE (("Milestone"."id" = "MilestoneComment"."milestoneId") AND (("Contract"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("Contract"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
ALTER TABLE "public"."Notification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notification select policy" ON "public"."Notification" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Notification update policy" ON "public"."Notification" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Organization owners can manage SSO config" ON "public"."SsoConfiguration" USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "organizationId") OR "public"."is_admin"()));
COMMENT ON POLICY "Organization owners can manage SSO config" ON "public"."SsoConfiguration" IS 'Organization owners can view and manage their SSO configuration. Uses subquery for auth.uid() for better performance.';
ALTER TABLE "public"."PayPalPayment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PayPalPayment insert policy" ON "public"."PayPalPayment" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "PayPalPayment select policy" ON "public"."PayPalPayment" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "PayPalPayment update policy" ON "public"."PayPalPayment" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
ALTER TABLE "public"."Payment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolio select policy" ON "public"."PortfolioItem" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "PortfolioItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "PortfolioItem"."profileId") AND ("Profile"."isPublished" = true))))));
ALTER TABLE "public"."PortfolioItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PortfolioItem delete policy" ON "public"."PortfolioItem" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "PortfolioItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "PortfolioItem insert policy" ON "public"."PortfolioItem" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "PortfolioItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "PortfolioItem update policy" ON "public"."PortfolioItem" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "PortfolioItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
ALTER TABLE "public"."Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProfileView" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProjectActivity" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ProjectActivity insert policy" ON "public"."ProjectActivity" FOR INSERT WITH CHECK ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId") OR ((( SELECT "auth"."uid"() AS "uid"))::"text" = "createdBy") OR "public"."is_admin"()));
COMMENT ON POLICY "ProjectActivity insert policy" ON "public"."ProjectActivity" IS 'Users can create activity logs for their projects';
CREATE POLICY "ProjectActivity select policy" ON "public"."ProjectActivity" FOR SELECT USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId") OR ((( SELECT "auth"."uid"() AS "uid"))::"text" = "createdBy") OR (EXISTS ( SELECT 1
   FROM "public"."Contract"
  WHERE (("Contract"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("Contract"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))) OR "public"."is_admin"()));
COMMENT ON POLICY "ProjectActivity select policy" ON "public"."ProjectActivity" IS 'Users can view activities for projects they own, created, or are involved in via contracts';
ALTER TABLE "public"."ProjectFile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ProjectFile delete policy" ON "public"."ProjectFile" FOR DELETE USING ((("clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
CREATE POLICY "ProjectFile insert policy" ON "public"."ProjectFile" FOR INSERT WITH CHECK ((("clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
CREATE POLICY "ProjectFile select policy" ON "public"."ProjectFile" FOR SELECT USING ((("clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("uploadedBy" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
CREATE POLICY "ProjectFile update policy" ON "public"."ProjectFile" FOR UPDATE USING ((("clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
ALTER TABLE "public"."ProjectMilestone" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ProjectMilestone delete policy" ON "public"."ProjectMilestone" FOR DELETE USING ((("clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
CREATE POLICY "ProjectMilestone insert policy" ON "public"."ProjectMilestone" FOR INSERT WITH CHECK ((("clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
CREATE POLICY "ProjectMilestone select policy" ON "public"."ProjectMilestone" FOR SELECT USING ((("clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("assignedTo" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
CREATE POLICY "ProjectMilestone update policy" ON "public"."ProjectMilestone" FOR UPDATE USING ((("clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
ALTER TABLE "public"."ProjectMilestoneComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Proposal" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Proposal insert policy" ON "public"."Proposal" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "freelancerId"));
CREATE POLICY "Proposal select policy" ON "public"."Proposal" FOR SELECT USING (((((( SELECT "auth"."uid"() AS "uid"))::"text" = "freelancerId") OR (EXISTS ( SELECT 1
   FROM "public"."Job"
  WHERE (("Job"."id" = "Proposal"."jobId") AND ("Job"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))) AND ("deletedAt" IS NULL)));
COMMENT ON POLICY "Proposal select policy" ON "public"."Proposal" IS 'Consolidated policy: Freelancers can view their proposals, job owners can view proposals for their jobs (non-deleted only)';
CREATE POLICY "Proposal update policy" ON "public"."Proposal" FOR UPDATE USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "freelancerId") OR (EXISTS ( SELECT 1
   FROM "public"."Job"
  WHERE (("Job"."id" = "Proposal"."jobId") AND ("Job"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
ALTER TABLE "public"."ProposalTracking" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ProposalTracking select policy" ON "public"."ProposalTracking" FOR SELECT USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId") OR ((( SELECT "auth"."uid"() AS "uid"))::"text" = "freelancerId") OR "public"."is_admin"()));
COMMENT ON POLICY "ProposalTracking select policy" ON "public"."ProposalTracking" IS 'Consolidated policy: Users can view proposals they created or received. Replaces multiple permissive policies.';
ALTER TABLE "public"."ProposalTrackingActivity" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ProposalTrackingActivity select policy" ON "public"."ProposalTrackingActivity" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."ProposalTracking" "pt"
  WHERE (("pt"."id" = "ProposalTrackingActivity"."trackingId") AND (("pt"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("pt"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))) OR "public"."is_admin"()));
COMMENT ON POLICY "ProposalTrackingActivity select policy" ON "public"."ProposalTrackingActivity" IS 'Consolidated policy: Users can view activity for their proposal tracking. Replaces multiple permissive policies.';
CREATE POLICY "Public can view subscription plans" ON "public"."SubscriptionPlanConfig" FOR SELECT USING (("isActive" = true));
CREATE POLICY "Public can view token purchase plans" ON "public"."TokenPurchasePlan" FOR SELECT USING (("isActive" = true));
ALTER TABLE "public"."SsoConfiguration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StripePayment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "StripePayment insert policy" ON "public"."StripePayment" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "StripePayment select policy" ON "public"."StripePayment" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "StripePayment update policy" ON "public"."StripePayment" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
ALTER TABLE "public"."Subscription" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subscription insert policy" ON "public"."Subscription" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Subscription select policy" ON "public"."Subscription" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Subscription update policy" ON "public"."Subscription" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
ALTER TABLE "public"."SubscriptionPlanConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SupportTicket" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SupportTicket insert policy" ON "public"."SupportTicket" FOR INSERT WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") IS NULL) OR ((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId")));
COMMENT ON POLICY "SupportTicket insert policy" ON "public"."SupportTicket" IS 'Service role or users can create their own tickets';
CREATE POLICY "SupportTicket select policy" ON "public"."SupportTicket" FOR SELECT USING (((( SELECT "auth"."jwt"() AS "jwt") IS NULL) OR ((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId") OR "public"."is_admin"()));
COMMENT ON POLICY "SupportTicket select policy" ON "public"."SupportTicket" IS 'Service role, ticket owner, or admins can view tickets';
CREATE POLICY "SupportTicket update policy" ON "public"."SupportTicket" FOR UPDATE USING (((( SELECT "auth"."jwt"() AS "jwt") IS NULL) OR (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId") AND ("status" = ANY (ARRAY['OPEN'::"text", 'IN_PROGRESS'::"text", 'open'::"text", 'in-progress'::"text"]))) OR "public"."is_admin"()));
COMMENT ON POLICY "SupportTicket update policy" ON "public"."SupportTicket" IS 'Service role, ticket owner (if open/in-progress), or admins can update tickets';
ALTER TABLE "public"."SupportTicketMessage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SupportTicketMessage insert policy" ON "public"."SupportTicketMessage" FOR INSERT WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") IS NULL) OR ((EXISTS ( SELECT 1
   FROM "public"."SupportTicket"
  WHERE (("SupportTicket"."id" = "SupportTicketMessage"."ticketId") AND ("SupportTicket"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))) AND ("senderId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))));
COMMENT ON POLICY "SupportTicketMessage insert policy" ON "public"."SupportTicketMessage" IS 'Service role or ticket owner can create messages';
CREATE POLICY "SupportTicketMessage select policy" ON "public"."SupportTicketMessage" FOR SELECT USING (((( SELECT "auth"."jwt"() AS "jwt") IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."SupportTicket"
  WHERE (("SupportTicket"."id" = "SupportTicketMessage"."ticketId") AND ("SupportTicket"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
COMMENT ON POLICY "SupportTicketMessage select policy" ON "public"."SupportTicketMessage" IS 'Service role or ticket owner can view messages';
ALTER TABLE "public"."TeamMember" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TeamMember delete policy" ON "public"."TeamMember" FOR DELETE USING ((("organizationId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
CREATE POLICY "TeamMember insert policy" ON "public"."TeamMember" FOR INSERT WITH CHECK ((("organizationId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
CREATE POLICY "TeamMember select policy" ON "public"."TeamMember" FOR SELECT USING ((("organizationId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("userId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
CREATE POLICY "TeamMember update policy" ON "public"."TeamMember" FOR UPDATE USING ((("organizationId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR "public"."is_admin"()));
ALTER TABLE "public"."TeamRole" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TeamRole manage policy" ON "public"."TeamRole" USING ((EXISTS ( SELECT 1
   FROM "public"."TeamMember"
  WHERE (("TeamMember"."organizationId" = "TeamRole"."organizationId") AND ("TeamMember"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (("TeamMember"."role")::"text" = 'OWNER'::"text")))));
ALTER TABLE "public"."TicketResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TokenLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TokenLog insert policy" ON "public"."TokenLog" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "TokenLog select policy" ON "public"."TokenLog" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
ALTER TABLE "public"."TokenPurchasePlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create API keys" ON "public"."ApiKey" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Users can create own billing addresses" ON "public"."BillingAddress" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
COMMENT ON POLICY "Users can create own billing addresses" ON "public"."BillingAddress" IS 'Users can only create billing addresses for themselves';
CREATE POLICY "Users can create own verification tokens" ON "public"."EmailVerificationToken" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Users can delete own API keys" ON "public"."ApiKey" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Users can delete own billing addresses" ON "public"."BillingAddress" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
COMMENT ON POLICY "Users can delete own billing addresses" ON "public"."BillingAddress" IS 'Users can only delete their own billing addresses';
CREATE POLICY "Users can delete own certifications" ON "public"."Certification" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "Certification"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "Users can delete own education" ON "public"."EducationItem" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "EducationItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "Users can delete their own comments" ON "public"."ProjectMilestoneComment" FOR DELETE USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId") OR "public"."is_admin"()));
CREATE POLICY "Users can insert own certifications" ON "public"."Certification" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "Certification"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "Users can insert own education" ON "public"."EducationItem" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "EducationItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "Users can manage IP whitelist for own API keys" ON "public"."ApiKeyIpWhitelist" USING ((EXISTS ( SELECT 1
   FROM "public"."ApiKey"
  WHERE (("ApiKey"."id" = "ApiKeyIpWhitelist"."apiKeyId") AND ("ApiKey"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "Users can respond to own tickets" ON "public"."TicketResponse" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."SupportTicket"
  WHERE (("SupportTicket"."id" = "TicketResponse"."ticketId") AND ("SupportTicket"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "Users can update own API keys" ON "public"."ApiKey" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Users can update own billing addresses" ON "public"."BillingAddress" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId")) WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
COMMENT ON POLICY "Users can update own billing addresses" ON "public"."BillingAddress" IS 'Users can only update their own billing addresses';
CREATE POLICY "Users can update own certifications" ON "public"."Certification" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "Certification"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "Users can update own education" ON "public"."EducationItem" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "EducationItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "Users can update own lastLoginAt" ON "public"."User" FOR UPDATE USING (("id" = (( SELECT "auth"."uid"() AS "uid"))::"text")) WITH CHECK (("id" = (( SELECT "auth"."uid"() AS "uid"))::"text"));
COMMENT ON POLICY "Users can update own lastLoginAt" ON "public"."User" IS 'Optimized: Uses (select auth.uid()) to prevent re-evaluation per row';
CREATE POLICY "Users can update their own comments" ON "public"."ProjectMilestoneComment" FOR UPDATE USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId") OR "public"."is_admin"()));
CREATE POLICY "Users can view logs for own API keys" ON "public"."ApiRequestLog" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ApiKey"
  WHERE (("ApiKey"."id" = "ApiRequestLog"."apiKeyId") AND ("ApiKey"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "Users can view own API keys" ON "public"."ApiKey" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Users can view own audit logs" ON "public"."AuditLog" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Users can view own billing addresses" ON "public"."BillingAddress" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
COMMENT ON POLICY "Users can view own billing addresses" ON "public"."BillingAddress" IS 'Users can only view their own billing addresses';
CREATE POLICY "Users can view own payments" ON "public"."Payment" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."Invoice"
     JOIN "public"."Contract" ON (("Contract"."id" = "Invoice"."contractId")))
  WHERE (("Invoice"."id" = "Payment"."invoiceId") AND (("Contract"."clientId" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("Contract"."freelancerId" = (( SELECT "auth"."uid"() AS "uid"))::"text"))))));
CREATE POLICY "Users can view own profile views" ON "public"."ProfileView" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "ProfileView"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "Users can view own record" ON "public"."User" FOR SELECT USING (("id" = (( SELECT "auth"."uid"() AS "uid"))::"text"));
COMMENT ON POLICY "Users can view own record" ON "public"."User" IS 'Optimized: Uses (select auth.uid()) to prevent re-evaluation per row';
CREATE POLICY "Users can view ticket responses" ON "public"."TicketResponse" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."SupportTicket"
  WHERE (("SupportTicket"."id" = "TicketResponse"."ticketId") AND ("SupportTicket"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
ALTER TABLE "public"."Verification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verification insert policy" ON "public"."Verification" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Verification select policy" ON "public"."Verification" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "Verification update policy" ON "public"."Verification" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
ALTER TABLE "public"."VideoInterview" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "VideoInterview insert policy" ON "public"."VideoInterview" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId"));
CREATE POLICY "VideoInterview select policy" ON "public"."VideoInterview" FOR SELECT USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId") OR ((( SELECT "auth"."uid"() AS "uid"))::"text" = "freelancerId")));
CREATE POLICY "VideoInterview update policy" ON "public"."VideoInterview" FOR UPDATE USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "clientId") OR ((( SELECT "auth"."uid"() AS "uid"))::"text" = "freelancerId")));
ALTER TABLE "public"."WebhookDelivery" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WebhookDelivery select policy" ON "public"."WebhookDelivery" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."WebhookEndpoint"
  WHERE (("WebhookEndpoint"."id" = "WebhookDelivery"."endpointId") AND ("WebhookEndpoint"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
ALTER TABLE "public"."WebhookEndpoint" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WebhookEndpoint manage policy" ON "public"."WebhookEndpoint" USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_delete_policy" ON "public"."Document" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "document_insert_policy" ON "public"."Document" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "document_select_policy" ON "public"."Document" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "document_update_policy" ON "public"."Document" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "experience_delete_policy" ON "public"."ExperienceItem" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "ExperienceItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "experience_insert_policy" ON "public"."ExperienceItem" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "ExperienceItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "experience_update_policy" ON "public"."ExperienceItem" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."Profile"
  WHERE (("Profile"."id" = "ExperienceItem"."profileId") AND ("Profile"."userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")))));
CREATE POLICY "profile_delete_policy" ON "public"."Profile" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "profile_insert_policy" ON "public"."Profile" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
CREATE POLICY "profile_select_policy" ON "public"."Profile" FOR SELECT USING ((((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId") OR ("isPublished" = true)));
CREATE POLICY "profile_update_policy" ON "public"."Profile" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "userId"));
REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";
GRANT ALL ON FUNCTION "public"."auto_create_proposal_tracking"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_proposal_tracking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_proposal_tracking"() TO "service_role";
GRANT ALL ON FUNCTION "public"."calculate_support_response_time"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_support_response_time"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_support_response_time"() TO "service_role";
GRANT ALL ON FUNCTION "public"."find_duplicate_active_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."find_duplicate_active_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_duplicate_active_subscriptions"() TO "service_role";
GRANT ALL ON FUNCTION "public"."fix_duplicate_active_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."fix_duplicate_active_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_duplicate_active_subscriptions"() TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_active_subscription"("user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_subscription"("user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_subscription"("user_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_job_owner"("job_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_job_owner"("job_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_job_owner"("job_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_job_priority_weight"("placement" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_job_priority_weight"("placement" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_job_priority_weight"("placement" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_verification_progress"("user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_verification_progress"("user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_verification_progress"("user_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_verification_progress"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_verification_progress"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_verification_progress"("user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_verification_overdue"("user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_verification_overdue"("user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_verification_overdue"("user_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_verification_overdue"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_verification_overdue"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_verification_overdue"("user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_user_soft_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_user_soft_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_user_soft_deletion"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_verification_deadline"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_verification_deadline"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_verification_deadline"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
GRANT ALL ON FUNCTION "public"."user_has_proposal_for_job"("job_id" "text", "user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_proposal_for_job"("job_id" "text", "user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_proposal_for_job"("job_id" "text", "user_id" "text") TO "service_role";
GRANT ALL ON TABLE "public"."ApiKey" TO "anon";
GRANT ALL ON TABLE "public"."ApiKey" TO "authenticated";
GRANT ALL ON TABLE "public"."ApiKey" TO "service_role";
GRANT ALL ON TABLE "public"."ApiKeyIpWhitelist" TO "anon";
GRANT ALL ON TABLE "public"."ApiKeyIpWhitelist" TO "authenticated";
GRANT ALL ON TABLE "public"."ApiKeyIpWhitelist" TO "service_role";
GRANT ALL ON TABLE "public"."ApiRateLimit" TO "anon";
GRANT ALL ON TABLE "public"."ApiRateLimit" TO "authenticated";
GRANT ALL ON TABLE "public"."ApiRateLimit" TO "service_role";
GRANT ALL ON TABLE "public"."ApiRequestLog" TO "anon";
GRANT ALL ON TABLE "public"."ApiRequestLog" TO "authenticated";
GRANT ALL ON TABLE "public"."ApiRequestLog" TO "service_role";
GRANT ALL ON TABLE "public"."AuditLog" TO "anon";
GRANT ALL ON TABLE "public"."AuditLog" TO "authenticated";
GRANT ALL ON TABLE "public"."AuditLog" TO "service_role";
GRANT ALL ON TABLE "public"."BillingAddress" TO "anon";
GRANT ALL ON TABLE "public"."BillingAddress" TO "authenticated";
GRANT ALL ON TABLE "public"."BillingAddress" TO "service_role";
GRANT ALL ON TABLE "public"."Certification" TO "anon";
GRANT ALL ON TABLE "public"."Certification" TO "authenticated";
GRANT ALL ON TABLE "public"."Certification" TO "service_role";
GRANT ALL ON TABLE "public"."Contract" TO "anon";
GRANT ALL ON TABLE "public"."Contract" TO "authenticated";
GRANT ALL ON TABLE "public"."Contract" TO "service_role";
GRANT ALL ON TABLE "public"."Document" TO "anon";
GRANT ALL ON TABLE "public"."Document" TO "authenticated";
GRANT ALL ON TABLE "public"."Document" TO "service_role";
GRANT ALL ON TABLE "public"."EducationItem" TO "anon";
GRANT ALL ON TABLE "public"."EducationItem" TO "authenticated";
GRANT ALL ON TABLE "public"."EducationItem" TO "service_role";
GRANT ALL ON TABLE "public"."EmailVerificationToken" TO "anon";
GRANT ALL ON TABLE "public"."EmailVerificationToken" TO "authenticated";
GRANT ALL ON TABLE "public"."EmailVerificationToken" TO "service_role";
GRANT ALL ON TABLE "public"."ExperienceItem" TO "anon";
GRANT ALL ON TABLE "public"."ExperienceItem" TO "authenticated";
GRANT ALL ON TABLE "public"."ExperienceItem" TO "service_role";
GRANT ALL ON TABLE "public"."FraudFlag" TO "anon";
GRANT ALL ON TABLE "public"."FraudFlag" TO "authenticated";
GRANT ALL ON TABLE "public"."FraudFlag" TO "service_role";
GRANT ALL ON TABLE "public"."FreelancerScore" TO "anon";
GRANT ALL ON TABLE "public"."FreelancerScore" TO "authenticated";
GRANT ALL ON TABLE "public"."FreelancerScore" TO "service_role";
GRANT ALL ON TABLE "public"."Invoice" TO "anon";
GRANT ALL ON TABLE "public"."Invoice" TO "authenticated";
GRANT ALL ON TABLE "public"."Invoice" TO "service_role";
GRANT ALL ON TABLE "public"."Job" TO "anon";
GRANT ALL ON TABLE "public"."Job" TO "authenticated";
GRANT ALL ON TABLE "public"."Job" TO "service_role";
GRANT ALL ON TABLE "public"."Message" TO "anon";
GRANT ALL ON TABLE "public"."Message" TO "authenticated";
GRANT ALL ON TABLE "public"."Message" TO "service_role";
GRANT ALL ON TABLE "public"."Milestone" TO "anon";
GRANT ALL ON TABLE "public"."Milestone" TO "authenticated";
GRANT ALL ON TABLE "public"."Milestone" TO "service_role";
GRANT ALL ON TABLE "public"."MilestoneComment" TO "anon";
GRANT ALL ON TABLE "public"."MilestoneComment" TO "authenticated";
GRANT ALL ON TABLE "public"."MilestoneComment" TO "service_role";
GRANT ALL ON TABLE "public"."Notification" TO "anon";
GRANT ALL ON TABLE "public"."Notification" TO "authenticated";
GRANT ALL ON TABLE "public"."Notification" TO "service_role";
GRANT ALL ON TABLE "public"."PayPalPayment" TO "anon";
GRANT ALL ON TABLE "public"."PayPalPayment" TO "authenticated";
GRANT ALL ON TABLE "public"."PayPalPayment" TO "service_role";
GRANT ALL ON TABLE "public"."Payment" TO "anon";
GRANT ALL ON TABLE "public"."Payment" TO "authenticated";
GRANT ALL ON TABLE "public"."Payment" TO "service_role";
GRANT ALL ON TABLE "public"."PortfolioItem" TO "anon";
GRANT ALL ON TABLE "public"."PortfolioItem" TO "authenticated";
GRANT ALL ON TABLE "public"."PortfolioItem" TO "service_role";
GRANT ALL ON TABLE "public"."Profile" TO "anon";
GRANT ALL ON TABLE "public"."Profile" TO "authenticated";
GRANT ALL ON TABLE "public"."Profile" TO "service_role";
GRANT ALL ON TABLE "public"."ProfileView" TO "anon";
GRANT ALL ON TABLE "public"."ProfileView" TO "authenticated";
GRANT ALL ON TABLE "public"."ProfileView" TO "service_role";
GRANT ALL ON TABLE "public"."ProjectActivity" TO "anon";
GRANT ALL ON TABLE "public"."ProjectActivity" TO "authenticated";
GRANT ALL ON TABLE "public"."ProjectActivity" TO "service_role";
GRANT ALL ON TABLE "public"."ProjectFile" TO "anon";
GRANT ALL ON TABLE "public"."ProjectFile" TO "authenticated";
GRANT ALL ON TABLE "public"."ProjectFile" TO "service_role";
GRANT ALL ON TABLE "public"."ProjectMilestone" TO "anon";
GRANT ALL ON TABLE "public"."ProjectMilestone" TO "authenticated";
GRANT ALL ON TABLE "public"."ProjectMilestone" TO "service_role";
GRANT ALL ON TABLE "public"."ProjectMilestoneComment" TO "anon";
GRANT ALL ON TABLE "public"."ProjectMilestoneComment" TO "authenticated";
GRANT ALL ON TABLE "public"."ProjectMilestoneComment" TO "service_role";
GRANT ALL ON TABLE "public"."Proposal" TO "anon";
GRANT ALL ON TABLE "public"."Proposal" TO "authenticated";
GRANT ALL ON TABLE "public"."Proposal" TO "service_role";
GRANT ALL ON TABLE "public"."ProposalTracking" TO "anon";
GRANT ALL ON TABLE "public"."ProposalTracking" TO "authenticated";
GRANT ALL ON TABLE "public"."ProposalTracking" TO "service_role";
GRANT ALL ON TABLE "public"."ProposalTrackingActivity" TO "anon";
GRANT ALL ON TABLE "public"."ProposalTrackingActivity" TO "authenticated";
GRANT ALL ON TABLE "public"."ProposalTrackingActivity" TO "service_role";
GRANT ALL ON TABLE "public"."SsoConfiguration" TO "anon";
GRANT ALL ON TABLE "public"."SsoConfiguration" TO "authenticated";
GRANT ALL ON TABLE "public"."SsoConfiguration" TO "service_role";
GRANT ALL ON TABLE "public"."StripePayment" TO "anon";
GRANT ALL ON TABLE "public"."StripePayment" TO "authenticated";
GRANT ALL ON TABLE "public"."StripePayment" TO "service_role";
GRANT ALL ON TABLE "public"."Subscription" TO "anon";
GRANT ALL ON TABLE "public"."Subscription" TO "authenticated";
GRANT ALL ON TABLE "public"."Subscription" TO "service_role";
GRANT ALL ON TABLE "public"."SubscriptionPlanConfig" TO "anon";
GRANT ALL ON TABLE "public"."SubscriptionPlanConfig" TO "authenticated";
GRANT ALL ON TABLE "public"."SubscriptionPlanConfig" TO "service_role";
GRANT ALL ON TABLE "public"."SupportTicket" TO "anon";
GRANT ALL ON TABLE "public"."SupportTicket" TO "authenticated";
GRANT ALL ON TABLE "public"."SupportTicket" TO "service_role";
GRANT ALL ON TABLE "public"."SupportTicketMessage" TO "anon";
GRANT ALL ON TABLE "public"."SupportTicketMessage" TO "authenticated";
GRANT ALL ON TABLE "public"."SupportTicketMessage" TO "service_role";
GRANT ALL ON TABLE "public"."TeamMember" TO "anon";
GRANT ALL ON TABLE "public"."TeamMember" TO "authenticated";
GRANT ALL ON TABLE "public"."TeamMember" TO "service_role";
GRANT ALL ON TABLE "public"."TeamRole" TO "anon";
GRANT ALL ON TABLE "public"."TeamRole" TO "authenticated";
GRANT ALL ON TABLE "public"."TeamRole" TO "service_role";
GRANT ALL ON TABLE "public"."TicketResponse" TO "anon";
GRANT ALL ON TABLE "public"."TicketResponse" TO "authenticated";
GRANT ALL ON TABLE "public"."TicketResponse" TO "service_role";
GRANT ALL ON TABLE "public"."TokenLog" TO "anon";
GRANT ALL ON TABLE "public"."TokenLog" TO "authenticated";
GRANT ALL ON TABLE "public"."TokenLog" TO "service_role";
GRANT ALL ON TABLE "public"."TokenPurchasePlan" TO "anon";
GRANT ALL ON TABLE "public"."TokenPurchasePlan" TO "authenticated";
GRANT ALL ON TABLE "public"."TokenPurchasePlan" TO "service_role";
GRANT ALL ON TABLE "public"."User" TO "anon";
GRANT ALL ON TABLE "public"."User" TO "authenticated";
GRANT ALL ON TABLE "public"."User" TO "service_role";
GRANT ALL ON TABLE "public"."Verification" TO "anon";
GRANT ALL ON TABLE "public"."Verification" TO "authenticated";
GRANT ALL ON TABLE "public"."Verification" TO "service_role";
GRANT ALL ON TABLE "public"."VideoInterview" TO "anon";
GRANT ALL ON TABLE "public"."VideoInterview" TO "authenticated";
GRANT ALL ON TABLE "public"."VideoInterview" TO "service_role";
GRANT ALL ON TABLE "public"."WebhookDelivery" TO "anon";
GRANT ALL ON TABLE "public"."WebhookDelivery" TO "authenticated";
GRANT ALL ON TABLE "public"."WebhookDelivery" TO "service_role";
GRANT ALL ON TABLE "public"."WebhookEndpoint" TO "anon";
GRANT ALL ON TABLE "public"."WebhookEndpoint" TO "authenticated";
GRANT ALL ON TABLE "public"."WebhookEndpoint" TO "service_role";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "anon";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "service_role";
GRANT ALL ON SEQUENCE "public"."support_ticket_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."support_ticket_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."support_ticket_number_seq" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
A new version of Supabase CLI is available: v2.72.7 (currently installed v2.58.5)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli

-- ============================================================================
-- End of initial migration
-- ============================================================================
