export type MyDataLine = {
  lineNumber: number;
  description: string;
  netValue: number;
  quantity: number;
  vatCategory: number;
  vatAmount: number;
  itemCode: string | null;
  taricNo: string | null;
  measurementUnit: number | null;
};

export type MyDataReceipt = {
  issuerVat: string;
  issuerName: string;
  issueDate: string;
  series: string;
  aa: string;
  mark: string | null;
  currency: string;
  lines: MyDataLine[];
};

export type NormalizedRow = {
  description: string;
  nameNormalized: string;
  itemCode: string | null;
  price: number;
  qty: number;
  unit: string | null;
  vatRate: number | null;
  chain: string;
};
