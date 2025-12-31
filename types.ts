
export enum PaymentStatus {
  PAID = 'PAID',
  SHORT = 'SHORT',
  OVERDUE = 'OVERDUE',
  ADVANCE = 'ADVANCE',
  LATE = 'LATE'
}

export interface PaymentEntry {
  id: string;
  date: string;
  expectedAmount: number;
  actualAmount: number;
  shortAmount: number;
  additionalPayments: {
    amount: number;
    date: string;
  }[];
  status: PaymentStatus;
  // Verification metadata
  proofImage?: string; 
  verifiedAt?: string;
  location?: string;
  isLocked: boolean; // Integrity flag
  correctionReason?: string;
}

export interface Customer {
  id: string;
  name: string;
  releaseDate: string;
  startDate: string;
  principalAmount: number;
  interestRate: number; // e.g. 0.05 for 5%
  durationMonths: number;
  moneyOwner: string;
  totalInterest: number;
  totalPayable: number;
  biMonthlyDeduction: number;
  remainingBalance: number;
  payments: PaymentEntry[];
  isCompleted?: boolean; // New: Tracks if the loan is fully settled
}

export interface Investor {
  id: string;
  name: string;
  initialCapital: number; // The total pool provided by investor
  totalInvested: number;  // Deployed capital (sum of principals)
  totalGained: number;    // Accrued interest profit
  availableCapital: number; // Idle money in the pool
  activeBatches: number;
  roi: number;
  performanceHistory: { month: string; profit: number }[];
  isWithdrawn?: boolean; // New: Flag for investors who pulled out
}

export interface BusinessStats {
  totalManaged: number;
  activeATMs: number;
  monthlyPerformance: number;
  totalInterestGained: number;
}
