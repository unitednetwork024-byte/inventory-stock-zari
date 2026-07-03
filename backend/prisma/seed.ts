import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@zari.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@zari.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Admin user created:', admin.email);

  // Create sample karigars
  const karigar1 = await prisma.karigar.upsert({
    where: { id: 'sample-karigar-1' },
    update: {},
    create: {
      id: 'sample-karigar-1',
      name: 'Raju Bhai',
      phone: '9876543210',
      address: 'Surat, Gujarat',
      specialty: 'Zari Border Work',
      status: 'ACTIVE',
    },
  });

  const karigar2 = await prisma.karigar.upsert({
    where: { id: 'sample-karigar-2' },
    update: {},
    create: {
      id: 'sample-karigar-2',
      name: 'Amin Bhai',
      phone: '9876543211',
      address: 'Ahmedabad, Gujarat',
      specialty: 'Zari Embroidery',
      status: 'ACTIVE',
    },
  });
  console.log('Sample karigars created');

  // Create sample products
  const product1 = await prisma.product.upsert({
    where: { id: 'sample-product-1' },
    update: {},
    create: {
      id: 'sample-product-1',
      name: 'Red Silk Suit',
      type: 'SUIT',
      description: 'Premium red silk suit material',
    },
  });

  const product2 = await prisma.product.upsert({
    where: { id: 'sample-product-2' },
    update: {},
    create: {
      id: 'sample-product-2',
      name: 'Gold Dupatta',
      type: 'DUPATTA',
      description: 'Gold zari work dupatta',
    },
  });
  console.log('Sample products created');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
