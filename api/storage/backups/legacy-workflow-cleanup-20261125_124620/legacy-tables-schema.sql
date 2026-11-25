--
-- PostgreSQL database dump
--

\restrict gLBamh9a9XRZlkQIb4QCOBGv80KaVAtcsUHOvDyjQYPA1dneHdNC7l28KbWR4IG

-- Dumped from database version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)
-- Dumped by pg_dump version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)

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

SET default_table_access_method = heap;

--
-- Name: DocumentRelease; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentRelease" (
    id text NOT NULL,
    "documentId" text NOT NULL,
    "releasedById" text NOT NULL,
    "releasedToId" text,
    method public."ReleaseMethod" NOT NULL,
    "recipientName" text,
    notes text,
    "releasedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DocumentRelease" OWNER TO postgres;

--
-- Name: DocumentReview; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentReview" (
    id text NOT NULL,
    "documentId" text NOT NULL,
    "reviewerId" text NOT NULL,
    action public."ReviewActionKind" NOT NULL,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DocumentReview" OWNER TO postgres;

--
-- Name: DocumentRoutingStep; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentRoutingStep" (
    id text NOT NULL,
    "documentId" text NOT NULL,
    sequence integer NOT NULL,
    "fromOfficeId" text NOT NULL,
    "fromUserId" text,
    "toOfficeId" text NOT NULL,
    "toUserId" text,
    instructions text,
    status public."RoutingStepStatus" DEFAULT 'pending'::public."RoutingStepStatus" NOT NULL,
    "receivedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DocumentRoutingStep" OWNER TO postgres;

--
-- Name: DocumentRelease DocumentRelease_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentRelease"
    ADD CONSTRAINT "DocumentRelease_pkey" PRIMARY KEY (id);


--
-- Name: DocumentReview DocumentReview_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentReview"
    ADD CONSTRAINT "DocumentReview_pkey" PRIMARY KEY (id);


--
-- Name: DocumentRoutingStep DocumentRoutingStep_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentRoutingStep"
    ADD CONSTRAINT "DocumentRoutingStep_pkey" PRIMARY KEY (id);


--
-- Name: DocumentRelease_documentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DocumentRelease_documentId_idx" ON public."DocumentRelease" USING btree ("documentId");


--
-- Name: DocumentReview_documentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DocumentReview_documentId_idx" ON public."DocumentReview" USING btree ("documentId");


--
-- Name: DocumentReview_reviewerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DocumentReview_reviewerId_idx" ON public."DocumentReview" USING btree ("reviewerId");


--
-- Name: DocumentRoutingStep_documentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DocumentRoutingStep_documentId_idx" ON public."DocumentRoutingStep" USING btree ("documentId");


--
-- Name: DocumentRoutingStep_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DocumentRoutingStep_status_idx" ON public."DocumentRoutingStep" USING btree (status);


--
-- Name: DocumentRelease DocumentRelease_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentRelease"
    ADD CONSTRAINT "DocumentRelease_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentReview DocumentReview_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentReview"
    ADD CONSTRAINT "DocumentReview_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentRoutingStep DocumentRoutingStep_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentRoutingStep"
    ADD CONSTRAINT "DocumentRoutingStep_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict gLBamh9a9XRZlkQIb4QCOBGv80KaVAtcsUHOvDyjQYPA1dneHdNC7l28KbWR4IG

