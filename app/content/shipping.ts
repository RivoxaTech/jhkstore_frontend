import type { PageContent } from './types'

// EDIT PER CLIENT: delivery areas, times and fees. Plain wording for a shop in Mauritius; the shop owner should check it matches how they really deliver.
const shipping: PageContent = {
  title: 'Shipping policy',
  description: 'How {store} delivers your order in Mauritius: where we deliver, how long it takes, what it costs and how to track it.',
  lead: 'How and when your order reaches you.',
  blocks: [
    { type: 'h2', text: 'Where we deliver' },
    { type: 'p', text: 'We deliver all over Mauritius. Rodrigues and the outer islands usually take a little longer. If you are outside Mauritius, send us a message and we will check what is possible and give you a price.' },

    { type: 'h2', text: 'How long it takes' },
    { type: 'p', text: 'We pack most orders within one working day. Delivery in Mauritius then takes about one to three working days. The checkout shows an estimate for your address. It is only an estimate, so a busy week or bad weather can add a day.' },

    { type: 'h2', text: 'What it costs' },
    { type: 'p', text: 'The delivery fee depends on where you live and what you order. You see it at checkout before you confirm, and some orders get free delivery. If we need to confirm the fee after you order, we will tell you the amount before we send anything.' },

    { type: 'h2', text: 'Paying for your order' },
    { type: 'p', text: 'You can pay cash when the parcel arrives, or by bank transfer. For cash on delivery, please have the amount ready. For a bank transfer, upload the screenshot on your order page and we will start packing once we have checked it.' },

    { type: 'h2', text: 'Tracking' },
    { type: 'p', text: 'Use the Track order page with your order number and the phone number you gave us. You can see where your order is, and the courier details once it has been shipped.' },

    { type: 'h2', text: 'When it arrives' },
    { type: 'p', text: 'Please have a quick look at the parcel before you sign. If it is damaged or something is missing, tell the courier and message us the same day with your order number and a photo. We will sort it out.' },

    { type: 'h2', text: 'Need help?' },
    { type: 'p', text: 'Write to {email} or call {phone}. {hours}' },
  ],
}

export default shipping
