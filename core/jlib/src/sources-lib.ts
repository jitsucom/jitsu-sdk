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
} from "@jitsu/types/sources";
const hash = require("object-hash");

export function makeStreamSink(msg: Pick<StreamSink, "msg">): StreamSink {
  let recordsAdded = 0;
  let transactionNumber = 0;

  return {
    addRecord(record: DataRecord) {
      if (transactionNumber == 0) {
        //implicit transaction creation
        transactionNumber = 1;
      }
      this.msg({ type: "record", message: record });
    },
    changeState(newState: Record<string, any>) {
      this.msg({ type: "state", message: newState });
    },
    log(level: JitsuLogLevel, message: string) {
      this.msg({ type: "log", message: { level: level, message: message } });
    },
    clearStream() {
      if (transactionNumber > 1 || recordsAdded > 0) {
        throw new Error(
          '"clear_stream" message allowed only in the first transaction and before any "record" message added. Current transaction number: ' +
            transactionNumber +
            " Records added: " +
            recordsAdded
        );
      }
      this.msg({ type: "clear_stream" });
    },
    deleteRecords(partitionTimestamp: Date, granularity: Granularity) {
      if (recordsAdded > 0) {
        throw new Error('"delete_records" message must precede any "record" message in transaction.');
      }
      if (transactionNumber == 0) {
        //implicit transaction creation
        transactionNumber = 1;
      }
      this.msg({
        type: "delete_records",
        message: {
          partitionTimestamp: partitionTimestamp,
          granularity: granularity,
        },
      });
    },
    newTransaction() {
      recordsAdded = 0;
      transactionNumber++;
      this.msg({ type: "new_transaction" });
    },
    msg<T extends JitsuDataMessageType, P>(m: JitsuDataMessage<T, P>) {
      if (m.type === "record") {
        recordsAdded++;
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
