
export enum PaymentStatus {
  PAID = 'PAID',
  SHORT = 'SHORT',
  OVERDUE = 'OVERDUE',
  ADVANCE = 'ADVANCE',
  LATE = 'LATE',
  WITHDRAWAL = 'WITHDRAWAL'
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
  // Verification metadata
  proofImages: string[]; // Changed from single proofImage to array
  proofImage?: string; // Kept for backward compatibility if needed, but primary is proofImages 
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
  extensions?: { id: string; date: string; addedMonths: number; addedInterest: number }[]; // New: Track extension history
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
  withdrawals: { id: string; date: string; amount: number }[]; // New: Track capital outflows
  deposits?: { id: string; date: string; amount: number }[]; // New: Track capital inflows
  isWithdrawn?: boolean; // New: Flag for investors who pulled out
}

export interface BusinessStats {
  totalManaged: number;
  activeATMs: number;
  monthlyPerformance: number;
  totalInterestGained: number;
}
