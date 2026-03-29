import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { Goal } from '../../model/goals.model';
import {
  FinanceTransaction,
  FinanceTransactionInput,
  SortOption,
} from '../../model/transactions.model';
import { TransactionService } from '../../services/transaction.service';
import { GoalsService } from '../../services/goal.service';
import { faIcons } from '../../icons/fontawesome-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './transactions.html',
  styleUrls: ['./transactions.css'],
})
export class Transactions implements OnInit, OnDestroy {
  private subscription = new Subscription();
  readonly icons = faIcons;

  categories: string[] = [
    'Salary',
    'Freelance',
    'Food',
    'Transport',
    'Shopping',
    'Bills',
    'Health',
    'Entertainment',
    'Savings',
  ];

  transactions: FinanceTransaction[] = [];
  filteredTransactions: FinanceTransaction[] = [];
  availableGoals: Goal[] = [];

  filters = {
    search: '',
    type: 'all',
    category: 'all',
    month: '',
    maxAmount: Number.MAX_SAFE_INTEGER,
  };

  sortBy: SortOption = 'latest';

  isDrawerOpen = false;
  editingTransaction: FinanceTransaction | null = null;

  form: FinanceTransactionInput = this.getEmptyForm();

  constructor(
    private transactionService: TransactionService,
    private goalsService: GoalsService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.transactionService.transactions$.subscribe((transactions) => {
        this.transactions = transactions;
        this.applyFilters();
      }),
    );

    this.subscription.add(
      this.goalsService.getGoals().subscribe((goals) => {
        this.availableGoals = goals.filter((goal) => goal.savedAmount < goal.targetAmount);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get totalIncome(): number {
    return this.filteredTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  get totalExpense(): number {
    return this.filteredTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  get netFlow(): number {
    return this.totalIncome - this.totalExpense;
  }

  get hasActiveFilters(): boolean {
    return (
      this.filters.search.trim() !== '' ||
      this.filters.type !== 'all' ||
      this.filters.category !== 'all' ||
      this.filters.month !== '' ||
      this.sortBy !== 'latest'
    );
  }

  get hasGoals(): boolean {
    return this.availableGoals.length > 0;
  }

  private getEmptyForm(): FinanceTransactionInput {
    const today = new Date().toISOString().split('T')[0];

    return {
      title: '',
      amount: 0,
      type: 'expense',
      category: 'Food',
      date: today,
      note: '',
      isGoalContribution: false,
      goalId: null,
      goalName: null,
    };
  }

  applyFilters(): void {
    let result = this.transactions.filter((transaction) => {
      const searchValue = this.filters.search.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        transaction.title.toLowerCase().includes(searchValue) ||
        transaction.category.toLowerCase().includes(searchValue) ||
        (transaction.note || '').toLowerCase().includes(searchValue) ||
        (transaction.goalName || '').toLowerCase().includes(searchValue);

      const matchesType = this.filters.type === 'all' || transaction.type === this.filters.type;

      const matchesCategory =
        this.filters.category === 'all' || transaction.category === this.filters.category;

      const matchesMonth = !this.filters.month || transaction.date.startsWith(this.filters.month);

      const matchesAmount = transaction.amount <= this.filters.maxAmount;

      return matchesSearch && matchesType && matchesCategory && matchesMonth && matchesAmount;
    });

    switch (this.sortBy) {
      case 'oldest':
        result = [...result].sort((a, b) => a.date.localeCompare(b.date));
        break;
      case 'highest':
        result = [...result].sort((a, b) => b.amount - a.amount);
        break;
      case 'lowest':
        result = [...result].sort((a, b) => a.amount - b.amount);
        break;
      case 'latest':
      default:
        result = [...result].sort((a, b) => b.date.localeCompare(a.date));
        break;
    }

    this.filteredTransactions = result;
  }

  resetFilters(): void {
    this.filters = {
      search: '',
      type: 'all',
      category: 'all',
      month: '',
      maxAmount: Number.MAX_SAFE_INTEGER,
    };

    this.sortBy = 'latest';
    this.applyFilters();

    this.toastr.info('Filters have been reset.', 'Filters Cleared');
  }

  openDrawer(): void {
    this.editingTransaction = null;
    this.form = this.getEmptyForm();
    this.isDrawerOpen = true;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
    this.editingTransaction = null;
    this.form = this.getEmptyForm();
  }

  onContributionToggle(): void {
    if (this.form.isGoalContribution) {
      this.form.type = 'expense';
      this.form.category = 'Savings';

      if (!this.form.title.trim()) {
        this.form.title = 'Goal contribution';
      }
    } else {
      this.form.goalId = null;
      this.form.goalName = null;
      this.form.category = 'Food';
    }
  }

  onGoalChange(goalId: number | null): void {
    if (!goalId) {
      this.form.goalName = null;
      return;
    }

    const selectedGoal = this.availableGoals.find((goal) => goal.id === Number(goalId));
    this.form.goalId = goalId;
    this.form.goalName = selectedGoal?.name ?? null;

    if (selectedGoal && (!this.form.title || this.form.title === 'Goal contribution')) {
      this.form.title = `${selectedGoal.name} contribution`;
    }
  }

  editTransaction(transaction: FinanceTransaction): void {
    this.editingTransaction = transaction;

    this.form = {
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      note: transaction.note || '',
      isGoalContribution: transaction.isGoalContribution ?? false,
      goalId: transaction.goalId ?? null,
      goalName: transaction.goalName ?? null,
    };

    this.isDrawerOpen = true;
  }

  saveTransaction(): void {
    const trimmedTitle = this.form.title.trim();
    const trimmedNote = (this.form.note || '').trim();
    const amount = Number(this.form.amount);

    if (
      !trimmedTitle ||
      !amount ||
      amount <= 0 ||
      !this.form.date ||
      !this.form.category ||
      !this.form.type
    ) {
      this.toastr.error(
        'Please fill in title, amount, date, category, and type correctly.',
        'Missing Information',
      );
      return;
    }

    if (this.form.isGoalContribution && !this.form.goalId) {
      this.toastr.error('Please choose which goal this money should go to.', 'Goal Required');
      return;
    }

    const selectedGoal =
      this.form.isGoalContribution && this.form.goalId
        ? (this.goalsService
            .getGoalsSnapshot()
            .find((goal) => goal.id === Number(this.form.goalId)) ?? null)
        : null;

    const payload: FinanceTransactionInput = {
      ...this.form,
      title: trimmedTitle,
      note: trimmedNote,
      amount,
      type: this.form.isGoalContribution ? 'expense' : this.form.type,
      category: this.form.isGoalContribution ? 'Savings' : this.form.category,
      goalId: this.form.isGoalContribution ? Number(this.form.goalId) : null,
      goalName: this.form.isGoalContribution ? (selectedGoal?.name ?? null) : null,
    };

    if (this.editingTransaction) {
      this.revertGoalImpact(this.editingTransaction);
      this.transactionService.updateTransaction(this.editingTransaction.id, payload);
      this.applyGoalImpact(payload);

      this.toastr.success(`${payload.title} was updated successfully.`, 'Transaction Updated');
    } else {
      this.transactionService.addTransaction(payload);
      this.applyGoalImpact(payload);

      this.toastr.success(`${payload.title} was added successfully.`, 'Transaction Added');
    }

    this.applyFilters();
    this.closeDrawer();
  }

  deleteTransaction(id: string): void {
    const transaction = this.transactions.find((item) => item.id === id);

    const confirmed = window.confirm(`Delete "${transaction?.title ?? 'this transaction'}"?`);

    if (!confirmed || !transaction) {
      return;
    }

    this.revertGoalImpact(transaction);
    this.transactionService.deleteTransaction(id);

    this.toastr.warning(`${transaction.title} was deleted.`, 'Transaction Deleted');
  }

  clearAllTransactions(): void {
    const confirmed = window.confirm(
      'This will delete all transactions and reverse all goal contributions saved through transactions. Continue?',
    );

    if (!confirmed) {
      return;
    }

    this.transactions.forEach((transaction) => this.revertGoalImpact(transaction));
    this.transactionService.clearAllTransactions();
    this.closeDrawer();

    this.toastr.warning('All transactions have been cleared.', 'All Cleared');
  }

  formatAmount(amount: number, type: 'income' | 'expense'): string {
    const prefix = type === 'income' ? '+' : '-';
    return `${prefix} Rs ${amount.toLocaleString()}`;
  }

  trackByTransactionId(index: number, transaction: FinanceTransaction): string {
    return transaction.id;
  }

  private applyGoalImpact(payload: FinanceTransactionInput): void {
    if (!payload.isGoalContribution || !payload.goalId) {
      return;
    }

    this.goalsService.contributeToGoal(Number(payload.goalId), payload.amount);
  }

  private revertGoalImpact(transaction: FinanceTransaction): void {
    if (!transaction.isGoalContribution || !transaction.goalId) {
      return;
    }

    this.goalsService.removeContributionFromGoal(Number(transaction.goalId), transaction.amount);
  }
}
