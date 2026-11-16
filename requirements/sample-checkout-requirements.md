# Feature: Guest Checkout

## Summary
Allow a shopper to purchase items without creating an account.

## User story
As a shopper, I want to check out as a guest so that I can complete my
purchase quickly without being forced to register.

## Acceptance criteria

1. A "Checkout as Guest" option is available on the cart page whenever the
   user is not logged in.
2. Guest checkout requires: email, shipping address, payment details.
3. Order confirmation is emailed to the guest email address after successful
   payment.
4. If payment fails, the user sees a clear error and their cart is
   preserved (not emptied).
5. Guest users can optionally create an account *after* checkout completes,
   pre-filled with the details they already entered.
6. Shipping address must be validated (required fields: name, street, city,
   postal code, country) — checkout cannot proceed with missing fields.
7. Promo codes can be applied at checkout and must recalculate the total
   before payment is submitted.

## Out of scope
- Saved payment methods for guests (guests always enter fresh card details).
- Multi-currency support (assume single currency for this feature).

## Related API endpoints
- `POST /checkout/guest` — creates a guest order
- `POST /checkout/apply-promo` — validates and applies a promo code
- `GET /checkout/:orderId` — order confirmation lookup
