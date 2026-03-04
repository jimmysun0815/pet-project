import { Request, Response, NextFunction } from 'express';

export interface AuthPayload {
  userId: number;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// Auth bypass for development: all requests get a default admin user.
// Replace with real JWT verification when integrating Supabase or similar.
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  req.user = { userId: 1, role: 'admin' };
  next();
}

export function requireRole(..._roles: string[]) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
}
