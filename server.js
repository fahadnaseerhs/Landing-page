const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

const CSV_PATH = path.join(__dirname, 'data', 'submissions.csv');
const LOGS_PATH = path.join(__dirname, 'data', 'notification_logs.txt');
const EMAILS_CONFIG_PATH = path.join(__dirname, 'config', 'notification_emails.json');

// Ensure directory structure
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Helper to escape fields for CSV format
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  return `"${String(val).replace(/"/g, '""')}"`;
}

// Simple CSV line parser that respects double quotes
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Allowed values for form dropdowns to perform strict server-side validation
const ALLOWED_TEAMS = ['Engineering / Tech', 'Product', 'Data', 'Other'];
const ALLOWED_HARDEST_PARTS = [
  'Cost is too high',
  'Takes too long to find good people',
  'Compliance / legal complexity',
  'Replacing people who leave',
  "Haven't started hiring yet, just exploring"
];
const ALLOWED_HIRES_COUNTS = ['1', '2-5', '6-10', '10+'];
const ALLOWED_TIMELINES = ['ASAP', 'Within a month', 'Just exploring'];

// Helper to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Initialize CSV file with headers if it doesn't exist
function initCsv() {
  if (!fs.existsSync(CSV_PATH)) {
    const headers = [
      'Submission ID',
      'Timestamp',
      'Name',
      'Position',
      'Company Name',
      'Email',
      'Team',
      'Hardest Part',
      'Hires Count',
      'Timeline',
      'Booked Date',
      'Booked Time'
    ].map(escapeCsv).join(',') + '\n';
    fs.writeFileSync(CSV_PATH, headers, 'utf8');
  }
}
initCsv();

// POST /api/submit: Validates and saves form submissions
app.post('/api/submit', (req, res) => {
  const { name, position, company, email, team, hardestPart, hiresCount, timeline } = req.body;
  const errors = {};

  // Server-side validation
  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.name = 'Name is required';
  }
  if (!position || typeof position !== 'string' || position.trim() === '') {
    errors.position = 'Position/Title is required';
  }
  if (!company || typeof company !== 'string' || company.trim() === '') {
    errors.company = 'Company name is required';
  }
  if (!email || !isValidEmail(email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!team || !ALLOWED_TEAMS.includes(team)) {
    errors.team = 'Please select a team option';
  }
  if (!hardestPart || !ALLOWED_HARDEST_PARTS.includes(hardestPart)) {
    errors.hardestPart = 'Please select a hiring challenge option';
  }
  if (!hiresCount || !ALLOWED_HIRES_COUNTS.includes(hiresCount)) {
    errors.hiresCount = 'Please select the number of hires';
  }
  if (!timeline || !ALLOWED_TIMELINES.includes(timeline)) {
    errors.timeline = 'Please select a hiring timeline';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const submissionId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const timestamp = new Date().toISOString();

  // Create CSV row
  const row = [
    submissionId,
    timestamp,
    name.trim(),
    position.trim(),
    company.trim(),
    email.trim(),
    team,
    hardestPart,
    hiresCount,
    timeline,
    '', // Booked Date initially empty
    ''  // Booked Time initially empty
  ].map(escapeCsv).join(',') + '\n';

  try {
    fs.appendFileSync(CSV_PATH, row, 'utf8');
    return res.json({ success: true, submissionId });
  } catch (err) {
    console.error('Error writing to CSV:', err);
    return res.status(500).json({ success: false, message: 'Server failed to save submission' });
  }
});

// POST /api/book-slot: Binds the booking slot details and sends notification emails
app.post('/api/book-slot', async (req, res) => {
  const { submissionId, date, time } = req.body;

  if (!submissionId || !date || !time) {
    return res.status(400).json({ success: false, message: 'Missing booking details' });
  }

  try {
    if (!fs.existsSync(CSV_PATH)) {
      return res.status(404).json({ success: false, message: 'No submissions found' });
    }

    // Read and update the CSV row matching submissionId
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csvContent.split('\n');
    let updated = false;
    let submissionData = null;

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const columns = parseCsvLine(lines[i]);
      // Remove double quotes wrapping submissionId
      const idVal = columns[0].replace(/^"|"$/g, '');
      if (idVal === submissionId) {
        // Update Booked Date (index 10) and Booked Time (index 11)
        columns[10] = date;
        columns[11] = time;
        lines[i] = columns.map(escapeCsv).join(',');
        updated = true;

        // Gather clean values for sending email
        submissionData = {
          id: idVal,
          timestamp: columns[1].replace(/^"|"$/g, ''),
          name: columns[2].replace(/^"|"$/g, ''),
          position: columns[3].replace(/^"|"$/g, ''),
          company: columns[4].replace(/^"|"$/g, ''),
          email: columns[5].replace(/^"|"$/g, ''),
          team: columns[6].replace(/^"|"$/g, ''),
          hardestPart: columns[7].replace(/^"|"$/g, ''),
          hiresCount: columns[8].replace(/^"|"$/g, ''),
          timeline: columns[9].replace(/^"|"$/g, ''),
          bookedDate: date,
          bookedTime: time
        };
        break;
      }
    }

    if (!updated || !submissionData) {
      return res.status(404).json({ success: false, message: 'Submission ID not found' });
    }

    // Write updated lines back to file
    fs.writeFileSync(CSV_PATH, lines.join('\n'), 'utf8');

    // Load internal email notification list
    let recipients = ['hsfahadnaseer@gmail.com', 'hr@tethrhq.com', 'saad@tethrhq.com'];
    if (fs.existsSync(EMAILS_CONFIG_PATH)) {
      try {
        const fileContent = fs.readFileSync(EMAILS_CONFIG_PATH, 'utf8');
        recipients = JSON.parse(fileContent);
      } catch (err) {
        console.warn('Error reading email configuration file, using defaults:', err.message);
      }
    }

    // Construct Email Content
    const emailSubject = `New booking request from tethr landing page`;
    const emailText = `New booking request from tethr landing page

Name: ${submissionData.name}
Position: ${submissionData.position}
Company: ${submissionData.company}
Email: ${submissionData.email}
Team they're hiring for: ${submissionData.team}
Hardest part of hiring: ${submissionData.hardestPart}
Number of hires: ${submissionData.hiresCount}
Timeline: ${submissionData.timeline}

Booked Call Slot: ${submissionData.bookedDate} at ${submissionData.bookedTime}
`;

    // Attempt to send email via nodemailer
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'no-reply@tethrhq.com';

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort) || 587,
        secure: parseInt(smtpPort) === 465, // true for 465, false for others
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      try {
        await transporter.sendMail({
          from: smtpFrom,
          to: recipients.join(', '),
          subject: emailSubject,
          text: emailText
        });
        console.log(`Notification email sent successfully to: ${recipients.join(', ')}`);
      } catch (mailErr) {
        console.error('SMTP Mail send failure, logging locally:', mailErr);
        logLocalNotification(emailSubject, emailText);
      }
    } else {
      console.log('SMTP configuration missing, logging email notification locally.');
      logLocalNotification(emailSubject, emailText);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error handling slot booking:', err);
    return res.status(500).json({ success: false, message: 'Server failed to book calendar slot' });
  }
});

// Helper to log notifications to local text file (for offline/missing SMTP testing)
function logLocalNotification(subject, text) {
  const logHeader = `==================================================\nTIMESTAMP: ${new Date().toISOString()}\nSUBJECT: ${subject}\n==================================================\n`;
  const logFooter = `\n==================================================\n\n`;
  try {
    fs.appendFileSync(LOGS_PATH, logHeader + text + logFooter, 'utf8');
  } catch (err) {
    console.error('Failed to write local notification logs:', err);
  }
}

// Start Server
app.listen(PORT, () => {
  console.log(`tethr landing page backend running on http://localhost:${PORT}`);
});
