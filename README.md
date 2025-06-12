# BoweryConnect Backend API

AI-powered crisis intervention API for homeless individuals in NYC.

## Features
- GPT-4 powered crisis chat with specialized training
- Real-time mental health crisis detection
- Emergency resource locator
- Integration with NYC services

## Setup

1. Clone this repo
2. Run `npm install`
3. Copy `.env.example` to `.env` and add your API keys
4. Run `npm start` for production or `npm run dev` for development

## Deployment on Render

1. Connect this repo to Render
2. Add environment variables in Render dashboard:
   - `OPENAI_API_KEY`
   - `NODE_ENV=production`
3. Deploy!

## API Endpoints

- `POST /api/crisis-chat` - Main chat endpoint
- `POST /api/resources/nearby` - Get nearby resources
- `GET /health` - Health check