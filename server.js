const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI (or use Claude, Gemini, etc.)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Crisis intervention system prompt
const CRISIS_SYSTEM_PROMPT = `You are a crisis intervention specialist trained specifically for homeless individuals experiencing mental health crises. You must:

1. Always prioritize safety and de-escalation
2. Use simple, calming language
3. Validate their experiences without judgment
4. Detect crisis keywords (suicide, voices, violence) and respond appropriately
5. Provide immediate grounding techniques for panic/psychosis
6. Never dismiss hallucinations - acknowledge their reality to the person
7. Offer concrete next steps and local NYC resources
8. Use harm reduction approach for substance use
9. If someone is in immediate danger, provide crisis hotline numbers

Remember: Many homeless individuals have trauma, mental illness, and addiction. Be compassionate, patient, and practical.`;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'BoweryConnect Crisis API' });
});

// Main crisis chat endpoint
app.post('/api/crisis-chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    // Detect immediate crisis
    const immediateKeywords = ['kill myself', 'suicide', 'want to die', 'end it'];
    const isImmediate = immediateKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (isImmediate) {
      return res.json({
        message: "I hear you're in a lot of pain right now. Your life has value. Please reach out for immediate help:\n\n📞 988 - Suicide & Crisis Lifeline (24/7)\n📞 1-888-NYC-WELL (1-888-692-9355)\n📍 Nearest ER: I can help you find one\n\nI'm here with you. Can you tell me where you are right now?",
        urgency: 'immediate',
        actions: ['call_hotline', 'find_er', 'alert_caseworker']
      });
    }

    // AI response for non-immediate crisis
    const messages = [
      { role: 'system', content: CRISIS_SYSTEM_PROMPT },
      ...conversationHistory.map(msg => ({
        role: msg.isBot ? 'assistant' : 'user',
        content: msg.text
      })),
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const response = completion.choices[0].message.content;

    // Analyze response for follow-up actions
    const analysis = analyzeResponse(message, response);

    res.json({
      message: response,
      urgency: analysis.urgency,
      actions: analysis.actions,
      resources: analysis.resources
    });

  } catch (error) {
    console.error('Crisis chat error:', error);
    res.status(500).json({
      message: "I'm here for you. If you're in crisis, please call 988 or go to your nearest emergency room. Let's try again - what's happening right now?",
      urgency: 'error',
      fallback: true
    });
  }
});

// Get local resources based on location
app.post('/api/resources/nearby', async (req, res) => {
  const { latitude, longitude, type } = req.body;
  
  // This would connect to NYC Open Data or other APIs
  const resources = {
    shelters: [
      {
        name: "The Bowery Mission",
        address: "227 Bowery, New York, NY 10002",
        phone: "(212) 226-6214",
        distance: "0.5 miles",
        services: ["Meals", "Shelter", "Medical", "Case Management"]
      }
    ],
    mental_health: [
      {
        name: "NYC Well",
        phone: "1-888-NYC-WELL",
        text: "Text 'WELL' to 65173",
        services: ["24/7 Crisis Support", "Mental Health", "Substance Abuse"]
      }
    ],
    food: [],
    medical: []
  };

  res.json({ resources: resources[type] || [] });
});

// Analyze message for urgency and needed resources
function analyzeResponse(message, aiResponse) {
  const msg = message.toLowerCase();
  
  let urgency = 'low';
  let actions = [];
  let resources = [];

  // Check for various crisis indicators
  if (msg.includes('voices') || msg.includes('hearing things')) {
    urgency = 'medium';
    actions.push('grounding_exercise');
    resources.push('mental_health');
  }

  if (msg.includes('drugs') || msg.includes('withdrawal')) {
    urgency = 'medium';
    actions.push('find_detox');
    resources.push('substance_abuse');
  }

  if (msg.includes('hungry') || msg.includes('food')) {
    actions.push('find_food');
    resources.push('food_pantry');
  }

  if (msg.includes('cold') || msg.includes('shelter')) {
    urgency = 'high';
    actions.push('find_shelter');
    resources.push('emergency_shelter');
  }

  return { urgency, actions, resources };
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BoweryConnect Crisis API running on port ${PORT}`);
});

module.exports = app;