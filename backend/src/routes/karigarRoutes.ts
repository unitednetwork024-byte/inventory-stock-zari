import { Router } from 'express';
import { getKarigars, getKarigar, getKarigarHistory, createKarigar, updateKarigar, deleteKarigar } from '../controllers/karigarController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getKarigars);
router.get('/:id/history', getKarigarHistory);
router.get('/:id', getKarigar);
router.post('/', createKarigar);
router.put('/:id', updateKarigar);
router.delete('/:id', deleteKarigar);

export default router;
