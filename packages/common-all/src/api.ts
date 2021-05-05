import {
  BulkAddNoteOpts,
  ConfigGetPayload,
  ConfigWriteOpts,
  DendronError,
  DEngineDeleteSchemaPayload,
  DEngineQuery,
  DNodeProps,
  DVault,
  EngineDeleteNotePayload,
  EngineDeleteOptsV2,
  EngineInfoResp,
  EngineQueryNoteResp,
  EngineUpdateNodesOptsV2,
  EngineWriteOptsV2,
  GetNoteOptsV2,
  GetNotePayload,
  NoteProps,
  NotePropsDict,
  RenameNoteOpts,
  RenameNotePayload,
  RespRequired,
  RespV2,
  SchemaModuleDict,
  SchemaModuleProps,
  WriteNoteResp,
} from "@dendronhq/common-all";
import axios, { AxiosInstance } from "axios";
import _ from "lodash";
import * as querystring from "qs";

// === Types

export function createNoOpLogger() {
  const logMethod = (_msg: any) => {};
  return {
    level: "",
    debug: logMethod,
    info: logMethod,
    error: logMethod,
  };
}

export type APIErrorType =
  | "does_not_exist_error"
  | "not_authorized_error"
  | "unknown_error"
  | "invalid_request_error";

export interface IAPIErrorArgs {
  type: APIErrorType;
  message?: string;
  code?: number;
}

interface IRequestArgs {
  headers: any;
}

interface IAPIPayload {
  data: null | any | any[];
  error: null | DendronError;
}

interface IAPIOpts {
  endpoint: string;
  apiPath: string;
  _request: AxiosInstance;
  logger: any;
  statusHandlers: any;
  onAuth: (opts: IRequestArgs) => Promise<any>;
  onBuildHeaders: ({}: IRequestArgs) => Promise<any>;
  onError: ({}: {
    err: DendronError;
    body: any;
    resp: any;
    headers: any;
    qs: any;
    path: string;
    method: string;
  }) => any;
}

type IAPIConstructor = {
  endpoint: string;
  apiPath: string;
} & Partial<IAPIOpts>;

interface IDoRequestArgs {
  path: string;
  auth?: boolean;
  qs?: any;
  body?: any;
  method?: "get" | "post";
  json?: boolean;
}

interface IStatusHandler {
  resp: any;
}

type APIPayload<T = any> = {
  error: DendronError | null;
  data?: T;
};

// === Utilities

const APIError = DendronError;

const STATUS_HANDLERS = {
  401: {
    isErr: true,
    handler: ({ resp }: IStatusHandler) =>
      new APIError({ status: "not_authorized_error", code: resp.statusCode }),
  },
  404: {
    isErr: true,
    handler: ({ resp }: IStatusHandler) =>
      new APIError({ code: resp.statusCode, status: "does_not_exist_error" }),
  },
  502: {
    isErr: true,
    handler: ({ resp }: IStatusHandler) =>
      new APIError({ code: resp.statusCode, status: "unknown_error" }),
  },
};

// --- Requests
export type WorkspaceInitRequest = {
  uri: string;
  config: {
    vaults: DVault[];
  };
};
export type WorkspaceSyncRequest = WorkspaceRequest;

export type WorkspaceRequest = { ws: string };

export type EngineQueryRequest = DEngineQuery & { ws: string };
export type EngineGetNoteByPathRequest = GetNoteOptsV2 & { ws: string };
export type EngineRenameNoteRequest = RenameNoteOpts & { ws: string };
export type EngineUpdateNoteRequest = { ws: string } & {
  note: NoteProps;
  opts?: EngineUpdateNodesOptsV2;
};
export type EngineWriteRequest = {
  node: DNodeProps;
  opts?: EngineWriteOptsV2;
} & { ws: string };
export type EngineDeleteRequest = {
  id: string;
  opts?: EngineDeleteOptsV2;
} & { ws: string };
export type EngineBulkAddRequest = {
  opts: BulkAddNoteOpts;
} & { ws: string };

export type EngineInfoRequest = WorkspaceRequest;
export type NoteQueryRequest = {
  qs: string;
} & Partial<WorkspaceRequest>;

export type SchemaDeleteRequest = {
  id: string;
  opts?: EngineDeleteOptsV2;
} & Partial<WorkspaceRequest>;
export type SchemaReadRequest = {
  id: string;
} & Partial<WorkspaceRequest>;
export type SchemaQueryRequest = {
  qs: string;
} & Partial<WorkspaceRequest>;
export type SchemaWriteRequest = {
  schema: SchemaModuleProps;
} & WorkspaceRequest;

export type SchemaUpdateRequest = SchemaWriteRequest;

// --- Payload
export type InitializePayload = APIPayload<{
  notes: NotePropsDict;
  schemas: SchemaModuleDict;
}>;

export type WorkspaceSyncPayload = InitializePayload;
export type WorkspaceListPayload = APIPayload<{ workspaces: string[] }>;

export type EngineQueryPayload = APIPayload<DNodeProps[]>;
export type EngineGetNoteByPathPayload = APIPayload<GetNotePayload>;
export type EngineRenameNotePayload = APIPayload<RenameNotePayload>;
export type EngineUpdateNotePayload = APIPayload<NoteProps>;
export type EngineDeletePayload = APIPayload<EngineDeleteNotePayload>;

export type SchemaDeletePayload = APIPayload<DEngineDeleteSchemaPayload>;
export type SchemaReadPayload = APIPayload<SchemaModuleProps>;
export type SchemaQueryPayload = APIPayload<SchemaModuleProps[]>;
export type SchemaWritePayload = APIPayload<void>;
export type SchemaUpdatePayload = APIPayload<void>;

// === Base

abstract class API {
  public opts: IAPIOpts;

  constructor(opts: IAPIConstructor) {
    opts = _.defaults(opts, {
      logger: createNoOpLogger(),
      statusHandlers: {},
      onAuth: async ({ headers }: IRequestArgs): Promise<any> => headers,
      onBuildHeaders: ({ headers }: IRequestArgs): Promise<any> => headers,
      onError: (_args: any) => {
        // console.log(args);
      },
    });
    if (!opts._request) {
      opts._request = axios.create({});
    }

    this.opts = opts as IAPIOpts;
  }

  _log(msg: any, lvl: "info" | "debug" | "error" | "fatal" = "info") {
    this.opts.logger[lvl](msg);
  }

  _createPayload(data: any) {
    return {
      error: null,
      data,
    };
  }

  async _doRequest({
    auth = false,
    qs = {},
    path,
    body = {},
    method = "get",
    json = true,
  }: IDoRequestArgs) {
    let headers = {};
    const { _request, onAuth, onBuildHeaders, endpoint, apiPath } = this.opts;
    if (auth) {
      headers = await onAuth({ headers });
    }
    headers = await onBuildHeaders({ headers });
    const requestParams = {
      url: [endpoint, apiPath, path].join("/"),
      qs,
      body,
      json,
      ...headers,
    };
    this._log({ ctx: "pre-request", requestParams }, "debug");
    const str = querystring.stringify(requestParams.qs);
    if (method === "get") {
      return _request.get(requestParams.url + `?${str}`, {
        headers,
      });
    } else {
      return _request.post(requestParams.url + `?${str}`, body, {
        headers,
      });
    }
  }

  async _makeRequest<T extends IAPIPayload>(
    args: IDoRequestArgs,
    paylaodData?: T["data"]
  ): Promise<T> {
    let payload = this._createPayload(paylaodData) as T;
    try {
      const resp = await this._doRequest(args);
      payload.data = resp.data.data;
      payload.error = resp.data.error;
    } catch (err) {
      payload.error = err;
    }
    if (payload.error) {
      this._log(payload.error, "error");
    }
    return payload;
  }
}

// === DendronAPI

class DendronAPI extends API {
  static instance: DendronAPI;

  async configGet(
    req: WorkspaceRequest
  ): Promise<APIPayload<ConfigGetPayload>> {
    const resp = await this._makeRequest({
      path: "config/get",
      method: "get",
      qs: req,
    });
    return resp;
  }

  async configWrite(
    req: ConfigWriteOpts & WorkspaceRequest
  ): Promise<RespV2<void>> {
    const resp = await this._makeRequest({
      path: "config/write",
      method: "post",
      body: req,
    });
    return resp;
  }

  async workspaceInit(req: WorkspaceInitRequest): Promise<InitializePayload> {
    const resp = await this._makeRequest({
      path: "workspace/initialize",
      method: "post",
      body: {
        ...req,
      },
    });
    return resp;
  }

  async workspaceList(): Promise<WorkspaceListPayload> {
    const resp = await this._makeRequest({
      path: "workspace/all",
      method: "get",
    });
    return resp;
  }

  async workspaceSync(req: WorkspaceSyncRequest): Promise<InitializePayload> {
    const resp = await this._makeRequest({
      path: "workspace/sync",
      method: "post",
      body: req,
    });
    return resp;
  }

  async engineBulkAdd(req: EngineBulkAddRequest): Promise<WriteNoteResp> {
    const resp = await this._makeRequest({
      path: "note/bulkAdd",
      method: "post",
      body: req,
    });
    return resp;
  }

  async engineDelete(req: EngineDeleteRequest): Promise<EngineDeletePayload> {
    const resp = await this._makeRequest({
      path: "note/delete",
      method: "post",
      body: req,
    });
    return resp;
  }

  async engineGetNoteByPath(
    req: EngineGetNoteByPathRequest
  ): Promise<EngineGetNoteByPathPayload> {
    const resp = await this._makeRequest({
      path: "note/getByPath",
      method: "post",
      body: req,
    });
    return resp;
  }

  async engineInfo(): Promise<RespRequired<EngineInfoResp>> {
    const resp = await this._makeRequest({
      path: "note/info",
      method: "get",
    });
    return resp;
  }

  async engineRenameNote(
    req: EngineRenameNoteRequest
  ): Promise<EngineRenameNotePayload> {
    const resp = await this._makeRequest({
      path: "note/rename",
      method: "post",
      body: req,
    });
    return resp;
  }

  async engineUpdateNote(
    req: EngineUpdateNoteRequest
  ): Promise<EngineUpdateNotePayload> {
    const resp = await this._makeRequest({
      path: "note/update",
      method: "post",
      body: req,
    });
    return resp;
  }

  async engineWrite(req: EngineWriteRequest): Promise<WriteNoteResp> {
    const resp = await this._makeRequest({
      path: "note/write",
      method: "post",
      body: req,
    });
    return resp;
  }

  async noteQuery(req: NoteQueryRequest): Promise<EngineQueryNoteResp> {
    const resp = await this._makeRequest({
      path: "note/query",
      method: "get",
      qs: req,
    });
    return resp;
  }

  async schemaDelete(req: SchemaDeleteRequest): Promise<SchemaDeletePayload> {
    const resp = await this._makeRequest({
      path: "schema/delete",
      method: "post",
      body: req,
    });
    return resp;
  }

  async schemaRead(req: SchemaReadRequest): Promise<SchemaReadPayload> {
    const resp = await this._makeRequest({
      path: "schema/get",
      method: "get",
      qs: req,
    });
    return resp;
  }

  async schemaQuery(req: SchemaQueryRequest): Promise<SchemaQueryPayload> {
    const resp = await this._makeRequest({
      path: "schema/query",
      method: "post",
      body: req,
    });
    return resp;
  }

  async schemaWrite(req: SchemaWriteRequest): Promise<SchemaWritePayload> {
    const resp = await this._makeRequest({
      path: "schema/write",
      method: "post",
      body: req,
    });
    return resp;
  }

  async schemaUpdate(req: SchemaUpdateRequest): Promise<SchemaUpdatePayload> {
    const resp = await this._makeRequest({
      path: "schema/update",
      method: "post",
      body: req,
    });
    return resp;
  }
}

export const DendronApiV2 = DendronAPI;