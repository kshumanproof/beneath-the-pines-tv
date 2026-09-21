# Screener request receiver — one-time setup

1. Create a new Google Sheet named **Family Tradition Screener Requests**.
2. In the Sheet: **Extensions → Apps Script**. Delete the starter code, paste in `screener-requests.gs`, save.
3. **Deploy → New deployment** → type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy, then approve the permissions Google asks for (Sheets + send email as you).
4. Copy the **Web app URL** (ends in `/exec`) and paste it into `ENDPOINT` at the top of `assets/js/access-request.js`.
5. Open the URL in a browser once; you should see `{"ok":true,...}`.

Editing the script later: **Deploy → Manage deployments → Edit → Version: New version**. That keeps the same URL.

Request IDs come from the row number, so don't delete rows from the Sheet. Use the Status column (Pending / Approved / Declined) instead.
