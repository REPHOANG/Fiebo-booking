export const adminMonthlyAnalytics = [
  { month: "01/2026", bookings: 12400, revenue: 320000000, activeUsers: 18200 },
  { month: "02/2026", bookings: 13720, revenue: 356000000, activeUsers: 19500 },
  { month: "03/2026", bookings: 14910, revenue: 388000000, activeUsers: 20750 },
  { month: "04/2026", bookings: 7800, revenue: 172000000, activeUsers: 14320 },
];

export const adminAuditLogs = [
  { id: "LOG-901", actor: "admin@fiebo.vn", action: "Lock venue", target: "Sunrise Court", time: "2026-04-10 08:45" },
  { id: "LOG-902", actor: "admin@fiebo.vn", action: "Update policy", target: "Refund policy", time: "2026-04-10 09:02" },
  { id: "LOG-903", actor: "finance-admin@fiebo.vn", action: "Export report", target: "Monthly revenue", time: "2026-04-10 10:11" },
];

export const adminCustomers = [
  { id: "CUS-001", name: "Nguyen Van Nam", email: "nam@gmail.com", phone: "0901123456", status: "Active" },
  { id: "CUS-002", name: "Tran Thi Lan", email: "lan@gmail.com", phone: "0912233445", status: "Active" },
  { id: "CUS-003", name: "Le Van Son", email: "son@gmail.com", phone: "0988333777", status: "Suspended" },
];

export const adminVenues = [
  { id: "VEN-101", name: "Fiebo Arena", owner: "Nguyen Van A", status: "Open" },
  { id: "VEN-102", name: "Sky Field", owner: "Tran Thi B", status: "Locked" },
  { id: "VEN-103", name: "Sunrise Court", owner: "Le Van C", status: "Open" },
];

export const adminOwners = [
  { id: "OWN-101", name: "Nguyen Van A", email: "owner.a@fiebo.vn", phone: "0909000001", venues: 2, status: "Verified" },
  { id: "OWN-102", name: "Tran Thi B", email: "owner.b@fiebo.vn", phone: "0909000002", venues: 1, status: "Pending KYC" },
];

export const adminVenueRegistrations = [
  { id: "REG-301", venueName: "Blue Star Arena", owner: "Pham Van D", submittedAt: "2026-04-09", status: "Pending" },
  { id: "REG-302", venueName: "Green Turf", owner: "Do Thi E", submittedAt: "2026-04-10", status: "Pending" },
];

export const adminFinanceAdmins = [
  { id: "FA-001", name: "Finance Admin 1", email: "finance1@fiebo.vn", status: "Active" },
  { id: "FA-002", name: "Finance Admin 2", email: "finance2@fiebo.vn", status: "Active" },
];

export const adminSports = [
  { id: "SP-01", name: "Bong da", icon: "⚽", status: "Active" },
  { id: "SP-02", name: "Cau long", icon: "🏸", status: "Active" },
  { id: "SP-03", name: "Bong ro", icon: "🏀", status: "Active" },
];

export const adminPolicies = [
  {
    key: "refund",
    title: "Refund policy",
    content:
      "Hoan tien 100% truoc 24h. Hoan 50% truoc 12h. Sau moc 12h khong hoan.",
    updatedAt: "2026-04-08",
  },
  {
    key: "venue",
    title: "Venue operation policy",
    content:
      "Owner phai cap nhat lich san theo ngay, dam bao thong tin gia va dich vu chinh xac.",
    updatedAt: "2026-04-05",
  },
];
