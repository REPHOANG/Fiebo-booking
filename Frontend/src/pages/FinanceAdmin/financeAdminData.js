export const financeAdminOwnerPayouts = [
  {
    id: "PO-901",
    owner: "Nguyen Van A",
    venue: "Fiebo Arena",
    amount: 8200000,
    cycle: "01/04 - 07/04",
    status: "Pending",
  },
  {
    id: "PO-902",
    owner: "Tran Thi B",
    venue: "Sky Field",
    amount: 6700000,
    cycle: "01/04 - 07/04",
    status: "Processing",
  },
  {
    id: "PO-903",
    owner: "Le Van C",
    venue: "Sunrise Court",
    amount: 4900000,
    cycle: "01/04 - 07/04",
    status: "Paid",
  },
];

export const financeAdminOwnerSubscriptions = [
  {
    id: "SUB-TX-001",
    owner: "Nguyen Van A",
    packageName: "Premium 12M",
    amount: 12900000,
    paymentDate: "2026-04-02",
    status: "Success",
  },
  {
    id: "SUB-TX-002",
    owner: "Tran Thi B",
    packageName: "Standard 6M",
    amount: 4900000,
    paymentDate: "2026-04-03",
    status: "Success",
  },
  {
    id: "SUB-TX-003",
    owner: "Le Van C",
    packageName: "Premium 12M",
    amount: 12900000,
    paymentDate: "2026-04-05",
    status: "Refunded",
  },
];

export const financeAdminRevenueReport = [
  { month: "01/2026", grossRevenue: 320000000, payouts: 248000000, refunds: 7800000 },
  { month: "02/2026", grossRevenue: 356000000, payouts: 276000000, refunds: 8300000 },
  { month: "03/2026", grossRevenue: 388000000, payouts: 301000000, refunds: 9200000 },
  { month: "04/2026", grossRevenue: 172000000, payouts: 116000000, refunds: 4100000 },
];

export const financeAdminWithdrawalRequests = [
  {
    id: "WD-501",
    customer: "Nguyen Van Nam",
    walletId: "WAL-1001",
    amount: 850000,
    requestedAt: "2026-04-08",
    status: "Pending",
  },
  {
    id: "WD-502",
    customer: "Tran Thi Lan",
    walletId: "WAL-1002",
    amount: 1200000,
    requestedAt: "2026-04-09",
    status: "Approved",
  },
  {
    id: "WD-503",
    customer: "Le Van Son",
    walletId: "WAL-1003",
    amount: 450000,
    requestedAt: "2026-04-10",
    status: "Pending",
  },
];
