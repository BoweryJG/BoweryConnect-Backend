# BoweryConnect Backend API

AI-powered crisis intervention API for homeless individuals in NYC.

## Features
- GPT-4 powered crisis chat with specialized training
- Real-time mental health crisis detection
- Emergency resource locator
- Integration with NYC services

## Deployment Instructions for Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect to this GitHub repo: https://github.com/BoweryJG/BoweryConnect-Backend
4. Configure:
   - Name: `boweryconnect-api`
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Add Environment Variables:
     - `OPENAI_API_KEY` (from OpenAI dashboard)
     - `NODE_ENV` = `production`
5. Click "Create Web Service"

## Local Development

```bash
npm install
npm run dev
```

## API Endpoints

- `POST /api/crisis-chat` - Main chat endpoint
- `POST /api/resources/nearby` - Get nearby resources
- `GET /health` - Health check