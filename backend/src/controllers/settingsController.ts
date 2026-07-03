import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import path from 'path';
import fs from 'fs';

// ── Change Password ────────────────────────────────────────────────────────────
export const changePassword = async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to change password', message: error.message });
  }
};

// ── Backup: export all data as JSON ───────────────────────────────────────────
export const backupData = async (req: any, res: Response) => {
  try {
    const [karigars, products, workOrders, workOrderItems, receipts, receiptItems, payments, users] =
      await Promise.all([
        prisma.karigar.findMany(),
        prisma.product.findMany(),
        prisma.workOrder.findMany(),
        prisma.workOrderItem.findMany(),
        prisma.receipt.findMany(),
        prisma.receiptItem.findMany(),
        prisma.payment.findMany(),
        prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
      ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: { karigars, products, workOrders, workOrderItems, receipts, receiptItems, payments, users },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="zari-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(backup);
  } catch (error: any) {
    res.status(500).json({ error: 'Backup failed', message: error.message });
  }
};

// ── Restore: import backup JSON ───────────────────────────────────────────────
export const restoreData = async (req: any, res: Response) => {
  try {
    const backup = req.body;
    if (!backup?.data) return res.status(400).json({ error: 'Invalid backup file format' });

    const { karigars, products, workOrders, workOrderItems, receipts, receiptItems, payments } = backup.data;

    // Delete in reverse dependency order
    await prisma.receiptItem.deleteMany();
    await prisma.receipt.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.workOrderItem.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.product.deleteMany();
    await prisma.karigar.deleteMany();

    // Re-insert
    if (karigars?.length)      await prisma.karigar.createMany({ data: karigars });
    if (products?.length)      await prisma.product.createMany({ data: products });
    if (workOrders?.length)    await prisma.workOrder.createMany({ data: workOrders });
    if (workOrderItems?.length) await prisma.workOrderItem.createMany({ data: workOrderItems });
    if (receipts?.length)      await prisma.receipt.createMany({ data: receipts });
    if (receiptItems?.length)  await prisma.receiptItem.createMany({ data: receiptItems });
    if (payments?.length)      await prisma.payment.createMany({ data: payments });

    res.json({ message: 'Data restored successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Restore failed', message: error.message });
  }
};

// ── Reset All Data ─────────────────────────────────────────────────────────────
export const resetData = async (req: any, res: Response) => {
  try {
    const { confirmText } = req.body;
    if (confirmText !== 'RESET') {
      return res.status(400).json({ error: 'Confirmation text must be RESET' });
    }

    await prisma.receiptItem.deleteMany();
    await prisma.receipt.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.workOrderItem.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.product.deleteMany();
    await prisma.karigar.deleteMany();

    res.json({ message: 'All data has been reset successfully. Users are preserved.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Reset failed', message: error.message });
  }
};
