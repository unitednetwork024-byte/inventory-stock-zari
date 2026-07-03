import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getReceipts = async (req: Request, res: Response) => {
  try {
    const { workOrderId, page = '1', limit = '10' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (workOrderId) where.workOrderId = workOrderId;

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
        include: {
          workOrder: { include: { karigar: { select: { id: true, name: true, phone: true } } } },
          items: { include: { workOrderItem: { include: { product: true } } } },
        },
      }),
      prisma.receipt.count({ where }),
    ]);

    res.json({ data: receipts, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch receipts', message: error.message });
  }
};

export const getReceipt = async (req: Request, res: Response) => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      include: {
        workOrder: { include: { karigar: true, items: { include: { product: true } } } },
        items: { include: { workOrderItem: { include: { product: true } } } },
      },
    });
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json(receipt);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch receipt', message: error.message });
  }
};

export const createReceipt = async (req: Request, res: Response) => {
  try {
    const { workOrderId, date, notes, items } = req.body;

    // Create receipt and update received quantities in a transaction
    const receipt = await prisma.$transaction(async (tx) => {
      const newReceipt = await tx.receipt.create({
        data: {
          workOrderId,
          date: date ? new Date(date) : new Date(),
          notes,
          items: {
            create: items.map((item: any) => ({
              workOrderItemId: item.workOrderItemId,
              quantity: item.quantity,
              qualityNotes: item.qualityNotes,
            })),
          },
        },
        include: { items: true },
      });

      // Update receivedQty on WorkOrderItems
      for (const item of items) {
        await tx.workOrderItem.update({
          where: { id: item.workOrderItemId },
          data: { receivedQty: { increment: item.quantity } },
        });
      }

      // Check if work order should be marked as partially received or completed
      const workOrder = await tx.workOrder.findUnique({
        where: { id: workOrderId },
        include: { items: true },
      });

      if (workOrder) {
        const allReceived = workOrder.items.every(i => i.receivedQty >= i.quantity);
        const someReceived = workOrder.items.some(i => i.receivedQty > 0);

        const newStatus = allReceived ? 'COMPLETED' : someReceived ? 'PARTIALLY_RECEIVED' : workOrder.status;
        if (newStatus !== workOrder.status) {
          await tx.workOrder.update({ where: { id: workOrderId }, data: { status: newStatus } });
        }
      }

      return newReceipt;
    });

    res.status(201).json(receipt);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create receipt', message: error.message });
  }
};

export const deleteReceipt = async (req: Request, res: Response) => {
  try {
    // Reverse the received quantities
    await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!receipt) throw new Error('Receipt not found');

      for (const item of receipt.items) {
        await tx.workOrderItem.update({
          where: { id: item.workOrderItemId },
          data: { receivedQty: { decrement: item.quantity } },
        });
      }

      await tx.receipt.delete({ where: { id: req.params.id } });
    });

    res.json({ message: 'Receipt deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete receipt', message: error.message });
  }
};
