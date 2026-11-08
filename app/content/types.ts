/**
 * Static page content. No CMS: these files ARE the pages. Edit the text here, rebuild the site.
 *
 * Placeholders in any text: {store} {email} {phone} {address} {hours} are replaced with the values of GET /settings
 * (store name, contact e-mail, phone, address, support hours). When a value is empty the sentence that holds it is
 * still readable ("our wholesale page" is used instead of an empty e-mail address).
 *
 * Sections marked EDIT PER CLIENT are the ones a client usually changes (delivery times, return window, company name).
 */
export type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'note'; text: string }
  | { type: 'features'; items: { title: string; text: string }[] }
  | { type: 'cta'; text: string; button: string; to: string }
  /** The phone, e-mail, address and support hours of the admin panel as small cards (only the ones the shop filled in). */
  | { type: 'contact' }

export interface PageContent {
  /** The page title and the <h1>. */
  title: string
  /** The meta description (about 150 characters). */
  description: string
  /** A short line under the title. */
  lead?: string
  blocks: Block[]
}
