# Test Cases: Guest Checkout

Source requirement: `requirements/sample-checkout-requirements.md`

| ID | Title | Priority | Type | Automation Status | Linked Spec |
|---|---|---|---|---|---|
| CHK-001 | Guest can complete checkout with valid details | P0 | Functional | Not automated | — |
| CHK-002 | "Checkout as Guest" option hidden when user is logged in | P1 | Functional | Not automated | — |
| CHK-003 | Checkout blocked when required shipping fields are missing | P1 | Negative | Not automated | — |
| CHK-004 | Cart preserved after failed payment | P0 | Negative | Not automated | — |
| CHK-005 | Valid promo code recalculates total before payment | P1 | Functional | Not automated | — |
| CHK-006 | Invalid promo code shows error and does not change total | P2 | Negative | Not automated | — |
| CHK-007 | Order confirmation email sent after successful guest checkout | P0 | Functional | Not automated | — |
| CHK-008 | Guest can create an account post-checkout with pre-filled details | P2 | Functional | Not automated | — |
| CHK-API-001 | POST /checkout/guest returns 201 with valid payload | P0 | API | Not automated | — |
| CHK-API-002 | POST /checkout/guest returns 400 for missing required fields | P1 | API | Not automated | — |
| CHK-API-003 | POST /checkout/apply-promo returns updated total for valid code | P1 | API | Not automated | — |
| CHK-API-004 | POST /checkout/apply-promo returns 422 for expired/invalid code | P2 | API | Not automated | — |

---

## CHK-001 — Guest can complete checkout with valid details

**Priority:** P0
**Type:** Functional
**Preconditions:** User is not logged in; cart contains at least one item.

**Steps:**
1. Navigate to the cart page.
2. Click "Checkout as Guest".
3. Enter a valid email address.
4. Enter a complete, valid shipping address (name, street, city, postal code, country).
5. Enter valid payment card details.
6. Submit the order.

**Expected Result:** Order is created successfully; user is shown an order
confirmation page with an order number; a confirmation email is queued to
the entered email address.

---

## CHK-003 — Checkout blocked when required shipping fields are missing

**Priority:** P1
**Type:** Negative
**Preconditions:** User is on the guest checkout form with items in cart.

**Steps:**
1. Fill in email and payment details, but leave the "City" shipping field blank.
2. Attempt to submit the order.

**Expected Result:** Submission is blocked; an inline validation message
appears on the City field; no order is created; user remains on the
checkout form with previously entered data intact.

---

## CHK-004 — Cart preserved after failed payment

**Priority:** P0
**Type:** Negative
**Preconditions:** User has a valid guest checkout form filled in with a
card number known to trigger a decline (test/sandbox card).

**Steps:**
1. Submit the order with the declining test card.
2. Observe the error state.
3. Navigate back to the cart page.

**Expected Result:** A clear payment-failure message is shown; the cart
still contains the original items (not emptied); the user can retry payment
without re-adding items.

---

## CHK-API-002 — POST /checkout/guest returns 400 for missing required fields

**Priority:** P1
**Type:** API
**Preconditions:** None (stateless API test).

**Steps:**
1. Send `POST /checkout/guest` with a payload missing the `shippingAddress.city` field.

**Expected Result:** Response status is `400`; response body includes a
validation error identifying `shippingAddress.city` as the offending field.

---

*(Remaining rows in the table above follow the same structure — the Test
Designer agent expands every row into a full case like these when run for
real; this file shows a representative subset to keep the example
readable.)*
