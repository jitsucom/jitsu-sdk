import * as _ from "lodash";

function transform(event: any) {
    _.set(event, "a.b.c", 'val')
}

const meta = {}

export default transform;

export { meta }




