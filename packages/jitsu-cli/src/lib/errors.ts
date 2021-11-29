export function appendError(msg: string, cause: any): string {
  if (cause && cause.message) {
    return `${msg}: ${cause.message}`
  } else if (cause && typeof cause === "string") {
    return `${msg}: ${cause}`
  } else if (cause) {
    return `${msg}: ${cause.toString()}`
  } else {
    return msg
  }
}
