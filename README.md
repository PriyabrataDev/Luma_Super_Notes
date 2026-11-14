# Little Notes

Little Notes is a responsive note-taking app for collecting ideas, reminders, plans, and all the small thoughts worth keeping. User accounts and notes are stored in MongoDB through the included Express API.

## Features

- Create, edit, delete, search, categorize, and favorite notes.
- Sign up and sign in with email and password.
- Store user profiles and account-owned notes in MongoDB.
- Hash passwords with bcrypt and use an HTTP-only session cookie.
- Responsive interface, collapsible notebook sidebar, and SVG favicon.

## Technologies

- React 18, Vite, and CSS
- Node.js and Express
- MongoDB and Mongoose
- bcryptjs, JSON Web Tokens, and HTTP-only cookies

## Requirements

- Node.js 18 or newer and npm
- MongoDB running locally, or a MongoDB Atlas cluster

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` in `.env` to your local MongoDB or Atlas connection string. For Atlas, create a database user and allow your development IP address in Network Access.
4. Replace `JWT_SECRET` with a unique random secret of at least 32 characters. For example:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

5. Start the API server in one terminal:

   ```sh
   npm run server
   ```

6. Start the React development server in another terminal:

   ```sh
   npm run dev
   ```

7. Open `http://localhost:5173`. Vite forwards `/api` requests to the Express API on port 4000.

Build the frontend with `npm run build`. The API expects to be deployed behind the same origin (or a reverse proxy forwarding `/api`) in production; use HTTPS so session cookies are secure.

## MongoDB data

Mongoose creates a `users` collection and a `notes` collection. Each note stores a `userId`, so accounts can only read or modify their own notes. Passwords are never stored as plain text. The `.env` file is ignored by Git; do not commit database credentials or production secrets.

When signed out, the UI shows sample notes as a preview. Sign in or create an account to save notes to MongoDB.

## Project structure

```text
server/
  index.js
  models/
    Note.js
    User.js
src/
  components/
    AuthDialog.jsx
    NoteCard.jsx
    NoteEditor.jsx
  App.jsx
  main.jsx
  styles.css
public/assets/little-notes.svg
index.html
```