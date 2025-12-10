// Yokaizen Campus - Content Filter Middleware
// Safety layer for AI inputs/outputs (GDPR/COPPA compliance)

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { APIResponse, ContentFilterResult } from '../types/index.js';

// Blocked word patterns (basic example - expand as needed)
const BLOCKED_PATTERNS = [
  // Profanity (basic)
  /\b(fuck|shit|damn|ass|bitch)\b/gi,
  // Violence
  /\b(kill|murder|attack|harm|hurt)\s+(someone|people|them|you|me)\b/gi,
  // Self-harm indicators
  /\b(suicide|self[- ]?harm|cut\s+myself|end\s+my\s+life)\b/gi,
  // Hate speech
  /\b(hate|kill|attack)\s+(all\s+)?(jews|muslims|christians|blacks|whites|asians|gays|trans)\b/gi,
  // Sexual content
  /\b(porn|nude|naked|sex|erotic)\b/gi,
  // Dangerous instructions
  /\b(how\s+to|make|build)\s+(bomb|weapon|explosive|drug)\b/gi,
];

// PII detection patterns
const PII_PATTERNS = [
  // Email
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Phone numbers (various formats)
  /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  // SSN
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
  // Credit card numbers
  /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
];

// Category weights for scoring
const CATEGORY_WEIGHTS: Record<string, number> = {
  profanity: 0.3,
  violence: 0.8,
  selfHarm: 1.0,
  hateSpeech: 1.0,
  sexual: 0.7,
  dangerous: 1.0,
  pii: 0.5,
};

// Check content against blocked patterns
export function checkContent(text: string): ContentFilterResult {
  const flaggedCategories: string[] = [];
  let maxWeight = 0;
  
  // Check blocked patterns
  const patternCategories = [
    'profanity',
    'violence',
    'selfHarm',
    'hateSpeech',
    'sexual',
    'dangerous',
  ];
  
  for (let i = 0; i < BLOCKED_PATTERNS.length; i++) {
    if (BLOCKED_PATTERNS[i].test(text)) {
      const category = patternCategories[Math.min(i, patternCategories.length - 1)];
      if (!flaggedCategories.includes(category)) {
        flaggedCategories.push(category);
        maxWeight = Math.max(maxWeight, CATEGORY_WEIGHTS[category] || 0);
      }
    }
    // Reset regex lastIndex
    BLOCKED_PATTERNS[i].lastIndex = 0;
  }
  
  // Check for PII
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(text)) {
      if (!flaggedCategories.includes('pii')) {
        flaggedCategories.push('pii');
        maxWeight = Math.max(maxWeight, CATEGORY_WEIGHTS.pii);
      }
      break;
    }
    pattern.lastIndex = 0;
  }
  
  return {
    safe: maxWeight < 0.7,
    flaggedCategories,
    confidence: 1 - maxWeight,
  };
}

// Strip PII from text
export function stripPII(text: string): string {
  let result = text;
  
  // Replace emails
  result = result.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL]'
  );
  
  // Replace phone numbers
  result = result.replace(
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    '[PHONE]'
  );
  
  // Replace SSN
  result = result.replace(
    /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    '[SSN]'
  );
  
  // Replace credit cards
  result = result.replace(
    /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
    '[CARD]'
  );
  
  return result;
}

// Content filter middleware
export function contentFilter(
  req: Request,
  res: Response<APIResponse>,
  next: NextFunction
): void {
  if (!config.features.contentFilter) {
    next();
    return;
  }
  
  // Get text content from request body
  const textFields = ['command', 'input', 'message', 'context', 'prompt', 'query'];
  const textsToCheck: string[] = [];
  
  for (const field of textFields) {
    if (req.body[field] && typeof req.body[field] === 'string') {
      textsToCheck.push(req.body[field]);
    }
  }
  
  if (textsToCheck.length === 0) {
    next();
    return;
  }
  
  // Check all text fields
  for (const text of textsToCheck) {
    const result = checkContent(text);
    
    if (!result.safe) {
      const categories = result.flaggedCategories.join(', ');
      console.warn('Content filter blocked request:', {
        categories,
        ip: req.ip,
        userId: req.user?.userId,
      });
      
      // Handle self-harm specially
      if (result.flaggedCategories.includes('selfHarm')) {
        res.status(400).json({
          success: false,
          error: 'We care about your wellbeing',
          message: 'If you\'re having difficult thoughts, please reach out to a trusted adult or crisis helpline. You\'re not alone.',
        });
        return;
      }
      
      res.status(400).json({
        success: false,
        error: 'Content not allowed',
        message: 'Your message contains content that cannot be processed. Please rephrase.',
      });
      return;
    }
  }
  
  next();
}

// Strip PII middleware (for anonymized classrooms)
export function stripPIIMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const textFields = ['command', 'input', 'message', 'context', 'output'];
  
  for (const field of textFields) {
    if (req.body[field] && typeof req.body[field] === 'string') {
      req.body[field] = stripPII(req.body[field]);
    }
  }
  
  next();
}

// AI output filter (to be used in AI service)
export function filterAIOutput(output: string): { text: string; wasFiltered: boolean } {
  const result = checkContent(output);
  
  if (!result.safe) {
    console.warn('AI output filtered:', result.flaggedCategories);
    
    // Return sanitized version
    return {
      text: 'I apologize, but I cannot provide that type of content. Let me help you with something else.',
      wasFiltered: true,
    };
  }
  
  return {
    text: output,
    wasFiltered: false,
  };
}

// Check if content is educational/appropriate for age group
export function isAgeAppropriate(text: string, ageGroup: 'child' | 'teen' | 'adult'): boolean {
  // More restrictive for younger users
  const result = checkContent(text);
  
  if (!result.safe) {
    return false;
  }
  
  if (ageGroup === 'child') {
    // Additional restrictions for children
    const childRestrictedPatterns = [
      /\b(violence|fight|battle|war)\b/gi,
      /\b(scary|horror|nightmare)\b/gi,
    ];
    
    for (const pattern of childRestrictedPatterns) {
      if (pattern.test(text)) {
        return false;
      }
    }
  }
  
  return true;
}
