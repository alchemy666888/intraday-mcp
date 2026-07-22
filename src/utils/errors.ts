export class AppError extends Error { constructor(public code:string, public safeMessage:string, public retryable=false, public safeDetails:Record<string,unknown>={}){super(safeMessage);} }
export class UpstreamTimeoutError extends AppError { constructor(){super("UPSTREAM_TIMEOUT","Upstream request timed out",true);} }
export class UpstreamHttpError extends AppError { constructor(status:number){super("UPSTREAM_HTTP","Upstream HTTP error",[429,502,503,504].includes(status),{status});} }
export class UpstreamSchemaError extends AppError { constructor(){super("UPSTREAM_SCHEMA","Upstream payload failed validation",false);} }
export class DataUnavailableError extends AppError { constructor(details={}){super("DATA_UNAVAILABLE","Requested market data is unavailable",false,details);} }
