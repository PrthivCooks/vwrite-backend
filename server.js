const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// ========== CONFIGURATION ==========
const SERVICE_ACCOUNT_FILE = './service-account.json';
const FOLDER_ID = '1IuTAlN500m731vGXL1HTmY6IMRJTxyr-'; // <<== PUT YOUR FOLDER ID HERE

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_FILE,
  scopes: SCOPES,
});
const drive = google.drive({ version: 'v3', auth });

// ========= UTILS =========
const filesListPath = './files.json';
function getFilesList() {
  if (fs.existsSync(filesListPath)) {
    return JSON.parse(fs.readFileSync(filesListPath));
  }
  return [];
}
function saveFilesList(list) {
  fs.writeFileSync(filesListPath, JSON.stringify(list, null, 2));
}

// ========== UPLOAD ENDPOINT ==========
app.post('/upload', upload.single('file'), async (req, res) => {
  const userName = req.body.name;
  const file = req.file;

  if (!userName || !file) {
    return res.status(400).json({ error: 'Name and file are required.' });
  }

  const ext = path.extname(file.originalname);
  const driveFileName = `${userName.replace(/\s+/g, '_')}${ext}`;

  try {
    const fileMetadata = {
      name: driveFileName,
      parents: [FOLDER_ID],
    };
    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path),
    };

    // Upload file
    const driveRes = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id, name, webViewLink',
    });

    // Optional: delete temp file
    fs.unlinkSync(file.path);

    // Save file info to files.json
    let filesList = getFilesList();
    filesList.push({
      id: driveRes.data.id,
      name: driveRes.data.name,
      webViewLink: driveRes.data.webViewLink,
      accessEmails: [],
    });
    saveFilesList(filesList);

    res.json({
      success: true,
      fileId: driveRes.data.id,
      name: driveRes.data.name,
      webViewLink: driveRes.data.webViewLink,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== LIST ALL FILES ==========
app.get('/files', (req, res) => {
  const filesList = getFilesList();
  res.json(filesList);
});

// ========== GRANT ACCESS TO EMAIL ==========
app.post('/grant-access', async (req, res) => {
  const { fileId, email } = req.body;
  if (!fileId || !email) {
    return res.status(400).json({ error: 'fileId and email are required' });
  }

  try {
    // Grant permission in Google Drive
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'user',
        emailAddress: email,
      },
      sendNotificationEmail: false,
    });

    // Update files.json
    let filesList = getFilesList();
    filesList = filesList.map(f =>
      f.id === fileId
        ? { ...f, accessEmails: Array.from(new Set([...(f.accessEmails || []), email])) }
        : f
    );
    saveFilesList(filesList);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== LIST FILES FOR EMAIL ==========
app.get('/files-for-email/:email', (req, res) => {
  const email = req.params.email;
  let filesList = getFilesList();
  const accessible = filesList.filter(f => (f.accessEmails || []).includes(email));
  res.json(accessible);
});

// ========== START SERVER ==========
const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
