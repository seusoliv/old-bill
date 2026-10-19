import {createTransport} from "nodemailer";
import {Order} from "../../../src/app/services/storage/interfaces/order";
import {Customer} from "../../../src/app/services/storage/interfaces/customer";
import {PlaceholderReplaceUtils} from "../../../src/app/shared/utils/placeholder-replace.utils";

/**
 * Sends a generated invoice PDF to the customer by email. The logic is shared by the
 * `POST /orders/send-invoice` route and the `send_invoice_mail` MCP tool, so both behave
 * identically. The PDF must already exist (generate it via PdfGenerator first).
 */
export class InvoiceMailService {
  static async send(order: Order, customer: Customer): Promise<void> {
    const invoicePath = `${process.env.FILE_SAVE_LOCATION!}/${order.orderNumber}/Rechnung_${customer.surname}_${order.orderNumber}.pdf`;
    const mailTransporter = createTransport({
      host: process.env.SMTP_SERVER,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SENDER_MAIL,
        pass: process.env.SENDER_PASSWORD,
      },
    });
    const mailSubject = PlaceholderReplaceUtils
      .replacePlaceholder(process.env.MAIL_SUBJECT!, order, customer);
    const mailText = PlaceholderReplaceUtils
      .replacePlaceholder(process.env.MAIL_Text!, order, customer);

    await mailTransporter.sendMail({
      from: process.env.SENDER_MAIL,
      to: customer.email,
      subject: mailSubject,
      text: mailText,
      attachments: [{
        filename: `Rechnung ${customer.surname}.pdf`,
        path: invoicePath,
        contentType: "pdf",
      }],
    });
  }
}
