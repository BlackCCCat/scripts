const EMAIL_PATTERN = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/gi
const ORDER_PATTERN = /(?<![A-Z0-9])[A-Z0-9]{10}(?![A-Z0-9])/gi
const ORDER_LABEL_PATTERN = /(?:订单(?:号|编号)?|ORDER\s*(?:ID|NO\.?|NUMBER)?|ORDERID)\s*[:：#-]?\s*([A-Z0-9]{10})(?![A-Z0-9])/i

const normalizeOCRText = (text: string): string => text
  .replace(/[＠﹫]/g, "@").replace(/[。．]/g, ".").replace(/[：]/g, ":")

export const extractOCRFields = (text: string): { email: string | null, orderId: string | null } => {
  const cleaned = normalizeOCRText(text)
  const emails = Array.from(new Set((cleaned.match(EMAIL_PATTERN) ?? [])
    .map((value: string) => value.replace(/[),.;:，。；：]+$/g, "").toLowerCase())))
  const upperText = cleaned.toUpperCase()
  const labeled = upperText.split(/\r?\n/)
    .map((line: string) => line.match(ORDER_LABEL_PATTERN)?.[1] ?? "").filter(Boolean)
  const withoutEmails = emails.reduce((value: string, email: string) => value.replace(
    new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " "
  ), upperText)
  const orderIds = Array.from(new Set([...labeled, ...(withoutEmails.match(ORDER_PATTERN) ?? [])]
    .map((value: string) => value.toUpperCase())))
  return { email: emails[0] ?? null, orderId: orderIds[0] ?? null }
}

export const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
export const isValidOrderId = (value: string): boolean => /^[A-Z0-9]{10}$/.test(value.trim().toUpperCase())
