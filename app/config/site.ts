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
    { label: 'Wholesale', to: '/wholesale' },
  ],

  /**
   * The hero comes from the `home_hero` banners of the admin panel. While there is none, a plain hero shows the store name and tagline (both from the
   * admin panel) with this button. The gift strip (`home_secondary`) is shown only when a banner exists.
   */
  heroFallback: { buttonText: 'Shop now', buttonLink: '/shop' },

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
    /** Used instead while the shop has fewer than 3 products ("Top 1 Toys" would read badly). */
    titleFew: 'Toys for *Your Child*',
    subtitle: 'Discover our handpicked selection of educational and fun toys.',
    /** More than this many products: show the first ones and a "View all products" button. */
    homeLimit: 12,
  },

  footer: {
    quickLinks: [
      { label: 'Home', to: '/' },
      { label: 'Shop', to: '/shop' },
      { label: 'About', to: '/about' },
      { label: 'Wholesale', to: '/wholesale' },
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
