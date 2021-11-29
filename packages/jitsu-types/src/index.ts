import { JitsuEvent } from "./event"
import { JitsuContext, DestinationMessage } from "./destination"

type DestinatioTestParams = {
  name: string
  context: JitsuContext
  transform: ($: JitsuEvent, context: JitsuContext) => DestinationMessage[] | DestinationMessage | null
  event: JitsuEvent
  expectedResult: DestinationMessage[] | DestinationMessage | null
}

export function testDestination({ name, context, transform, event, expectedResult }: DestinatioTestParams) {
  test(name, () => {
    const result = transform(event, context)
    expect(result).toEqual(expectedResult)
  })
}
