/**
 * 数智企业 · 数据库种子脚本
 * 初始化默认租户和用户数据
 */
import { PrismaClient } from "../generated/prisma/index.js";

const db = new PrismaClient();

async function main() {
  console.log("🌱 开始种子数据初始化...");

  // 1. 创建默认租户
  const tenant = await db.tenant.upsert({
    where: { id: "tenant-default" },
    update: {},
    create: {
      id: "tenant-default",
      name: "默认租户",
      tier: "free",
      maxSeats: 5,
      maxAgents: 20,
      isActive: true,
    },
  });
  console.log(`  ✓ 租户: ${tenant.name}`);

  // 2. 创建三个默认用户
  const users = [
    {
      id: "admin-boss",
      name: "王老板",
      email: "boss@lobster.com",
      role: "ADMIN",
      department: "总裁办",
      title: "创始人兼CEO",
      permissionBm: 31,
      passwordHash: "lobster123", // 开发环境明文存储
    },
    {
      id: "manager-li",
      name: "李主管",
      email: "manager@lobster.com",
      role: "MANAGER",
      department: "运营部",
      title: "运营总监",
      permissionBm: 15,
      passwordHash: "lobster123",
    },
    {
      id: "staff-zhang",
      name: "张员工",
      email: "staff@lobster.com",
      role: "STAFF",
      department: "市场部",
      title: "市场专员",
      permissionBm: 3,
      passwordHash: "lobster123",
    },
  ];

  for (const user of users) {
    await db.employee.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        title: user.title,
        permissionBm: user.permissionBm,
        passwordHash: user.passwordHash,
        isActive: true,
      },
      create: {
        id: user.id,
        tenantId: tenant.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        title: user.title,
        permissionBm: user.permissionBm,
        passwordHash: user.passwordHash,
        isActive: true,
      },
    });
    console.log(`  ✓ 用户: ${user.name} (${user.email})`);
  }

  console.log("✅ 种子数据初始化完成");
}

main()
  .catch((e) => {
    console.error("❌ 种子数据初始化失败:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
