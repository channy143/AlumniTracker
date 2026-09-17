import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      const isLogin = req.path === '/login' || req.originalUrl?.includes('/auth/login');
      const message = isLogin
        ? 'Wrong username and password, try again.'
        : (errors[0]?.message || 'Please check the required fields.');

      return res.status(400).json({
        message,
        errors,
      });
    }

    req.body = result.data;
    next();
  };
}
