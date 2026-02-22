import { Request, Response, NextFunction } from 'express';

const MOMENTAIC_API_KEY = process.env.MOMENTAIC_API_KEY || 'sk_dev_momentaic_123';

export const momentaicAuth = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-momentaic-api-key'];

    if (!apiKey || apiKey !== MOMENTAIC_API_KEY) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid or missing x-momentaic-api-key header'
        });
    }

    next();
};
