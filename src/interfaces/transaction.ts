export interface ITransaction {
  ref_id: string;
  customer_no: string;
  buyer_sku_code: string;
  message: string;
  status: string;
  rc: string;
  sn?: string;
  buyer_last_saldo?: number;
  price: number;
  tele?: string;
  wa?: string;
}

export interface ITransactionResponse {
  data: ITransaction;
}
