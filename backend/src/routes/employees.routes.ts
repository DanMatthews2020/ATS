import { Router } from 'express';
import { employeesController } from '../controllers/employees.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/export',   authenticate, employeesController.exportCsv);
router.get('/',         authenticate, employeesController.getAll);
router.post('/',        authenticate, employeesController.create);
router.get('/:id',      authenticate, employeesController.getById);
router.patch('/:id',    authenticate, employeesController.update);

export default router;
