import {Response} from "express";
import {HttpStatusCode} from "../enums/http-status-codes.enum";

export class HttpResponseUtils {
  static sendError(response: Response,
                   httpStatusCode: HttpStatusCode): void {
    response.status(httpStatusCode).send();
  }

  static sendSuccess(response: Response, body?: unknown): void {
    response.status(200).send(body);
  }
}
