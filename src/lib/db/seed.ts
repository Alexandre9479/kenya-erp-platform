import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { tenants, users } from "./schema";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const client = postgres(process.env.DATABASE_URL!, { ssl: "require" });
const db = drizzle(client, {});

async function seed() {
  console.log("🌱 Seeding database...");

  // Create demo tenant
  const tenantId = createId();
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  await db.insert(tenants).values({
    id: tenantId,
    companyName: "Demo Company Ltd",
    companyEmail: "demo@company.com",
    companyPhone: "+254700000000",
    companyAddress: "123 Business Street, Nairobi",
    companyCity: "Nairobi",
    companyCountry: "Kenya",
    currency: "KES",
    currencySymbol: "KSh",
    subscription: "trial",
    trialEndsAt,
    isActive: true,
  });

  console.log("✅ Demo tenant created");

  // Create super admin (your master account - not tied to any tenant)
  const superAdminPassword = await bcrypt.hash("SuperAdmin@123", 12);
  await db.insert(users).values({
    id: createId(),
    tenantId: null,
    firstName: "Super",
    lastName: "Admin",
    email: "superadmin@erp.com",
    password: superAdminPassword,
    role: "super_admin",
    isActive: true,
  });

  console.log("✅ Super admin created");

  // Create tenant admin for demo company
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  await db.insert(users).values({
    id: createId(),
    tenantId: tenantId,
    firstName: "John",
    lastName: "Doe",
    email: "admin@demo.com",
    password: adminPassword,
    role: "tenant_admin",
    isActive: true,
  });

  console.log("✅ Demo admin created");
  console.log("");
  console.log("🎉 Seed complete! Login credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Super Admin:");
  console.log("  Email:    superadmin@erp.com");
  console.log("  Password: SuperAdmin@123");
  console.log("");
  console.log("Demo Company Admin:");
  console.log("  Email:    admin@demo.com");
  console.log("  Password: Admin@123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await client.end();
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});