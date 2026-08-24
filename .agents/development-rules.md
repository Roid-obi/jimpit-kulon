# Development Rules

## General

Keep the application simple.

Do not introduce unnecessary abstractions, libraries, services, or database collections.

Before implementing a new feature, check whether the feature can be implemented using the existing architecture.

## Authentication

Use Firebase Authentication with email/password.

Registration must require email verification.

Users who have not verified their email must not be allowed to use the main application.

Do not implement custom email/password authentication.

Do not store user passwords in Firestore.

## Roles

Supported roles:

- admin
- petugas

All authenticated and verified users should be able to view the financial dashboard.

Financial information includes:

- total income,
- total expenses,
- current balance,
- financial history.

Role differences should primarily control who can modify data.

## Financial Transparency

All roles should be able to see:

- total jimpitan income,
- total other income,
- total expenses,
- current jimpitan balance,
- financial transaction history.

Do not hide the financial balance from ordinary petugas.

## Payment Recording

The application records payments only.

It does not process money.

Never add:

- payment gateway,
- QRIS payment,
- bank transfer integration,
- e-wallet,
- online payment,
- checkout flow.

QR codes in this application are only used to identify houses.

They are NOT payment QR codes.

## QR Code

Each house has a unique QR code.

Scanning a QR code should navigate to the corresponding house page.

If scanning fails, the user should be able to search for the house manually.

## Period

Always display the actual date range.

Good:

```text
27 Jul - 2 Aug
```

Bad:

```text
Minggu 5
```

Do not use calendar week numbers for jimpitan periods.

## Payment Cancellation

If a paid period is accidentally clicked again, do not immediately remove it.

Require confirmation.

Any correction involving financial records must be handled carefully so historical financial data is not silently lost.

## User Interface

The primary users are jimpitan volunteers using mobile phones while visiting houses.

Therefore:

- prioritize mobile-first design,
- buttons must be large enough to tap,
- scanning QR should be fast,
- payment status should be visually obvious,
- minimize unnecessary forms,
- minimize typing,
- use clear Indonesian labels.

## Indonesian Terminology

Use these terms consistently:

- Rumah
- Kepala Keluarga
- Periode Jimpitan
- Lunas
- Belum Dibayar
- Tunggakan
- Pemasukan
- Pengeluaran
- Saldo Dana Jimpitan
- Petugas
- Admin

Do not use "Minggu 1", "Minggu 2", etc. for payment periods.

## Code Quality

Use TypeScript where applicable.

Prefer clear and readable code over clever abstractions.

Validate all user input.

Handle Firestore errors gracefully.

Do not expose sensitive Firebase configuration or authentication data.

Use Firestore Security Rules to enforce authorization.
