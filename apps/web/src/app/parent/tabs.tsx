import Link from "next/link";

/** Two destinations is the whole app. A parent is here to check and to pay. */
export function ParentTabs({ current }: { current: "children" | "payments" }) {
  return (
    <nav className="tabs">
      <Link href="/parent/children" aria-current={current === "children" ? "page" : undefined}>
        Children
      </Link>
      <Link href="/parent/payments" aria-current={current === "payments" ? "page" : undefined}>
        Payments
      </Link>
    </nav>
  );
}
