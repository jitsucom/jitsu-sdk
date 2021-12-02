import { JitsuEvent } from "@jitsu/jitsu-types/src/event"
import { JitsuContext, DestinationMessage } from "@jitsu/jitsu-types/src/destination"

type DestinationTestParams = {
  name: string
  context: JitsuContext
  transform: ($: JitsuEvent, context: JitsuContext) => DestinationMessage[] | DestinationMessage | null
  event: JitsuEvent
  expectedResult: DestinationMessage[] | DestinationMessage | null
}

export function testDestination({ name, context, transform, event, expectedResult }: DestinationTestParams) {
  test(name, () => {
    const result = transform(event, context)
    expect(result).toEqual(expectedResult)
  })
}
