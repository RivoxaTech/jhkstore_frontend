/**
 * Products per row on a phone: ONE by default, a small toggle in the grid header switches to two. The choice is kept in localStorage.
 * (Tablets show 2 to 3 columns and desktops 4: those come from CSS and ignore this.)
 */
const KEY = 'jhk_grid_cols'

export function useGrid() {
  const cols = useState<1 | 2>('grid-cols', () => 1)

  function load() {
    try { cols.value = localStorage.getItem(KEY) === '2' ? 2 : 1 } catch { /* keep the default */ }
  }
  function set(value: 1 | 2) {
    cols.value = value
    try { localStorage.setItem(KEY, String(value)) } catch { /* private mode */ }
  }
  return { cols, load, set }
}
