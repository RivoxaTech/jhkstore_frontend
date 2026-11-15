import type { PageContent } from './types'

// EDIT PER CLIENT: the legal name and address. Written for a shop in Mauritius (Data Protection Act 2017); the shop owner should check it.
// This site uses no analytics, advertising or tracking scripts and no customer accounts. If the shop adds any, update this page.
const privacy: PageContent = {
  title: 'Privacy policy',
  description: 'What personal details {store} keeps when you order or write to us, why we keep them and what you can ask us to do.',
  lead: 'We only keep what we need to deliver your order.',
  blocks: [
    { type: 'h2', text: 'Who we are' },
    { type: 'p', text: 'This website is run by {store}. You can reach us at {email}, on {phone} or at {address}. We look after your details as the law of Mauritius asks, including the Data Protection Act 2017.' },

    { type: 'h2', text: 'What we keep' },
    { type: 'ul', items: [
      'When you order: your name, phone number, delivery address, email if you give one, and what you ordered.',
      'If you pay by bank transfer: the screenshot you upload.',
      'When you send a wholesale enquiry: your name, phone, email, business name, BRN if you give one, and your message.',
      'Your cart is kept in your browser so it is still there when you come back. We do not use advertising or tracking tools.',
    ] },

    { type: 'h2', text: 'Why we keep it' },
    { type: 'p', text: 'To prepare and deliver your order, to contact you about it, to answer your questions, and to keep the records a business has to keep. We do not use your details for anything else, and we do not sell them.' },

    { type: 'h2', text: 'Who sees it' },
    { type: 'p', text: 'Our team, and the courier who delivers your order (your name, phone and address). The companies that host our website and send our emails also handle your details for us. Nobody else, unless the law requires it.' },

    { type: 'h2', text: 'How long we keep it' },
    { type: 'p', text: 'For as long as we need it to serve you and to meet our accounting and legal duties. After that we delete it or make it anonymous.' },

    { type: 'h2', text: 'Your choices' },
    { type: 'p', text: 'You can ask to see the details we hold about you, to correct them, or to have them deleted where the law allows. Write to {email} and we will answer as soon as we can. If you are not happy with how we handled your details, you can also contact the Data Protection Office of Mauritius.' },
  ],
}

export default privacy
