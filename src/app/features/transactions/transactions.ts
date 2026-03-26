import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Transaction, SortOption } from '../../model/transactions.model';

@Component({
  selector: 'app-transactions',
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.html',
  styleUrl: './transactions.css',
})
export class Transactions implements OnInit {
  categories: string[] = [
    'Salary',
    'Freelance',
    'Food',
    'Transport',
    'Shopping',
    'Bills',
    'Savings',
    'Health',
    'Entertainment',
  ];

  transactions: Transaction[] = [
    {
      id: 1,
      title: 'Monthly Salary',
      amount: 42000,
      type: 'income',
      category: 'Salary',
      date: '2026-03-01',
      note: 'Main income',
    },
    {
      id: 2,
      title: 'Supermarket',
      amount: 3250,
      type: 'expense',
      category: 'Food',
      date: '2026-03-05',
      note: 'Weekly groceries',
    },
    {
      id: 3,
      title: 'Freelance Project',
      amount: 8500,
      type: 'income',
      category: 'Freelance',
      date: '2026-03-11',
      note: 'Landing page work',
    },
    {
      id: 4,
      title: 'Internet Bill',
      amount: 1800,
      type: 'expense',
      category: 'Bills',
      date: '2026-03-14',
      note: 'Home fiber payment',
    },
    {
      id: 5,
      title: 'Taxi',
      amount: 650,
      type: 'expense',
      category: 'Transport',
      date: '2026-03-16',
      note: 'Office commute',
    },
    {
      id: 6,
      title: 'Cinema',
      amount: 900,
      type: 'expense',
      category: 'Entertainment',
      date: '2026-03-19',
      note: 'Weekend outing',
    },
  ];

  filteredTransactions: Transaction[] = [];

  filters = {
    search: '',
    type: 'all',
    category: 'all',
    month: '',
    maxAmount: 50000,
  };

  sortBy: SortOption = 'latest';

  isDrawerOpen = false;
  editingTransaction: Transaction | null = null;

  form: Omit<Transaction, 'id'> = {
    title: '',
    amount: 0,
    type: 'expense',
    category: 'Food',
    date: '',
    note: '',
  };

  ngOnInit(): void {
    this.applyFilters();
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

  applyFilters(): void {
    let result = this.transactions.filter((transaction) => {
      const searchValue = this.filters.search.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        transaction.title.toLowerCase().includes(searchValue) ||
        transaction.category.toLowerCase().includes(searchValue) ||
        (transaction.note || '').toLowerCase().includes(searchValue);

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
      maxAmount: 50000,
    };

    this.sortBy = 'latest';
    this.applyFilters();
  }

  openDrawer(): void {
    this.editingTransaction = null;
    this.form = {
      title: '',
      amount: 0,
      type: 'expense',
      category: 'Food',
      date: '',
      note: '',
    };
    this.isDrawerOpen = true;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
    this.editingTransaction = null;
  }

  editTransaction(transaction: Transaction): void {
    this.editingTransaction = transaction;
    this.form = {
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      note: transaction.note || '',
    };
    this.isDrawerOpen = true;
  }

  saveTransaction(): void {
    const trimmedTitle = this.form.title.trim();
    const trimmedNote = (this.form.note || '').trim();

    if (!trimmedTitle || !this.form.amount || !this.form.date || !this.form.category) {
      return;
    }

    if (this.editingTransaction) {
      this.transactions = this.transactions.map((transaction) =>
        transaction.id === this.editingTransaction!.id
          ? {
              ...transaction,
              ...this.form,
              title: trimmedTitle,
              note: trimmedNote,
            }
          : transaction,
      );
    } else {
      const newTransaction: Transaction = {
        id: Date.now(),
        ...this.form,
        title: trimmedTitle,
        note: trimmedNote,
      };

      this.transactions = [newTransaction, ...this.transactions];
    }

    this.applyFilters();
    this.closeDrawer();
  }

  deleteTransaction(id: number): void {
    this.transactions = this.transactions.filter((transaction) => transaction.id !== id);
    this.applyFilters();
  }

  trackByTransactionId(index: number, transaction: Transaction): number {
    return transaction.id;
  }
}
