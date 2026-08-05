import { prisma } from '../../config/db.js';

export const pricingRepository = {
  listZones() {
    return prisma.zone.findMany({ orderBy: { name: 'asc' } });
  },

  findRoute(fromZoneId: string, toZoneId: string) {
    return prisma.zoneRoute.findUnique({
      where: { fromZoneId_toZoneId: { fromZoneId, toZoneId } },
    });
  },
};
