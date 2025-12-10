import { Router } from 'express';
import multer from 'multer';
import { aiController } from '@controllers/AIController';
import { authenticate, requireTier } from '@middleware/auth';
import { validate, validatePagination, validateUUID, validateFile } from '@middleware/validation';
import { aiRateLimit, rateLimit } from '@middleware/rateLimit';
import { aiSchemas } from '@utils/validators';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// All AI routes require authentication
router.use(authenticate);

// =========== AI Generation Endpoints ===========

// Chat with AI
router.post(
  '/chat',
  aiRateLimit,
  validate(aiSchemas.chat),
  aiController.chat
);

// Image generation (requires OPERATIVE+ tier)
router.post(
  '/generate-image',
  requireTier('OPERATIVE', 'PRO_CREATOR'),
  aiRateLimit,
  rateLimit({ keyPrefix: 'ai:generate-image', maxRequests: 5, windowMs: 60000 }),
  validate(aiSchemas.generateImage),
  aiController.generateImage
);

// Game generation (requires PRO tier)
router.post(
  '/generate-game',
  requireTier('PRO_CREATOR'),
  aiRateLimit,
  rateLimit({ keyPrefix: 'ai:generate-game', maxRequests: 2, windowMs: 60000 }),
  validate(aiSchemas.generateGame),
  aiController.generateGame
);

// Vision analysis
router.post(
  '/vision-analyze',
  aiRateLimit,
  validate(aiSchemas.visionAnalyze),
  aiController.analyzeVision
);

// Voice synthesis (requires OPERATIVE+ tier)
router.post(
  '/voice-synth',
  requireTier('OPERATIVE', 'PRO_CREATOR'),
  aiRateLimit,
  validate(aiSchemas.voiceSynth),
  aiController.synthesizeVoice
);

// Live API token (requires PRO tier)
router.post(
  '/live-token',
  requireTier('PRO_CREATOR'),
  rateLimit({ keyPrefix: 'ai:live-token', maxRequests: 10, windowMs: 60000 }),
  aiController.getLiveToken
);

// =========== Agent Management ===========

// List agents
router.get('/agents', validatePagination, aiController.listAgents);

// Create agent
router.post(
  '/agents',
  validate(aiSchemas.createAgent),
  aiController.createAgent
);

// Get specific agent
router.get('/agents/:id', validateUUID('id'), aiController.getAgent);

// Update agent
router.put(
  '/agents/:id',
  validateUUID('id'),
  validate(aiSchemas.updateAgent),
  aiController.updateAgent
);

// Delete agent
router.delete('/agents/:id', validateUUID('id'), aiController.deleteAgent);

// Rate agent
router.post(
  '/agents/:id/rate',
  validateUUID('id'),
  validate(aiSchemas.rateAgent),
  aiController.rateAgent
);

// =========== Knowledge Base (RAG) ===========

// Upload document to knowledge base
router.post(
  '/agents/:id/knowledge',
  validateUUID('id'),
  upload.single('file'),
  validateFile({
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['application/pdf', 'text/plain', 'text/markdown', 'application/json'],
  }),
  aiController.uploadKnowledge
);

// Add text to knowledge base
router.post(
  '/agents/:id/knowledge/text',
  validateUUID('id'),
  validate(aiSchemas.addKnowledgeText),
  aiController.addKnowledgeText
);

// Get knowledge base stats
router.get('/agents/:id/knowledge/stats', validateUUID('id'), aiController.getKnowledgeStats);

// Clear knowledge base
router.delete('/agents/:id/knowledge', validateUUID('id'), aiController.deleteKnowledge);

export default router;
