import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getPayments = async (req: Request, res: Response) => {
  try {
    const { karigarId, type, startDate, endDate, page = '1', limit = '10' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (karigarId) where.karigarId = karigarId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(String(startDate));
      if (endDate) where.date.lte = new Date(String(endDate));
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
        include: { karigar: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ data: payments, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch payments', message: error.message });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  try {
    const { karigarId, amount, type, date, notes } = req.body;
    const payment = await prisma.payment.create({
      data: {
        karigarId,
        amount: parseFloat(amount),
        type,
        date: date ? new Date(date) : new Date(),
        notes,
      },
      include: { karigar: true },
    });
    res.status(201).json(payment);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create payment', message: error.message });
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  try {
    const { amount, type, date, notes } = req.body;
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        type,
        date: date ? new Date(date) : undefined,
        notes,
      },
    });
    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update payment', message: error.message });
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  try {
    await prisma.payment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Payment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete payment', message: error.message });
  }
};
