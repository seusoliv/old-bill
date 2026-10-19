import {CalcPrizeUtils} from '../../../src/app/shared/utils/calc-prize';
import {Order} from '../../../src/app/services/storage/interfaces/order';
import {Customer} from '../../../src/app/services/storage/interfaces/customer';
import {Position} from '../../../src/app/shared/components/interfaces/position.interface';
import {PlaceholderReplaceUtils} from '../../../src/app/shared/utils/placeholder-replace.utils';
import {TDocumentDefinitions, TFontDictionary} from 'pdfmake/interfaces';
import PdfPrinter from 'pdfmake';
import fs from "fs";

export class PdfGenerator {
  static readonly payDay = "%payDay%";
  static readonly fontDescriptor: TFontDictionary = {
    Courier: {
      normal: "Courier",
      bold: "Courier-Bold",
      italics: "Courier-Oblique",
      bolditalics: "Courier-BoldOblique"
    },
    Helvetica: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique"
    },
    Times: {
      normal: "Times-Roman",
      bold: "Times-Bold",
      italics: "Times-Italic",
      bolditalics: "Times-BoldItalic"
    },
    Symbol: {
      normal: "Symbol"
    }
  };

  static async createPdf(orderNumber: number, orderInformation: Order, customerInformation: Customer): Promise<void> {
    const positionTableBody: any[][] = [];
    const summaryTableBody: any[][] = [];
    const discountIndex = orderInformation?.positions?.findIndex((position: Position): boolean => !!position.discount);
    const headerData: string[] = ["Pos.", "Artikel", "Menge", "Stückpreis", "Gesamtpreis"];
    const widths: string[] = ["auto", "*", "auto", "auto", "auto"];
    if (discountIndex !== undefined && discountIndex !== -1) {
      headerData.splice(2, 0, "Rabatt");
      widths.push("auto");
    }
    positionTableBody.push(headerData);

    orderInformation.positions?.forEach((position: Position, index: number): void => {
      const totalPositionPrize = CalcPrizeUtils.calcPrize(position.prize, position.count, position.isNegativePosition, position.discount).toFixed(2);
      const positionTableDataEntry: any[] =
        [
          `${index + 1}.`,
          position.name,
          {text: position.count.toString(), alignment: "center"},
          {text: `${position.prize.toFixed(2)} €`, alignment: "center"},
          {text: `${totalPositionPrize} €`, alignment: "center"}
        ];
      if (discountIndex !== undefined && discountIndex !== -1) {
        positionTableDataEntry.splice(2, 0, {
          text: position?.discount ? `${position?.discount} %` : "",
          alignment: "center"
        });
      }
      positionTableBody.push(positionTableDataEntry);
    });

    if (orderInformation.discount) {
      summaryTableBody.push([
        {text: "Zwischensumme:", bold: true},
        `${CalcPrizeUtils.calcTotalPrize(orderInformation?.positions!).toFixed(2)} €`
      ]);
      summaryTableBody.push([
        {text: "Rabatt:", bold: true},
        `${orderInformation.discount.toFixed(2)} %`
      ]);
    }
    summaryTableBody.push([
      {text: "Gesamtbetrag:", bold: true},
      `${orderInformation.total.toFixed(2)} €`
    ]);

    const invoiceIntroduction = PlaceholderReplaceUtils
      .replacePlaceholder(process.env.INVOICE_INSTRUCTIONS!, orderInformation, customerInformation);

    let invoiceBody = process.env.INVOICE_BODY!;
    invoiceBody = invoiceBody.replace(this.payDay, this.getDate(new Date(orderInformation.payDate!)));

    const printer = new PdfPrinter(this.fontDescriptor);
    const document: TDocumentDefinitions = {
      footer: {
        columns: [
          {
            stack: [
              `Bankverbindung: ${process.env.IBAN}`,
              `Bank: ${process.env.BANK}`,
            ],
            margin: [20, 0, 0, 0]
          }
        ]
      },
      content: [
        {
          svg: process.env.BUSINESS_ICON!,
          fit: [250, 150],
          absolutePosition: {
            x: 20,
            y: 20
          }
        },
        {
          stack: [
            {text: `${process.env.BUSINESS_NAME}`, bold: true, fontSize: 18},
            `${process.env.STREET}`,
            `${process.env.ZIP_CODE} ${process.env.CITY}`,
            `${process.env.PHONE}`
          ],
          style: "businessInfo"
        }, {
          stack: [
            {
              text: `${customerInformation.surname} ${customerInformation.name}`,
              bold: true,
              fontSize: 18
            },
            `${customerInformation?.street ?? ""} ${customerInformation.houseNumber ?? ""}`,
            `${customerInformation?.zipCode ?? ""} ${customerInformation.city ?? ""}`
          ],
          style: "customerInfo"
        },
        {
          text: "Rechnung",
          fontSize: 18,
          margin: [0, 50, 0, 10],
          bold: true
        },
        {
          margin: [0, 10, 0, 25],
          text: invoiceIntroduction
        },
        {
          columns: [
            {
              width: 150,
              text: "Rechnung Nr.:",
              bold: true
            }, {
              width: 150,
              text: orderNumber.toString()
            }, {
              width: 150,
              text: "Rechnungsdatum:",
              bold: true
            }, {
              width: 150,
              text: this.getDate(new Date())
            }
          ]
        }, {
          margin: [0, 3, 0, 15],
          columns: [
            {
              width: 150,
              text: "Kundennummer:",
              bold: true
            }, {
              width: 150,
              text: customerInformation.id!.toString()
            }, {
              width: 150,
              text: "Fälligkeitsdatum:",
              bold: true
            }, {
              width: 150,
              text: this.getDate(new Date(orderInformation.payDate!))
            }
          ]
        }, {
          table: {
            widths: widths,
            headerRows: 1,
            body: positionTableBody
          },
          layout: "noBorders",
          margin: [0, 15, 0, 0]
        }, {
          columns: [
            {
              text: "",
              width: "*"
            }, {
              width: "auto",
              margin: [0, 20, 15, 0],
              table: {
                widths: ["auto", "auto"],
                body: summaryTableBody
              },
              alignment: "right",
              layout: "noBorders"
            }
          ]
        }, {
          margin: [0, 30, 0, 0],
          text: invoiceBody
        }
      ],
      styles: {
        businessInfo: {
          alignment: "right"
        },
        customerInfo: {
          margin: [0, 100, 0, 0]
        }
      },
      defaultStyle: {
        font: "Helvetica"
      }
    };
    try {
      const invoicePath = `${process.env.FILE_SAVE_LOCATION!}/${orderNumber}/Rechnung_${customerInformation.surname}_${orderNumber}.pdf`;
      const doc = printer.createPdfKitDocument(document);
      if (!fs.existsSync(`${process.env.FILE_SAVE_LOCATION!}/${orderNumber}`)) {
        fs.mkdirSync(`${process.env.FILE_SAVE_LOCATION!}/${orderNumber}`);
      }
      doc.pipe(fs.createWriteStream(invoicePath));
      doc.end();
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  private static getDate(date: Date): string {
    return date.toLocaleDateString("de", {year: "numeric", month: "2-digit", day: "2-digit"});
  }
}
