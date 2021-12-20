import { ProjectTemplate } from "../lib/template"
import { jitsuCliVersion } from "../lib/version"

export type DestinationTemplateVars = {
  license?: "MIT" | "Other"
  packageName: string
  type: "destination" | "transform"
  jitsuVersion?: string
}

export const packageJsonTemplate = ({ packageName, type, jitsuVersion = undefined }: DestinationTemplateVars) => ({
  name: `${packageName}`,
  version: "0.0.1",
  description: `Jitsu ${type} - ${packageName}`,
  main: `dist/${packageName}.js`,
  scripts: {
    build: "jitsu extension build",
    test: "jitsu extension test",
  },
  devDependencies: {
    "ts-jest": "latest",
    "@jitsu/types": `${jitsuVersion || "^" + jitsuCliVersion}`,
    typescript: "^4.5.2",
  },
  dependencies: {
    "@jitsu/cli": `${jitsuVersion || "^" + jitsuCliVersion}`,
    tslib: "^2.3.1",
  },
})



let destinationTest = ({ type = "destination" }) => {
  if (type !== "destination") {
    return undefined
  }
  return `
    import { JitsuDestinationContext } from "@jitsu/types/extension"
    import { testDestination } from "@jitsu/cli/lib/tests"
    import { destination } from "../src"

    testDestination({
      name: "basic",
      context: {
        destinationId: "test",
        destinationType: "mydest",
        config: {}
      },
      destination: destination,
      event: {
        event_type: 'test',
        a: 1
      },
      expectedResult: {
        method: "POST",
        url: "https://test.com",
        body: { a: 2 },
      },
    })
`
}

let destinationCode = () => {
  return `
    import { DestinationFunction, DestinationMessage, JitsuDestinationContext } from "@jitsu/types/extension";
    import { JitsuEvent } from "@jitsu/types/event";

    const destination: DestinationFunction = (event: JitsuEvent, dstContext: JitsuDestinationContext) => {
      return { url: "https://test.com", method: "POST", body: { a: (event.a || 0) + 1 } };
    };

    export default destination;
`
}

let transformCode = () => {
  return `
    import {Destination, DestinationMessage, JitsuDestinationContext} from "@jitsu/types/destination";
    import {JitsuEvent} from "@jitsu/types/event";
    
    //duplicate events 
    const transform: TransformationFunction = (event: JitsuEvent) => {
      return [event, {...event, eventn_ctx_event_id: event.eventn_ctx_event_id + "_2"}] 
    }

    export default jitsuAdapter;
`
}


let descriptor = {};

descriptor["destination"] = (vars: DestinationTemplateVars) => `
  import { DestinationFunction, ExtensionDescriptor } from "@jitsu/types/extension";
  import destination from "./destination";

  const descriptor: ExtensionDescriptor = {
    id: "${vars.packageName}",
    displayName: "${vars.packageName}",
    icon: "",
    description: "Jitsu destination - testprj (generated by 'jitsu extension create)'",
    configurationParameters: [
      //put configuration here
    ],
  };

  export { descriptor, destination };
`;

descriptor['transform'] = (vars: DestinationTemplateVars) =>
  `
  import {DestinationAdapter, DestinationDescriptor} from "@jitsu/types/destination";
  import jitsuAdapter from "./adapter";

  const adapter: DestinationAdapter = jitsuAdapter

  const descriptor: DestinationDescriptor = {
    type: "${vars.packageName}",
    displayName: "${vars.packageName}",
    icon: "",
    description: "Jitsu ${vars.type} - ${vars.packageName} (generated by 'jitsu extension create)'",
    configurationParameters: [
      //put configuration here
    ]
  }

  export {descriptor, adapter}
`
export const extensionProjectTemplate: ProjectTemplate<DestinationTemplateVars> = {
  "__test__/destination.test.ts": destinationTest,
  "src/destination.ts": (vars) => vars.type == 'destination' && destinationCode(),
  "src/transform.ts": (vars) => vars.type == 'transform' && transformCode(),
  "src/index.ts": (vars) => descriptor[vars.type](vars),
  "package.json": packageJsonTemplate,
  "tsconfig.json": {
    compilerOptions: {
      module: "ESNext",
      moduleResolution: "Node",
      esModuleInterop: true,
      outDir: "./dist",
      rootDir: "./",
    },
    include: ["./src", "__test__"],
  },
}