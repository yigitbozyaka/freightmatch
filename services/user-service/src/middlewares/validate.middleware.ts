import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ErrorCode } from '../types';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const messages = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    res.status(400).json({
      error: ErrorCode.VALIDATION_ERROR,
      message: messages,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  req.body = result.data;
  next();
};
