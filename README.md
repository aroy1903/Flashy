# Flashy

A stunning, minimalist Quizlet clone built with React, Express, MySQL, and Electron.

## Features

- **Flashcard Sets** — Create and organize multiple groups of flashcards
- **Image Support** — Attach images to terms and definitions
- **Study Mode** — Flip through cards with keyboard navigation and shuffle
- **Quiz Mode** — Multiple choice, true/false, and written answer quizzes
- **Desktop App** — Electron wrapper for native desktop experience
- **Dark UI** — Beautiful minimalist dark interface

## Tech Stack

- **Frontend:** React, Vite, TailwindCSS, Framer Motion, Lucide Icons
- **Backend:** Express.js, MySQL2
- **Desktop:** Electron
- **File Uploads:** Multer

## Setup

### 1. Copy environment file
```bash
cp .env.example .env
```
Edit `.env` with your MySQL credentials.

### 2. Install dependencies
```bash
npm run install:all
```

### 3. Initialize database
```bash
npm run db:init
```

### 4. Run development server
```bash
npm run dev
```

### 5. Run as Electron desktop app
```bash
npm run electron:dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both server and client |
| `npm run server` | Start Express API server only |
| `npm run client` | Start React dev server only |
| `npm run electron:dev` | Start full Electron dev environment |
| `npm run db:init` | Initialize MySQL database and tables |
| `npm run install:all` | Install all dependencies |
