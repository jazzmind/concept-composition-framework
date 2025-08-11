import { Frames } from "./frames";

export type Mapping = Record<string, unknown>;
export type Frame = Record<symbol, unknown>;

export type ActionFunction<TInput = Mapping, TOutput = Mapping> = (
    input: TInput,
) => TOutput;

export type ActionList = [InstrumentedAction, Mapping, Mapping?];
export interface ActionPattern {
    action: InstrumentedAction;
    concept: object;
    input: Mapping;
    output?: Mapping;
    flow: symbol;
}

interface SyncDeclaration {
    when: ActionPattern[];
    where?: (frames: Frames) => Frames;
    then: ActionPattern[];
}

export interface Synchronization extends SyncDeclaration {
    sync: string;
}

export interface InstrumentedAction extends Function {
    concept?: object;
    action?: Function;
}
export type Vars = Record<string, symbol>;

type SyncFunction = (vars: Vars) => SyncDeclaration;
export type SyncFunctionMap = Record<string, SyncFunction>;
export type Empty = Record<PropertyKey, never>;

// Concept interface definitions
export interface ConceptInterface {
    [key: string]: any;
}

export interface Action<TInput = any, TOutput = any> {
    (input: TInput): Promise<TOutput> | TOutput;
}

export interface ActionFunc<TInput = any, TOutput = any> {
    (input: TInput): Promise<TOutput> | TOutput;
}

export interface ConceptMethods {
    [actionName: string]: ActionFunc;
}

export interface SyncInterface {
    when: ActionPattern[];
    where?: (frames: Frames) => Frames;
    then: ActionPattern[];
}

export interface SyncMethods {
    [syncName: string]: SyncInterface;
}
