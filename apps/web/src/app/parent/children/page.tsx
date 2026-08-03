"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ParentTabs } from "../tabs";
import { api, clearToken, formatMoney, readToken, type Child } from "../../../lib/api";

/** One card per child, grouped by school, with what is actually owed. */
export default function ChildrenPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!readToken()) {
      router.replace("/parent");
      return;
    }
    try {
      setChildren(await api.children());
    } catch {
      clearToken();
      router.replace("/parent");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pay(child: Child) {
    setPaying(child.studentId);
    setError("");
    try {
      const phone = window.prompt("Which number should we send the payment request to?");
      if (!phone) return;
      await api.pay(child.studentId, child.outstandingMinor, phone, "MTN_MOMO");
      window.alert("Check your phone and approve the payment request.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment.");
    } finally {
      setPaying(null);
    }
  }

  if (children === null) {
    return (
      <main>
        <ParentTabs current="children" />
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <ParentTabs current="children" />
      <h1>Your children</h1>

      {error && <p className="error">{error}</p>}

      {children.length === 0 && (
        <div className="card">
          <p style={{ margin: 0 }}>
            No children are linked to this number yet. Ask the school office to add it.
          </p>
        </div>
      )}

      {children.map((child) => {
        const owed = BigInt(child.outstandingMinor || "0");
        return (
          <div className="card" key={child.studentId}>
            <div className="row">
              <div>
                <h2>
                  {child.firstName} {child.lastName}
                </h2>
                <div className="muted">
                  {child.schoolName}
                  {child.className ? ` · ${child.className}` : ""}
                </div>
              </div>
              <span className="amount">{formatMoney(child.outstandingMinor, child.currency)}</span>
            </div>

            {owed > 0n ? (
              <button
                style={{ marginTop: "0.85rem" }}
                disabled={paying === child.studentId}
                onClick={() => void pay(child)}
              >
                {paying === child.studentId ? "Starting…" : "Pay now"}
              </button>
            ) : (
              <p className="muted" style={{ margin: "0.6rem 0 0" }}>
                Fees are fully paid.
              </p>
            )}
          </div>
        );
      })}
    </main>
  );
}
