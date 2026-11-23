import { PrismaClient, PosType } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  // Living (Kebutuhan primer)
  { name: 'Makanan & Minuman', icon: 'utensils', color: '#3B82F6', defaultPos: PosType.LIVING },
  { name: 'Transportasi', icon: 'car', color: '#60A5FA', defaultPos: PosType.LIVING },
  { name: 'Tagihan & Utilitas', icon: 'zap', color: '#2563EB', defaultPos: PosType.LIVING },
  { name: 'Belanja Bulanan', icon: 'shopping-cart', color: '#1D4ED8', defaultPos: PosType.LIVING },
  { name: 'Kesehatan & Obat', icon: 'activity', color: '#1E40AF', defaultPos: PosType.LIVING },
  { name: 'Biaya Admin', icon: 'file-text', color: '#64748B', defaultPos: PosType.LIVING },

  // Playing (Gaya hidup & hiburan)
  { name: 'Nongkrong & Kafe', icon: 'coffee', color: '#F59E0B', defaultPos: PosType.PLAYING },
  { name: 'Hiburan & Langganan', icon: 'tv', color: '#D97706', defaultPos: PosType.PLAYING },
  { name: 'Belanja Keinginan', icon: 'shopping-bag', color: '#B45309', defaultPos: PosType.PLAYING },
  { name: 'Hobi & Olahraga', icon: 'smile', color: '#FBBF24', defaultPos: PosType.PLAYING },

  // Saving (Bucket & Tabungan)
  { name: 'Dana Darurat', icon: 'shield-alert', color: '#EF4444', defaultPos: PosType.EMERGENCY },
  { name: 'Tabungan Rutin', icon: 'piggy-bank', color: '#10B981', defaultPos: PosType.SAVINGS },
  { name: 'Investasi Saham/Reksadana', icon: 'trending-up', color: '#8B5CF6', defaultPos: PosType.INVESTMENT },
  { name: 'Tujuan Masa Depan', icon: 'target', color: '#06B6D4', defaultPos: PosType.GOALS },
];

async function main() {
  console.log('Seeding system default categories...');
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: {
        id: `sys-${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      },
      update: {},
      create: {
        id: `sys-${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        defaultPos: cat.defaultPos,
        isSystem: true,
      },
    });
  }
  console.log('Default categories seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

