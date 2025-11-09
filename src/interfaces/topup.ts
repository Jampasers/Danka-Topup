type TransactionStatus = "Pending" | "Sukses" | "Gagal";

export interface TransactionData {
  ref_id: string;
  customer_no: string;
  buyer_sku_code: string;
  message: string;
  status: TransactionStatus;
  rc?: string;
  sn?: string;
  buyer_last_saldo: number;
  price: number;
  tele?: string;
  wa?: string;
}

export interface TransactionResponse {
  data: TransactionData;
}
