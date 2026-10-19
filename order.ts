import {Position} from '../../../shared/components/interfaces/position.interface';

export interface Order {
  orderNumber?: number;
  customerNumber: number;
  customerName: string;
  isMailAddressAvailable: boolean;
  state: OrderState;
  createdDate: Date;
  closedDate?: Date;
  payDate?: Date;
  positions: Position[];
  discount: number | null;
  total: number;
}

export enum OrderState {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  SENT_MAIL = "SENT_MAIL",
  CLOSED = "CLOSED",
}
