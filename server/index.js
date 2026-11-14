import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Note from './models/Note.js';
import User from './models/User.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
const cookieName = 'little_notes_session';
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const categories = new Set(['Personal', 'Work', 'Ideas', 'To-do']);
const colors = new Set(['peach', 'lavender', 'mint', 'butter']);
const production = process.env.NODE_ENV === 'production';

if (!mongoUri) {
  throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure your MongoDB connection.');
}

if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('replace-')) {
  throw new Error('JWT_SECRET must be a unique random value of at least 32 characters. Do not use the example value.');
}

app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());

const cookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: 'lax',
  path: '/',
  maxAge: sessionLifetimeMs,
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

const publicNote = (note) => ({
  id: note.id,
  title: note.title,
  body: note.body,
  category: note.category,
  color: note.color,
  favorite: note.favorite,
  updatedAt: note.updatedAt.toISOString(),
});

const createSession = (user, response) => {
  const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d', algorithm: 'HS256' });
  response.cookie(cookieName, token, cookieOptions);
};

const clearSession = (response) => {
  const { maxAge, ...clearOptions } = cookieOptions;
  response.clearCookie(cookieName, clearOptions);
};

const requireAuth = (request, response, next) => {
  const token = request.cookies[cookieName];
  if (!token) {
    return response.status(401).json({ message: 'Please sign in to access your notes.' });
  }

  try {
    const session = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    if (typeof session.sub !== 'string') throw new Error('Invalid session subject.');
    request.userId = session.sub;
    return next();
  } catch {
    clearSession(response);
    return response.status(401).json({ message: 'Your session expired. Please sign in again.' });
  }
};

function validateNotePayload(payload, partial = false) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'Provide note details as an object.' };
  }

  const values = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);

  if (!partial && ['title', 'body', 'category'].some((key) => !has(key))) {
    return { error: 'A title, note body, and category are required.' };
  }

  if (has('title')) {
    if (typeof payload.title !== 'string' || !payload.title.trim() || payload.title.trim().length > 90) {
      return { error: 'The title must be between 1 and 90 characters.' };
    }
    values.title = payload.title.trim();
  }

  if (has('body')) {
    if (typeof payload.body !== 'string' || !payload.body.trim() || payload.body.trim().length > 5000) {
      return { error: 'The note body must be between 1 and 5000 characters.' };
    }
    values.body = payload.body.trim();
  }

  if (has('category')) {
    if (!categories.has(payload.category)) {
      return { error: 'Choose a valid note category.' };
    }
    values.category = payload.category;
  }

  if (has('color')) {
    if (!colors.has(payload.color)) {
      return { error: 'Choose a valid note color.' };
    }
    values.color = payload.color;
  }

  if (has('favorite')) {
    if (typeof payload.favorite !== 'boolean') {
      return { error: 'Favorite must be true or false.' };
    }
    values.favorite = payload.favorite;
  }

  return { values };
}

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.post('/api/auth/signup', async (request, response, next) => {
  try {
    const body = request.body ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;

    if (!name || name.length > 60) {
      return response.status(400).json({ message: 'Your name must be between 1 and 60 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return response.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return response.status(400).json({ message: 'Choose a password with at least 8 characters and no more than 72 bytes.' });
    }

    const existingUser = await User.findOne({ email }).select('_id');
    if (existingUser) {
      return response.status(409).json({ message: 'An account already exists for that email.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    createSession(user, response);
    return response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/login', async (request, response, next) => {
  try {
    const body = request.body ?? {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;
    if (!email || typeof password !== 'string') {
      return response.status(400).json({ message: 'Enter your email and password.' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return response.status(401).json({ message: 'Email or password is incorrect.' });
    }

    createSession(user, response);
    return response.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', (request, response) => {
  clearSession(response);
  response.json({ message: 'Signed out.' });
});

app.get('/api/auth/me', requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.userId);
    if (!user) {
      clearSession(response);
      return response.status(401).json({ message: 'This account is no longer available. Please sign in again.' });
    }
    return response.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/notes', requireAuth, async (request, response, next) => {
  try {
    const notes = await Note.find({ userId: request.userId }).sort({ updatedAt: -1 });
    return response.json({ notes: notes.map(publicNote) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/notes', requireAuth, async (request, response, next) => {
  try {
    const { values, error } = validateNotePayload(request.body);
    if (error) return response.status(400).json({ message: error });

    const note = await Note.create({ ...values, userId: request.userId });
    return response.status(201).json({ note: publicNote(note) });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/notes/:id', requireAuth, async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: 'That note ID is not valid.' });
    }

    const { values, error } = validateNotePayload(request.body, true);
    if (error) return response.status(400).json({ message: error });
    if (Object.keys(values).length === 0) {
      return response.status(400).json({ message: 'Add at least one note field to update.' });
    }

    const note = await Note.findOneAndUpdate(
      { _id: request.params.id, userId: request.userId },
      { $set: values },
      { new: true, runValidators: true },
    );
    if (!note) return response.status(404).json({ message: 'That note could not be found.' });
    return response.json({ note: publicNote(note) });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/notes/:id', requireAuth, async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: 'That note ID is not valid.' });
    }

    const note = await Note.findOneAndDelete({ _id: request.params.id, userId: request.userId });
    if (!note) return response.status(404).json({ message: 'That note could not be found.' });
    return response.json({ message: 'Note deleted.' });
  } catch (error) {
    return next(error);
  }
});

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'Request body must be valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ message: 'Request body is too large.' });
  }
  if (error.code === 11000) {
    return response.status(409).json({ message: 'An account already exists for that email.' });
  }
  if (error.name === 'ValidationError') {
    return response.status(400).json({ message: 'Some of the provided data is invalid.' });
  }
  console.error(`API request failed (${error.name || 'Error'}).`);
  return response.status(500).json({ message: 'Something went wrong on the server. Please try again.' });
});

async function startServer() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  app.listen(port, () => {
    console.log(`Little Notes API is listening on http://localhost:${port}`);
    console.log('MongoDB connection established.');
  });
}

startServer().catch((error) => {
  console.error(`Could not start the Little Notes API (${error.name || 'Error'}): ${error.message}`);
  process.exitCode = 1;
});
