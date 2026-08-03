"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ParentTabs } from "../tabs";
import { api, clearToken, formatMoney, readToken, type PaymentRecord } from "../../../lib/api";

/** Every payment, across every child and school, newest first. */
export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[] | null>(null);

  useEffect(() => {
    if (!readToken()) {
      router.replace("/parent");
      return;
    }
    api
      .payments()
      .then(setPayments)
      .catch(() => {
        clearToken();
        router.replace("/parent");
      });
  }, [router]);

  if (payments === null) {
    return (
      <main>
        <ParentTabs current="payments" />
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <ParentTabs current="payments" />
      <h1>Your payments</h1>

      {payments.length === 0 && (
        <div className="card">
          <p style={{ margin: 0 }}>No payments yet.</p>
        </div>
      )}

      {payments.map((payment) => (
        <div className="card" key={payment.somaReference}>
          <div className="row">
            <div>
              <h2>{payment.childName || "—"}</h2>
              <div className="muted">{payment.schoolName}</div>
            </div>
            <span className="amount">{formatMoney(payment.amountMinor, payment.currency)}</span>
          </div>
          <div className="row" style={{ marginTop: "0.6rem" }}>
            <span className="pill">{payment.status}</span>
            <span className="muted">
              {payment.receiptNo ?? payment.somaReference}
              {payment.paidAt ? ` · ${new Date(payment.paidAt).toLocaleDateString()}` : ""}
            </span>
          </div>
        </div>
      ))}
    </main>
  );
}
