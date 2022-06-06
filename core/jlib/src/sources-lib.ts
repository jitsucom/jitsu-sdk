import {
  DataRecord,
  Granularity,
  JitsuDataMessage,
  JitsuDataMessageType,
  JitsuLogLevel,
  StateService,
  StreamConfiguration,
  StreamReader,
  StreamSink,
  StreamSyncMode,
} from "@jitsu/types/sources";
const hash = require("object-hash");

export function makeStreamSink(msg: Pick<StreamSink, "msg">, mode?: StreamSyncMode): StreamSink {
  let recordsAdded = 0;
  let transactionNumber = 0;

  return {
    addRecord(record: DataRecord) {
      this.msg({ type: "record", message: record });
    },
    changeState(newState: Record<string, any>) {
      this.msg({ type: "state", message: newState });
    },
    log(level: JitsuLogLevel, message: string) {
      this.msg({ type: "log", message: { level: level, message: message } });
    },
    clearStream() {
      this.msg({ type: "clear_stream" });
    },
    deleteRecords(partitionTimestamp: Date, granularity: Granularity) {
      this.msg({
        type: "delete_records",
        message: {
          partitionTimestamp: partitionTimestamp,
          granularity: granularity,
        },
      });
    },
    newTransaction() {
      this.msg({ type: "new_transaction" });
    },
    msg<T extends JitsuDataMessageType, P>(m: JitsuDataMessage<T, P>) {
      switch (m.type) {
        case "record":
          if (transactionNumber == 0) {
            //implicit transaction creation
            transactionNumber = 1;
          }
          recordsAdded++;
          break;
        case "state":
          break;
        case "log":
          break;
        case "clear_stream":
          if (mode == "full_sync") {
            throw new Error('"clear_stream" message is not supported in full_sync mode');
          }
          if (transactionNumber > 1 || recordsAdded > 0) {
            throw new Error(
              '"clear_stream" message allowed only in the first transaction and before any "record" message added. Current transaction number: ' +
                transactionNumber +
                " Records added: " +
                recordsAdded
            );
          }
          break;
        case "delete_records":
          if (mode == "full_sync") {
            throw new Error('"delete_records" message is not supported in full_sync mode');
          }
          if (recordsAdded > 0) {
            throw new Error('"delete_records" message must precede any "record" message in transaction.');
          }
          if (transactionNumber == 0) {
            //implicit transaction creation
            transactionNumber = 1;
          }
          break;
        case "new_transaction":
          if (mode == "full_sync") {
            throw new Error('"new_transaction" message is not supported in full_sync mode');
          }
          recordsAdded = 0;
          transactionNumber++;
          break;
      }
      msg.msg(m);
    },
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

export function stateService(state: Record<string, any>, sink: StreamSink): StateService {
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
