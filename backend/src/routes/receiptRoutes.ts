import { Router } from 'express';
import { getReceipts, getReceipt, createReceipt, deleteReceipt } from '../controllers/receiptController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getReceipts);
router.get('/:id', getReceipt);
router.post('/', createReceipt);
router.delete('/:id', deleteReceipt);

export default router;
