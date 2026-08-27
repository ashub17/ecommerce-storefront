/**
 * Types mirroring the Laravel API's resource classes.
 *
 * Every endpoint answers with the same envelope:
 *   { message, data, meta? }
 *
 * `data` is an object for a single record, an array for a list, and null for
 * deletes. `meta` is present only on paginated lists. Keeping these in one
 * file means a change to the API surfaces here as a type error rather than as
 * an undefined at runtime.
 */

export type ApiResponse<T> = {
  message: string;
  data: T;
};

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type ApiPaginated<T> = ApiResponse<T[]> & {
  meta: PaginationMeta;
};

/** The shape returned by the API's 422 handler. */
export type ApiValidationErrors = Record<string, string[]>;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  image_url: string | null;
  parent_id: number | null;
  is_active: boolean;
  /** Present only when the relation is loaded, e.g. ?tree=1 */
  parent?: Category | null;
  children?: Category[];
  products_count?: number;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: number;
  product_id: number;
  image_path: string;
  image_url: string | null;
  sort_order: number;
};

export type Product = {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  sku: string;
  short_description: string | null;
  description: string | null;
  /** Decimals arrive as strings from Laravel's decimal cast. */
  price: string;
  sale_price: string | null;
  current_price: number;
  stock_quantity: number;
  in_stock: boolean;
  featured_image: string | null;
  featured_image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  category?: Category;
  images?: ProductImage[];
  created_at: string;
  updated_at: string;
};

/** GET /api/catalog/facets */
export type CatalogFacets = {
  price: { min: number; max: number };
  categories: Array<{
    id: number;
    name: string;
    slug: string;
    parent_id: number | null;
    products_count: number;
  }>;
  total: number;
  sorts: ProductSort[];
};

export const PRODUCT_SORTS = [
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export type CartItem = {
  id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
  price: string;
  subtotal: number;
  product?: Product;
  created_at: string;
  updated_at: string;
};

export type Cart = {
  id: number;
  user_id: number;
  subtotal: number;
  total_items: number;
  items?: CartItem[];
  created_at: string;
  updated_at: string;
};

/** A line the server could not honour in full during a guest-cart merge. */
export type CartAdjustment = {
  product_id: number;
  product_name?: string;
  reason: "unavailable" | "out_of_stock" | "quantity_reduced";
  requested?: number;
  granted?: number;
  message: string;
};

export type CartMergeResult = {
  cart: Cart;
  adjustments: CartAdjustment[];
};

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderStatus =
  "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export type Address = {
  id: number;
  user_id: number;
  type: "shipping" | "billing";
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  created_at: string;
  updated_at: string;
};

/** The address shape checkout submits, mirroring StoreOrderRequest. */
export type AddressInput = {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state?: string | null;
  postal_code?: string | null;
  country: string;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  product_price: string;
  quantity: number;
  subtotal: string;
  product?: Product;
};

export type OrderStatusHistory = {
  id: number;
  type: "status" | "payment_status";
  from: string | null;
  to: string;
  note: string | null;
  changed_by?: string | null;
  created_at: string;
};

export type Payment = {
  id: number;
  order_id: number;
  gateway: string;
  reference: string;
  amount: string;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  captured_at: string | null;
  created_at: string;
};

export type Order = {
  id: number;
  user_id: number;
  order_number: string;
  subtotal: string;
  tax: string;
  shipping_fee: string;
  total: string;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  is_cancellable: boolean;
  shipping_address_id: number | null;
  billing_address_id: number | null;
  user?: User;
  items?: OrderItem[];
  shipping_address?: Address;
  billing_address?: Address;
  status_histories?: OrderStatusHistory[];
  payments?: Payment[];
  created_at: string;
  updated_at: string;
};

export type CheckoutInput = {
  shipping_address: AddressInput;
  same_as_shipping: boolean;
  billing_address?: AddressInput;
};

// ---------------------------------------------------------------------------
// Auth and content
// ---------------------------------------------------------------------------

export type User = {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  roles?: string[];
  created_at: string;
  updated_at: string;
};

/** Auth endpoints extend the envelope with a sibling `token`. */
export type AuthResponse = ApiResponse<User> & {
  token: string;
};

export type Banner = {
  id: number;
  title: string;
  subtitle: string | null;
  button_text: string | null;
  button_link: string | null;
  image: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type ContentBlock = {
  id: number;
  key: string;
  title: string;
  content: string | null;
  image: string | null;
  image_url: string | null;
  meta: Record<string, unknown> | null;
  is_active: boolean;
};
