/* Seed: fixture data only — never real school credentials (CLAUDE.md §10). */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const group = await prisma.schoolGroup.upsert({
    where: { id: "seed-group" },
    update: {},
    create: { id: "seed-group", name: "Demo Education Group" },
  });

  const kampala = await prisma.school.upsert({
    where: { id: "seed-school-a" },
    update: {},
    create: {
      id: "seed-school-a",
      schoolGroupId: group.id,
      name: "Demo Academy Kampala",
      country: "UG",
      currency: "UGX",
      timezone: "Africa/Kampala",
    },
  });

  const kigali = await prisma.school.upsert({
    where: { id: "seed-school-b" },
    update: {},
    create: {
      id: "seed-school-b",
      name: "Demo College Kigali",
      country: "RW",
      currency: "RWF",
      timezone: "Africa/Kigali",
    },
  });

  const passwordHash = await argon2.hash("demo-password-only", {
    type: argon2.argon2id,
  });

  for (const [schoolId, email, role] of [
    [kampala.id, "owner@demo.soma", "OWNER"],
    [kampala.id, "bursar@demo.soma", "BURSAR"],
    [kigali.id, "owner@demo-rw.soma", "OWNER"],
  ] as const) {
    await prisma.user.upsert({
      where: { schoolId_email: { schoolId, email } },
      update: {},
      create: { schoolId, email, passwordHash, role },
    });
  }

  const student = await prisma.student.upsert({
    where: { id: "seed-student-1" },
    update: {},
    create: {
      id: "seed-student-1",
      schoolId: kampala.id,
      externalRef: "1001234567",
      firstName: "Amina",
      lastName: "Nakato",
      className: "P5",
    },
  });

  await prisma.invoice.upsert({
    where: { id: "seed-invoice-1" },
    update: {},
    create: {
      id: "seed-invoice-1",
      schoolId: kampala.id,
      studentId: student.id,
      term: "2026-T1",
      amountDueMinor: 45000000n, // UGX 450,000 in cents
      currency: "UGX",
      dueDate: new Date("2026-02-15"),
      status: "ISSUED",
    },
  });

  await prisma.ledgerEntry.createMany({
    data: [
      {
        schoolId: kampala.id,
        type: "INVOICE_ISSUED",
        amountMinor: 45000000n,
        currency: "UGX",
        refs: { invoiceId: "seed-invoice-1" },
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete: 2 schools, 3 users, 1 student, 1 invoice, 1 ledger entry");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
