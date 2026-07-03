import { Router } from 'express';
import { getWorkOrders, getWorkOrder, createWorkOrder, updateWorkOrder, deleteWorkOrder, getSuitBalance } from '../controllers/workOrderController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getWorkOrders);
router.get('/suit-balance', getSuitBalance);
router.get('/:id', getWorkOrder);
router.post('/', createWorkOrder);
router.put('/:id', updateWorkOrder);
router.delete('/:id', deleteWorkOrder);

export default router;
