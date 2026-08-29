# Product Design Brief

## Product goal

Teach a beginner how a credible e-commerce flow fits together without hiding the important web/security concepts behind a framework.

## UX principles

1. **One primary action per screen** — browse, add, checkout, sign in.
2. **Cart survives auth friction** — localStorage keeps items if checkout redirects to login.
3. **Progressive trust** — browsing requires no account; account is required only at checkout/order history.
4. **No fake payment UI** — the dummy checkout deliberately omits card-looking fields so learners do not confuse it with PCI-safe payment collection.
5. **Clear system status** — loading, empty, success and error states are visible.
6. **Mobile first** — single-column flows collapse cleanly on phones.
7. **Accessible basics** — semantic forms, labels, autocomplete attributes, keyboard-native controls and strong focusable controls.
8. **Security explained in-product** — product/checkout copy reminds learners that server pricing is authoritative.

## Core journey

```text
Landing
  -> Product list
      -> Product detail
          -> Add to cart
              -> Cart
                  -> Checkout
                      -> If logged out: Login/Register
                          -> Email verification
                          -> Login
                      -> Shipping details
                      -> Place dummy order
                      -> Account / order history
```

## Visual direction

- PetitBakery uses a warm cream canvas with apricot and peach feature panels
- chunky black display typography pairs with compact rounded product cards
- bakery photography does the visual work instead of decorative UI
- dark brown ink and muted cocoa text keep contrast high and the learning copy readable
- the supplied bakery screenshot is the composition reference; the brand and assets are original

## Why cart is local-first

For a teaching app, local cart state:

- works before registration,
- avoids unnecessary writes,
- reduces D1 free-tier usage,
- keeps backend authority at checkout because price is recalculated from product IDs.

A later lesson can add an authenticated server cart and cart merge after login.
