/** The parts of the API answers the storefront uses (docs/STOREFRONT-API.md). Fields not listed here are simply not used. */

export interface Settings {
  store: { name: string; tagline: string; logo_url: string | null; favicon_url: string | null; email: string; phone: string; address: string; country: string; open: boolean; closed_message: string }
  checkout: { notice: string; eta_text: string }
  social_links: { platform: string; label: string; url: string }[]
  footer: { text: string; copyright: string; support_hours: string; whatsapp_number: string; whatsapp_url: string | null; agency: { name: string; url: string; logo_url: string | null } }
  seo: { meta_title: string; meta_description: string; share_image_url: string | null }
  currency: { code: string; symbol: string; decimals: number }
  tax: { rate: number; inclusive: boolean; label: string }
  delivery: { method: string; fee: number; free_delivery_min_cart: number; days: number }
  orders: { min_order_amount: number; cod_max_amount: number }
  payment: {
    cod: { enabled: boolean }
    bank_transfer: { enabled: boolean; proof_required: boolean; instructions: string; accounts: BankAccount[] }
    card: { visible: boolean; coming_soon: boolean }
  }
  theme: {
    primary: string; primary_contrast: string; accent: string; bg: string; surface: string; text: string; muted: string; border: string
    font_heading: string; font_body: string; radius: string; shadow: 'none' | 'soft' | 'medium'
  }
}

export interface BankAccount { bank: string; title: string; number: string; iban: string }

export interface Banner { id: number; placement: string; title: string | null; subtitle: string | null; button_text: string | null; link_url: string | null; image_url: string; mobile_image_url: string | null }

export interface SubCategory { id: number; name: string; slug: string; icon_url: string | null; image_url: string | null; meta_title: string | null; meta_description: string | null }
export interface Category extends SubCategory { description: string | null; is_top: boolean; sub_categories: SubCategory[] }

export interface ProductCard {
  id: number; name: string; slug: string; short_description: string | null
  image_url: string | null; image_width: number | null; image_height: number | null; thumb_url: string | null
  category: { name: string; slug: string }
  options_count: number; variant_id: number | null; min_order_qty: number; has_single_option: boolean; offers_count: number; show_starting_at: boolean
  badge_label: string; badge_text: string | null
  price: number | null; compare_price: number | null; discount_label: string | null; mrp: number | null
  tags: string[]; in_stock: boolean; is_sold_out: boolean; is_featured: boolean; availability: 'in_stock' | 'out_of_stock'; updated_at: string
}

export interface PriceTier { min_qty: number; price: number; extra_discount_percent: number }
export interface Picture { url: string; medium_url: string; thumb_url: string; is_primary: boolean; width: number | null; height: number | null; medium_width: number | null; medium_height: number | null }
export interface Variant {
  id: number; name: string; sku: string; is_default: boolean; mrp: number; price: number; compare_price: number | null; discount_label: string | null
  in_stock: boolean; qty: number; low_stock: boolean; price_tiers: PriceTier[]; image_url: string | null; thumb_url: string | null; images: Picture[]
}
export interface VideoItem { url: string; poster_url: string | null; mime: string | null; source: 'upload' | 'embed' }
export interface ContentTab { key: string; title: string; format: 'paragraphs' | 'bullets' | 'table'; content: string | null; manual_url: string | null }
export interface Product extends ProductCard {
  product_name: string; sku: string; sub_category: { name: string; slug: string } | null; description: string | null
  min_order_qty: number; max_order_qty: number; delivery: { days: number; arrives_by: string }
  seo: { title: string; description: string; image_url: string | null }
  breadcrumbs: { type: 'category' | 'sub_category' | 'product'; name: string; slug: string; category_slug?: string }[]
  content_tabs: ContentTab[]; variants: Variant[]; images: Picture[]; videos: VideoItem[]; related: ProductCard[]
}

export interface Paginated<T> { data: T[]; meta: { current_page: number; last_page: number; total: number; per_page: number } }

export interface Warning { code: string; message: string; blocking?: boolean }
export interface CartLine {
  variant_id: number; product_id: number; slug: string; name: string; option_name: string | null; image_url: string | null; thumb_url: string | null
  qty: number; min_order_qty: number; max_order_qty: number; available_qty: number; price: number; unit_price: number; line_total: number
  mrp: number; saving: number; bulk_applied: { min_qty: number; price: number; label?: string } | null
  next_offer: { min_qty: number; price: number; add_qty: number; hint: string } | null
  can_buy: boolean; warnings: Warning[]
}
export interface QuoteSummary {
  items_total: number; subtotal: number; discount_total: number; coupon_code: string | null; coupon_discount: number; coupon_free_delivery: boolean
  coupon_error: { code: string; message: string } | null
  delivery_method: string; delivery_fee: number | null; delivery_pending: boolean; delivery_needs_address: boolean
  delivery_zone: { id: number; name: string; eta_text: string | null } | null; delivery_eta_text: string | null; delivery_free: boolean
  amount_for_free_delivery: number | null; grand_total: number; total_savings: number; tax_total: number; tax_inclusive: boolean; tax_label: string; min_order_amount: number
}
export interface Quote {
  items: CartLine[]; summary: QuoteSummary; can_checkout: boolean; issues: { code: string; message: string }[]
}
export interface Cart extends Quote {
  token: string; contact: { name: string | null; phone: string | null; email: string | null }; items_count: number; lines_count: number
}

export interface OrderPayment {
  method: string; method_label: string; status: string; proof_status: 'none' | 'submitted' | 'verified' | 'rejected'; reject_reason: string | null
  can_upload_proof: boolean; instructions?: string; accounts?: BankAccount[]
}
export interface Order {
  order_number: string; status: string; status_label: string; placed_at: string; estimated_delivery_date: string | null; items_count: number; grand_total: number
  payment_method: string; payment_method_label: string; payment_status: string; payment: OrderPayment
  delivery_fee_pending: boolean; reject_reason: string | null; cancel_reason: string | null; store_phone: string | null; whatsapp_url: string | null
  customer: { name: string; phone: string; email: string | null }; customer_note: string | null
  items: { id: number; name: string; option_name: string | null; image_url: string | null; qty: number; unit_price: number; line_total: number }[]
  shipping_address: Record<string, string | null>
  totals: Record<string, any>
  tracking: { courier: string | null; awb_number: string | null; tracking_url: string | null; shipped_at: string | null } | null
  timeline: { status: string; label: string; note: string | null; at: string }[]
}
