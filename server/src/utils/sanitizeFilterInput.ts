/**
 * Sanitizes user-supplied filter values before they are interpolated into a
 * PostgREST .or() filter string.
 *
 * PostgREST uses a custom filter grammar where the following characters carry
 * special meaning and could allow an attacker to inject additional filter
 * clauses if left unescaped:
 *   ,  .  (  )  *  %  _
 *
 * This helper strips those characters from any value that will be embedded in
 * a .or() string filter.
 */
export function sanitizeFilterInput(value: string): string {
  return value.replace(/[,\.\(\)\*%_]/g, '').trim();
}
