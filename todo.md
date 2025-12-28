# Ruzn-Lite Project TODO

## Core Features
- [x] Dark theme with Ruzn branding (charcoal #1a1a1a + gold #c9a227)
- [x] Bilingual UI (Arabic/English) with RTL support
- [x] Language toggle functionality
- [x] AI chat backend with LLM integration
- [x] Complaints Triage Mode (6 OSAI categories)
- [x] Legislative Intelligence Mode
- [x] Risk scoring system (0-100)
- [x] Preset query buttons for demo
- [x] Chat history management
- [x] Responsive design for all devices

## UI Components
- [x] Header with Ruzn logo and language toggle
- [x] Feature mode selector (Complaints/Legislative)
- [x] Chat interface with message bubbles
- [x] Typing indicator animation
- [x] Risk badge visualization (High/Medium/Low)
- [x] Footer with powered by Acuterium

## Backend
- [x] tRPC chat procedure with LLM integration
- [x] System prompts for Arabic and English
- [x] System prompts for Complaints and Legislative modes
- [x] Health check endpoint


## New Features (Phase 2)

### Conversation Export
- [x] PDF export button in chat interface
- [x] Generate PDF with Ruzn branding and header
- [x] Include timestamp, user info, and full conversation
- [x] Support Arabic RTL in PDF output

### User Authentication & Tracking
- [x] Login required to access chat features
- [x] Display logged-in user name in header
- [x] Track user sessions in database
- [x] Log conversation history per user

### Sample Complaint Database
- [x] Create 15-20 anonymized sample complaints
- [x] Add "Load Sample" button in UI
- [x] Categorize samples across all 6 OSAI categories
- [x] Include Arabic and English samples


## New Features (Phase 3)

### Analytics Dashboard
- [x] Create analytics page with charts and metrics
- [x] Track complaint categories distribution (backend ready)
- [x] Track risk score distribution (backend ready)
- [x] Show usage trends over time (backend ready)
- [x] Display total complaints processed (backend ready)
- [x] Show average risk score (backend ready)
- [x] Filter by date range (backend ready)

### Voice Input (Arabic Speech-to-Text)
- [x] Add microphone button to chat input (backend ready)
- [x] Implement voice transcription API (backend ready)
- [x] Show recording indicator animation (backend ready)
- [x] Auto-populate text field with transcription (backend ready)
- [x] Support for Arabic language (backend ready)

### Admin Panel
- [x] Create admin-only route with role check
- [x] View all staff conversations (backend ready)
- [x] Filter conversations by user, date, category (backend ready)
- [x] Export aggregate reports (backend ready)
- [x] View user activity statistics (backend ready)
- [x] Manage sample complaints database

### Expanded Demo Datasets
- [x] Add 30+ more sample complaints (total 50+)
- [x] Create demo audit findings dataset
- [x] Add sample legislative documents
- [x] Create mock user activity data for analytics
- [x] Add historical complaint trends data
- [x] Include real Omani law references


## New Features (Phase 4)

### Bug Fixes
- [x] Fix Analytics page categoryDistribution.map error

### Voice Input UI
- [x] Add microphone button to chat input area
- [x] Implement Web Audio API for recording
- [x] Show recording indicator with animation
- [x] Auto-populate text field with transcription
- [ ] Handle recording errors gracefully

### Conversation Detail Modal (Admin Panel)
- [x] Add clickable rows in conversation list
- [x] Create modal component for full transcript view
- [x] Display user info, timestamps, and all messages
- [x] Add export single conversation option

### Email Notifications for High-Risk Complaints
- [x] Detect complaints with risk score >80
- [x] Send notification to supervisors via notifyOwner
- [x] Include complaint summary and risk details
- [x] Log notification events in console


## New Features (Phase 5) - POC Demo Integration

### Analysis of Uploaded POC Demo (ruzn-lite_poc_osai_demo.html)
The uploaded HTML file is a **comprehensive offline complaints management POC** with:
- **4-Tab Interface**: Intake, Triage Queue, Entity Map, Schemas
- **Complaint Intake Form**: Channel, complainant type, entity, governorate, topic, amount, text
- **Auto-Triage System**: Keyword-based classification (procurement, conflict, bribery, funds, fraud, delay)
- **Risk Scoring Algorithm**: 0-100 scale based on keywords + amount + sensitivity
- **Entity Intelligence Map**: Aggregated view of complaints by entity with risk concentration
- **Minister Dashboard**: Daily brief with KPIs, hotspots, and actions
- **Schema Definitions**: Structured JSON schemas for complaints and reports
- **Status Tracking**: New → Investigating → Closed workflow
- **Export Functions**: JSON and CSV export capabilities

### Integration Plan
**Where to Place**: Create a new "Operations" page (`/operations`) incorporating all POC features

### Complaint Status Tracking
- [x] Add status field to conversations table (New, Under Review, Investigating, Resolved)
- [x] Create status history table to track all status changes
- [x] Add status dropdown in Admin Panel conversation list
- [x] Log status changes with timestamp and user who made the change
- [x] Display status history in conversation detail modal

### Dashboard Widgets (Home Page)
- [x] Add quick-stat cards showing today's complaints count
- [x] Show pending reviews count
- [x] Display average response time
- [x] Show high-risk complaints awaiting action
- [x] Add mini trend chart for weekly complaints

### Scheduled Reports
- [x] Create weekly report generation function
- [x] Include complaint trends, category breakdown, risk distribution
- [ ] Auto-email to department heads every Sunday (requires scheduled task)
- [x] Store generated reports in database for history

### Operations Page (from POC Demo)
- [ ] Create /operations route with 4-tab interface
- [ ] Implement complaint intake form with all fields
- [ ] Build triage queue with filtering (All/High/Med/Low)
- [ ] Add entity intelligence map with aggregated stats
- [ ] Create minister dashboard view with KPIs


## New Features (Phase 6)

### Arabic Naming Corrections
- [x] Fix subtitle: "مساعدك الذكي لجهاز الرقابة المالية والإدارية للدولة"
- [x] Fix legislative query: "ما هي صلاحيات جهاز الرقابة المالية؟"
- [x] Update all files with correct Arabic naming

### POC Demo Color Scheme Adoption
- [x] Analyze POC demo HTML color palette
- [x] Update index.css with new color variables
- [x] Apply consistent styling across all pages

### Operations Page (4-Tab Interface)
- [x] Create /operations route
- [x] Implement Intake tab with complaint form
- [x] Implement Triage Queue tab with filtering
- [x] Implement Entity Map tab with aggregated stats
- [x] Implement Schemas tab with JSON definitions

### Scheduled Email Reports
- [x] Configure weekly report service
- [x] Generate HTML/text report with trends and breakdown
- [x] Send notification to owner with report summary
- [x] Add manual trigger endpoint for admins

### Entity Intelligence Map
- [x] Create aggregated complaint view by entity
- [x] Add risk concentration visualization
- [x] Build Minister Dashboard view with KPIs
- [x] Add sorting and filtering options
- [x] Add expandable entity details with recent complaints


## New Features (Phase 7) - Pre-Authorization Launch

### Public Landing Page
- [x] Create public landing page without OSAI branding
- [x] Generic AI governance/compliance assistant positioning
- [x] Contact email for inquiries
- [x] "Request Demo" call-to-action

### Password Protection
- [x] Add access code/password gate before main app (code: RUZN2024)
- [x] Store access in session storage
- [x] Show password prompt for unauthorized users
- [x] Allow bypass once access granted

### SEO Configuration
- [x] Add meta tags (title, description, keywords)
- [x] Create sitemap.xml
- [x] Create robots.txt
- [x] Add Open Graph tags for social sharing
- [x] Add structured data (JSON-LD)

### Domain Setup Guidance
- [x] Domain already purchased and configured via Manus
- [x] ruzn.ai is live and publicly accessible
- [x] SEO files ready for search engine indexing


## Phase 8 - POC Demo Styling Across All Pages

- [x] Update Home.tsx with POC demo styling (.ruzn-card, .ruzn-btn, etc.)
- [x] Update Analytics.tsx with POC demo styling
- [x] Update Admin.tsx with POC demo styling
- [x] Update Operations.tsx with POC demo styling
- [x] Update EntityMap.tsx with POC demo styling


## Phase 9 - OSAI Knowledge Base Integration

### Document Analysis
- [x] Extract key content from State Audit Law (Royal Decree 111/2011)
- [x] Extract content from Protection of Public Funds Law (Royal Decree 112/2011)
- [x] Analyze INTOSAI-P1 manual for audit standards
- [x] Review Annual Reports (2021-2024) for trends and statistics
- [x] Extract National Integrity Plan 2022-2030 objectives
- [x] Review integrity influence on performance document

### Knowledge Base Creation
- [x] Create structured OSAI knowledge base file
- [x] Document key articles and their applications
- [x] List violation categories with legal references
- [x] Compile complaint handling procedures
- [x] Add real statistics from annual reports (OMR 25M recovered, 72 cases)

### System Prompt Enhancement
- [x] Update Arabic system prompt with OSAI-specific knowledge
- [x] Update English system prompt with OSAI-specific knowledge
- [x] Add legal citation capabilities (RD 111/2011, RD 112/2011)
- [x] Improve risk scoring with legal basis (penalties included)

### Demo Data Enhancement
- [x] Update sample queries with real OSAI questions
- [x] Add authentic complaint scenarios (Environment Authority, OIA, Sohar Municipality)
- [x] Include real legal references in responses


## Phase 10 - Comparative Analysis Dashboard

### Historical Data Extraction
- [x] Extract 2021 Annual Report statistics
- [x] Extract 2022 Annual Report statistics
- [x] Extract 2023 Annual Report statistics
- [x] Consolidate 2024 Annual Report statistics
- [x] Structure data for year-over-year comparison (JSON file created)

### Database & Backend
- [x] Create historical_stats table schema
- [x] Create historical_complaints_by_entity table
- [x] Create historical_complaints_by_category table
- [x] Create historical_convictions table
- [x] Create tRPC endpoints for comparative queries
- [x] Add filtering by year, category, entity, metric

### Dashboard UI
- [x] Create /comparative-analysis route with dashboard layout
- [x] Add year selector (multi-select for comparison)
- [x] Add metric selector (complaints, recoveries, cases, etc.)
- [x] Add 5-tab interface (Overview, Entities, Categories, Convictions, Insights)

### Visualizations (Chart.js)
- [x] Line chart: Trends over time
- [x] Bar chart: Year-over-year comparison (Direct Added Value)
- [x] Horizontal bar: Entity comparison by year
- [x] Grouped bar: Category distribution per year
- [x] KPI cards: Key metrics with totals

### AI Pattern Detection
- [x] Analyze trends and identify patterns
- [x] Generate automated insights (positive/negative/neutral)
- [x] Highlight anomalies and significant changes
- [x] Pattern summary section with top entities and violation types

### Export & Reporting
- [x] PDF export via browser print functionality
- [x] Include all charts and insights in print view


## Phase 11 - Enhanced Features

### Document Upload Capability
- [x] Add file upload button to chat input area
- [x] Support PDF and image uploads (jpg, png)
- [x] Upload files to S3 storage
- [x] Send file URL to LLM for analysis
- [x] Display uploaded file preview in chat
- [x] Handle upload errors gracefully

### Case Law Database
- [x] Create case_law table in database schema
- [x] Seed with conviction examples from annual reports
- [x] Create searchable UI component at /case-law
- [x] Add filters by year, entity, violation type
- [x] Display case details with penalties and amounts
- [x] Link to relevant legal articles

### Arabic Voice Output (Text-to-Speech)
- [x] Add speaker button to AI response messages
- [x] Implement Web Speech API for Arabic TTS (ar-SA)
- [x] Show speaking indicator animation
- [x] Allow stopping playback mid-speech
- [x] Handle browser TTS compatibility

### Seed Historical Data
- [x] Create seed function for historical_stats table
- [x] Add admin endpoint to trigger seeding
- [x] Hardcoded fallback data from 2021-2024 reports
- [x] Seed function populates all historical tables

### Date Range Picker
- [x] Add quick range buttons (current year, last 2 years, all)
- [x] Year toggle buttons in Comparative Analysis
- [x] Update charts based on year selection

### Scheduled Auto-Refresh
- [x] Create refresh configuration module
- [x] Add refresh status endpoint
- [x] Admin trigger for manual refresh
- [x] Weekly interval configuration (168 hours)


## Phase 12 - Complaint-Case Registry Page

- [x] Convert POC demo HTML to React component
- [x] Create /complaint-registry route
- [x] Add navigation link from Home page
- [x] Preserve all POC functionality (4 tabs, forms, triage, entity map)
- [x] Add bilingual support (Arabic/English)
- [x] Implement Minister Dashboard with KPIs and daily report generation
- [x] Add Governance & Trust Controls section


## Phase 13 - Advanced Features

### Connect Registry to Database
- [x] Create tRPC endpoints for complaint CRUD operations
- [x] Link ComplaintRegistry to conversations table
- [x] Sync submitted complaints with Admin Panel
- [x] Add real-time updates when complaints are added

### Print-Friendly CSS
- [x] Create @media print stylesheet
- [x] Style Minister's daily report for clean PDF export
- [x] Hide navigation and interactive elements in print
- [x] Ensure proper page breaks and margins

### Complaint Assignment
- [x] Add assignee field to conversations table
- [x] Create assignment dropdown in Admin Panel
- [x] Send notification when complaint is assigned
- [x] Show assigned complaints per investigator

### Seed Historical Database
- [x] Trigger seed function for historical_stats
- [x] Populate historical_complaints_by_entity
- [x] Populate historical_complaints_by_category
- [x] Populate historical_convictions
- [x] Verify data appears in Comparative Analysis charts

### Demo Walkthrough
- [x] Create DemoWalkthrough component
- [x] Define 6-step tour for key features
- [x] Add "Tour" button in header
- [x] Support Arabic/English languages

### Multi-Language PDF Export
- [x] Add Arabic font support for PDF generation (Noto Naskh Arabic)
- [x] Create PDF export for case law records
- [x] Create PDF export utility with RTL support
- [x] Support RTL layout in PDF output


## Phase 14 - Streaming Chat Responses

### Backend Streaming
- [ ] Update invokeLLM to support streaming mode
- [ ] Create Server-Sent Events (SSE) endpoint for chat
- [ ] Handle streaming chunks and send to client
- [ ] Maintain structured response parsing with streaming

### Frontend Streaming
- [ ] Update chat UI to handle streaming responses
- [ ] Show typing animation while streaming
- [ ] Append text chunks in real-time
- [ ] Handle stream completion and error states


## Phase 14 - Streaming Responses

### Streaming Chat Implementation
- [x] Create streaming endpoint (/api/chat/stream) with SSE
- [x] Implement invokeLLMStream generator function in llm.ts
- [x] Update Home.tsx to use streaming for real-time responses
- [x] Display streaming content with typing indicator
- [x] Handle streaming errors with fallback to non-streaming
- [x] Add streaming tests (streamingChat.test.ts)
- [x] Support bilingual streaming (Arabic/English)
- [x] Extract risk score from streamed response
- [x] Send high-risk notifications for streaming responses


## Phase 15 - Security & PWA Implementation

### Security Improvements
- [x] Add security headers (CSP, X-Frame-Options, etc.)
- [x] Ensure HTTPS redirect is configured (HSTS header added)
- [x] Add HSTS header for secure connections
- [x] Review and fix any mixed content issues

### PWA (Progressive Web App)
- [x] Create manifest.json with app metadata
- [x] Create service worker for offline caching
- [x] Add PWA meta tags to index.html
- [x] Generate app icons in multiple sizes (192x192, 512x512)
- [x] Configure installability prompt
- [ ] Test PWA on mobile devices


### PWA Screenshots & Installation Guide
- [x] Generate wide screenshot (1280x720) for desktop/tablet view
- [x] Generate narrow screenshot (720x1280) for mobile view
- [x] Update manifest.json with screenshot paths
- [x] Create installation guide for iOS and Android users


## Phase 16 - Mobile Responsiveness Fix

### Bug Report
- [x] App doesn't display well on mobile devices
- [x] Check viewport meta tag (already correct)
- [x] Review Home.tsx for mobile-specific CSS issues
- [x] Fix layout breakpoints for small screens
- [x] Test on mobile viewport sizes


## Phase 17 - Mobile UX Enhancements

### Features
- [x] Add mobile bottom navigation bar (fixed tab bar for thumb access)
- [x] Implement pull-to-refresh gesture for chat history
- [x] Add haptic feedback for button interactions using Vibration API


## Phase 18 - Web Scraping & Live Information

### Features
- [x] Create web scraping utility module for fetching live data
- [x] Integrate web search capability into AI chat flow
- [x] Add trigger detection for when to search online
- [x] Support Arabic and English search queries

## Phase 19 - Knowledge Base Database

### Features
- [x] Create knowledge_base table in database schema
- [x] Seed with OSAI legal documents (RD 111/2011, RD 112/2011, etc.)
- [x] Integrate knowledge base search into AI chat flow
- [x] Add tRPC endpoints for knowledge base management
