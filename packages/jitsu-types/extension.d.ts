import { DefaultJitsuEvent } from "./event";
import { ConfigurationParameter } from "./parameters";
import { Config } from "prettier";

/**
 * Jitsu plugin structure. This datatype isn't used anywhere but rather demonstrates the structure of
 * export of every plugin.
 *
 * Following exports works for following module types:
 *  - export {descriptor, destination}             - destination plugin
 *  - export {descriptor, destination, validator}  - destination plugin, with validation enabled
 *  - export {descriptor, transform, destination}  - will not work, the extension can't support transformations
 *                                                   and destination both
 */
export declare type JitsuExtensionExport = {
  /**
   * Descriptor of the plugin
   */
  descriptor: ExtensionDescriptor;
  /**
   * Extension can export transformation logic. The transformation logic
   * is applied before event is sent to destination
   */
  transform?: TransformationFunction;
  /**
   * If destination symbol is exported, the extension will be treated as a destination extension.
   * It means that the extension is a complete control of how data should be landed to destination.
   */
  destination?: DestinationFunction;
  /**
   * Optional configuration validator. Validator could call HTTP interface to validate
   * credentials, or other extension settings
   */
  validator?: ConfigValidator;
};

/**
 * A loose definition of set. Includes singleton, array or null / undefined (meaning empty set)
 */
type ObjectSet<T> = T | T[] | undefined | null;

/**
 * Transformation function. The extension can export one in order to define transformation function.
 *
 * Transformation function accepts event and returns a set of event (that can be empty): F(event) => [event]
 *
 * Type-wise, the signature looks different: for convenience it could return either single event, or undefined (meaning
 * no events should be transformed).
 */
export declare type TransformationFunction<E = DefaultJitsuEvent> = (event: E) => ObjectSet<E>;

/**
 * Context data containing destinationId, destinationType
 * and provided values for DestinationDescriptor's configurationParameters
 */
export declare type JitsuDestinationContext<Config = Record<string, any>> = {
  /**
   * Unique Id of configured destination instance on Jitsu server
   */
  destinationId: string;
  /**
   * Destination type id
   */
  destinationType: string;
  /**
   * Configuration if destination (values of DestinationDescriptor.configurationParameters)
   */
  config: Config;
};

/**
 * The result of DestinationFunction: http request, that will be issued asynchronously
 */
export declare type DestinationMessage = {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: { [key: string]: string };
  body: any;
};
/**
 * See ConfigValidator
 *  - `true`   is equivalent of {ok: true}
 *  - `string` is equivalent of {ok: false, message: string}
 */
type ConfigValidationResult = { ok: true; message?: string } | { ok: false; message: string } | boolean | string;

/**
 * Verifies configuration. Should return {ok: true} or just `true` if connection
 * has been successfully, or {status: false, message: string} if connection failed.
 *
 * Can use fetch to connect to external APIs
 */
export declare type ConfigValidator<Config = Record<string, any>> = (config: Config) => Promise<ConfigValidationResult>;

/**
 * Destination function. The adapter accepts JitsuEvent and returns a set of HTTP request.
 *
 * Avoid using `fetch` if possible. Just return
 * @param event incoming event
 * @param context context of the processing
 */
export declare type DestinationFunction<E = DefaultJitsuEvent, Config = Record<string, any>> = (
  event: E,
  context: JitsuDestinationContext<Config>
) => ObjectSet<DestinationMessage>;

/**
 * Describes the extension
 */
export declare type ExtensionDescriptor = {
  /**
   * Extension id. If extension is published as NPM package, it should match NPM package name
   */
  id: string;
  /**
   * Extension display name
   */
  displayName: string;
  /**
   *  Extension description. Can contain HTML
   */
  description: string;
  /**
   * Can be either URL to PNG or SVG image or HTML string containing SVG
   */
  icon?: string;
  /**
   * List of configuration parameters
   */
  configurationParameters: ConfigurationParameter[];
};
