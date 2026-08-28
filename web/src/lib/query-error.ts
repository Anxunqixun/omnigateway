export function shouldNavigateToServerErrorPage(
  url: string | undefined,
  status: number | undefined
): boolean {
  if (status !== 500) return false
  if (!url) return true
  return !url.includes('/api/data/')
}
