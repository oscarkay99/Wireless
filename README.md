# Wireless Customer Portal Setup

This static site now connects directly to the same Supabase project as the repair command center.

## What it does

- Customers can sign up and sign in with Supabase Auth
- Website signups are linked to `public.customers`
- Logged-in customers can book a repair intake from `contact.html`
- Customers can only see their own repairs and media
- The `my-repairs.html` page updates from live repair changes

## Before testing

1. Apply the latest Supabase migrations from the main project, especially:
   - `20260609123000_repair_media.sql`
   - `20260609143000_repair_diagnosis_and_customer_linking.sql`
   - `20260609170000_customer_portal_auth_and_rls.sql`
2. Open [assets/js/config.js](/Users/Ox/Desktop/Projects/repair-shop/wireless-site/assets/js/config.js:1)
3. Replace the placeholder values with your real Supabase project URL and publishable key

## Diagnosis flow now enforced

- Website customers only create a `received` booking first
- Customers do not see diagnosis progress until diagnosis payment is confirmed
- Technicians cannot move a repair into `diagnosing` unless diagnosis payment exists
- Customers who pay diagnosis but do not continue repair still remain valid customers

## Main files changed

- [assets/js/auth.js](/Users/Ox/Desktop/Projects/repair-shop/wireless-site/assets/js/auth.js:1)
- [assets/js/supabase-client.js](/Users/Ox/Desktop/Projects/repair-shop/wireless-site/assets/js/supabase-client.js:1)
- [assets/js/config.js](/Users/Ox/Desktop/Projects/repair-shop/wireless-site/assets/js/config.js:1)
- [assets/js/form.js](/Users/Ox/Desktop/Projects/repair-shop/wireless-site/assets/js/form.js:1)
- [my-repairs.html](/Users/Ox/Desktop/Projects/repair-shop/wireless-site/my-repairs.html:1)
