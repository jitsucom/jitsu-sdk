import {
  DataRecord,
  JitsuDataMessage,
  JitsuDataMessageType,
  JitsuLogLevel,
  StateService,
  StreamConfiguration,
  StreamReader,
  StreamSink,
} from "@jitsu/types/sources";
import { LocalStorage } from "@segment/analytics-next";

export function makeStreamSink(msg: Pick<StreamSink, "msg">): StreamSink {
  return {
    addRecord(record: DataRecord) {
      msg.msg({ type: "record", message: record });
    },
    log(level: JitsuLogLevel, message: string) {
      msg.msg({ type: "log", message: { level: level, message: message } });
    },
    clearStream() {
      msg.msg({ type: "clear_stream" });
    },
    deleteRecords(condition: string, values: any) {
      msg.msg({
        type: "delete_records",
        message: {
          whenCondition: {
            expression: condition,
            values: Array.isArray(values) ? values : [values],
          },
        },
      });
    },
    newTransaction() {
      this.msg({ type: "new_transaction" });
    },
    ...msg,
  };
}

/**
 * A facade of StreamReader. It takes an output messages from StreamReader and outputs it to
 * stdout. State is taken from stdin, and changes of state is written to stdout as separate
 * change_state message (see ChangeStateMessage)
 *
 */
declare type StdoutStreamReaderFacade<Config = Record<string, any>, StreamConfig = Record<string, any>> = (
  sourceConfig: Config,
  streamName: string,
  streamConfiguration: StreamConfiguration<StreamConfig>,
  state: Record<string, any>
) => Promise<void>;

function stateService(state: Record<string, any>): StateService {
  return {
    set(key: string, object: any, opts: { expireInMs?: number }) {
      throw new Error("set() - state service is not implemented");
    },
    get(key: string): any {
      throw new Error("get() - state service is not implemented");
    },
  };
}

/**
 * Makes a simplified version of StreamReader (see above)
 */
export function stdoutStreamReader(stream: StreamReader): StdoutStreamReaderFacade {
  return async (sourceConfig, streamName, streamConfiguration, state) => {
    await stream(
      sourceConfig,
      streamName,
      streamConfiguration,
      makeStreamSink({
        msg: <T extends JitsuDataMessageType, P>(msg: JitsuDataMessage<T, P>) => {
          process.stdout.write(`${JSON.stringify(msg)}\n`);
        },
      }),
      { state: stateService(state) }
    );
  };
}
