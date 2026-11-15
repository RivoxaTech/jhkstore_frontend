import type { PageContent } from './types'

// EDIT PER CLIENT: the legal name of the business and any extra rules. Plain wording for a shop in Mauritius; the shop owner should check it.
const terms: PageContent = {
  title: 'Terms and conditions',
  description: 'The simple terms that apply when you order from {store}: prices, payment, delivery, returns and how we use your details.',
  lead: 'A short and simple read before you order.',
  blocks: [
    { type: 'h2', text: 'About us' },
    { type: 'p', text: 'This website is run by {store}. When you place an order you agree to these terms. You do not need an account to order.' },

    { type: 'h2', text: 'Products and prices' },
    { type: 'p', text: 'We try to describe and photograph every toy as it really is, though colours can look a little different on your screen. Prices are shown in the store currency and include VAT where it applies. If we make a pricing mistake, we will contact you and you can choose to go ahead at the right price or cancel.' },

    { type: 'h2', text: 'Your order' },
    { type: 'p', text: 'Your order is a request to buy. It becomes final when we confirm it by phone, message or email. We may cancel an order if an item is out of stock or we cannot deliver to your address, and then we will tell you and refund anything you have paid. Please give us a correct name, phone number and address so the courier can reach you.' },

    { type: 'h2', text: 'Payment' },
    { type: 'p', text: 'You can pay cash on delivery or by bank transfer. For a bank transfer, please upload the screenshot of your payment on the order page. We pack the order once the payment is checked.' },

    { type: 'h2', text: 'Delivery and returns' },
    { type: 'p', text: 'Our Shipping policy and Return policy are part of these terms. Please have a look at them, they are short.' },

    { type: 'h2', text: 'Safety' },
    { type: 'p', text: 'Every toy has an age guide. Please follow it and keep an eye on young children while they play, especially with small parts.' },

    { type: 'h2', text: 'Our responsibility' },
    { type: 'p', text: 'We take care to sell good toys and to deliver them safely. Nothing in these terms takes away your rights as a consumer under the laws of Mauritius.' },

    { type: 'h2', text: 'Changes and the law' },
    { type: 'p', text: 'We may update these terms from time to time. The version on this page on the day you order is the one that applies to your order. These terms follow the laws of Mauritius.' },

    { type: 'h2', text: 'Questions' },
    { type: 'p', text: 'Write to {email}, call {phone} or visit us at {address}.' },
  ],
}

export default terms
