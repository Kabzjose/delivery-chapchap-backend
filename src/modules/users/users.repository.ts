import { prisma } from '../../config/db.js';
import type { Role } from '@prisma/client';

export const usersRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
    });
  },

  create(data: { name: string; email: string; phone: string; passwordHash: string; role: Role }) {
    return prisma.user.create({
      data,
      // passwordHash is never in select — structurally impossible to leak it in a response
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
  },

  findMany(params: { role?: Role; skip: number; take: number }) {
    const { role, skip, take } = params;
    return prisma.user.findMany({
      where: { ...(role && { role }) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  count(role?: Role) {
    return prisma.user.count({ where: { ...(role && { role }) } });
  },

  deactivate(id: string) {
    return prisma.user.update({ where: { id }, data: { isActive: false } });
  },
};
