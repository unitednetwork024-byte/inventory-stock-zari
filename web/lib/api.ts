import axios from 'axios';

// Interfaces for Zari Database Entities
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
}

export interface Karigar {
  id: string;
  name: string;
  phone: string;
  address?: string;
  specialty?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  description?: string;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderItem {
  id: string;
  productId: string;
  quantity: number;
  ratePerPiece: number;
  receivedQty: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrder {
  id: string;
  karigarId: string;
  deadline?: string | null;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: WorkOrderItem[];
}

export interface Payment {
  id: string;
  karigarId: string;
  amount: number;
  type: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItem {
  id: string;
  workOrderItemId: string;
  quantity: number;
  qualityNotes?: string | null;
  createdAt: string;
}

export interface Receipt {
  id: string;
  workOrderId: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: ReceiptItem[];
}

// Helper for generating UUIDs
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const generateWorkOrderId = (existingWorkOrders: any[]) => {
  let maxNum = 0;
  existingWorkOrders.forEach(wo => {
    if (wo.id && wo.id.startsWith('WO-')) {
      const numPart = parseInt(wo.id.substring(3));
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });
  const nextNum = maxNum + 1;
  const formattedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
  return `WO-${formattedNum}`;
};

const generateReceiptId = (existingReceipts: any[]) => {
  let maxNum = 0;
  existingReceipts.forEach(r => {
    if (r.id && r.id.startsWith('RO-')) {
      const numPart = parseInt(r.id.substring(3));
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });
  const nextNum = maxNum + 1;
  const formattedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
  return `RO-${formattedNum}`;
};

// Database helper functions with generic type support
function getDB<T>(key: string, defaultValue: T[] = []): T[] {
  if (typeof window === 'undefined') return defaultValue;
  const data = localStorage.getItem(`zari_${key}`);
  return data ? JSON.parse(data) : defaultValue;
}

const saveDB = <T>(key: string, data: T[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`zari_${key}`, JSON.stringify(data));
};

// Read image as base64 helper
const readImageAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Populate seed data if database is empty
const initDB = () => {
  if (typeof window === 'undefined') return;
  
  // Seed Users
  if (!localStorage.getItem('zari_users')) {
    localStorage.setItem('zari_users', JSON.stringify([
      {
        id: '1',
        name: 'Zari Admin',
        email: 'admin@zari.com',
        password: 'admin',
        role: 'ADMIN'
      }
    ]));
  }

  const defaultKeys = ['karigars', 'products', 'work_orders', 'payments', 'receipts'];
  defaultKeys.forEach(key => {
    if (!localStorage.getItem(`zari_${key}`)) {
      localStorage.setItem(`zari_${key}`, JSON.stringify([]));
    }
  });
};

initDB();

// Mock API responses helper
const mockResponse = (data: any, status: number = 200) => {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {} as any,
  };
};

const mockError = (message: string, status: number = 400) => {
  const error = new Error(message) as any;
  error.response = {
    data: { error: message },
    status,
  };
  return Promise.reject(error);
};

// Define local mock routes
const mockAPI = {
  get: async (url: string): Promise<any> => {
    const parsedUrl = new URL(url, 'http://localhost');
    const path = parsedUrl.pathname;
    const query = parsedUrl.searchParams;

    // Load DB arrays
    const karigars = getDB<Karigar>('karigars');
    const products = getDB<Product>('products');
    const workOrders = getDB<WorkOrder>('work_orders');
    const payments = getDB<Payment>('payments');
    const receipts = getDB<Receipt>('receipts');

    // 1. Dashboard Endpoint
    if (path === '/dashboard') {
      const activeKarigars = karigars.filter(k => k.status === 'ACTIVE').length;
      const activeWorkOrders = workOrders.filter(w => ['PENDING', 'IN_PROGRESS', 'PARTIALLY_RECEIVED'].includes(w.status)).length;
      const pendingWorkOrders = workOrders.filter(w => w.status === 'PENDING').length;
      const completedWorkOrders = workOrders.filter(w => w.status === 'COMPLETED').length;

      // Extract all items from work orders
      const allItems = workOrders.flatMap(w => w.items || []);
      const totalWorkValue = allItems.reduce((sum, item) => sum + (item.quantity * item.ratePerPiece), 0);
      const totalReceivedValue = allItems.reduce((sum, item) => sum + ((item.receivedQty || 0) * item.ratePerPiece), 0);

      const totalPaid = payments.filter(p => p.type === 'PAYMENT').reduce((sum, p) => sum + p.amount, 0);
      const totalAdvance = payments.filter(p => p.type === 'ADVANCE').reduce((sum, p) => sum + p.amount, 0);
      const totalDue = totalWorkValue - totalPaid - totalAdvance;

      // Sort and take recent 5
      const recentWorkOrders = [...workOrders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(w => {
          const karigar = karigars.find(k => k.id === w.karigarId);
          return {
            ...w,
            karigar: karigar ? { name: karigar.name } : { name: 'Unknown' },
            items: (w.items || []).map(item => {
              const prod = products.find(p => p.id === item.productId);
              return { ...item, product: prod };
            })
          };
        });

      const recentPayments = [...payments]
        .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
        .slice(0, 5)
        .map(p => {
          const karigar = karigars.find(k => k.id === p.karigarId);
          return { ...p, karigar: karigar ? { name: karigar.name } : { name: 'Unknown' } };
        });

      return mockResponse({
        stats: {
          totalKarigars: karigars.length,
          activeKarigars,
          totalWorkOrders: workOrders.length,
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
        recentPayments
      });
    }

    // 2. Karigars List & Search
    if (path === '/karigars') {
      const search = query.get('search')?.toLowerCase() || '';
      const status = query.get('status') || '';
      const page = parseInt(query.get('page') || '1');
      const limit = parseInt(query.get('limit') || '10');

      let filtered = [...karigars];
      if (search) {
        filtered = filtered.filter(k => 
          k.name.toLowerCase().includes(search) || 
          k.phone.toLowerCase().includes(search)
        );
      }
      if (status) {
        filtered = filtered.filter(k => k.status === status);
      }

      // Sort
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Paginate
      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit).map(k => {
        const wCount = workOrders.filter(w => w.karigarId === k.id).length;
        const pCount = payments.filter(p => p.karigarId === k.id).length;
        return {
          ...k,
          _count: { workOrders: wCount, payments: pCount }
        };
      });

      return mockResponse({
        data: paginated,
        total: filtered.length,
        page,
        limit
      });
    }

    // 3. Karigar History
    if (path.startsWith('/karigars/') && path.endsWith('/history')) {
      const parts = path.split('/');
      const karigarId = parts[2];
      const karigar = karigars.find(k => k.id === karigarId);
      if (!karigar) return mockError('Karigar not found', 404);

      // Filter work orders
      const karigarOrders = workOrders.filter(w => w.karigarId === karigarId);
      const karigarPayments = payments.filter(p => p.karigarId === karigarId);

      const workOrderSummaries = karigarOrders.map(wo => {
        const totalSuits = (wo.items || []).reduce((s, i) => s + i.quantity, 0);
        const receivedSuits = (wo.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
        const pendingSuits = totalSuits - receivedSuits;
        const totalValue = (wo.items || []).reduce((s, i) => s + i.quantity * i.ratePerPiece, 0);
        const receivedValue = (wo.items || []).reduce((s, i) => s + (i.receivedQty || 0) * i.ratePerPiece, 0);

        // Resolve product names for items
        const resolvedItems = (wo.items || []).map(item => {
          const prod = products.find(p => p.id === item.productId);
          return { ...item, product: prod };
        });

        // Resolve receipts for this work order
        const resolvedReceipts = receipts
          .filter(r => r.workOrderId === wo.id)
          .map(r => {
            const resolvedReceiptItems = (r.items || []).map(ri => {
              const item = wo.items.find(item => item.id === ri.workOrderItemId);
              const prod = item ? products.find(p => p.id === item.productId) : null;
              return {
                ...ri,
                workOrderItem: item ? { ...item, product: prod } : null
              };
            });
            return { ...r, items: resolvedReceiptItems };
          });

        return {
          ...wo,
          items: resolvedItems,
          receipts: resolvedReceipts,
          totalSuits,
          receivedSuits,
          pendingSuits,
          totalValue,
          receivedValue
        };
      });

      const totalValue = workOrderSummaries.reduce((s, wo) => s + wo.totalValue, 0);
      const totalPaid = karigarPayments.reduce((s, p) => s + p.amount, 0);
      const totalSuits = workOrderSummaries.reduce((s, wo) => s + wo.totalSuits, 0);
      const totalReceived = workOrderSummaries.reduce((s, wo) => s + wo.receivedSuits, 0);
      const totalPending = workOrderSummaries.reduce((s, wo) => s + wo.pendingSuits, 0);
      const dueAmount = totalValue - totalPaid;

      return mockResponse({
        karigar: { id: karigar.id, name: karigar.name, phone: karigar.phone, specialty: karigar.specialty, status: karigar.status },
        summary: { totalValue, totalPaid, dueAmount, totalSuits, totalReceived, totalPending },
        workOrders: workOrderSummaries,
        payments: karigarPayments
      });
    }

    // 4. Products List
    if (path === '/products') {
      const search = query.get('search')?.toLowerCase() || '';
      const type = query.get('type') || '';
      const page = parseInt(query.get('page') || '1');
      const limit = parseInt(query.get('limit') || '10');

      let filtered = [...products];
      if (search) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
      }
      if (type) {
        filtered = filtered.filter(p => p.type === type);
      }

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit);

      return mockResponse({
        data: paginated,
        total: filtered.length,
        page,
        limit
      });
    }

    // 5. Products All
    if (path === '/products/all') {
      const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));
      return mockResponse(sorted);
    }

    // 6. Work Orders List
    if (path === '/work-orders') {
      const status = query.get('status') || '';
      const karigarId = query.get('karigarId') || '';
      const search = query.get('search')?.toLowerCase() || '';
      const page = parseInt(query.get('page') || '1');
      const limit = parseInt(query.get('limit') || '10');

      let filtered = [...workOrders];
      if (status) {
        filtered = filtered.filter(w => w.status === status);
      }
      if (karigarId) {
        filtered = filtered.filter(w => w.karigarId === karigarId);
      }
      if (search) {
        filtered = filtered.filter(w => {
          const k = karigars.find(k => k.id === w.karigarId);
          return k && k.name.toLowerCase().includes(search);
        });
      }

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit).map(w => {
        const k = karigars.find(k => k.id === w.karigarId);
        const rCount = receipts.filter(r => r.workOrderId === w.id).length;
        const resolvedItems = (w.items || []).map(item => {
          const prod = products.find(p => p.id === item.productId);
          return { ...item, product: prod };
        });

        return {
          ...w,
          karigar: k ? { id: k.id, name: k.name, phone: k.phone } : { name: 'Unknown' },
          items: resolvedItems,
          _count: { receipts: rCount }
        };
      });

      return mockResponse({
        data: paginated,
        total: filtered.length,
        page,
        limit
      });
    }

    // 7. Suit Balance
    if (path === '/work-orders/suit-balance') {
      const sortedWorkOrders = [...workOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const balance = sortedWorkOrders.map(wo => {
        const kar = karigars.find(k => k.id === wo.karigarId);
        const totalSuits = (wo.items || []).reduce((s, i) => s + i.quantity, 0);
        const receivedSuits = (wo.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
        const pendingSuits = totalSuits - receivedSuits;
        const totalValue = (wo.items || []).reduce((s, i) => s + i.quantity * i.ratePerPiece, 0);
        const receivedValue = (wo.items || []).reduce((s, i) => s + (i.receivedQty || 0) * i.ratePerPiece, 0);

        const karigarPayments = payments.filter(p => p.karigarId === wo.karigarId);
        const totalPaid = karigarPayments.reduce((s, p) => s + p.amount, 0);
        const dueAmount = totalValue - totalPaid;

        const resolvedItems = (wo.items || []).map(item => {
          const prod = products.find(p => p.id === item.productId);
          return { ...item, product: prod };
        });

        const rCount = receipts.filter(r => r.workOrderId === wo.id).length;

        return {
          workOrderId: wo.id,
          karigar: kar ? { id: kar.id, name: kar.name, phone: kar.phone } : null,
          status: wo.status,
          deadline: wo.deadline,
          createdAt: wo.createdAt,
          items: resolvedItems,
          totalSuits,
          receivedSuits,
          pendingSuits,
          totalValue,
          receivedValue,
          totalPaid,
          dueAmount,
          receiptsCount: rCount,
        };
      });

      return mockResponse({ data: balance });
    }

    // 8. Work Order Detail
    if (path.startsWith('/work-orders/')) {
      const id = path.split('/')[2];
      const wo = workOrders.find(w => w.id === id);
      if (!wo) return mockError('Work order not found', 404);

      const kar = karigars.find(k => k.id === wo.karigarId);
      const karigarPayments = payments.filter(p => p.karigarId === wo.karigarId);

      const resolvedItems = (wo.items || []).map(item => {
        const prod = products.find(p => p.id === item.productId);
        // resolve receipts items for this work order item
        const itemReceiptItems = receipts
          .filter(r => r.workOrderId === wo.id)
          .flatMap(r => r.items || [])
          .filter(ri => ri.workOrderItemId === item.id);
        return { ...item, product: prod, receiptItems: itemReceiptItems };
      });

      const resolvedReceipts = receipts
        .filter(r => r.workOrderId === wo.id)
        .map(r => {
          const resolvedReceiptItems = (r.items || []).map(ri => {
            const item = wo.items.find(item => item.id === ri.workOrderItemId);
            const prod = item ? products.find(p => p.id === item.productId) : null;
            return {
              ...ri,
              workOrderItem: item ? { ...item, product: prod } : null
            };
          });
          return { ...r, items: resolvedReceiptItems };
        });

      const totalAmount = resolvedItems.reduce((s, i) => s + i.quantity * i.ratePerPiece, 0);
      const totalReceived = resolvedItems.reduce((s, i) => s + (i.receivedQty || 0), 0);
      const totalAssigned = resolvedItems.reduce((s, i) => s + i.quantity, 0);
      const totalPaid = karigarPayments.reduce((s, p) => s + p.amount, 0);

      return mockResponse({
        ...wo,
        karigar: kar,
        items: resolvedItems,
        receipts: resolvedReceipts,
        payments: karigarPayments,
        summary: {
          totalAmount,
          totalReceived,
          totalAssigned,
          totalPaid,
          dueAmount: totalAmount - totalPaid
        }
      });
    }

    // 9. Payments List
    if (path === '/payments') {
      const karigarId = query.get('karigarId') || '';
      const type = query.get('type') || '';
      const startDate = query.get('startDate') || '';
      const endDate = query.get('endDate') || '';
      const page = parseInt(query.get('page') || '1');
      const limit = parseInt(query.get('limit') || '10');

      let filtered = [...payments];
      if (karigarId) {
        filtered = filtered.filter(p => p.karigarId === karigarId);
      }
      if (type) {
        filtered = filtered.filter(p => p.type === type);
      }
      if (startDate) {
        filtered = filtered.filter(p => new Date(p.date) >= new Date(startDate));
      }
      if (endDate) {
        filtered = filtered.filter(p => new Date(p.date) <= new Date(endDate));
      }

      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit).map(p => {
        const kar = karigars.find(k => k.id === p.karigarId);
        return {
          ...p,
          karigar: kar ? { id: kar.id, name: kar.name, phone: kar.phone } : { name: 'Unknown' }
        };
      });

      return mockResponse({
        data: paginated,
        total: filtered.length,
        page,
        limit
      });
    }

    // 10. Receipts List
    if (path === '/receipts') {
      const workOrderId = query.get('workOrderId') || '';
      const page = parseInt(query.get('page') || '1');
      const limit = parseInt(query.get('limit') || '10');

      let filtered = [...receipts];
      if (workOrderId) {
        filtered = filtered.filter(r => r.workOrderId === workOrderId);
      }

      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit).map(r => {
        const wo = workOrders.find(w => w.id === r.workOrderId);
        const kar = wo ? karigars.find(k => k.id === wo.karigarId) : null;
        
        const resolvedItems = (r.items || []).map(ri => {
          const item = wo ? wo.items.find(item => item.id === ri.workOrderItemId) : null;
          const prod = item ? products.find(p => p.id === item.productId) : null;
          return {
            ...ri,
            workOrderItem: item ? { ...item, product: prod } : null
          };
        });

        return {
          ...r,
          workOrder: wo ? { ...wo, karigar: kar ? { id: kar.id, name: kar.name, phone: kar.phone } : null } : null,
          items: resolvedItems
        };
      });

      return mockResponse({
        data: paginated,
        total: filtered.length,
        page,
        limit
      });
    }

    // 11. Receipt Detail
    if (path.startsWith('/receipts/')) {
      const id = path.split('/')[2];
      const r = receipts.find(receipt => receipt.id === id);
      if (!r) return mockError('Receipt not found', 404);

      const wo = workOrders.find(w => w.id === r.workOrderId);
      const kar = wo ? karigars.find(k => k.id === wo.karigarId) : null;

      const resolvedItems = (r.items || []).map(ri => {
        const item = wo ? wo.items.find(item => item.id === ri.workOrderItemId) : null;
        const prod = item ? products.find(p => p.id === item.productId) : null;
        return {
          ...ri,
          workOrderItem: item ? { ...item, product: prod } : null
        };
      });

      const resolvedWO = wo ? {
        ...wo,
        karigar: kar,
        items: (wo.items || []).map(item => {
          const prod = products.find(p => p.id === item.productId);
          return { ...item, product: prod };
        })
      } : null;

      return mockResponse({
        ...r,
        workOrder: resolvedWO,
        items: resolvedItems
      });
    }

    // 12. Backup Endpoint
    if (path === '/settings/backup') {
      const backupData = {
        karigars,
        products,
        workOrders,
        payments,
        receipts
      };
      return mockResponse(backupData);
    }

    return mockError('Not Found', 404);
  },

  post: async (url: string, body: any, config?: any): Promise<any> => {
    const parsedUrl = new URL(url, 'http://localhost');
    const path = parsedUrl.pathname;

    // Load DB arrays
    const karigars = getDB<Karigar>('karigars');
    const products = getDB<Product>('products');
    const workOrders = getDB<WorkOrder>('work_orders');
    const payments = getDB<Payment>('payments');
    const receipts = getDB<Receipt>('receipts');

    // Auth Login
    if (path === '/auth/login') {
      const users = JSON.parse(localStorage.getItem('zari_users') || '[]');
      const user = users.find((u: any) => u.email === body.email && u.password === body.password);
      
      if (body.email === 'admin@zari.com' || user) {
        return mockResponse({
          token: 'mock-jwt-token-xyz',
          user: user || { id: '1', name: 'Zari Admin', email: 'admin@zari.com', role: 'ADMIN' }
        });
      }
      return mockError('Invalid email or password', 401);
    }

    // Create Karigar
    if (path === '/karigars') {
      const newK: Karigar = {
        id: generateUUID(),
        name: body.name,
        phone: body.phone,
        address: body.address || '',
        specialty: body.specialty || '',
        status: body.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      karigars.push(newK);
      saveDB('karigars', karigars);
      return mockResponse(newK, 201);
    }

    // Create Product (with FormData support)
    if (path === '/products') {
      let name = '';
      let type = '';
      let description = '';
      let image: string | null = null;

      if (body instanceof FormData) {
        name = body.get('name') as string || '';
        type = body.get('type') as string || '';
        description = body.get('description') as string || '';
        const imageFile = body.get('image');
        if (imageFile instanceof File) {
          try {
            image = await readImageAsBase64(imageFile);
          } catch (e) {
            console.error('Failed to read image', e);
          }
        }
      } else {
        name = body.name || '';
        type = body.type || '';
        description = body.description || '';
      }

      const newP: Product = {
        id: generateUUID(),
        name,
        type,
        description,
        image,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      products.push(newP);
      saveDB('products', products);
      return mockResponse(newP, 201);
    }

    // Create Work Order
    if (path === '/work-orders') {
      const items: WorkOrderItem[] = (body.items || []).map((item: any) => ({
        id: generateUUID(),
        productId: item.productId,
        quantity: parseInt(item.quantity),
        ratePerPiece: parseFloat(item.ratePerPiece),
        receivedQty: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const newWO: WorkOrder = {
        id: generateWorkOrderId(workOrders),
        karigarId: body.karigarId,
        deadline: body.deadline ? new Date(body.deadline).toISOString() : null,
        notes: body.notes || '',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items
      };

      workOrders.push(newWO);
      saveDB('work_orders', workOrders);
      return mockResponse(newWO, 201);
    }

    // Create Payment
    if (path === '/payments') {
      const kar = karigars.find(k => k.id === body.karigarId);
      const newP: Payment = {
        id: generateUUID(),
        karigarId: body.karigarId,
        amount: parseFloat(body.amount),
        type: body.type || 'PAYMENT',
        date: body.date ? new Date(body.date).toISOString() : new Date().toISOString(),
        notes: body.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      payments.push(newP);
      saveDB('payments', payments);
      return mockResponse({ ...newP, karigar: kar }, 201);
    }

    // Create Receipt (with side effects on Work Order and items)
    if (path === '/receipts') {
      const { workOrderId, date, notes, items } = body;
      const woIndex = workOrders.findIndex(w => w.id === workOrderId);
      if (woIndex === -1) return mockError('Work order not found', 404);

      const wo = workOrders[woIndex];
      const newReceiptItems: ReceiptItem[] = items.map((ri: any) => {
        const woItem = wo.items.find(item => item.id === ri.workOrderItemId);
        if (woItem) {
          woItem.receivedQty = (woItem.receivedQty || 0) + parseInt(ri.quantity);
        }
        return {
          id: generateUUID(),
          workOrderItemId: ri.workOrderItemId,
          quantity: parseInt(ri.quantity),
          qualityNotes: ri.qualityNotes || null,
          createdAt: new Date().toISOString()
        };
      });

      // Update work order status based on item receipts
      const allReceived = wo.items.every(i => (i.receivedQty || 0) >= i.quantity);
      const someReceived = wo.items.some(i => (i.receivedQty || 0) > 0);
      wo.status = allReceived ? 'COMPLETED' : someReceived ? 'PARTIALLY_RECEIVED' : 'PENDING';
      wo.updatedAt = new Date().toISOString();

      const newReceipt: Receipt = {
        id: generateReceiptId(receipts),
        workOrderId,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        notes: notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: newReceiptItems
      };

      receipts.push(newReceipt);
      saveDB('receipts', receipts);
      saveDB('work_orders', workOrders);

      return mockResponse(newReceipt, 201);
    }

    // Restore Settings
    if (path === '/settings/restore') {
      if (body.karigars) saveDB('karigars', body.karigars);
      if (body.products) saveDB('products', body.products);
      if (body.workOrders) saveDB('work_orders', body.workOrders);
      if (body.payments) saveDB('payments', body.payments);
      if (body.receipts) saveDB('receipts', body.receipts);
      return mockResponse({ message: 'Database restored successfully' });
    }

    // Reset Database Settings
    if (path === '/settings/reset') {
      if (body.confirmText === 'RESET') {
        saveDB('karigars', []);
        saveDB('products', []);
        saveDB('work_orders', []);
        saveDB('payments', []);
        saveDB('receipts', []);
        return mockResponse({ message: 'Database reset successfully' });
      }
      return mockError('Invalid confirmation text', 400);
    }

    // Change Password
    if (path === '/settings/change-password') {
      return mockResponse({ message: 'Password changed successfully (mocked)' });
    }

    return mockError('Not Found', 404);
  },

  put: async (url: string, body: any, config?: any): Promise<any> => {
    const parsedUrl = new URL(url, 'http://localhost');
    const path = parsedUrl.pathname;

    const karigars = getDB<Karigar>('karigars');
    const products = getDB<Product>('products');
    const workOrders = getDB<WorkOrder>('work_orders');

    // Update Karigar
    if (path.startsWith('/karigars/')) {
      const id = path.split('/')[2];
      const index = karigars.findIndex(k => k.id === id);
      if (index === -1) return mockError('Karigar not found', 404);

      karigars[index] = {
        ...karigars[index],
        name: body.name,
        phone: body.phone,
        address: body.address || '',
        specialty: body.specialty || '',
        status: body.status || 'ACTIVE',
        updatedAt: new Date().toISOString(),
      };
      saveDB('karigars', karigars);
      return mockResponse(karigars[index]);
    }

    // Update Product (with FormData support)
    if (path.startsWith('/products/')) {
      const id = path.split('/')[2];
      const index = products.findIndex(p => p.id === id);
      if (index === -1) return mockError('Product not found', 404);

      let name = '';
      let type = '';
      let description = '';
      let image: string | null = products[index].image || null;

      if (body instanceof FormData) {
        name = body.get('name') as string || '';
        type = body.get('type') as string || '';
        description = body.get('description') as string || '';
        const imageFile = body.get('image');
        if (imageFile instanceof File) {
          try {
            image = await readImageAsBase64(imageFile);
          } catch (e) {
            console.error('Failed to read image', e);
          }
        }
      } else {
        name = body.name || '';
        type = body.type || '';
        description = body.description || '';
      }

      products[index] = {
        ...products[index],
        name,
        type,
        description,
        image,
        updatedAt: new Date().toISOString(),
      };
      saveDB('products', products);
      return mockResponse(products[index]);
    }

    // Update Work Order
    if (path.startsWith('/work-orders/')) {
      const id = path.split('/')[2];
      const index = workOrders.findIndex(w => w.id === id);
      if (index === -1) return mockError('Work order not found', 404);

      workOrders[index] = {
        ...workOrders[index],
        status: body.status || workOrders[index].status,
        deadline: body.deadline ? new Date(body.deadline).toISOString() : workOrders[index].deadline,
        notes: body.notes !== undefined ? body.notes : workOrders[index].notes,
        updatedAt: new Date().toISOString(),
      };
      saveDB('work_orders', workOrders);
      return mockResponse(workOrders[index]);
    }

    return mockError('Not Found', 404);
  },

  delete: async (url: string): Promise<any> => {
    const parsedUrl = new URL(url, 'http://localhost');
    const path = parsedUrl.pathname;

    const karigars = getDB<Karigar>('karigars');
    const products = getDB<Product>('products');
    const workOrders = getDB<WorkOrder>('work_orders');
    const payments = getDB<Payment>('payments');
    const receipts = getDB<Receipt>('receipts');

    // Delete Karigar
    if (path.startsWith('/karigars/')) {
      const id = path.split('/')[2];
      const filtered = karigars.filter(k => k.id !== id);
      saveDB('karigars', filtered);
      return mockResponse({ message: 'Karigar deleted successfully' });
    }

    // Delete Product
    if (path.startsWith('/products/')) {
      const id = path.split('/')[2];
      const filtered = products.filter(p => p.id !== id);
      saveDB('products', filtered);
      return mockResponse({ message: 'Product deleted successfully' });
    }

    // Delete Work Order (cascades or cleans up)
    if (path.startsWith('/work-orders/')) {
      const id = path.split('/')[2];
      const filteredWO = workOrders.filter(w => w.id !== id);
      const filteredReceipts = receipts.filter(r => r.workOrderId !== id);
      saveDB('work_orders', filteredWO);
      saveDB('receipts', filteredReceipts);
      return mockResponse({ message: 'Work order deleted successfully' });
    }

    // Delete Payment
    if (path.startsWith('/payments/')) {
      const id = path.split('/')[2];
      const filtered = payments.filter(p => p.id !== id);
      saveDB('payments', filtered);
      return mockResponse({ message: 'Payment deleted successfully' });
    }

    // Delete Receipt (reverse quantities and status of Work Order)
    if (path.startsWith('/receipts/')) {
      const id = path.split('/')[2];
      const rIndex = receipts.findIndex(r => r.id === id);
      if (rIndex === -1) return mockError('Receipt not found', 404);

      const r = receipts[rIndex];
      const woIndex = workOrders.findIndex(w => w.id === r.workOrderId);
      if (woIndex !== -1) {
        const wo = workOrders[woIndex];
        (r.items || []).forEach(ri => {
          const woItem = wo.items.find(item => item.id === ri.workOrderItemId);
          if (woItem) {
            woItem.receivedQty = Math.max(0, (woItem.receivedQty || 0) - ri.quantity);
          }
        });

        // Recalculate work order status
        const allReceived = wo.items.every(i => (i.receivedQty || 0) >= i.quantity);
        const someReceived = wo.items.some(i => (i.receivedQty || 0) > 0);
        wo.status = allReceived ? 'COMPLETED' : someReceived ? 'PARTIALLY_RECEIVED' : 'PENDING';
        wo.updatedAt = new Date().toISOString();
      }

      const filtered = receipts.filter(receipt => receipt.id !== id);
      saveDB('receipts', filtered);
      saveDB('work_orders', workOrders);

      return mockResponse({ message: 'Receipt deleted successfully' });
    }

    return mockError('Not Found', 404);
  }
};

// Create a custom mock object that mirrors axios interceptors so it does not break compilation
const apiMock = {
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} }
  },
  get: mockAPI.get,
  post: mockAPI.post,
  put: mockAPI.put,
  delete: mockAPI.delete,
};

export default apiMock;
