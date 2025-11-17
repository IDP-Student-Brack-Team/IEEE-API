import { Prisma } from '@prisma/client';

/**
 * Seleção de campos públicos para o modelo User.
 */
export const userPublicSelect: Prisma.UserSelect = {
  id: true,
  email: true,
  name: true,
  ieeeNumber: true,
  isVerified: true,
  role: true,
  bio: true,
  avatarUrl: true,
  createdAt: true
};