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
