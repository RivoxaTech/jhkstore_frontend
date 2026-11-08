import type { PageContent } from './types'

// EDIT PER CLIENT: the return window (7 days below), who pays for return shipping, refund method. Not legal advice: the shop owner must review it.
const returns: PageContent = {
  title: 'Return policy',
  description: 'Easy returns at {store}: when you can return a toy, how to do it and how refunds work.',
  lead: 'If something is not right, we will make it right.',
  blocks: [
    { type: 'note', text: 'This page is a general template. {store} should review and adjust it (for example the number of days) before the shop goes live. It does not replace the consumer rights that apply where you live.' },

    { type: 'h2', text: 'Our promise' },
    { type: 'p', text: 'We want every child to love their toy. If a toy arrives damaged or faulty, or it is not what you ordered, tell us and we will repair, replace or refund it.' },

    { type: 'h2', text: 'When you can return a toy' },
    { type: 'ul', items: [
      'Within 7 days of receiving your order.',
      'The toy is unused, in its original condition and, where possible, in its original packaging.',
      'The toy arrived damaged, faulty or different from your order (we pay the return shipping in these cases).',
    ] },

    { type: 'h2', text: 'What we cannot take back' },
    { type: 'ul', items: [
      'Toys that have been used, damaged by the customer or washed against the care advice.',
      'Opened items that cannot be resold for hygiene reasons (for example teething and bath toys), unless they are faulty.',
      'Craft and science kits that have been opened and used.',
    ] },

    { type: 'h2', text: 'How to return something' },
    { type: 'ol', items: [
      'Contact us at {email} or {phone} with your order number and the reason for the return. A photo helps if the toy is damaged.',
      'We reply with the next steps and, if needed, a return address.',
      'Pack the toy safely and send it back. Keep the receipt from the courier.',
      'When we receive and check the toy we confirm your refund or send the replacement.',
    ] },

    { type: 'h2', text: 'Refunds' },
    { type: 'p', text: 'Approved refunds are made the same way you paid: cash on delivery orders are refunded by bank transfer or another method we agree with you, and bank transfer orders are refunded to the account you paid from. Refunds usually arrive within 7 working days after we receive the toy.' },

    { type: 'h2', text: 'Exchanges' },
    { type: 'p', text: 'Want a different toy instead? Contact us within the return period and we will arrange an exchange, subject to stock.' },

    { type: 'h2', text: 'Questions' },
    { type: 'p', text: 'Write to {email} or call {phone}. {hours}' },
  ],
}

export default returns
