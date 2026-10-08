// server/src/utils/jwt.ts
// JSON Web Token helper utilities for FieldSync

import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fieldsync-secure-jwt-secret-key-et-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

/**
 * Sign a JWT token with user credentials and expiration
 */
export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
};

/**
 * Verify and decode a JWT token
 */
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export default {
  signToken,
  verifyToken,
};
