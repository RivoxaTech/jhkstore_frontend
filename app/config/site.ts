/**
 * The texts and settings of the storefront that are NOT in the admin panel. Edit this file per client, then rebuild.
 * Everything that IS in the admin panel (store name, logo, tagline, contact details, banners, theme colours, payment and delivery settings) comes from the API
 * and is not repeated here.
 *
 * Two-colour headings: text between *asterisks* is shown in the accent colour.
 */
export const site = {
  /** The main menu (the centred links of the header). */
  nav: [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ],

  /** Used while no `home_hero` banner is live (and as the first picture while the banner loads). The hero picture is /images/hero-fallback.jpg. */
  heroFallback: {
    title: 'Smart Toys for *Bright Futures*',
    subtitle: 'Safe, Educational & Fun Toys for Your Little Ones',
    buttonText: 'Shop Now',
    buttonLink: '/shop',
    image: '/images/hero-fallback.jpg',
  },

  /** Used while no `home_secondary` banner is live. The picture is /images/gift-fallback.jpg. */
  giftFallback: {
    title: 'Perfect Gift for Every *Little Dreamer*',
    subtitle: "Explore our toys and bring joy to your child's world.",
    buttonText: 'Shop All Products',
    buttonLink: '/shop',
    image: '/images/gift-fallback.jpg',
  },

  /** The white bar under the hero. `icon` is one of: shield, truck, headset, refresh. */
  trust: [
    { icon: 'shield', title: 'Safe & Non-Toxic', text: '100% Child Safe' },
    { icon: 'truck', title: 'Fast Delivery', text: 'Across the country' },
    { icon: 'headset', title: '24/7 Support', text: "We're Here to Help" },
    { icon: 'refresh', title: 'Easy Returns', text: 'Hassle-Free' },
  ],

  /** The "Our Collection" section of the home page. `{count}` = the number of products shown. */
  collection: {
    label: 'Our Collection',
    title: 'Top {count} Toys for *Your Child*',
    subtitle: 'Discover our handpicked selection of educational and fun toys.',
    /** More than this many products: show the first ones and a "View all products" button. */
    homeLimit: 12,
  },

  /** The right-aligned line at the bottom of the footer. */
  footerTagline: 'Safe Toys. Happy Kids.',
  /** The line under the footer logo when the store has no tagline of its own. */
  footerFallbackTagline: 'Play. Learn. Grow.',

  footer: {
    quickLinks: [
      { label: 'Home', to: '/' },
      { label: 'Shop', to: '/shop' },
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
    support: [
      { label: 'Shipping', to: '/shipping-policy' },
      { label: 'Returns', to: '/return-policy' },
      { label: 'Terms & Conditions', to: '/terms-and-conditions' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
    ],
    followText: 'Follow us for latest updates!',
  },

  /** The default title of a page without one of its own: "<page> | <store name>". */
  titleSeparator: ' | ',
}
