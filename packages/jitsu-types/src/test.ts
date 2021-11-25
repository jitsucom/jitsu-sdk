import {JitsuEvent} from "./event";
import {DestinationContext, DestinationMessage} from "./destination";


export function testDestination({name, context, transform, event,expectedResult}:{name: string, context: DestinationContext, transform: ($: JitsuEvent, context: DestinationContext) => DestinationMessage[] | DestinationMessage | null, event: JitsuEvent, expectedResult: DestinationMessage[] | DestinationMessage | null}) {
    test(name, () => {
        const result = transform(event, context)
        expect(result).toEqual(expectedResult);
    })
}