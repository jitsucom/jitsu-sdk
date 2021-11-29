import { JitsuEvent } from "@jitsu/jitsu-types/src/event"
import { JitsuContext, DestinationMessage } from "@jitsu/jitsu-types/src/destination"

export default function transformFunction(
  event: JitsuEvent,
  context: JitsuContext
): DestinationMessage[] | DestinationMessage | null {
  switch (event.event_type) {
    case "page_view":
      return {
        method: "POST",
        url: context.baseUrl + "/page",
        headers: {
          "Content-Type": "application/json",
        },
        body: { ...event, destinationId: context.destinationId },
      }
    case "conversion":
      //Event multiplexing
      let results: DestinationMessage[] = []
      for (const product of event.products) {
        results.push({
          method: "POST",
          url: context.baseUrl + "/purchase",
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            event_type: "purchase",
            product_id: product.id,
            price: product.price,
          },
        })
      }
      return results
    default:
      //skip
      return null
  }
}
