-- Eventra-only schema snapshot from source project lmcabtwbtoacylajrpno
-- Generated 2026-08-12; contains no Pomelo tables or data.
BEGIN;
SET check_function_bodies = false;

CREATE TYPE "public"."email_block_type" AS ENUM (
    'opening',
    'event_context',
    'value_prop',
    'proof',
    'cta',
    'signature'
);


ALTER TYPE "public"."email_block_type" OWNER TO "postgres";


CREATE TYPE "public"."email_cta_type" AS ENUM (
    'book_call',
    'reply',
    'download',
    'visit_page'
);


ALTER TYPE "public"."email_cta_type" OWNER TO "postgres";


CREATE TYPE "public"."email_template_category" AS ENUM (
    'follow_up',
    'warm_up',
    'product_info'
);


ALTER TYPE "public"."email_template_category" OWNER TO "postgres";


CREATE TYPE "public"."email_template_goal" AS ENUM (
    'book_meeting',
    'share_info',
    'reengage',
    'qualify'
);


ALTER TYPE "public"."email_template_goal" OWNER TO "postgres";


CREATE TYPE "public"."email_template_language" AS ENUM (
    'en',
    'zh',
    'bilingual'
);


ALTER TYPE "public"."email_template_language" OWNER TO "postgres";


CREATE TYPE "public"."email_template_status" AS ENUM (
    'active',
    'disabled',
    'archived'
);


ALTER TYPE "public"."email_template_status" OWNER TO "postgres";


CREATE TYPE "public"."email_template_tone" AS ENUM (
    'professional',
    'friendly',
    'concise',
    'technical'
);


ALTER TYPE "public"."email_template_tone" OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    -- Try to get name from metadata, fallback to email
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating user profile: %', SQLERRM;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_company_intelligence_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_company_intelligence_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';
--
-- PostgreSQL database dump
--

-- \restrict LLqwrbTGvM69Np3wfa0tLdI7jy114nRqlhNgy89PbRhexRWFcTqXG5Crqksr3T6

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."assets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "filename" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_size" integer,
    "mime_type" "text",
    "event_id" "uuid",
    "task_id" "uuid",
    "uploaded_by" "uuid",
    "title" "text",
    "description" "text",
    "tags" "text"[],
    "is_new" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."assets" OWNER TO "postgres";

--
-- Name: company_intelligence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."company_intelligence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_description" "text",
    "core_products" "jsonb" DEFAULT '[]'::"jsonb",
    "target_industries" "jsonb" DEFAULT '[]'::"jsonb",
    "company_stage" "text",
    "compliance_requirements" "jsonb" DEFAULT '[]'::"jsonb",
    "primary_market" "text",
    "primary_business_goal" "text",
    "icp_data" "jsonb" DEFAULT '{}'::"jsonb",
    "typical_deal_size" "jsonb" DEFAULT '{}'::"jsonb",
    "sales_cycle_length" "text",
    "key_differentiators" "jsonb" DEFAULT '[]'::"jsonb",
    "strategic_notes" "text",
    "followup_style" "text",
    "risk_tolerance" "text",
    "ai_behaviors" "jsonb" DEFAULT '[]'::"jsonb",
    "tone_preference" "text",
    "is_draft" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "typical_deal_size_min" integer,
    "typical_deal_size_max" integer,
    "ai_strategic_notes" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."company_intelligence" OWNER TO "postgres";

--
-- Name: email_template_blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."email_template_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "block_type" "public"."email_block_type" NOT NULL,
    "sort_order" integer DEFAULT 1 NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "allowed_vars" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "ai_guidance" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_template_blocks" OWNER TO "postgres";

--
-- Name: email_template_ctas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."email_template_ctas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "cta_type" "public"."email_cta_type" DEFAULT 'reply'::"public"."email_cta_type" NOT NULL,
    "cta_text" "text" DEFAULT 'Reply to this email'::"text" NOT NULL,
    "cta_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_template_ctas" OWNER TO "postgres";

--
-- Name: email_template_subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."email_template_subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 1 NOT NULL,
    "subject" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_template_subjects" OWNER TO "postgres";

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid",
    "name" "text" NOT NULL,
    "category" "public"."email_template_category" NOT NULL,
    "goal" "public"."email_template_goal" NOT NULL,
    "tone" "public"."email_template_tone" DEFAULT 'professional'::"public"."email_template_tone" NOT NULL,
    "language" "public"."email_template_language" DEFAULT 'en'::"public"."email_template_language" NOT NULL,
    "status" "public"."email_template_status" DEFAULT 'active'::"public"."email_template_status" NOT NULL,
    "personas" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "updated_by" "uuid",
    "version" integer DEFAULT 1 NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "max_words" integer,
    "forbidden_claims" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";

--
-- Name: event_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."event_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "filename" character varying(500) NOT NULL,
    "file_type" character varying(100),
    "file_url" character varying(1000) NOT NULL,
    "file_size" bigint,
    "mime_type" character varying(100),
    "version" integer DEFAULT 1,
    "is_latest_version" boolean DEFAULT true,
    "uploaded_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "is_synthetic" boolean DEFAULT false
);


ALTER TABLE "public"."event_assets" OWNER TO "postgres";

--
-- Name: event_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."event_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "author_email" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_comments" OWNER TO "postgres";

--
-- Name: event_discovery_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."event_discovery_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" DEFAULT 'NEW'::"text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "event_data" "jsonb" NOT NULL,
    "existing_event_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    CONSTRAINT "event_discovery_queue_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'APPROVED'::"text", 'REJECTED'::"text"]))),
    CONSTRAINT "event_discovery_queue_type_check" CHECK (("type" = ANY (ARRAY['NEW'::"text", 'DUPLICATE'::"text", 'UPDATE'::"text"])))
);


ALTER TABLE "public"."event_discovery_queue" OWNER TO "postgres";

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(500) NOT NULL,
    "event_type" character varying(100) NOT NULL,
    "status" character varying(50) DEFAULT 'planning'::character varying NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "location" character varying(500),
    "venue" character varying(500),
    "industry" character varying(100),
    "goal_statement" "text",
    "target_audience" "text",
    "core_message" "text",
    "primary_offering" "text",
    "key_cta" "text",
    "total_budget" numeric(12,2),
    "budget_breakdown" "jsonb",
    "target_leads" integer,
    "actual_leads" integer DEFAULT 0,
    "target_revenue" numeric(12,2),
    "actual_revenue" numeric(12,2) DEFAULT 0,
    "owner_id" "uuid" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "is_synthetic" boolean DEFAULT false,
    "description" "text",
    "url" "text",
    "website_url" "text",
    "focus_area" "text",
    "discovery_priority" "text",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "external_id" "text",
    "expected_attendees" integer,
    "share_token" "text",
    "engagement_type" "text",
    CONSTRAINT "check_dates" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "events_discovery_priority_check" CHECK ((("discovery_priority" IS NULL) OR ("discovery_priority" = ANY (ARRAY['High'::"text", 'Medium'::"text", 'Low'::"text"])))),
    CONSTRAINT "events_engagement_type_check" CHECK (("engagement_type" = ANY (ARRAY['Sponsor'::"text", 'Exhibit'::"text", 'Attend'::"text", 'Speaking'::"text", 'Follow'::"text"]))),
    CONSTRAINT "events_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'ai_discovered'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";

--
-- Name: COLUMN "events"."owner_id"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."events"."owner_id" IS 'User ID of the event owner/responsible person';


--
-- Name: COLUMN "events"."description"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."events"."description" IS 'Detailed description of the event';


--
-- Name: COLUMN "events"."url"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."events"."url" IS 'Event URL or registration link';


--
-- Name: follow_up_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."follow_up_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "interaction_type" character varying(50) NOT NULL,
    "direction" character varying(50),
    "subject" character varying(500),
    "content" "text",
    "status" character varying(50) DEFAULT 'completed'::character varying,
    "outcome" character varying(50),
    "response_received" boolean DEFAULT false,
    "scheduled_at" timestamp without time zone,
    "completed_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "next_action" "text",
    "next_action_due" "date",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "is_synthetic" boolean DEFAULT false
);


ALTER TABLE "public"."follow_up_records" OWNER TO "postgres";

--
-- Name: lead_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."lead_activities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "activity_type" character varying(50) NOT NULL,
    "activity_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."lead_activities" OWNER TO "postgres";

--
-- Name: TABLE "lead_activities"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."lead_activities" IS 'Tracks all activities related to leads (emails, calls, meetings, etc.)';


--
-- Name: COLUMN "lead_activities"."activity_type"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."lead_activities"."activity_type" IS 'Type of activity: email_recommended, email_drafted, email_copied, email_sent, etc.';


--
-- Name: COLUMN "lead_activities"."activity_data"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."lead_activities"."activity_data" IS 'JSON data specific to the activity type';


--
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "first_name" character varying(255) NOT NULL,
    "last_name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "normalized_email" character varying(255),
    "phone" character varying(50),
    "company" character varying(500) NOT NULL,
    "company_domain" character varying(255),
    "job_title" character varying(255),
    "industry" character varying(100),
    "use_case" character varying(255),
    "priority" character varying(50) DEFAULT 'cold'::character varying NOT NULL,
    "stage" character varying(50) DEFAULT 'new'::character varying,
    "budget_mentioned" boolean DEFAULT false,
    "budget_range" character varying(100),
    "timeline_mentioned" boolean DEFAULT false,
    "timeline" character varying(255),
    "decision_maker" boolean DEFAULT false,
    "raw_notes" "text",
    "ai_summary" "text",
    "extracted_needs" "jsonb",
    "extracted_competitors" "jsonb",
    "owner_id" "uuid" NOT NULL,
    "next_action" "text",
    "next_action_due" "date",
    "crm_opportunity_id" character varying(255),
    "crm_synced_at" timestamp without time zone,
    "opportunity_amount" numeric(12,2),
    "closed_amount" numeric(12,2),
    "closed_at" timestamp without time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "captured_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "is_synthetic" boolean DEFAULT false
);


ALTER TABLE "public"."leads" OWNER TO "postgres";

--
-- Name: meetings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "title" character varying(500) NOT NULL,
    "meeting_type" character varying(100) DEFAULT 'customer_meeting'::character varying,
    "scheduled_at" timestamp without time zone NOT NULL,
    "duration_minutes" integer DEFAULT 60,
    "location" character varying(500),
    "attendees" "jsonb",
    "notes" "text",
    "ai_summary" "text",
    "related_lead_id" "uuid",
    "next_actions" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "is_synthetic" boolean DEFAULT false
);


ALTER TABLE "public"."meetings" OWNER TO "postgres";

--
-- Name: task_checklist_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."task_checklist_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "is_completed" boolean DEFAULT false,
    "position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."task_checklist_items" OWNER TO "postgres";

--
-- Name: task_collaborators; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."task_collaborators" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'collaborator'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_collaborators" OWNER TO "postgres";

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "assigned_to" "uuid",
    "due_date" "date",
    "estimated_cost" numeric(10,2),
    "actual_cost" numeric(10,2),
    "payment_status" "text",
    "vendor_company" "text",
    "contact_person" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "is_ai_generated" boolean DEFAULT false,
    CONSTRAINT "tasks_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['unpaid'::"text", 'partial'::"text", 'paid'::"text"]))),
    CONSTRAINT "tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'in_progress'::"text", 'review'::"text", 'done'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";

--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");


--
-- Name: company_intelligence company_intelligence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."company_intelligence"
    ADD CONSTRAINT "company_intelligence_pkey" PRIMARY KEY ("id");


--
-- Name: email_template_blocks email_template_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_template_blocks"
    ADD CONSTRAINT "email_template_blocks_pkey" PRIMARY KEY ("id");


--
-- Name: email_template_ctas email_template_ctas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_template_ctas"
    ADD CONSTRAINT "email_template_ctas_pkey" PRIMARY KEY ("id");


--
-- Name: email_template_ctas email_template_ctas_template_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_template_ctas"
    ADD CONSTRAINT "email_template_ctas_template_id_key" UNIQUE ("template_id");


--
-- Name: email_template_subjects email_template_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_template_subjects"
    ADD CONSTRAINT "email_template_subjects_pkey" PRIMARY KEY ("id");


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");


--
-- Name: event_assets event_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_assets"
    ADD CONSTRAINT "event_assets_pkey" PRIMARY KEY ("id");


--
-- Name: event_comments event_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_pkey" PRIMARY KEY ("id");


--
-- Name: event_discovery_queue event_discovery_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_discovery_queue"
    ADD CONSTRAINT "event_discovery_queue_pkey" PRIMARY KEY ("id");


--
-- Name: events events_external_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_external_id_key" UNIQUE ("external_id");


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");


--
-- Name: events events_share_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_share_token_key" UNIQUE ("share_token");


--
-- Name: follow_up_records follow_up_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."follow_up_records"
    ADD CONSTRAINT "follow_up_records_pkey" PRIMARY KEY ("id");


--
-- Name: lead_activities lead_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id");


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");


--
-- Name: meetings meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");


--
-- Name: task_checklist_items task_checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."task_checklist_items"
    ADD CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id");


--
-- Name: task_collaborators task_collaborators_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."task_collaborators"
    ADD CONSTRAINT "task_collaborators_pkey" PRIMARY KEY ("id");


--
-- Name: task_collaborators task_collaborators_task_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."task_collaborators"
    ADD CONSTRAINT "task_collaborators_task_id_user_id_key" UNIQUE ("task_id", "user_id");


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");


--
-- Name: company_intelligence unique_user_intelligence; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."company_intelligence"
    ADD CONSTRAINT "unique_user_intelligence" UNIQUE ("user_id");


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: idx_assets_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_assets_created_at" ON "public"."assets" USING "btree" ("created_at" DESC);


--
-- Name: idx_assets_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_assets_event_id" ON "public"."assets" USING "btree" ("event_id");


--
-- Name: idx_assets_file_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_assets_file_type" ON "public"."assets" USING "btree" ("file_type");


--
-- Name: idx_assets_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_assets_task_id" ON "public"."assets" USING "btree" ("task_id");


--
-- Name: idx_assets_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_assets_uploaded_by" ON "public"."assets" USING "btree" ("uploaded_by");


--
-- Name: idx_checklist_position; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_checklist_position" ON "public"."task_checklist_items" USING "btree" ("task_id", "position");


--
-- Name: idx_checklist_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_checklist_task_id" ON "public"."task_checklist_items" USING "btree" ("task_id");


--
-- Name: idx_comments_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_comments_event_id" ON "public"."event_comments" USING "btree" ("event_id");


--
-- Name: idx_company_intelligence_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_company_intelligence_user_id" ON "public"."company_intelligence" USING "btree" ("user_id");


--
-- Name: idx_email_template_blocks_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_email_template_blocks_template" ON "public"."email_template_blocks" USING "btree" ("template_id");


--
-- Name: idx_email_template_subjects_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_email_template_subjects_template" ON "public"."email_template_subjects" USING "btree" ("template_id");


--
-- Name: idx_email_templates_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_email_templates_category" ON "public"."email_templates" USING "btree" ("created_by", "category");


--
-- Name: idx_email_templates_goal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_email_templates_goal" ON "public"."email_templates" USING "btree" ("created_by", "goal");


--
-- Name: idx_email_templates_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_email_templates_status" ON "public"."email_templates" USING "btree" ("created_by", "status");


--
-- Name: idx_email_templates_system; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_email_templates_system" ON "public"."email_templates" USING "btree" ("is_system") WHERE ("is_system" = true);


--
-- Name: idx_email_templates_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_email_templates_user" ON "public"."email_templates" USING "btree" ("created_by");


--
-- Name: idx_event_assets_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_event_assets_deleted_at" ON "public"."event_assets" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);


--
-- Name: idx_event_assets_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_event_assets_event_id" ON "public"."event_assets" USING "btree" ("event_id");


--
-- Name: idx_event_assets_file_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_event_assets_file_type" ON "public"."event_assets" USING "btree" ("file_type");


--
-- Name: idx_event_assets_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_event_assets_uploaded_by" ON "public"."event_assets" USING "btree" ("uploaded_by");


--
-- Name: idx_events_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_events_deleted_at" ON "public"."events" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);


--
-- Name: idx_events_external_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_events_external_id" ON "public"."events" USING "btree" ("external_id");


--
-- Name: idx_events_industry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_events_industry" ON "public"."events" USING "btree" ("industry");


--
-- Name: idx_events_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_events_owner_id" ON "public"."events" USING "btree" ("owner_id");


--
-- Name: idx_events_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_events_source" ON "public"."events" USING "btree" ("source");


--
-- Name: idx_events_start_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_events_start_date" ON "public"."events" USING "btree" ("start_date");


--
-- Name: idx_events_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_events_status" ON "public"."events" USING "btree" ("status");


--
-- Name: idx_follow_up_records_completed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_follow_up_records_completed_at" ON "public"."follow_up_records" USING "btree" ("completed_at");


--
-- Name: idx_follow_up_records_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_follow_up_records_created_by" ON "public"."follow_up_records" USING "btree" ("created_by");


--
-- Name: idx_follow_up_records_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_follow_up_records_deleted_at" ON "public"."follow_up_records" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);


--
-- Name: idx_follow_up_records_direction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_follow_up_records_direction" ON "public"."follow_up_records" USING "btree" ("direction") WHERE ("direction" IS NOT NULL);


--
-- Name: idx_follow_up_records_interaction_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_follow_up_records_interaction_type" ON "public"."follow_up_records" USING "btree" ("interaction_type");


--
-- Name: idx_follow_up_records_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_follow_up_records_lead_id" ON "public"."follow_up_records" USING "btree" ("lead_id");


--
-- Name: idx_lead_activities_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_lead_activities_created_at" ON "public"."lead_activities" USING "btree" ("created_at" DESC);


--
-- Name: idx_lead_activities_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_lead_activities_lead_id" ON "public"."lead_activities" USING "btree" ("lead_id");


--
-- Name: idx_lead_activities_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_lead_activities_type" ON "public"."lead_activities" USING "btree" ("activity_type");


--
-- Name: idx_leads_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_leads_company" ON "public"."leads" USING "btree" ("company");


--
-- Name: idx_leads_company_domain; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_leads_company_domain" ON "public"."leads" USING "btree" ("company_domain") WHERE ("company_domain" IS NOT NULL);


--
-- Name: idx_leads_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_leads_deleted_at" ON "public"."leads" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);


--
-- Name: idx_leads_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_leads_email" ON "public"."leads" USING "btree" ("email");


--
-- Name: idx_leads_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_leads_event_id" ON "public"."leads" USING "btree" ("event_id");


--
-- Name: idx_leads_event_normalized_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "idx_leads_event_normalized_email" ON "public"."leads" USING "btree" ("event_id", "normalized_email") WHERE (("deleted_at" IS NULL) AND ("normalized_email" IS NOT NULL));


--
-- Name: idx_leads_event_priority_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_leads_event_priority_stage" ON "public"."leads" USING "btree" ("event_id", "priority", "stage");


--
-- Name: idx_leads_next_action_due; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_leads_next_action_due" ON "public"."leads" USING "btree" ("next_action_due");


--
-- Name: idx_leads_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_leads_owner_id" ON "public"."leads" USING "btree" ("owner_id");


--
-- Name: idx_leads_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_leads_priority" ON "public"."leads" USING "btree" ("priority");


--
-- Name: idx_leads_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_leads_stage" ON "public"."leads" USING "btree" ("stage");


--
-- Name: idx_meetings_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_meetings_deleted_at" ON "public"."meetings" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);


--
-- Name: idx_meetings_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_meetings_event_id" ON "public"."meetings" USING "btree" ("event_id");


--
-- Name: idx_meetings_related_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_meetings_related_lead_id" ON "public"."meetings" USING "btree" ("related_lead_id");


--
-- Name: idx_meetings_scheduled_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_meetings_scheduled_at" ON "public"."meetings" USING "btree" ("scheduled_at");


--
-- Name: idx_queue_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_queue_status" ON "public"."event_discovery_queue" USING "btree" ("status");


--
-- Name: idx_task_collaborators_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_task_collaborators_task_id" ON "public"."task_collaborators" USING "btree" ("task_id");


--
-- Name: idx_task_collaborators_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_task_collaborators_user_id" ON "public"."task_collaborators" USING "btree" ("user_id");


--
-- Name: idx_tasks_archived; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tasks_archived" ON "public"."tasks" USING "btree" ("archived_at");


--
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");


--
-- Name: idx_tasks_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tasks_event_id" ON "public"."tasks" USING "btree" ("event_id");


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");


--
-- Name: uq_email_template_blocks_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_email_template_blocks_type" ON "public"."email_template_blocks" USING "btree" ("template_id", "block_type");


--
-- Name: email_template_blocks trg_email_template_blocks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_email_template_blocks_updated_at" BEFORE UPDATE ON "public"."email_template_blocks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: email_template_ctas trg_email_template_ctas_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_email_template_ctas_updated_at" BEFORE UPDATE ON "public"."email_template_ctas" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: email_template_subjects trg_email_template_subjects_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_email_template_subjects_updated_at" BEFORE UPDATE ON "public"."email_template_subjects" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: email_templates trg_email_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_email_templates_updated_at" BEFORE UPDATE ON "public"."email_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: company_intelligence trigger_update_company_intelligence_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trigger_update_company_intelligence_updated_at" BEFORE UPDATE ON "public"."company_intelligence" FOR EACH ROW EXECUTE FUNCTION "public"."update_company_intelligence_updated_at"();


--
-- Name: assets update_assets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "update_assets_updated_at" BEFORE UPDATE ON "public"."assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: assets assets_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;


--
-- Name: assets assets_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;


--
-- Name: company_intelligence company_intelligence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."company_intelligence"
    ADD CONSTRAINT "company_intelligence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: email_template_blocks email_template_blocks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_template_blocks"
    ADD CONSTRAINT "email_template_blocks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE CASCADE;


--
-- Name: email_template_ctas email_template_ctas_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_template_ctas"
    ADD CONSTRAINT "email_template_ctas_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE CASCADE;


--
-- Name: email_template_subjects email_template_subjects_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_template_subjects"
    ADD CONSTRAINT "email_template_subjects_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE CASCADE;


--
-- Name: email_templates email_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: event_assets event_assets_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_assets"
    ADD CONSTRAINT "event_assets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: event_comments event_comments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: event_discovery_queue event_discovery_queue_existing_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_discovery_queue"
    ADD CONSTRAINT "event_discovery_queue_existing_event_id_fkey" FOREIGN KEY ("existing_event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;


--
-- Name: event_discovery_queue event_discovery_queue_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_discovery_queue"
    ADD CONSTRAINT "event_discovery_queue_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: follow_up_records follow_up_records_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."follow_up_records"
    ADD CONSTRAINT "follow_up_records_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;


--
-- Name: lead_activities lead_activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: lead_activities lead_activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."lead_activities"
    ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;


--
-- Name: leads leads_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: meetings meetings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: meetings meetings_related_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_related_lead_id_fkey" FOREIGN KEY ("related_lead_id") REFERENCES "public"."leads"("id");


--
-- Name: task_checklist_items task_checklist_items_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."task_checklist_items"
    ADD CONSTRAINT "task_checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;


--
-- Name: task_collaborators task_collaborators_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."task_collaborators"
    ADD CONSTRAINT "task_collaborators_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;


--
-- Name: task_collaborators task_collaborators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."task_collaborators"
    ADD CONSTRAINT "task_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;


--
-- Name: tasks tasks_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: assets Allow anonymous asset creation for testing; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow anonymous asset creation for testing" ON "public"."assets" FOR INSERT WITH CHECK (true);


--
-- Name: assets Allow anonymous asset viewing for testing; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow anonymous asset viewing for testing" ON "public"."assets" FOR SELECT USING (true);


--
-- Name: event_comments Authenticated users can insert comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert comments" ON "public"."event_comments" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));


--
-- Name: event_discovery_queue Authenticated users can manage queue; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can manage queue" ON "public"."event_discovery_queue" USING (("auth"."role"() = 'authenticated'::"text"));


--
-- Name: event_comments Authenticated users can read comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read comments" ON "public"."event_comments" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));


--
-- Name: event_comments Authors can delete their own comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authors can delete their own comments" ON "public"."event_comments" FOR DELETE USING (("auth"."email"() = "author_email"));


--
-- Name: assets Enable delete for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete for all users (testing)" ON "public"."assets" FOR DELETE USING (true);


--
-- Name: task_checklist_items Enable delete for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete for all users (testing)" ON "public"."task_checklist_items" FOR DELETE USING (true);


--
-- Name: task_collaborators Enable delete for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete for all users (testing)" ON "public"."task_collaborators" FOR DELETE USING (true);


--
-- Name: tasks Enable delete for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete for all users (testing)" ON "public"."tasks" FOR DELETE USING (true);


--
-- Name: task_checklist_items Enable insert for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for all users (testing)" ON "public"."task_checklist_items" FOR INSERT WITH CHECK (true);


--
-- Name: task_collaborators Enable insert for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for all users (testing)" ON "public"."task_collaborators" FOR INSERT WITH CHECK (true);


--
-- Name: tasks Enable insert for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for all users (testing)" ON "public"."tasks" FOR INSERT WITH CHECK (true);


--
-- Name: task_checklist_items Enable read access for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users (testing)" ON "public"."task_checklist_items" FOR SELECT USING (true);


--
-- Name: task_collaborators Enable read access for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users (testing)" ON "public"."task_collaborators" FOR SELECT USING (true);


--
-- Name: tasks Enable read access for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users (testing)" ON "public"."tasks" FOR SELECT USING (true);


--
-- Name: task_checklist_items Enable update for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable update for all users (testing)" ON "public"."task_checklist_items" FOR UPDATE USING (true);


--
-- Name: task_collaborators Enable update for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable update for all users (testing)" ON "public"."task_collaborators" FOR UPDATE USING (true);


--
-- Name: tasks Enable update for all users (testing); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable update for all users (testing)" ON "public"."tasks" FOR UPDATE USING (true);


--
-- Name: lead_activities Users can create activities for their leads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create activities for their leads" ON "public"."lead_activities" FOR INSERT WITH CHECK (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE ("leads"."owner_id" = "auth"."uid"()))));


--
-- Name: tasks Users can delete tasks for their events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete tasks for their events" ON "public"."tasks" FOR DELETE USING (("auth"."uid"() IN ( SELECT "events"."owner_id"
   FROM "public"."events"
  WHERE ("events"."id" = "tasks"."event_id"))));


--
-- Name: lead_activities Users can delete their lead activities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their lead activities" ON "public"."lead_activities" FOR DELETE USING (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE ("leads"."owner_id" = "auth"."uid"()))));


--
-- Name: assets Users can delete their uploaded assets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their uploaded assets" ON "public"."assets" FOR DELETE USING (("uploaded_by" = "auth"."uid"()));


--
-- Name: assets Users can insert assets for their events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert assets for their events" ON "public"."assets" FOR INSERT WITH CHECK (((("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "assets"."event_id") AND ("events"."owner_id" = "auth"."uid"()))))) OR (("task_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."events" "e" ON (("t"."event_id" = "e"."id")))
  WHERE (("t"."id" = "assets"."task_id") AND ("e"."owner_id" = "auth"."uid"())))))));


--
-- Name: tasks Users can insert tasks for their events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert tasks for their events" ON "public"."tasks" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "events"."owner_id"
   FROM "public"."events"
  WHERE ("events"."id" = "tasks"."event_id"))));


--
-- Name: task_checklist_items Users can manage checklist items for their tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage checklist items for their tasks" ON "public"."task_checklist_items" USING ((EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."events" "e" ON (("t"."event_id" = "e"."id")))
  WHERE (("t"."id" = "task_checklist_items"."task_id") AND ("e"."owner_id" = "auth"."uid"())))));


--
-- Name: task_collaborators Users can manage collaborators for their tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage collaborators for their tasks" ON "public"."task_collaborators" USING ((EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."events" "e" ON (("t"."event_id" = "e"."id")))
  WHERE (("t"."id" = "task_collaborators"."task_id") AND ("e"."owner_id" = "auth"."uid"())))));


--
-- Name: tasks Users can update tasks for their events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update tasks for their events" ON "public"."tasks" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "events"."owner_id"
   FROM "public"."events"
  WHERE ("events"."id" = "tasks"."event_id"))));


--
-- Name: lead_activities Users can update their lead activities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their lead activities" ON "public"."lead_activities" FOR UPDATE USING (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE ("leads"."owner_id" = "auth"."uid"()))));


--
-- Name: assets Users can update their uploaded assets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their uploaded assets" ON "public"."assets" FOR UPDATE USING (("uploaded_by" = "auth"."uid"()));


--
-- Name: assets Users can view assets for their events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view assets for their events" ON "public"."assets" FOR SELECT USING (((("event_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "assets"."event_id") AND ("events"."owner_id" = "auth"."uid"()))))) OR (("task_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."events" "e" ON (("t"."event_id" = "e"."id")))
  WHERE (("t"."id" = "assets"."task_id") AND ("e"."owner_id" = "auth"."uid"())))))));


--
-- Name: task_checklist_items Users can view checklist items for their tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view checklist items for their tasks" ON "public"."task_checklist_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."events" "e" ON (("t"."event_id" = "e"."id")))
  WHERE (("t"."id" = "task_checklist_items"."task_id") AND ("e"."owner_id" = "auth"."uid"())))));


--
-- Name: task_collaborators Users can view collaborators for their tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view collaborators for their tasks" ON "public"."task_collaborators" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."events" "e" ON (("t"."event_id" = "e"."id")))
  WHERE (("t"."id" = "task_collaborators"."task_id") AND ("e"."owner_id" = "auth"."uid"())))));


--
-- Name: tasks Users can view tasks for their events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view tasks for their events" ON "public"."tasks" FOR SELECT USING (("auth"."uid"() IN ( SELECT "events"."owner_id"
   FROM "public"."events"
  WHERE ("events"."id" = "tasks"."event_id"))));


--
-- Name: lead_activities Users can view their lead activities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their lead activities" ON "public"."lead_activities" FOR SELECT USING (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE ("leads"."owner_id" = "auth"."uid"()))));


--
-- Name: assets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;

--
-- Name: email_template_blocks blocks_select_accessible; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "blocks_select_accessible" ON "public"."email_template_blocks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."email_templates" "t"
  WHERE (("t"."id" = "email_template_blocks"."template_id") AND ("t"."deleted_at" IS NULL) AND (("t"."created_by" = "auth"."uid"()) OR ("t"."is_system" = true))))));


--
-- Name: email_template_blocks blocks_write_own_non_system; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "blocks_write_own_non_system" ON "public"."email_template_blocks" USING ((EXISTS ( SELECT 1
   FROM "public"."email_templates" "t"
  WHERE (("t"."id" = "email_template_blocks"."template_id") AND ("t"."created_by" = "auth"."uid"()) AND ("t"."is_system" = false) AND ("t"."deleted_at" IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."email_templates" "t"
  WHERE (("t"."id" = "email_template_blocks"."template_id") AND ("t"."created_by" = "auth"."uid"()) AND ("t"."is_system" = false) AND ("t"."deleted_at" IS NULL)))));


--
-- Name: company_intelligence; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."company_intelligence" ENABLE ROW LEVEL SECURITY;

--
-- Name: email_template_ctas ctas_select_accessible; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "ctas_select_accessible" ON "public"."email_template_ctas" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."email_templates" "t"
  WHERE (("t"."id" = "email_template_ctas"."template_id") AND ("t"."deleted_at" IS NULL) AND (("t"."created_by" = "auth"."uid"()) OR ("t"."is_system" = true))))));


--
-- Name: email_template_ctas ctas_write_own_non_system; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "ctas_write_own_non_system" ON "public"."email_template_ctas" USING ((EXISTS ( SELECT 1
   FROM "public"."email_templates" "t"
  WHERE (("t"."id" = "email_template_ctas"."template_id") AND ("t"."created_by" = "auth"."uid"()) AND ("t"."is_system" = false) AND ("t"."deleted_at" IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."email_templates" "t"
  WHERE (("t"."id" = "email_template_ctas"."template_id") AND ("t"."created_by" = "auth"."uid"()) AND ("t"."is_system" = false) AND ("t"."deleted_at" IS NULL)))));


--
-- Name: email_template_blocks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."email_template_blocks" ENABLE ROW LEVEL SECURITY;

--
-- Name: email_template_ctas; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."email_template_ctas" ENABLE ROW LEVEL SECURITY;

--
-- Name: email_template_subjects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."email_template_subjects" ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_comments" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_discovery_queue; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_discovery_queue" ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_activities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."lead_activities" ENABLE ROW LEVEL SECURITY;

--
-- Name: email_template_subjects subjects_select_accessible; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "subjects_select_accessible" ON "public"."email_template_subjects" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."email_templates" "t"
  WHERE (("t"."id" = "email_template_subjects"."template_id") AND ("t"."deleted_at" IS NULL) AND (("t"."created_by" = "auth"."uid"()) OR ("t"."is_system" = true))))));


--
-- Name: email_template_subjects subjects_write_own_non_system; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "subjects_write_own_non_system" ON "public"."email_template_subjects" USING ((EXISTS ( SELECT 1
   FROM "public"."email_templates" "t"
  WHERE (("t"."id" = "email_template_subjects"."template_id") AND ("t"."created_by" = "auth"."uid"()) AND ("t"."is_system" = false) AND ("t"."deleted_at" IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."email_templates" "t"
  WHERE (("t"."id" = "email_template_subjects"."template_id") AND ("t"."created_by" = "auth"."uid"()) AND ("t"."is_system" = false) AND ("t"."deleted_at" IS NULL)))));


--
-- Name: task_checklist_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."task_checklist_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: task_collaborators; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."task_collaborators" ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates templates_delete_own_non_system; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "templates_delete_own_non_system" ON "public"."email_templates" FOR DELETE USING ((("created_by" = "auth"."uid"()) AND ("is_system" = false)));


--
-- Name: email_templates templates_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "templates_insert_own" ON "public"."email_templates" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND ("is_system" = false)));


--
-- Name: email_templates templates_select_own_and_system; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "templates_select_own_and_system" ON "public"."email_templates" FOR SELECT USING ((("deleted_at" IS NULL) AND (("created_by" = "auth"."uid"()) OR ("is_system" = true))));


--
-- Name: email_templates templates_update_own_non_system; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "templates_update_own_non_system" ON "public"."email_templates" FOR UPDATE USING ((("created_by" = "auth"."uid"()) AND ("is_system" = false))) WITH CHECK ((("created_by" = "auth"."uid"()) AND ("is_system" = false)));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

--
-- Name: company_intelligence users_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users_delete_own" ON "public"."company_intelligence" FOR DELETE USING (("auth"."uid"() = "user_id"));


--
-- Name: users users_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users_insert" ON "public"."users" FOR INSERT WITH CHECK (true);


--
-- Name: company_intelligence users_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users_insert_own" ON "public"."company_intelligence" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: users users_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users_select" ON "public"."users" FOR SELECT USING (true);


--
-- Name: company_intelligence users_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users_select_own" ON "public"."company_intelligence" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: users users_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users_update" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));


--
-- Name: company_intelligence users_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users_update_own" ON "public"."company_intelligence" FOR UPDATE USING (("auth"."uid"() = "user_id"));


--
-- Name: TABLE "assets"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";


--
-- Name: TABLE "company_intelligence"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."company_intelligence" TO "anon";
GRANT ALL ON TABLE "public"."company_intelligence" TO "authenticated";
GRANT ALL ON TABLE "public"."company_intelligence" TO "service_role";


--
-- Name: TABLE "email_template_blocks"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."email_template_blocks" TO "anon";
GRANT ALL ON TABLE "public"."email_template_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."email_template_blocks" TO "service_role";


--
-- Name: TABLE "email_template_ctas"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."email_template_ctas" TO "anon";
GRANT ALL ON TABLE "public"."email_template_ctas" TO "authenticated";
GRANT ALL ON TABLE "public"."email_template_ctas" TO "service_role";


--
-- Name: TABLE "email_template_subjects"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."email_template_subjects" TO "anon";
GRANT ALL ON TABLE "public"."email_template_subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."email_template_subjects" TO "service_role";


--
-- Name: TABLE "email_templates"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";


--
-- Name: TABLE "event_assets"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_assets" TO "anon";
GRANT ALL ON TABLE "public"."event_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."event_assets" TO "service_role";


--
-- Name: TABLE "event_comments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_comments" TO "anon";
GRANT ALL ON TABLE "public"."event_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."event_comments" TO "service_role";


--
-- Name: TABLE "event_discovery_queue"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_discovery_queue" TO "anon";
GRANT ALL ON TABLE "public"."event_discovery_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."event_discovery_queue" TO "service_role";


--
-- Name: TABLE "events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";


--
-- Name: TABLE "follow_up_records"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."follow_up_records" TO "anon";
GRANT ALL ON TABLE "public"."follow_up_records" TO "authenticated";
GRANT ALL ON TABLE "public"."follow_up_records" TO "service_role";


--
-- Name: TABLE "lead_activities"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."lead_activities" TO "anon";
GRANT ALL ON TABLE "public"."lead_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_activities" TO "service_role";


--
-- Name: TABLE "leads"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";


--
-- Name: TABLE "meetings"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."meetings" TO "anon";
GRANT ALL ON TABLE "public"."meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."meetings" TO "service_role";


--
-- Name: TABLE "task_checklist_items"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."task_checklist_items" TO "anon";
GRANT ALL ON TABLE "public"."task_checklist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."task_checklist_items" TO "service_role";


--
-- Name: TABLE "task_collaborators"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."task_collaborators" TO "anon";
GRANT ALL ON TABLE "public"."task_collaborators" TO "authenticated";
GRANT ALL ON TABLE "public"."task_collaborators" TO "service_role";


--
-- Name: TABLE "tasks"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";


--
-- Name: TABLE "users"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";


--
-- PostgreSQL database dump complete
--

-- \unrestrict LLqwrbTGvM69Np3wfa0tLdI7jy114nRqlhNgy89PbRhexRWFcTqXG5Crqksr3T6

CREATE OR REPLACE FUNCTION "public"."rpc_duplicate_email_template"("p_template_id" "uuid", "p_new_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_source_template record;
  v_new_template_id uuid;
  v_subject record;
  v_block record;
  v_cta record;
begin
  -- 1. Get source template
  select * into v_source_template
  from public.email_templates
  where id = p_template_id
    and deleted_at is null;
  if not found then
    raise exception 'Template not found or deleted';
  end if;
  -- 2. Check permissions (can duplicate own templates or system templates)
  if v_source_template.created_by != auth.uid() and not v_source_template.is_system then
    raise exception 'Not authorized to duplicate this template';
  end if;
  -- 3. Create new template (always non-system, owned by current user)
  insert into public.email_templates (
    created_by,
    name,
    category,
    goal,
    tone,
    language,
    status,
    personas,
    is_system,
    updated_by,
    version,
    max_words,
    forbidden_claims,
    notes
  ) values (
    auth.uid(), -- Always owned by current user
    coalesce(p_new_name, 'Copy of ' || v_source_template.name),
    v_source_template.category,
    v_source_template.goal,
    v_source_template.tone,
    v_source_template.language,
    'disabled', -- Start as disabled for review
    v_source_template.personas,
    false, -- Always non-system
    auth.uid(),
    1, -- Reset version
    v_source_template.max_words,
    v_source_template.forbidden_claims,
    v_source_template.notes
  )
  returning id into v_new_template_id;
  -- 4. Copy subjects
  for v_subject in
    select * from public.email_template_subjects
    where template_id = p_template_id
    order by sort_order
  loop
    insert into public.email_template_subjects (
      template_id,
      sort_order,
      subject,
      is_active
    ) values (
      v_new_template_id,
      v_subject.sort_order,
      v_subject.subject,
      v_subject.is_active
    );
  end loop;
  -- 5. Copy blocks
  for v_block in
    select * from public.email_template_blocks
    where template_id = p_template_id
    order by sort_order
  loop
    insert into public.email_template_blocks (
      template_id,
      block_type,
      sort_order,
      content,
      allowed_vars,
      ai_guidance
    ) values (
      v_new_template_id,
      v_block.block_type,
      v_block.sort_order,
      v_block.content,
      v_block.allowed_vars,
      v_block.ai_guidance
    );
  end loop;
  -- 6. Copy CTA
  select * into v_cta
  from public.email_template_ctas
  where template_id = p_template_id;
  if found then
    insert into public.email_template_ctas (
      template_id,
      cta_type,
      cta_text,
      cta_url
    ) values (
      v_new_template_id,
      v_cta.cta_type,
      v_cta.cta_text,
      v_cta.cta_url
    );
  end if;
  return v_new_template_id;
end;
$$;


ALTER FUNCTION "public"."rpc_duplicate_email_template"("p_template_id" "uuid", "p_new_name" "text") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rpc_duplicate_email_template"("p_template_id" "uuid", "p_new_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_duplicate_email_template"("p_template_id" "uuid", "p_new_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_duplicate_email_template"("p_template_id" "uuid", "p_new_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_company_intelligence_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_company_intelligence_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_company_intelligence_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
AFTER INSERT ON "auth"."users"
FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

INSERT INTO "storage"."buckets" (
  "id",
  "name",
  "public",
  "file_size_limit",
  "allowed_mime_types"
) VALUES (
  'event-assets',
  'event-assets',
  true,
  NULL,
  NULL
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "public" = EXCLUDED."public",
  "file_size_limit" = EXCLUDED."file_size_limit",
  "allowed_mime_types" = EXCLUDED."allowed_mime_types";

CREATE POLICY "Eventra authenticated users can view event assets"
ON "storage"."objects" FOR SELECT TO "authenticated"
USING ("bucket_id" = 'event-assets');

CREATE POLICY "Eventra authenticated users can upload event assets"
ON "storage"."objects" FOR INSERT TO "authenticated"
WITH CHECK ("bucket_id" = 'event-assets');

CREATE POLICY "Eventra authenticated users can update event assets"
ON "storage"."objects" FOR UPDATE TO "authenticated"
USING ("bucket_id" = 'event-assets')
WITH CHECK ("bucket_id" = 'event-assets');

CREATE POLICY "Eventra authenticated users can delete event assets"
ON "storage"."objects" FOR DELETE TO "authenticated"
USING ("bucket_id" = 'event-assets');
COMMIT;
