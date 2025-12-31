
import { Customer, PaymentStatus, Investor } from '../types';

export const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Romnick Ababat',
    releaseDate: '2025-03-11',
    startDate: '2025-03-25',
    principalAmount: 28000,
    interestRate: 0.05,
    durationMonths: 5,
    moneyOwner: 'Doris Mendoza',
    totalInterest: 7000,
    totalPayable: 35000,
    biMonthlyDeduction: 3500,
    remainingBalance: 8750,
    payments: [
      {
        id: 'p1',
        date: '2025-03-25',
        expectedAmount: 3500,
        actualAmount: 3150,
        shortAmount: 350,
        additionalPayments: [{ amount: 350, date: '2025-05-25' }],
        status: PaymentStatus.PAID,
        isLocked: true
      },
      {
        id: 'p2',
        date: '2025-04-10',
        expectedAmount: 3500,
        actualAmount: 2350,
        shortAmount: 1150,
        additionalPayments: [{ amount: 1150, date: '2025-05-25' }],
        status: PaymentStatus.PAID,
        isLocked: true
      }
    ]
  },
  {
    id: '2',
    name: 'Nicole Garcia',
    releaseDate: '2025-01-10',
    startDate: '2025-01-25',
    principalAmount: 40000,
    interestRate: 0.05,
    durationMonths: 7,
    moneyOwner: 'Doris Mendoza',
    totalInterest: 14000,
    totalPayable: 54000,
    biMonthlyDeduction: 3858,
    remainingBalance: 4979,
    payments: [
      { id: 'n1', date: '2025-01-25', expectedAmount: 3858, actualAmount: 3858, shortAmount: 0, additionalPayments: [], status: PaymentStatus.PAID, isLocked: true }
    ]
  }
];

export const mockInvestors: Investor[] = [
  {
    id: 'inv1',
    name: 'Doris Mendoza',
    initialCapital: 250000, // Large pool
    totalInvested: 0,
    totalGained: 0,
    availableCapital: 0,
    activeBatches: 2,
    roi: 0,
    performanceHistory: [
      { month: 'Jan', profit: 12000 },
      { month: 'Feb', profit: 14500 },
      { month: 'Mar', profit: 13000 },
      { month: 'Apr', profit: 16500 },
      { month: 'May', profit: 15000 },
      { month: 'Jun', profit: 18000 },
    ]
  },
  {
    id: 'inv2',
    name: 'Private Investor Alpha',
    initialCapital: 100000, // Medium pool
    totalInvested: 0,
    totalGained: 0,
    availableCapital: 0,
    activeBatches: 0,
    roi: 0,
    performanceHistory: [
      { month: 'Jan', profit: 2000 },
      { month: 'Feb', profit: 2500 },
      { month: 'Mar', profit: 3200 },
      { month: 'Apr', profit: 3100 },
      { month: 'May', profit: 4500 },
      { month: 'Jun', profit: 5200 },
    ]
  }
];

export const businessStats = {
  totalManaged: 350000,
  activeATMs: 14,
  monthlyPerformance: 92,
  totalInterestGained: 78500
};
