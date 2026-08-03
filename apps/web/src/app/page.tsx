import Link from "next/link";

/**
 * Marketing landing page.
 *
 * Every line is tested against docs/copy-guidelines.md: can the reader see it,
 * can it be proven false, and could a competitor sign it? Anything that fails
 * all three is rewritten. The claims below point at things this codebase
 * actually does, so each one is checkable rather than asserted.
 */
export default function Home() {
  return (
    <main className="landing">
      <section className="hero">
        <p className="eyebrow">Soma</p>
        <h1>Every payment finds the right student.</h1>
        <p className="lede">
          Your bursar stops matching mobile money receipts to spreadsheet rows by hand.
        </p>
        <div className="cta-row">
          <Link className="cta" href="/parent">
            Parents: check what you owe
          </Link>
          <a className="cta cta-quiet" href="/docs">
            Developers: read the API
          </a>
        </div>
      </section>

      <section className="band">
        <h2>Today, three things live in three places.</h2>
        <ul className="parallel">
          <li>The receipt is an SMS.</li>
          <li>The record is a spreadsheet.</li>
          <li>The match is a person.</li>
        </ul>
        <p className="after">
          That person is your bursar. They do it four hundred times a term, in the
          week fees are due.
        </p>
      </section>

      <section>
        <h2>What we do differently, stated so you can check it.</h2>

        <div className="proof">
          <h3>Two children named John Mukasa? A person decides.</h3>
          <p>
            When two students score equally well, Soma refuses to pick. The payment
            waits in a review queue until someone at the school says which child it
            belongs to.
          </p>
        </div>

        <div className="proof">
          <h3>The ledger cannot be edited. Try it and the database refuses.</h3>
          <p>
            Corrections are new entries, never edits. That rule is a Postgres
            trigger, not a policy document — an <code>UPDATE</code> against it fails.
          </p>
        </div>

        <div className="proof">
          <h3>Ask us for a student before you log in. You get nothing.</h3>
          <p>
            No name, no school, no balance. Uganda&rsquo;s incumbent returned full
            student records from a public endpoint. We return whether a payment code
            is valid, and a token.
          </p>
        </div>

        <div className="proof">
          <h3>A failed webhook retries eight times. You can read every attempt.</h3>
          <p>
            Attempt count, last error, next retry. Enough to diagnose a broken
            integration at 9pm without opening a support ticket.
          </p>
        </div>
      </section>

      <section className="band">
        <h2>Your first API call returns four students who owe money.</h2>
        <p className="after">
          Not an empty array. The sandbox arrives seeded — including two students
          who share a name, so you can test the hard case on day one.
        </p>
        <pre className="snippet">
          <code>{`curl https://api.soma-africa.com/v1/students \\
  -H "Authorization: Bearer sk_test_..."`}</code>
        </pre>
        <p className="after">
          Keys go in headers. Put one in a URL and we reject the request.
        </p>
      </section>

      <section className="closing">
        <h2>Bring us a term of receipts.</h2>
        <p className="lede">
          We will reconcile them against your register and show you what matched,
          what did not, and why.
        </p>
        <Link className="cta" href="/parent">
          Start with your own numbers
        </Link>
        <p className="footnote">Built in Kampala for schools across East Africa.</p>
      </section>
    </main>
  );
}
