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
    const { message, conversationHistory = [], context = {} } = req.body;
    const { language = 'en', emotion, location, sessionId, mood } = context;

    // Detect immediate crisis
    const immediateKeywords = ['kill myself', 'suicide', 'want to die', 'end it'];
    const isImmediate = immediateKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (isImmediate) {
      const emergencyResponse = {
        en: "I hear you're in a lot of pain right now. Your life has value. Please reach out for immediate help:\n\n📞 988 - Suicide & Crisis Lifeline (24/7)\n📞 1-888-NYC-WELL (1-888-692-9355)\n📍 Nearest ER: I can help you find one\n\nI'm here with you. Can you tell me where you are right now?",
        es: "Escucho que estás sufriendo mucho. Tu vida tiene valor. Por favor busca ayuda inmediata:\n\n📞 988 - Línea de Crisis (24/7)\n📞 1-888-NYC-WELL\n📍 Sala de emergencias más cercana\n\nEstoy aquí contigo. ¿Puedes decirme dónde estás?",
        zh: "我听到你现在很痛苦。你的生命很有价值。请立即寻求帮助：\n\n📞 988 - 危机热线（24/7）\n📞 1-888-NYC-WELL\n📍 最近的急诊室\n\n我在这里陪着你。你能告诉我你在哪里吗？"
      };

      return res.json({
        message: emergencyResponse[language] || emergencyResponse.en,
        urgency: 'immediate',
        actions: ['call_hotline', 'find_er', 'alert_caseworker'],
        peerSupport: true
      });
    }

    // Enhanced system prompt based on context
    let enhancedPrompt = CRISIS_SYSTEM_PROMPT;
    
    if (emotion === 'panicked' || mood === 'anxious') {
      enhancedPrompt += '\n\nThe person appears anxious/panicked. Use extra calming language and breathing exercises.';
    }
    
    if (language !== 'en') {
      enhancedPrompt += `\n\nRespond in ${language === 'es' ? 'Spanish' : language === 'zh' ? 'Mandarin Chinese' : language === 'ar' ? 'Arabic' : language === 'ru' ? 'Russian' : 'English'}.`;
    }
    
    if (location) {
      enhancedPrompt += `\n\nUser location: ${location.latitude}, ${location.longitude}. Provide NYC-specific resources near them.`;
    }

    // AI response for non-immediate crisis
    const messages = [
      { role: 'system', content: enhancedPrompt },
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
    const analysis = analyzeResponse(message, response, context);

    res.json({
      message: response,
      urgency: analysis.urgency,
      actions: analysis.actions,
      resources: analysis.resources,
      peerSupport: analysis.needsPeerSupport
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
  
  // Enhanced NYC resources with street survival info
  const resources = {
    shelters: [
      {
        name: "The Bowery Mission",
        address: "227 Bowery, New York, NY 10002",
        phone: "(212) 226-6214",
        distance: "0.5 miles",
        services: ["Meals", "Shelter", "Medical", "Case Management"],
        notes: "Intake at 5pm, get there by 4:30pm for bed"
      },
      {
        name: "NYC Rescue Mission",
        address: "90 Lafayette Street",
        phone: "(212) 226-6214",
        distance: "0.8 miles",
        services: ["Emergency Shelter", "Meals", "Showers"],
        notes: "First come first serve, opens at 8pm"
      }
    ],
    mental_health: [
      {
        name: "NYC Well",
        phone: "1-888-NYC-WELL",
        text: "Text 'WELL' to 65173",
        services: ["24/7 Crisis Support", "Mental Health", "Substance Abuse"]
      },
      {
        name: "CORNER Project",
        address: "Washington Heights",
        services: ["Harm Reduction", "Needle Exchange", "Narcan"],
        notes: "No questions asked, walk-ins welcome"
      }
    ],
    food: [
      {
        name: "Holy Apostles Soup Kitchen",
        address: "296 9th Avenue",
        services: ["Hot Meals"],
        notes: "M-F 10:30am-12:30pm, largest in NYC"
      }
    ],
    medical: [
      {
        name: "Bellevue Hospital ER",
        address: "462 1st Avenue",
        services: ["Emergency Care", "Psych ER"],
        notes: "Can't turn you away, has psych unit"
      }
    ],
    tech_resources: [
      {
        name: "NYPL - Main Branch",
        address: "5th Ave & 42nd St",
        services: ["Free WiFi", "Computer Access", "Charging"],
        notes: "Open till 8pm, quiet warm space"
      },
      {
        name: "LinkNYC Kiosks",
        address: "Throughout city",
        services: ["Free WiFi", "Phone Calls", "Device Charging"],
        notes: "24/7, USB charging ports"
      }
    ],
    warmth: [
      {
        name: "24-hour McDonald's",
        address: "Multiple locations",
        services: ["Warm space", "Bathroom", "Cheap coffee"],
        notes: "34th & 8th, 42nd & 3rd stay open all night"
      },
      {
        name: "Penn Station",
        address: "34th St & 8th Ave",
        services: ["Warm waiting area", "Bathrooms"],
        notes: "NYPD does sweeps around 2am"
      }
    ]
  };

  res.json({ resources: resources[type] || [] });
});

// Get street survival tips
app.get('/api/survival-tips/:category', (req, res) => {
  const { category } = req.params;
  
  const tips = {
    winter: [
      "Layer cardboard under you - insulates from cold ground",
      "Stuff newspapers in clothes for insulation",
      "24hr laundromats are warm and usually won't kick you out if you're doing laundry",
      "Emergency room waiting areas - can't kick you out if you say you're sick"
    ],
    safety: [
      "Sleep with your shoes on and bag as pillow",
      "Never flash cash or phones",
      "Buddy system - find someone trustworthy to watch your back",
      "Avoid Penn Station 2-4am (police sweeps)"
    ],
    hygiene: [
      "YMCA day passes for showers ($15-25)",
      "Port Authority bathroom has hot water",
      "Baby wipes from dollar store for quick cleanup",
      "Libraries have clean bathrooms"
    ],
    food: [
      "Sikh temples (Gurdwara) give free meals no questions asked",
      "Hare Krishna in East Village - free vegan meals daily",
      "Whole Foods dumpster after 10pm - they throw out that day's hot bar",
      "Church meal schedules: keep a list on paper"
    ]
  };
  
  res.json({ tips: tips[category] || [] });
});

// Analyze message for urgency and needed resources
function analyzeResponse(message, aiResponse, context = {}) {
  const msg = message.toLowerCase();
  const { emotion, mood } = context;
  
  let urgency = 'low';
  let actions = [];
  let resources = [];
  let needsPeerSupport = false;

  // Emotion-based analysis
  if (emotion === 'panicked' || mood === 'crisis') {
    urgency = 'high';
    actions.push('breathing_exercise');
  }

  // Check for various crisis indicators
  if (msg.includes('voices') || msg.includes('hearing things')) {
    urgency = 'medium';
    actions.push('grounding_exercise');
    resources.push('mental_health');
    needsPeerSupport = true;
  }

  if (msg.includes('drugs') || msg.includes('withdrawal')) {
    urgency = 'medium';
    actions.push('find_detox');
    resources.push('substance_abuse');
    needsPeerSupport = true;
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

  if (msg.includes('lonely') || msg.includes('alone') || msg.includes('nobody')) {
    needsPeerSupport = true;
    actions.push('peer_connection');
  }

  if (msg.includes('phone') || msg.includes('charge') || msg.includes('wifi')) {
    resources.push('tech_resources');
    actions.push('find_charging');
  }

  return { urgency, actions, resources, needsPeerSupport };
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BoweryConnect Crisis API running on port ${PORT}`);
});

module.exports = app;