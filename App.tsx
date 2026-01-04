

import React, { useState, useMemo } from 'react';
import Sidebar from './components/UI/Sidebar';
import StatCard from './components/UI/StatCard';
import { mockCustomers as initialCustomers, mockInvestors as initialInvestors, businessStats } from './services/mockData';
import { Customer, PaymentStatus, Investor, PaymentEntry } from './types';
import { Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie, LineChart, Line, XAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Utility: Calculate Strict 15th/30th Deadlines (Starts NEXT MONTH) ---
const getPaymentDeadlines = (startDate: string, numCycles: number): string[] => {
  const deadlines: string[] = [];
  let current = new Date(startDate);

  current.setDate(1);
  current.setMonth(current.getMonth() + 1);
  current.setDate(15);

  for (let i = 0; i < numCycles; i++) {
    deadlines.push(current.toISOString().split('T')[0]);

    const is15th = current.getDate() === 15;
    if (is15th) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      current.setDate(Math.min(30, lastDayOfMonth));
    } else {
      current.setDate(1);
      current.setMonth(current.getMonth() + 1);
      current.setDate(15);
    }
  }
  return deadlines;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

// --- Logo Component ---
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const BisdashLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bisdash-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="100" height="100" rx="28" fill="url(#bisdash-grad)" />
    <path d="M32 30H55C63.2843 30 70 36.7157 70 45V45C70 53.2843 63.2843 60 55 60H32V30Z" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 60V75" stroke="white" strokeWidth="9" strokeLinecap="round" />
    <circle cx="78" cy="78" r="8" fill="white" filter="url(#glow)" />
  </svg>
);

// --- Landing Page ---
const LandingPage = ({ onContinue }: { onContinue: () => void }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden px-6 py-20">
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
      <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-emerald-300 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-blue-300 rounded-full blur-[120px]"></div>
    </div>
    <div className="max-w-4xl w-full text-center z-10 space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <div className="flex flex-col items-center space-y-6">
        <div className="p-1 bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-200/50 transform hover:scale-105 transition-transform duration-500">
          <BisdashLogo className="w-24 h-24" />
        </div>
        <div className="space-y-2">
          <h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase italic">Bisdash</h1>
          <p className="text-emerald-600 font-black tracking-[0.4em] text-xs uppercase italic">Simple ATM Tracking</p>
        </div>
      </div>
      <div className="space-y-6">
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight italic">Watch your business <br /><span className="text-emerald-600">grow clearly.</span></h2>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed italic">No complicated bank words. Just your money and your customers, clearly tracked.</p>
      </div>
      <div className="pt-6">
        <button onClick={onContinue} className="group relative px-12 py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl hover:bg-emerald-600 transition-all duration-500 shadow-2xl shadow-slate-300 hover:shadow-emerald-200 flex items-center gap-4 mx-auto italic">
          <span>Open Dashboard</span><span className="text-2xl group-hover:translate-x-2 transition-transform italic">→</span>
        </button>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);
  const [currentTab, setCurrentTab] = useState('customers');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isAddingInvestor, setIsAddingInvestor] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isConfirmingEdit, setIsConfirmingEdit] = useState(false);
  const [verifyingSlot, setVerifyingSlot] = useState<number | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<'ALL' | 'PAID' | 'SHORT' | 'ADVANCE' | 'LATE'>('ALL');
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extensionMonths, setExtensionMonths] = useState(1);
  const [transactionsView, setTransactionsView] = useState<'customer' | 'investor'>('customer');
  const [cancellingExtensionId, setCancellingExtensionId] = useState<string | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawingInvestor, setWithdrawingInvestor] = useState<Investor | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositingInvestor, setDepositingInvestor] = useState<Investor | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');

  const [baseInvestors, setBaseInvestors] = useState<Investor[]>(initialInvestors);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers.map(c => ({
    ...c,
    payments: c.payments.map(p => ({ ...p, isLocked: true }))
  })));

  // --- PDF Generation Logic ---
  const generateCustomerPDF = (customer: Customer) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Summary Statistics
    const totalShorts = customer.payments.filter(p => p.status === PaymentStatus.SHORT).length;
    const totalLates = customer.payments.filter(p => p.status === PaymentStatus.LATE).length;
    const totalOverdue = customer.payments.filter(p => p.status === PaymentStatus.OVERDUE).length;
    const totalPayments = customer.payments.length;

    // Header
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("BISDASH", 20, 25);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("ATM MANAGEMENT SYSTEM", 20, 32);

    doc.setFontSize(14);
    doc.text(`CUSTOMER REPORT: ${customer.name.toUpperCase()}`, pageWidth - 20, 25, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`Date Printed: ${new Date().toLocaleDateString()}`, pageWidth - 20, 32, { align: 'right' });

    // Payment Behavior Summary
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Behavior Summary", 20, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Total Payments', 'Short Payments', 'Late Payments', 'Overdue Cycles']],
      body: [[
        String(totalPayments),
        { content: String(totalShorts), styles: { textColor: totalShorts > 0 ? [239, 68, 68] : [15, 23, 42], fontStyle: 'bold' } },
        { content: String(totalLates), styles: { textColor: totalLates > 0 ? [245, 158, 11] : [15, 23, 42], fontStyle: 'bold' } },
        { content: String(totalOverdue), styles: { textColor: totalOverdue > 0 ? [220, 38, 38] : [15, 23, 42], fontStyle: 'bold' } }
      ]],
      theme: 'grid',
      headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontSize: 8 },
      styles: { halign: 'center', fontSize: 10 }
    });

    // Loan Overview
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Loan Overview", 20, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Metric', 'Value']],
      body: [
        ['Customer Name', customer.name],
        ['Money Source', customer.moneyOwner],
        ['Principal Amount', formatPDFCurrency(customer.principalAmount)],
        ['Monthly Interest', `${(customer.interestRate * 100).toFixed(0)}%`],
        ['Total Payable', formatPDFCurrency(customer.totalPayable)],
        ['Remaining Balance', formatPDFCurrency(customer.remainingBalance)],
        ['Loan Status', customer.isCompleted ? 'FULLY SETTLED' : 'ACTIVE'],
        ['Start Date', formatDate(customer.startDate)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    // Payment History
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Detailed Transaction Ledger", 20, (doc as any).lastAutoTable.finalY + 15);

    const paymentRows = customer.payments.map((p, idx) => {
      const extraPaymentsInfo = p.additionalPayments.length > 0
        ? `(+${p.additionalPayments.length} Follow-ups)`
        : '';

      let statusText: string = p.status;
      if (p.status === PaymentStatus.SHORT && p.shortAmount > 0) {
        statusText = `SHORT (Owed: ${formatPDFCurrency(p.shortAmount)})`;
      }

      return [
        `Cycle ${idx + 1}`,
        formatDate(p.date),
        formatPDFCurrency(p.expectedAmount),
        formatPDFCurrency(p.actualAmount),
        `${statusText} ${extraPaymentsInfo}`,
        p.location || 'N/A',
        p.proofImage || p.proofImages?.[0] ? 'YES' : 'NO'
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Cycle', 'Date', 'Expected', 'Paid', 'Status', 'Location', 'Proof']],
      body: paymentRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 7, halign: 'center' },
      columnStyles: { 4: { halign: 'left', cellWidth: 45 }, 5: { halign: 'left' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val.includes('SHORT') || val.includes('OVERDUE') || val.includes('LATE')) {
            data.cell.styles.fontStyle = 'bold';
            if (val.includes('SHORT') || val.includes('OVERDUE')) {
              data.cell.styles.textColor = [220, 38, 38]; // Red
            } else if (val.includes('LATE')) {
              data.cell.styles.textColor = [217, 119, 6]; // Amber
            }
          }
        }
      }
    });

    // Verification Footer
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY < 270) {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("This is a system-generated statement. Proofs and verification logs are stored securely in the Bisdash Blockchain.", pageWidth / 2, finalY, { align: 'center' });
    }

    doc.save(`Bisdash_Statement_${customer.name.replace(/\s+/g, '_')}.pdf`);
  };

  const generateInvestorPDF = (investor: Investor) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header (Indigo Theme for Investors)
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("BISDASH", 20, 25);

    doc.setFontSize(14);
    doc.text(`INVESTOR PORTFOLIO: ${investor.name.toUpperCase()}`, pageWidth - 20, 25, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, pageWidth - 20, 32, { align: 'right' });

    // Financial Performance
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Financial Summary", 20, 55);

    autoTable(doc, {
      startY: 60,
      body: [
        ['Total Pool Capital', formatPDFCurrency(investor.initialCapital)],
        ['Currently Invested', formatPDFCurrency(investor.totalInvested)],
        ['Total Earnings (Gained)', formatPDFCurrency(investor.totalGained)],
        ['Available (Idle) Cash', formatPDFCurrency(investor.availableCapital)],
        ['Total ROI', `${investor.roi}%`],
        ['Active Loan Batches', String(investor.activeBatches)],
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 4, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 80 } }
    });

    // Ledger (Money Flow)
    doc.text("Recent Transactions & Capital Movements", 20, (doc as any).lastAutoTable.finalY + 15);

    const movements = [
      ...investor.withdrawals.map(w => ({ date: w.date, label: 'Capital Withdrawal', amount: -w.amount, type: 'OUT' })),
      ...(investor.deposits || []).map(d => ({ date: d.date, label: 'Capital Top-up', amount: d.amount, type: 'IN' })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Date', 'Transaction Type', 'Amount']],
      body: movements.map(m => [formatDate(m.date), m.label, formatPDFCurrency(m.amount)]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Bisdash_Investor_${investor.name.replace(/\s+/g, '_')}.pdf`);
  };

  const generateFullAdminPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("BISDASH", 20, 25);
    doc.setFontSize(14);
    doc.text("SYSTEM-WIDE AUDIT REPORT", pageWidth - 20, 25, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text("Global Ecosystem Stats", 20, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Global Value']],
      body: [
        ['Total Capital Managed', formatPDFCurrency(liveStats.totalManaged)],
        ['Total Active Portfolio', formatPDFCurrency(liveStats.totalDeployed)],
        ['Aggregate Interest Gained', formatPDFCurrency(liveStats.totalInterestGained)],
        ['Available System Liquidity', formatPDFCurrency(liveStats.totalAvailable)],
        ['Active ATM Borrowers', String(liveStats.activeATMs)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.text("Full Ledger Record (Last 100 Transactions)", 20, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Date', 'Customer/Label', 'Pool', 'Amount', 'Type']],
      body: allTransactions.slice(0, 100).map(t => [
        formatDate(t.date),
        t.customerName || t.label || 'N/A',
        t.investorPool || t.pool || 'N/A',
        formatPDFCurrency(t.actualAmount || t.amount || 0),
        t.status || t.type
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 7 }
    });

    doc.save("Bisdash_Master_Ledger.pdf");
  };

  const derivedInvestors = useMemo(() => {
    return baseInvestors.map(investor => {
      const myCustomers = customers.filter(c => c.moneyOwner === investor.name);
      const totalPrincipalEverLoaned = myCustomers.reduce((acc, c) => acc + c.principalAmount, 0);
      const totalInterestProfit = myCustomers.reduce((acc, c) => {
        const extensions = c.extensions || [];
        const totalExtensionInterest = extensions.reduce((sum, e) => sum + e.addedInterest, 0);
        const totalExtensionMonths = extensions.reduce((sum, e) => sum + e.addedMonths, 0);

        // Calculate Base Metrics (Original Loan without active extensions)
        const currentDuration = c.durationMonths;
        const initialDuration = Math.max(1, currentDuration - totalExtensionMonths);
        const baseCycles = initialDuration * 2;
        const baseTotalInterest = Math.max(0, c.totalInterest - totalExtensionInterest);
        const basePortionPerCycle = baseTotalInterest / baseCycles;

        // 1. Profit from Base Cycles (Realized via Payment)
        const realizedBaseProfit = c.payments.reduce((sum, p, index) => {
          // Ignore payments that belong to extension slots for *base* profit calculation
          // (Logic: Extension profit is booked separately below)
          if (index >= baseCycles) return sum;
          if (!p) return sum;

          if (p.status === PaymentStatus.PAID || p.status === PaymentStatus.ADVANCE || p.status === PaymentStatus.LATE) {
            return sum + basePortionPerCycle;
          }
          if (p.status === PaymentStatus.SHORT && p.expectedAmount > 0) {
            return sum + (basePortionPerCycle * (p.actualAmount / p.expectedAmount));
          }
          return sum;
        }, 0);

        // 2. Profit from Extensions (Recognized Immediately as Fee/Gain)
        // This satisfies the user requirement to see "Money Gained" update immediately on extension.
        return acc + realizedBaseProfit + totalExtensionInterest;
      }, 0);

      const totalCashEverReturned = myCustomers.reduce((acc, c) => {
        return acc + c.payments.reduce((sum, p) => sum + (p?.actualAmount || 0), 0);
      }, 0);

      const totalWithdrawn = investor.withdrawals ? investor.withdrawals.reduce((acc, w) => acc + w.amount, 0) : 0;
      const totalDeposited = investor.deposits ? investor.deposits.reduce((acc, d) => acc + d.amount, 0) : 0;

      const effectiveCapital = investor.initialCapital + totalDeposited;
      const available = effectiveCapital - totalPrincipalEverLoaned + totalCashEverReturned - totalWithdrawn;
      const roi = effectiveCapital > 0 ? (totalInterestProfit / effectiveCapital) * 100 : 0;

      return {
        ...investor,
        initialCapital: effectiveCapital, // We update 'initialCapital' to represent the TOTAL pool size
        totalInvested: totalPrincipalEverLoaned,
        totalGained: totalInterestProfit,
        availableCapital: Math.max(0, available),
        activeBatches: myCustomers.filter(c => !c.isCompleted).length,
        roi: Number(roi.toFixed(1))
      };
    });
  }, [customers, baseInvestors]);

  const liveStats = useMemo(() => {
    const totalCap = derivedInvestors.reduce((acc, inv) => acc + inv.initialCapital, 0);
    const totalGained = derivedInvestors.reduce((acc, inv) => acc + inv.totalGained, 0);
    const totalAvailable = derivedInvestors.reduce((acc, inv) => acc + inv.availableCapital, 0);
    const totalDeployed = derivedInvestors.reduce((acc, inv) => acc + inv.totalInvested, 0);

    return {
      totalManaged: totalCap,
      totalInterestGained: totalGained,
      totalAvailable: totalAvailable,
      totalDeployed: totalDeployed,
      activeATMs: customers.filter(c => !c.isCompleted).length,
      monthlyPerformance: businessStats.monthlyPerformance
    };
  }, [derivedInvestors, customers]);

  const allTransactions = useMemo(() => {
    const flattened = customers.flatMap(customer =>
      customer.payments.map(payment => ({
        ...payment,
        customerName: customer.name,
        customerId: customer.id,
        investorPool: customer.moneyOwner
      }))
    );
    return flattened.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customers]);

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === 'ALL') return allTransactions;
    return allTransactions.filter(t => t.status === transactionFilter);
  }, [allTransactions, transactionFilter]);

  const [verifyForm, setVerifyForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
    location: '',
    proofs: [] as File[],
    correctionReason: ''
  });

  const [newEntry, setNewEntry] = useState({
    name: '',
    principal: 10000,
    duration: 5,
    interestRate: 5,
    owner: initialInvestors[0].name,
    startDate: new Date().toISOString().split('T')[0]
  });

  const [newInvestor, setNewInvestor] = useState({
    name: '',
    initialCapital: 100000
  });

  const calculatedData = useMemo(() => {
    const monthlyInterest = newEntry.principal * (newEntry.interestRate / 100);
    const totalInterest = monthlyInterest * newEntry.duration;
    const totalPayable = newEntry.principal + totalInterest;
    const totalDeductions = newEntry.duration * 2;
    const biMonthlyDeduction = totalDeductions > 0 ? totalPayable / totalDeductions : 0;
    const firstDeadline = getPaymentDeadlines(newEntry.startDate, 1)[0];

    const selectedInv = derivedInvestors.find(inv => inv.name === newEntry.owner);
    const hasInsufficientFunds = selectedInv ? newEntry.principal > selectedInv.availableCapital : false;

    return { monthlyInterest, biMonthlyDeduction, totalPayable, firstDeadline, hasInsufficientFunds };
  }, [newEntry.principal, newEntry.duration, newEntry.interestRate, newEntry.startDate, newEntry.owner, derivedInvestors]);

  const handleTabChange = (tab: string) => {
    if (tab === 'login') {
      setIsAdmin(!isAdmin);
      return;
    }
    setCurrentTab(tab);
    setSelectedCustomer(null);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.name || calculatedData.hasInsufficientFunds) return;

    const newCust: Customer = {
      id: (customers.length + 1).toString(),
      name: newEntry.name,
      releaseDate: new Date().toISOString().split('T')[0],
      startDate: newEntry.startDate,
      principalAmount: newEntry.principal,
      interestRate: newEntry.interestRate / 100,
      durationMonths: newEntry.duration,
      moneyOwner: newEntry.owner,
      totalInterest: calculatedData.monthlyInterest * newEntry.duration,
      totalPayable: calculatedData.totalPayable,
      biMonthlyDeduction: calculatedData.biMonthlyDeduction,
      remainingBalance: calculatedData.totalPayable,
      payments: [],
      isCompleted: false
    };

    setCustomers([newCust, ...customers]);
    setIsAddingNew(false);

    setNewEntry({
      name: '',
      principal: 10000,
      duration: 5,
      interestRate: 5,
      owner: baseInvestors[0].name,
      startDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleExtendLoan = () => {
    if (!selectedCustomer) return;
    setExtensionMonths(1);
    setIsExtendModalOpen(true);
  };

  const confirmExtension = () => {
    if (!selectedCustomer) return;

    const extraMonths = Number(extensionMonths);
    if (isNaN(extraMonths) || extraMonths <= 0) {
      alert("Please enter a valid number of months.");
      return;
    }

    const monthlyInterest = selectedCustomer.principalAmount * selectedCustomer.interestRate;
    const addedInterest = monthlyInterest * extraMonths;

    const updatedCustomers = customers.map(c => {
      if (c.id === selectedCustomer.id) {
        const newTotalInterest = c.totalInterest + addedInterest;
        const newTotalPayable = c.totalPayable + addedInterest;
        const newDuration = c.durationMonths + extraMonths;
        const newRemaining = c.remainingBalance + addedInterest;

        return {
          ...c,
          durationMonths: newDuration,
          totalInterest: newTotalInterest,
          totalPayable: newTotalPayable,
          remainingBalance: newRemaining,
          extensions: [
            ...(c.extensions || []),
            { id: `ext-${Date.now()}`, date: new Date().toISOString(), addedMonths: extraMonths, addedInterest: addedInterest }
          ]
        };
      }
      return c;
    });

    setCustomers(updatedCustomers);
    const updatedSelected = updatedCustomers.find(c => c.id === selectedCustomer.id);
    if (updatedSelected) setSelectedCustomer(updatedSelected);
    setIsExtendModalOpen(false);
  };

  const handleCancelExtension = (extId: string) => {
    setCancellingExtensionId(extId);
  };

  const confirmCancelExtension = () => {
    if (!selectedCustomer || !cancellingExtensionId) return;

    // Find the extension to revert
    const extensionToRemove = selectedCustomer.extensions?.find(e => e.id === cancellingExtensionId);
    if (!extensionToRemove) return;

    const updatedCustomers = customers.map(c => {
      if (c.id === selectedCustomer.id) {
        // Revert values
        const newDuration = c.durationMonths - extensionToRemove.addedMonths;
        const newTotalInterest = c.totalInterest - extensionToRemove.addedInterest;
        const newTotalPayable = c.totalPayable - extensionToRemove.addedInterest;
        const newRemaining = Math.max(0, c.remainingBalance - extensionToRemove.addedInterest);

        // Remove from array
        const newExtensions = c.extensions?.filter(e => e.id !== cancellingExtensionId) || [];

        return {
          ...c,
          durationMonths: newDuration,
          totalInterest: newTotalInterest,
          totalPayable: newTotalPayable,
          remainingBalance: newRemaining,
          extensions: newExtensions
        };
      }
      return c;
    });

    setCustomers(updatedCustomers);
    const updatedSelected = updatedCustomers.find(c => c.id === selectedCustomer.id);
    if (updatedSelected) setSelectedCustomer(updatedSelected);
    setCancellingExtensionId(null);
  };

  const openVerifyModal = (slotIndex: number, currentPayment?: PaymentEntry) => {
    setVerifyingSlot(slotIndex);
    setVerifyForm({
      amount: currentPayment ? currentPayment.actualAmount : (selectedCustomer?.biMonthlyDeduction || 0),
      date: currentPayment ? currentPayment.date : new Date().toISOString().split('T')[0],
      time: currentPayment ? (currentPayment.verifiedAt?.split(' ')[1] || new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)) : new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
      location: currentPayment?.location || '',
      proofs: [],
      correctionReason: ''
    });
    setIsVerifying(true);
  };

  const handleConfirmVerification = () => {
    if (!selectedCustomer || verifyingSlot === null) return;
    if (verifyForm.proofs.length === 0) {
      alert("Please upload at least one proof photo.");
      return;
    }

    const deadlines = getPaymentDeadlines(selectedCustomer.startDate, selectedCustomer.durationMonths * 2);
    const targetDeadline = deadlines[verifyingSlot - 1];
    let status = PaymentStatus.PAID;

    if (verifyForm.amount < selectedCustomer.biMonthlyDeduction) {
      status = PaymentStatus.SHORT;
    } else {
      const collectionDate = new Date(verifyForm.date).getTime();
      const deadlineDate = new Date(targetDeadline).getTime();
      if (collectionDate < deadlineDate) status = PaymentStatus.ADVANCE;
      else if (collectionDate > deadlineDate) status = PaymentStatus.LATE;
    }

    const newPayment: PaymentEntry = {
      id: `pay-${Date.now()}`,
      date: verifyForm.date,
      expectedAmount: selectedCustomer.biMonthlyDeduction,
      actualAmount: verifyForm.amount,
      shortAmount: Math.max(0, selectedCustomer.biMonthlyDeduction - verifyForm.amount),
      additionalPayments: [],
      status: status,
      verifiedAt: `${verifyForm.date} ${verifyForm.time}`,
      location: verifyForm.location,
      proofImages: verifyForm.proofs.map(p => URL.createObjectURL(p)),
      proofImage: URL.createObjectURL(verifyForm.proofs[0]), // Backwards compat
      isLocked: true,
      correctionReason: verifyForm.correctionReason || undefined
    };

    const updatedCustomers = customers.map(c => {
      if (c.id === selectedCustomer.id) {
        const newPayments = [...c.payments];
        newPayments[verifyingSlot - 1] = newPayment;
        const totalPaid = newPayments.reduce((acc, p) => acc + (p?.actualAmount || 0), 0);
        const newBalance = c.totalPayable - totalPaid;
        return { ...c, payments: newPayments, remainingBalance: Math.max(0, newBalance) };
      }
      return c;
    });

    setCustomers(updatedCustomers);
    const updatedSelected = updatedCustomers.find(c => c.id === selectedCustomer.id);
    if (updatedSelected) setSelectedCustomer(updatedSelected);
    setIsVerifying(false);
    setIsUnlocking(false);
    setVerifyingSlot(null);
  };

  // --- Mark Fully Paid Logic ---
  const handleFullSettle = () => {
    if (!selectedCustomer) return;
    setIsSettlementModalOpen(true);
  };

  const handleFinalizeLoan = () => {
    if (!selectedCustomer) return;

    const updatedCustomers = customers.map(c => {
      if (c.id === selectedCustomer.id) {
        return { ...c, isCompleted: true };
      }
      return c;
    });

    setCustomers(updatedCustomers);
    setIsSettlementModalOpen(false);
    setSelectedCustomer(null); // Return to list view
  };

  const handleWithdrawFunds = (investor: Investor) => {
    setWithdrawingInvestor(investor);
    setWithdrawAmount('');
    setIsWithdrawModalOpen(true);
  };

  const confirmWithdrawal = () => {
    if (!withdrawingInvestor) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (amount > withdrawingInvestor.availableCapital) {
      alert(`Insufficient Funds: You can only withdraw up to ${formatCurrency(withdrawingInvestor.availableCapital)} from this pool.`);
      return;
    }

    // Logical Rule: No Total Withdraw if a money is loaned to someone
    if (withdrawingInvestor.activeBatches > 0 && amount >= withdrawingInvestor.availableCapital) {
      alert("⚠️ Operational Restriction: Total withdrawal is not permitted while there are active loan cycles. Please leave funds to cover ongoing borrowed capital.");
      return;
    }

    const newWithdrawal = {
      id: `wth-${Date.now()}`,
      date: new Date().toISOString(),
      amount: amount
    };

    const updatedInvestors = baseInvestors.map(inv => {
      if (inv.id === withdrawingInvestor.id) {
        return {
          ...inv,
          withdrawals: [...(inv.withdrawals || []), newWithdrawal]
        };
      }
      return inv;
    });

    setBaseInvestors(updatedInvestors);
    setIsWithdrawModalOpen(false);
    setWithdrawingInvestor(null);
  };

  const renderWithdrawModal = () => {
    if (!isWithdrawModalOpen || !withdrawingInvestor) return null;

    const currentVal = parseFloat(withdrawAmount) || 0;
    const isTotalWithdraw = withdrawingInvestor.activeBatches > 0 && currentVal >= withdrawingInvestor.availableCapital;

    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 italic">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsWithdrawModalOpen(false)}></div>
        <div className="relative bg-white rounded-[3.5rem] p-12 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col gap-10 border border-slate-100">

          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tight italic mb-1">Withdraw</h3>
              <p className="text-emerald-600 font-bold uppercase tracking-[0.2em] text-[10px] italic">From {withdrawingInvestor.name}'s Pool</p>
            </div>
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl shadow-inner border border-slate-100">💰</div>
          </div>

          <div className="space-y-8 italic">
            <div className="grid grid-cols-2 gap-4 italic font-black">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner italic">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 italic">Available</p>
                <p className="text-xl font-black text-slate-900 italic">{formatCurrency(withdrawingInvestor.availableCapital)}</p>
              </div>
              <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 italic">
                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-2 italic">Working Now</p>
                <p className="text-xl font-black text-blue-900 italic">{withdrawingInvestor.activeBatches} Loans</p>
              </div>
            </div>

            <div className="space-y-4 italic">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic ml-1 italic">Enter Amount (PHP)</label>
              <div className="relative italic">
                <input
                  required
                  type="number"
                  autoFocus
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className={`w-full px-10 py-8 rounded-[2.5rem] font-black text-4xl tabular-nums transition-all border-none focus:ring-4 italic ${isTotalWithdraw ? 'bg-rose-50 text-rose-600 focus:ring-rose-200' : 'bg-slate-50 text-slate-900 focus:ring-emerald-500/20'}`}
                  placeholder="0.00"
                />
                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl italic uppercase">PHP</span>
              </div>
              {isTotalWithdraw && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-center gap-3 italic animate-bounce">
                  <span className="text-rose-500 text-lg italic">⚠️</span>
                  <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest italic">Total Withdraw Blocked (Active Loans Found)</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 italic">
              <button
                onClick={confirmWithdrawal}
                disabled={isTotalWithdraw || currentVal <= 0}
                className={`w-full py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-all active:scale-95 italic ${isTotalWithdraw || currentVal <= 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-emerald-600 shadow-emerald-200'}`}
              >
                Release Capital
              </button>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="w-full py-5 bg-white text-slate-300 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] hover:text-slate-900 transition-colors italic"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDepositFunds = (investor: Investor) => {
    setDepositingInvestor(investor);
    setDepositAmount('');
    setIsDepositModalOpen(true);
  };

  const confirmDeposit = () => {
    if (!depositingInvestor) return;

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const newDeposit = {
      id: `dep-${Date.now()}`,
      date: new Date().toISOString(),
      amount: amount
    };

    const updatedInvestors = baseInvestors.map(inv => {
      if (inv.id === depositingInvestor.id) {
        return {
          ...inv,
          deposits: [...(inv.deposits || []), newDeposit]
        };
      }
      return inv;
    });

    setBaseInvestors(updatedInvestors);
    setIsDepositModalOpen(false);
    setDepositingInvestor(null);
  };

  const renderDepositModal = () => {
    if (!isDepositModalOpen || !depositingInvestor) return null;

    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 italic">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsDepositModalOpen(false)}></div>
        <div className="relative bg-white rounded-[3.5rem] p-12 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col gap-10 border border-slate-100">

          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tight italic mb-1">Add Funds</h3>
              <p className="text-emerald-600 font-bold uppercase tracking-[0.2em] text-[10px] italic">To {depositingInvestor.name}'s Pool</p>
            </div>
            <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-3xl shadow-inner border border-emerald-100">📥</div>
          </div>

          <div className="space-y-8 italic">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner italic">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 italic">Current Total Pool</p>
              <p className="text-2xl font-black text-slate-900 italic">{formatCurrency(depositingInvestor.initialCapital)}</p>
            </div>

            <div className="space-y-4 italic">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic ml-1 italic">Investment Amount (PHP)</label>
              <div className="relative italic">
                <input
                  required
                  type="number"
                  autoFocus
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-10 py-8 rounded-[2.5rem] bg-slate-50 border-none focus:ring-4 focus:ring-emerald-500/20 font-black text-4xl tabular-nums transition-all italic text-slate-900"
                  placeholder="0.00"
                />
                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl italic uppercase">PHP</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 italic">
              <button
                onClick={confirmDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                className={`w-full py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-all active:scale-95 italic ${!depositAmount || parseFloat(depositAmount) <= 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'}`}
              >
                Inject Capital
              </button>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="w-full py-5 bg-white text-slate-300 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] hover:text-slate-900 transition-colors italic"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleRequestUnlock = (slotIndex: number) => {
    setVerifyingSlot(slotIndex);
    setIsConfirmingEdit(true);
  };

  const handleVoidPayment = (slotIndex: number) => {
    setVerifyingSlot(slotIndex);
    setIsVoidModalOpen(true);
  };

  const confirmVoidPayment = () => {
    if (!selectedCustomer || verifyingSlot === null) return;

    const updatedCustomers = customers.map(c => {
      if (c.id === selectedCustomer.id) {
        const newPayments = [...c.payments];
        delete newPayments[verifyingSlot - 1]; // maintain index, create hole

        const totalPaid = newPayments.reduce((acc, p) => acc + (p?.actualAmount || 0), 0);
        const newBalance = c.totalPayable - totalPaid;

        // If balance is positive, it can't be completed
        const isCompleted = newBalance <= 5 ? c.isCompleted : false;

        return { ...c, payments: newPayments, remainingBalance: Math.max(0, newBalance), isCompleted };
      }
      return c;
    });

    setCustomers(updatedCustomers);
    const updatedSelected = updatedCustomers.find(c => c.id === selectedCustomer.id);
    if (updatedSelected) setSelectedCustomer(updatedSelected);

    setIsVoidModalOpen(false);
    setVerifyingSlot(null);
  };

  const proceedToEdit = () => {
    if (verifyingSlot === null || !selectedCustomer) return;
    setIsConfirmingEdit(false);
    setIsUnlocking(true);
    const currentPayment = selectedCustomer.payments[verifyingSlot - 1];
    openVerifyModal(verifyingSlot, currentPayment);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
  };

  const formatPDFCurrency = (val: number) => {
    return "P " + new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(val);
  };

  /**
   * Fix: Added missing handleCreateInvestor submit handler.
   */
  const handleCreateInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvestor.name) return;
    const inv: Investor = {
      id: `inv-${Date.now()}`,
      name: newInvestor.name,
      initialCapital: newInvestor.initialCapital,
      totalInvested: 0,
      totalGained: 0,
      availableCapital: newInvestor.initialCapital,
      activeBatches: 0,
      roi: 0,
      performanceHistory: [],
      withdrawals: []
    };
    setBaseInvestors([...baseInvestors, inv]);
    setIsAddingInvestor(false);
    setNewInvestor({ name: '', initialCapital: 100000 });
  };

  /**
   * Fix: Added missing renderNewInvestorModal helper function.
   */
  const renderNewInvestorModal = () => {
    if (!isAddingInvestor) return null;
    return (
      <div className="fixed inset-0 z-[100] flex justify-end italic">
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md italic" onClick={() => setIsAddingInvestor(false)}></div>
        <div className="w-full max-w-xl bg-white h-full shadow-2xl p-16 overflow-y-auto transform italic animate-in slide-in-from-right duration-500 italic">
          <div className="flex justify-between items-center mb-12 italic">
            <h3 className="text-4xl font-black text-slate-900 italic tracking-tight italic">New Investor Pool</h3>
            <button onClick={() => setIsAddingInvestor(false)} className="text-slate-300 hover:text-slate-900 transition-colors italic text-3xl italic">✕</button>
          </div>
          <form className="space-y-8 italic" onSubmit={handleCreateInvestor}>
            <div className="space-y-3 italic">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic ml-1 italic">Investor Name</label>
              <input required type="text" placeholder="e.g. Maria Clara" value={newInvestor.name} onChange={(e) => setNewInvestor({ ...newInvestor, name: e.target.value })} className="w-full px-8 py-6 bg-slate-50 border-none rounded-[1.8rem] font-bold text-lg italic focus:ring-2 focus:ring-emerald-500 transition-all italic" />
            </div>
            <div className="space-y-3 italic">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic ml-1 italic">Initial Capital (PHP)</label>
              <input required type="number" value={newInvestor.initialCapital} onChange={(e) => setNewInvestor({ ...newInvestor, initialCapital: Number(e.target.value) })} className="w-full px-8 py-6 bg-slate-50 border-none rounded-[1.8rem] font-black text-3xl italic focus:ring-2 focus:ring-emerald-500 transition-all italic" />
            </div>
            <button type="submit" className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl italic hover:bg-emerald-600 shadow-2xl transition-all active:scale-95 italic mt-8">Create Investor Pool</button>
          </form>
        </div>
      </div>
    );
  };

  /**
   * Fix: Added missing renderEditConfirmationNotifier helper function.
   */
  const renderEditConfirmationNotifier = () => {
    if (!isConfirmingEdit) return null;
    return (
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 italic">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md italic" onClick={() => setIsConfirmingEdit(false)}></div>
        <div className="relative bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl text-center italic border border-slate-100">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 italic">⚠️</div>
          <h3 className="text-3xl font-black text-slate-900 mb-4 italic">Unlock Entry?</h3>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed italic">This record is locked for integrity. Unlocking it for editing requires a reason and will be logged in the audit trail.</p>
          <div className="flex flex-col gap-4 italic">
            <button onClick={proceedToEdit} className="w-full py-5 bg-amber-500 text-white rounded-[1.8rem] font-black text-lg hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 italic">Yes, Unlock & Edit</button>
            <button onClick={() => setIsConfirmingEdit(false)} className="w-full py-5 bg-slate-50 text-slate-400 rounded-[1.8rem] font-black text-lg hover:bg-slate-100 transition-all italic">No, Keep Locked</button>
          </div>
        </div>
      </div>
    );
  };

  // --- Dashboard Tab ---
  const renderDashboard = () => {
    const loanDistributionData = derivedInvestors.map(inv => ({
      name: inv.name,
      value: inv.totalInvested
    }));

    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 italic pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 italic">
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight italic">Ecosystem Pulse</h2>
            <p className="text-slate-500 mt-2 text-lg font-medium italic">Consolidated Capital & Portfolio Overview</p>
          </div>
          <div className="flex gap-4 italic shrink-0">
            <div className="bg-emerald-50 px-6 py-4 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center italic">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic leading-none mb-1">Total Available Cash</p>
              <p className="text-2xl font-black text-emerald-700 italic tabular-nums">{formatCurrency(liveStats.totalAvailable)}</p>
            </div>
          </div>
        </div>

        {/* High-Level KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 italic">
          <StatCard label="Total Capital Managed" value={formatCurrency(liveStats.totalManaged)} icon="🏦" trend="up" subtext="Injected + Gains" />
          <StatCard label="Active Portfolio" value={formatCurrency(liveStats.totalDeployed)} icon="🏧" subtext="Capital out in loans" />
          <StatCard label="Total Gain Score" value={formatCurrency(liveStats.totalInterestGained)} icon="📈" trend="up" subtext="Historical Earnings" />
          <StatCard label="Active Borrowers" value={liveStats.activeATMs.toString()} icon="👤" subtext="Current loan accounts" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 italic">
          {/* Detailed Distribution */}
          <div className="xl:col-span-2 bg-white rounded-[3.5rem] border border-slate-100 shadow-sm p-10 flex flex-col gap-10 italic">
            <div className="flex justify-between items-start italic">
              <div className="italic">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">Portfolio Distribution</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mt-1">Loan deployment across investor pools</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-black text-slate-400 uppercase italic">Capital Velocity</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center italic">
              <div className="h-64 italic">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={loanDistributionData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={2} dataKey="value">
                      {loanDistributionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontWeight: '900', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4 italic">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic border-b border-slate-50 pb-2">Top Allocations</h4>
                {derivedInvestors.map((inv, idx) => {
                  const percentOfTotalLoans = liveStats.totalDeployed > 0 ? (inv.totalInvested / liveStats.totalDeployed) * 100 : 0;
                  return (
                    <div key={inv.id} className="flex flex-col gap-2 italic">
                      <div className="flex justify-between items-center italic">
                        <div className="flex items-center gap-3 italic">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="text-sm font-black text-slate-700 italic">{inv.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 italic">{percentOfTotalLoans.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden italic">
                        <div className="h-full bg-slate-900 rounded-full transition-all duration-1000" style={{ width: `${percentOfTotalLoans}%`, backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick List of Active Loans */}
          <div className="xl:col-span-1 bg-[#0f172a] text-white rounded-[3.5rem] p-10 shadow-2xl flex flex-col gap-8 italic">
            <div className="italic">
              <h3 className="text-xl font-black italic tracking-tight italic">Active Loans</h3>
              <p className="text-emerald-500 font-bold uppercase tracking-[0.2em] text-[10px] italic mt-1 italic">Real-time status</p>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[350px] custom-scrollbar pr-2 italic">
              {customers.filter(c => !c.isCompleted).length > 0 ? (
                customers.filter(c => !c.isCompleted).map(c => {
                  const progress = ((c.totalPayable - c.remainingBalance) / c.totalPayable) * 100;
                  return (
                    <div key={c.id} className="bg-white/5 border border-white/10 p-5 rounded-[2rem] hover:bg-white/10 transition-all cursor-pointer italic group" onClick={() => { setSelectedCustomer(c); setCurrentTab('customers'); }}>
                      <div className="flex justify-between items-start mb-2 italic">
                        <div>
                          <p className="font-black text-sm italic">{c.name}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase italic">Pool: {c.moneyOwner}</p>
                        </div>
                        <span className="text-[10px] font-black text-emerald-400 italic">{formatCurrency(c.principalAmount)}</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-3 italic">
                        <div className="h-full bg-emerald-500 rounded-full group-hover:bg-emerald-400 transition-all" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center italic">
                  <span className="text-4xl mb-4 italic opacity-20">📭</span>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest italic">Inventory Empty</p>
                </div>
              )}
            </div>

            <button onClick={() => setCurrentTab('customers')} className="w-full py-5 bg-white text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all italic mt-auto">Manage All Clients</button>
          </div>
        </div>
      </div>
    );
  };

  const renderSettlementModal = () => {
    if (!isSettlementModalOpen || !selectedCustomer) return null;

    const totalCycles = selectedCustomer.durationMonths * 2;
    const deadlines = getPaymentDeadlines(selectedCustomer.startDate, totalCycles);

    // Analyze Status
    let allPaid = true;
    let balanceZero = selectedCustomer.remainingBalance <= 5; // Allow tiny margin of error

    const auditLog = Array.from({ length: totalCycles }).map((_, i) => {
      const payment = selectedCustomer.payments[i];
      const isPaid = payment && (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.ADVANCE);
      if (!isPaid) allPaid = false;

      return {
        cycle: i + 1,
        deadline: deadlines[i],
        isPaid,
        amount: payment?.actualAmount || 0,
        status: payment?.status || 'UNPAID'
      };
    });

    const isReadyToSettle = allPaid && balanceZero;

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 italic">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm italic" onClick={() => setIsSettlementModalOpen(false)}></div>
        <div className="relative bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 italic flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center italic shrink-0">
            <div className="italic">
              <h3 className="text-2xl font-black italic tracking-tight">Final Settlement Review</h3>
              <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] italic mt-1">Audit Protocol for {selectedCustomer.name}</p>
            </div>
            <button onClick={() => setIsSettlementModalOpen(false)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl italic">✕</button>
          </div>

          {/* Body - Scrollable */}
          <div className="p-8 overflow-y-auto italic space-y-8">

            {/* Status Card */}
            <div className={`p-6 rounded-[2rem] border-2 italic ${isReadyToSettle ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <div className="flex items-center gap-4 italic">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl italic shadow-sm ${isReadyToSettle ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {isReadyToSettle ? '✓' : '!'}
                </div>
                <div className="italic">
                  <h4 className={`text-lg font-black italic ${isReadyToSettle ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {isReadyToSettle ? 'Ready for archiving' : 'Requirements not met'}
                  </h4>
                  <p className={`text-sm font-medium italic ${isReadyToSettle ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isReadyToSettle ? 'All cycles are clear. Zero balance confirmed.' : 'There are unpaid, short, or missing records.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-4 italic">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-2">Cycle Audit Log</h5>
              <div className="bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden italic">
                {auditLog.map((log) => (
                  <div key={log.cycle} className="flex justify-between items-center p-4 border-b border-slate-100 last:border-0 hover:bg-white transition-colors italic">
                    <div className="flex items-center gap-4 italic">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border italic ${log.isPaid ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {log.cycle}
                      </div>
                      <div className="italic">
                        <p className="font-bold text-slate-700 text-sm italic">{formatDate(log.deadline)}</p>
                      </div>
                    </div>
                    <div className="text-right italic">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic ${log.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="flex justify-between items-center px-4 italic">
              <div className="italic">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Remaining Balance</p>
                <p className="text-2xl font-black text-slate-900 italic">{formatCurrency(selectedCustomer.remainingBalance)}</p>
              </div>
              <div className="text-right italic">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Collection Rate</p>
                <p className="text-2xl font-black text-slate-900 italic">
                  {Math.round(((selectedCustomer.totalPayable - selectedCustomer.remainingBalance) / selectedCustomer.totalPayable) * 100)}%
                </p>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-8 border-t border-slate-100 bg-slate-50 italic shrink-0">
            <button
              onClick={handleFinalizeLoan}
              disabled={!isReadyToSettle}
              className={`w-full py-5 rounded-[2rem] font-black text-lg shadow-xl transition-all italic flex items-center justify-center gap-3 ${isReadyToSettle ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
            >
              {isReadyToSettle ? (
                <><span>✅</span> Confirm & Mark Fully Paid</>
              ) : (
                <><span>🚫</span> Cannot Settle - Resolve Issues First</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderVoidModal = () => {
    if (!isVoidModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 italic">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md italic" onClick={() => setIsVoidModalOpen(false)}></div>
        <div className="relative bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl text-center italic border border-rose-100">
          <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 italic shadow-xl shadow-rose-200">🗑️</div>
          <h3 className="text-3xl font-black text-slate-900 mb-4 italic">Void Payment?</h3>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed italic">
            Are you sure you want to cancel this payment record? This action will <span className="text-rose-600 font-black italic">revert the slot to UNPAID</span> and increase the remaining balance.
          </p>
          <div className="flex flex-col gap-4 italic">
            <button onClick={confirmVoidPayment} className="w-full py-5 bg-rose-600 text-white rounded-[1.8rem] font-black text-lg hover:bg-rose-700 transition-all shadow-xl shadow-rose-200/50 italic">Yes, Void Payment</button>
            <button onClick={() => setIsVoidModalOpen(false)} className="w-full py-5 bg-slate-50 text-slate-400 rounded-[1.8rem] font-black text-lg hover:bg-slate-100 transition-all italic">No, Keep It</button>
          </div>
        </div>
      </div>
    );
  };

  const renderExtendModal = () => {
    if (!isExtendModalOpen || !selectedCustomer) return null;

    const monthlyInterest = selectedCustomer.principalAmount * selectedCustomer.interestRate;
    const addedInterest = monthlyInterest * extensionMonths;
    const newTotal = selectedCustomer.totalPayable + addedInterest;

    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 italic">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md italic" onClick={() => setIsExtendModalOpen(false)}></div>
        <div className="relative bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl italic animate-in zoom-in-95 duration-300 flex flex-col gap-8">
          <div className="flex justify-between items-center italic">
            <h3 className="text-3xl font-black text-slate-900 italic tracking-tight">Extend Loan</h3>
            <div className="px-5 py-2.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest italic">Add Time</div>
          </div>

          <div className="space-y-8 italic">
            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 italic space-y-4 shadow-inner">
              <div className="italic text-center">
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest italic">Additional Months</label>
                <div className="flex items-center justify-center gap-8 mt-6 italic">
                  <button onClick={() => setExtensionMonths(Math.max(1, extensionMonths - 1))} className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl font-black hover:bg-slate-100 transition-colors italic shadow-sm active:scale-95">-</button>
                  <span className="text-5xl font-black text-slate-900 italic min-w-[3ch] text-center tabular-nums">{extensionMonths}</span>
                  <button onClick={() => setExtensionMonths(extensionMonths + 1)} className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl font-black hover:bg-slate-100 transition-colors italic shadow-sm active:scale-95">+</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 italic">
              <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 italic flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest italic mb-2">Added Interest</p>
                <p className="text-2xl font-black text-amber-700 italic tracking-tight">+{formatCurrency(addedInterest)}</p>
              </div>
              <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 italic flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest italic mb-2">New Total</p>
                <p className="text-2xl font-black text-blue-700 italic tracking-tight">{formatCurrency(newTotal)}</p>
              </div>
            </div>

            <p className="text-center text-slate-400 text-xs font-medium italic px-4">
              Based on <span className="text-slate-900 font-bold">{(selectedCustomer.interestRate * 100).toFixed(0)}% monthly interest</span> on {formatCurrency(selectedCustomer.principalAmount)} principal.
            </p>

            <div className="flex flex-col gap-4 italic pt-2">
              <button onClick={confirmExtension} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg hover:bg-emerald-600 shadow-xl transition-all italic active:scale-95">Confirm Extension</button>
              <button onClick={() => setIsExtendModalOpen(false)} className="w-full py-5 bg-white text-slate-400 border border-slate-200 rounded-[2rem] font-black text-lg hover:bg-slate-50 transition-all italic">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCancelExtensionModal = () => {
    if (!cancellingExtensionId || !selectedCustomer) return null;

    const extension = selectedCustomer.extensions?.find(e => e.id === cancellingExtensionId);
    if (!extension) return null;

    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 italic">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md italic" onClick={() => setCancellingExtensionId(null)}></div>
        <div className="relative bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl italic animate-in zoom-in-95 duration-300 flex flex-col gap-6 text-center border-4 border-rose-50">

          <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner text-rose-500">
            ⚠
          </div>

          <div className="italic">
            <h3 className="text-3xl font-black text-slate-900 italic tracking-tight mb-2">Cancel Extension?</h3>
            <p className="text-slate-500 font-medium italic mb-6">This will revert the added <span className="text-slate-900 font-bold">{extension.addedMonths} months</span> and <span className="text-slate-900 font-bold">{formatCurrency(extension.addedInterest)}</span> interest.</p>
          </div>

          <div className="space-y-3 italic">
            <button onClick={confirmCancelExtension} className="w-full py-5 bg-rose-500 text-white rounded-[2rem] font-black text-lg hover:bg-rose-600 shadow-xl shadow-rose-200 transition-all italic active:scale-95">Yes, Cancel It</button>
            <button onClick={() => setCancellingExtensionId(null)} className="w-full py-5 bg-white text-slate-400 border border-slate-200 rounded-[2rem] font-black text-lg hover:bg-slate-50 transition-all italic">No, Keep It</button>
          </div>
        </div>
      </div>
    );
  };

  // --- Investors Tab ---
  const renderInvestorsPage = () => {
    const pieData = derivedInvestors.map(inv => ({ name: inv.name, value: inv.initialCapital }));

    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 italic">
        <div className="flex justify-between items-center italic">
          <div className="italic">
            <h2 className="text-5xl font-black text-slate-900 tracking-tight italic">Investors</h2>
            <p className="text-slate-500 mt-2 text-lg font-medium italic text-emerald-600 animate-pulse font-bold uppercase tracking-widest text-[10px] italic">Track who provided the cash</p>
          </div>
          <button onClick={() => setIsAddingInvestor(true)} className="bg-emerald-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg hover:bg-emerald-700 shadow-2xl transition-all italic">+ Add Investor Pool</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 italic">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm col-span-1 italic self-start sticky top-12">
            <h3 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-widest italic">Money Source Pool</h3>
            <div className="h-64 flex items-center justify-center italic">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontStyle: 'italic', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-4 italic">
              {derivedInvestors.map((inv, idx) => (
                <div key={inv.id} className="flex justify-between items-center italic">
                  <div className="flex items-center gap-3 italic">
                    <div className="w-3 h-3 rounded-full italic" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="text-sm font-black text-slate-700 italic">{inv.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 italic">{liveStats.totalManaged > 0 ? Math.round((inv.initialCapital / liveStats.totalManaged) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-10 italic">
            {derivedInvestors.map((inv) => {
              const deployedPercent = Math.round((inv.totalInvested / inv.initialCapital) * 100) || 0;
              const myCustomersList = customers.filter(c => c.moneyOwner === inv.name);
              return (
                <div key={inv.id} className="bg-[#0f172a] text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col gap-10 group hover:scale-[1.01] transition-all duration-500 italic border border-white/5">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none italic"></div>
                  <div className="flex-1 space-y-8 italic">
                    <div className="flex items-center justify-between italic">
                      <div className="flex items-center gap-5 italic">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-4xl italic border border-emerald-500/20 shadow-lg shadow-emerald-500/5">👤</div>
                        <div className="italic">
                          <h4 className="text-4xl font-black italic tracking-tight">{inv.name}</h4>
                          <p className="text-emerald-400 font-bold tracking-[0.3em] uppercase text-[10px] italic">Investor Name</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 italic">
                        <button onClick={() => generateInvestorPDF(inv)} className="px-6 py-3 bg-white/10 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all italic shrink-0 flex items-center gap-2 italic">
                          <span>📥</span> Export PDF
                        </button>
                        <button onClick={() => handleDepositFunds(inv)} className="px-6 py-3 bg-white/10 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:border-emerald-600 transition-all italic shrink-0">Add Funds</button>
                        <button onClick={() => handleWithdrawFunds(inv)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:border-red-500 transition-all italic shrink-0">Withdraw Available</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 italic">
                      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 group-hover:bg-white/10 transition-colors italic">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Total Funding Pool</p>
                        <p className="text-xl font-black italic">{formatCurrency(inv.initialCapital)}</p>
                      </div>
                      <div className="bg-blue-500/10 p-6 rounded-[2rem] border border-blue-500/20 group-hover:bg-blue-500/15 transition-colors italic">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">Historical Principal Out</p>
                        <p className="text-xl font-black text-blue-100 italic">{formatCurrency(inv.totalInvested)}</p>
                      </div>
                      <div className="bg-emerald-500/10 p-6 rounded-[2rem] border border-emerald-500/20 group-hover:bg-emerald-500/15 transition-colors italic">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 italic">Total Accrued Interest</p>
                        <p className="text-xl font-black text-emerald-400 italic">+{formatCurrency(inv.totalGained)}</p>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/5 italic">
                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 italic">Borrowed Portfolio (Tracking Customers)</h5>
                      <div className="space-y-4 italic">
                        {myCustomersList.length > 0 ? myCustomersList.map(c => (
                          <div key={c.id} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0 italic">
                            <div className="italic">
                              <p className="font-black text-sm italic">{c.name}</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase italic">Principal: {formatCurrency(c.principalAmount)}</p>
                            </div>
                            <div className="text-right italic">
                              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic ${c.isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {c.isCompleted ? 'Fully Returned' : 'Active Flow'}
                              </span>
                              <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 italic">Interest Gain: {formatCurrency(c.totalInterest)}</p>
                            </div>
                          </div>
                        )) : (<p className="text-center py-4 text-slate-500 font-bold italic text-sm">No customers currently borrowing from this pool.</p>)}
                      </div>
                    </div>
                    <div className="p-10 bg-emerald-950/20 rounded-[3rem] border border-emerald-500/20 relative overflow-hidden italic shadow-inner">
                      <div className="flex justify-between items-end mb-6 italic">
                        <div className="italic">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic mb-2">Available Cash to Pull/Loan</p>
                          <p className="text-5xl font-black italic tracking-tighter text-emerald-50 shadow-sm">{formatCurrency(inv.availableCapital)}</p>
                        </div>
                        <div className="text-right italic">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic mb-2">Overall Growth</p>
                          <p className="text-2xl font-black text-emerald-400 italic">{inv.roi}%</p>
                        </div>
                      </div>
                      <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden italic">
                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-emerald-500/20" style={{ width: `${deployedPercent}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // --- Transactions Tab ---
  // --- Transactions Tab ---
  const renderTransactionsPage = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 italic h-full flex flex-col">
      <div className="italic shrink-0">
        <h2 className="text-5xl font-black text-slate-900 tracking-tight italic">Money Feed & Ledger</h2>
        <p className="text-slate-500 mt-2 text-lg font-medium italic">Complete ecosystem overview: Customers, Collections, Gains, and Capital.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-h-0 italic">

        {/* Partition 1: Active Loan Portfolio (Customer List) */}
        <div className="flex flex-col gap-4 italic h-full xl:col-span-1">
          <h3 className="text-sm font-black text-slate-400 italic uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span> Portfolio
          </h3>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex-1 overflow-hidden flex flex-col italic">
            <div className="p-6 border-b border-slate-50 italic">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Active Borrowers ({customers.length})</p>
            </div>
            <div className="overflow-auto flex-1 p-2 custom-scrollbar space-y-2">
              {customers.map(c => (
                <div key={c.id} className={`p-5 rounded-[2rem] transition-all cursor-default group border ${c.isCompleted ? 'bg-white border-emerald-100 shadow-emerald-50 shadow-lg' : 'hover:bg-slate-50 border-transparent hover:border-slate-100'}`}>
                  {c.isCompleted ? (
                    // Fully Settled UI
                    <div className="flex flex-col gap-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-100 to-transparent -mr-5 -mt-5 rounded-full blur-xl pointer-events-none"></div>
                      <div className="flex justify-between items-start z-10">
                        <div>
                          <p className="font-black text-slate-800 text-lg italic tracking-tight">{c.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Started {formatDate(c.startDate)}</p>
                        </div>
                        <button onClick={() => { setSelectedCustomer(c); setCurrentTab('customers'); }} className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[8px] font-black uppercase tracking-widest border border-slate-200 transition-colors">Open File</button>
                      </div>

                      <div className="flex items-center justify-between mt-1 z-10">
                        <div>
                          <p className="text-[12px] font-black text-emerald-600 italic">Fully Settled</p>
                          <div className="w-12 h-1 bg-emerald-500 rounded-full mt-1"></div>
                        </div>
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Done</span>
                      </div>

                      <div className="flex justify-between items-end mt-2 z-10 pt-3 border-t border-emerald-50/50">
                        <div>
                          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Capital Base</p>
                          <p className="text-sm font-black text-slate-700">{formatCurrency(c.principalAmount)}</p>
                        </div>
                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest text-right">{c.moneyOwner}</p>
                      </div>
                    </div>
                  ) : (
                    // Active Loan UI
                    <>
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-black text-slate-900 text-sm truncate">{c.name}</p>
                        <span className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase bg-blue-50 text-blue-600">Active</span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase truncate">Pool: {c.moneyOwner}</p>
                      <div className="mt-3 flex justify-between items-end">
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Principal</p>
                          <p className="text-xs font-black text-slate-700">{formatCurrency(c.principalAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Balance</p>
                          <p className="text-xs font-black text-rose-500">{formatCurrency(c.remainingBalance)}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {customers.length === 0 && <p className="text-center py-10 text-slate-300 text-xs font-bold italic">No active portfolio.</p>}
            </div>
          </div>
        </div>

        {/* Partition 2: Customer Collections (Money Feed) */}
        <div className="flex flex-col gap-4 italic h-full xl:col-span-1">
          <h3 className="text-sm font-black text-emerald-500 italic uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Collections
          </h3>
          <div className="bg-white rounded-[2.5rem] border border-emerald-100/50 shadow-sm flex-1 overflow-hidden flex flex-col italic relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-200"></div>
            <div className="p-4 border-b border-slate-50 flex overflow-x-auto italic shrink-0 no-scrollbar">
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 italic gap-1">
                {['ALL', 'PAID', 'SHORT'].map(f => (
                  <button key={f} onClick={() => setTransactionFilter(f as any)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all italic whitespace-nowrap ${transactionFilter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{f}</button>
                ))}
              </div>
            </div>
            <div className="overflow-auto flex-1 italic custom-scrollbar">
              <div className="divide-y divide-slate-50">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="p-5 hover:bg-emerald-50/30 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{tx.customerName}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{formatDate(tx.date)}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${tx.status === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{tx.status}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-black text-slate-800 tracking-tighter">{formatCurrency(tx.actualAmount)}</p>
                      {tx.proofImages && tx.proofImages.length > 0 && (
                        <div className="flex -space-x-2">
                          {tx.proofImages.slice(0, 3).map((img, i) => (
                            <div key={i} className="w-6 h-6 rounded-full border border-white bg-slate-100 overflow-hidden relative z-10">
                              <img src={img} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredTransactions.length === 0 && <p className="text-center py-10 text-slate-300 text-xs font-bold italic">No collections found.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Partition 3: Investor Growth (Money Gain) - NEW */}
        <div className="flex flex-col gap-4 italic h-full xl:col-span-1">
          <h3 className="text-sm font-black text-blue-500 italic uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Gains
          </h3>
          <div className="bg-white rounded-[2.5rem] border border-blue-100/50 shadow-sm flex-1 overflow-hidden flex flex-col italic relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-400"></div>
            <div className="p-6 border-b border-slate-50 italic">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Profit Generated</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{formatCurrency(derivedInvestors.reduce((acc, inv) => acc + inv.totalGained, 0))}</p>
            </div>
            <div className="overflow-auto flex-1 p-2 custom-scrollbar space-y-2">
              {derivedInvestors.map(inv => (
                <div key={inv.id} className="p-4 rounded-3xl bg-slate-50/50 border border-slate-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-black text-slate-700 text-xs">{inv.name}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Pool: {formatCurrency(inv.initialCapital)}</p>
                    </div>
                    <span className="text-[9px] font-black text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">+{inv.roi}% ROI</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center mb-3">
                    <div className="bg-white p-2 rounded-2xl">
                      <p className="text-[7px] font-bold text-slate-400 uppercase">Deployed</p>
                      <p className="text-[10px] font-black text-slate-800">{formatCurrency(inv.totalInvested)}</p>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-2xl">
                      <p className="text-[7px] font-bold text-emerald-600 uppercase">Profit</p>
                      <p className="text-[10px] font-black text-emerald-600">+{formatCurrency(inv.totalGained)}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-3 flex justify-between items-center text-white">
                    <div>
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Current Fund</p>
                      <p className="text-xs font-black">{formatCurrency(inv.availableCapital)}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m0 0l-4-4m4 4l4-4" /></svg>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Partition 4: Investor Ledger (Capital Flow) */}
        <div className="flex flex-col gap-4 italic h-full xl:col-span-1">
          <h3 className="text-sm font-black text-amber-500 italic uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Ledger
          </h3>
          <div className="bg-white rounded-[2.5rem] border border-amber-100/50 shadow-sm flex-1 overflow-hidden flex flex-col italic relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-rose-400"></div>
            <div className="p-6 border-b border-slate-50 italic">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Capital Flow (In/Out)</p>
            </div>
            <div className="overflow-auto flex-1 italic custom-scrollbar">
              <div className="divide-y divide-slate-50">
                {[
                  ...customers.map(c => ({
                    id: c.id,
                    date: new Date(c.startDate).getTime(),
                    type: 'DISBURSAL',
                    amount: c.principalAmount,
                    label: `Loan to ${c.name}`,
                    pool: c.moneyOwner
                  })),
                  ...baseInvestors.map(inv => {
                    let date = Date.now();
                    if (inv.id === 'inv1') date = new Date('2025-01-01').getTime();
                    else if (inv.id === 'inv2') date = new Date('2025-02-15').getTime();
                    else {
                      const parsed = parseInt(inv.id.split('-')[1]);
                      if (!isNaN(parsed) && parsed > 1600000000000) date = parsed;
                    }

                    return {
                      id: inv.id,
                      date: date,
                      type: 'INJECTION',
                      amount: inv.initialCapital,
                      label: `Initial Capital: ${inv.name}`,
                      pool: inv.name
                    };
                  }),
                  ...baseInvestors.flatMap(inv => (inv.withdrawals || []).map(w => ({
                    id: w.id,
                    date: new Date(w.date).getTime(),
                    type: 'WITHDRAWAL',
                    amount: w.amount,
                    label: `Capital Withdrawal`,
                    pool: inv.name
                  }))),
                  ...baseInvestors.flatMap(inv => (inv.deposits || []).map(d => ({
                    id: d.id,
                    date: new Date(d.date).getTime(),
                    type: 'INJECTION',
                    amount: d.amount,
                    label: `Capital Top-up`,
                    pool: inv.name
                  }))),
                  ...customers.flatMap(c => (c.extensions || []).map(ext => ({
                    id: ext.id,
                    date: new Date(ext.date).getTime(),
                    type: 'EXTENSION',
                    amount: ext.addedInterest,
                    label: `Extended ${c.name} (+${ext.addedMonths}mo)`,
                    pool: c.moneyOwner
                  })))
                ]
                  .sort((a, b) => b.date - a.date)
                  .map((entry) => (
                    <div key={entry.id} className={`p-5 transition-colors ${entry.type === 'INJECTION' ? 'hover:bg-emerald-50/30' : entry.type === 'WITHDRAWAL' ? 'hover:bg-indigo-50/30' : entry.type === 'EXTENSION' ? 'hover:bg-blue-50/30' : 'hover:bg-amber-50/30'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{formatDate(new Date(entry.date).toISOString())}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${entry.type === 'INJECTION' ? 'bg-emerald-100 text-emerald-700' : entry.type === 'WITHDRAWAL' ? 'bg-indigo-100 text-indigo-700' : entry.type === 'EXTENSION' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {entry.type === 'INJECTION' ? 'CAPITAL IN' : entry.type === 'WITHDRAWAL' ? 'WITHDRAWAL' : entry.type === 'EXTENSION' ? 'LOAN EXTENDED' : 'LOAN OUT'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{entry.label}</p>
                          <p className="text-[8px] font-medium text-slate-400 uppercase truncate max-w-[100px]">Pool: {entry.pool}</p>
                        </div>
                        <p className={`text-base font-black tracking-tighter ${entry.type === 'INJECTION' ? 'text-emerald-500' : entry.type === 'WITHDRAWAL' ? 'text-indigo-500' : entry.type === 'EXTENSION' ? 'text-blue-500' : 'text-rose-500'}`}>
                          {entry.type === 'INJECTION' || entry.type === 'EXTENSION' ? '+' : '-'}{formatCurrency(entry.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                {(customers.length === 0 && baseInvestors.length === 0) && <p className="text-center py-10 text-slate-300 text-xs font-bold italic">No ledger activity.</p>}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  const renderAnalyticsPage = () => {
    const totalPrincipal = customers.reduce((acc, c) => acc + c.principalAmount, 0);
    const totalReturned = customers.reduce((acc, c) => acc + (c.totalPayable - c.remainingBalance), 0);
    const averageLoan = customers.length > 0 ? totalPrincipal / customers.length : 0;

    const monthlyProfits: { [key: string]: number } = {};
    derivedInvestors.forEach(inv => {
      inv.performanceHistory.forEach(h => {
        monthlyProfits[h.month] = (monthlyProfits[h.month] || 0) + h.profit;
      });
    });

    const historicalData = Object.entries(monthlyProfits)
      .map(([month, profit]) => ({ month, profit }))
      .sort((a, b) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(a.month) - months.indexOf(b.month);
      });

    const investorPerformance = derivedInvestors.map(inv => ({
      name: inv.name,
      roi: inv.roi,
      profit: inv.totalGained
    }));

    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 italic">
        <div className="flex justify-between items-end italic">
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight italic">Analytics</h2>
            <p className="text-slate-500 mt-2 text-lg font-medium italic">See how your money is growing and how well it's working.</p>
          </div>
          <div className="flex gap-4 items-center italic shrink-0">
            <button
              onClick={generateFullAdminPDF}
              className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center gap-3 italic"
            >
              <span>📊</span> System Audit Report (PDF)
            </button>
            <div className="bg-blue-50 px-6 py-4 rounded-2xl border border-blue-100 italic">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic mb-1">Money Health Score</p>
              <p className="text-2xl font-black text-blue-700 italic">Excellent</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 italic">
          <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm italic">
            <div className="flex justify-between items-center mb-10 italic">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest italic">Total Savings Growth</h3>
              <select className="bg-slate-50 border-none rounded-xl text-xs font-bold px-4 py-2 italic text-slate-900">
                <option>Last 6 Months</option>
                <option>Last Year</option>
              </select>
            </div>
            <div className="h-80 italic">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontWeight: '900' }}
                    formatter={(value: number) => [formatCurrency(value), 'Earnings']}
                  />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6 italic">
            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl italic relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 italic">Average Money Lent</p>
              <h4 className="text-3xl font-black italic tracking-tight">{formatCurrency(averageLoan)}</h4>
              <p className="text-slate-400 text-[10px] mt-4 font-bold italic">From {customers.length} people</p>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm italic">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Money Coming Back</p>
              <div className="flex justify-between items-end mb-4 italic">
                <h4 className="text-3xl font-black text-slate-900 italic tracking-tight">{Math.round((totalReturned / totalPrincipal) * 100) || 0}%</h4>
                <p className="text-emerald-600 font-black text-xs italic">Doing Great!</p>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden italic">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((totalReturned / totalPrincipal) * 100) || 0}%` }}></div>
              </div>
            </div>

            <div className="bg-emerald-600 text-white p-8 rounded-[3rem] shadow-xl italic">
              <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-2 italic">Overall Grade</p>
              <div className="flex items-center gap-4 italic">
                <span className="text-4xl italic">⭐</span>
                <div className="italic">
                  <h4 className="text-3xl font-black italic tracking-tight">Excellent</h4>
                  <p className="text-emerald-100/60 text-[10px] font-bold italic">Top notch performance</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 italic">
          {/* Investor Distribution Pie */}
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm italic flex flex-col">
            <h3 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-widest italic">Who Gave the Money?</h3>
            <div className="h-64 italic relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={derivedInvestors.map(inv => ({ name: inv.name, value: inv.initialCapital }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {derivedInvestors.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontWeight: '900' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Capital</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 italic text-center">
              {derivedInvestors.map((inv, idx) => (
                <div key={inv.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1 italic" style={{ color: COLORS[idx % COLORS.length] }}>{inv.name}</p>
                  <p className="font-black text-slate-900">{((inv.initialCapital / liveStats.totalManaged) * 100).toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Available vs Invested Pie */}
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm italic flex flex-col">
            <h3 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-widest italic">How Money is Used</h3>
            <div className="h-64 italic relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Available Cash', value: liveStats.totalAvailable },
                      { name: 'Invested Capital', value: liveStats.totalDeployed }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" /> {/* Available */}
                    <Cell fill="#3b82f6" /> {/* Invested */}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontWeight: '900' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Status</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 italic">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 italic flex justify-between items-center">
                <div className="italic">
                  <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest italic">Ready to Use</p>
                  <p className="font-black text-emerald-700 italic">{((liveStats.totalAvailable / liveStats.totalManaged) * 100).toFixed(1)}%</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 italic flex justify-between items-center">
                <div className="italic">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic">Working Loans</p>
                  <p className="font-black text-blue-700 italic">{((liveStats.totalDeployed / liveStats.totalManaged) * 100).toFixed(1)}%</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 italic">
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm italic">
            <h3 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-widest italic">Who Made the Most Growth?</h3>
            <div className="space-y-6 italic">
              {investorPerformance.map((inv, idx) => (
                <div key={inv.name} className="space-y-2 italic">
                  <div className="flex justify-between items-center italic">
                    <span className="font-black text-slate-700 italic">{inv.name}</span>
                    <span className="text-emerald-600 font-black italic">{inv.roi}% Growth</span>
                  </div>
                  <div className="h-4 bg-slate-50 rounded-full overflow-hidden italic border border-slate-100">
                    <div
                      className="h-full transition-all duration-1000"
                      style={{
                        width: `${(inv.roi / Math.max(...investorPerformance.map(i => i.roi), 1)) * 100}%`,
                        backgroundColor: COLORS[idx % COLORS.length]
                      }}
                    ></div>
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase italic">Total Extra Money: {formatCurrency(inv.profit)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0f172a] text-white p-10 rounded-[3.5rem] shadow-2xl italic relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
            <h3 className="text-xl font-black italic tracking-tight mb-8 italic">Smart Money Logic</h3>
            <div className="grid grid-cols-2 gap-6 italic">
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 italic">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Money at Risk</p>
                <div className="flex items-center gap-2 italic">
                  <span className="text-2xl font-black italic text-emerald-400">NONE</span>
                  <span className="text-[8px] font-bold text-slate-500 italic">SAFE</span>
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 italic">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Cash Speed</p>
                <div className="flex items-center gap-2 italic">
                  <span className="text-2xl font-black italic text-blue-400">FAST</span>
                  <span className="text-[8px] font-bold text-slate-500 italic">GOOD</span>
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 italic">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Re-investment Potential</p>
                <div className="flex items-center gap-2 italic">
                  <span className="text-2xl font-black italic text-amber-400">HIGH</span>
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 italic">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Room to Expand</p>
                <div className="flex items-center gap-2 italic">
                  <span className="text-2xl font-black italic text-rose-400">LOTS</span>
                </div>
              </div>
            </div>
            <div className="mt-8 bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] italic">
              <p className="text-xs font-black text-emerald-400 italic mb-2 ✨ SMART TIP">Ready to Send Out More Money!</p>
              <p className="text-[10px] text-slate-400 leading-relaxed italic">The money is coming back fast! We can send out 25% more money to customers safely.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Customer Details Tab ---
  const renderCustomerDetails = (customer: Customer) => {
    const totalCycles = customer.durationMonths * 2;
    const deadlines = getPaymentDeadlines(customer.startDate, totalCycles);
    const slots = Array.from({ length: totalCycles }).map((_, i) => ({ slotIndex: i + 1, payment: customer.payments[i] || null, deadline: deadlines[i] }));
    const totalPaidCalculated = customer.payments.reduce((acc, p) => acc + (p?.actualAmount || 0), 0);
    const progressPercent = Math.min(100, Math.round((totalPaidCalculated / customer.totalPayable) * 100));
    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - totalPaidCalculated / customer.totalPayable);

    return (
      <div className="space-y-10 animate-in fade-in zoom-in-98 duration-500 italic">
        <div className="flex items-center justify-between gap-6 italic">
          <div className="flex items-center gap-6 italic">
            <button onClick={() => setSelectedCustomer(null)} className="p-4 bg-white border border-slate-200 rounded-[1.5rem] font-black text-xl italic hover:bg-slate-50 transition-all shadow-sm italic">←</button>
            <div className="italic">
              <h2 className="text-5xl font-black text-slate-900 tracking-tight italic">{customer.name}</h2>
              <div className="flex items-center gap-4 mt-2 italic">
                <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px] italic">Source: {customer.moneyOwner}</p>
                <span className="text-slate-300 italic text-xs">•</span>
                <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest italic">Started: {formatDate(customer.startDate)}</p>
                <span className="text-slate-300 italic text-xs">•</span>
                <p className="text-blue-600 font-bold text-[10px] uppercase tracking-widest italic">Matures: {formatDate(deadlines[deadlines.length - 1])}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 italic">
            <div className="flex gap-3 italic">
              <button
                onClick={() => generateCustomerPDF(customer)}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-3 italic"
              >
                <span>📄</span> Download Statement (PDF)
              </button>
              {!customer.isCompleted && (
                <button onClick={handleExtendLoan} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-amber-50 hover:border-amber-200 transition-all shadow-sm italic flex items-center gap-3 italic">
                  <span className="text-lg italic">🕒</span> Extend Loan
                </button>
              )}
            </div>

            {/* Extensions List */}
            {customer.extensions && customer.extensions.length > 0 && (
              <div className="bg-white p-4 rounded-3xl border border-blue-100 shadow-lg shadow-blue-50/50 flex flex-col gap-2 w-64 animate-in fade-in slide-in-from-top-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">Active Extensions</p>
                {customer.extensions.map(ext => (
                  <div key={ext.id} className="flex justify-between items-center bg-blue-50/50 p-2 rounded-2xl border border-blue-100 group">
                    <div className="pl-2">
                      <p className="text-[10px] font-black text-slate-700">+{ext.addedMonths} Month{ext.addedMonths > 1 ? 's' : ''}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{formatDate(ext.date)}</p>
                    </div>
                    {!customer.isCompleted && (
                      <button
                        onClick={() => handleCancelExtension(ext.id)}
                        className="bg-white text-rose-500 hover:bg-rose-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest hover:border-rose-200 transition-colors shadow-sm">
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 italic">
          <div className="lg:col-span-3 space-y-10 italic">
            <div className="space-y-6 italic">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight italic flex items-center gap-3 italic">Payment Pulse <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] rounded-full italic font-black uppercase tracking-widest">15th & 30th Schedule</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 italic">
                {slots.map((slot) => {
                  const sColor = slot.payment ? (slot.payment.status === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700' : slot.payment.status === PaymentStatus.ADVANCE ? 'bg-emerald-600 text-white' : 'bg-rose-100 text-rose-700') : 'bg-slate-100 text-slate-500';
                  return (
                    <div key={slot.slotIndex} className={`relative p-6 rounded-[2.5rem] border transition-all flex flex-col justify-between italic bg-white border-slate-100 shadow-sm italic`}>
                      <div className="italic"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic ${sColor}`}>{slot.payment?.status || `Cycle ${slot.slotIndex}`}</span><p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-tighter italic">Deadline: <span className="text-slate-900 italic">{formatDate(slot.deadline)}</span></p></div>
                      {slot.payment ? (<div className="space-y-1 italic"><p className="text-2xl font-black text-slate-900 tracking-tighter italic">{formatCurrency(slot.payment.actualAmount)}</p><p className="text-[10px] font-bold text-slate-400 uppercase italic">Paid on {formatDate(slot.payment.date)}</p></div>) : (<div className="space-y-1 italic"><p className="text-2xl font-black text-slate-300 italic">{formatCurrency(customer.biMonthlyDeduction)}</p><p className="text-[10px] font-bold text-slate-300 uppercase italic">Next Milestone</p></div>)}
                      {slot.payment?.isLocked ? (
                        <div className="flex gap-2 w-full">
                          <button onClick={() => handleRequestUnlock(slot.slotIndex)} className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors italic">Edit</button>
                          <button onClick={() => handleVoidPayment(slot.slotIndex)} className="px-5 py-3.5 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-colors italic">Cancel</button>
                        </div>
                      ) : (<button onClick={() => openVerifyModal(slot.slotIndex)} className="flex-1 py-4 bg-[#10b981] text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-200/50 hover:bg-emerald-600 transition-all italic">Record Payment</button>)}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 italic">
              <StatCard label="Total Contract" value={formatCurrency(customer.totalPayable)} icon="📜" subtext={`Incl. ${(customer.interestRate * 100).toFixed(0)}% Interest`} />
              <StatCard label="Loan Amount" value={formatCurrency(customer.principalAmount)} icon="💰" subtext="Capital Deployed" />
              <StatCard label="Running Collections" value={formatCurrency(totalPaidCalculated)} icon="📈" trend="up" subtext="Net Profit Flow" />
            </div>
          </div>
          <div className="space-y-8 italic">
            <div className="bg-[#0f172a] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden text-center flex flex-col justify-between italic h-[400px]">
              <h3 className="text-2xl font-black tracking-tight italic uppercase tracking-[0.2em] pt-4 italic">Repayment Pulse</h3>
              <div className="relative w-48 h-48 mx-auto flex items-center justify-center italic">
                <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90 italic">
                  <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800 italic" />
                  <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" className="text-emerald-500 italic transition-all duration-1000 ease-out" />
                </svg>
                <span className="absolute text-5xl font-black italic tracking-tighter italic">{progressPercent}%</span>
              </div>
              <div className="pb-4 space-y-4 italic">
                <div className="text-center italic"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Left to Collect</p><p className="text-2xl font-black italic">{formatCurrency(customer.remainingBalance)}</p></div>
                {!customer.isCompleted ? (
                  <button onClick={handleFullSettle} className="w-full py-5 bg-emerald-600 rounded-[2rem] font-black text-lg hover:bg-emerald-700 shadow-[0_12px_40_rgba(16,185,129,0.5)] transition-all italic">Mark Fully Paid</button>
                ) : (
                  <div className="w-full py-5 bg-emerald-500/10 border border-emerald-500/30 rounded-[2rem] text-emerald-400 font-black text-lg italic uppercase tracking-widest flex items-center justify-center gap-2 italic animate-in zoom-in-95"><span>✅</span> Loan Completed</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (showLanding) return <LandingPage onContinue={() => setShowLanding(false)} />;

  return (
    <div className="min-h-screen flex bg-slate-50 italic font-sans italic">
      <Sidebar currentTab={currentTab} onTabChange={handleTabChange} isAdmin={isAdmin} />
      <main className="flex-1 ml-64 p-12 overflow-y-auto relative italic">
        <header className="flex justify-between items-center mb-16 relative z-10 italic">
          <div className="flex items-center gap-8 italic"><div className="bg-white p-2.5 rounded-[1.8rem] border border-slate-100 shadow-xl transform rotate-[-2deg] italic"><BisdashLogo className="w-12 h-12 italic" /></div><div className="flex items-center gap-5 bg-white px-8 py-4 rounded-[1.8rem] border border-slate-100 shadow-sm font-black uppercase text-slate-700 tracking-widest italic">📅 {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</div></div>
          <div className="flex items-center gap-6 bg-white pl-8 pr-4 py-3 rounded-[2rem] border border-slate-100 shadow-sm italic"><div className="text-right italic"><p className="text-base font-black text-slate-900 leading-none mb-1 italic">Admin Account</p><p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest leading-none italic">Status: Online</p></div><div className="w-14 h-14 rounded-2xl bg-slate-100 border-4 border-slate-50 shadow-md overflow-hidden italic"><img src={`https://i.pravatar.cc/150?u=admin`} alt="avatar" className="w-full h-full object-cover italic" /></div></div>
        </header>

        {selectedCustomer ? renderCustomerDetails(selectedCustomer) : (
          <div className="space-y-10 italic">
            {currentTab === 'overview' && renderDashboard()}
            {currentTab === 'customers' && (
              <div className="space-y-10 animate-in fade-in duration-500 italic">
                <div className="flex justify-between items-center italic"><div className="italic"><h2 className="text-5xl font-black text-slate-900 tracking-tight italic">Customers</h2><p className="text-slate-500 mt-2 text-lg font-medium italic">Monitor active and completed borrowing cycles.</p></div><button onClick={() => setIsAddingNew(true)} className="bg-slate-900 text-white px-10 py-5 rounded-[2.2rem] font-black text-lg hover:bg-emerald-600 shadow-2xl transition-all active:scale-95 italic">+ New Customer Loan</button></div>
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden italic">
                  <table className="w-full text-left border-collapse italic">
                    <thead><tr className="bg-slate-50/50 italic font-black uppercase text-[10px] tracking-widest text-slate-400 italic"><th className="px-10 py-8 italic">Customer Name</th><th className="px-10 py-8 italic">Loan Amount</th><th className="px-10 py-8 italic">Status</th><th className="px-10 py-8 italic">Progress</th><th className="px-10 py-8 italic">Investor Pool</th><th className="px-10 py-8 italic"></th></tr></thead>
                    <tbody className="divide-y divide-slate-100 italic">
                      {customers.map((customer) => (
                        <tr key={customer.id} className={`hover:bg-slate-50/80 transition-all group italic ${customer.isCompleted ? 'bg-emerald-50/20' : ''}`}>
                          <td className="px-10 py-10 italic"><p className={`font-black text-xl italic ${customer.isCompleted ? 'text-slate-400' : 'text-slate-900'}`}>{customer.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Started {formatDate(customer.startDate)}</p></td>
                          <td className="px-10 py-10 italic"><p className={`font-black text-xl tracking-tighter italic ${customer.isCompleted ? 'text-emerald-700' : 'text-blue-600'}`}>{formatCurrency(customer.principalAmount)}</p><p className="text-[10px] font-bold text-slate-400 uppercase italic">Capital Base</p></td>
                          <td className="px-10 py-10 italic">{customer.isCompleted ? (<div className="flex items-center gap-2 italic"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse italic"></span><span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest italic shadow-sm">DONE</span></div>) : (<div className="flex items-center gap-2 italic"><span className="w-2 h-2 rounded-full bg-blue-500 italic"></span><span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest italic shadow-sm">ACTIVE</span></div>)}</td>
                          <td className="px-10 py-10 italic"><div className="flex flex-col gap-2 italic"><p className={`font-black text-lg tracking-tighter italic ${customer.isCompleted ? 'text-emerald-600' : 'text-slate-900'}`}>{customer.isCompleted ? 'Fully Settled' : `${formatCurrency(customer.remainingBalance)} Left`}</p><div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden italic"><div className={`h-full transition-all duration-700 ${customer.isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.round(((customer.totalPayable - customer.remainingBalance) / customer.totalPayable) * 100)}%` }}></div></div></div></td>
                          <td className="px-10 py-10 italic"><span className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm italic ${customer.isCompleted ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{customer.moneyOwner}</span></td>
                          <td className="px-10 py-10 text-right italic"><button onClick={() => setSelectedCustomer(customer)} className="bg-slate-100 text-slate-700 px-8 py-4 rounded-2xl font-black hover:bg-[#0f172a] hover:text-white transition-all shadow-sm italic text-xs uppercase tracking-widest italic">Open File</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {currentTab === 'investors' && renderInvestorsPage()}
            {currentTab === 'transactions' && renderTransactionsPage()}
            {currentTab === 'analytics' && renderAnalyticsPage()}
          </div>
        )}
        {renderNewInvestorModal()}
        {renderEditConfirmationNotifier()}
        {renderSettlementModal()}
        {renderVoidModal()}
        {renderExtendModal()}
        {renderCancelExtensionModal()}
        {renderWithdrawModal()}

        {/* --- Adding New Customer Loan --- */}
        {isAddingNew && (
          <div className="fixed inset-0 z-[100] flex justify-end italic">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md italic" onClick={() => setIsAddingNew(false)}></div>
            <div className="w-full max-w-xl bg-white h-full shadow-2xl p-16 overflow-y-auto transform italic animate-in slide-in-from-right duration-500 italic">
              <div className="flex justify-between items-center mb-12 italic"><h3 className="text-4xl font-black text-slate-900 italic tracking-tight italic">New Customer Loan</h3><button onClick={() => setIsAddingNew(false)} className="text-slate-300 hover:text-slate-900 transition-colors italic text-3xl italic">✕</button></div>
              <form className="space-y-8 italic" onSubmit={handleCreateAccount}>
                <div className="space-y-3 italic"><label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic ml-1 italic">Pick Money Source</label><select value={newEntry.owner} onChange={(e) => setNewEntry({ ...newEntry, owner: e.target.value })} className="w-full px-8 py-6 bg-slate-50 border-none rounded-[1.8rem] font-bold text-lg italic focus:ring-2 focus:ring-emerald-500 transition-all italic">{derivedInvestors.map(inv => (<option key={inv.id} value={inv.name}>{inv.name} (Available: {formatCurrency(inv.availableCapital)})</option>))}</select></div>
                <div className="space-y-3 italic"><label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic ml-1 italic">Customer Full Name</label><input required type="text" placeholder="e.g. John Doe" value={newEntry.name} onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })} className="w-full px-8 py-6 bg-slate-50 border-none rounded-[1.8rem] font-bold text-lg italic focus:ring-2 focus:ring-emerald-500 transition-all italic" /></div>
                <div className="grid grid-cols-2 gap-6 italic"><div className="space-y-3 italic"><label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic ml-1 italic">Loan Duration (Months)</label><input required type="number" value={newEntry.duration} onChange={(e) => setNewEntry({ ...newEntry, duration: Math.max(1, parseInt(e.target.value) || 0) })} className="w-full px-8 py-6 bg-slate-50 border-none rounded-[1.8rem] font-bold text-xl italic focus:ring-2 focus:ring-emerald-500 transition-all italic" /></div><div className="space-y-3 italic"><label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic ml-1 italic">Monthly Interest (%)</label><input required type="number" value={newEntry.interestRate} onChange={(e) => setNewEntry({ ...newEntry, interestRate: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full px-8 py-6 bg-slate-50 border-none rounded-[1.8rem] font-bold text-xl italic focus:ring-2 focus:ring-emerald-500 transition-all italic" /></div></div>
                <div className="space-y-3 italic"><label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic ml-1 italic">Start Date</label><input required type="date" value={newEntry.startDate} onChange={(e) => setNewEntry({ ...newEntry, startDate: e.target.value })} className="w-full px-8 py-6 bg-slate-50 border-none rounded-[1.8rem] font-bold text-lg italic focus:ring-2 focus:ring-emerald-500 transition-all italic" /></div>
                <div className="space-y-3 italic"><div className="flex justify-between items-center px-1 italic"><label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic italic">Amount to Loan out (PHP)</label>{calculatedData.hasInsufficientFunds && (<span className="text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse italic">⚠️ Not enough capital</span>)}</div><input required type="number" value={newEntry.principal} onChange={(e) => setNewEntry({ ...newEntry, principal: Number(e.target.value) })} className={`w-full px-8 py-6 border-none rounded-[1.8rem] font-black text-3xl italic focus:ring-2 transition-all italic ${calculatedData.hasInsufficientFunds ? 'bg-red-50 text-red-600 focus:ring-red-500' : 'bg-slate-50 text-slate-900 focus:ring-emerald-500'}`} /></div>
                <div className="p-10 bg-emerald-50 rounded-[3rem] italic border border-emerald-100 shadow-inner">
                  <h4 className="font-black text-emerald-800 mb-6 italic uppercase tracking-widest text-xs italic">✨ Loan Schedule Preview</h4>
                  <div className="space-y-4 italic"><div className="flex justify-between items-center italic"><span className="text-sm font-bold text-emerald-700 italic">15th & 30th Collection</span><span className="text-lg font-black text-emerald-900 italic">{formatCurrency(calculatedData.biMonthlyDeduction)}</span></div><div className="flex justify-between items-center italic"><span className="text-sm font-bold text-emerald-700 italic">Total Repayment</span><span className="text-lg font-black text-emerald-900 italic">{formatCurrency(calculatedData.totalPayable)}</span></div></div>
                </div>
                <button type="submit" disabled={calculatedData.hasInsufficientFunds} className={`w-full py-8 text-white rounded-[2.5rem] font-black text-2xl italic shadow-2xl transition-all active:scale-95 italic ${calculatedData.hasInsufficientFunds ? 'bg-slate-200 grayscale' : 'bg-slate-900 hover:bg-[#10b981]'}`}>Approve & Release Funds</button>
              </form>
            </div>
          </div>
        )}

        {/* --- High Fidelity Record Payment Modal --- */}
        {isVerifying && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 italic">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-2xl italic" onClick={() => { setIsVerifying(false); setIsUnlocking(false); }}></div>
            <div className="relative w-full max-w-md pt-12 animate-in zoom-in-95 duration-300 italic">
              <div className="absolute top-0 left-[-10px] z-20 w-16 h-16 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-2.5 border border-slate-100 italic"><div className="w-full h-full bg-[#10b981] rounded-xl flex items-center justify-center text-white font-black text-2xl italic">P.</div></div>
              <div className="relative bg-white rounded-[3.5rem] shadow-[0_32px_120px_-20px_rgba(0,0,0,0.4)] p-12 overflow-y-auto max-h-[90vh] italic border border-white/20">
                <div className="space-y-8 italic"><div className="text-center pt-4 italic"><h3 className="text-4xl font-black text-[#0f172a] tracking-tight italic">Record Payment</h3><p className="text-emerald-600 font-bold uppercase tracking-[0.2em] text-[10px] italic">Cycle {verifyingSlot} for {selectedCustomer?.name}</p></div>
                  <form className="space-y-6 italic" onSubmit={(e) => { e.preventDefault(); handleConfirmVerification(); }}>
                    <div className="space-y-2 italic"><div className="flex justify-between items-end px-2 italic"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1 italic">Collection Amount (PHP)</label><span className="text-[10px] font-black text-[#10b981] italic">Expect: {formatCurrency(selectedCustomer?.biMonthlyDeduction || 0)}</span></div><input type="number" required value={verifyForm.amount} onChange={(e) => setVerifyForm({ ...verifyForm, amount: Number(e.target.value) })} className="w-full px-8 py-6 bg-slate-50 border-none rounded-[1.8rem] font-black text-3xl italic text-[#0f172a] focus:ring-2 focus:ring-emerald-500 transition-all italic text-center italic" /></div>
                    <div className="grid grid-cols-2 gap-4 italic"><div className="space-y-2 italic"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-2 italic">Collection Date</label><input type="date" required value={verifyForm.date} onChange={(e) => setVerifyForm({ ...verifyForm, date: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-[1.5rem] font-bold text-sm italic focus:ring-2 focus:ring-emerald-500 italic" /></div><div className="space-y-2 italic"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-2 italic">Exact Time</label><input type="time" required value={verifyForm.time} onChange={(e) => setVerifyForm({ ...verifyForm, time: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-[1.5rem] font-bold text-sm italic focus:ring-2 focus:ring-emerald-500 italic" /></div></div>
                    <div className="space-y-2 italic"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-2 italic">Location / Spot</label><input type="text" required value={verifyForm.location} onChange={(e) => setVerifyForm({ ...verifyForm, location: e.target.value })} placeholder="e.g. Ayala Mall Lobby" className="w-full px-8 py-5 bg-slate-50 border-none rounded-[1.8rem] font-bold text-lg italic text-[#0f172a] focus:ring-2 focus:ring-emerald-500 transition-all italic" /></div>
                    <div className="space-y-4 italic">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-2 italic">Collection Proofs (Photos)</label>
                      <div className="grid grid-cols-3 gap-3">
                        {verifyForm.proofs.map((file, idx) => (
                          <div key={idx} className="aspect-square bg-slate-100 rounded-2xl relative overflow-hidden group border border-slate-200">
                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <button type="button" onClick={() => setVerifyForm({ ...verifyForm, proofs: verifyForm.proofs.filter((_, i) => i !== idx) })} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                          </div>
                        ))}
                        <div className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center relative bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group hover:border-emerald-300">
                          <input type="file" multiple accept="image/*" onChange={(e) => {
                            if (e.target.files) {
                              setVerifyForm({ ...verifyForm, proofs: [...verifyForm.proofs, ...Array.from(e.target.files)] });
                            }
                          }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                          <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📷</span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-600">Add</span>
                        </div>
                      </div>
                    </div>
                    {isUnlocking && (<div className="space-y-2 italic animate-in slide-in-from-top-2 duration-300 italic"><label className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic ml-2 italic">Reason for Edit</label><textarea required value={verifyForm.correctionReason} onChange={(e) => setVerifyForm({ ...verifyForm, correctionReason: e.target.value })} placeholder="Why is this collection being changed?" className="w-full px-8 py-4 bg-amber-50 border-none rounded-[1.5rem] font-bold italic text-amber-900 focus:ring-2 focus:ring-amber-500 italic transition-all italic" rows={2} /></div>)}
                    <div className="pt-4 italic"><button type="submit" disabled={verifyForm.proofs.length === 0} className="w-full py-7 bg-[#10b981] text-white rounded-[2.2rem] font-black text-2xl italic hover:bg-emerald-600 shadow-[0_20px_50px_-15px_rgba(16,185,129,0.5)] active:scale-[0.97] transition-all disabled:opacity-40 disabled:grayscale italic">Save Collection</button><button type="button" onClick={() => { setIsVerifying(false); setIsUnlocking(false); }} className="w-full mt-6 text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-slate-500 transition-colors italic">Cancel Recording</button></div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals & Helpers */}
        {renderNewInvestorModal()}
        {renderWithdrawModal()}
        {renderDepositModal()}
        {renderEditConfirmationNotifier()}
      </main>
    </div>
  );
};

export default App;
