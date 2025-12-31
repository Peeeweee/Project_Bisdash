
import React, { useState, useMemo } from 'react';
import Sidebar from './components/UI/Sidebar';
import StatCard from './components/UI/StatCard';
import { mockCustomers as initialCustomers, mockInvestors as initialInvestors, businessStats } from './services/mockData';
import { Customer, PaymentStatus, Investor, PaymentEntry } from './types';
import { Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie, LineChart, Line, XAxis } from 'recharts';

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

  const [baseInvestors, setBaseInvestors] = useState<Investor[]>(initialInvestors);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers.map(c => ({
    ...c,
    payments: c.payments.map(p => ({ ...p, isLocked: true }))
  })));

  const derivedInvestors = useMemo(() => {
    return baseInvestors.map(investor => {
      const myCustomers = customers.filter(c => c.moneyOwner === investor.name);
      const totalPrincipalEverLoaned = myCustomers.reduce((acc, c) => acc + c.principalAmount, 0);
      const totalInterestProfit = myCustomers.reduce((acc, c) => {
        const interestPortionPerCycle = c.totalInterest / (c.durationMonths * 2);
        return acc + c.payments.reduce((sum, p) => {
          if (p.status === PaymentStatus.PAID || p.status === PaymentStatus.ADVANCE || p.status === PaymentStatus.LATE) return sum + interestPortionPerCycle;
          if (p.status === PaymentStatus.SHORT) return sum + (interestPortionPerCycle * (p.actualAmount / p.expectedAmount));
          return sum;
        }, 0);
      }, 0);

      const totalCashEverReturned = myCustomers.reduce((acc, c) => {
        return acc + c.payments.reduce((sum, p) => sum + (p?.actualAmount || 0), 0);
      }, 0);

      const available = investor.initialCapital - totalPrincipalEverLoaned + totalCashEverReturned;
      const roi = investor.initialCapital > 0 ? (totalInterestProfit / investor.initialCapital) * 100 : 0;

      return {
        ...investor,
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
    return {
      totalManaged: totalCap,
      totalInterestGained: totalGained,
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
    proof: null as File | null,
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
          remainingBalance: newRemaining
        };
      }
      return c;
    });

    setCustomers(updatedCustomers);
    const updatedSelected = updatedCustomers.find(c => c.id === selectedCustomer.id);
    if (updatedSelected) setSelectedCustomer(updatedSelected);
    setIsExtendModalOpen(false);
  };

  const openVerifyModal = (slotIndex: number, currentPayment?: PaymentEntry) => {
    setVerifyingSlot(slotIndex);
    setVerifyForm({
      amount: currentPayment ? currentPayment.actualAmount : (selectedCustomer?.biMonthlyDeduction || 0),
      date: currentPayment ? currentPayment.date : new Date().toISOString().split('T')[0],
      time: currentPayment ? (currentPayment.verifiedAt?.split(' ')[1] || new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)) : new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
      location: currentPayment?.location || '',
      proof: null,
      correctionReason: ''
    });
    setIsVerifying(true);
  };

  const handleConfirmVerification = () => {
    if (!selectedCustomer || verifyingSlot === null) return;
    if (!verifyForm.proof) {
      alert("Please upload a photo of the receipt.");
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
      proofImage: URL.createObjectURL(verifyForm.proof),
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
    const amountStr = window.prompt(`How much would you like to withdraw from ${investor.name}'s available capital?\nAvailable: ${formatCurrency(investor.availableCapital)}`);
    if (amountStr === null) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (amount > investor.availableCapital) {
      alert("You cannot withdraw more than the available capital.");
      return;
    }

    const updatedInvestors = baseInvestors.map(inv => {
      if (inv.id === investor.id) return { ...inv, initialCapital: inv.initialCapital - amount };
      return inv;
    });
    setBaseInvestors(updatedInvestors);
    alert(`Successfully withdrawn ${formatCurrency(amount)} from ${investor.name}'s account.`);
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
      performanceHistory: []
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
  const renderDashboard = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 italic">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 italic">
        <div><h2 className="text-5xl font-black text-slate-900 tracking-tight italic">Summary</h2><p className="text-slate-500 mt-2 text-lg font-medium italic">Your overall business status.</p></div>
        <div className="flex gap-4 italic">
          <button className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm italic">Save Data</button>
          <button className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all italic">Print Summary</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 italic">
        <StatCard label="Total Money from Investors" value={formatCurrency(liveStats.totalManaged)} icon="🏦" trend="up" subtext="All cash pools" />
        <StatCard label="Active Customers" value={liveStats.activeATMs} icon="🏧" subtext="People currently borrowing" />
        <StatCard label="Success Rate" value={`${liveStats.monthlyPerformance}%`} icon="📈" trend="up" subtext="Monthly performance" />
        <StatCard label="Total Profits Gained" value={formatCurrency(liveStats.totalInterestGained)} icon="💰" subtext="Money made from interest" />
      </div>
    </div>
  );

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

  // --- Investors Tab ---
  const renderInvestorsPage = () => {
    const pieData = derivedInvestors.map(inv => ({ name: inv.name, value: inv.initialCapital }));
    const COLORS = ['#10b981', '#0f172a', '#334155', '#94a3b8'];

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
                      <button onClick={() => handleWithdrawFunds(inv)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:border-red-500 transition-all italic">Withdraw Available</button>
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
  const renderTransactionsPage = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 italic">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 italic">
        <div className="italic">
          <h2 className="text-5xl font-black text-slate-900 tracking-tight italic">Money Feed</h2>
          <p className="text-slate-500 mt-2 text-lg font-medium italic">Every collection recorded, across all customers.</p>
        </div>
        <div className="flex bg-white p-2 rounded-[1.8rem] border border-slate-100 shadow-sm italic overflow-x-auto">
          {['ALL', 'PAID', 'SHORT', 'ADVANCE', 'LATE'].map(f => (
            <button key={f} onClick={() => setTransactionFilter(f as any)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic whitespace-nowrap ${transactionFilter === f ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden italic">
        <table className="w-full text-left border-collapse italic">
          <thead>
            <tr className="bg-slate-50/50 font-black uppercase text-[10px] tracking-widest text-slate-400 italic">
              <th className="px-10 py-6 italic">Customer</th>
              <th className="px-10 py-6 italic">Date Collected</th>
              <th className="px-10 py-6 italic">Money In</th>
              <th className="px-10 py-6 italic">Verified Spot</th>
              <th className="px-10 py-6 italic">Status</th>
              <th className="px-10 py-6 italic">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 italic">
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50/80 transition-all group italic">
                <td className="px-10 py-8 italic"><div><p className="font-black text-slate-900 text-lg italic">{tx.customerName}</p><p className="text-[10px] font-bold text-slate-400 uppercase italic">From {tx.investorPool}'s Pool</p></div></td>
                <td className="px-10 py-8 italic"><p className="font-bold text-slate-600 italic">{formatDate(tx.date)}</p><p className="text-[10px] font-medium text-slate-400 italic">{tx.verifiedAt?.split(' ')[1] || '12:00'}</p></td>
                <td className="px-10 py-8 italic"><p className="font-black text-slate-900 text-xl tracking-tighter italic">{formatCurrency(tx.actualAmount)}</p>{tx.shortAmount > 0 && <p className="text-[9px] font-black text-red-500 uppercase italic">Short by {formatCurrency(tx.shortAmount)}</p>}</td>
                <td className="px-10 py-8 italic"><div className="flex items-center gap-2 italic"><span className="text-emerald-500 italic">📍</span><p className="font-bold text-slate-500 text-sm italic">{tx.location || 'Not recorded'}</p></div></td>
                <td className="px-10 py-8 italic"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic ${tx.status === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700' : tx.status === PaymentStatus.SHORT ? 'bg-amber-100 text-amber-700' : tx.status === PaymentStatus.ADVANCE ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-100 text-rose-700'}`}>{tx.status}</span></td>
                <td className="px-10 py-8 italic">{tx.proofImage ? (<button onClick={() => window.open(tx.proofImage, '_blank')} className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm italic text-xl">🖼️</button>) : (<span className="text-slate-300 italic text-sm font-medium italic">No proof</span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && (<div className="py-24 text-center italic"><p className="text-slate-400 font-bold italic">No transactions found for this filter.</p></div>)}
      </div>
    </div>
  );

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
          {!customer.isCompleted && (
            <button onClick={handleExtendLoan} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-amber-50 hover:border-amber-200 transition-all shadow-sm italic flex items-center gap-3 italic">
              <span className="text-lg italic">🕒</span> Extend Loan
            </button>
          )}
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
            <div className="bg-[#0f172a] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden text-center flex flex-col justify-between italic h-full">
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
                  <button onClick={handleFullSettle} className="w-full py-5 bg-emerald-600 rounded-[2rem] font-black text-lg hover:bg-emerald-700 shadow-[0_12px_40px_-10px_rgba(16,185,129,0.5)] transition-all italic">Mark Fully Paid</button>
                ) : (
                  <div className="w-full py-5 bg-emerald-500/10 border border-emerald-500/30 rounded-[2rem] text-emerald-400 font-black text-lg italic uppercase tracking-widest flex items-center justify-center gap-2 italic animate-in zoom-in-95"><span>✅</span> Loan Completed</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div >
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
          </div>
        )}
        {renderNewInvestorModal()}
        {renderEditConfirmationNotifier()}
        {renderSettlementModal()}
        {renderVoidModal()}
        {renderExtendModal()}

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
                    <div className="space-y-2 italic"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-2 italic">Collection Proof (Photo)</label><div className="w-full h-32 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center relative bg-slate-50/50 hover:bg-slate-100/50 transition-colors group italic">{verifyForm.proof ? (<div className="flex flex-col items-center gap-2 italic"><span className="text-3xl italic">📸</span><p className="text-emerald-600 font-black italic text-[9px] px-4 truncate w-full text-center italic">{verifyForm.proof.name}</p></div>) : (<div className="flex flex-col items-center gap-1 italic"><p className="text-slate-400 italic font-black text-[10px] uppercase tracking-[0.2em] group-hover:text-slate-600 italic">Click to Attach Proof</p></div>)}<input type="file" required accept="image/*" onChange={(e) => setVerifyForm({ ...verifyForm, proof: e.target.files?.[0] || null })} className="absolute inset-0 opacity-0 cursor-pointer italic z-10" /></div></div>
                    {isUnlocking && (<div className="space-y-2 italic animate-in slide-in-from-top-2 duration-300 italic"><label className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic ml-2 italic">Reason for Edit</label><textarea required value={verifyForm.correctionReason} onChange={(e) => setVerifyForm({ ...verifyForm, correctionReason: e.target.value })} placeholder="Why is this collection being changed?" className="w-full px-8 py-4 bg-amber-50 border-none rounded-[1.5rem] font-bold italic text-amber-900 focus:ring-2 focus:ring-amber-500 italic transition-all italic" rows={2} /></div>)}
                    <div className="pt-4 italic"><button type="submit" disabled={!verifyForm.proof} className="w-full py-7 bg-[#10b981] text-white rounded-[2.2rem] font-black text-2xl italic hover:bg-emerald-600 shadow-[0_20px_50px_-15px_rgba(16,185,129,0.5)] active:scale-[0.97] transition-all disabled:opacity-40 disabled:grayscale italic">Save Collection</button><button type="button" onClick={() => { setIsVerifying(false); setIsUnlocking(false); }} className="w-full mt-6 text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-slate-500 transition-colors italic">Cancel Recording</button></div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals & Helpers */}
        {renderNewInvestorModal()}
        {renderEditConfirmationNotifier()}
      </main>
    </div>
  );
};

export default App;
