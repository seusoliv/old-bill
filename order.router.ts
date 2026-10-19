import {Order} from '../../../src/app/services/storage/interfaces/order';
import express, {Request, Response} from "express";
import {Customer} from '../../../src/app/services/storage/interfaces/customer';
import {PdfGenerator} from '../services/pdf-generator.service';
import {HttpResponseUtils} from '../utils/http-response.utils';
import {HttpStatusCode} from "../enums/http-status-codes.enum";
import {InvoiceMailService} from '../services/invoice-mail.service';
import {BackupService} from '../services/backup.service';

export const orderRouter = express.Router();

orderRouter.post("/backup",
  (req: Request, res: Response): void => {
    const orderBackup: string = req.body.orderBackup;

    try {
      BackupService.writeOrders(orderBackup);
      return HttpResponseUtils.sendSuccess(res);
    } catch (err) {
      return HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  });

orderRouter.post("/",
  (req: Request, res: Response): void => {
    const order: Order = req.body.order;
    const customer: Customer = req.body.customer;
    PdfGenerator.createPdf(order.orderNumber!, order, customer).then(() => {
      HttpResponseUtils.sendSuccess(res)
    }).catch(() => {
      HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
    })
  }
);

orderRouter.post("/send-invoice",
  (req: Request, res: Response): void => {
    const customer: Customer = req.body.customer;
    const order: Order = req.body.order;
    InvoiceMailService.send(order, customer)
      .then(() => HttpResponseUtils.sendSuccess(res))
      .catch((e): void => {
        console.log(e);
        HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
      });
  });
//
// function getAggregatedOrder(orderNumber: number, stateFilter?: OrderState[]): Promise<AggregatedOrder[]> {
//     const query: Object[] = [];
//     if (orderNumber) {
//         query.push({$match: {orderNumber}});
//     }
//     if (stateFilter) {
//         query.push({$match: {state: {$in: stateFilter}}});
//     }
//     query.push({
//         $lookup: {
//             from: "customers",
//             localField: "customerNumber",
//             foreignField: "customerNumber",
//             as: "customerInformation"
//         }
//     }, {$unwind: "$customerInformation"});
//     return Orders.aggregate(query).exec();
// }
