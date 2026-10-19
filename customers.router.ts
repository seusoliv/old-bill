import express, {Request, Response} from "express";
import {HttpResponseUtils} from "../utils/http-response.utils";
import {HttpStatusCode} from '../enums/http-status-codes.enum';
import {BackupService} from '../services/backup.service';
//
export const customersRouter = express.Router();

customersRouter.post("/backup",
  (req: Request, res: Response): void => {
    const customerBackup: string = req.body.customerBackup;

    try {
      BackupService.writeCustomers(customerBackup);
      return HttpResponseUtils.sendSuccess(res);
    } catch (err) {
      return HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  });
