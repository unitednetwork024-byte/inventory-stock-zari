import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const [
      totalKarigars,
      activeKarigars,
      totalWorkOrders,
      activeWorkOrders,
      pendingWorkOrders,
      completedWorkOrders,
      totalPayments,
      totalAdvances,
      recentWorkOrders,
      recentPayments,
    ] = await Promise.all([
      prisma.karigar.count(),
      prisma.karigar.count({ where: { status: 'ACTIVE' } }),
      prisma.workOrder.count(),
      prisma.workOrder.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS', 'PARTIALLY_RECEIVED'] } } }),
      prisma.workOrder.count({ where: { status: 'PENDING' } }),
      prisma.workOrder.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { type: 'PAYMENT' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { type: 'ADVANCE' } }),
      prisma.workOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { karigar: { select: { name: true } }, items: { include: { product: true } } },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { karigar: { select: { name: true } } },
      }),
    ]);

    // Calculate total work value
    const allWorkOrderItems = await prisma.workOrderItem.findMany({
      select: { quantity: true, ratePerPiece: true, receivedQty: true },
    });

    const totalWorkValue = allWorkOrderItems.reduce((s, i) => s + i.quantity * i.ratePerPiece, 0);
    const totalReceivedValue = allWorkOrderItems.reduce((s, i) => s + i.receivedQty * i.ratePerPiece, 0);
    const totalPaid = totalPayments._sum.amount || 0;
    const totalAdvance = totalAdvances._sum.amount || 0;
    const totalDue = totalWorkValue - totalPaid - totalAdvance;

    res.json({
      stats: {
        totalKarigars,
        activeKarigars,
        totalWorkOrders,
        activeWorkOrders,
        pendingWorkOrders,
        completedWorkOrders,
        totalWorkValue,
        totalReceivedValue,
        totalPaid,
        totalAdvance,
        totalDue,
      },
      recentWorkOrders,
      recentPayments,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch dashboard', message: error.message });
  }
};
