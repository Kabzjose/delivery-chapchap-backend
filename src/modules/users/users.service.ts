import bcrypt from 'bcrypt';
import { usersRepository } from './users.repository.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';
import type { CreateUserByAdminInput } from './users.schema.js';
import type { Role } from '@prisma/client';

const SALT_ROUNDS = 12;

export const usersService = {
  async createByAdmin(input: CreateUserByAdminInput) {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    return usersRepository.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
    });
  },

  async list(role: Role | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      usersRepository.findMany({ role, skip, take: limit }),
      usersRepository.count(role),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async deactivate(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new BadRequestError('You cannot deactivate your own account');
    }
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return usersRepository.deactivate(id);
  },
};
