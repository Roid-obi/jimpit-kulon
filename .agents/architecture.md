# System Architecture

## Application Scope

Application is designed for one RT with approximately 45 houses.

Prioritize:

- simplicity,
- reliability,
- maintainability,
- low operational complexity,
- easy usage on mobile devices.

Do not over-engineer the application.

## Database

The application uses:

**Firebase Firestore only**

Do not introduce:

- MySQL,
- PostgreSQL,
- MongoDB,
- Supabase database,
- Prisma,
- Drizzle,
- another external database.

Firebase Authentication may be used for authentication.

## Main Firestore Collections

The core database consists of:

```text
users
houses
periods
payments
financial_transactions
settings
```

Do not create additional collections unless there is a clear business requirement.

## Collection Responsibilities

### users

Stores application users.

Roles:

- admin
- petugas

### houses

Stores houses participating in jimpitan.

One document represents one house.

The system currently has approximately 45 houses.

### periods

Stores 7-day jimpitan periods.

A period is not a calendar week.

Each period has:

- periodNumber
- startDate
- endDate
- amount
- status

### payments

Stores whether a house has paid a particular jimpitan period.

One payment document represents:

One house + One period.

Payments are administrative records.

They are NOT online payment transactions.

### financial_transactions

Stores all financial movements related to jimpitan.

Types:

- income
- expense

Examples of income:

- jimpitan payment
- donation
- extra money voluntarily given by a resident
- other jimpitan-related income

Examples of expense:

- operational expenses
- social activities funded by jimpitan
- maintenance
- other legitimate jimpitan expenses

### settings

Stores global application settings.

Because this application is only for one RT, global configuration does not need a complex multi-tenant architecture.

## Financial Calculation

Do not store a manually maintained balance field unless there is a strong technical reason.

Balance should be calculated from:

Total income - Total expense

The financial transaction collection is the source of truth for financial reporting.

The payments collection is the source of truth for house/period payment status.
