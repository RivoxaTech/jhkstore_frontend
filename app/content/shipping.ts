import type { PageContent } from './types'

// EDIT PER CLIENT: delivery areas, times, fees and couriers. The wording is generic: the shop owner must review it. Not legal advice.
const shipping: PageContent = {
  title: 'Shipping policy',
  description: 'How {store} delivers your order: delivery areas, times, fees, tracking and what to do if something goes wrong.',
  lead: 'How and when your order reaches you.',
  blocks: [
    { type: 'note', text: 'This page is a general template. {store} should review and adjust it to its own delivery service before the shop goes live.' },

    { type: 'h2', text: 'Where we deliver' },
    { type: 'p', text: 'We deliver to the addresses shown at checkout. Enter your address and the checkout tells you straight away whether we deliver there, what it costs and how long it takes. If your address is not covered yet, please contact us: we may be able to arrange something.' },

    { type: 'h2', text: 'Delivery times' },
    { type: 'p', text: 'Orders are usually packed within one to two working days. After that, delivery normally takes the time shown at checkout (an estimate for your area). Delivery estimates are not a promise: busy periods, weather and courier delays can add a little time.' },

    { type: 'h2', text: 'Delivery fees' },
    { type: 'p', text: 'The delivery fee depends on your area and the size of your order. You always see it before you place the order, and some orders qualify for free delivery. In some cases the shop confirms the delivery fee after you order; the order then shows "delivery fee to be confirmed" and we tell you the amount before we send anything.' },

    { type: 'h2', text: 'Tracking your order' },
    { type: 'p', text: 'When your order is shipped you can see the courier and the tracking number on the Track order page. Enter your order number and the phone number you used at checkout. If you gave an e-mail address we also write to you when your order changes.' },

    { type: 'h2', text: 'Paying on delivery' },
    { type: 'p', text: 'If you choose cash on delivery, please have the exact amount ready when the courier arrives. Cash on delivery may not be offered for very large orders.' },

    { type: 'h2', text: 'When your order arrives' },
    { type: 'ul', items: [
      'Please check that the parcel is closed and undamaged before you accept it.',
      'If the parcel is damaged or something is missing, tell the courier and contact us the same day with your order number and a photo.',
      'Keep the packaging until you are happy with your toys: it makes a return or exchange much easier.',
    ] },

    { type: 'h2', text: 'Questions' },
    { type: 'p', text: 'Write to {email} or call {phone}. {hours}' },
  ],
}

export default shipping
