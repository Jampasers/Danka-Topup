export interface IPrice {
  id?: number;

  product_name: string;
  category: string;
  brand: string;
  type: string;
  seller_name: string;
  price: number;
  buyer_sku_code: string;

  buyer_product_status: boolean;
  seller_product_status: boolean;
  unlimited_stock: boolean;
  multi: boolean;

  stock?: number | null;
  start_cut_off?: string | null;
  end_cut_off?: string | null;
  desc?: string | null;

  updated_at?: string;
  created_at?: string;
}
