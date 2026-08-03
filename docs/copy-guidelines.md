# Copy guidelines

Every user-facing string ships through this test — headlines, buttons, empty states,
error messages, emails. If a sentence gets three "no"s, rewrite it.

## The three-rule test

| Rule | Question | Application |
|---|---|---|
| **Visualization** | Can I see it? | Replace abstractions with concrete objects. If the reader can't picture it, they won't remember it. |
| **Falsifiability** | Can I prove it false? | Subjective adjectives are weak. Objective facts are strong. |
| **Uniqueness** | Could a competitor sign this? | If SchoolPay could put their logo on it, it says nothing. |

## Point, don't talk

Talking is claiming an adjective. Pointing is showing the evidence.

- Talking: "Secure, auditable, API-first."
- Pointing: "Every ledger entry is immutable. Try to update one and Postgres rejects it."

Get off the adjective trail and onto the fact trail.

## Applied to Soma

Concrete truths worth pointing at, in order of strength:

1. A bursar matches mobile money SMS receipts to spreadsheet rows by hand, one at a time.
2. Every payment reconciles to the student who owes it, with a confidence score and an audit trail.
3. The incumbent returned full student records from an unauthenticated endpoint. Soma returns
   nothing before you log in.

**Before:** "School payments and operations for African education."
Invisible, unfalsifiable, and a competitor could sign it verbatim. Three "no"s.

**After:** "Every payment finds the right student."
You can picture it, it is either true or false for any given payment, and it is the exact
thing incumbents get wrong.

## Mechanics

- **Two-Mississippi test** — if it takes longer than two seconds to get, it failed.
- **Monkey bar paragraphs** — never longer than two lines.
- **Burrito test** — pull any sentence out. If the paragraph still works, that sentence
  should not be there.
- **Kaplan's Law** — any word not working for you is working against you.
- **Write in the final medium.** Line breaks and visual hierarchy are part of the copy, so
  write in the component, not in a doc.
- Simplicity comes from rewriting, not drafting. Expect many passes.
