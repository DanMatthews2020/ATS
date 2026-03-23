import { dashboardRepository } from '../repositories/dashboard.repository';

export const dashboardService = {
  async getStats() {
    return dashboardRepository.getStats();
  },
};
