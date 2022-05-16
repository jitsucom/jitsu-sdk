import {
  Condition,
  DataRecord,
  JitsuDataMessage,
  JitsuDataMessageType,
  JitsuLogLevel,
  StateService,
  StreamConfiguration,
  StreamReader,
  StreamSink,
  WhenClause,
} from "@jitsu/types/sources";
const hash = require("object-hash");

export function makeStreamSink(msg: Pick<StreamSink, "msg">): StreamSink {
  return {
    addRecord(record: DataRecord) {
      msg.msg({ type: "record", message: record });
    },
    changeState(newState: Record<string, any>) {
      msg.msg({ type: "state", message: newState });
    },
    log(level: JitsuLogLevel, message: string) {
      msg.msg({ type: "log", message: { level: level, message: message } });
    },
    clearStream() {
      msg.msg({ type: "clear_stream" });
    },
    deleteRecords(field: string, clause: WhenClause, value: any) {
      msg.msg({
        type: "delete_records",
        message: {
          joinCondition: "AND",
          whenConditions: [{ field: field, clause: clause, value: value }],
        },
      });
    },
    newTransaction() {
      this.msg({ type: "new_transaction" });
    },
    ...msg,
  };
}

export function buildSignatureId(obj: any): string {
  return hash(obj);
}

/**
 * A facade of StreamReader. It takes an output messages from StreamReader and outputs it to
 * stdout. State is taken from stdin, and changes of state is written to stdout as separate
 * state message (see StateMessage)
 *
 */
declare type StdoutStreamReaderFacade<Config = Record<string, any>, StreamConfig = Record<string, any>> = (
  sourceConfig: Config,
  streamName: string,
  streamConfiguration: StreamConfiguration<StreamConfig>,
  state: Record<string, any>
) => Promise<void>;

function stateService(state: Record<string, any>, sink: StreamSink): StateService {
  const currentState = state || {};
  return {
    set(key: string, object: any) {
      currentState[key] = object;
      sink.changeState(currentState);
    },
    get(key: string): any {
      return currentState[key];
    },
  };
}

/**
 * Makes a simplified version of StreamReader (see above)
 */
export function stdoutStreamReader(stream: StreamReader): StdoutStreamReaderFacade {
  return async (sourceConfig, streamName, streamConfiguration, state) => {
    const sink = makeStreamSink({
      msg: <T extends JitsuDataMessageType, P>(msg: JitsuDataMessage<T, P>) => {
        process.stdout.write(`${JSON.stringify(msg)}\n`);
      },
    });
    await stream(sourceConfig, streamName, streamConfiguration, sink, { state: stateService(state, sink) });
  };
}
