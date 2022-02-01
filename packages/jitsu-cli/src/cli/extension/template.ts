import { ProjectTemplate } from "../../lib/template";
import { jitsuCliVersion } from "../../lib/version";

export type DestinationTemplateVars = {
  license?: "MIT" | "Other";
  packageName: string;
  type: "destination" | "transform";
  jitsuVersion?: string;
};

export const packageJsonTemplate = ({ packageName, type, jitsuVersion = undefined }: DestinationTemplateVars) => ({
  name: `${packageName}`,
  version: "0.0.1",
  description: `Jitsu ${type} - ${packageName}`,
  main: `dist/${packageName}.js`,
  scripts: {
    build: "jitsu-cli extension build",
    test: "jitsu-cli extension test",
    "validate-config": "jitsu-cli extension validate-config",
    exec: 'jitsu-cli extension exec'
  },
  devDependencies: {
    "@jitsu/types": `${jitsuVersion || "^" + jitsuCliVersion}`,
    typescript: "^4.5.2",
  },
  dependencies: {
    "jitsu-cli": `${jitsuVersion || "^" + jitsuCliVersion}`,
    tslib: "^2.3.1",
  },
});

let destinationTest = ({ type = "destination" }) => {
  if (type !== "destination") {
    return undefined;
  }
  return `
    import { JitsuDestinationContext } from "@jitsu/types/extension"
    import { testDestination } from "jitsu-cli/lib/tests"
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
`;
};

let destinationCode = () => {
  return `
    import { DestinationFunction, DestinationMessage, JitsuDestinationContext, ConfigValidator} from "@jitsu/types/extension";
    import { DefaultJitsuEvent } from "@jitsu/types/event";
    
    export type DestinationConfig = {
      exampleParam: string
    }  
    
    export const validator: ConfigValidator<DestinationConfig> = async (config: DestinationConfig) => {
      if (config.exampleParam !== 'valid-config') {
        return \`Invalid config: exampleParam expected to be 'valid-config', but actual value is: \${config.exampleParam}\`;
      }
      return true;
    }

    export const destination: DestinationFunction = (event: DefaultJitsuEvent, dstContext: JitsuDestinationContext<DestinationConfig>) => {
      return { url: "https://test.com", method: "POST", body: { a: (event.a || 0) + 1 } };
    };
`;
};

let transformCode = () => {
  return `
    import {Destination, DestinationMessage, JitsuDestinationContext} from "@jitsu/types/destination";
    import {DefaultJitsuEvent} from "@jitsu/types/event";
    
    //duplicate events 
    const transform: TransformationFunction = (event: DefaultJitsuEvent) => {
      return [event, {...event, eventn_ctx_event_id: event.eventn_ctx_event_id + "_2"}] 
    }

    export default jitsuAdapter;
`;
};

let descriptor = {};

descriptor["destination"] = (vars: DestinationTemplateVars) => `
  import {ExtensionDescriptor} from "@jitsu/types/extension";
  import {destination, validator, DestinationConfig} from "./destination";

  const descriptor: ExtensionDescriptor = {
    id: "${vars.packageName}",
    displayName: "${vars.packageName}",
    icon: "",
    description: "Jitsu destination - ${vars.packageName} (generated by 'jitsu-cli extension create')",
    configurationParameters: [
      {id: "exampleParam", type: "string", required: true, displayName: "Example param", documentation: "Documentation"}
    ],
  };

  export { descriptor, destination, validator };
`;

descriptor["transform"] = (vars: DestinationTemplateVars) =>
  `
  import {DestinationAdapter, DestinationDescriptor} from "@jitsu/types/destination";
  import jitsuAdapter from "./adapter";

  const adapter: DestinationAdapter = jitsuAdapter

  const descriptor: DestinationDescriptor = {
    type: "${vars.packageName}",
    displayName: "${vars.packageName}",
    icon: "",
    description: "Jitsu ${vars.type} - ${vars.packageName} (generated by 'jitsu-cli extension create)'",
    configurationParameters: [
      //put configuration here
    ]
  }

  export {descriptor, adapter}
`;
export const extensionProjectTemplate: ProjectTemplate<DestinationTemplateVars> = {
  "__test__/destination.test.ts": destinationTest,
  "src/destination.ts": vars => vars.type == "destination" && destinationCode(),
  "src/transform.ts": vars => vars.type == "transform" && transformCode(),
  "src/index.ts": vars => descriptor[vars.type](vars),
  "package.json": packageJsonTemplate,
  "tsconfig.json": {
    compilerOptions: {
      module: "ES2020",
      target: "ES2021",
      moduleResolution: "Node",
      esModuleInterop: true,
      outDir: "./dist",
      rootDir: "./",
    },
    include: ["./src", "__test__"],
  },
};
