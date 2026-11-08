import type { PageContent } from './types'

// EDIT PER CLIENT: the legal name, address and any tools the shop adds later. NOT LEGAL ADVICE: the shop owner must review it.
// This site uses NO analytics, advertising or tracking scripts and no customer accounts. If the client adds any, update this page.
const privacy: PageContent = {
  title: 'Privacy policy',
  description: 'What personal data {store} collects when you order or contact us, why, how long we keep it and your choices.',
  lead: 'We collect only what we need to deliver your order.',
  blocks: [
    { type: 'note', text: 'This page is a general template. It is not legal advice. {store} must review it, and complete the contact details and any legal requirements of its country, before the shop goes live.' },

    { type: 'h2', text: 'Who we are' },
    { type: 'p', text: 'This website is run by {store}. You can reach us at {email}, on {phone} or at {address}.' },

    { type: 'h2', text: 'What we collect' },
    { type: 'ul', items: [
      'When you place an order: your name, phone number, e-mail address (optional), delivery address, an optional note and what you ordered.',
      'For bank transfers: the screenshot of the payment that you upload.',
      'When you send a bulk or wholesale enquiry: your name, phone number, e-mail, business name, the product and quantity and your message.',
      'Your shopping cart is kept on our server under a random code stored in your browser, so it is still there when you come back. It contains no personal data until you enter your contact details.',
    ] },
    { type: 'p', text: 'We do not ask you to create an account, and we do not use advertising or analytics trackers on this website.' },

    { type: 'h2', text: 'Why we use it' },
    { type: 'ul', items: [
      'To process and deliver your order, and to contact you about it (by phone, and by e-mail if you gave one).',
      'To check a bank transfer and to give you support.',
      'To answer your enquiry.',
      'To keep our records, and to prevent abuse of the website (for example automated spam).',
    ] },

    { type: 'h2', text: 'Who sees it' },
    { type: 'p', text: 'Only the shop team, and the courier who delivers your order (name, phone and address). We do not sell your data. Our website hosting and e-mail providers handle data on our behalf so the site can work.' },

    { type: 'h2', text: 'How long we keep it' },
    { type: 'p', text: 'We keep order records for as long as the law requires for accounts and taxes, and enquiries for as long as needed to answer them. Unused shopping carts are deleted automatically after 30 days.' },

    { type: 'h2', text: 'Your choices' },
    { type: 'p', text: 'You can ask us what data we hold about you, to correct it or to delete it where the law allows. Write to {email}.' },

    { type: 'h2', text: 'Cookies and local storage' },
    { type: 'p', text: 'We store a few things in your browser so the shop works: your cart code, the last order number you placed and your choice of one or two toys per row. These are not used to track you.' },

    { type: 'h2', text: 'Changes' },
    { type: 'p', text: 'We may update this policy. The version on this page is the current one.' },
  ],
}

export default privacy
