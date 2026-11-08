import type { PageContent } from './types'

// EDIT PER CLIENT: the story, and the four trust points (they match the trust bar in app/config/site.ts).
const about: PageContent = {
  title: 'About us',
  description: 'Safe, educational and joyful toys for children. Learn who we are, why we care about safe play and why families choose {store}.',
  lead: 'Safe, educational and fun toys for your little ones.',
  blocks: [
    { type: 'h2', text: 'Our story' },
    { type: 'p', text: '{store} started with a simple wish: to find toys that are fun for children and easy on parents\' minds. We looked for toys that are well made, safe to hold and chew, and good for growing imaginations. They were harder to find than they should have been, so we began choosing them ourselves.' },
    { type: 'p', text: 'Today we bring together a handpicked range of building toys, soft friends, puzzles, outdoor play, craft sets and baby toys. Every toy has to pass one test: would we give it to a child we love?' },

    { type: 'h2', text: 'Why safe and educational toys matter' },
    { type: 'p', text: 'Children learn by playing. Stacking blocks teaches balance and patience, puzzles train problem solving, a soft toy helps a child feel safe, and a paintbrush opens a door to creativity. The right toy at the right age supports movement, language and confidence, and it is simply more fun.' },
    { type: 'p', text: 'Safety comes first. Small hands and mouths explore everything, so we choose toys with rounded edges, non-toxic paints and finishes, and clear age guidance on the pack.' },

    { type: 'h2', text: 'Why choose {store}' },
    {
      type: 'features',
      items: [
        { title: 'Safe and non-toxic', text: 'Child-safe materials and finishes, with age advice on every product.' },
        { title: 'Fast delivery', text: 'Orders are packed with care and sent quickly. You always see the delivery fee before you order.' },
        { title: '24/7 support', text: 'Questions about a toy or an order? Write to us any time and we will help.' },
        { title: 'Easy returns', text: 'If something is not right, we will make it right. See our return policy for the details.' },
      ],
    },

    { type: 'h2', text: 'Get in touch' },
    { type: 'p', text: 'We love hearing from parents, grandparents and gift-givers. Reach us on {phone}, write to {email}, or use the contact page. {hours}' },
    { type: 'cta', text: 'Ready to find the perfect toy?', button: 'Shop now', to: '/shop' },
  ],
}

export default about
