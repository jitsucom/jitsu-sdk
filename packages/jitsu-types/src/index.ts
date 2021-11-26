import {JitsuEvent} from "./event";
import {JitsuContext, DestinationMessage} from "./destination";


export function testDestination({name, context, transform, event,expectedResult}:{name: string, context: JitsuContext, transform: ($: JitsuEvent, context: JitsuContext) => DestinationMessage[] | DestinationMessage | null, event: JitsuEvent, expectedResult: DestinationMessage[] | DestinationMessage | null}) {
    test(name, () => {
        const result = transform(event, context)
        expect(result).toEqual(expectedResult);
    })
}