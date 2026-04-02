import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FinanceTransaction, FinanceTransactionInput } from '../model/transactions.model';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly storageKey = 'moneymind-transactions';

  private transactionsSubject = new BehaviorSubject<FinanceTransaction[]>(this.loadFromStorage());

  readonly transactions$: Observable<FinanceTransaction[]> =
    this.transactionsSubject.asObservable();

  getTransactionsSnapshot(): FinanceTransaction[] {
    return this.transactionsSubject.value;
  }

  addTransaction(payload: FinanceTransactionInput): FinanceTransaction {
    const transactions = this.getTransactionsSnapshot();

    const newTransaction: FinanceTransaction = {
      id: crypto?.randomUUID?.() ?? Date.now().toString(),
      ...payload,
      goalId: payload.isGoalContribution ? (payload.goalId ?? null) : null,
      goalName: payload.isGoalContribution ? (payload.goalName ?? null) : null,
    };

    this.saveToStorage([newTransaction, ...transactions]);
    return newTransaction;
  }

  updateTransaction(id: string, payload: FinanceTransactionInput): FinanceTransaction | null {
    const transactions = this.getTransactionsSnapshot();
    const existingTransaction = transactions.find((transaction) => transaction.id === id);

    if (!existingTransaction) {
      return null;
    }

    const updatedTransaction: FinanceTransaction = {
      ...existingTransaction,
      ...payload,
      id,
      goalId: payload.isGoalContribution ? (payload.goalId ?? null) : null,
      goalName: payload.isGoalContribution ? (payload.goalName ?? null) : null,
    };

    const updatedTransactions = transactions.map((transaction) =>
      transaction.id === id ? updatedTransaction : transaction,
    );

    this.saveToStorage(updatedTransactions);
    return updatedTransaction;
  }

  deleteTransaction(id: string): FinanceTransaction | null {
    const transactions = this.getTransactionsSnapshot();
    const existingTransaction = transactions.find((transaction) => transaction.id === id);

    if (!existingTransaction) {
      return null;
    }

    const updatedTransactions = transactions.filter((transaction) => transaction.id !== id);
    this.saveToStorage(updatedTransactions);

    return existingTransaction;
  }

  clearAllTransactions(): void {
    localStorage.removeItem(this.storageKey);
    this.transactionsSubject.next([]);
  }

  private loadFromStorage(): FinanceTransaction[] {
    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as FinanceTransaction[];
    } catch (error) {
      console.error('Error parsing transactions from localStorage:', error);
      return [];
    }
  }

  private saveToStorage(transactions: FinanceTransaction[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(transactions));
    this.transactionsSubject.next(transactions);
  }
}
