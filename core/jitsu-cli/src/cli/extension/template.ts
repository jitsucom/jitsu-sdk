import { ProjectTemplate } from "../../lib/template";
import { jitsuCliVersion } from "../../lib/version";

export type TemplateVars = {
  license?: "MIT" | "Other";
  packageName: string;
  type: "destination" | "source" | "transform";
  jitsuVersion?: string;
};

export const packageJsonTemplate = ({ packageName, type, jitsuVersion = undefined }: TemplateVars) => ({
  name: `${packageName}`,
  version: "0.0.1",
  description: `Jitsu ${type} - ${packageName}`,
  main: `dist/${packageName}.js`,
  scripts: {
    clean: "rm -rf ./dist",
    build: "jitsu-cli extension build",
    test: "jitsu-cli extension test",
    "validate-config": "jitsu-cli extension validate-config",
    execute: `jitsu-cli extension ${type == "destination" ? "exec" : "exec-src"}`,
  },
  devDependencies: {
    "@jitsu/types": `${jitsuVersion || "^" + jitsuCliVersion}`,
    "@jitsu/jlib": `${jitsuVersion || "^" + jitsuCliVersion}`,
    "jitsu-cli": `${jitsuVersion || "^" + jitsuCliVersion}`,
    tslib: "^2.3.1",
    typescript: "^4.5.2",
  },
  dependencies: {},
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

let sourceCode = () => {
  return `
    import { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
    import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";
    
    export interface SourceConfig {
      user_id: string
      my_source_param: string;
    }
    
    export interface StreamConfig {
      my_stream_param: string;
    }
    
    async function validator(config: SourceConfig): Promise<ConfigValidationResult> {
      //TODO: Check that provided config data allows to connect to third party API 
      console.log("validator is not yet implemented");
      return true;
    }
    
    const descriptor: ExtensionDescriptor<SourceConfig> = {
      id: "my_source",
      displayName: "Source Example",
      description:
        "Example source that produces row with run number and source/stream configuration.",
      configurationParameters: [
        {
          displayName: "User ID",
          id: "user_id",
          type: "string",
          required: true,
          documentation: "User Id",
        },
        {
          displayName: "Example Parameter",
          id: "my_source_param",
          required: true,
          type: "string",
          documentation: \`
            <div>
                Example Parameter
            </div>
            \`,
        }
      ],
    };
    
    const sourceCatalog: SourceCatalog<SourceConfig, StreamConfig> = async config => {
      return [
        {
          type: "my_source_runs",
          supportedModes: ["incremental"],
          params: [
            {
              id: "my_stream_param",
              displayName: "Stream Parameter",
              type: "string",
              documentation: \`
                <div>
                  Stream Parameter example.
                </div>
              \`,
              required: true,
            },
          ]
        }
      ];
    };
    
    const streamReader: StreamReader<SourceConfig, StreamConfig> = async (
      sourceConfig: SourceConfig,
      streamType: string,
      streamConfiguration: StreamConfiguration<StreamConfig>,
      streamSink: StreamSink,
      services: { state: StateService }
    ) => {
        //Example of saved state usage. Read previous run number:
        let runNumber = services.state.get("run_number") || 0;
        runNumber++ 
        streamSink.log("INFO", "Run number: " + runNumber);
        streamSink.addRecord({
            $id: runNumber,
            $recordTimestamp: new Date(),
            type: streamType,
            ...sourceConfig,
            ...streamConfiguration.parameters
        });
        //Save last run number to state
        services.state.set("run_number", runNumber);
    };
    
    export { streamReader, sourceCatalog, descriptor, validator };
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

descriptor["destination"] = (vars: TemplateVars) => `
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

descriptor["transform"] = (vars: TemplateVars) =>
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
export const extensionProjectTemplate: ProjectTemplate<TemplateVars> = {
  "__test__/destination.test.ts": destinationTest,
  "src/destination.ts": vars => vars.type == "destination" && destinationCode(),
  "src/transform.ts": vars => vars.type == "transform" && transformCode(),
  "src/index.ts": vars => (vars.type == "source" ? sourceCode() : descriptor[vars.type](vars)),
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
