/**
 * The part of a reported share address that may be sent to the service. An
 * encrypted share carries its decryption key after '#'; that key must never
 * leave this browser, so everything from the first '#' on is cut here,
 * before the address is put in any request.
 */
export function shareAddressForLookup(text: string): { address: string; droppedFragment: boolean } {
  const trimmed = text.trim()
  const at = trimmed.indexOf('#')
  if (at < 0) return { address: trimmed, droppedFragment: false }
  return { address: trimmed.slice(0, at).trim(), droppedFragment: true }
}
