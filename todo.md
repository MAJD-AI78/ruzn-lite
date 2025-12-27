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
