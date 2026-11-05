declare module '@tweakpane/core' {
  export interface TpChangeEvent<T = unknown> {
    value: T;
    last: boolean;
  }

  export interface BindingParams {
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: Record<string, string | number>;
  }

  export interface BindingApi<T = unknown> {
    on(
      eventName: 'change',
      handler: (ev: TpChangeEvent<T>) => void
    ): BindingApi<T>;
    dispose(): void;
  }

  export interface ButtonParams {
    title: string;
    label?: string;
  }

  export interface ButtonApi {
    on(eventName: 'click', handler: () => void): ButtonApi;
    dispose(): void;
  }

  export interface FolderParams {
    title: string;
    expanded?: boolean;
  }

  export class FolderApi {
    addBinding<O extends object, K extends keyof O>(
      object: O,
      key: K,
      opt_params?: BindingParams
    ): BindingApi<O[K]>;
    addFolder(params: FolderParams): FolderApi;
    addButton(params: ButtonParams): ButtonApi;
    refresh(): void;
    dispose(): void;
  }

  export type TpPluginBundle = unknown;
  export type PluginPool = unknown;
}
