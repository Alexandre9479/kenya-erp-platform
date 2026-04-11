/**
 * Run this script to generate a bcrypt hash for the super admin password.
 * Usage: node scripts/generate-password-hash.mjs
 */
import bcrypt from "bcryptjs";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question("Enter the password to hash: ", async (password) => {
  if (!password || password.length < 8) {
    console.error("❌ Password must be at least 8 characters.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log("\n✅ Your bcrypt hash:\n");
  console.log(hash);
  console.log("\n📋 Run this SQL in Supabase to update the super admin:");
  console.log(`\nUPDATE users`);
  console.log(`SET password_hash = '${hash}'`);
  console.log(`WHERE email = 'admin@erp.local';\n`);
  rl.close();
});
