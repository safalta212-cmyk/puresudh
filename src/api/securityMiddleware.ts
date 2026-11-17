/**
 * Security & Abuse Protection Middleware
 * - IP Sliding Window Rate Limiting
 * - Input Sanitization & Anti-XSS Guards
 * - Security Headers
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically (unref so it doesn't block process exit)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

/**
 * Creates an in-memory rate limiter for specific route scopes.
 * @param windowMs Time window in milliseconds
 * @param max Max requests within that window per IP
 * @param message Custom message on rate exceeded
 */
export function createRateLimiter(windowMs: number, max: number, message: string = 'Too many requests. Please try again shortly.') {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown-client';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, record);
      return next();
    }

    record.count++;
    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(429).json({
        error: message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };
}

/**
 * Strips script tags, HTML injection payloads, and trims strings recursively.
 */
export function sanitizeInput(value: any): any {
  if (typeof value === 'string') {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/onerror\s*=/gi, '')
      .replace(/onload\s*=/gi, '')
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeInput);
  }
  if (value !== null && typeof value === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitizedObj[k] = sanitizeInput(v);
    }
    return sanitizedObj;
  }
  return value;
}

/**
 * Express middleware that recursively sanitizes request body and query params.
 */
export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeInput(req.query);
  }
  next();
}

/**
 * Applies strict HTTP security headers compatible with container iframe preview.
 */
export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
}

/**
 * Role-Based Access Control (RBAC) middleware for API routes.
 * Inspects authoritative x-user-role and x-user-email headers.
 */
export function requireRole(allowedRoles: ('customer' | 'admin' | 'staff' | 'vendor')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawRole = (req.headers['x-user-role'] as string)?.toLowerCase();
    const rawEmail = (req.headers['x-user-email'] as string)?.toLowerCase();

    const validAdminEmail = (process.env.ADMIN_EMAIL || 'aanews70@gmail.com').trim().toLowerCase();
    // Determine role authoritatively
    let effectiveRole: 'customer' | 'admin' | 'staff' | 'vendor' = 'customer';
    if (rawEmail) {
      if (rawEmail === validAdminEmail) {
        effectiveRole = 'admin';
      } else if (rawEmail === 'staff@puresudh.com' || rawEmail.startsWith('staff')) {
        effectiveRole = 'staff';
      } else if (rawEmail === 'vendor@puresudh.com' || rawEmail.startsWith('vendor')) {
        effectiveRole = 'vendor';
      } else if (rawRole && ['admin', 'staff', 'vendor', 'customer'].includes(rawRole)) {
        effectiveRole = rawRole as any;
      }
    } else if (rawRole && ['admin', 'staff', 'vendor', 'customer'].includes(rawRole)) {
      effectiveRole = rawRole as any;
    }

    // Admins always have access to all routes
    if (effectiveRole === 'admin') {
      (req as any).userRole = 'admin';
      return next();
    }

    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Requires one of [${allowedRoles.join(', ')}]. Your authenticated role is '${effectiveRole}'.`,
        userRole: effectiveRole,
        requiredRoles: allowedRoles,
      });
    }

    (req as any).userRole = effectiveRole;
    next();
  };
}
