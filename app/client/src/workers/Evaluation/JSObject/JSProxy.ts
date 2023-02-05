import { isPromise } from "workers/Evaluation/JSObject/utils";
import { postJSFunctionExecutionLog } from "@appsmith/workers/Evaluation/JSObject/postJSFunctionExecution";
import TriggerEmitter, { BatchKey } from "../fns/utils/TriggerEmitter";

declare global {
  interface Window {
    structuredClone: (
      value: any,
      options?: StructuredSerializeOptions | undefined,
    ) => any;
  }
}
export interface JSExecutionData {
  data: unknown;
  funcName: string;
}

function saveExecutionData(name: string, data: unknown) {
  let error;
  try {
    data = self.structuredClone(data);
  } catch (e) {
    data = undefined;
    error = {
      message: `Execution of ${name} returned an unserializable data`,
    };
  }
  TriggerEmitter.emit(BatchKey.process_batched_fn_execution, {
    name,
    data,
    error,
  });
}

export function functionFactory<P extends ReadonlyArray<unknown>>(
  fn: (...args: P) => unknown,
  name: string,
  postProcessors: Array<(name: string, res: unknown) => void> = [
    saveExecutionData,
    postJSFunctionExecutionLog,
  ],
) {
  return (...args: P) => {
    try {
      const result = fn(...args);
      if (isPromise(result)) {
        result.then((res) => {
          postProcessors.forEach((p) => p(name, res));
          return res;
        });
        result.catch((e) => {
          postProcessors.forEach((p) => p(name, undefined));
          throw e;
        });
      } else {
        postProcessors.forEach((p) => p(name, result));
      }
      return result;
    } catch (e) {
      postProcessors.forEach((postProcessor) => {
        postProcessor(name, undefined);
      });
      throw e;
    }
  };
}
