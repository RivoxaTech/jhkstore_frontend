import type { PageContent } from './types'

// EDIT PER CLIENT: the return window (14 days below) and who pays the return delivery. Plain wording for a shop in Mauritius; the shop owner should check it.
const returns: PageContent = {
  title: 'Return policy',
  description: 'Returns and refunds at {store}: when you can send a toy back, how to do it and how we refund you.',
  lead: 'If something is not right, tell us and we will fix it.',
  blocks: [
    { type: 'h2', text: 'If there is a problem' },
    { type: 'p', text: 'If a toy arrives damaged, does not work or is not what you ordered, contact us. We will repair it, replace it or refund you, whichever you prefer. In these cases we pay for the return delivery.' },

    { type: 'h2', text: 'Changed your mind?' },
    { type: 'p', text: 'You can return a toy within 14 days of receiving it, as long as it is unused and in its original condition, ideally in its box. For this kind of return the delivery back to us is paid by you. We are happy to exchange it for something else if you prefer, depending on stock.' },

    { type: 'h2', text: 'What we cannot take back' },
    { type: 'ul', items: [
      'Toys that have been used or damaged after delivery.',
      'Opened bath and teething toys, for hygiene reasons, unless they are faulty.',
      'Craft and science kits that have been opened and used.',
    ] },

    { type: 'h2', text: 'How to return something' },
    { type: 'ol', items: [
      'Write to {email} or call {phone} with your order number. A photo helps if the toy is damaged.',
      'We will tell you where to send it.',
      'Pack it safely and keep the courier receipt.',
      'Once we have checked it, we send your replacement or refund.',
    ] },

    { type: 'h2', text: 'Refunds' },
    { type: 'p', text: 'Refunds go back the way you paid. If you paid cash on delivery, we will agree a bank transfer with you. You should have your money within about 7 working days after we receive the toy.' },

    { type: 'p', text: 'Nothing on this page limits the rights you have as a consumer under the laws of Mauritius.' },
  ],
}

export default returns
