import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import path from 'path';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { search, type, page = '1', limit = '10' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.name = { contains: String(search), mode: 'insensitive' };
    }
    if (type) where.type = type;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ data: products, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch products', message: error.message });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch products', message: error.message });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch product', message: error.message });
  }
};

export const createProduct = async (req: any, res: Response) => {
  try {
    const { name, type, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const product = await prisma.product.create({ data: { name, type, description, image } });
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create product', message: error.message });
  }
};

export const updateProduct = async (req: any, res: Response) => {
  try {
    const { name, type, description } = req.body;
    const data: any = { name, type, description };
    if (req.file) data.image = `/uploads/${req.file.filename}`;

    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update product', message: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete product', message: error.message });
  }
};
