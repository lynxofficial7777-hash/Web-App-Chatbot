# ShopEase — Agent Design Rules

## UI Design Philosophy

Every UI prompt in this workspace is grounded in **human-made, opinionated design** — not template aesthetics. Apply the following principles to every interface built or modified:

### 1. Inconsistency is intentional
Real sites made by real designers are not pixel-perfect grids. Introduce slight variations:
- Card padding that is not identical on every side (e.g. `padding: "20px 18px 24px 20px"`)
- Section headings that are not all the same font-size or weight
- Spacing between elements that breathes unevenly — tighter where related, looser where distinct
- Not every element needs to be centered; left-aligned body copy, right-aligned prices, etc.

### 2. Personality over generic palettes
Avoid plain blue (#2563eb), plain white, plain gray. Every palette must have a reason:
- Pick colors with a point of view: dusty rose, warm amber, deep slate-green, vintage cream
- Use HSL to tune colors precisely rather than reaching for framework defaults
- Accent colors should feel unexpected but deliberate — e.g. hsl(24, 85%, 52%) not a generic orange
- Dark modes should use warm-tinted darks (#1a1710) not pure black or cold navy

### 3. Imperfection signals craft
Perfectly centered, evenly spaced UIs look like dashboards, not products:
- Slightly asymmetric hero text (padding-left a bit more than padding-right)
- A section header that sits 4px lower than expected
- A button that is 2px wider than its sibling — not a bug, a breath
- Use line-height 1.35 on headings instead of a round 1.5

### 4. Real design decisions — always justify the choice
When writing or generating UI code, the reasoning must be baked into the implementation:
- Font choice: e.g. "Used DM Serif Display for the hero because it signals editorial quality, not tech startup"
- Color choice: e.g. "amber-orange badge because it reads warm/urgent without being alarming red"
- Layout choice: e.g. "flush-left product names because scanning left-to-right mirrors how users read price lists"
- Spacing choice: e.g. "extra bottom padding on hero because text needs room to breathe after the gradient cut"

### 5. No emoji anywhere
Never use emoji in any UI output, labels, badges, or helper text.

### 6. No generic filler copy
Never use placeholder text like "Lorem ipsum", "Coming soon", or "Click here". Write real microcopy that fits the product.
