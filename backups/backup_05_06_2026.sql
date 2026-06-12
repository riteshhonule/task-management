--
-- PostgreSQL database dump
--

\restrict hiP3DQxdYKlKuTO1hX2ihjfwbajMRzRKsunQH5CwcBOkHuT9KvR6SwfwydxD9JD

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: LeaveStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LeaveStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."LeaveStatus" OWNER TO postgres;

--
-- Name: MessageResponseStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MessageResponseStatus" AS ENUM (
    'ACCEPT',
    'REJECT',
    'COMMENT',
    'DISMISSED'
);


ALTER TYPE public."MessageResponseStatus" OWNER TO postgres;

--
-- Name: MessageType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MessageType" AS ENUM (
    'NORMAL',
    'MANDATORY_RESPONSE'
);


ALTER TYPE public."MessageType" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'EMPLOYEE'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: TaskPriority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TaskPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE public."TaskPriority" OWNER TO postgres;

--
-- Name: TaskStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TaskStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'DELAYED',
    'ON_HOLD',
    'BLOCKED',
    'SUBMITTED',
    'PENDING_REVIEW',
    'REVIEW_PENDING',
    'APPROVED',
    'REVISION_REQUIRED'
);


ALTER TYPE public."TaskStatus" OWNER TO postgres;

--
-- Name: TaskType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TaskType" AS ENUM (
    'NEW_TASK',
    'CARRY_FORWARD_TASK',
    'ADMIN_ASSIGNED_TASK',
    'EMPLOYEE_ASSIGNED_TASK'
);


ALTER TYPE public."TaskType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActivityLog" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    action text NOT NULL,
    details text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ActivityLog" OWNER TO postgres;

--
-- Name: ActivityLog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ActivityLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActivityLog_id_seq" OWNER TO postgres;

--
-- Name: ActivityLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ActivityLog_id_seq" OWNED BY public."ActivityLog".id;


--
-- Name: Announcement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Announcement" (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "creatorId" integer NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Announcement" OWNER TO postgres;

--
-- Name: AnnouncementAck; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AnnouncementAck" (
    id integer NOT NULL,
    "announcementId" integer NOT NULL,
    "userId" integer NOT NULL,
    "acknowledgedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AnnouncementAck" OWNER TO postgres;

--
-- Name: AnnouncementAck_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AnnouncementAck_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AnnouncementAck_id_seq" OWNER TO postgres;

--
-- Name: AnnouncementAck_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AnnouncementAck_id_seq" OWNED BY public."AnnouncementAck".id;


--
-- Name: Announcement_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Announcement_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Announcement_id_seq" OWNER TO postgres;

--
-- Name: Announcement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Announcement_id_seq" OWNED BY public."Announcement".id;


--
-- Name: Attachment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Attachment" (
    id integer NOT NULL,
    filename text NOT NULL,
    filepath text NOT NULL,
    mimetype text NOT NULL,
    size integer NOT NULL,
    "taskId" integer,
    "leaveId" integer,
    "uploadedById" integer NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Attachment" OWNER TO postgres;

--
-- Name: Attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Attachment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Attachment_id_seq" OWNER TO postgres;

--
-- Name: Attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Attachment_id_seq" OWNED BY public."Attachment".id;


--
-- Name: Leave; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Leave" (
    id integer NOT NULL,
    "employeeId" integer NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    reason text NOT NULL,
    status public."LeaveStatus" DEFAULT 'APPROVED'::public."LeaveStatus" NOT NULL,
    "approvedById" integer,
    remarks text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "attachmentUrl" text,
    "leaveType" text DEFAULT 'Casual Leave'::text NOT NULL
);


ALTER TABLE public."Leave" OWNER TO postgres;

--
-- Name: Leave_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Leave_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Leave_id_seq" OWNER TO postgres;

--
-- Name: Leave_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Leave_id_seq" OWNED BY public."Leave".id;


--
-- Name: Message; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Message" (
    id integer NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    type public."MessageType" DEFAULT 'NORMAL'::public."MessageType" NOT NULL,
    "recipientIds" integer[],
    "isEveryone" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Message" OWNER TO postgres;

--
-- Name: MessageResponse; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MessageResponse" (
    id integer NOT NULL,
    "messageId" integer NOT NULL,
    "employeeId" integer NOT NULL,
    response public."MessageResponseStatus" NOT NULL,
    comment text,
    "respondedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MessageResponse" OWNER TO postgres;

--
-- Name: MessageResponse_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."MessageResponse_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."MessageResponse_id_seq" OWNER TO postgres;

--
-- Name: MessageResponse_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."MessageResponse_id_seq" OWNED BY public."MessageResponse".id;


--
-- Name: Message_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Message_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Message_id_seq" OWNER TO postgres;

--
-- Name: Message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Message_id_seq" OWNED BY public."Message".id;


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deliveredAt" timestamp(3) without time zone,
    "isDelivered" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "relatedTaskId" integer,
    "senderId" integer,
    status text DEFAULT 'SENT'::text NOT NULL,
    "seenAt" timestamp(3) without time zone
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: NotificationToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."NotificationToken" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "fcmToken" text NOT NULL,
    "deviceType" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."NotificationToken" OWNER TO postgres;

--
-- Name: NotificationToken_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."NotificationToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."NotificationToken_id_seq" OWNER TO postgres;

--
-- Name: NotificationToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."NotificationToken_id_seq" OWNED BY public."NotificationToken".id;


--
-- Name: Notification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Notification_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Notification_id_seq" OWNER TO postgres;

--
-- Name: Notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Notification_id_seq" OWNED BY public."Notification".id;


--
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PasswordResetToken" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PasswordResetToken" OWNER TO postgres;

--
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."PasswordResetToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PasswordResetToken_id_seq" OWNER TO postgres;

--
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."PasswordResetToken_id_seq" OWNED BY public."PasswordResetToken".id;


--
-- Name: Project; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Project" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    "isArchived" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Project" OWNER TO postgres;

--
-- Name: ProjectAllocation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProjectAllocation" (
    id integer NOT NULL,
    "projectId" integer NOT NULL,
    "userId" integer NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProjectAllocation" OWNER TO postgres;

--
-- Name: ProjectAllocation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ProjectAllocation_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ProjectAllocation_id_seq" OWNER TO postgres;

--
-- Name: ProjectAllocation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ProjectAllocation_id_seq" OWNED BY public."ProjectAllocation".id;


--
-- Name: Project_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Project_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Project_id_seq" OWNER TO postgres;

--
-- Name: Project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Project_id_seq" OWNED BY public."Project".id;


--
-- Name: Task; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Task" (
    id integer NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "employeeId" integer NOT NULL,
    "startTime" text NOT NULL,
    "expectedEndDate" timestamp(3) without time zone NOT NULL,
    "carryForwardedFromId" integer,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Task" OWNER TO postgres;

--
-- Name: TaskApproval; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TaskApproval" (
    id integer NOT NULL,
    "taskSubmissionId" integer NOT NULL,
    "reviewerId" integer NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TaskApproval" OWNER TO postgres;

--
-- Name: TaskApproval_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."TaskApproval_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TaskApproval_id_seq" OWNER TO postgres;

--
-- Name: TaskApproval_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."TaskApproval_id_seq" OWNED BY public."TaskApproval".id;


--
-- Name: TaskCarryForward; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TaskCarryForward" (
    id integer NOT NULL,
    "taskId" integer NOT NULL,
    "employeeId" integer NOT NULL,
    "fromDate" timestamp(3) without time zone NOT NULL,
    "toDate" timestamp(3) without time zone NOT NULL,
    reason text,
    "isDeadlineCarryForward" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TaskCarryForward" OWNER TO postgres;

--
-- Name: TaskCarryForward_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."TaskCarryForward_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TaskCarryForward_id_seq" OWNER TO postgres;

--
-- Name: TaskCarryForward_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."TaskCarryForward_id_seq" OWNED BY public."TaskCarryForward".id;


--
-- Name: TaskProject; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TaskProject" (
    id integer NOT NULL,
    "taskId" integer NOT NULL,
    "projectId" integer NOT NULL,
    "taskDescription" text NOT NULL,
    "changesGivenBy" text,
    "changesSummary" text,
    priority public."TaskPriority" DEFAULT 'MEDIUM'::public."TaskPriority" NOT NULL,
    status public."TaskStatus" DEFAULT 'PENDING'::public."TaskStatus" NOT NULL,
    "delayReason" text,
    "blockedReason" text,
    notes text,
    "completedWorkDescription" text,
    "completionPercentage" integer DEFAULT 0,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "adminEditedDescription" boolean DEFAULT false NOT NULL,
    "acceptanceStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "rejectionReason" text,
    "adminComment" text,
    "adminCommentUpdatedAt" timestamp(3) without time zone,
    "adminCommentUpdatedById" integer,
    "approvalComment" text,
    "approvedById" integer,
    "approvedDate" timestamp(3) without time zone,
    "assignedByUserId" integer,
    "assignedToUserId" integer,
    "assignmentType" text,
    blockers text,
    "customJobRole" text,
    "endTime" text,
    "estimatedEffort" double precision,
    "jobRoleType" text,
    "proofRequired" boolean DEFAULT false NOT NULL,
    "reviewStatus" text DEFAULT 'PENDING'::text,
    "startTime" text,
    "taskType" public."TaskType" DEFAULT 'NEW_TASK'::public."TaskType" NOT NULL,
    "timeSpent" double precision
);


ALTER TABLE public."TaskProject" OWNER TO postgres;

--
-- Name: TaskProject_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."TaskProject_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TaskProject_id_seq" OWNER TO postgres;

--
-- Name: TaskProject_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."TaskProject_id_seq" OWNED BY public."TaskProject".id;


--
-- Name: TaskProof; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TaskProof" (
    id integer NOT NULL,
    "taskSubmissionId" integer NOT NULL,
    filename text NOT NULL,
    filepath text NOT NULL,
    mimetype text NOT NULL,
    size integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TaskProof" OWNER TO postgres;

--
-- Name: TaskProof_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."TaskProof_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TaskProof_id_seq" OWNER TO postgres;

--
-- Name: TaskProof_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."TaskProof_id_seq" OWNED BY public."TaskProof".id;


--
-- Name: TaskRevision; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TaskRevision" (
    id integer NOT NULL,
    "taskSubmissionId" integer NOT NULL,
    "reviewerId" integer NOT NULL,
    comment text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TaskRevision" OWNER TO postgres;

--
-- Name: TaskRevision_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."TaskRevision_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TaskRevision_id_seq" OWNER TO postgres;

--
-- Name: TaskRevision_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."TaskRevision_id_seq" OWNED BY public."TaskRevision".id;


--
-- Name: TaskSubmission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TaskSubmission" (
    id integer NOT NULL,
    "taskProjectId" integer NOT NULL,
    "employeeId" integer NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "timeSpent" double precision,
    blockers text,
    notes text
);


ALTER TABLE public."TaskSubmission" OWNER TO postgres;

--
-- Name: TaskSubmission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."TaskSubmission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TaskSubmission_id_seq" OWNER TO postgres;

--
-- Name: TaskSubmission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."TaskSubmission_id_seq" OWNED BY public."TaskSubmission".id;


--
-- Name: TaskTimeline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TaskTimeline" (
    id integer NOT NULL,
    "taskProjectId" integer NOT NULL,
    action text NOT NULL,
    "performedById" integer NOT NULL,
    details text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TaskTimeline" OWNER TO postgres;

--
-- Name: TaskTimeline_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."TaskTimeline_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TaskTimeline_id_seq" OWNER TO postgres;

--
-- Name: TaskTimeline_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."TaskTimeline_id_seq" OWNED BY public."TaskTimeline".id;


--
-- Name: TaskUpdate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TaskUpdate" (
    id integer NOT NULL,
    "taskProjectId" integer NOT NULL,
    "statusBefore" public."TaskStatus" NOT NULL,
    "statusAfter" public."TaskStatus" NOT NULL,
    remarks text,
    "screenshotUrl" text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TaskUpdate" OWNER TO postgres;

--
-- Name: TaskUpdate_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."TaskUpdate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TaskUpdate_id_seq" OWNER TO postgres;

--
-- Name: TaskUpdate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."TaskUpdate_id_seq" OWNED BY public."TaskUpdate".id;


--
-- Name: Task_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Task_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Task_id_seq" OWNER TO postgres;

--
-- Name: Task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Task_id_seq" OWNED BY public."Task".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role public."Role" DEFAULT 'EMPLOYEE'::public."Role" NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "mobileNumber" text,
    "jobRole" text
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: ActivityLog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityLog" ALTER COLUMN id SET DEFAULT nextval('public."ActivityLog_id_seq"'::regclass);


--
-- Name: Announcement id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Announcement" ALTER COLUMN id SET DEFAULT nextval('public."Announcement_id_seq"'::regclass);


--
-- Name: AnnouncementAck id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AnnouncementAck" ALTER COLUMN id SET DEFAULT nextval('public."AnnouncementAck_id_seq"'::regclass);


--
-- Name: Attachment id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attachment" ALTER COLUMN id SET DEFAULT nextval('public."Attachment_id_seq"'::regclass);


--
-- Name: Leave id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Leave" ALTER COLUMN id SET DEFAULT nextval('public."Leave_id_seq"'::regclass);


--
-- Name: Message id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Message" ALTER COLUMN id SET DEFAULT nextval('public."Message_id_seq"'::regclass);


--
-- Name: MessageResponse id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MessageResponse" ALTER COLUMN id SET DEFAULT nextval('public."MessageResponse_id_seq"'::regclass);


--
-- Name: Notification id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification" ALTER COLUMN id SET DEFAULT nextval('public."Notification_id_seq"'::regclass);


--
-- Name: NotificationToken id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NotificationToken" ALTER COLUMN id SET DEFAULT nextval('public."NotificationToken_id_seq"'::regclass);


--
-- Name: PasswordResetToken id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PasswordResetToken" ALTER COLUMN id SET DEFAULT nextval('public."PasswordResetToken_id_seq"'::regclass);


--
-- Name: Project id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project" ALTER COLUMN id SET DEFAULT nextval('public."Project_id_seq"'::regclass);


--
-- Name: ProjectAllocation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectAllocation" ALTER COLUMN id SET DEFAULT nextval('public."ProjectAllocation_id_seq"'::regclass);


--
-- Name: Task id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Task" ALTER COLUMN id SET DEFAULT nextval('public."Task_id_seq"'::regclass);


--
-- Name: TaskApproval id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskApproval" ALTER COLUMN id SET DEFAULT nextval('public."TaskApproval_id_seq"'::regclass);


--
-- Name: TaskCarryForward id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskCarryForward" ALTER COLUMN id SET DEFAULT nextval('public."TaskCarryForward_id_seq"'::regclass);


--
-- Name: TaskProject id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskProject" ALTER COLUMN id SET DEFAULT nextval('public."TaskProject_id_seq"'::regclass);


--
-- Name: TaskProof id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskProof" ALTER COLUMN id SET DEFAULT nextval('public."TaskProof_id_seq"'::regclass);


--
-- Name: TaskRevision id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskRevision" ALTER COLUMN id SET DEFAULT nextval('public."TaskRevision_id_seq"'::regclass);


--
-- Name: TaskSubmission id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskSubmission" ALTER COLUMN id SET DEFAULT nextval('public."TaskSubmission_id_seq"'::regclass);


--
-- Name: TaskTimeline id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskTimeline" ALTER COLUMN id SET DEFAULT nextval('public."TaskTimeline_id_seq"'::regclass);


--
-- Name: TaskUpdate id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskUpdate" ALTER COLUMN id SET DEFAULT nextval('public."TaskUpdate_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActivityLog" (id, "userId", action, details, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	2	USER_LOGIN	User admin@gmark.com successfully logged in.	\N	2026-06-06 06:55:08.827	2026-06-06 06:55:08.827
2	2	USER_LOGIN	User admin@gmark.com successfully logged in.	\N	2026-06-06 07:07:23.558	2026-06-06 07:07:23.558
\.


--
-- Data for Name: Announcement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Announcement" (id, title, content, "creatorId", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AnnouncementAck; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AnnouncementAck" (id, "announcementId", "userId", "acknowledgedAt", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Attachment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Attachment" (id, filename, filepath, mimetype, size, "taskId", "leaveId", "uploadedById", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Leave; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Leave" (id, "employeeId", "startDate", "endDate", reason, status, "approvedById", remarks, "deletedAt", "createdAt", "updatedAt", "attachmentUrl", "leaveType") FROM stdin;
3	8	2026-06-04 00:00:00	2026-06-05 23:59:59	Project submission in college	APPROVED	2	Approved emergency leave	\N	2026-06-06 07:06:55.713	2026-06-06 07:06:55.713	\N	Emergency Leave
4	6	2026-06-04 00:00:00	2026-06-04 23:59:59	Project submission in college	APPROVED	2	Approved emergency leave	\N	2026-06-06 07:06:55.719	2026-06-06 07:06:55.719	\N	Emergency Leave
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Message" (id, "senderId", content, type, "recipientIds", "isEveryone", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MessageResponse; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MessageResponse" (id, "messageId", "employeeId", response, comment, "respondedAt", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, "userId", type, title, message, "isRead", "deletedAt", "createdAt", "updatedAt", "deliveredAt", "isDelivered", "readAt", "relatedTaskId", "senderId", status, "seenAt") FROM stdin;
\.


--
-- Data for Name: NotificationToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."NotificationToken" (id, "userId", "fcmToken", "deviceType", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PasswordResetToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PasswordResetToken" (id, "userId", token, "expiresAt", used, "createdAt") FROM stdin;
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Project" (id, name, description, "isArchived", "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	SHG	Self Help Group Portal	f	\N	2026-06-06 06:53:18.06	2026-06-06 06:53:18.06
2	Transporter	Logistics and Transporter Management	f	\N	2026-06-06 06:53:18.07	2026-06-06 06:53:18.07
3	GMU HUB	GMU Hub System	f	\N	2026-06-06 06:53:18.072	2026-06-06 06:53:18.072
4	ERP	Enterprise Resource Planning	f	\N	2026-06-06 06:53:18.074	2026-06-06 06:53:18.074
5	CRM	Customer Relationship Management	f	\N	2026-06-06 06:53:18.076	2026-06-06 06:53:18.076
6	IOT	Internet of Things Integrations	f	\N	2026-06-06 06:53:18.078	2026-06-06 06:53:18.078
7	Task Management System	Task Management System	f	\N	2026-06-06 06:53:18.08	2026-06-06 06:53:18.08
8	Sevastu	Sevastu Application	f	\N	2026-06-06 06:53:18.082	2026-06-06 06:53:18.082
\.


--
-- Data for Name: ProjectAllocation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProjectAllocation" (id, "projectId", "userId", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Task; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Task" (id, "startDate", "employeeId", "startTime", "expectedEndDate", "carryForwardedFromId", "deletedAt", "createdAt", "updatedAt") FROM stdin;
32	2026-06-01 00:00:00	11	10:00 AM	2026-06-01 18:00:00	\N	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.723
33	2026-06-01 00:00:00	5	10:00 AM	2026-06-01 18:00:00	\N	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.768
34	2026-06-01 00:00:00	9	11:00 AM	2026-06-01 17:00:00	\N	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.782
35	2026-06-01 00:00:00	8	10:00 AM	2026-06-01 18:00:00	\N	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.799
36	2026-06-01 00:00:00	6	10:00 AM	2026-06-01 18:00:00	\N	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.812
37	2026-06-01 00:00:00	10	10:00 AM	2026-06-01 18:00:00	\N	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.826
38	2026-06-02 00:00:00	11	10:00 AM	2026-06-02 18:00:00	\N	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.85
39	2026-06-02 00:00:00	5	10:00 AM	2026-06-02 18:00:00	\N	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.859
40	2026-06-02 00:00:00	9	11:00 AM	2026-06-02 17:00:00	\N	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.872
41	2026-06-02 00:00:00	7	10:00 AM	2026-06-02 18:00:00	\N	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.886
42	2026-06-02 00:00:00	8	10:00 AM	2026-06-02 18:00:00	\N	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.898
43	2026-06-02 00:00:00	6	10:00 AM	2026-06-02 18:00:00	\N	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.909
44	2026-06-02 00:00:00	10	10:00 AM	2026-06-02 18:00:00	\N	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.923
45	2026-06-03 00:00:00	11	10:00 AM	2026-06-03 18:00:00	\N	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.936
46	2026-06-03 00:00:00	5	10:00 AM	2026-06-03 18:00:00	\N	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.948
47	2026-06-03 00:00:00	9	11:00 AM	2026-06-03 17:00:00	\N	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.961
48	2026-06-03 00:00:00	7	10:00 AM	2026-06-03 18:00:00	\N	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.974
49	2026-06-03 00:00:00	8	10:00 AM	2026-06-03 18:00:00	\N	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.986
50	2026-06-03 00:00:00	6	10:00 AM	2026-06-03 18:00:00	\N	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.996
51	2026-06-03 00:00:00	10	10:00 AM	2026-06-03 18:00:00	\N	\N	2026-06-03 09:30:00	2026-06-06 07:06:56.011
52	2026-06-04 00:00:00	11	10:00 AM	2026-06-04 18:00:00	\N	\N	2026-06-04 09:30:00	2026-06-06 07:06:56.037
53	2026-06-04 00:00:00	5	10:00 AM	2026-06-04 18:00:00	\N	\N	2026-06-04 09:30:00	2026-06-06 07:06:56.05
54	2026-06-04 00:00:00	9	11:00 AM	2026-06-04 17:00:00	\N	\N	2026-06-04 09:30:00	2026-06-06 07:06:56.063
55	2026-06-04 00:00:00	7	10:00 AM	2026-06-04 18:00:00	\N	\N	2026-06-04 09:30:00	2026-06-06 07:06:56.076
56	2026-06-04 00:00:00	10	10:00 AM	2026-06-04 18:00:00	\N	\N	2026-06-04 09:30:00	2026-06-06 07:06:56.091
57	2026-06-05 00:00:00	11	10:00 AM	2026-06-05 18:00:00	\N	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.115
58	2026-06-05 00:00:00	5	10:00 AM	2026-06-05 18:00:00	\N	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.129
59	2026-06-05 00:00:00	9	11:00 AM	2026-06-05 17:00:00	\N	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.144
60	2026-06-05 00:00:00	7	10:00 AM	2026-06-05 18:00:00	\N	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.156
61	2026-06-05 00:00:00	6	10:00 AM	2026-06-05 18:00:00	\N	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.169
62	2026-06-05 00:00:00	10	10:00 AM	2026-06-05 18:00:00	\N	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.179
\.


--
-- Data for Name: TaskApproval; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TaskApproval" (id, "taskSubmissionId", "reviewerId", comment, "createdAt") FROM stdin;
37	37	2	Task approved after review	2026-06-01 18:15:00
38	38	2	Task approved after review	2026-06-01 18:15:00
39	39	2	Task approved after review	2026-06-01 17:15:00
40	40	2	Task approved after review	2026-06-01 18:15:00
41	41	2	Task approved after review	2026-06-01 18:15:00
42	42	2	Task approved after review	2026-06-01 18:15:00
43	43	2	Task approved after review	2026-06-01 18:15:00
44	44	2	Task approved after review	2026-06-02 18:15:00
45	45	2	Task approved after review	2026-06-02 18:15:00
46	46	2	Task approved after review	2026-06-02 17:15:00
47	47	2	Task approved after review	2026-06-02 18:15:00
48	48	2	Task approved after review	2026-06-02 18:15:00
49	49	2	Task approved after review	2026-06-02 18:15:00
50	50	2	Task approved after review	2026-06-02 18:15:00
51	51	2	Task approved after review	2026-06-03 18:15:00
52	52	2	Task approved after review	2026-06-03 18:15:00
53	53	2	Task approved after review	2026-06-03 17:15:00
54	54	2	Task approved after review	2026-06-03 18:15:00
55	55	2	Task approved after review	2026-06-03 18:15:00
56	56	2	Task approved after review	2026-06-03 18:15:00
57	57	2	Task approved after review	2026-06-03 18:15:00
58	58	2	Task approved after review	2026-06-03 18:15:00
59	59	2	Task approved after review	2026-06-04 18:15:00
60	60	2	Task approved after review	2026-06-04 18:15:00
61	61	2	Task approved after review	2026-06-04 17:15:00
62	62	2	Task approved after review	2026-06-04 18:15:00
63	63	2	Task approved after review	2026-06-04 18:15:00
64	64	2	Task approved after review	2026-06-04 18:15:00
65	65	2	Task approved after review	2026-06-05 18:15:00
66	66	2	Task approved after review	2026-06-05 18:15:00
67	67	2	Task approved after review	2026-06-05 17:15:00
68	68	2	Task approved after review	2026-06-05 18:15:00
69	69	2	Task approved after review	2026-06-05 18:15:00
70	70	2	Task approved after review	2026-06-05 18:15:00
71	71	2	Task approved after review	2026-06-05 18:15:00
\.


--
-- Data for Name: TaskCarryForward; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TaskCarryForward" (id, "taskId", "employeeId", "fromDate", "toDate", reason, "isDeadlineCarryForward", "createdAt") FROM stdin;
\.


--
-- Data for Name: TaskProject; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TaskProject" (id, "taskId", "projectId", "taskDescription", "changesGivenBy", "changesSummary", priority, status, "delayReason", "blockedReason", notes, "completedWorkDescription", "completionPercentage", "deletedAt", "createdAt", "updatedAt", "adminEditedDescription", "acceptanceStatus", "rejectionReason", "adminComment", "adminCommentUpdatedAt", "adminCommentUpdatedById", "approvalComment", "approvedById", "approvedDate", "assignedByUserId", "assignedToUserId", "assignmentType", blockers, "customJobRole", "endTime", "estimatedEffort", "jobRoleType", "proofRequired", "reviewStatus", "startTime", "taskType", "timeSpent") FROM stdin;
37	32	6	IoT Dashboard UI Started\n\nThe IoT dashboard UI started. Coordinated with Yogesh Sir. Investigated login-related issues and began dashboard setup.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Initial IoT dashboard setup completed and login issue investigation performed.	100	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.728	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-01 18:15:00	11	11	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
38	33	7	Task Management Development\n\nDeveloped task management functionality. Implemented required modules. Improved workflow management.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Task management updates completed successfully.	100	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.771	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-01 18:15:00	5	5	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
39	34	4	Settlement Module Development\n\nDeveloped settlement module, implemented business logic, integrated finance workflows and tested module.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Settlement module completed and tested successfully.	100	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.784	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-01 17:15:00	9	9	\N	\N	\N	05:00 PM	\N	Full Stack Developer	f	APPROVED	11:00 AM	EMPLOYEE_ASSIGNED_TASK	6
40	35	2	Order Management Integration\n\nIntegrated order management frontend and backend. Connected APIs, and verified data flow.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Order management integration completed successfully.	100	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.801	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-01 18:15:00	8	8	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
41	36	1	SHG UI Improvements\n\nScreen redesign improvements, responsive layout improvements, styling enhancements and navigation updates.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	UI improvements and workflow enhancements completed.	100	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.814	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-01 18:15:00	6	6	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
42	37	1	GitHub Issue Resolution\n\nInvestigated and resolved GitHub issues. Fixed repository synchronization and code integration issues.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	GitHub issues identified and resolved successfully.	100	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.827	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-01 18:15:00	10	10	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	4
43	37	2	GitHub Issue Resolution\n\nInvestigated and resolved GitHub issues. Fixed repository synchronization and code integration issues.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	GitHub issues identified and resolved successfully.	100	\N	2026-06-01 09:30:00	2026-06-06 07:06:55.838	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-01 18:15:00	10	10	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	4
44	38	6	MQTT Integration and Login Issue Investigation\n\nMQTT integration setup completed and login issues analyzed.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	MQTT integration setup completed and login issues analyzed.	100	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.851	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-02 18:15:00	11	11	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
45	39	7	Task Management Project Completion\n\nCompleted remaining project features. Finalized implementation. Performed testing and validation. Prepared project for usage.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Task Management project completed successfully.	100	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.861	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-02 18:15:00	5	5	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
46	40	4	Change Request Implementation\n\nImplemented Gurudas Sir's change requests. Updated functionality and tested revised features.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	All requested ERP changes implemented successfully.	100	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.874	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-02 17:15:00	9	9	\N	\N	\N	05:00 PM	\N	Full Stack Developer	f	APPROVED	11:00 AM	EMPLOYEE_ASSIGNED_TASK	6
47	41	1	SHG UI Issue Resolution and API Testing\n\nSolved UI problems. Tested APIs in Swagger. Fixed identified mistakes. Supported integration validation.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	UI issues fixed and API testing completed.	100	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.887	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-02 18:15:00	7	7	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
48	42	2	Error Resolution and Flow Testing\n\nFixed API issues, resolved flow problems, and performed end-to-end testing.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Application flow tested and verified successfully.	100	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.901	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-02 18:15:00	8	8	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
49	43	2	Transporter APK Build Support\n\nAssisted with APK build configuration, dependency checks, and troubleshooting.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Transporter APK generated successfully.	100	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.911	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-02 18:15:00	6	6	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
50	44	8	Sevastu Testing and APK Build Support\n\nConducted Sevastu application testing. Verified workflows and functionality. Assisted with APK build issues.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Testing completed and APK build issues resolved.	100	\N	2026-06-02 09:30:00	2026-06-06 07:06:55.924	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-02 18:15:00	10	10	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
51	45	6	IoT Sensor Data Pipeline Setup\n\nConfigured MQTT broker connection, established topic subscriptions, and parsed sensor payloads for telemetry.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	IoT Sensor Data Pipeline successfully integrated and tested.	100	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.937	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-03 18:15:00	11	11	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
52	46	7	Task Management Enhancement & SMTP Notification\n\nIntegrated SMTP notification systems for password recovery and system alerts. Added notification sound settings.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	SMTP notifications and sounds fully integrated and verified.	100	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.951	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-03 18:15:00	5	5	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
53	47	4	HSN Master Development\n\nDeveloping master data management functionality for HSN codes. Created validations and UI schemas.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	HSN Master data screens and validations completed.	100	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.963	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-03 17:15:00	9	9	\N	\N	\N	05:00 PM	\N	Full Stack Developer	f	APPROVED	11:00 AM	EMPLOYEE_ASSIGNED_TASK	6
54	48	1	SHG Member Profile Cards UI\n\nCreated profile cards component showing status badges and dynamic contact numbers.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Member profiles UI cards completed and styled.	100	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.976	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-03 18:15:00	7	7	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
55	49	2	Transporter APK Generation & Deployment Setup\n\nConfigured build scripts to export APK files and tested installation on physical devices.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Transporter APK generated and verified successfully.	100	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.988	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-03 18:15:00	8	8	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
56	50	1	SHG Registration Form Validation\n\nAdded custom regex validation rules for phone numbers and dynamic address dropdowns.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Registration form client-side validations completed.	100	\N	2026-06-03 09:30:00	2026-06-06 07:06:55.998	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-03 18:15:00	6	6	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
57	51	1	SHG-Transporter API Sync Gateway\n\nDeveloped gateway sync endpoints to keep data models of both projects in sync.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	API gateway sync endpoints completed and tested.	100	\N	2026-06-03 09:30:00	2026-06-06 07:06:56.013	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-03 18:15:00	10	10	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	4
58	51	2	SHG-Transporter API Sync Gateway\n\nDeveloped gateway sync endpoints to keep data models of both projects in sync.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	API gateway sync endpoints completed and tested.	100	\N	2026-06-03 09:30:00	2026-06-06 07:06:56.023	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-03 18:15:00	10	10	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	4
59	52	6	Telemetry Database Schema Optimization\n\nOptimized PostgreSQL telemetry tables, created necessary indices, and tested query retrieval performance.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Telemetry schema indexing completed, query latency reduced.	100	\N	2026-06-04 09:30:00	2026-06-06 07:06:56.038	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-04 18:15:00	11	11	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
60	53	7	Task Assignment UI & Filter Optimizations\n\nEnhanced UI layouts for task assignment page. Optimized search and filters for large lists.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Task assignment filter UI redesigned and integrated.	100	\N	2026-06-04 09:30:00	2026-06-06 07:06:56.053	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-04 18:15:00	5	5	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
61	54	4	Invoice PDF Generator Implementation\n\nConfigured backend PDF generator using template mapping. Handled invoice calculations.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Invoice PDF generation endpoint implemented and verified.	100	\N	2026-06-04 09:30:00	2026-06-06 07:06:56.065	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-04 17:15:00	9	9	\N	\N	\N	05:00 PM	\N	Full Stack Developer	f	APPROVED	11:00 AM	EMPLOYEE_ASSIGNED_TASK	6
62	55	1	SHG Loan Application UI Development\n\nImplemented multi-step wizard UI for SHG micro-finance loan applications.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Multi-step loan wizard completed successfully.	100	\N	2026-06-04 09:30:00	2026-06-06 07:06:56.077	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-04 18:15:00	7	7	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
63	56	1	Database Migration scripts for SHG & Transporter\n\nWrote database migration scripts and optimized relations between transport logs and SHG users.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Schema migrations successfully applied and tested.	100	\N	2026-06-04 09:30:00	2026-06-06 07:06:56.092	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-04 18:15:00	10	10	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	4
64	56	2	Database Migration scripts for SHG & Transporter\n\nWrote database migration scripts and optimized relations between transport logs and SHG users.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Schema migrations successfully applied and tested.	100	\N	2026-06-04 09:30:00	2026-06-06 07:06:56.103	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-04 18:15:00	10	10	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	4
65	57	6	IoT REST APIs for Historical Telemetry\n\nImplemented API endpoints to fetch telemetry history with pagination and date range filters.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Telemetry history APIs developed, documented, and tested.	100	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.12	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-05 18:15:00	11	11	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
66	58	7	Interactive Kanban Board Implementation\n\nBuilt drag-and-drop support for board status transitions and customized cards styling.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Drag-and-drop Kanban Board page completed and tested.	100	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.132	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-05 18:15:00	5	5	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
67	59	4	ERP Tax Ledger Reconciliation\n\nWrote reconciliation scripts to match invoice taxes with ledgers and generate discrepancy logs.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Ledger reconciliation algorithms created and verified.	100	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.146	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-05 17:15:00	9	9	\N	\N	\N	05:00 PM	\N	Full Stack Developer	f	APPROVED	11:00 AM	EMPLOYEE_ASSIGNED_TASK	6
68	60	1	SHG Transaction History Table\n\nBuilt dynamic data table with filtering, search, and CSV export for transaction records.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Transaction list UI with export capabilities verified.	100	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.158	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-05 18:15:00	7	7	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
69	61	1	SHG Document Upload Workflow\n\nIntegrated document upload component with progress bar indicators and size validations.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Document upload UI flow completed and tested.	100	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.17	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-05 18:15:00	6	6	\N	\N	\N	06:00 PM	\N	Frontend Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	8
70	62	1	Gateway Load Testing and Security Audit\n\nPerformed API load testing using Autocannon and executed a basic security validation check.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Security audit and rate limiting setup completed.	100	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.181	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-05 18:15:00	10	10	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	4
71	62	2	Gateway Load Testing and Security Audit\n\nPerformed API load testing using Autocannon and executed a basic security validation check.	\N	\N	MEDIUM	COMPLETED	\N	\N	\N	Security audit and rate limiting setup completed.	100	\N	2026-06-05 09:30:00	2026-06-06 07:06:56.189	f	ACCEPTED	\N	\N	\N	\N	Approved after review	2	2026-06-05 18:15:00	10	10	\N	\N	\N	06:00 PM	\N	Full Stack Developer	f	APPROVED	10:00 AM	EMPLOYEE_ASSIGNED_TASK	4
\.


--
-- Data for Name: TaskProof; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TaskProof" (id, "taskSubmissionId", filename, filepath, mimetype, size, "createdAt") FROM stdin;
\.


--
-- Data for Name: TaskRevision; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TaskRevision" (id, "taskSubmissionId", "reviewerId", comment, "createdAt") FROM stdin;
\.


--
-- Data for Name: TaskSubmission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TaskSubmission" (id, "taskProjectId", "employeeId", comment, "createdAt", "timeSpent", blockers, notes) FROM stdin;
37	37	11	Completed all daily update goals.	2026-06-01 17:55:00	8	\N	\N
38	38	5	Completed all daily update goals.	2026-06-01 17:55:00	8	\N	\N
39	39	9	Completed all daily update goals.	2026-06-01 16:55:00	6	\N	\N
40	40	8	Completed all daily update goals.	2026-06-01 17:55:00	8	\N	\N
41	41	6	Completed all daily update goals.	2026-06-01 17:55:00	8	\N	\N
42	42	10	Completed all daily update goals.	2026-06-01 17:55:00	4	\N	\N
43	43	10	Completed all daily update goals.	2026-06-01 17:55:00	4	\N	\N
44	44	11	Completed all daily update goals.	2026-06-02 17:55:00	8	\N	\N
45	45	5	Completed all daily update goals.	2026-06-02 17:55:00	8	\N	\N
46	46	9	Completed all daily update goals.	2026-06-02 16:55:00	6	\N	\N
47	47	7	Completed all daily update goals.	2026-06-02 17:55:00	8	\N	\N
48	48	8	Completed all daily update goals.	2026-06-02 17:55:00	8	\N	\N
49	49	6	Completed all daily update goals.	2026-06-02 17:55:00	8	\N	\N
50	50	10	Completed all daily update goals.	2026-06-02 17:55:00	8	\N	\N
51	51	11	Completed all daily update goals.	2026-06-03 17:55:00	8	\N	\N
52	52	5	Completed all daily update goals.	2026-06-03 17:55:00	8	\N	\N
53	53	9	Completed all daily update goals.	2026-06-03 16:55:00	6	\N	\N
54	54	7	Completed all daily update goals.	2026-06-03 17:55:00	8	\N	\N
55	55	8	Completed all daily update goals.	2026-06-03 17:55:00	8	\N	\N
56	56	6	Completed all daily update goals.	2026-06-03 17:55:00	8	\N	\N
57	57	10	Completed all daily update goals.	2026-06-03 17:55:00	4	\N	\N
58	58	10	Completed all daily update goals.	2026-06-03 17:55:00	4	\N	\N
59	59	11	Completed all daily update goals.	2026-06-04 17:55:00	8	\N	\N
60	60	5	Completed all daily update goals.	2026-06-04 17:55:00	8	\N	\N
61	61	9	Completed all daily update goals.	2026-06-04 16:55:00	6	\N	\N
62	62	7	Completed all daily update goals.	2026-06-04 17:55:00	8	\N	\N
63	63	10	Completed all daily update goals.	2026-06-04 17:55:00	4	\N	\N
64	64	10	Completed all daily update goals.	2026-06-04 17:55:00	4	\N	\N
65	65	11	Completed all daily update goals.	2026-06-05 17:55:00	8	\N	\N
66	66	5	Completed all daily update goals.	2026-06-05 17:55:00	8	\N	\N
67	67	9	Completed all daily update goals.	2026-06-05 16:55:00	6	\N	\N
68	68	7	Completed all daily update goals.	2026-06-05 17:55:00	8	\N	\N
69	69	6	Completed all daily update goals.	2026-06-05 17:55:00	8	\N	\N
70	70	10	Completed all daily update goals.	2026-06-05 17:55:00	4	\N	\N
71	71	10	Completed all daily update goals.	2026-06-05 17:55:00	4	\N	\N
\.


--
-- Data for Name: TaskTimeline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TaskTimeline" (id, "taskProjectId", action, "performedById", details, "createdAt", "updatedAt") FROM stdin;
287	48	Review Approved	2	Review approved by Admin	2026-06-02 18:15:00	2026-06-06 07:06:55.906
288	48	Task Completed	8	Task status updated to COMPLETED	2026-06-02 18:16:00	2026-06-06 07:06:55.906
289	49	Task Created	6	Task created for project Transporter	2026-06-02 09:30:00	2026-06-06 07:06:55.916
290	49	Work Started	6	Employee started working on Transporter	2026-06-02 10:00:00	2026-06-06 07:06:55.917
291	49	Progress Updated	6	Mid-day status: progressing on deliverables	2026-06-02 14:00:00	2026-06-06 07:06:55.918
292	49	Work Review Submitted	6	Task submission sent for approval	2026-06-02 17:55:00	2026-06-06 07:06:55.919
293	49	Review Approved	2	Review approved by Admin	2026-06-02 18:15:00	2026-06-06 07:06:55.919
294	49	Task Completed	6	Task status updated to COMPLETED	2026-06-02 18:16:00	2026-06-06 07:06:55.92
295	50	Task Created	10	Task created for project Sevastu	2026-06-02 09:30:00	2026-06-06 07:06:55.927
296	50	Work Started	10	Employee started working on Sevastu	2026-06-02 10:00:00	2026-06-06 07:06:55.928
297	50	Progress Updated	10	Mid-day status: progressing on deliverables	2026-06-02 14:00:00	2026-06-06 07:06:55.929
298	50	Work Review Submitted	10	Task submission sent for approval	2026-06-02 17:55:00	2026-06-06 07:06:55.93
299	50	Review Approved	2	Review approved by Admin	2026-06-02 18:15:00	2026-06-06 07:06:55.931
300	50	Task Completed	10	Task status updated to COMPLETED	2026-06-02 18:16:00	2026-06-06 07:06:55.933
301	51	Task Created	11	Task created for project IOT	2026-06-03 09:30:00	2026-06-06 07:06:55.941
302	51	Work Started	11	Employee started working on IOT	2026-06-03 10:00:00	2026-06-06 07:06:55.941
303	51	Progress Updated	11	Mid-day status: progressing on deliverables	2026-06-03 14:00:00	2026-06-06 07:06:55.942
304	51	Work Review Submitted	11	Task submission sent for approval	2026-06-03 17:55:00	2026-06-06 07:06:55.943
305	51	Review Approved	2	Review approved by Admin	2026-06-03 18:15:00	2026-06-06 07:06:55.943
306	51	Task Completed	11	Task status updated to COMPLETED	2026-06-03 18:16:00	2026-06-06 07:06:55.944
307	52	Task Created	5	Task created for project Task Management System	2026-06-03 09:30:00	2026-06-06 07:06:55.954
308	52	Work Started	5	Employee started working on Task Management System	2026-06-03 10:00:00	2026-06-06 07:06:55.956
309	52	Progress Updated	5	Mid-day status: progressing on deliverables	2026-06-03 14:00:00	2026-06-06 07:06:55.957
310	52	Work Review Submitted	5	Task submission sent for approval	2026-06-03 17:55:00	2026-06-06 07:06:55.957
311	52	Review Approved	2	Review approved by Admin	2026-06-03 18:15:00	2026-06-06 07:06:55.958
312	52	Task Completed	5	Task status updated to COMPLETED	2026-06-03 18:16:00	2026-06-06 07:06:55.959
313	53	Task Created	9	Task created for project ERP	2026-06-03 10:30:00	2026-06-06 07:06:55.968
314	53	Work Started	9	Employee started working on ERP	2026-06-03 11:00:00	2026-06-06 07:06:55.969
315	53	Progress Updated	9	Mid-day status: progressing on deliverables	2026-06-03 15:00:00	2026-06-06 07:06:55.97
316	53	Work Review Submitted	9	Task submission sent for approval	2026-06-03 16:55:00	2026-06-06 07:06:55.971
317	53	Review Approved	2	Review approved by Admin	2026-06-03 17:15:00	2026-06-06 07:06:55.972
318	53	Task Completed	9	Task status updated to COMPLETED	2026-06-03 17:16:00	2026-06-06 07:06:55.972
319	54	Task Created	7	Task created for project SHG	2026-06-03 09:30:00	2026-06-06 07:06:55.979
320	54	Work Started	7	Employee started working on SHG	2026-06-03 10:00:00	2026-06-06 07:06:55.981
321	54	Progress Updated	7	Mid-day status: progressing on deliverables	2026-06-03 14:00:00	2026-06-06 07:06:55.982
322	54	Work Review Submitted	7	Task submission sent for approval	2026-06-03 17:55:00	2026-06-06 07:06:55.983
323	54	Review Approved	2	Review approved by Admin	2026-06-03 18:15:00	2026-06-06 07:06:55.983
324	54	Task Completed	7	Task status updated to COMPLETED	2026-06-03 18:16:00	2026-06-06 07:06:55.984
325	55	Task Created	8	Task created for project Transporter	2026-06-03 09:30:00	2026-06-06 07:06:55.99
326	55	Work Started	8	Employee started working on Transporter	2026-06-03 10:00:00	2026-06-06 07:06:55.991
327	55	Progress Updated	8	Mid-day status: progressing on deliverables	2026-06-03 14:00:00	2026-06-06 07:06:55.991
328	55	Work Review Submitted	8	Task submission sent for approval	2026-06-03 17:55:00	2026-06-06 07:06:55.992
329	55	Review Approved	2	Review approved by Admin	2026-06-03 18:15:00	2026-06-06 07:06:55.992
330	55	Task Completed	8	Task status updated to COMPLETED	2026-06-03 18:16:00	2026-06-06 07:06:55.993
331	56	Task Created	6	Task created for project SHG	2026-06-03 09:30:00	2026-06-06 07:06:56.003
332	56	Work Started	6	Employee started working on SHG	2026-06-03 10:00:00	2026-06-06 07:06:56.004
333	56	Progress Updated	6	Mid-day status: progressing on deliverables	2026-06-03 14:00:00	2026-06-06 07:06:56.005
334	56	Work Review Submitted	6	Task submission sent for approval	2026-06-03 17:55:00	2026-06-06 07:06:56.006
335	56	Review Approved	2	Review approved by Admin	2026-06-03 18:15:00	2026-06-06 07:06:56.007
336	56	Task Completed	6	Task status updated to COMPLETED	2026-06-03 18:16:00	2026-06-06 07:06:56.008
337	57	Task Created	10	Task created for project SHG	2026-06-03 09:30:00	2026-06-06 07:06:56.019
338	57	Work Started	10	Employee started working on SHG	2026-06-03 10:00:00	2026-06-06 07:06:56.019
339	57	Progress Updated	10	Mid-day status: progressing on deliverables	2026-06-03 14:00:00	2026-06-06 07:06:56.02
340	57	Work Review Submitted	10	Task submission sent for approval	2026-06-03 17:55:00	2026-06-06 07:06:56.02
341	57	Review Approved	2	Review approved by Admin	2026-06-03 18:15:00	2026-06-06 07:06:56.021
342	57	Task Completed	10	Task status updated to COMPLETED	2026-06-03 18:16:00	2026-06-06 07:06:56.022
343	58	Task Created	10	Task created for project Transporter	2026-06-03 09:30:00	2026-06-06 07:06:56.027
344	58	Work Started	10	Employee started working on Transporter	2026-06-03 10:00:00	2026-06-06 07:06:56.027
345	58	Progress Updated	10	Mid-day status: progressing on deliverables	2026-06-03 14:00:00	2026-06-06 07:06:56.028
346	58	Work Review Submitted	10	Task submission sent for approval	2026-06-03 17:55:00	2026-06-06 07:06:56.032
347	58	Review Approved	2	Review approved by Admin	2026-06-03 18:15:00	2026-06-06 07:06:56.034
348	58	Task Completed	10	Task status updated to COMPLETED	2026-06-03 18:16:00	2026-06-06 07:06:56.035
349	59	Task Created	11	Task created for project IOT	2026-06-04 09:30:00	2026-06-06 07:06:56.042
350	59	Work Started	11	Employee started working on IOT	2026-06-04 10:00:00	2026-06-06 07:06:56.042
351	59	Progress Updated	11	Mid-day status: progressing on deliverables	2026-06-04 14:00:00	2026-06-06 07:06:56.043
352	59	Work Review Submitted	11	Task submission sent for approval	2026-06-04 17:55:00	2026-06-06 07:06:56.044
353	59	Review Approved	2	Review approved by Admin	2026-06-04 18:15:00	2026-06-06 07:06:56.045
354	59	Task Completed	11	Task status updated to COMPLETED	2026-06-04 18:16:00	2026-06-06 07:06:56.046
355	60	Task Created	5	Task created for project Task Management System	2026-06-04 09:30:00	2026-06-06 07:06:56.056
356	60	Work Started	5	Employee started working on Task Management System	2026-06-04 10:00:00	2026-06-06 07:06:56.057
217	37	Task Created	11	Task created for project IOT	2026-06-01 09:30:00	2026-06-06 07:06:55.752
218	37	Work Started	11	Employee started working on IOT	2026-06-01 10:00:00	2026-06-06 07:06:55.76
219	37	Progress Updated	11	Mid-day status: progressing on deliverables	2026-06-01 14:00:00	2026-06-06 07:06:55.761
220	37	Work Review Submitted	11	Task submission sent for approval	2026-06-01 17:55:00	2026-06-06 07:06:55.762
221	37	Review Approved	2	Review approved by Admin	2026-06-01 18:15:00	2026-06-06 07:06:55.764
222	37	Task Completed	11	Task status updated to COMPLETED	2026-06-01 18:16:00	2026-06-06 07:06:55.766
223	38	Task Created	5	Task created for project Task Management System	2026-06-01 09:30:00	2026-06-06 07:06:55.775
224	38	Work Started	5	Employee started working on Task Management System	2026-06-01 10:00:00	2026-06-06 07:06:55.776
225	38	Progress Updated	5	Mid-day status: progressing on deliverables	2026-06-01 14:00:00	2026-06-06 07:06:55.777
226	38	Work Review Submitted	5	Task submission sent for approval	2026-06-01 17:55:00	2026-06-06 07:06:55.777
227	38	Review Approved	2	Review approved by Admin	2026-06-01 18:15:00	2026-06-06 07:06:55.778
228	38	Task Completed	5	Task status updated to COMPLETED	2026-06-01 18:16:00	2026-06-06 07:06:55.778
229	39	Task Created	9	Task created for project ERP	2026-06-01 10:30:00	2026-06-06 07:06:55.791
230	39	Work Started	9	Employee started working on ERP	2026-06-01 11:00:00	2026-06-06 07:06:55.792
231	39	Progress Updated	9	Mid-day status: progressing on deliverables	2026-06-01 15:00:00	2026-06-06 07:06:55.793
232	39	Work Review Submitted	9	Task submission sent for approval	2026-06-01 16:55:00	2026-06-06 07:06:55.793
233	39	Review Approved	2	Review approved by Admin	2026-06-01 17:15:00	2026-06-06 07:06:55.794
234	39	Task Completed	9	Task status updated to COMPLETED	2026-06-01 17:16:00	2026-06-06 07:06:55.794
235	40	Task Created	8	Task created for project Transporter	2026-06-01 09:30:00	2026-06-06 07:06:55.805
236	40	Work Started	8	Employee started working on Transporter	2026-06-01 10:00:00	2026-06-06 07:06:55.806
237	40	Progress Updated	8	Mid-day status: progressing on deliverables	2026-06-01 14:00:00	2026-06-06 07:06:55.806
238	40	Work Review Submitted	8	Task submission sent for approval	2026-06-01 17:55:00	2026-06-06 07:06:55.807
239	40	Review Approved	2	Review approved by Admin	2026-06-01 18:15:00	2026-06-06 07:06:55.808
240	40	Task Completed	8	Task status updated to COMPLETED	2026-06-01 18:16:00	2026-06-06 07:06:55.809
241	41	Task Created	6	Task created for project SHG	2026-06-01 09:30:00	2026-06-06 07:06:55.82
242	41	Work Started	6	Employee started working on SHG	2026-06-01 10:00:00	2026-06-06 07:06:55.82
243	41	Progress Updated	6	Mid-day status: progressing on deliverables	2026-06-01 14:00:00	2026-06-06 07:06:55.821
244	41	Work Review Submitted	6	Task submission sent for approval	2026-06-01 17:55:00	2026-06-06 07:06:55.822
245	41	Review Approved	2	Review approved by Admin	2026-06-01 18:15:00	2026-06-06 07:06:55.822
246	41	Task Completed	6	Task status updated to COMPLETED	2026-06-01 18:16:00	2026-06-06 07:06:55.823
247	42	Task Created	10	Task created for project SHG	2026-06-01 09:30:00	2026-06-06 07:06:55.832
248	42	Work Started	10	Employee started working on SHG	2026-06-01 10:00:00	2026-06-06 07:06:55.834
249	42	Progress Updated	10	Mid-day status: progressing on deliverables	2026-06-01 14:00:00	2026-06-06 07:06:55.835
250	42	Work Review Submitted	10	Task submission sent for approval	2026-06-01 17:55:00	2026-06-06 07:06:55.835
251	42	Review Approved	2	Review approved by Admin	2026-06-01 18:15:00	2026-06-06 07:06:55.836
252	42	Task Completed	10	Task status updated to COMPLETED	2026-06-01 18:16:00	2026-06-06 07:06:55.837
253	43	Task Created	10	Task created for project Transporter	2026-06-01 09:30:00	2026-06-06 07:06:55.841
254	43	Work Started	10	Employee started working on Transporter	2026-06-01 10:00:00	2026-06-06 07:06:55.842
255	43	Progress Updated	10	Mid-day status: progressing on deliverables	2026-06-01 14:00:00	2026-06-06 07:06:55.843
256	43	Work Review Submitted	10	Task submission sent for approval	2026-06-01 17:55:00	2026-06-06 07:06:55.843
257	43	Review Approved	2	Review approved by Admin	2026-06-01 18:15:00	2026-06-06 07:06:55.844
258	43	Task Completed	10	Task status updated to COMPLETED	2026-06-01 18:16:00	2026-06-06 07:06:55.845
259	44	Task Created	11	Task created for project IOT	2026-06-02 09:30:00	2026-06-06 07:06:55.854
260	44	Work Started	11	Employee started working on IOT	2026-06-02 10:00:00	2026-06-06 07:06:55.854
261	44	Progress Updated	11	Mid-day status: progressing on deliverables	2026-06-02 14:00:00	2026-06-06 07:06:55.855
262	44	Work Review Submitted	11	Task submission sent for approval	2026-06-02 17:55:00	2026-06-06 07:06:55.856
263	44	Review Approved	2	Review approved by Admin	2026-06-02 18:15:00	2026-06-06 07:06:55.856
264	44	Task Completed	11	Task status updated to COMPLETED	2026-06-02 18:16:00	2026-06-06 07:06:55.857
265	45	Task Created	5	Task created for project Task Management System	2026-06-02 09:30:00	2026-06-06 07:06:55.865
266	45	Work Started	5	Employee started working on Task Management System	2026-06-02 10:00:00	2026-06-06 07:06:55.867
267	45	Progress Updated	5	Mid-day status: progressing on deliverables	2026-06-02 14:00:00	2026-06-06 07:06:55.868
268	45	Work Review Submitted	5	Task submission sent for approval	2026-06-02 17:55:00	2026-06-06 07:06:55.869
269	45	Review Approved	2	Review approved by Admin	2026-06-02 18:15:00	2026-06-06 07:06:55.869
270	45	Task Completed	5	Task status updated to COMPLETED	2026-06-02 18:16:00	2026-06-06 07:06:55.87
271	46	Task Created	9	Task created for project ERP	2026-06-02 10:30:00	2026-06-06 07:06:55.877
272	46	Work Started	9	Employee started working on ERP	2026-06-02 11:00:00	2026-06-06 07:06:55.878
273	46	Progress Updated	9	Mid-day status: progressing on deliverables	2026-06-02 15:00:00	2026-06-06 07:06:55.879
274	46	Work Review Submitted	9	Task submission sent for approval	2026-06-02 16:55:00	2026-06-06 07:06:55.88
275	46	Review Approved	2	Review approved by Admin	2026-06-02 17:15:00	2026-06-06 07:06:55.882
276	46	Task Completed	9	Task status updated to COMPLETED	2026-06-02 17:16:00	2026-06-06 07:06:55.883
277	47	Task Created	7	Task created for project SHG	2026-06-02 09:30:00	2026-06-06 07:06:55.891
278	47	Work Started	7	Employee started working on SHG	2026-06-02 10:00:00	2026-06-06 07:06:55.892
279	47	Progress Updated	7	Mid-day status: progressing on deliverables	2026-06-02 14:00:00	2026-06-06 07:06:55.892
280	47	Work Review Submitted	7	Task submission sent for approval	2026-06-02 17:55:00	2026-06-06 07:06:55.893
281	47	Review Approved	2	Review approved by Admin	2026-06-02 18:15:00	2026-06-06 07:06:55.894
282	47	Task Completed	7	Task status updated to COMPLETED	2026-06-02 18:16:00	2026-06-06 07:06:55.894
283	48	Task Created	8	Task created for project Transporter	2026-06-02 09:30:00	2026-06-06 07:06:55.904
284	48	Work Started	8	Employee started working on Transporter	2026-06-02 10:00:00	2026-06-06 07:06:55.904
285	48	Progress Updated	8	Mid-day status: progressing on deliverables	2026-06-02 14:00:00	2026-06-06 07:06:55.905
286	48	Work Review Submitted	8	Task submission sent for approval	2026-06-02 17:55:00	2026-06-06 07:06:55.905
357	60	Progress Updated	5	Mid-day status: progressing on deliverables	2026-06-04 14:00:00	2026-06-06 07:06:56.057
358	60	Work Review Submitted	5	Task submission sent for approval	2026-06-04 17:55:00	2026-06-06 07:06:56.058
359	60	Review Approved	2	Review approved by Admin	2026-06-04 18:15:00	2026-06-06 07:06:56.059
360	60	Task Completed	5	Task status updated to COMPLETED	2026-06-04 18:16:00	2026-06-06 07:06:56.06
361	61	Task Created	9	Task created for project ERP	2026-06-04 10:30:00	2026-06-06 07:06:56.07
362	61	Work Started	9	Employee started working on ERP	2026-06-04 11:00:00	2026-06-06 07:06:56.071
363	61	Progress Updated	9	Mid-day status: progressing on deliverables	2026-06-04 15:00:00	2026-06-06 07:06:56.071
364	61	Work Review Submitted	9	Task submission sent for approval	2026-06-04 16:55:00	2026-06-06 07:06:56.072
365	61	Review Approved	2	Review approved by Admin	2026-06-04 17:15:00	2026-06-06 07:06:56.073
366	61	Task Completed	9	Task status updated to COMPLETED	2026-06-04 17:16:00	2026-06-06 07:06:56.073
367	62	Task Created	7	Task created for project SHG	2026-06-04 09:30:00	2026-06-06 07:06:56.084
368	62	Work Started	7	Employee started working on SHG	2026-06-04 10:00:00	2026-06-06 07:06:56.085
369	62	Progress Updated	7	Mid-day status: progressing on deliverables	2026-06-04 14:00:00	2026-06-06 07:06:56.086
370	62	Work Review Submitted	7	Task submission sent for approval	2026-06-04 17:55:00	2026-06-06 07:06:56.087
371	62	Review Approved	2	Review approved by Admin	2026-06-04 18:15:00	2026-06-06 07:06:56.087
372	62	Task Completed	7	Task status updated to COMPLETED	2026-06-04 18:16:00	2026-06-06 07:06:56.088
373	63	Task Created	10	Task created for project SHG	2026-06-04 09:30:00	2026-06-06 07:06:56.097
374	63	Work Started	10	Employee started working on SHG	2026-06-04 10:00:00	2026-06-06 07:06:56.098
375	63	Progress Updated	10	Mid-day status: progressing on deliverables	2026-06-04 14:00:00	2026-06-06 07:06:56.099
376	63	Work Review Submitted	10	Task submission sent for approval	2026-06-04 17:55:00	2026-06-06 07:06:56.1
377	63	Review Approved	2	Review approved by Admin	2026-06-04 18:15:00	2026-06-06 07:06:56.101
378	63	Task Completed	10	Task status updated to COMPLETED	2026-06-04 18:16:00	2026-06-06 07:06:56.102
379	64	Task Created	10	Task created for project Transporter	2026-06-04 09:30:00	2026-06-06 07:06:56.106
380	64	Work Started	10	Employee started working on Transporter	2026-06-04 10:00:00	2026-06-06 07:06:56.107
381	64	Progress Updated	10	Mid-day status: progressing on deliverables	2026-06-04 14:00:00	2026-06-06 07:06:56.107
382	64	Work Review Submitted	10	Task submission sent for approval	2026-06-04 17:55:00	2026-06-06 07:06:56.108
383	64	Review Approved	2	Review approved by Admin	2026-06-04 18:15:00	2026-06-06 07:06:56.108
384	64	Task Completed	10	Task status updated to COMPLETED	2026-06-04 18:16:00	2026-06-06 07:06:56.109
385	65	Task Created	11	Task created for project IOT	2026-06-05 09:30:00	2026-06-06 07:06:56.123
386	65	Work Started	11	Employee started working on IOT	2026-06-05 10:00:00	2026-06-06 07:06:56.124
387	65	Progress Updated	11	Mid-day status: progressing on deliverables	2026-06-05 14:00:00	2026-06-06 07:06:56.124
388	65	Work Review Submitted	11	Task submission sent for approval	2026-06-05 17:55:00	2026-06-06 07:06:56.125
389	65	Review Approved	2	Review approved by Admin	2026-06-05 18:15:00	2026-06-06 07:06:56.125
390	65	Task Completed	11	Task status updated to COMPLETED	2026-06-05 18:16:00	2026-06-06 07:06:56.126
391	66	Task Created	5	Task created for project Task Management System	2026-06-05 09:30:00	2026-06-06 07:06:56.137
392	66	Work Started	5	Employee started working on Task Management System	2026-06-05 10:00:00	2026-06-06 07:06:56.137
393	66	Progress Updated	5	Mid-day status: progressing on deliverables	2026-06-05 14:00:00	2026-06-06 07:06:56.138
394	66	Work Review Submitted	5	Task submission sent for approval	2026-06-05 17:55:00	2026-06-06 07:06:56.139
395	66	Review Approved	2	Review approved by Admin	2026-06-05 18:15:00	2026-06-06 07:06:56.139
396	66	Task Completed	5	Task status updated to COMPLETED	2026-06-05 18:16:00	2026-06-06 07:06:56.141
397	67	Task Created	9	Task created for project ERP	2026-06-05 10:30:00	2026-06-06 07:06:56.151
398	67	Work Started	9	Employee started working on ERP	2026-06-05 11:00:00	2026-06-06 07:06:56.151
399	67	Progress Updated	9	Mid-day status: progressing on deliverables	2026-06-05 15:00:00	2026-06-06 07:06:56.152
400	67	Work Review Submitted	9	Task submission sent for approval	2026-06-05 16:55:00	2026-06-06 07:06:56.152
401	67	Review Approved	2	Review approved by Admin	2026-06-05 17:15:00	2026-06-06 07:06:56.153
402	67	Task Completed	9	Task status updated to COMPLETED	2026-06-05 17:16:00	2026-06-06 07:06:56.154
403	68	Task Created	7	Task created for project SHG	2026-06-05 09:30:00	2026-06-06 07:06:56.16
404	68	Work Started	7	Employee started working on SHG	2026-06-05 10:00:00	2026-06-06 07:06:56.161
405	68	Progress Updated	7	Mid-day status: progressing on deliverables	2026-06-05 14:00:00	2026-06-06 07:06:56.161
406	68	Work Review Submitted	7	Task submission sent for approval	2026-06-05 17:55:00	2026-06-06 07:06:56.163
407	68	Review Approved	2	Review approved by Admin	2026-06-05 18:15:00	2026-06-06 07:06:56.164
408	68	Task Completed	7	Task status updated to COMPLETED	2026-06-05 18:16:00	2026-06-06 07:06:56.165
409	69	Task Created	6	Task created for project SHG	2026-06-05 09:30:00	2026-06-06 07:06:56.174
410	69	Work Started	6	Employee started working on SHG	2026-06-05 10:00:00	2026-06-06 07:06:56.174
411	69	Progress Updated	6	Mid-day status: progressing on deliverables	2026-06-05 14:00:00	2026-06-06 07:06:56.175
412	69	Work Review Submitted	6	Task submission sent for approval	2026-06-05 17:55:00	2026-06-06 07:06:56.175
413	69	Review Approved	2	Review approved by Admin	2026-06-05 18:15:00	2026-06-06 07:06:56.176
414	69	Task Completed	6	Task status updated to COMPLETED	2026-06-05 18:16:00	2026-06-06 07:06:56.176
415	70	Task Created	10	Task created for project SHG	2026-06-05 09:30:00	2026-06-06 07:06:56.185
416	70	Work Started	10	Employee started working on SHG	2026-06-05 10:00:00	2026-06-06 07:06:56.186
417	70	Progress Updated	10	Mid-day status: progressing on deliverables	2026-06-05 14:00:00	2026-06-06 07:06:56.187
418	70	Work Review Submitted	10	Task submission sent for approval	2026-06-05 17:55:00	2026-06-06 07:06:56.187
419	70	Review Approved	2	Review approved by Admin	2026-06-05 18:15:00	2026-06-06 07:06:56.188
420	70	Task Completed	10	Task status updated to COMPLETED	2026-06-05 18:16:00	2026-06-06 07:06:56.188
421	71	Task Created	10	Task created for project Transporter	2026-06-05 09:30:00	2026-06-06 07:06:56.193
422	71	Work Started	10	Employee started working on Transporter	2026-06-05 10:00:00	2026-06-06 07:06:56.194
423	71	Progress Updated	10	Mid-day status: progressing on deliverables	2026-06-05 14:00:00	2026-06-06 07:06:56.194
424	71	Work Review Submitted	10	Task submission sent for approval	2026-06-05 17:55:00	2026-06-06 07:06:56.195
425	71	Review Approved	2	Review approved by Admin	2026-06-05 18:15:00	2026-06-06 07:06:56.197
426	71	Task Completed	10	Task status updated to COMPLETED	2026-06-05 18:16:00	2026-06-06 07:06:56.198
\.


--
-- Data for Name: TaskUpdate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TaskUpdate" (id, "taskProjectId", "statusBefore", "statusAfter", remarks, "screenshotUrl", "deletedAt", "createdAt", "updatedAt") FROM stdin;
37	37	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-01 18:00:00	2026-06-06 07:06:55.745
38	38	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-01 18:00:00	2026-06-06 07:06:55.773
39	39	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-01 17:00:00	2026-06-06 07:06:55.787
40	40	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-01 18:00:00	2026-06-06 07:06:55.802
41	41	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-01 18:00:00	2026-06-06 07:06:55.818
42	42	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-01 18:00:00	2026-06-06 07:06:55.828
43	43	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-01 18:00:00	2026-06-06 07:06:55.839
44	44	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-02 18:00:00	2026-06-06 07:06:55.852
45	45	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-02 18:00:00	2026-06-06 07:06:55.862
46	46	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-02 17:00:00	2026-06-06 07:06:55.875
47	47	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-02 18:00:00	2026-06-06 07:06:55.889
48	48	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-02 18:00:00	2026-06-06 07:06:55.902
49	49	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-02 18:00:00	2026-06-06 07:06:55.912
50	50	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-02 18:00:00	2026-06-06 07:06:55.925
51	51	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-03 18:00:00	2026-06-06 07:06:55.938
52	52	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-03 18:00:00	2026-06-06 07:06:55.952
53	53	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-03 17:00:00	2026-06-06 07:06:55.965
54	54	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-03 18:00:00	2026-06-06 07:06:55.977
55	55	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-03 18:00:00	2026-06-06 07:06:55.989
56	56	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-03 18:00:00	2026-06-06 07:06:56
57	57	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-03 18:00:00	2026-06-06 07:06:56.015
58	58	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-03 18:00:00	2026-06-06 07:06:56.025
59	59	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-04 18:00:00	2026-06-06 07:06:56.039
60	60	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-04 18:00:00	2026-06-06 07:06:56.054
61	61	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-04 17:00:00	2026-06-06 07:06:56.068
62	62	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-04 18:00:00	2026-06-06 07:06:56.079
63	63	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-04 18:00:00	2026-06-06 07:06:56.094
64	64	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-04 18:00:00	2026-06-06 07:06:56.104
65	65	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-05 18:00:00	2026-06-06 07:06:56.121
66	66	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-05 18:00:00	2026-06-06 07:06:56.134
67	67	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-05 17:00:00	2026-06-06 07:06:56.149
68	68	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-05 18:00:00	2026-06-06 07:06:56.159
69	69	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-05 18:00:00	2026-06-06 07:06:56.172
70	70	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-05 18:00:00	2026-06-06 07:06:56.183
71	71	PENDING	COMPLETED	Evening review submitted	\N	\N	2026-06-05 18:00:00	2026-06-06 07:06:56.19
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, password, name, role, "deletedAt", "createdAt", "updatedAt", "mobileNumber", "jobRole") FROM stdin;
1	superadmin@gmark.com	$2b$10$OFUfw7Jwtaxzjjs7dSKf2.nKlkBAs4JuAi8MJBeFHIDcinSxGhN1i	Super Admin	SUPER_ADMIN	\N	2026-06-06 06:53:18.142	2026-06-06 07:06:34.907	\N	\N
2	admin@gmark.com	$2b$10$OFUfw7Jwtaxzjjs7dSKf2.CBirorxo6ypcArpcEZbnpNYbgE1nEO6	Admin	ADMIN	\N	2026-06-06 06:53:18.211	2026-06-06 07:06:34.975	\N	\N
5	sadwaita2001@gmail.com	$2b$10$XKP5xT/8bYTtik2oXi.HKenM/mMzYY6nOfknVwepLXWBzBv7IaVmi	Adwaita Shinde	EMPLOYEE	\N	2026-06-06 06:54:04.948	2026-06-06 07:06:45.746	8459722082	Frontend Developer
6	ghatgevallabh03@gmail.com	$2b$10$ES2YkkPthTS2vt8BLrVqY.cSVZACv7EFUYhu7nkEkwZd/re9O3qvC	Vallabh Ghatge	EMPLOYEE	\N	2026-06-06 06:54:05.015	2026-06-06 07:06:45.804	7057914950	Frontend Developer
7	mahadev.smp1@gmail.com	$2b$10$ALuMF2Jnm6.UwZ1lAt2c6.Gqh6q5Xkd3QN6f5kqKqYR7ZGVdTCRlC	Mahadev Patil	EMPLOYEE	\N	2026-06-06 06:54:05.087	2026-06-06 07:06:45.862	8484830180	Frontend Developer
8	mahendrapowar07@gmail.com	$2b$10$ICIgNovLGfInDE8vI5KXheDpax6iC8S5CPvGDE1iNdkieBkMD2ove	Mahendra Powar	EMPLOYEE	\N	2026-06-06 06:54:05.151	2026-06-06 07:06:45.919	9860157649	Frontend Developer
9	vaishnavichandilkar26@gmail.com	$2b$10$iNe37/CAu71GLixHkmXCw.CFm6PZqJICj6zWRikrf/dNGjNe3pcwm	Vaishnavi Chandilkar	EMPLOYEE	\N	2026-06-06 06:54:05.215	2026-06-06 07:06:45.98	7019387579	Full Stack Developer
10	shridharpatil723@gmail.com	$2b$10$CP2c0T/vMCq.CATpEORorOcIm7f9YYI3VAVIbMucsGznb7sVd6o..	Shridhar Patil	EMPLOYEE	\N	2026-06-06 06:54:05.283	2026-06-06 07:06:46.044	8494833669	Full Stack Developer
11	riteshhonule@gmail.com	$2b$10$Jw2xHY908I0lTdg8kCEpjeJo4IAS1gL0H09oMzA7qdXf.U5MJQio.	Ritesh Honule	EMPLOYEE	\N	2026-06-06 06:54:05.349	2026-06-06 07:06:46.102	8861120023	Full Stack Developer
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
6595d1c7-3ab2-48aa-9490-4c402d6efec6	0358cd88e6270e107401d2c141b3c9cacc591865dcff86f721f9f60d481695a8	2026-06-06 12:23:15.570975+05:30	20260601071003	\N	\N	2026-06-06 12:23:15.417926+05:30	1
e5b8ccec-74cd-4e76-b0ea-f55041aeb838	3250f62a70dd7d8917c6ea46d4d3186df580d02724cfd4b3b325cddb7658ad72	2026-06-06 12:23:15.574268+05:30	20260601073815_y	\N	\N	2026-06-06 12:23:15.571592+05:30	1
36afacb7-5c6d-43e4-a2a0-a58c1952b019	ee033939868bda0ae01d9d93a394bd4a1ebd2dc63f48deb4d4c106520ed3f33c	2026-06-06 12:23:15.590993+05:30	20260601092554_s	\N	\N	2026-06-06 12:23:15.574739+05:30	1
edd55a4d-e0ca-450e-b12a-581c73482f52	f3eae2f6ecbce6c544351ad80c2d608edaf069f29684b86fc221a70e7da68f72	2026-06-06 12:23:15.598787+05:30	20260601102514_s	\N	\N	2026-06-06 12:23:15.591553+05:30	1
30d1135f-2c32-444d-8a0b-6521a182b29e	8592d85202654e775bdc7e43231cfdbe6b925f2252660170fd67fe8f84981590	2026-06-06 12:23:15.607062+05:30	20260601113208_add_mobile_number	\N	\N	2026-06-06 12:23:15.599222+05:30	1
fbac7430-8660-4b36-be5b-fa3bcea91451	b28efc54c78e586182393e7c3bbe76df86913d26777c9c9332d491e153db18f5	2026-06-06 12:23:15.609242+05:30	20260602052831_s	\N	\N	2026-06-06 12:23:15.607553+05:30	1
9513e478-f3c0-4f48-a015-673154b1ccc9	a9327580b602c6e036bc97b3a66f21318fd4c38dc795ccd19fa1ef131298ed8d	2026-06-06 12:23:15.611398+05:30	20260602055502_s	\N	\N	2026-06-06 12:23:15.609571+05:30	1
de6239c1-ca91-4972-8452-d424823cdaae	fe41c11f8f5b7c77ffdfc1474100b7cf0735bdaf05ef04dc4ff34876a7718659	2026-06-06 12:23:15.616696+05:30	20260602093022_s	\N	\N	2026-06-06 12:23:15.611915+05:30	1
25883980-851e-4bd4-b1ad-e0a7f2ee57bf	bbdf7cfeb5a51164dd7fba45004e065f02d3979c0e1ade912cd3f3a07805d92f	2026-06-06 12:23:15.62414+05:30	20260602110335_s	\N	\N	2026-06-06 12:23:15.617022+05:30	1
efb14c65-b154-46e7-abc4-88288e6ccfe3	4d35fe3cf4e10284d983d5967370275d543cf4ba8bcdd05b6688e89f49ff0747	2026-06-06 12:23:15.632818+05:30	20260603100416_add_password_reset_token	\N	\N	2026-06-06 12:23:15.624546+05:30	1
39ff31ac-04ce-4498-8851-9afefff4b63e	ab329d167adaa11f5d216910b97e005014ca70f45862e728543f102747f7ca92	2026-06-06 12:23:15.639394+05:30	20260604091030_s	\N	\N	2026-06-06 12:23:15.633191+05:30	1
eeb3631f-3f09-4b5b-be29-489483e61b9c	d14316cb880cbf0c17070c9bb1173095891309852b9060e2596a52c8eacb359a	2026-06-06 12:23:15.670295+05:30	20260606050053_add_job_role	\N	\N	2026-06-06 12:23:15.639806+05:30	1
\.


--
-- Name: ActivityLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ActivityLog_id_seq"', 2, true);


--
-- Name: AnnouncementAck_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AnnouncementAck_id_seq"', 1, false);


--
-- Name: Announcement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Announcement_id_seq"', 1, false);


--
-- Name: Attachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Attachment_id_seq"', 1, false);


--
-- Name: Leave_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Leave_id_seq"', 4, true);


--
-- Name: MessageResponse_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."MessageResponse_id_seq"', 1, false);


--
-- Name: Message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Message_id_seq"', 1, false);


--
-- Name: NotificationToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."NotificationToken_id_seq"', 1, false);


--
-- Name: Notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Notification_id_seq"', 1, false);


--
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PasswordResetToken_id_seq"', 1, false);


--
-- Name: ProjectAllocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ProjectAllocation_id_seq"', 1, false);


--
-- Name: Project_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Project_id_seq"', 8, true);


--
-- Name: TaskApproval_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TaskApproval_id_seq"', 71, true);


--
-- Name: TaskCarryForward_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TaskCarryForward_id_seq"', 1, false);


--
-- Name: TaskProject_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TaskProject_id_seq"', 71, true);


--
-- Name: TaskProof_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TaskProof_id_seq"', 1, false);


--
-- Name: TaskRevision_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TaskRevision_id_seq"', 1, false);


--
-- Name: TaskSubmission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TaskSubmission_id_seq"', 71, true);


--
-- Name: TaskTimeline_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TaskTimeline_id_seq"', 426, true);


--
-- Name: TaskUpdate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TaskUpdate_id_seq"', 71, true);


--
-- Name: Task_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Task_id_seq"', 62, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 20, true);


--
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id);


--
-- Name: AnnouncementAck AnnouncementAck_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AnnouncementAck"
    ADD CONSTRAINT "AnnouncementAck_pkey" PRIMARY KEY (id);


--
-- Name: Announcement Announcement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY (id);


--
-- Name: Attachment Attachment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_pkey" PRIMARY KEY (id);


--
-- Name: Leave Leave_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Leave"
    ADD CONSTRAINT "Leave_pkey" PRIMARY KEY (id);


--
-- Name: MessageResponse MessageResponse_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MessageResponse"
    ADD CONSTRAINT "MessageResponse_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: NotificationToken NotificationToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NotificationToken"
    ADD CONSTRAINT "NotificationToken_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);


--
-- Name: ProjectAllocation ProjectAllocation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectAllocation"
    ADD CONSTRAINT "ProjectAllocation_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: TaskApproval TaskApproval_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskApproval"
    ADD CONSTRAINT "TaskApproval_pkey" PRIMARY KEY (id);


--
-- Name: TaskCarryForward TaskCarryForward_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskCarryForward"
    ADD CONSTRAINT "TaskCarryForward_pkey" PRIMARY KEY (id);


--
-- Name: TaskProject TaskProject_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskProject"
    ADD CONSTRAINT "TaskProject_pkey" PRIMARY KEY (id);


--
-- Name: TaskProof TaskProof_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskProof"
    ADD CONSTRAINT "TaskProof_pkey" PRIMARY KEY (id);


--
-- Name: TaskRevision TaskRevision_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskRevision"
    ADD CONSTRAINT "TaskRevision_pkey" PRIMARY KEY (id);


--
-- Name: TaskSubmission TaskSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskSubmission"
    ADD CONSTRAINT "TaskSubmission_pkey" PRIMARY KEY (id);


--
-- Name: TaskTimeline TaskTimeline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskTimeline"
    ADD CONSTRAINT "TaskTimeline_pkey" PRIMARY KEY (id);


--
-- Name: TaskUpdate TaskUpdate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskUpdate"
    ADD CONSTRAINT "TaskUpdate_pkey" PRIMARY KEY (id);


--
-- Name: Task Task_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: NotificationToken_fcmToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "NotificationToken_fcmToken_key" ON public."NotificationToken" USING btree ("fcmToken");


--
-- Name: PasswordResetToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON public."PasswordResetToken" USING btree (token);


--
-- Name: ProjectAllocation_projectId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProjectAllocation_projectId_userId_key" ON public."ProjectAllocation" USING btree ("projectId", "userId");


--
-- Name: Project_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Project_name_key" ON public."Project" USING btree (name);


--
-- Name: Task_carryForwardedFromId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Task_carryForwardedFromId_key" ON public."Task" USING btree ("carryForwardedFromId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: ActivityLog ActivityLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AnnouncementAck AnnouncementAck_announcementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AnnouncementAck"
    ADD CONSTRAINT "AnnouncementAck_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES public."Announcement"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AnnouncementAck AnnouncementAck_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AnnouncementAck"
    ADD CONSTRAINT "AnnouncementAck_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Announcement Announcement_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Attachment Attachment_leaveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES public."Leave"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Attachment Attachment_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Attachment Attachment_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Leave Leave_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Leave"
    ADD CONSTRAINT "Leave_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Leave Leave_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Leave"
    ADD CONSTRAINT "Leave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MessageResponse MessageResponse_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MessageResponse"
    ADD CONSTRAINT "MessageResponse_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MessageResponse MessageResponse_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MessageResponse"
    ADD CONSTRAINT "MessageResponse_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public."Message"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Message Message_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NotificationToken NotificationToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NotificationToken"
    ADD CONSTRAINT "NotificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PasswordResetToken PasswordResetToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectAllocation ProjectAllocation_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectAllocation"
    ADD CONSTRAINT "ProjectAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectAllocation ProjectAllocation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectAllocation"
    ADD CONSTRAINT "ProjectAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskApproval TaskApproval_reviewerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskApproval"
    ADD CONSTRAINT "TaskApproval_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskApproval TaskApproval_taskSubmissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskApproval"
    ADD CONSTRAINT "TaskApproval_taskSubmissionId_fkey" FOREIGN KEY ("taskSubmissionId") REFERENCES public."TaskSubmission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskProject TaskProject_adminCommentUpdatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskProject"
    ADD CONSTRAINT "TaskProject_adminCommentUpdatedById_fkey" FOREIGN KEY ("adminCommentUpdatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskProject TaskProject_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskProject"
    ADD CONSTRAINT "TaskProject_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskProject TaskProject_assignedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskProject"
    ADD CONSTRAINT "TaskProject_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskProject TaskProject_assignedToUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskProject"
    ADD CONSTRAINT "TaskProject_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskProject TaskProject_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskProject"
    ADD CONSTRAINT "TaskProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskProject TaskProject_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskProject"
    ADD CONSTRAINT "TaskProject_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskProof TaskProof_taskSubmissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskProof"
    ADD CONSTRAINT "TaskProof_taskSubmissionId_fkey" FOREIGN KEY ("taskSubmissionId") REFERENCES public."TaskSubmission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskRevision TaskRevision_reviewerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskRevision"
    ADD CONSTRAINT "TaskRevision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskRevision TaskRevision_taskSubmissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskRevision"
    ADD CONSTRAINT "TaskRevision_taskSubmissionId_fkey" FOREIGN KEY ("taskSubmissionId") REFERENCES public."TaskSubmission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskSubmission TaskSubmission_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskSubmission"
    ADD CONSTRAINT "TaskSubmission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskSubmission TaskSubmission_taskProjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskSubmission"
    ADD CONSTRAINT "TaskSubmission_taskProjectId_fkey" FOREIGN KEY ("taskProjectId") REFERENCES public."TaskProject"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskTimeline TaskTimeline_performedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskTimeline"
    ADD CONSTRAINT "TaskTimeline_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskTimeline TaskTimeline_taskProjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskTimeline"
    ADD CONSTRAINT "TaskTimeline_taskProjectId_fkey" FOREIGN KEY ("taskProjectId") REFERENCES public."TaskProject"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskUpdate TaskUpdate_taskProjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TaskUpdate"
    ADD CONSTRAINT "TaskUpdate_taskProjectId_fkey" FOREIGN KEY ("taskProjectId") REFERENCES public."TaskProject"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Task Task_carryForwardedFromId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_carryForwardedFromId_fkey" FOREIGN KEY ("carryForwardedFromId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict hiP3DQxdYKlKuTO1hX2ihjfwbajMRzRKsunQH5CwcBOkHuT9KvR6SwfwydxD9JD

