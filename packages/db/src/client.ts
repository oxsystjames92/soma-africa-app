import { PrismaClient } from "@prisma/client";
import { AppendOnlyViolationError } from "@soma/core";

/** Prisma operations that would mutate or remove existing rows. */
const FORBIDDEN_LEDGER_OPS = new Set([
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

/**
 * Application-wide Prisma client.
 * Blocks LedgerEntry mutations at the client layer; the database trigger
 * (migration `init`) is the second, authoritative line of defense.
 */
export function createPrismaClient() {
  return new PrismaClient().$extends({
    query: {
      ledgerEntry: {
        $allOperations({ operation, args, query }) {
          if (FORBIDDEN_LEDGER_OPS.has(operation)) {
            throw new AppendOnlyViolationError("LedgerEntry");
          }
          return query(args);
        },
      },
    },
  });
}

export type SomaPrismaClient = ReturnType<typeof createPrismaClient>;

/** Models owned by a tenant; every query against them must be schoolId-scoped. */
const TENANT_MODELS = new Set(["User", "Student", "Invoice", "Payment", "LedgerEntry"]);

type WhereArgs = { where?: Record<string, unknown> } & Record<string, unknown>;

/**
 * Returns a client hard-scoped to one school (CLAUDE.md §8.6).
 * - reads/updates/deletes: `schoolId` is AND-ed into every `where`
 * - creates: `schoolId` is forced onto `data`, overriding caller input
 * Cross-tenant rows become invisible rather than forbidden — queries for
 * another school's data return null/[] as if the rows did not exist.
 */
export function tenantScoped(client: SomaPrismaClient, schoolId: string) {
  return client.$extends({
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) return query(args);

          const a = args as WhereArgs;
          if (operation.startsWith("create")) {
            if (operation === "create") {
              const data = a["data"] as Record<string, unknown>;
              a["data"] = { ...data, schoolId };
            } else {
              const rows = a["data"] as Record<string, unknown>[];
              a["data"] = rows.map((d) => ({ ...d, schoolId }));
            }
          } else {
            a.where = { AND: [a.where ?? {}, { schoolId }] };
          }
          return query(a);
        },
      },
    },
  });
}
