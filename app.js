// Admin Login Tracker - Full Node.js App

// ========== SETUP ==========
// Install dependencies: express, sqlite3, body-parser, dotenv, node-fetch
// Run: npm install express sqlite3 body-parser dotenv node-fetch express-session

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const path = require('path');
const session = require('express-session');
const app = express();

// Use in-memory DB for ephemeral platforms like Render (data resets on restart)
// For persistent storage, use './logins.db'
const db = new sqlite3.Database('./logins.db');

const PORT = process.env.PORT || 3000;

// ========== CONFIG ==========
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ========== MIDDLEWARE ==========
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'adminSecret', resave: false, saveUninitialized: true }));
app.use(express.static('public'));

// ========== DATABASE ==========
db.run(`CREATE TABLE IF NOT EXISTS logins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT,
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// ========== TELEGRAM ALERT ==========
function notifyTelegram(message) {
  if (BOT_TOKEN && CHAT_ID) {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message })
    }).catch(err => console.error('Telegram error:', err));
  }
}

// ========== ROUTES ==========

// Main page: logs visit and shows login page
app.get('/', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.ip;
  const userAgent = req.get('User-Agent');
  db.run('INSERT INTO logins (ip, user_agent) VALUES (?, ?)', [ip, userAgent]);
  notifyTelegram(`New visit:\nIP: ${ip}\nAgent: ${userAgent}`);
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin login page and dashboard
app.get('/admin', (req, res) => {
  if (req.session.loggedIn) {
    db.all('SELECT * FROM logins ORDER BY timestamp DESC', (err, rows) => {
      if (err) return res.send('Error loading logs.');
      // Improved HTML table for logs
      let tableRows = rows.map(row => `
        <tr>
          <td>${row.id}</td>
          <td>${row.ip}</td>
          <td>${row.user_agent}</td>
          <td>${row.timestamp}</td>
        </tr>
      `).join('');
      res.send(`
        <h2>Login Logs</h2>
        <table border="1" cellpadding="5">
          <tr>
            <th>ID</th>
            <th>IP</th>
            <th>User Agent</th>
            <th>Timestamp</th>
          </tr>
          ${tableRows}
        </table>
        <a href="/logout">Logout</a>
      `);
    });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  }
});

// Admin authentication
app.post('/admin', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect('/admin');
  } else {
    res.send('Invalid credentials');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin'));
});

// ========== SERVER ==========
app.listen(PORT, () => console.log(`Admin panel running on port ${PORT}`));
