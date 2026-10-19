import express, {Request, Response} from "express";
import {HttpResponseUtils} from "../utils/http-response.utils";
import {HttpStatusCode} from '../enums/http-status-codes.enum';
import fs from 'fs';

export const articleTypesRouter = express.Router();

articleTypesRouter.post("/backup",
  (req: Request, res: Response): void => {
    const articleTypesBackup: string = req.body.articleTypesBackup;

    try {
      const backupDir = `${process.env.FILE_SAVE_LOCATION!}/backup_articleTypes`;
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
      }
      const backupFilePath = `${backupDir}/articleTypes_backup.json`;
      fs.writeFileSync(backupFilePath, articleTypesBackup, 'utf8');
      return HttpResponseUtils.sendSuccess(res);
    } catch (err) {
      return HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  });
