import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FinanceTransaction, FinanceTransactionInput } from '../model/transactions.model';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly storageKey = 'moneymind-transactions';

  private transactionsSubject = new BehaviorSubject<FinanceTransaction[]>(this.loadFromStorage());

  transactions$: Observable<FinanceTransaction[]> = this.transactionsSubject.asObservable();

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

  getTransactionsSnapshot(): FinanceTransaction[] {
    return this.transactionsSubject.value;
  }

  addTransaction(payload: FinanceTransactionInput): void {
    const transactions = this.getTransactionsSnapshot();

    const newTransaction: FinanceTransaction = {
      id: crypto.randomUUID(),
      ...payload,
    };

    this.saveToStorage([newTransaction, ...transactions]);
  }

  updateTransaction(id: string, payload: FinanceTransactionInput): void {
    const transactions = this.getTransactionsSnapshot();

    const updatedTransactions = transactions.map((transaction) =>
      transaction.id === id ? { ...transaction, ...payload, id } : transaction,
    );

    this.saveToStorage(updatedTransactions);
  }

  deleteTransaction(id: string): void {
    const transactions = this.getTransactionsSnapshot();

    const updatedTransactions = transactions.filter((transaction) => transaction.id !== id);

    this.saveToStorage(updatedTransactions);
  }

  clearAllTransactions(): void {
    localStorage.removeItem(this.storageKey);
    this.transactionsSubject.next([]);
  }
}
