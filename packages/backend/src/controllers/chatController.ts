import { type Request, type Response, type NextFunction } from 'express';
import { ChatKnowledge } from '../models/ChatKnowledge.js';
import { AppError } from '../middleware/error.js';
import { chatWithAI, type AIChatMessage } from '../services/aiService.js';
import { env } from '../config/env.js';

const FALLBACK_EN = 
  "I don't have detailed information on this topic yet. Please contact the FileMitra support team at support@filemitra.org.";
const FALLBACK_HI = 
  'मुझे इस विषय पर अभी पूरी जानकारी उपलब्ध नहीं है। कृपया FileMitra सहायता टीम से संपर्क करें: support@filemitra.org';

const GREETINGS_EN = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'help'];
const GREETINGS_HI = ['namaste', 'namaskar', 'pranam', 'kaise ho', 'kya hal', 'batao', 'madad'];

function sanitizeAIReply(reply: string): string {
  const lower = reply.toLowerCase();
  if (
    lower.includes('cannot read') || 
    lower.includes('does not support image input') || 
    lower.startsWith('error:') ||
    lower.includes('no image provided') ||
    lower.includes('unsupported format')
  ) {
    return "I received your message, but I'm unable to process it fully right now. Please try rephrasing or send a text-only question.";
  }
  return reply;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function scoreMatch(query: string, keywords: string[]): number {
  const queryNorm = normalize(query);
  const queryTokens = tokenize(query);
  let score = 0;

  for (const kw of keywords) {
    const kwNorm = normalize(kw);
    const kwLower = kw.toLowerCase();

    if (queryNorm === kwNorm) {
      score += 10;
    } else if (queryNorm.includes(kwNorm) || kwNorm.includes(queryNorm)) {
      score += 5;
    }

    for (const qt of queryTokens) {
      if (kwLower === qt) {
        score += 3;
      } else if (kwLower.includes(qt) || qt.includes(kwLower)) {
        score += 1;
      }
    }
  }

  return score;
}

function detectLanguage(text: string): 'en' | 'hi' {
  const hindiPattern = /[\u0900-\u097F]/;
  if (hindiPattern.test(text)) return 'hi';

  const lower = text.toLowerCase();
  const hindiWords = [
    'namaste', 'namaskar', 'kaise', 'kya', 'hai', 'batao', 'bata', 'alert', 
    'poaching', 'janwar', 'jangal', 'node', 'sensor', 'madad', 'sahayata'
  ];

  for (const word of hindiWords) {
    if (lower.includes(word)) return 'hi';
  }

  return 'en';
}

function isGreeting(text: string, lang: 'en' | 'hi'): boolean {
  const lower = text.toLowerCase().trim();
  return lang === 'hi'
    ? GREETINGS_HI.some((g) => lower.includes(g))
    : GREETINGS_EN.some((g) => lower.includes(g));
}

function getGreetingResponse(lang: 'en' | 'hi'): string {
  if (lang === 'hi') {
    return 'नमस्ते! 🙏 मैं JungleSathi AI सहायक हूँ। आप मैं वन्यजीव निगरानी, अलर्ट्स, ESP32 नोड्स स्थिति, LoRa गेटवे, या पोचिंग रिस्क विश्लेषण के बारे में पूछ सकते हैं।';
  }
  return 'Hello! 👋 I am the JungleSathi AI Assistant. Ask me anything about wildlife alerts, ESP32 node health, LoRa gateway status, or threat analytics. I can also analyze camera trap images for species identification and threat detection.';
}

async function keywordFallback(message: string): Promise<string> {
  const lang = detectLanguage(message);
  const trimmed = message.trim();

  if (isGreeting(trimmed, lang)) {
    return getGreetingResponse(lang);
  }

  const knowledge = await ChatKnowledge.find({ active: true }).sort({ priority: -1 }).lean();
  let bestMatch: { answer: string; score: number } | null = null;

  for (const item of knowledge) {
    const score = scoreMatch(trimmed, item.keywords);
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { answer: item.answer, score };
    }
  }

  if (bestMatch && bestMatch.score >= 1) {
    return bestMatch.answer;
  }

  // Enhanced keyword-based responses for common queries
  const lower = trimmed.toLowerCase();
  
  if (lower.includes('alert') || lower.includes('threat')) {
    const response = lang === 'hi'
      ? 'वर्तमान में सिस्टम में अलर्ट पढ़ने के लिए, कृपया डैशबोर्ड पर जाएं या पढ़ना चाहते हैं कि कितने अलर्ट हैं। मैं आपकी मदद कर सकता हूँ भी ऐतिहासिक डेटा का विश्लेषण करने में।'
      : 'To check current alerts, please visit the dashboard. I can help analyze historical alert patterns and identify risk factors that may lead to future incidents.';
    return response;
  }

  if (lower.includes('node') || lower.includes('sensor') || lower.includes('device')) {
    const response = lang === 'hi'
      ? 'ESP32 नोड्स हमें सेन्सर डेटा एकत्र करते हैं और उसे LoRa गेटवे के माध्यम से भेजते हैं। नियमित रखरखाव के लिए बैटरी जाँच हर 2 हफ्ते में करें और कैमरे कैलिब्रेशन हर 3 महीने में करें।'
      : 'ESP32 sensor nodes collect environmental data and transmit via LoRa gateway. Regular maintenance includes: battery checks every 2 weeks, camera calibration every 3 months, and firmware updates quarterly.';
    return response;
  }

  if (lower.includes('fire') || lower.includes('burn')) {
    const response = lang === 'hi'
      ? 'आग के खतरों के साथ, सूखे मौसम और 35°C+ तापमान 3 दिनों तक बना रहने पर जोखिम बढ़ता है। जलने योग्य क्षेत्रों में पैट्रोल बढ़ाना चाहिए।'
      : 'Fire risk increases during dry weather conditions with temperatures exceeding 35°C for 3+ consecutive days. High-risk zones should have increased patrol frequency and pre-positioned firefighting resources.';
    return response;
  }

  if (lower.includes('poach') || lower.includes('gunshot') || lower.includes('illegal')) {
    const response = lang === 'hi'
      ? 'शिकार के साथ जुड़ी गतिविधियाँ आमतौर पर नई सड़कों और विचार से जुड़ी होती हैं। चाहिए अधिक जाँच के लिए रात के समय और सेन्सर कवरेज को बढ़ाएँ।'
      : 'Poaching activity typically correlates with new road construction and logging operations. Prevention strategies include increased night patrols and enhanced sensor coverage in vulnerable sectors.';
    return response;
  }

  return lang === 'hi' ? FALLBACK_HI : FALLBACK_EN;
}

export async function chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as {
      message?: string;
      imageBase64?: string;
      history?: AIChatMessage[];
    };

    const message = body.message?.trim();
    const imageBase64 = body.imageBase64?.trim();

    if (!message && !imageBase64) {
      throw new AppError('Message or image payload is required.', 400);
    }

    const trimmed = message || '';
    const lang = detectLanguage(trimmed || 'Analyze wildlife visual');
    const hasAI = env.AI_FALLBACK_ENABLED === 'true';

    // Image/Vision Query
    if (imageBase64) {
      if (!hasAI) {
        const reply = lang === 'hi'
          ? 'क्षमा करें, AI छवि विश्लेषण सेवा अभी सक्रिय नहीं है।'
          : 'Image analysis is currently unavailable. Please try a text-based question instead.';
        res.json({ reply, mode: 'fallback' });
        return;
      }

      if (!env.FREEAI_API_KEY) {
        const reply = lang === 'hi'
          ? 'क्षमा करें, छवि विश्लेषण मुफ्त टियर पर उपलब्ध नहीं है। कृपया टेक्स्ट में अपना सवाल भेजें।'
          : 'Sorry, image analysis is not available on the free tier. Please send your question as text.';
        res.json({ reply, mode: 'fallback' });
        return;
      }

      try {
        const result = await chatWithAI({
          message: trimmed || 'Identify species, activity, or threats in this camera trap image.',
          imageBase64,
          history: body.history,
        });
        res.json({ reply: sanitizeAIReply(result.reply), mode: 'ai', model: result.model, tokensUsed: result.tokensUsed });
      } catch (aiErr) {
        console.error('AI analysis failed:', aiErr);
        const reply = lang === 'hi'
          ? 'छवि विश्लेषण विफल रहा। कृपया बाद में प्रयास करें या टेक्स्ट क्वेरी भेजें।'
          : 'Image analysis failed. Please try again later or send a text-based question.';
        res.json({ reply, mode: 'fallback' });
      }
      return;
    }

    // Keyword Fallback Mode (No AI)
    if (!hasAI) {
      const reply = await keywordFallback(trimmed);
      res.json({ reply, mode: 'fallback' });
      return;
    }

    // Greeting
    if (isGreeting(trimmed, lang)) {
      res.json({ reply: getGreetingResponse(lang), mode: 'greeting' });
      return;
    }

    // Live AI Chat
    try {
      const result = await chatWithAI({
        message: trimmed,
        history: body.history,
      });
      res.json({ reply: sanitizeAIReply(result.reply), mode: 'ai', model: result.model, tokensUsed: result.tokensUsed });
    } catch (aiErr) {
      console.error('AI call failed, using keyword fallback:', aiErr);
      const reply = await keywordFallback(trimmed);
      res.json({ reply, mode: 'fallback' });
    }
  } catch (err) {
    next(err);
  }
}
