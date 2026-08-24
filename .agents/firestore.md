# Firestore Rules and Data Model

## Database

Use Firebase Firestore.

Use the Firebase client/server SDK according to the project's existing architecture.

Do not introduce another database.

## Data Model

### users/{uid}

```text
name: string
email: string
role: "admin" | "petugas"
isActive: boolean
emailVerified: boolean
createdAt: Timestamp
updatedAt: Timestamp
```

Firebase Authentication UID must be used as the user document ID.

---

### houses/{houseId}

```text
houseNumber: string
headOfFamily: string
address: string
qrCode: string
notes: string | null
isActive: boolean
createdAt: Timestamp
updatedAt: Timestamp
```

Each house has a unique QR code.

The QR code should identify the house, not the user.

---

### periods/{periodId}

```text
periodNumber: number
startDate: Timestamp
endDate: Timestamp
amount: number
status: "active" | "archived"
createdAt: Timestamp
```

One period always represents 7 days.

Do not calculate periods based on calendar months.

A period may cross two calendar months.

Example:

```text
27 July - 2 August
```

is one period.

---

### payments/{paymentId}

```text
houseId: string
periodId: string
paidBy: string
paidAt: Timestamp
status: "paid"
createdAt: Timestamp
```

A payment represents:

```text
ONE HOUSE
+
ONE PERIOD
=
ONE PAYMENT
```

Prevent duplicate payment records for the same house and period.

The application should ensure that a house cannot accidentally be marked as paid twice for the same period.

---

### financial_transactions/{transactionId}

```text
type: "income" | "expense"
category: string
amount: number
description: string
houseId: string | null
paymentId: string | null
takenBy: string | null
createdBy: string
createdAt: Timestamp
```

For income generated from normal jimpitan payment:

```text
type = income
category = payment
paymentId = related payment ID
houseId = related house ID
```

For voluntary extra money:

```text
type = income
category = donation
```

For expenses:

```text
type = expense
category = operational | social | maintenance | other
```

## Important Financial Rule

Do not duplicate financial data unnecessarily.

A normal jimpitan payment should create:

1. one payment record
2. one financial transaction with type `income`

Example:

Payment:

```text
House A
Period 15
Rp3.500
```

Financial transaction:

```text
Income
Rp3.500
Category: payment
Payment ID: payment_xxx
```

## Extra Payment Example

If a resident gives Rp5.000 for a Rp3.500 obligation and voluntarily gives the remaining Rp1.500 to the jimpitan fund:

Payment record:

```text
Rp3.500
```

Financial transactions:

```text
Income
Rp3.500
Category: payment
```

and

```text
Income
Rp1.500
Category: donation
Description: Kelebihan pembayaran yang diikhlaskan
```

The extra amount must NOT be silently included in the normal payment amount.

## Expenses

Every expense must contain:

- amount
- description
- person taking the money
- person recording the transaction
- timestamp

Optional fields may be added for future evidence/receipt uploads.

## Financial Source of Truth

`financial_transactions` is the source of truth for:

- total income,
- total expenses,
- balance,
- financial reports.

`payments` is the source of truth for:

- payment status,
- house payment history,
- outstanding periods.

## Deletion

Avoid hard-deleting financial transactions.

Financial records should preferably be immutable.

If a correction is required, use a controlled correction/reversal mechanism instead of silently deleting historical financial data.
