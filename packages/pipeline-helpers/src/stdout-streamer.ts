import { StateService, StreamConfiguration, StreamReader, StreamSink } from "@jitsu/types/sources";


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

/**
 * Makes a simplified version of StreamReader (see above)
 */
export function stoutStreamReader(stream: StreamReader) {
  throw new Error('Not implemented')
}