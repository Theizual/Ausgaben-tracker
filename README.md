# Ausgaben Tracker

Eine moderne, interaktive Single-Page-Anwendung zur Verfolgung von Ausgaben mit einem klaren Fokus auf Benutzerfreundlichkeit und Datenvisualisierung.

## Setup

### Environment Variables

This project connects to Google Sheets to store data. You need to create a `.env.local` file in the root of the project with the following variables:

```
# The email address of your Google Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email@

# The private key for your Google Service Account.
# Make sure to format it correctly, replacing newlines with \n if necessary.
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n\n-----END PRIVATE KEY-----\n"

# The ID of the Google Sheet you want to use for storage.
GOOGLE_SHEET_ID=your_google_sheet_id
```

### Google Sheet Setup

Your Google Sheet must have the following tabs with the exact names:
- `Groups`
- `Categories`
- `Transactions`
- `Recurring`
- `Tags`
- `Users`
- `UserSettings`

You also need to share the Google Sheet with your service account's email address and give it "Editor" permissions.