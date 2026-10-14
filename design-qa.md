# Order card design QA

**Findings**

No remaining P0, P1, or P2 differences in the pending-payment order card. The implementation follows the selected mock's two-column hierarchy, serif order number, amber status, gold total, three full-width actions, and next-step footer. The account shell and a tax row are intentional product-data differences.

**Evidence**

- Source visual truth: `/Users/baoren/.codex/generated_images/01a12f13-19d4-7c60-85f4-270df06f1148/exec-7534ffe3-d1d3-4f7e-a1d3-9af102fe1318.png` (1673 × 940 px, generated component image; CSS size and density unknown).
- Browser implementation: `http://localhost:8788/account/`, authenticated **To Pay** state with a pending order. OpenCLI full-page captures: desktop `/tmp/lumiere-order-redesign-desktop-final.png` (1440 × 1460 px at 1440 CSS px), tablet `/tmp/lumiere-order-redesign-tablet-final.png` (768 × 1752 px at 768 CSS px), and mobile `/tmp/lumiere-order-redesign-mobile-final.png` (390 × 2384 px at 390 CSS px). Browser capture scale: 1 image px per CSS px.
- Full-view, side-by-side comparison: `/tmp/lumiere-order-qa-full-final.png`. The source component and matching desktop tabs/card region were each scaled to 800 px wide; canvas padding only equalizes comparison height.
- Focused card comparison: `/tmp/lumiere-order-qa-final.png`, normalized the same way. Different order IDs, dates, prices, and the real tax row were excluded from fidelity judgments.

**Fidelity review**

- Fonts and typography: existing Playfair and Inter preserve the mock's display/body contrast; headings, labels, and button text remain readable without truncation.
- Spacing and layout: order summary and status/actions align in columns on desktop/tablet and stack on mobile. All three actions stay on one line at 768 px. No clipped controls or visible horizontal overflow at 390, 768, or 1440 px.
- Colors and tokens: existing ink, slate, gold, and amber treatments match the mock's visual roles; square corners are retained.
- Image assets: the selected mock contains no image assets in this component.
- Copy and content: action labels, status, and next step match the selected direction. Actual order data includes tax, so the ledger retains that row.

**Comparison history**

1. Initial focused comparison (`/tmp/lumiere-order-qa-comparison.png`) found P2 excess card height from roomy spacing and a real tax row. Tightened card padding, ledger rows, and section gaps. Final desktop comparison: `/tmp/lumiere-order-qa-final.png`.
2. Tablet capture showed P2 wrapping in “Change payment method.” Set a minimum 17 rem action column at 768 px and reduced action letter spacing. Final tablet capture shows three equal-height, single-line buttons.

**Interaction checks**

OpenCLI confirmed **To Pay** and **To Ship** tabs switch visible orders, the first paid order's tracking details open, and **Complete payment** reaches the payment page. The action links resolve to the existing payment, alternate payment, and receipt routes. Browser console reported no errors.

**Implementation checklist**

- [x] Recreate the selected pending-payment card and three button actions.
- [x] Verify mobile, tablet, and desktop layout and key order-tab/payment interactions.
- [x] Run frontend checks and backend typecheck.

final result: passed
