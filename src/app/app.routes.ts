import {Routes} from '@angular/router';
import {CustomerOverviewComponent} from "./views/customer-overview/customer-overview.component";
import {ArticlesOverviewComponent} from './views/articles-overview/articles-overview.component';
import {OrderOverviewComponent} from './views/order-overview/order-overview.component';
import {DashboardComponent} from './views/dashboard/dashboard.component';
import {TaxReportComponent} from './views/tax-report/tax-report.component';
import {HelpComponent} from './views/help/help.component';

export const routes: Routes = [
  {path: 'dashboard', loadComponent: ((): any => DashboardComponent)},
  {path: 'tax-report', loadComponent: ((): any => TaxReportComponent)},
  {path: 'help', loadComponent: ((): any => HelpComponent)},
  {path: 'customer-overview', loadComponent: ((): any => CustomerOverviewComponent)},
  {path: 'articles-overview', loadComponent: ((): any => ArticlesOverviewComponent)},
  {path: 'order-overview', loadComponent: ((): any => OrderOverviewComponent)},
  {path: "*", redirectTo: "/dashboard", pathMatch: "full"},
  {path: "**", redirectTo: "/dashboard"},
  {path: "", redirectTo: "/dashboard", pathMatch: "full"}
];
