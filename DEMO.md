# BRM Renewal Calendar - Demo Workflow

This document outlines the demo workflow for the BRM Renewal Calendar application.

## Setup and Start

1. **Set your OpenRouter API key:**
   ```bash
   # Edit .env file and add your OPENROUTER_API_KEY
   cp .env.example .env
   # Add: OPENROUTER_API_KEY=your_actual_api_key_here
   ```

2. **Start the application:**
   ```bash
   docker compose up --build
   ```

3. **Verify it's running:**
   ```bash
   python3 test_app.py
   ```

## Demo Steps

### 1. Upload Phase (http://localhost:5173/upload)
- **Action**: Drag and drop 2-3 sample PDFs from your local `SampleData/` folder (or any PDFs you have)
- **What to show**: 
  - Drag-and-drop interface
  - File upload progress and status
  - Success/failure indicators per file
- **Expected result**: Files show "Success" status after AI processing

### 2. Contracts Review Phase (http://localhost:5173/contracts)
- **Action**: Navigate to Contracts page
- **What to show**:
  - Table showing extracted contract data
  - AI-extracted dates (start, end, renewal, notice period)
  - Computed notice deadline (automatic calculation)
  - Edit functionality - click pencil icon on any row
- **Demo edit**: 
  - Edit a contract's renewal date or notice period
  - Show how notice deadline updates automatically
  - Save changes

### 3. Calendar View Phase (http://localhost:5173/calendar)
- **Action**: Navigate to Calendar page
- **What to show**:
  - Calendar with color-coded events:
    - Red: Notice deadlines (urgent)
    - Blue: Renewal dates
    - Orange: Expiration dates
  - Month view and List view toggle
  - Click on calendar event to see details popup
- **Highlight**: Different event types and their business meaning

#### Export/Share
- Click "Export" to:
  - Download `.ics` with optional reminder days
  - Email `.ics` to recipients (configure `SMTP_*` envs if you want to demo email)

## Key Points to Demonstrate

### Technical Excellence
1. **AI Integration**: Real-time PDF processing with GPT-4 via OpenRouter
2. **Data Validation**: Robust date parsing and normalization 
3. **Computed Fields**: Automatic notice deadline calculation
4. **Professional UI**: Material Design components with responsive layout

### Business Value
1. **Problem Solving**: Addresses real contract management pain points
2. **User Experience**: Simple upload → review → visualize workflow
3. **Data Accuracy**: Editable AI extractions with immediate feedback
4. **Visual Timeline**: Clear view of upcoming obligations and deadlines

### Engineering Quality
1. **Full-Stack Architecture**: Clean separation between API and UI
2. **Type Safety**: TypeScript throughout frontend
3. **Error Handling**: Graceful degradation when processing fails
4. **Documentation**: Comprehensive README and inline API docs

## Expected Demo Timeline (5-7 minutes)

- **0-1 min**: Quick overview of the problem and solution
- **1-3 min**: Upload workflow demonstration
- **3-5 min**: Contracts page and editing demonstration  
- **5-6 min**: Calendar view and event details
- **6-7 min**: Wrap up with technical highlights and next steps

## Potential Issues and Solutions

**Issue**: PDF processing fails
- **Solution**: Use the edit feature to manually enter data, show the manual override capability

**Issue**: AI extracts wrong dates
- **Solution**: Demonstrate the edit workflow to correct inaccurate extractions

**Issue**: OpenRouter API timeout
- **Solution**: Show previously uploaded contracts and focus on calendar/editing functionality

## Follow-up Questions to Address

- **Scalability**: How would this handle 100s of contracts?
- **Accuracy**: How do you ensure AI extraction quality?  
- **Integration**: How would this fit into existing contract workflows?
- **Security**: How would you handle sensitive contract data?

---

**Quick Start for Demo:**
```bash
# 1. Set API key in .env
# 2. docker compose up --build  
# 3. Visit http://localhost:5173
# 4. Upload sample PDFs, review data, view calendar
```