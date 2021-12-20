import { DestinationTestParams } from "@jitsu/types/tests"


export function testDestination({ name, context, destination, event, expectedResult }: DestinationTestParams) {
  test(name, () => {
    const result = destination(event, context)
    expect(result).toEqual(expectedResult)
  })
}
