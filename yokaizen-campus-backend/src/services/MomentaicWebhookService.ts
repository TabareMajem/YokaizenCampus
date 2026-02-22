import axios from 'axios';

const MOMENTAIC_WEBHOOK_URL = process.env.MOMENTAIC_WEBHOOK_URL || 'https://momentaic.com/api/v1/webhooks/yokaizen';
const MOMENTAIC_API_KEY = process.env.MOMENTAIC_API_KEY || 'sk_dev_momentaic_123';

export class MomentaicWebhookService {
    /**
     * Dispatches a webhook to Momentaic when a Yokaizen AgentExecutor task finishes.
     */
    static async dispatchTaskCompleted(jobId: string, agentType: string, resultPayload: any) {
        try {
            const payload = {
                event: 'task.completed',
                data: {
                    job_id: jobId,
                    agent: agentType,
                    result_payload: resultPayload
                }
            };

            console.log(`[Webhook Dispatcher] Firing task.completed for job: ${jobId}`);

            // We wrap in a try-catch so failing to reach Momentaic doesn't crash Yokaizen
            await axios.post(MOMENTAIC_WEBHOOK_URL, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-yokaizen-webhook-key': MOMENTAIC_API_KEY
                }
            });
            console.log(`[Webhook Dispatcher] Successfully notified Momentaic of task completion.`);
        } catch (error: any) {
            console.error(`[Webhook Dispatcher] Failed to notify Momentaic: ${error.message}`);
        }
    }

    /**
     * Dispatches a webhook to Momentaic when a Sniper or Outreach agent captures a lead.
     */
    static async dispatchLeadCaptured(characterId: string, leadEmail: string, sentiment: string, message: string) {
        try {
            const payload = {
                event: 'lead.captured',
                data: {
                    character_id: characterId,
                    lead_email: leadEmail,
                    sentiment: sentiment,
                    message: message
                }
            };

            console.log(`[Webhook Dispatcher] Firing lead.captured for character: ${characterId}`);

            await axios.post(MOMENTAIC_WEBHOOK_URL, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-yokaizen-webhook-key': MOMENTAIC_API_KEY
                }
            });
            console.log(`[Webhook Dispatcher] Successfully notified Momentaic of lead capture.`);
        } catch (error: any) {
            console.error(`[Webhook Dispatcher] Failed to notify Momentaic of lead capture: ${error.message}`);
        }
    }
}
