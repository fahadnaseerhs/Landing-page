# tethr Booking Landing Page

A mobile-responsive, production-ready landing page for **tethr** (technical Employer of Record) built using HTML5, Vanilla CSS, and Node.js. 

It implements a three-state animated flow:
1. **State 1: Qualifying Form**: Captures candidate requirements.
2. **State 2: Custom Calendar Widget**: Displays available weekdays (excluding weekends) for booking 30-minute consultation slots.
3. **State 3: Branded Thank You State**: Confirms the booking.

Submissions are persisted to a spreadsheet format and dispatched as formatted notification emails to internal teams.

---

## 🚀 Local Development

### 1. Installation
Install the required packages:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
PORT=3000

# SMTP settings for real email dispatch (optional: falls back to logging to data/notification_logs.txt)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
SMTP_FROM=tethr Landing Page <your-email@gmail.com>

# Google Sheet webhook URL (optional: see below for setup)
GOOGLE_SHEET_WEBHOOK_URL=
```

### 3. Run the Server
Start the server:
```bash
npm start
```
Open **http://localhost:3000** in your browser. All submissions will be written locally to `data/submissions.csv` (which opens natively in Microsoft Excel).

---

## ⚡ Deployment to Vercel (Production)

This project is configured out-of-the-box for **Vercel** via `vercel.json`.

### 1. Set Up Google Sheets Webhook (100% Free Persistent Storage)
Since Vercel Serverless functions have an ephemeral filesystem, writing to a local CSV file will reset when the container spins down. To persist submissions forever, set up a Google Sheet webhook:

1. Open a new **Google Sheet**.
2. Go to **Extensions** -> **Apps Script**.
3. Clear the default code and paste the following script:
   ```javascript
   function doPost(e) {
     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     var data = JSON.parse(e.postData.contents);
     
     // Write header if sheet is empty
     if (sheet.getLastRow() === 0) {
       sheet.appendRow([
         "Submission ID", "Timestamp", "Name", "Position", "Company", "Email",
         "Team", "Hardest Challenge", "Hires Count", "Timeline", "Booked Date", "Booked Time"
       ]);
     }
     
     if (data.action === "submit") {
       sheet.appendRow([
         data.submissionId,
         new Date(),
         data.name,
         data.position,
         data.company,
         data.email,
         data.team,
         data.hardestPart,
         data.hiresCount,
         data.timeline,
         "", // Booked Date
         ""  // Booked Time
       ]);
       return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
     } 
     
     if (data.action === "book") {
       var rows = sheet.getDataRange().getValues();
       for (var i = 1; i < rows.length; i++) {
         if (rows[i][0] === data.submissionId) {
           sheet.getRange(i + 1, 11).setValue(data.date); // Column K (11) is Booked Date
           sheet.getRange(i + 1, 12).setValue(data.time); // Column L (12) is Booked Time
           break;
         }
       }
       return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
     }
   }
   ```
4. Click **Deploy** -> **New deployment**.
5. Select **Type**: **Web app**.
6. Set **Execute as**: **Me**.
7. Set **Who has access**: **Anyone**.
8. Click **Deploy**, authorize permissions, and copy the **Web app URL** (e.g. `https://script.google.com/macros/s/xxxx/exec`).

### 2. Deploy to Vercel
1. Push your project to GitHub.
2. Open Vercel dashboard and click **Add New Project**.
3. Select your repository and import it.
4. Add the following **Environment Variables** in Vercel settings:
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = `hsfahadnaseer@gmail.com`
   - `SMTP_PASS` = `qucx epjr tiza noqa`
   - `SMTP_FROM` = `tethr Landing Page <hsfahadnaseer@gmail.com>`
   - `GOOGLE_SHEET_WEBHOOK_URL` = *(The Web app URL you copied in Step 1)*
5. Click **Deploy**. Vercel will build it and serve your landing page. Submissions will be sent to your Google Sheet and your email inbox automatically.
