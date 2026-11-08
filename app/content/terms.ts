import type { PageContent } from './types'

// EDIT PER CLIENT: the legal name of the business, governing law and any extra rules. NOT LEGAL ADVICE: a lawyer or the shop owner must review it.
const terms: PageContent = {
  title: 'Terms and conditions',
  description: 'The terms that apply when you shop at {store}: orders, prices, payment, delivery, returns and your responsibilities.',
  lead: 'Please read these terms before you place an order.',
  blocks: [
    { type: 'note', text: 'This page is a general template written for a small online toy shop. It is not legal advice. {store} must have it reviewed and completed (legal name, address, governing law) before the shop goes live.' },

    { type: 'h2', text: '1. About these terms' },
    { type: 'p', text: 'These terms apply to every order you place on this website, run by {store} ("we", "us"). By placing an order you accept them. You do not need an account to order.' },

    { type: 'h2', text: '2. Products and prices' },
    { type: 'p', text: 'We describe and photograph our toys as accurately as we can; colours may look slightly different on your screen. Prices are shown in the store currency and include or exclude tax as stated at checkout. The price you see in your cart and at checkout is the price you pay, plus the delivery fee shown there. We may change prices at any time, but never for an order that has already been placed.' },

    { type: 'h2', text: '3. Placing an order' },
    { type: 'p', text: 'Your order is an offer to buy. We accept it when we confirm it. We may refuse or cancel an order, for example when a toy is out of stock, an address cannot be served or the price was shown wrongly; if we cancel, you will not be charged, and any payment already made is refunded.' },
    { type: 'p', text: 'Please give a correct name, phone number and delivery address. Your phone number is how you track your order and how the courier reaches you.' },

    { type: 'h2', text: '4. Payment' },
    { type: 'p', text: 'We accept the payment methods shown at checkout (for example cash on delivery and bank transfer). For bank transfer, please pay into the account shown and upload a clear screenshot of the transfer; we start preparing the order once we have checked the payment. Cash on delivery may be limited for large orders.' },

    { type: 'h2', text: '5. Delivery' },
    { type: 'p', text: 'We deliver as described in our shipping policy. Delivery times are estimates. Risk of loss passes to you when the order is delivered to the address you gave.' },

    { type: 'h2', text: '6. Returns and refunds' },
    { type: 'p', text: 'Our return policy explains when and how you can return a toy and how refunds work. It forms part of these terms.' },

    { type: 'h2', text: '7. Safe use of toys' },
    { type: 'p', text: 'Toys must be used as intended and with the supervision and age guidance given on the product or the pack. Small parts can be a choking hazard for young children. We are not responsible for harm caused by misuse or by ignoring the age and safety instructions.' },

    { type: 'h2', text: '8. Our responsibility' },
    { type: 'p', text: 'We are responsible for toys that are faulty or not as described, as set out in our return policy and in the consumer law that applies to you. Beyond that, and as far as the law allows, we are not responsible for indirect losses.' },

    { type: 'h2', text: '9. Wholesale requests' },
    { type: 'p', text: 'If you send a bulk or wholesale enquiry we will contact you with a quote. A quote is not an order until both sides confirm it.' },

    { type: 'h2', text: '10. Privacy' },
    { type: 'p', text: 'How we handle your personal data is described in our privacy policy.' },

    { type: 'h2', text: '11. Changes and contact' },
    { type: 'p', text: 'We may update these terms; the version on this page when you order applies to that order. Questions? Write to {email}, call {phone} or visit us at {address}.' },
  ],
}

export default terms
