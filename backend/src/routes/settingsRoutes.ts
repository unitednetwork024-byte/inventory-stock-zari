import { Router } from 'express';
import { changePassword, backupData, restoreData, resetData } from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/change-password', authenticate, changePassword);
router.get('/backup', authenticate, backupData);
router.post('/restore', authenticate, restoreData);
router.post('/reset', authenticate, resetData);

export default router;
