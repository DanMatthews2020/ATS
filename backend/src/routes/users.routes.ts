import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../utils/response';

const router = Router();

router.get('/', authenticate, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
  sendSuccess(res, { users });
});

export default router;
