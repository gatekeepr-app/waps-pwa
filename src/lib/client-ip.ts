/** Client IP from a header set by a trusted proxy.
 *
 *  Opt-in via TRUSTED_IP_HEADER because arbitrary client-supplied forwarding
 *  headers are spoofable. Leave it unset unless the deployment terminates
 *  requests at a proxy that overwrites the header.
 */
export function trustedClientIp(
  headers: Headers,
  headerName = process.env.TRUSTED_IP_HEADER
): string | null {
  if (!headerName) return null
  const raw = headers.get(headerName)
  if (!raw) return null
  const ip = raw.split(',')[0].trim()
  if (!ip || ip.length > 64 || /[^0-9a-fA-F:.]/.test(ip)) return null
  return ip
}
