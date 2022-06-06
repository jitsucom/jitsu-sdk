import { NodeVM } from "vm2";

export declare function sandbox(opts?: { globals?: Record<string, any>; file?: string }): NodeVM;
