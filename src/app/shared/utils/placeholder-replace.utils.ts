import {Order} from '../../services/storage/interfaces/order';
import {Customer} from '../../services/storage/interfaces/customer';

export class PlaceholderReplaceUtils {
  static readonly customerFirstNamePlaceholder = "%customerFirstName%";
  static readonly customerLastNamePlaceholder = "%customerLastName%";
  static readonly customerNamePlaceholder = "%customerName%";
  static readonly gender = "%gender%";
  static readonly genderedFormallyGreetings = "%genderedFormallyGreetings%";
  static readonly payDay = "%payDay%";
  static readonly orderNumber = "%orderNumber%"
  static readonly tenantBusiness = "%tenantBusiness%"
  static readonly genderMap = new Map<number, string>([
    [0, "Herr"],
    [1, "Frau"]
  ]);

  static readonly formallyGreetingsMap = new Map<number, string>([
    [0, "geehrter"],
    [1, "geehrte"]
  ]);

  static replacePlaceholder(stringWithPlaceholder: string, orderInformation: Order, customerInformation: Customer): string {
    // stringWithPlaceholder = stringWithPlaceholder.replace(this.customerLastNamePlaceholder, customerInformation.surname);
    stringWithPlaceholder = stringWithPlaceholder.replace(this.customerNamePlaceholder, customerInformation.name);
    // stringWithPlaceholder = stringWithPlaceholder.replace(this.gender, this.genderMap.get(customerInformation.gender)!);
    return stringWithPlaceholder.replace(this.orderNumber, orderInformation.orderNumber!.toString());
    // stringWithPlaceholder = stringWithPlaceholder.replace(this.tenantBusiness, tenantInformation.businessName);
    // return stringWithPlaceholder.replace(this.genderedFormallyGreetings, this.formallyGreetingsMap.get(customerInformation.gender)!);
  }
}
