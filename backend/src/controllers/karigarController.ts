import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getKarigars = async (req: Request, res: Response) => {
  try {
    const { search, status, page = '1', limit = '10' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { phone: { contains: String(search) } },
      ];
    }
    if (status) where.status = status;

    const [karigars, total] = await Promise.all([
      prisma.karigar.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { workOrders: true, payments: true } } },
      }),
      prisma.karigar.count({ where }),
    ]);

    res.json({ data: karigars, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch karigars', message: error.message });
  }
};

export const getKarigar = async (req: Request, res: Response) => {
  try {
    const karigar = await prisma.karigar.findUnique({
      where: { id: req.params.id },
      include: {
        workOrders: { include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { date: 'desc' } },
      },
    });
    if (!karigar) return res.status(404).json({ error: 'Karigar not found' });

    const totalEarned = karigar.workOrders.reduce((sum, wo) => {
      return sum + wo.items.reduce((s, i) => s + i.quantity * i.ratePerPiece, 0);
    }, 0);
    const totalPaid = karigar.payments.reduce((s, p) => s + p.amount, 0);
    const balanceDue = totalEarned - totalPaid;

    res.json({ ...karigar, summary: { totalEarned, totalPaid, balanceDue } });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch karigar', message: error.message });
  }
};

export const getKarigarHistory = async (req: Request, res: Response) => {
  try {
    const karigar = await prisma.karigar.findUnique({
      where: { id: req.params.id },
      include: {
        workOrders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: { include: { product: true } },
            receipts: {
              orderBy: { date: 'desc' },
              include: { items: { include: { workOrderItem: { include: { product: true } } } } },
            },
          },
        },
        payments: { orderBy: { date: 'desc' } },
      },
    });
    if (!karigar) return res.status(404).json({ error: 'Karigar not found' });

    const workOrderSummaries = karigar.workOrders.map((wo) => {
      const totalSuits = wo.items.reduce((s, i) => s + i.quantity, 0);
      const receivedSuits = wo.items.reduce((s, i) => s + i.receivedQty, 0);
      const pendingSuits = totalSuits - receivedSuits;
      const totalValue = wo.items.reduce((s, i) => s + i.quantity * i.ratePerPiece, 0);
      const receivedValue = wo.items.reduce((s, i) => s + i.receivedQty * i.ratePerPiece, 0);
      return { ...wo, totalSuits, receivedSuits, pendingSuits, totalValue, receivedValue };
    });

    const totalValue = workOrderSummaries.reduce((s, wo) => s + wo.totalValue, 0);
    const totalPaid = karigar.payments.reduce((s, p) => s + p.amount, 0);
    const totalSuits = workOrderSummaries.reduce((s, wo) => s + wo.totalSuits, 0);
    const totalReceived = workOrderSummaries.reduce((s, wo) => s + wo.receivedSuits, 0);
    const totalPending = workOrderSummaries.reduce((s, wo) => s + wo.pendingSuits, 0);
    const dueAmount = totalValue - totalPaid;

    res.json({
      karigar: { id: karigar.id, name: karigar.name, phone: karigar.phone, specialty: karigar.specialty, status: karigar.status },
      summary: { totalValue, totalPaid, dueAmount, totalSuits, totalReceived, totalPending },
      workOrders: workOrderSummaries,
      payments: karigar.payments,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch karigar history', message: error.message });
  }
};

export const createKarigar = async (req: Request, res: Response) => {
  try {
    const { name, phone, address, specialty, status } = req.body;
    const karigar = await prisma.karigar.create({ data: { name, phone, address, specialty, status } });
    res.status(201).json(karigar);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create karigar', message: error.message });
  }
};

export const updateKarigar = async (req: Request, res: Response) => {
  try {
    const { name, phone, address, specialty, status } = req.body;
    const karigar = await prisma.karigar.update({
      where: { id: req.params.id },
      data: { name, phone, address, specialty, status },
    });
    res.json(karigar);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update karigar', message: error.message });
  }
};

export const deleteKarigar = async (req: Request, res: Response) => {
  try {
    await prisma.karigar.delete({ where: { id: req.params.id } });
    res.json({ message: 'Karigar deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete karigar', message: error.message });
  }
};
