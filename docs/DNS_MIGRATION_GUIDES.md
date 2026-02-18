# Migrating Your DNS to Javelina

These guides walk you through switching DNS management for your domain to Javelina. This process involves two steps: setting up your domain in Javelina, then pointing your domain's nameservers to Javelina at your registrar.

**Javelina's Nameservers:**
```
ns1.javelina.cc
ns2.javelina.me
ns3.javelina.cc
ns4.javelina.me
```

> **DNS propagation typically takes 15 minutes to 48 hours** after updating nameservers. Your site and services will continue working on your old DNS during this window.

---

## Before You Begin: Universal Pre-Migration Checklist

Do this before changing anything, regardless of your current provider:

1. **Log in to Javelina** at [javelina.cc](https://javelina.cc) and create your account if you haven't already.
2. **Create an Organization** in Javelina and select a subscription plan.
3. **Create a Zone** in Javelina for your domain (e.g., `yourdomain.com`).
4. **Document all existing DNS records** from your current provider (see provider-specific instructions below for how to find them). You will need to recreate these in Javelina before switching nameservers.
5. **Add all records to Javelina** — A records, CNAME records, MX records, TXT records, etc. — before updating your nameservers. This prevents downtime.
6. **Lower your TTL** at your current provider to 300 seconds (5 minutes) at least 24 hours before switching, so the change propagates faster.

---

## GoDaddy

### Step 1 — Find Your Existing DNS Records

1. Sign in to [godaddy.com](https://godaddy.com).
2. Go to **My Products** → find your domain → click **DNS**.
3. You'll see a table of all your current DNS records. Take a screenshot or write them all down — every A, CNAME, MX, TXT, and any other records.

### Step 2 — Add Records to Javelina

Re-create all the records you documented in your Javelina zone. Pay special attention to:
- **A records** (your website IP addresses)
- **MX records** (your email provider — Google Workspace, Microsoft 365, etc.)
- **TXT records** (SPF, DKIM, domain verification records)
- **CNAME records** (subdomains like `www`, `mail`, `ftp`)

### Step 3 — Update Nameservers at GoDaddy

1. Sign in to [godaddy.com](https://godaddy.com).
2. Go to **My Products** → find your domain → click **DNS**.
3. Scroll to the bottom of the DNS page and find the **Nameservers** section.
4. Click **Change**.
5. Select **Enter my own nameservers (advanced)**.
6. Delete all existing nameservers and enter Javelina's:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
7. Click **Save** and confirm when prompted.

### Step 4 — Verify in Javelina

Go to your zone in Javelina and check the verification status. Once nameservers propagate, your zone will show as **Verified**.

---

## Namecheap

### Step 1 — Find Your Existing DNS Records

1. Sign in to [namecheap.com](https://namecheap.com).
2. Click **Domain List** in the left sidebar.
3. Find your domain and click **Manage**.
4. Click the **Advanced DNS** tab.
5. Document all records shown in the **Host Records** section.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone before proceeding.

### Step 3 — Update Nameservers at Namecheap

1. Sign in to [namecheap.com](https://namecheap.com).
2. Click **Domain List** → find your domain → click **Manage**.
3. On the **Domain** tab, find the **Nameservers** section.
4. Change the dropdown from **Namecheap BasicDNS** (or whatever is selected) to **Custom DNS**.
5. Enter Javelina's nameservers in the fields provided:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
6. Click the green checkmark to save.

### Step 4 — Verify in Javelina

Check your zone's verification status in Javelina. Propagation typically completes within 30 minutes for Namecheap.

---

## Squarespace Domains

> **Note:** If your domain was originally registered through Google Domains, it was automatically migrated to Squarespace Domains in 2023.

### Step 1 — Find Your Existing DNS Records

1. Sign in to [squarespace.com](https://squarespace.com).
2. Go to **Domains** in the left menu (or navigate to **Settings → Domains** in your site).
3. Click on your domain.
4. Click **DNS Settings**.
5. Document all records listed.

> **Note:** If Squarespace is also hosting your website, ensure you have an alternative hosting solution set up before switching DNS away from Squarespace. Your Squarespace site uses Squarespace-controlled DNS records to serve your website.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone. If you are keeping your Squarespace website, you will need to add the Squarespace IP addresses as A records (visible in your Squarespace DNS settings).

### Step 3 — Update Nameservers at Squarespace

1. Sign in to [squarespace.com](https://squarespace.com).
2. Go to **Domains**.
3. Click on your domain name.
4. Click **Name Servers** or **Advanced Settings**.
5. Click **Use Custom Name Servers**.
6. Remove existing nameservers and add:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
7. Click **Save**.

### Step 4 — Verify in Javelina

Check your zone's verification status in Javelina.

---

## Cloudflare

> **Note:** Cloudflare is itself a DNS provider. If you're moving a domain currently using Cloudflare DNS to Javelina DNS, follow these steps.

### Step 1 — Find Your Existing DNS Records

1. Sign in to [cloudflare.com](https://cloudflare.com).
2. Select your domain from the dashboard.
3. Click **DNS** → **Records**.
4. Document all records. You can also use the **Export** button (top right of the records table) to download a zone file.

> **Tip:** Save the exported zone file — you can use it as a reference when adding records to Javelina.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone. Note that Cloudflare uses "proxied" records (orange cloud) — when migrating to Javelina, set these as standard DNS records pointing to your actual origin IP addresses.

### Step 3 — Update Nameservers at Your Registrar

Cloudflare does not manage nameservers — your registrar does. Cloudflare assigned you nameservers like `xxx.ns.cloudflare.com` when you set it up. You need to go back to wherever you **registered** the domain (GoDaddy, Namecheap, etc.) and follow that provider's instructions above to update the nameservers to Javelina's.

If your domain is **registered at Cloudflare Registrar**:
1. In Cloudflare, go to **Domain Registration** → **Manage Domains**.
2. Click your domain → **Configuration** tab.
3. Under **Nameservers**, change to **Custom nameservers** and enter:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
4. Save.

### Step 4 — Verify in Javelina

Check your zone's verification status in Javelina.

---

## Wix

> **Note:** Wix has two scenarios — domains purchased through Wix, and external domains connected to Wix. This guide covers domains registered with Wix (wixsite.com premium domains).

### Step 1 — Find Your Existing DNS Records

1. Sign in to [wix.com](https://wix.com).
2. Go to **Domains** in the main menu (or your account dashboard).
3. Click **Manage** next to your domain.
4. Click **DNS Records**.
5. Document all records listed.

> **Important:** If Wix is hosting your website, be aware that switching away from Wix DNS will disconnect your website unless you configure equivalent records in Javelina. Make sure you have your hosting destination set up.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone.

### Step 3 — Update Nameservers at Wix

1. Sign in to [wix.com](https://wix.com).
2. Go to **Domains** → click **Manage** next to your domain.
3. Click **Advanced** → **Update Nameservers** (or **Change Nameservers**).
4. Remove existing nameservers and enter:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
5. Click **Update**.

### Step 4 — Verify in Javelina

Check your zone's verification status in Javelina.

---

## Google Domains

> **Note:** Google Domains was sold to Squarespace in 2023. Most domains have been migrated to Squarespace Domains. If your domain is now at Squarespace, see the [Squarespace Domains](#squarespace-domains) section above. If you still have access via Google Domains' interface, use these steps.

### Step 1 — Find Your Existing DNS Records

1. Sign in to [domains.google.com](https://domains.google.com).
2. Click on your domain.
3. Click **DNS** in the left panel.
4. Document all records under **Custom records**.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone.

### Step 3 — Update Nameservers

1. Sign in to [domains.google.com](https://domains.google.com).
2. Click on your domain → **DNS**.
3. At the top, switch to **Custom name servers**.
4. Click **Manage name servers** and enter:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
5. Click **Save**.

---

## Hover

### Step 1 — Find Your Existing DNS Records

1. Sign in to [hover.com](https://hover.com).
2. Click on your domain name.
3. Click the **DNS** tab.
4. Document all records listed.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone.

### Step 3 — Update Nameservers at Hover

1. Sign in to [hover.com](https://hover.com).
2. Click on your domain.
3. Click the **Domain** tab (not DNS).
4. Find the **Nameservers** section and click **Edit**.
5. Remove existing nameservers and add:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
6. Click **Save Nameservers**.

---

## Network Solutions

### Step 1 — Find Your Existing DNS Records

1. Sign in to [networksolutions.com](https://networksolutions.com).
2. Go to **Account Manager** → **My Domain Names**.
3. Click on your domain → **Manage**.
4. Click **DNS** or **Change Where Domain Points**.
5. Document all records.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone.

### Step 3 — Update Nameservers at Network Solutions

1. Sign in to [networksolutions.com](https://networksolutions.com).
2. Go to **Account Manager** → **My Domain Names**.
3. Click your domain → **Manage** → **Change Where Domain Points**.
4. Select **Domain Name Servers (DNS)**.
5. Click **Continue**.
6. Select **Specify nameservers** and enter:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
7. Click **Continue** and confirm.

---

## Bluehost

### Step 1 — Find Your Existing DNS Records

1. Sign in to [bluehost.com](https://bluehost.com).
2. Go to **Domains** in the main navigation.
3. Click on your domain.
4. Click **DNS** or **Zone Editor**.
5. Document all records listed.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone.

### Step 3 — Update Nameservers at Bluehost

1. Sign in to [bluehost.com](https://bluehost.com).
2. Go to **Domains** → click on your domain.
3. Click **Nameservers** tab.
4. Select **Custom Nameservers**.
5. Enter:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
6. Click **Save**.

> **Note:** If Bluehost is also your web host, your website will go offline unless you've set up hosting elsewhere and added the correct A records to Javelina before switching.

---

## HostGator

### Step 1 — Find Your Existing DNS Records

1. Sign in to [hostgator.com](https://hostgator.com) Customer Portal.
2. Go to **Hosting** → find your hosting account.
3. Click **cPanel** → **Zone Editor** or **DNS Zone Editor**.
4. Document all records.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone.

### Step 3 — Update Nameservers at HostGator

1. Sign in to [hostgator.com](https://hostgator.com).
2. Go to **Domains** → **My Domains**.
3. Click **Manage** next to your domain.
4. Find **Nameservers** and click **Modify**.
5. Select **Custom** and enter:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
6. Save.

---

## IONOS (formerly 1&1)

### Step 1 — Find Your Existing DNS Records

1. Sign in to [ionos.com](https://ionos.com).
2. Click on **Domains & SSL** in the top menu.
3. Click on your domain.
4. Click **DNS** in the left menu.
5. Document all records listed.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone.

### Step 3 — Update Nameservers at IONOS

1. Sign in to [ionos.com](https://ionos.com).
2. Go to **Domains & SSL** → click on your domain.
3. Click **Nameserver** in the left menu.
4. Click **Adjust nameservers** (or **Change nameservers**).
5. Select **Other nameservers** and enter:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
6. Click **Save**.

---

## Porkbun

### Step 1 — Find Your Existing DNS Records

1. Sign in to [porkbun.com](https://porkbun.com).
2. Click **Account** → **Domain Management**.
3. Find your domain and click **Details**.
4. Click **DNS Records**.
5. Document all records.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone.

### Step 3 — Update Nameservers at Porkbun

1. Sign in to [porkbun.com](https://porkbun.com).
2. Go to **Domain Management** → find your domain → click **Details**.
3. Find **Authoritative Nameservers** and click **Edit**.
4. Remove existing nameservers and add:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
5. Click **Save**.

---

## DreamHost

### Step 1 — Find Your Existing DNS Records

1. Sign in to [dreamhost.com](https://dreamhost.com) panel.
2. Go to **Domains** → **Manage Domains**.
3. Click **DNS** under your domain.
4. Document all custom DNS records.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone.

### Step 3 — Update Nameservers at DreamHost

1. Sign in to the DreamHost panel.
2. Go to **Domains** → **Manage Domains**.
3. Click **Edit** next to your domain (Hosting column).
4. Scroll down to find **Use another host's nameservers**.
5. Enter:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
6. Click **Save Changes**.

> **Note:** If DreamHost is also your web host, this will disconnect your hosting. Only proceed if you've set up hosting elsewhere.

---

## WordPress.com

> **Note:** WordPress.com allows you to register domains. This covers domains registered through WordPress.com.

### Step 1 — Find Your Existing DNS Records

1. Sign in to [wordpress.com](https://wordpress.com).
2. Go to **Upgrades** → **Domains**.
3. Click on your domain.
4. Click **DNS Records**.
5. Document all records listed.

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone.

### Step 3 — Update Nameservers at WordPress.com

1. Sign in to [wordpress.com](https://wordpress.com).
2. Go to **Upgrades** → **Domains**.
3. Click on your domain.
4. Click **Name Servers**.
5. Select **Use custom name servers** and enter:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
6. Click **Save Custom Name Servers**.

> **Note:** If WordPress.com is hosting your website, switching nameservers will affect your site. Ensure you have your A records properly configured in Javelina first.

---

## AWS Route 53

### Step 1 — Find Your Existing DNS Records

1. Sign in to the [AWS Console](https://console.aws.amazon.com).
2. Go to **Route 53** → **Hosted zones**.
3. Click on your domain's hosted zone.
4. Document all record sets listed.
5. You can also export via the AWS CLI:
   ```
   aws route53 list-resource-record-sets --hosted-zone-id YOUR_ZONE_ID
   ```

### Step 2 — Add Records to Javelina

Re-create all records in your Javelina zone.

### Step 3 — Update Nameservers

If your domain is **registered in Route 53 Registrar**:
1. Go to **Route 53** → **Registered domains**.
2. Click on your domain.
3. Click **Edit name servers**.
4. Remove existing NS records and add:
   ```
   ns1.javelina.cc
   ns2.javelina.me
   ns3.javelina.cc
   ns4.javelina.me
   ```
5. Click **Update**.

If your domain is **registered elsewhere** and just using Route 53 for DNS, go to your registrar (GoDaddy, etc.) and follow that provider's instructions above.

---

## After Switching Nameservers — Verification Steps

Once you've updated your nameservers at your registrar, do the following:

### 1. Check propagation status
Use a free tool like [whatsmydns.net](https://whatsmydns.net) or [dnschecker.org](https://dnschecker.org) to monitor when your new nameservers have propagated globally. Enter your domain and select **NS** as the record type.

### 2. Verify in Javelina
Log in to Javelina, go to your zone, and check the **verification status**. Once your nameservers have propagated, the zone will show as **Verified**.

### 3. Test your services
After propagation, confirm:
- [ ] Your website loads correctly
- [ ] Email is working (send a test email)
- [ ] Any subdomains (www, mail, app, etc.) resolve correctly
- [ ] SSL/HTTPS is working

### 4. Clean up
Once everything is verified and working, you can optionally delete your old hosted zone/records at your previous provider.

---

## Common Issues

**My nameservers updated but the zone still shows as unverified in Javelina.**
DNS propagation can take up to 48 hours. Check [whatsmydns.net](https://whatsmydns.net) to see how far propagation has spread. If it's been over 48 hours, contact Javelina support.

**My website went down after switching nameservers.**
This means a required DNS record wasn't added to Javelina before switching. Check your zone in Javelina and compare against your original records. Common missing records are: A record for the root domain (`@`), A or CNAME record for `www`.

**My email stopped working after switching nameservers.**
MX records are likely missing or incorrect in Javelina. Log in to Javelina, check your zone's MX records, and compare against your email provider's required settings (Google Workspace, Microsoft 365, etc.).

**I can't find the nameserver settings at my provider.**
Look for terms like "DNS settings," "Name servers," "Domain management," or "Advanced DNS." If you're still stuck, search "[your provider name] how to change nameservers" — most providers have help articles on this.

---

*For help with your Javelina account, DNS configuration, or migration questions, contact Javelina support.*
