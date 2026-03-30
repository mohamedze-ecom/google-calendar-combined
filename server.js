require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const FRONTEND_URL = isProduction ? BASE_URL : 'http://localhost:5173';

app.set('trust proxy', 1);
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Full calendar access (read + write) so we can edit/move events
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
];
const REDIRECT_URI = `${BASE_URL}/auth/callback`;

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

function getAuthClientForAccount(account) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(account.tokens);
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      account.tokens.refresh_token = tokens.refresh_token;
    }
    account.tokens.access_token = tokens.access_token;
    account.tokens.expiry_date = tokens.expiry_date;
  });
  return oauth2Client;
}

// Initialize session accounts array
app.use((req, res, next) => {
  if (!req.session.accounts) {
    req.session.accounts = [];
  }
  next();
});

// Start OAuth flow
app.get('/auth/login', (req, res) => {
  const slot = parseInt(req.query.slot) || 0;
  req.session.authSlot = slot;

  const oauth2Client = createOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.json({ url });
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    const slot = req.session.authSlot || 0;
    req.session.accounts[slot] = { email, tokens };

    res.redirect(FRONTEND_URL + '?auth=success&slot=' + slot);
  } catch (err) {
    console.error('Auth callback error:', err);
    res.status(500).send('Authentication failed');
  }
});

// Auth status
app.get('/auth/status', (req, res) => {
  const accounts = (req.session.accounts || []).map(acc => acc ? { email: acc.email } : null);
  res.json({ accounts });
});

// Disconnect
app.post('/auth/disconnect', (req, res) => {
  const { slot } = req.body;
  if (req.session.accounts && req.session.accounts[slot]) {
    req.session.accounts[slot] = null;
  }
  res.json({ success: true });
});

// Fetch events
app.get('/api/events', async (req, res) => {
  const { timeMin, timeMax } = req.query;
  if (!timeMin || !timeMax) {
    return res.status(400).json({ error: 'timeMin and timeMax are required' });
  }

  const allEvents = [];
  const accounts = req.session.accounts || [];
  const ACCOUNT_COLORS = ['#8ab4f8', '#f28b82'];

  const uniqueEmails = [];
  for (const acc of accounts) {
    if (acc && !uniqueEmails.includes(acc.email)) {
      uniqueEmails.push(acc.email);
    }
  }

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    if (!account) continue;
    const colorIndex = uniqueEmails.indexOf(account.email);

    try {
      const oauth2Client = getAuthClientForAccount(account);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarList = await calendar.calendarList.list();

      for (const cal of calendarList.data.items) {
        const eventsResponse = await calendar.events.list({
          calendarId: cal.id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
        });

        const events = (eventsResponse.data.items || []).map(event => ({
          id: event.id,
          calendarId: cal.id,
          title: event.summary || '(No title)',
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          allDay: !event.start.dateTime,
          description: event.description || '',
          location: event.location || '',
          accountEmail: account.email,
          accountIndex: i,
          color: ACCOUNT_COLORS[colorIndex] || ACCOUNT_COLORS[0],
          calendarName: cal.summary,
          status: event.status,
          htmlLink: event.htmlLink,
          // Attendees
          attendees: (event.attendees || []).map(a => ({
            email: a.email,
            displayName: a.displayName || a.email,
            responseStatus: a.responseStatus,
            self: a.self || false,
            organizer: a.organizer || false,
          })),
          // Organizer
          organizer: event.organizer ? {
            email: event.organizer.email,
            displayName: event.organizer.displayName || event.organizer.email,
            self: event.organizer.self || false,
          } : null,
          // Conference / Meet link
          meetLink: event.hangoutLink || (event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri) || null,
          conferenceData: event.conferenceData ? {
            type: event.conferenceData.conferenceSolution?.name || 'Video call',
            iconUri: event.conferenceData.conferenceSolution?.iconUri || null,
          } : null,
          // Creator
          creator: event.creator ? {
            email: event.creator.email,
            displayName: event.creator.displayName || event.creator.email,
          } : null,
          // Recurrence
          recurringEventId: event.recurringEventId || null,
        }));

        allEvents.push(...events);
      }
    } catch (err) {
      console.error(`Error fetching events for account ${i}:`, err.message);
    }
  }

  allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
  res.json({ events: allEvents });
});

// Update event (edit title, description, time, etc.)
app.patch('/api/events/:accountIndex/:calendarId/:eventId', async (req, res) => {
  const { accountIndex, calendarId, eventId } = req.params;
  const updates = req.body;
  const accounts = req.session.accounts || [];
  const account = accounts[parseInt(accountIndex)];

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  try {
    const oauth2Client = getAuthClientForAccount(account);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Build the update payload
    const patch = {};
    if (updates.title !== undefined) patch.summary = updates.title;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.location !== undefined) patch.location = updates.location;
    if (updates.start !== undefined) {
      patch.start = updates.allDay
        ? { date: updates.start.split('T')[0] }
        : { dateTime: updates.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }
    if (updates.end !== undefined) {
      patch.end = updates.allDay
        ? { date: updates.end.split('T')[0] }
        : { dateTime: updates.end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }

    const result = await calendar.events.patch({
      calendarId: decodeURIComponent(calendarId),
      eventId,
      requestBody: patch,
    });

    res.json({ success: true, event: result.data });
  } catch (err) {
    console.error('Error updating event:', err.message);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
app.delete('/api/events/:accountIndex/:calendarId/:eventId', async (req, res) => {
  const { accountIndex, calendarId, eventId } = req.params;
  const accounts = req.session.accounts || [];
  const account = accounts[parseInt(accountIndex)];

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  try {
    const oauth2Client = getAuthClientForAccount(account);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: decodeURIComponent(calendarId),
      eventId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting event:', err.message);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
