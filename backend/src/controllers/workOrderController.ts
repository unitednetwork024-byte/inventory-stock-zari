import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getWorkOrders = async (req: Request, res: Response) => {
  try {
    const { status, karigarId, search, page = '1', limit = '10' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (karigarId) where.karigarId = karigarId;
    if (search) {
      where.karigar = { name: { contains: String(search) } };
    }

    const [workOrders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          karigar: { select: { id: true, name: true, phone: true } },
          items: { include: { product: true } },
          _count: { select: { receipts: true } },
        },
      }),
      prisma.workOrder.count({ where }),
    ]);

    res.json({ data: workOrders, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch work orders', message: error.message });
  }
};

export const getWorkOrder = async (req: Request, res: Response) => {
  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: req.params.id },
      include: {
        karigar: true,
        items: { include: { product: true, receiptItems: true } },
        receipts: {
          orderBy: { date: 'desc' },
          include: { items: { include: { workOrderItem: { include: { product: true } } } } },
        },
      },
    });
    if (!workOrder) return res.status(404).json({ error: 'Work order not found' });

    // Fetch karigar payments for due amount calculation
    const karigarPayments = await prisma.payment.findMany({
      where: { karigarId: workOrder.karigarId },
      orderBy: { date: 'desc' },
    });

    const totalAmount = workOrder.items.reduce((s, i) => s + i.quantity * i.ratePerPiece, 0);
    const totalReceived = workOrder.items.reduce((s, i) => s + i.receivedQty, 0);
    const totalAssigned = workOrder.items.reduce((s, i) => s + i.quantity, 0);
    const totalPaid = karigarPayments.reduce((s, p) => s + p.amount, 0);

    res.json({ ...workOrder, payments: karigarPayments, summary: { totalAmount, totalReceived, totalAssigned, totalPaid, dueAmount: totalAmount - totalPaid } });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch work order', message: error.message });
  }
};

export const createWorkOrder = async (req: Request, res: Response) => {
  try {
    const { karigarId, deadline, notes, items } = req.body;

    const workOrder = await prisma.workOrder.create({
      data: {
        karigarId,
        deadline: deadline ? new Date(deadline) : null,
        notes,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            ratePerPiece: item.ratePerPiece,
          })),
        },
      },
      include: { items: { include: { product: true } }, karigar: true },
    });

    res.status(201).json(workOrder);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create work order', message: error.message });
  }
};

export const updateWorkOrder = async (req: Request, res: Response) => {
  try {
    const { status, deadline, notes } = req.body;
    const data: any = {};
    if (status) data.status = status;
    if (deadline) data.deadline = new Date(deadline);
    if (notes !== undefined) data.notes = notes;

    const workOrder = await prisma.workOrder.update({
      where: { id: req.params.id },
      data,
      include: { items: { include: { product: true } }, karigar: true },
    });

    res.json(workOrder);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update work order', message: error.message });
  }
};

export const getSuitBalance = async (req: Request, res: Response) => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        karigar: { select: { id: true, name: true, phone: true } },
        items: {
          include: { product: true },
        },
        receipts: { select: { id: true, date: true } },
      },
    });

    // Get all payments grouped by karigar
    const payments = await prisma.payment.findMany({
      select: { karigarId: true, amount: true, type: true },
    });

    const paymentMap: Record<string, number> = {};
    for (const p of payments) {
      paymentMap[p.karigarId] = (paymentMap[p.karigarId] || 0) + p.amount;
    }

    const balance = workOrders.map((wo) => {
      const totalSuits = wo.items.reduce((s, i) => s + i.quantity, 0);
      const receivedSuits = wo.items.reduce((s, i) => s + i.receivedQty, 0);
      const pendingSuits = totalSuits - receivedSuits;
      const totalValue = wo.items.reduce((s, i) => s + i.quantity * i.ratePerPiece, 0);
      const receivedValue = wo.items.reduce((s, i) => s + i.receivedQty * i.ratePerPiece, 0);
      const totalPaid = paymentMap[wo.karigarId] || 0;
      const dueAmount = totalValue - totalPaid;

      return {
        workOrderId: wo.id,
        karigar: wo.karigar,
        status: wo.status,
        deadline: wo.deadline,
        createdAt: wo.createdAt,
        items: wo.items,
        totalSuits,
        receivedSuits,
        pendingSuits,
        totalValue,
        receivedValue,
        totalPaid,
        dueAmount,
        receiptsCount: wo.receipts.length,
      };
    });

    res.json({ data: balance });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch suit balance', message: error.message });
  }
};

export const deleteWorkOrder = async (req: Request, res: Response) => {
  try {
    await prisma.workOrder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Work order deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete work order', message: error.message });
  }
};
