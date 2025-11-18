# 🧪 TAILOR Testing Guide

## 🚀 Quick Start

```bash
# Make sure all dependencies are installed
npm install

# Start the development server
npm run dev

# Open your browser
open http://localhost:3000
```

---

## ✅ Complete Test Workflow

### 1. Authentication Test (2 minutes)

**Steps:**
1. Navigate to http://localhost:3000
2. Click "Sign In" button
3. Authenticate with your Google account
4. Verify you're redirected to `/dashboard`

**Expected Results:**
- ✅ Google OAuth popup appears
- ✅ After authentication, redirected to dashboard
- ✅ Your email appears in the sidebar
- ✅ Console logs show authentication success

**Console Logs to Watch For:**
```
🔐 Auth Status: { status: 'authenticated', hasSession: true }
🏠 Landing Page - User: { email: 'your@email.com' }
```

---

### 2. Document Upload Test (3 minutes)

**Steps:**
1. Click "Documents" in the sidebar
2. Click or drag-drop a PDF or DOCX resume
3. Wait for upload to complete
4. Check that document appears in the list

**Expected Results:**
- ✅ Upload progress indicator shows
- ✅ Document appears with "completed" status badge
- ✅ Shows file type, size, and upload date
- ✅ Green badge indicates successful parsing

**Console Logs to Watch For:**
```
📤 Upload API - POST request received
🔐 Upload API - User authenticated: ✅
📄 Parsing document...
✅ Document parsed, text length: 5234
📤 Uploading to Gemini Files API...
✅ File uploaded to Gemini: files/abc123
✅ Document updated in database
```

**Troubleshooting:**
- If status shows "failed" → Check console for parsing errors
- If no Gemini upload → Check GEMINI_API_KEY is set
- If unauthorized → Check authentication session

---

### 3. Resume Generation Test (5 minutes)

**Steps:**
1. Click "Generate Resume" in sidebar
2. Fill in the form:
   - **Job Title:** e.g., "Senior Software Engineer"
   - **Company:** e.g., "Google"
   - **Job Description:** Paste a real job description (100+ words)
3. Select a template (Modern, Classic, or Technical)
4. Click "Generate Resume"
5. Wait for generation (may take 10-30 seconds)
6. Verify redirect to "My Resumes" page

**Expected Results:**
- ✅ Generation button shows "Generating..."
- ✅ Redirected to resumes page after completion
- ✅ New resume appears with highlight border
- ✅ Shows job title, company, and ATS score
- ✅ Template badge displays correctly

**Console Logs to Watch For:**
```
💼 Jobs API - POST request received
✅ Job created
⚡ Generate API - POST request received
📄 Using documents: { fileUris: 1, parsedDocs: 1 }
⚡ Generating tailored resume...
✅ Resume generated successfully
```

**Troubleshooting:**
- If "No documents found" → Upload a document first
- If generation fails → Check GEMINI_API_KEY
- If slow → Gemini API may be rate-limited

---

### 4. Resume Download Test (1 minute)

**Steps:**
1. On "My Resumes" page, locate your generated resume
2. Click the "Download" button
3. Wait for download to complete
4. Open the downloaded DOCX file

**Expected Results:**
- ✅ Download button shows "Downloading..."
- ✅ DOCX file downloads automatically
- ✅ Filename includes job title and template name
- ✅ File opens in Word/Google Docs/LibreOffice
- ✅ Content is properly formatted
- ✅ Sections include: Summary, Experience, Skills, etc.

**Console Logs to Watch For:**
```
📥 Downloading resume: abc-123
📥 Download API - GET request for resume: abc-123
📄 Generating DOCX for resume...
✅ DOCX generated: Senior_Software_Engineer_modern.docx
```

**Verify DOCX Content:**
- [ ] Professional summary is present
- [ ] Work experience is formatted with bullets
- [ ] Skills section is included
- [ ] Dates and companies are correct
- [ ] No fabricated information

---

### 5. Chat Test (2 minutes)

**Steps:**
1. Click "Chat" in sidebar
2. Try these prompts:
   - "Summarize my work experience"
   - "What are my strongest skills?"
   - "Suggest improvements for my resume"
3. Verify AI responds with relevant information

**Expected Results:**
- ✅ Message appears in chat immediately
- ✅ Loading dots appear while AI responds
- ✅ AI response references your actual documents
- ✅ Conversation history is maintained
- ✅ Auto-scrolls to latest message

**Console Logs to Watch For:**
```
💬 Chat API - POST request received
📄 Using documents: { fileUris: 1, parsedDocs: 1 }
✅ Chat response generated
```

---

### 6. Profile Test (1 minute)

**Steps:**
1. Click "Profile" in sidebar
2. Verify email is pre-filled (from Google)
3. Fill in additional fields:
   - Full Name
   - Phone
   - Location
   - LinkedIn URL
4. Click "Save Changes"

**Expected Results:**
- ✅ Email field is disabled (linked to Google)
- ✅ Account ID is displayed
- ✅ AI settings show green checkmarks
- ✅ Save button shows "Saving..." then success
- ✅ Alert shows "Profile saved!"

**Note:** Profile persistence to database is placeholder. Future enhancement will save to Supabase `profiles` table.

---

## 🔍 Verification Checklist

After completing all tests, verify:

### Database (Supabase)
```sql
-- Check user record
SELECT * FROM users WHERE email = 'your@email.com';

-- Check uploaded documents
SELECT file_name, parse_status FROM documents;

-- Check job descriptions
SELECT title, company FROM jobs;

-- Check generated resumes
SELECT id, template FROM resume_versions;

-- Check ATS scores
SELECT resume_version_id, score FROM ats_scores;
```

### Files (Supabase Storage)
- Go to Storage → `resumes` bucket
- Verify your uploaded files are there

---

## 🐛 Common Issues & Fixes

### Issue: "Unauthorized" Error
**Fix:**
```bash
# Restart dev server
npm run dev

# Clear browser cookies
# Sign in again
```

### Issue: Document Upload Fails
**Fix:**
- Check file type is PDF or DOCX
- Check file size < 10MB
- Verify SUPABASE_SERVICE_ROLE_KEY is set

### Issue: Gemini Upload Fails
**Fix:**
- Verify GEMINI_API_KEY is valid
- Check Gemini API quota
- Review console logs for specific error

### Issue: Resume Generation Slow
**Cause:** Gemini API processing time
**Normal:** 10-30 seconds
**If > 60 seconds:** Check API rate limits

### Issue: Download Button Does Nothing
**Fix:**
- Check browser console for errors
- Verify resume ID in URL
- Ensure authentication is valid

---

## 📊 Performance Benchmarks

| Action | Expected Time | Notes |
|--------|--------------|-------|
| Sign In | 2-5 seconds | Depends on Google OAuth |
| Upload Document | 5-15 seconds | Includes parsing + Gemini upload |
| Generate Resume | 10-30 seconds | Gemini API processing |
| Download Resume | 1-2 seconds | DOCX generation is fast |
| Chat Response | 3-10 seconds | Depends on prompt complexity |

---

## 🎯 Success Criteria

Your application is working correctly if:

1. ✅ You can sign in with Google
2. ✅ Documents upload and parse successfully
3. ✅ Resume generation completes without errors
4. ✅ Downloaded DOCX files open and display correctly
5. ✅ Chat responds with relevant information
6. ✅ All console logs show ✅ checkmarks
7. ✅ No error messages in browser console
8. ✅ Database records are created

---

## 📝 Test Results Template

```markdown
## Test Session: [DATE]

### Authentication
- Sign In: ✅/❌
- Session Persistence: ✅/❌
- Sign Out: ✅/❌

### Documents
- PDF Upload: ✅/❌
- DOCX Upload: ✅/❌
- Document List: ✅/❌
- Parsing: ✅/❌

### Resume Generation
- Job Creation: ✅/❌
- Resume Generation: ✅/❌
- ATS Scoring: ✅/❌

### Download
- DOCX Export: ✅/❌
- File Opens: ✅/❌
- Content Correct: ✅/❌

### Chat
- Send Message: ✅/❌
- Receive Response: ✅/❌
- Context Accuracy: ✅/❌

### Profile
- View: ✅/❌
- Edit: ✅/❌
- Save: ✅/❌

### Overall Status: ✅ PASS / ❌ FAIL

### Notes:
[Any issues or observations]
```

---

## 🎉 You're Ready!

The application has been fully developed and is ready for testing. Follow this guide step-by-step and report any issues you encounter.

**Happy Testing! 🚀**

