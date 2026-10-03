// ---------------------------------------------------------------------------
// Seed content for line-of-business + program context injected into the LLM
// prompts. This is fictional sample content for "Sample Retail Co". Once seeded
// into Supabase `app_config`, the live copy is edited via /admin/config; this
// file is the fallback seed.
// Keep wording factual and concise — it is read by the model, not the user.
// `[VERIFY]` tags are intentional: they tell the model an item is unconfirmed.
// ---------------------------------------------------------------------------

export const ONLINE_STORE_CONTEXT = `# Online Store — line of business context

The Online Store is Sample Retail Co's direct-to-consumer ecommerce site (home goods, apparel, electronics, accessories). Shoppers browse categories, view product detail pages (PDPs), add to cart, and check out with standard payment methods. It is the highest-traffic surface and the primary place for experimentation and personalization work.

## Customers
- Mix of first-time visitors, returning shoppers, and loyalty members; value price clarity, fast checkout, and reliable delivery.
- Returning customers convert at a much higher rate than new visitors. NEW-visitor conversion is a focus area — treat it as a priority when scoping Acquisition work.
- Segments: new visitors, returning shoppers, loyalty members, cart abandoners, high-intent searchers. Do not assume audiences are shared with the Marketplace.

## Platforms (End User Platform)
- Customer: the Online Store website (responsive web, also used inside the mobile app via a web view). Primary surface for most work.
- Associate: an internal tool used by customer-care and store associates to look up orders, start returns, and place assisted orders.
- Partner: generally not applicable (the Online Store sells Sample Retail Co's own inventory).

## Journeys
- Acquisition: everything that brings a shopper to the site and gets them into a product — homepage, navigation, search, category listing pages, promotions, landing pages, email/ad landings.
- Conversion: product detail page through a completed order — PDP, cart, checkout, payment, order confirmation.
- Retention: everything after the first order — account, order tracking, returns, reorder, loyalty rewards usage, subscription and email preferences.

## Optional services (pure margin if selected at checkout)
- Extended warranty / protection plan.
- Expedited delivery and gift wrapping.
Treat attach-rate for these as a secondary metric; never let a test degrade core checkout completion.

## Messaging and compliance guardrails
- Pricing and promotion claims must be accurate and carry the standard promotion disclaimer. Do not promise delivery dates the logistics team has not confirmed. [VERIFY any new promotional wording with the legal/brand team before launch.]`;

export const MARKETPLACE_CONTEXT = `# Marketplace — line of business context

The Marketplace lets third-party sellers list products alongside Sample Retail Co's own catalog. It is a two-sided business — it serves SHOPPERS and the SELLERS who list products. This two-sided model changes both the audience and the success metrics compared with the Online Store.

## Customers
- Shoppers: comparison shoppers looking for breadth of selection and competitive prices; sensitive to seller trust signals (ratings, return policy, shipping speed).
- Sellers: small and mid-size merchants who want easy onboarding, clear fees, fast payouts, and visibility; they respond to dashboards, tooling, and education.
- Shoppers on the Marketplace skew toward deal-seekers; Online Store shoppers skew toward brand-loyal. Do not assume shared audiences.

## Platforms (End User Platform)
- Customer: the Marketplace website and mobile web storefront. Primary surface for shopper-facing work.
- Partner: the seller portal — listings, orders, payouts, analytics, onboarding, and training. Far more central here than for the Online Store.
- Associate: an internal marketplace-operations team member who reviews seller applications and handles disputes.

## Journeys (two entry paths)
1. Marketplace-first: a shopper starts on the Marketplace, browses sellers and categories, and buys.
2. Product-first: a shopper arrives from search or an ad on a specific listing, then compares sellers and checks out.

## Journeys
- Acquisition: everything that gets a shopper or seller to START — landing pages, category and seller browsing, seller sign-up, referral flows.
- Conversion: from listing view to a completed order (shoppers) or from sign-up start to an approved, live seller account (sellers).
- Retention: repeat purchases, seller performance and payouts, reviews, and account self-service.

## Metrics to know
Sessions: bounce/exit rate; listing views per session; clicks of "Add to cart" and "Become a seller". Seller-side: onboarding completion rate, time to first listing, first-sale rate.

## Optional services (pure margin if selected at checkout)
- Buyer protection plan and expedited shipping.

## Messaging and compliance guardrails
- Be clear that items are sold by independent sellers where applicable. Avoid guarantees about seller delivery times. [VERIFY seller-facing fee claims with the marketplace operations team.]`;

export const REWARDS_APP_CONTEXT = `# Rewards App — line of business context

The Rewards App is Sample Retail Co's mobile loyalty app (iOS and Android). Members earn points on purchases, redeem rewards, receive personalized offers, and can shop and track orders in the app.

## Customers
- Loyalty members of all tiers; engaged returning customers who value offers, points progress, and convenience.
- Segments: new members, active members, lapsed members, high-tier members.

## Platforms (End User Platform)
- Customer: the Rewards App (native app) and its companion web view for account and rewards pages.
- Associate: an internal tool used by store and care associates to look up members and adjust points.
- Partner: generally not applicable.

## Journeys
- Acquisition: app install, onboarding, and member sign-up.
- Conversion: first purchase or first reward redemption after sign-up.
- Retention: ongoing engagement — points earning, offers, tier progress, notifications, and re-engagement of lapsed members.

## Messaging and compliance guardrails
- Points and reward values must be accurate and carry the standard terms. Respect push/email notification consent. [VERIFY any new reward-value wording with the loyalty program owner.]`;

export const PROGRAM_CONTEXT = `# Testing & personalization tech stack (shared, cross-line-of-business)

Use this to judge what is technically feasible to test/personalize on which surface, how fast, and at what dev cost — and to flag dependencies. Do not invent capabilities beyond what is described.

## Experimentation — Optimizely
- Optimizely Web Experimentation: FASTER to production but still needs some front-end dev. Best for presentation-layer changes when speed matters.
- Optimizely Feature Experimentation (FX): longer-tailed but more stable; can test MORE than the front-end (deeper/full-stack/logic). The current FX setup is the SDK running client-side; it CAN be migrated to server-side for greater flexibility (a capability to grow into, not the default today).
- Effort/timing: a Web experiment is the fast path but not zero-dev; FX is more work and longer to ship but more capable. Reflect this in RICE effort and timeline.

### Availability by surface (sample assumptions)
- Online Store and Marketplace websites: Web Experimentation LIVE and in consistent use. FX is in onboarding — treat it as early-stage with extra lead time until first tests ship.
- Associate tools and the seller portal: Web Experimentation feasible with LOW effort (snippet install + allowlist). FX would be NET-NEW dev effort.
- Rewards App (native): Web Experimentation is NOT available in native screens; FX via the mobile SDK would be net-new dev effort. Web-view pages can use Web Experimentation.

## Measurement & analytics
- Optimizely Stats: in-flight reads of a running test (live decision surface).
- Web analytics + session-replay tooling: pre-analysis (scoping/sizing) and QA (heatmaps, session recordings) confirming experiences look right to real customers.
- BI dashboards on the data warehouse: trended revenue reporting on experiments (business-impact readout).
- CRITICAL timing: monthly revenue reports run ~2 weeks INTO THE FOLLOWING MONTH to let orders settle (returns, cancellations), so a definitive REVENUE read lags beyond a test's end. Distinguish a fast in-flight Stats read from a matured revenue read when setting "results needed by".

## Traffic and scoring anchors
- Top-line monthly active users (stakeholder reference, NOT a per-test baseline): Online Store ~3M, Marketplace ~1.5M, Rewards App ~0.8M.
- RICE Reach (1-10) calibration anchors: all users on the Homepage ~10 (broad/high-traffic); signed-in members on a PDP ~6 (narrower audience, deeper page); a single low-traffic settings page ~2.

## Personalization & recommendations
- Recommendation engine: powers product recommendations; API access to build recommendations into custom components.
- Email/SMS platform: personalized CRM for EMAIL and SMS. Its web delivery is not suitable for on-site/web personalization.
- Rule of thumb: on-site experience -> Optimizely; recommendations -> recommendation engine; email/SMS -> email/SMS platform.

## Platform notes
- Both websites are single-page applications built with React on a commerce platform. "Front-end dev" means React work in this stack.
- The Online Store has site search and recommendations; the Marketplace does NOT currently have site search — search-based test ideas are not feasible there.

## Signals available for targeting/personalization
Recently viewed pages/products/categories; category and product affinity scores (from frequency + recency); location and store availability; loyalty tier and membership status; cart contents; traffic source and campaign; device type; new vs. returning visitor.

If a signal is available and the user has NOT opted out, it can be used for testing/personalization. Consent is managed by a consent-management platform for privacy regulations; email/SMS consent is managed in the email/SMS platform.`;
