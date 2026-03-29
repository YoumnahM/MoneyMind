import { Component, EventEmitter, inject, Output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faIcons } from '../../icons/fontawesome-icons';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [FontAwesomeModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  @Output() menuClick = new EventEmitter<void>();
  private router = inject(Router);

  icons = faIcons;

  user = {
    name: 'Youmnah',
    role: 'Financial Explorer',
    initials: 'YM',
  };

  pageMeta: Record<string, { kicker: string; title: string; badge: string }> = {
    '/': {
      kicker: 'Welcome back',
      title: 'MoneyMind Dashboard',
      badge: 'Live Insights',
    },
    '/transactions': {
      kicker: '',
      title: 'Transactions',
      badge: 'Smart Tracking',
    },
    '/insights': {
      kicker: 'Behavior analysis',
      title: 'Insights Lab',
      badge: 'Pattern Detection',
    },
    '/simulator': {
      kicker: '',
      title: 'Scenario Simulator',
      badge: 'Forecast Mode',
    },
    '/goals': {
      kicker: '',
      title: 'Goals Planner',
      badge: 'Progress Tracking',
    },
  };

  currentHeader = this.pageMeta['/'];

  constructor() {
    this.updateHeader(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateHeader(event.urlAfterRedirects);
      });
  }

  onMenuClick(): void {
    this.menuClick.emit();
  }

  private updateHeader(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.currentHeader = this.pageMeta[cleanUrl] ?? {
      kicker: 'Welcome back',
      title: 'MoneyMind',
      badge: 'Overview',
    };
  }
}
