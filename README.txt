PAYMENT CALCULATOR PWA — FIRST WORKING VERSION
================================================

Included:
- OP Foods / Patra Foods selection every transaction
- Existing payment formulas from your Python code
- Offline local transaction storage using IndexedDB
- One shared transaction list for both companies
- Company filters, customer search, company-wise totals
- CSV export for Excel and CSV import/restore
- Receipt layout and browser print dialog
- PWA manifest and service worker for offline app shell

IMPORTANT LIMITATIONS
---------------------
1. This starter version stores data only in the browser on this phone.
   It does NOT automatically sync to a cloud server or another device.
2. Export payment_records.csv regularly. Clearing Chrome site data may erase
   local transactions.
3. Receipt printing currently opens the Android/Chrome print flow. Direct
   Bluetooth ESC/POS printing depends on the printer's Bluetooth mode and may
   require a compatible Android print-bridge app or a native Android wrapper.
4. Installable PWA/service worker features require HTTPS hosting (or localhost
   for development). Opening index.html as a local file is not enough.

EASIEST SETUP FROM A PHONE
--------------------------
1. Extract this ZIP into a folder.
2. Create a GitHub repository using your browser, or use another static host.
3. Upload index.html, app.js, manifest.json, sw.js, icon.svg, and this README.
4. On GitHub, open repository Settings > Pages.
5. Select deployment from the main branch and root folder, then save.
6. Wait for the published HTTPS URL.
7. Open the URL in Chrome on Android.
8. Test a sample transaction before using real payments.
9. In Chrome menu, choose Add to Home screen / Install app.
10. Create a test transaction, close the app, turn off internet, reopen it,
    and confirm the history remains available.
11. Use Reports & Backup > Export all transactions to CSV regularly.

PAYMENT RULES
-------------
Weight deduction = actual weight * 3.5 / 100
Net weight = actual weight - weight deduction
Amount after weight deduction = net weight * price per quintal
Labour = actual weight * 25
Amount after labour = amount after weight deduction - labour
1% deduction = amount after labour * 0.01
Final payment = amount after labour - 1% deduction

Before using in production, verify calculations and receipt output with sample
records. This is a starter implementation, not a substitute for backups.
