// Sample use cases by product surface.
// Two flavors per surface:
//   - Illustrative scenarios: hand-written narrative examples
//   - Backlog items: sample entries curated by RICE score and classified as FX / Web Exp / Direct
//
// Per-case schema:
//   title, hypothesis, primaryKpi, guardrails[], audience
//   recommendedTool: 'fx' | 'web' | 'direct'
//   toolRationale: short paragraph on why the tool fits (and what the alternative would miss)
//   source: 'illustrative' | 'backlog'
//   --- backlog-only ---
//   riceScore, status, page, goal

export const useCases = [
  {
    surface: 'Acquisition',
    summary:
      'Help new shoppers reach a sign-up or first-purchase decision faster, with less friction and clearer expectations.',
    color: 'lime',
    cases: [
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Streamlined account sign-up flow',
        hypothesis:
          'Reducing sign-up from a multi-step form to a progressive, single-screen experience will improve registration start rate without harming account quality.',
        primaryKpi: 'Sign-up → registration-start conversion',
        guardrails: [
          'Account verification rate (avoid downstream funnel quality drop)',
          'Registration abandonment past step 2',
          'Customer support contact rate on sign-up questions',
        ],
        audience: 'New visitors entering through paid acquisition channels',
        toolRationale:
          'This affects a high-value top-of-funnel journey. The risk of a UX simplification masking eligibility questions is real, so we need a control to compare account quality, not just conversion volume.',
      },
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Rewards education module placement',
        hypothesis:
          'Adding a "how rewards work" education module before the sign-up step will increase completed registrations and reduce post-registration abandonment.',
        primaryKpi: 'Completed registration rate',
        guardrails: [
          'Time to registration start',
          'Bounce rate on the education module',
          'Post-registration abandonment',
        ],
        audience: 'First-time visitors, no prior session',
        toolRationale:
          'Customer understanding of program terms drives downstream purchase behavior and retention. The measurable impact may be long-tail, which is exactly when a controlled experiment beats an opinion-based rollout.',
      },
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Entry-point variants for paid landing traffic',
        hypothesis:
          'Routing paid landing traffic directly into sign-up (vs. a category page) will improve cost-per-registration without reducing conversion quality.',
        primaryKpi: 'Cost per completed registration',
        guardrails: [
          'Account verification rate',
          'Registration drop-off in the first 30 seconds',
          'Returning visitor share',
        ],
        audience: 'Paid media traffic only — organic excluded',
        toolRationale:
          'This is exactly the kind of change where opinion will not settle the question. Audience-specific routing is a textbook FX use case because paid and organic audiences behave differently.',
      },

      // ---- Sample backlog items, ranked by RICE score ----

      {
        source: 'backlog',
        recommendedTool: 'web',
        riceScore: 16,
        status: 'Consider',
        page: 'Homepage & Footer',
        title: 'Sign Up for Deals — clearer copy',
        goal: 'Increase email/SMS opt-in rates by clarifying what the Sign Up for Deals prompt actually offers.',
        hypothesis:
          'Testing clearer copy for the "Sign Up for Deals" prompt on the homepage and footer will increase email/SMS opt-in rates by removing ambiguity about what subscribers receive.',
        primaryKpi: 'Email / SMS opt-in rate from Homepage + Footer prompts',
        guardrails: [
          'Homepage bounce rate',
          'Unsubscribe rate within first 14 days',
          'Downstream click-through on the first promotional send',
        ],
        audience: 'All Homepage and footer impressions',
        toolRationale:
          'Pure copy variant on a presentation surface with no eligibility logic and no behavioral measurement window — exactly what Web Experimentation is built for. Going FX here would add flag plumbing and warehouse analysis cost that adds nothing the page-level A/B cannot answer.',
      },
      {
        source: 'backlog',
        recommendedTool: 'web',
        riceScore: 11.2,
        status: 'Ideation',
        page: 'PDP',
        title: 'How Rewards Work verbiage',
        goal: 'Improve new-visitor comprehension of the rewards program to reduce hesitation on the PDP.',
        hypothesis:
          'Testing alternate verbiage for "How Rewards Work" on the PDP will improve new visitor comprehension of the rewards program, reducing hesitation and increasing add-to-cart intent.',
        primaryKpi: 'Add-to-cart rate from PDP for new visitors',
        guardrails: [
          'PDP scroll depth',
          'Engagement with the "How Rewards Work" module',
          'Checkout-stage drop-off (avoid optimizing for confusion)',
        ],
        audience: 'New visitors (no prior session) landing on a PDP',
        toolRationale:
          'A messaging copy test on a presentation surface. The PDP has plenty of traffic to reach significance quickly, and the change does not require backend logic. Web Exp is faster and cheaper than FX without sacrificing decision quality.',
      },
      {
        source: 'backlog',
        recommendedTool: 'fx',
        riceScore: 7.5,
        status: 'In Backlog',
        page: 'Homepage',
        title: 'Loyalty Tier 1 Electronics Promotion',
        goal: 'Increase electronics category engagement and conversion by surfacing eligibility to Tier 1 loyalty members.',
        hypothesis:
          'Showing signed-in Tier 1 loyalty members a personalized electronics-offer callout on the Homepage will increase electronics category click-through and orders.',
        primaryKpi: 'Electronics category CTR among Tier 1 signed-in users',
        guardrails: [
          'Overall Homepage bounce rate',
          'Cart abandonment among Tier 1 segment',
          'Downstream order performance for electronics category',
        ],
        audience: 'Signed-in customers in loyalty Tier 1 (entry tier)',
        toolRationale:
          'This is audience-conditional personalization — the experience changes based on a user attribute resolved from account data. That requires a flag with audience targeting and warehouse-side analysis to compare segment behavior. Web Exp cannot resolve "is this user Tier 1?" cleanly client-side.',
      },
      {
        source: 'backlog',
        recommendedTool: 'web',
        riceScore: 6,
        status: 'In Backlog',
        page: 'Store Locations',
        title: 'Locations Page — Reserve Online CTA',
        goal: 'Move more visitors from the Locations page into the shopping flow.',
        hypothesis:
          'Swapping the "Shop Now" CTA on the Locations page with a store-specific "Reserve Online" CTA will lead to more order starts from store-locator traffic.',
        primaryKpi: 'Order starts originating from the Locations page',
        guardrails: [
          'Locations page bounce rate',
          'Completion rate of Locations-sourced orders',
          'Store directory engagement (avoid suppressing in-store intent)',
        ],
        audience: 'All Store Locations page visitors',
        toolRationale:
          'A single CTA copy/label change with a clear page-level KPI. No flag-controlled logic, no longitudinal measurement needed. Web Exp will return a decision faster.',
      },
      {
        source: 'backlog',
        recommendedTool: 'web',
        riceScore: 6,
        status: 'Ideation',
        page: 'PDP',
        title: 'Confidence Badge — "Inspected & Verified"',
        goal: 'Surface trust indicators on PDP to reduce purchase hesitation on refurbished inventory.',
        hypothesis:
          'Showing an "Inspected & Verified" trust badge on PDPs for refurbished items will increase add-to-cart rate by reducing customer hesitation about product condition.',
        primaryKpi: 'Add-to-cart rate on refurbished PDPs',
        guardrails: [
          'Return rate within 14 days of purchase',
          'Customer service contact rate about product condition',
          'PDP exit rate',
        ],
        audience: 'All visitors viewing a refurbished item PDP',
        toolRationale:
          'A visual presentation element on a high-traffic surface — no product logic. The KPI is session-scoped (add-to-cart), so the lighter Web Exp toolchain is the right cost profile.',
      },
    ],
  },
  {
    surface: 'Conversion',
    summary:
      'Improve the cart, checkout, and order journey — where small changes can move both conversion and order quality.',
    color: 'lime',
    cases: [
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Checkout: inline vs. stepped order review',
        hypothesis:
          'Showing order review inline (vs. on a separate confirmation step) will reduce post-review drop-off and increase order completion rate.',
        primaryKpi: 'Review → order placed conversion',
        guardrails: [
          'Customer service contact rate around order review',
          'Payment-decline reaction (do customers misread inline status?)',
          'Order amendment requests in first 7 days',
        ],
        audience: 'All carts reaching order review',
        toolRationale:
          'Order review is the most consequential moment in the journey. A controlled rollout lets us measure customer comprehension and downstream order behavior, not just click-through.',
      },
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Guided product selection for rewards members',
        hypothesis:
          'Rewards members shown a curated set of products matching their points balance will place orders faster than customers browsing the full catalog.',
        primaryKpi: 'Landing → order placed time',
        guardrails: [
          'Average order value',
          'Customer returns within 14 days',
          'NPS post-purchase',
        ],
        audience: 'Rewards members, first session after a points update',
        toolRationale:
          'This affects average order value and could narrow customer choice. The tradeoff between speed and selection breadth needs to be measured, not assumed.',
      },
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Delivery scheduling UI redesign',
        hypothesis:
          'Making the delivery date and total prominent during checkout will reduce missed deliveries and failed first-delivery attempts.',
        primaryKpi: 'Successful first-delivery rate',
        guardrails: [
          'Checkout completion rate (avoid scaring customers off)',
          'Customer service contact rate on delivery questions',
          'Order cancellations in first 7 days',
        ],
        audience: 'New customers placing their first order',
        toolRationale:
          'First-delivery performance is a leading indicator for repeat purchase. The measurement window must extend beyond the immediate session — warehouse-based analysis required.',
      },

      // ---- Sample backlog items ----

      {
        source: 'backlog',
        recommendedTool: 'web',
        riceScore: 16.2,
        status: 'In Backlog',
        page: 'Post-login shopping',
        title: 'Alternate designs for rewards bar',
        goal: 'Drive more signed-in users into the shopping flow by making points balance and next steps more prominent.',
        hypothesis:
          'Testing alternate designs for the signed-in rewards bar will make the points balance and next steps more prominent, driving more signed-in users into the shopping flow.',
        primaryKpi: 'Signed-in user → first add-to-cart rate within the session',
        guardrails: [
          'Rewards bar visibility / scroll-past rate',
          'Average order value vs. points utilization',
          'PDP engagement among signed-in users',
        ],
        audience: 'All signed-in users shopping',
        toolRationale:
          'Highest-RICE item in the sample backlog. It is a visual / layout redesign of an existing UI bar with a session-scoped KPI — the textbook Web Exp pattern. FX would add overhead without changing the answer.',
      },
      {
        source: 'backlog',
        recommendedTool: 'fx',
        riceScore: 9.6,
        status: 'Consider - Personalization',
        page: 'PDP',
        title: 'Personalized PDP pricing for signed-in customers',
        goal: 'Personalize PDP pricing for signed-in customers using rewards balance and member discount to incentivize checkout.',
        hypothesis:
          'Updating PDP pricing for signed-in customers to reflect their rewards balance and member discount will increase add-to-cart and order completion rate.',
        primaryKpi: 'Signed-in PDP → order completion rate',
        guardrails: [
          'Average order value (avoid eroding revenue per order)',
          'PDP load latency (personalized pricing computation cost)',
          'Customer service contacts about pricing discrepancy',
        ],
        audience: 'Signed-in customers with a non-zero rewards balance or active member discount',
        toolRationale:
          'Audience-conditional pricing logic that touches the displayed product price — high-stakes from both a revenue and a customer-trust angle. Needs flag-controlled rollout, holdback to measure true incremental lift on completed orders (not just clicks), and warehouse analysis to net out the discount cost.',
      },
      {
        source: 'backlog',
        recommendedTool: 'web',
        riceScore: 9,
        status: 'Ideation',
        page: 'Subscription Terms',
        title: 'Visual hierarchy on subscription terms',
        goal: 'Reduce drop-off at the subscription-terms step by making the cost structure clearer.',
        hypothesis:
          'Improving the visual hierarchy of subscription terms (cost breakdown, billing cadence, total cost) will reduce drop-off at this checkout step.',
        primaryKpi: 'Subscription Terms → Continue-to-Payment progression rate',
        guardrails: [
          'Time on the Subscription Terms step',
          'Subsequent plan change requests',
          'Customer service contacts about terms misunderstanding',
        ],
        audience: 'All customers reaching the Subscription Terms step',
        toolRationale:
          'A layout / hierarchy redesign on a single page with a session-scoped progression KPI. Web Exp is the right speed/cost profile.',
      },
      {
        source: 'backlog',
        recommendedTool: 'web',
        riceScore: 8.4,
        status: 'Ideation',
        page: 'Checkout Flow',
        title: 'Numbering checkout steps',
        goal: 'Reduce perceived complexity by giving customers a clearer sense of progress.',
        hypothesis:
          'Numbering checkout steps will provide a clearer sense of progress and reduce perceived complexity, lifting step-to-step completion.',
        primaryKpi: 'End-to-end checkout completion rate',
        guardrails: [
          'Time per step',
          'Back-button usage between steps',
          'Customer service contact rate about checkout state',
        ],
        audience: 'All customers entering the checkout flow',
        toolRationale:
          'Pure presentation / UI labeling change. Standard checkout funnel is the canonical Web Exp surface — fast traffic, clean conversion KPI.',
      },
      {
        source: 'backlog',
        recommendedTool: 'fx',
        riceScore: 6,
        status: 'Ideation - FX',
        page: 'PDP / Cart',
        title: 'Product Comparison Functionality',
        goal: 'Help customers feel more confident in buying decisions by enabling side-by-side product comparison.',
        hypothesis:
          'Allowing users to compare products side by side from Cart and PDP will lead to higher confidence in the buying decision and higher order completion rate.',
        primaryKpi: 'PDP / Cart → order placed rate among users who engage with comparison',
        guardrails: [
          'Time-to-decision (could slow decision-making)',
          'Cart abandonment rate (do customers compare and walk away?)',
          'Average order value of comparison users',
        ],
        audience: 'All users browsing multiple products in a category in the same session',
        toolRationale:
          'Tagged FX by the team. New product surface that crosses Cart, PDP, and likely account/session state — needs a feature flag, a clean holdback to measure incremental lift, and behavioral measurement of whether comparison actually accelerates or stalls decision-making.',
      },
      {
        source: 'backlog',
        recommendedTool: 'fx',
        riceScore: null,
        status: 'Ideation - FX',
        page: 'Account Center',
        title: 'Restore Saved Cart',
        goal: 'Let returning visitors resume a previously-abandoned cart instead of starting over.',
        hypothesis:
          'Offering a one-click resume for visitors with a saved in-progress cart will increase completed orders without harming order quality.',
        primaryKpi: 'Returning-visitor order completion rate',
        guardrails: [
          'Order value of resumed carts (vs. fresh starts)',
          'Customer service contacts about cart state',
          'Stale-data risk (resumed carts with outdated prices or stock)',
        ],
        audience: 'Returning visitors with a saved in-progress cart',
        toolRationale:
          'Tagged FX by the team. New flow involving session/account state, audience targeting on "has saved cart," and downstream measurement of order quality — the textbook FX shape. The risk of resumed-but-stale carts affecting order outcomes makes a holdback essential.',
      },
    ],
  },
  {
    surface: 'Retention',
    summary:
      'Improve account experience, repeat purchase behavior, and membership lifecycle outcomes for active customers.',
    color: 'lime',
    cases: [
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Reorder reminder cadence in the account dashboard',
        hypothesis:
          'Showing a reorder reminder banner 5 days before the expected run-out date (vs. 2 days) will improve repeat purchase rate without increasing notification fatigue.',
        primaryKpi: 'Repeat purchase rate',
        guardrails: [
          'Account dashboard engagement',
          'Notification opt-out rate',
          'Customer service contact volume',
        ],
        audience:
          'Customers with an active account and 30+ days of order history',
        toolRationale:
          'Lapsed repeat purchases cascade into retention and lifetime value. The behavioral question — does earlier reminder help or annoy? — is exactly what FX answers.',
      },
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Membership self-service: annual plan savings visibility',
        hypothesis:
          'Surfacing annual-plan savings prominently in the account dashboard will increase annual plan upgrades without harming overall subscription revenue.',
        primaryKpi: 'Annual plan upgrade rate',
        guardrails: [
          'Total revenue per member',
          'Average membership length',
          'Customer satisfaction with membership experience',
        ],
        audience: 'Customers 60+ days into an active membership',
        toolRationale:
          'Annual upgrades are a strategic lever — they can improve customer perception of value but reduce average revenue per member. FX provides the controlled measurement to decide tradeoffs.',
      },
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Save / reactivation flow for at-risk memberships',
        hypothesis:
          'Offering a one-step plan adjustment to customers showing churn signals will reduce cancellation rate.',
        primaryKpi: 'Membership retention at 90 days',
        guardrails: [
          'Discount cost per saved membership',
          'Repeat cancellation after adjustment',
          'Customer support contact rate',
        ],
        audience:
          'Customers with churn score above threshold and at least one failed renewal',
        toolRationale:
          'Save offers cost real money. We need to know the net effect — retention lift minus cost of the offer — and FX with warehouse analysis is the only way to get that cleanly.',
      },

      // ---- Sample backlog items ----

      {
        source: 'backlog',
        recommendedTool: 'web',
        riceScore: 8,
        status: 'In Backlog',
        page: 'MyAccount',
        title: 'Bigger "View Rewards" / "Shop Now" CTAs',
        goal: 'Drive more engagement with the rewards program and re-shopping behavior from MyAccount.',
        hypothesis:
          'Increasing the size and visual prominence of "View Rewards" and "Shop Now" CTAs in MyAccount will drive more engagement with the rewards program and re-shopping behavior.',
        primaryKpi: 'CTR on "View Rewards" and "Shop Now" from MyAccount',
        guardrails: [
          'MyAccount order-action click rate (avoid distracting from primary task)',
          'Time to primary action (reorder) on MyAccount',
          'Bounce rate on MyAccount',
        ],
        audience: 'All signed-in customers landing on MyAccount',
        toolRationale:
          'A CTA visual prominence test on a high-traffic logged-in surface. No backend logic, KPI is session-scoped click-through. Web Exp returns the decision quickly and cheaply.',
      },
      {
        source: 'backlog',
        recommendedTool: 'web',
        riceScore: 8,
        status: 'Ideation',
        page: 'MyAccount',
        title: '"Arriving Today" / "Action Needed" prominence',
        goal: 'Increase awareness of pending actions and drive more timely responses.',
        hypothesis:
          'Making "Arriving Today" and "Action Needed" language more prominent in MyAccount will increase awareness of pending actions and drive timely responses.',
        primaryKpi: 'Task completion rate (in-session action + action within 24h of MyAccount visit)',
        guardrails: [
          'Plan modification rate (avoid panic-driven plan changes)',
          'Customer service contact rate about order status confusion',
          'Notification opt-out rate',
        ],
        audience: 'Customers with a pending-action order viewing MyAccount',
        toolRationale:
          'Visual prominence and copy treatment change on an existing dashboard widget. The KPI is near-term and measurable client-side. Web Exp is the right tool — though if downstream retention turns out to shift, this could later be re-run as an FX to measure the long-tail effect.',
      },
      {
        source: 'backlog',
        recommendedTool: 'web',
        riceScore: 6,
        status: 'Ideation',
        page: 'Member Portal',
        title: 'Early Upgrade Countdown Banner',
        goal: 'Increase early-upgrade utilization while improving clarity around plan options.',
        hypothesis:
          'Highlighting the early-upgrade offer with a countdown banner at the top of the Member Portal will increase utilization and improve clarity around plan options.',
        primaryKpi: 'Early-upgrade click-through from the Member Portal home',
        guardrails: [
          'Customer service contact rate about upgrade terms',
          'Bounce rate on Member Portal',
          'Upgrade completion rate (CTR vs. actual upgrade)',
        ],
        audience: 'Member Portal users within the early-upgrade eligibility window',
        toolRationale:
          'A banner placement and countdown UI on the Member Portal home. The KPI is click-through, not the downstream upgrade outcome, so Web Exp is appropriate. A separate FX could later measure whether higher CTR translates to higher completed upgrades.',
      },
      {
        source: 'backlog',
        recommendedTool: 'fx',
        riceScore: null,
        status: 'Ideation - FX',
        page: 'MyAccount',
        title: 'Self-Service Billing Hub: Grace Period + Catch-up Plan',
        goal: 'Reduce involuntary churn by offering at-risk customers self-service grace and catch-up flows.',
        hypothesis:
          'Offering Grace Period and Catch-up Plan flows in MyAccount to at-risk customers will reduce involuntary churn without increasing discount cost beyond the value of retained memberships.',
        primaryKpi: 'Membership retention at 60 / 90 days for at-risk cohort',
        guardrails: [
          'Discount cost per saved membership',
          'Repeat eligibility (do customers re-enter the flow?)',
          'Customer service contact volume on billing difficulty',
          'Overall membership revenue per cohort',
        ],
        audience: 'Active customers whose churn model output crosses the eligibility threshold',
        toolRationale:
          'Tagged FX by the team. This is a new feature surface, audience-gated by a churn model, with a strong revenue / cost tradeoff. Flag-controlled rollout lets us start with a small eligible cohort, and warehouse-side analysis is the only way to net the retention lift against the cost of the offer.',
      },
      {
        source: 'backlog',
        recommendedTool: 'fx',
        riceScore: null,
        status: 'Ideation - FX',
        page: 'MyAccount',
        title: 'Exchange Request Flow (Phase 1 web form)',
        goal: 'Open a digital channel for product exchange requests, replacing phone/store-only intake for Phase 1.',
        hypothesis:
          'Launching a Phase 1 web form for product exchanges in MyAccount will capture exchange demand earlier in the journey and improve completion rate vs. the current store/phone-only path.',
        primaryKpi: 'Exchange request submissions per eligible customer',
        guardrails: [
          'Inbound exchange-related call volume (should decline)',
          'Exchange completion rate (request → completed exchange)',
          'Associate effort per exchange in pilot stores',
        ],
        audience: 'Customers with recent orders eligible for exchange',
        toolRationale:
          'Tagged FX by the team. Brand-new surface, gated by exchange eligibility, with both customer and associate-side outcomes to measure. Needs a feature flag for staged rollout (basic form first, deeper flow later), a holdback in non-pilot regions, and warehouse-side measurement of phone deflection.',
      },
      {
        source: 'backlog',
        recommendedTool: 'fx',
        riceScore: null,
        status: 'Ideation - FX',
        page: 'MyAccount',
        title: 'Chatbot Intent Coverage / Deflection',
        goal: 'Increase deflection rate across top inquiry types with optimized escalation.',
        hypothesis:
          'Expanding chatbot intent coverage for the top inquiry types — with measurable escalation paths — will increase contact deflection without harming resolution quality.',
        primaryKpi: 'Deflection rate (chatbot-resolved / total chat sessions) for covered intents',
        guardrails: [
          'Post-chat customer satisfaction score',
          'Escalation rate to human agent',
          'Repeat contact rate within 7 days of a "resolved" chat',
        ],
        audience: 'Customers initiating a chat session with intents covered by the new model',
        toolRationale:
          'Tagged FX by the team. The customer-facing change is small (chatbot answers more questions) but the operational and CX impact is significant and long-tail. Resolution quality is only visible across a 7-day window, which requires warehouse analysis and a real holdback — not a session-scoped client-side test.',
      },
      {
        source: 'backlog',
        recommendedTool: 'fx',
        riceScore: null,
        status: 'Ideation - FX',
        page: 'Member Portal',
        title: 'Lowering Free-Shipping Threshold',
        goal: 'Improve conversion by lowering the free-shipping order threshold.',
        hypothesis:
          'Lowering the free-shipping threshold for an eligible customer cohort will increase order completions without eroding margin beyond the value of the added volume and reduced cart abandonment.',
        primaryKpi: 'Order completion rate within the eligible cohort',
        guardrails: [
          'Margin per order in the eligible cohort',
          'Average basket size',
          'Customer satisfaction post-purchase',
          'Cohort-level shipping cost',
        ],
        audience: 'Customers within the modified threshold band',
        toolRationale:
          'Tagged FX by the team. Pricing / shipping logic that directly trades short-term margin for long-term customer perception and order volume. Needs flag-controlled rollout to a small eligible cohort first, a clean control, and warehouse-side measurement of the cohort-level margin / cost tradeoff — Web Exp cannot resolve this question.',
      },
    ],
  },
  {
    surface: 'Internal Tools & Sellers',
    summary:
      'Test enhancements to internal associate tools and seller-facing experiences before broad deployment.',
    color: 'lime',
    cases: [
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Assisted-sales associate workflow simplification',
        hypothesis:
          'Reducing the associate assisted-sale workflow from 12 screens to 7 will increase associate throughput without harming order quality.',
        primaryKpi: 'Orders submitted per associate per hour',
        guardrails: [
          'Order error rate',
          'Customer-reported issues post-order',
          'Associate-reported satisfaction with the tool',
        ],
        audience: 'Associates in pilot store locations',
        toolRationale:
          'Associate tools affect both customer experience and operational throughput. A controlled rollout with location-level randomization lets us measure both sides.',
      },
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Seller portal: order status visibility',
        hypothesis:
          'Giving sellers real-time order status (vs. end-of-day batch) will improve seller satisfaction and reduce inbound calls about pending orders.',
        primaryKpi: 'Seller inbound calls per order',
        guardrails: [
          'Seller portal session duration',
          'Seller support tickets',
          'API load on the order service',
        ],
        audience: 'Sellers in selected verticals (furniture, electronics)',
        toolRationale:
          'Real-time data feels like an obvious win, but has technical cost. We need to confirm seller behavior actually changes before committing to the broader build.',
      },
      {
        source: 'illustrative',
        recommendedTool: 'fx',
        title: 'Operational decision-support prompt for fraud review',
        hypothesis:
          'Surfacing a risk-tier recommendation to associates reviewing edge-case orders will improve review accuracy.',
        primaryKpi: 'Downstream 30-day chargeback rate for reviewed orders',
        guardrails: [
          'Time-to-decision for reviewed orders',
          'Associate override rate of the recommendation',
          'Cancellation-rate change in affected customer segments',
        ],
        audience:
          'Edge-case orders flagged for associate review (specific risk-tier band)',
        toolRationale:
          'Decision-support tools can introduce automation bias. FX with a control group is the only credible way to measure whether the recommendation actually improves outcomes.',
      },
    ],
  },
];
