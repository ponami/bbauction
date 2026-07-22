function normalizeWhitespace(value?: string) {
  return (value || "").trim().replace(/\s+/g, " ")
}

function tokenizeAddress(value?: string) {
  return normalizeWhitespace(value).split(" ").filter(Boolean)
}

function isRoadToken(token: string) {
  return /(로|길|대로|번길|거리)$/.test(token)
}

function isDetailToken(token: string) {
  return /^\d+(?:-\d+)?$/.test(token) || /^\d+(?:동|호|층)$/.test(token)
}

function isNeighborhoodToken(token: string) {
  return /(동|읍|면|리|가)$/.test(token)
}

export function normalizeAddressQuery(address?: string) {
  const tokens = tokenizeAddress(address)
  if (tokens.length === 0) return ""

  const result: string[] = []
  for (const token of tokens) {
    if (isDetailToken(token)) {
      result.push(token)
      break
    }

    if (isRoadToken(token) && result.length > 0) {
      break
    }

    result.push(token)
  }

  return result.join(" ").trim() || normalizeWhitespace(address)
}

export function extractLocationKeyword(address?: string) {
  const tokens = tokenizeAddress(address)
  if (tokens.length === 0) return ""

  const result: string[] = []
  for (const token of tokens) {
    if (isDetailToken(token)) break
    if (isRoadToken(token)) {
      if (result.length === 0) result.push(token)
      break
    }
    result.push(token)
  }

  return result.join(" ").trim() || tokens[0]
}

export function normalizeAddressText(address?: string) {
  return normalizeWhitespace(address)
}

export function extractNeighborhoodName(address?: string) {
  const tokens = tokenizeAddress(address)
  for (const token of tokens) {
    if (isDetailToken(token)) break
    if (isNeighborhoodToken(token)) return token.trim()
    if (isRoadToken(token)) break
  }
  return ""
}

export function normalizeNeighborhoodName(name?: string) {
  return normalizeWhitespace(name).replace(/\s+/g, "")
}

export function isSameNeighborhood(a?: string, b?: string) {
  const left = normalizeNeighborhoodName(a)
  const right = normalizeNeighborhoodName(b)
  if (!left || !right) return false
  return left === right
}
