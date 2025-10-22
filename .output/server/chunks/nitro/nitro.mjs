import http, { Server } from "node:http";
import { Server as Server$1 } from "node:https";
import { promises } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
var suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
var suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
var JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key$1, value) {
	if (key$1 === "__proto__" || key$1 === "constructor" && value && typeof value === "object" && "prototype" in value) {
		warnKeyDropped(key$1);
		return;
	}
	return value;
}
function warnKeyDropped(key$1) {
	console.warn(`[destr] Dropping "${key$1}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
	if (typeof value !== "string") return value;
	if (value[0] === "\"" && value[value.length - 1] === "\"" && value.indexOf("\\") === -1) return value.slice(1, -1);
	const _value = value.trim();
	if (_value.length <= 9) switch (_value.toLowerCase()) {
		case "true": return true;
		case "false": return false;
		case "undefined": return;
		case "null": return null;
		case "nan": return NaN;
		case "infinity": return Number.POSITIVE_INFINITY;
		case "-infinity": return Number.NEGATIVE_INFINITY;
	}
	if (!JsonSigRx.test(value)) {
		if (options.strict) throw new SyntaxError("[destr] Invalid JSON");
		return value;
	}
	try {
		if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
			if (options.strict) throw new Error("[destr] Possible prototype pollution");
			return JSON.parse(value, jsonParseTransform);
		}
		return JSON.parse(value);
	} catch (error) {
		if (options.strict) throw error;
		return value;
	}
}
function splitSetCookieString(cookiesString) {
	if (Array.isArray(cookiesString)) return cookiesString.flatMap((c) => splitSetCookieString(c));
	if (typeof cookiesString !== "string") return [];
	const cookiesStrings = [];
	let pos = 0;
	let start;
	let ch;
	let lastComma;
	let nextStart;
	let cookiesSeparatorFound;
	const skipWhitespace = () => {
		while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) pos += 1;
		return pos < cookiesString.length;
	};
	const notSpecialChar = () => {
		ch = cookiesString.charAt(pos);
		return ch !== "=" && ch !== ";" && ch !== ",";
	};
	while (pos < cookiesString.length) {
		start = pos;
		cookiesSeparatorFound = false;
		while (skipWhitespace()) {
			ch = cookiesString.charAt(pos);
			if (ch === ",") {
				lastComma = pos;
				pos += 1;
				skipWhitespace();
				nextStart = pos;
				while (pos < cookiesString.length && notSpecialChar()) pos += 1;
				if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
					cookiesSeparatorFound = true;
					pos = nextStart;
					cookiesStrings.push(cookiesString.slice(start, lastComma));
					start = pos;
				} else pos = lastComma + 1;
			} else pos += 1;
		}
		if (!cookiesSeparatorFound || pos >= cookiesString.length) cookiesStrings.push(cookiesString.slice(start));
	}
	return cookiesStrings;
}
function lazyInherit(target, source, sourceKey) {
	for (const key$1 of Object.getOwnPropertyNames(source)) {
		if (key$1 === "constructor") continue;
		const targetDesc = Object.getOwnPropertyDescriptor(target, key$1);
		const desc = Object.getOwnPropertyDescriptor(source, key$1);
		let modified = false;
		if (desc.get) {
			modified = true;
			desc.get = targetDesc?.get || function() {
				return this[sourceKey][key$1];
			};
		}
		if (desc.set) {
			modified = true;
			desc.set = targetDesc?.set || function(value) {
				this[sourceKey][key$1] = value;
			};
		}
		if (typeof desc.value === "function") {
			modified = true;
			desc.value = function(...args) {
				return this[sourceKey][key$1](...args);
			};
		}
		if (modified) Object.defineProperty(target, key$1, desc);
	}
}
var FastURL = /* @__PURE__ */ (() => {
	const NativeURL = globalThis.URL;
	const FastURL$1 = class URL$1 {
		#url;
		#href;
		#protocol;
		#host;
		#pathname;
		#search;
		#searchParams;
		#pos;
		constructor(url) {
			if (typeof url === "string") this.#href = url;
			else {
				this.#protocol = url.protocol;
				this.#host = url.host;
				this.#pathname = url.pathname;
				this.#search = url.search;
			}
		}
		get _url() {
			if (this.#url) return this.#url;
			this.#url = new NativeURL(this.href);
			this.#href = void 0;
			this.#protocol = void 0;
			this.#host = void 0;
			this.#pathname = void 0;
			this.#search = void 0;
			this.#searchParams = void 0;
			this.#pos = void 0;
			return this.#url;
		}
		get href() {
			if (this.#url) return this.#url.href;
			if (!this.#href) this.#href = `${this.#protocol || "http:"}//${this.#host || "localhost"}${this.#pathname || "/"}${this.#search || ""}`;
			return this.#href;
		}
		#getPos() {
			if (!this.#pos) {
				const url = this.href;
				const protoIndex = url.indexOf("://");
				const pathnameIndex = protoIndex === -1 ? -1 : url.indexOf("/", protoIndex + 4);
				const qIndex = pathnameIndex === -1 ? -1 : url.indexOf("?", pathnameIndex);
				this.#pos = [
					protoIndex,
					pathnameIndex,
					qIndex
				];
			}
			return this.#pos;
		}
		get pathname() {
			if (this.#url) return this.#url.pathname;
			if (this.#pathname === void 0) {
				const [, pathnameIndex, queryIndex] = this.#getPos();
				if (pathnameIndex === -1) return this._url.pathname;
				this.#pathname = this.href.slice(pathnameIndex, queryIndex === -1 ? void 0 : queryIndex);
			}
			return this.#pathname;
		}
		get search() {
			if (this.#url) return this.#url.search;
			if (this.#search === void 0) {
				const [, pathnameIndex, queryIndex] = this.#getPos();
				if (pathnameIndex === -1) return this._url.search;
				const url = this.href;
				this.#search = queryIndex === -1 || queryIndex === url.length - 1 ? "" : url.slice(queryIndex);
			}
			return this.#search;
		}
		get searchParams() {
			if (this.#url) return this.#url.searchParams;
			if (!this.#searchParams) this.#searchParams = new URLSearchParams(this.search);
			return this.#searchParams;
		}
		get protocol() {
			if (this.#url) return this.#url.protocol;
			if (this.#protocol === void 0) {
				const [protocolIndex] = this.#getPos();
				if (protocolIndex === -1) return this._url.protocol;
				this.#protocol = this.href.slice(0, protocolIndex + 1);
			}
			return this.#protocol;
		}
		toString() {
			return this.href;
		}
		toJSON() {
			return this.href;
		}
	};
	lazyInherit(FastURL$1.prototype, NativeURL.prototype, "_url");
	Object.setPrototypeOf(FastURL$1.prototype, NativeURL.prototype);
	Object.setPrototypeOf(FastURL$1, NativeURL);
	return FastURL$1;
})();
var kNodeInspect = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
var NodeRequestHeaders = /* @__PURE__ */ (() => {
	const _Headers = class Headers$1 {
		_node;
		constructor(nodeCtx) {
			this._node = nodeCtx;
		}
		append(name, value) {
			name = validateHeader(name);
			const _headers = this._node.req.headers;
			const _current = _headers[name];
			if (_current) if (Array.isArray(_current)) _current.push(value);
			else _headers[name] = [_current, value];
			else _headers[name] = value;
		}
		delete(name) {
			name = validateHeader(name);
			this._node.req.headers[name] = void 0;
		}
		get(name) {
			name = validateHeader(name);
			if (this._node.req.headers[name] === void 0) return null;
			return _normalizeValue(this._node.req.headers[name]);
		}
		getSetCookie() {
			const setCookie = this._node.req.headers["set-cookie"];
			if (!setCookie || setCookie.length === 0) return [];
			return splitSetCookieString(setCookie);
		}
		has(name) {
			name = validateHeader(name);
			return !!this._node.req.headers[name];
		}
		set(name, value) {
			name = validateHeader(name);
			this._node.req.headers[name] = value;
		}
		get count() {
			throw new Error("Method not implemented.");
		}
		getAll(_name) {
			throw new Error("Method not implemented.");
		}
		toJSON() {
			const _headers = this._node.req.headers;
			const result = {};
			for (const key$1 in _headers) if (_headers[key$1]) result[key$1] = _normalizeValue(_headers[key$1]);
			return result;
		}
		forEach(cb, thisArg) {
			const _headers = this._node.req.headers;
			for (const key$1 in _headers) if (_headers[key$1]) cb.call(thisArg, _normalizeValue(_headers[key$1]), key$1, this);
		}
		*entries() {
			const headers$1 = this._node.req.headers;
			const isHttp2 = this._node.req.httpVersion === "2.0";
			for (const key$1 in headers$1) if (!isHttp2 || key$1[0] !== ":") yield [key$1, _normalizeValue(headers$1[key$1])];
		}
		*keys() {
			const keys = Object.keys(this._node.req.headers);
			for (const key$1 of keys) yield key$1;
		}
		*values() {
			const values = Object.values(this._node.req.headers);
			for (const value of values) yield _normalizeValue(value);
		}
		[Symbol.iterator]() {
			return this.entries()[Symbol.iterator]();
		}
		get [Symbol.toStringTag]() {
			return "Headers";
		}
		[kNodeInspect]() {
			return Object.fromEntries(this.entries());
		}
	};
	Object.setPrototypeOf(_Headers.prototype, globalThis.Headers.prototype);
	return _Headers;
})();
function _normalizeValue(value) {
	if (Array.isArray(value)) return value.join(", ");
	return typeof value === "string" ? value : String(value ?? "");
}
function validateHeader(name) {
	if (name[0] === ":") throw new TypeError(`${JSON.stringify(name)} is an invalid header name.`);
	return name.toLowerCase();
}
var NodeResponse = /* @__PURE__ */ (() => {
	const NativeResponse = globalThis.Response;
	const STATUS_CODES = globalThis.process?.getBuiltinModule?.("node:http")?.STATUS_CODES || {};
	class NodeResponse$1 {
		#body;
		#init;
		#headers;
		#response;
		constructor(body, init) {
			this.#body = body;
			this.#init = init;
		}
		get status() {
			return this.#response?.status || this.#init?.status || 200;
		}
		get statusText() {
			return this.#response?.statusText || this.#init?.statusText || STATUS_CODES[this.status] || "";
		}
		get headers() {
			if (this.#response) return this.#response.headers;
			if (this.#headers) return this.#headers;
			const initHeaders = this.#init?.headers;
			return this.#headers = initHeaders instanceof Headers ? initHeaders : new Headers(initHeaders);
		}
		get ok() {
			if (this.#response) return this.#response.ok;
			const status = this.status;
			return status >= 200 && status < 300;
		}
		get _response() {
			if (this.#response) return this.#response;
			this.#response = new NativeResponse(this.#body, this.#headers ? {
				...this.#init,
				headers: this.#headers
			} : this.#init);
			this.#init = void 0;
			this.#headers = void 0;
			this.#body = void 0;
			return this.#response;
		}
		nodeResponse() {
			const status = this.status;
			const statusText = this.statusText;
			let body;
			let contentType;
			let contentLength;
			if (this.#response) body = this.#response.body;
			else if (this.#body) if (this.#body instanceof ReadableStream) body = this.#body;
			else if (typeof this.#body === "string") {
				body = this.#body;
				contentType = "text/plain; charset=UTF-8";
				contentLength = Buffer.byteLength(this.#body);
			} else if (this.#body instanceof ArrayBuffer) {
				body = Buffer.from(this.#body);
				contentLength = this.#body.byteLength;
			} else if (this.#body instanceof Uint8Array) {
				body = this.#body;
				contentLength = this.#body.byteLength;
			} else if (this.#body instanceof DataView) {
				body = Buffer.from(this.#body.buffer);
				contentLength = this.#body.byteLength;
			} else if (this.#body instanceof Blob) {
				body = this.#body.stream();
				contentType = this.#body.type;
				contentLength = this.#body.size;
			} else if (typeof this.#body.pipe === "function") body = this.#body;
			else body = this._response.body;
			const rawNodeHeaders = [];
			const initHeaders = this.#init?.headers;
			const headerEntries = this.#response?.headers || this.#headers || (initHeaders ? Array.isArray(initHeaders) ? initHeaders : initHeaders?.entries ? initHeaders.entries() : Object.entries(initHeaders).map(([k, v]) => [k.toLowerCase(), v]) : void 0);
			let hasContentTypeHeader;
			let hasContentLength;
			if (headerEntries) for (const [key$1, value] of headerEntries) {
				if (key$1 === "set-cookie") {
					for (const setCookie of splitSetCookieString(value)) rawNodeHeaders.push(["set-cookie", setCookie]);
					continue;
				}
				rawNodeHeaders.push([key$1, value]);
				if (key$1 === "content-type") hasContentTypeHeader = true;
				else if (key$1 === "content-length") hasContentLength = true;
			}
			if (contentType && !hasContentTypeHeader) rawNodeHeaders.push(["content-type", contentType]);
			if (contentLength && !hasContentLength) rawNodeHeaders.push(["content-length", String(contentLength)]);
			this.#init = void 0;
			this.#headers = void 0;
			this.#response = void 0;
			this.#body = void 0;
			return {
				status,
				statusText,
				headers: rawNodeHeaders,
				body
			};
		}
	}
	lazyInherit(NodeResponse$1.prototype, NativeResponse.prototype, "_response");
	Object.setPrototypeOf(NodeResponse$1, NativeResponse);
	Object.setPrototypeOf(NodeResponse$1.prototype, NativeResponse.prototype);
	return NodeResponse$1;
})();
async function sendNodeResponse(nodeRes, webRes) {
	if (!webRes) {
		nodeRes.statusCode = 500;
		return endNodeResponse(nodeRes);
	}
	if (webRes.nodeResponse) {
		const res = webRes.nodeResponse();
		writeHead(nodeRes, res.status, res.statusText, res.headers.flat());
		if (res.body) {
			if (res.body instanceof ReadableStream) return streamBody(res.body, nodeRes);
			else if (typeof res.body?.pipe === "function") {
				res.body.pipe(nodeRes);
				return new Promise((resolve$1) => nodeRes.on("close", resolve$1));
			}
			nodeRes.write(res.body);
		}
		return endNodeResponse(nodeRes);
	}
	const headerEntries = [];
	for (const [key$1, value] of webRes.headers) if (key$1 === "set-cookie") for (const setCookie of splitSetCookieString(value)) headerEntries.push(["set-cookie", setCookie]);
	else headerEntries.push([key$1, value]);
	writeHead(nodeRes, webRes.status, webRes.statusText, headerEntries.flat());
	return webRes.body ? streamBody(webRes.body, nodeRes) : endNodeResponse(nodeRes);
}
function writeHead(nodeRes, status, statusText, headers$1) {
	if (!nodeRes.headersSent) if (nodeRes.req?.httpVersion === "2.0") nodeRes.writeHead(status, headers$1.flat());
	else nodeRes.writeHead(status, statusText, headers$1.flat());
}
function endNodeResponse(nodeRes) {
	return new Promise((resolve$1) => nodeRes.end(resolve$1));
}
function streamBody(stream, nodeRes) {
	if (nodeRes.destroyed) {
		stream.cancel();
		return;
	}
	const reader = stream.getReader();
	function streamCancel(error) {
		reader.cancel(error).catch(() => {});
		if (error) nodeRes.destroy(error);
	}
	function streamHandle({ done, value }) {
		try {
			if (done) nodeRes.end();
			else if (nodeRes.write(value)) reader.read().then(streamHandle, streamCancel);
			else nodeRes.once("drain", () => reader.read().then(streamHandle, streamCancel));
		} catch (error) {
			streamCancel(error instanceof Error ? error : void 0);
		}
	}
	nodeRes.on("close", streamCancel);
	nodeRes.on("error", streamCancel);
	reader.read().then(streamHandle, streamCancel);
	return reader.closed.finally(() => {
		nodeRes.off("close", streamCancel);
		nodeRes.off("error", streamCancel);
	});
}
var NodeRequestURL = class extends FastURL {
	#req;
	constructor({ req }) {
		const path$1 = req.url || "/";
		if (path$1[0] === "/") {
			const qIndex = path$1.indexOf("?");
			const pathname = qIndex === -1 ? path$1 : path$1?.slice(0, qIndex) || "/";
			const search = qIndex === -1 ? "" : path$1?.slice(qIndex) || "";
			const host$1 = req.headers.host || req.headers[":authority"] || `${req.socket.localFamily === "IPv6" ? "[" + req.socket.localAddress + "]" : req.socket.localAddress}:${req.socket?.localPort || "80"}`;
			const protocol = req.socket?.encrypted || req.headers["x-forwarded-proto"] === "https" || req.headers[":scheme"] === "https" ? "https:" : "http:";
			super({
				protocol,
				host: host$1,
				pathname,
				search
			});
		} else super(path$1);
		this.#req = req;
	}
	get pathname() {
		return super.pathname;
	}
	set pathname(value) {
		this._url.pathname = value;
		this.#req.url = this._url.pathname + this._url.search;
	}
};
var NodeRequest = /* @__PURE__ */ (() => {
	let Readable;
	const NativeRequest = globalThis._Request ??= globalThis.Request;
	const PatchedRequest = class Request$1$1 extends NativeRequest {
		static _srvx = true;
		static [Symbol.hasInstance](instance) {
			return instance instanceof NativeRequest;
		}
		constructor(input, options) {
			if (typeof input === "object" && "_request" in input) input = input._request;
			if ((options?.body)?.getReader !== void 0) options.duplex ??= "half";
			super(input, options);
		}
	};
	if (!globalThis.Request._srvx) globalThis.Request = PatchedRequest;
	class Request$1 {
		_node;
		_url;
		runtime;
		#request;
		#headers;
		#abortSignal;
		constructor(ctx) {
			this._node = ctx;
			this._url = new NodeRequestURL({ req: ctx.req });
			this.runtime = {
				name: "node",
				node: ctx
			};
		}
		get ip() {
			return this._node.req.socket?.remoteAddress;
		}
		get method() {
			return this._node.req.method || "GET";
		}
		get url() {
			return this._url.href;
		}
		get headers() {
			return this.#headers ||= new NodeRequestHeaders(this._node);
		}
		get signal() {
			if (!this.#abortSignal) {
				this.#abortSignal = new AbortController();
				this._node.req.once("close", () => {
					this.#abortSignal?.abort();
				});
			}
			return this.#abortSignal.signal;
		}
		get _request() {
			if (!this.#request) {
				const method = this.method;
				const hasBody = !(method === "GET" || method === "HEAD");
				if (hasBody && !Readable) Readable = process.getBuiltinModule("node:stream").Readable;
				this.#request = new PatchedRequest(this.url, {
					method,
					headers: this.headers,
					signal: this.signal,
					body: hasBody ? Readable.toWeb(this._node.req) : void 0
				});
			}
			return this.#request;
		}
	}
	lazyInherit(Request$1.prototype, NativeRequest.prototype, "_request");
	Object.setPrototypeOf(Request$1.prototype, NativeRequest.prototype);
	return Request$1;
})();
function toNodeHandler(fetchHandler) {
	return (nodeReq, nodeRes) => {
		const request = new NodeRequest({
			req: nodeReq,
			res: nodeRes
		});
		const res = fetchHandler(request);
		return res instanceof Promise ? res.then((resolvedRes) => sendNodeResponse(nodeRes, resolvedRes)) : sendNodeResponse(nodeRes, res);
	};
}
function defineNitroErrorHandler(handler) {
	return handler;
}
var NUMBER_CHAR_RE = /\d/;
var STR_SPLITTERS = [
	"-",
	"_",
	"/",
	"."
];
function isUppercase(char = "") {
	if (NUMBER_CHAR_RE.test(char)) return;
	return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
	const splitters = separators ?? STR_SPLITTERS;
	const parts = [];
	if (!str || typeof str !== "string") return parts;
	let buff = "";
	let previousUpper;
	let previousSplitter;
	for (const char of str) {
		const isSplitter = splitters.includes(char);
		if (isSplitter === true) {
			parts.push(buff);
			buff = "";
			previousUpper = void 0;
			continue;
		}
		const isUpper = isUppercase(char);
		if (previousSplitter === false) {
			if (previousUpper === false && isUpper === true) {
				parts.push(buff);
				buff = char;
				previousUpper = isUpper;
				continue;
			}
			if (previousUpper === true && isUpper === false && buff.length > 1) {
				const lastChar = buff.at(-1);
				parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
				buff = lastChar + char;
				previousUpper = isUpper;
				continue;
			}
		}
		buff += char;
		previousUpper = isUpper;
		previousSplitter = isSplitter;
	}
	parts.push(buff);
	return parts;
}
function kebabCase(str, joiner) {
	return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner ?? "-") : "";
}
function snakeCase(str) {
	return kebabCase(str || "", "_");
}
function useRuntimeConfig() {
	return useRuntimeConfig._cached ||= getRuntimeConfig();
}
function getRuntimeConfig() {
	const runtimeConfig = globalThis.__NITRO_RUNTIME_CONFIG__ || {
		"app": { "baseURL": "/" },
		"nitro": { "routeRules": { "/assets/**": { "headers": { "cache-control": "public, max-age=31536000, immutable" } } } }
	};
	const env = globalThis.process?.env || {};
	applyEnv(runtimeConfig, {
		prefix: "NITRO_",
		altPrefix: runtimeConfig.nitro?.envPrefix ?? env?.NITRO_ENV_PREFIX ?? "_",
		envExpansion: runtimeConfig.nitro?.envExpansion ?? env?.NITRO_ENV_EXPANSION ?? false
	});
	return runtimeConfig;
}
function getEnv(key$1, opts) {
	const envKey = snakeCase(key$1).toUpperCase();
	return process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey];
}
function _isObject(input) {
	return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
	for (const key$1 in obj) {
		const subKey = parentKey ? `${parentKey}_${key$1}` : key$1;
		const envValue = getEnv(subKey, opts);
		if (_isObject(obj[key$1])) if (_isObject(envValue)) {
			obj[key$1] = {
				...obj[key$1],
				...envValue
			};
			applyEnv(obj[key$1], opts, subKey);
		} else if (envValue === void 0) applyEnv(obj[key$1], opts, subKey);
		else obj[key$1] = envValue ?? obj[key$1];
		else obj[key$1] = envValue ?? obj[key$1];
		if (opts.envExpansion && typeof obj[key$1] === "string") obj[key$1] = _expandFromEnv(obj[key$1]);
	}
	return obj;
}
var envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
	return value.replace(envExpandRx, (match, key$1) => {
		return process.env[key$1] || match;
	});
}
var NullProtoObj = /* @__PURE__ */ (() => {
	const e = function() {};
	return e.prototype = Object.create(null), Object.freeze(e.prototype), e;
})();
var kEventNS = "h3.internal.event.";
var kEventRes = /* @__PURE__ */ Symbol.for(`${kEventNS}res`);
var kEventResHeaders = /* @__PURE__ */ Symbol.for(`${kEventNS}res.headers`);
var H3Event = class {
	app;
	req;
	url;
	context;
	static __is_event__ = true;
	constructor(req, context, app) {
		this.context = context || req.context || new NullProtoObj();
		this.req = req;
		this.app = app;
		const _url = req._url;
		this.url = _url && _url instanceof URL ? _url : new FastURL(req.url);
	}
	get res() {
		return this[kEventRes] ||= new H3EventResponse();
	}
	get runtime() {
		return this.req.runtime;
	}
	waitUntil(promise) {
		this.req.waitUntil?.(promise);
	}
	toString() {
		return `[${this.req.method}] ${this.req.url}`;
	}
	toJSON() {
		return this.toString();
	}
	get node() {
		return this.req.runtime?.node;
	}
	get headers() {
		return this.req.headers;
	}
	get path() {
		return this.url.pathname + this.url.search;
	}
	get method() {
		return this.req.method;
	}
};
var H3EventResponse = class {
	status;
	statusText;
	get headers() {
		return this[kEventResHeaders] ||= new Headers();
	}
};
var DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
	return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
	if (!statusCode) return defaultStatusCode;
	if (typeof statusCode === "string") statusCode = +statusCode;
	if (statusCode < 100 || statusCode > 599) return defaultStatusCode;
	return statusCode;
}
var HTTPError = class HTTPError$1 extends Error {
	get name() {
		return "HTTPError";
	}
	status;
	statusText;
	headers;
	cause;
	data;
	body;
	unhandled;
	static isError(input) {
		return input instanceof Error && input?.name === "HTTPError";
	}
	static status(status, statusText, details) {
		return new HTTPError$1({
			...details,
			statusText,
			status
		});
	}
	constructor(arg1, arg2) {
		let messageInput;
		let details;
		if (typeof arg1 === "string") {
			messageInput = arg1;
			details = arg2;
		} else details = arg1;
		const status = sanitizeStatusCode(details?.status || (details?.cause)?.status || details?.status || details?.statusCode, 500);
		const statusText = sanitizeStatusMessage(details?.statusText || (details?.cause)?.statusText || details?.statusText || details?.statusMessage);
		const message = messageInput || details?.message || (details?.cause)?.message || details?.statusText || details?.statusMessage || [
			"HTTPError",
			status,
			statusText
		].filter(Boolean).join(" ");
		super(message, { cause: details });
		this.cause = details;
		Error.captureStackTrace?.(this, this.constructor);
		this.status = status;
		this.statusText = statusText || void 0;
		const rawHeaders = details?.headers || (details?.cause)?.headers;
		this.headers = rawHeaders ? new Headers(rawHeaders) : void 0;
		this.unhandled = details?.unhandled ?? (details?.cause)?.unhandled ?? void 0;
		this.data = details?.data;
		this.body = details?.body;
	}
	get statusCode() {
		return this.status;
	}
	get statusMessage() {
		return this.statusText;
	}
	toJSON() {
		const unhandled = this.unhandled;
		return {
			status: this.status,
			statusText: this.statusText,
			unhandled,
			message: unhandled ? "HTTPError" : this.message,
			data: unhandled ? void 0 : this.data,
			...unhandled ? void 0 : this.body
		};
	}
};
function isJSONSerializable(value, _type) {
	if (value === null || value === void 0) return true;
	if (_type !== "object") return _type === "boolean" || _type === "number" || _type === "string";
	if (typeof value.toJSON === "function") return true;
	if (Array.isArray(value)) return true;
	if (typeof value.pipe === "function" || typeof value.pipeTo === "function") return false;
	if (value instanceof NullProtoObj) return true;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}
var kNotFound = /* @__PURE__ */ Symbol.for("h3.notFound");
var kHandled = /* @__PURE__ */ Symbol.for("h3.handled");
function toResponse(val, event, config = {}) {
	if (typeof val?.then === "function") return (val.catch?.((error) => error) || Promise.resolve(val)).then((resolvedVal) => toResponse(resolvedVal, event, config));
	const response = prepareResponse(val, event, config);
	if (typeof response?.then === "function") return toResponse(response, event, config);
	const { onResponse: onResponse$1 } = config;
	return onResponse$1 ? Promise.resolve(onResponse$1(response, event)).then(() => response) : response;
}
var HTTPResponse = class {
	#headers;
	#init;
	body;
	constructor(body, init) {
		this.body = body;
		this.#init = init;
	}
	get status() {
		return this.#init?.status || 200;
	}
	get statusText() {
		return this.#init?.statusText || "OK";
	}
	get headers() {
		return this.#headers ||= new Headers(this.#init?.headers);
	}
};
function prepareResponse(val, event, config, nested) {
	if (val === kHandled) return new NodeResponse(null);
	if (val === kNotFound) val = new HTTPError({
		status: 404,
		message: `Cannot find any route matching [${event.req.method}] ${event.url}`
	});
	if (val && val instanceof Error) {
		const isHTTPError = HTTPError.isError(val);
		const error = isHTTPError ? val : new HTTPError(val);
		if (!isHTTPError) {
			error.unhandled = true;
			if (val?.stack) error.stack = val.stack;
		}
		if (error.unhandled && !config.silent) console.error(error);
		const { onError: onError$1 } = config;
		return onError$1 && !nested ? Promise.resolve(onError$1(error, event)).catch((error$1) => error$1).then((newVal) => prepareResponse(newVal ?? val, event, config, true)) : errorResponse(error, config.debug);
	}
	const preparedRes = event[kEventRes];
	const preparedHeaders = preparedRes?.[kEventResHeaders];
	if (!(val instanceof Response)) {
		const res = prepareResponseBody(val, event, config);
		const status = res.status || preparedRes?.status;
		return new NodeResponse(nullBody(event.req.method, status) ? null : res.body, {
			status,
			statusText: res.statusText || preparedRes?.statusText,
			headers: res.headers && preparedHeaders ? mergeHeaders$1(res.headers, preparedHeaders) : res.headers || preparedHeaders
		});
	}
	if (!preparedHeaders) return val;
	try {
		mergeHeaders$1(val.headers, preparedHeaders, val.headers);
		return val;
	} catch {
		return new NodeResponse(nullBody(event.req.method, val.status) ? null : val.body, {
			status: val.status,
			statusText: val.statusText,
			headers: mergeHeaders$1(val.headers, preparedHeaders)
		});
	}
}
function mergeHeaders$1(base, overrides, target = new Headers(base)) {
	for (const [name, value] of overrides) if (name === "set-cookie") target.append(name, value);
	else target.set(name, value);
	return target;
}
var emptyHeaders = /* @__PURE__ */ new Headers({ "content-length": "0" });
var jsonHeaders = /* @__PURE__ */ new Headers({ "content-type": "application/json;charset=UTF-8" });
function prepareResponseBody(val, event, config) {
	if (val === null || val === void 0) return {
		body: "",
		headers: emptyHeaders
	};
	const valType = typeof val;
	if (valType === "string") return { body: val };
	if (val instanceof Uint8Array) {
		event.res.headers.set("content-length", val.byteLength.toString());
		return { body: val };
	}
	if (val instanceof HTTPResponse || val?.constructor?.name === "HTTPResponse") return val;
	if (isJSONSerializable(val, valType)) return {
		body: JSON.stringify(val, void 0, config.debug ? 2 : void 0),
		headers: jsonHeaders
	};
	if (valType === "bigint") return {
		body: val.toString(),
		headers: jsonHeaders
	};
	if (val instanceof Blob) {
		const headers$1 = new Headers({
			"content-type": val.type,
			"content-length": val.size.toString()
		});
		let filename = val.name;
		if (filename) {
			filename = encodeURIComponent(filename);
			headers$1.set("content-disposition", `filename="${filename}"; filename*=UTF-8''${filename}`);
		}
		return {
			body: val.stream(),
			headers: headers$1
		};
	}
	if (valType === "symbol") return { body: val.toString() };
	if (valType === "function") return { body: `${val.name}()` };
	return { body: val };
}
function nullBody(method, status) {
	return method === "HEAD" || status === 100 || status === 101 || status === 102 || status === 204 || status === 205 || status === 304;
}
function errorResponse(error, debug$1) {
	return new NodeResponse(JSON.stringify({
		...error.toJSON(),
		stack: debug$1 && error.stack ? error.stack.split("\n").map((l) => l.trim()) : void 0
	}, void 0, debug$1 ? 2 : void 0), {
		status: error.status,
		statusText: error.statusText,
		headers: error.headers ? mergeHeaders$1(jsonHeaders, error.headers) : jsonHeaders
	});
}
function callMiddleware(event, middleware, handler, index = 0) {
	if (index === middleware.length) return handler(event);
	const fn = middleware[index];
	let nextCalled;
	let nextResult;
	const next = () => {
		if (nextCalled) return nextResult;
		nextCalled = true;
		nextResult = callMiddleware(event, middleware, handler, index + 1);
		return nextResult;
	};
	const ret = fn(event, next);
	return is404(ret) ? next() : typeof ret?.then === "function" ? ret.then((resolved) => is404(resolved) ? next() : resolved) : ret;
}
function is404(val) {
	return val === void 0 || val === kNotFound || val?.status === 404 && val instanceof Response;
}
function toRequest(input, options) {
	if (typeof input === "string") {
		let url = input;
		if (url[0] === "/") {
			const headers$1 = options?.headers ? new Headers(options.headers) : void 0;
			const host$1 = headers$1?.get("host") || "localhost";
			url = `${headers$1?.get("x-forwarded-proto") === "https" ? "https" : "http"}://${host$1}${url}`;
		}
		return new Request(url, options);
	} else if (options || input instanceof URL) return new Request(input, options);
	return input;
}
function getRequestHost(event, opts = {}) {
	if (opts.xForwardedHost) {
		const xForwardedHost = (event.req.headers.get("x-forwarded-host") || "").split(",").shift()?.trim();
		if (xForwardedHost) return xForwardedHost;
	}
	return event.req.headers.get("host") || "";
}
function getRequestProtocol(event, opts = {}) {
	if (opts.xForwardedProto !== false) {
		const forwardedProto = event.req.headers.get("x-forwarded-proto");
		if (forwardedProto === "https") return "https";
		if (forwardedProto === "http") return "http";
	}
	return (event.url || new URL(event.req.url)).protocol.slice(0, -1);
}
function getRequestURL(event, opts = {}) {
	const url = new URL(event.url || event.req.url);
	url.protocol = getRequestProtocol(event, opts);
	if (opts.xForwardedHost) {
		const host$1 = getRequestHost(event, opts);
		if (host$1) {
			url.host = host$1;
			if (!host$1.includes(":")) url.port = "";
		}
	}
	return url;
}
function defineHandler(input) {
	if (typeof input === "function") return handlerWithFetch(input);
	const handler = input.handler || (input.fetch ? function _fetchHandler(event) {
		return input.fetch(event.req);
	} : NoHandler);
	return Object.assign(handlerWithFetch(input.middleware?.length ? function _handlerMiddleware(event) {
		return callMiddleware(event, input.middleware, handler);
	} : handler), input);
}
function handlerWithFetch(handler) {
	if ("fetch" in handler) return handler;
	return Object.assign(handler, { fetch: (req) => {
		if (typeof req === "string") req = new URL(req, "http://_");
		if (req instanceof URL) req = new Request(req);
		const event = new H3Event(req);
		try {
			return Promise.resolve(toResponse(handler(event), event));
		} catch (error) {
			return Promise.resolve(toResponse(error, event));
		}
	} });
}
function defineLazyEventHandler(loader) {
	let handler;
	let promise;
	const resolveLazyHandler = () => {
		if (handler) return Promise.resolve(handler);
		return promise ??= Promise.resolve(loader()).then((r$1) => {
			handler = toEventHandler(r$1) || toEventHandler(r$1.default);
			if (typeof handler !== "function") throw new TypeError("Invalid lazy handler", { cause: { resolved: r$1 } });
			return handler;
		});
	};
	return defineHandler(function lazyHandler(event) {
		return handler ? handler(event) : resolveLazyHandler().then((r$1) => r$1(event));
	});
}
function toEventHandler(handler) {
	if (typeof handler === "function") return handler;
	if (typeof handler?.handler === "function") return handler.handler;
	if (typeof handler?.fetch === "function") return function _fetchHandler(event) {
		return handler.fetch(event.req);
	};
}
var NoHandler = () => kNotFound;
var H3Core = /* @__PURE__ */ (() => {
	const HTTPMethods = [
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"PATCH",
		"HEAD",
		"OPTIONS",
		"CONNECT",
		"TRACE"
	];
	class H3Core$1 {
		_middleware;
		_routes = [];
		config;
		constructor(config = {}) {
			this._middleware = [];
			this.config = config;
			this.fetch = this.fetch.bind(this);
			this.request = this.request.bind(this);
			this.handler = this.handler.bind(this);
			config.plugins?.forEach((plugin) => plugin(this));
		}
		fetch(request) {
			return this._request(request);
		}
		request(_req, _init, context) {
			return this._request(toRequest(_req, _init), context);
		}
		_request(request, context) {
			const event = new H3Event(request, context, this);
			let handlerRes;
			try {
				if (this.config.onRequest) {
					const hookRes = this.config.onRequest(event);
					handlerRes = typeof hookRes?.then === "function" ? hookRes.then(() => this.handler(event)) : this.handler(event);
				} else handlerRes = this.handler(event);
			} catch (error) {
				handlerRes = Promise.reject(error);
			}
			return toResponse(handlerRes, event, this.config);
		}
		register(plugin) {
			plugin(this);
			return this;
		}
		_findRoute(_event) {}
		_addRoute(_route) {
			this._routes.push(_route);
		}
		_getMiddleware(_event, route) {
			return route?.data.middleware ? [...this._middleware, ...route.data.middleware] : this._middleware;
		}
		handler(event) {
			const route = this._findRoute(event);
			if (route) {
				event.context.params = route.params;
				event.context.matchedRoute = route.data;
			}
			const routeHandler = route?.data.handler || NoHandler;
			const middleware = this._getMiddleware(event, route);
			return middleware.length > 0 ? callMiddleware(event, middleware, routeHandler) : routeHandler(event);
		}
		mount(base, input) {
			if ("handler" in input) {
				if (input._middleware.length > 0) this._middleware.push((event, next) => {
					return event.url.pathname.startsWith(base) ? callMiddleware(event, input._middleware, next) : next();
				});
				for (const r$1 of input._routes) this._addRoute({
					...r$1,
					route: base + r$1.route
				});
			} else {
				const fetchHandler = "fetch" in input ? input.fetch : input;
				this.all(`${base}/**`, function _mountedMiddleware(event) {
					const url = new URL(event.url);
					url.pathname = url.pathname.slice(base.length) || "/";
					return fetchHandler(new Request(url, event.req));
				});
			}
			return this;
		}
		all(route, handler, opts) {
			return this.on("", route, handler, opts);
		}
		on(method, route, handler, opts) {
			const _method = (method || "").toUpperCase();
			route = new URL(route, "http://_").pathname;
			this._addRoute({
				method: _method,
				route,
				handler: toEventHandler(handler),
				middleware: opts?.middleware,
				meta: {
					...handler.meta,
					...opts?.meta
				}
			});
			return this;
		}
		_normalizeMiddleware(fn, _opts) {
			return fn;
		}
		use(arg1, arg2, arg3) {
			let route;
			let fn;
			let opts;
			if (typeof arg1 === "string") {
				route = arg1;
				fn = arg2;
				opts = arg3;
			} else {
				fn = arg1;
				opts = arg2;
			}
			this._middleware.push(this._normalizeMiddleware(fn, {
				...opts,
				route
			}));
			return this;
		}
	}
	for (const method of HTTPMethods) H3Core$1.prototype[method.toLowerCase()] = function(route, handler, opts) {
		return this.on(method, route, handler, opts);
	};
	return H3Core$1;
})();
function flatHooks(configHooks, hooks = {}, parentName) {
	for (const key$1 in configHooks) {
		const subHook = configHooks[key$1];
		const name = parentName ? `${parentName}:${key$1}` : key$1;
		if (typeof subHook === "object" && subHook !== null) flatHooks(subHook, hooks, name);
		else if (typeof subHook === "function") hooks[name] = subHook;
	}
	return hooks;
}
var defaultTask = { run: (function_) => function_() };
var _createTask = () => defaultTask;
var createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
	const name = args.shift();
	const task = createTask(name);
	return hooks.reduce((promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))), Promise.resolve());
}
function parallelTaskCaller(hooks, args) {
	const name = args.shift();
	const task = createTask(name);
	return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
	for (const callback of [...callbacks]) callback(arg0);
}
var Hookable = class {
	constructor() {
		this._hooks = {};
		this._before = void 0;
		this._after = void 0;
		this._deprecatedMessages = void 0;
		this._deprecatedHooks = {};
		this.hook = this.hook.bind(this);
		this.callHook = this.callHook.bind(this);
		this.callHookWith = this.callHookWith.bind(this);
	}
	hook(name, function_, options = {}) {
		if (!name || typeof function_ !== "function") return () => {};
		const originalName = name;
		let dep;
		while (this._deprecatedHooks[name]) {
			dep = this._deprecatedHooks[name];
			name = dep.to;
		}
		if (dep && !options.allowDeprecated) {
			let message = dep.message;
			if (!message) message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
			if (!this._deprecatedMessages) this._deprecatedMessages = /* @__PURE__ */ new Set();
			if (!this._deprecatedMessages.has(message)) {
				console.warn(message);
				this._deprecatedMessages.add(message);
			}
		}
		if (!function_.name) try {
			Object.defineProperty(function_, "name", {
				get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
				configurable: true
			});
		} catch {}
		this._hooks[name] = this._hooks[name] || [];
		this._hooks[name].push(function_);
		return () => {
			if (function_) {
				this.removeHook(name, function_);
				function_ = void 0;
			}
		};
	}
	hookOnce(name, function_) {
		let _unreg;
		let _function = (...arguments_) => {
			if (typeof _unreg === "function") _unreg();
			_unreg = void 0;
			_function = void 0;
			return function_(...arguments_);
		};
		_unreg = this.hook(name, _function);
		return _unreg;
	}
	removeHook(name, function_) {
		if (this._hooks[name]) {
			const index = this._hooks[name].indexOf(function_);
			if (index !== -1) this._hooks[name].splice(index, 1);
			if (this._hooks[name].length === 0) delete this._hooks[name];
		}
	}
	deprecateHook(name, deprecated) {
		this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
		const _hooks = this._hooks[name] || [];
		delete this._hooks[name];
		for (const hook of _hooks) this.hook(name, hook);
	}
	deprecateHooks(deprecatedHooks) {
		Object.assign(this._deprecatedHooks, deprecatedHooks);
		for (const name in deprecatedHooks) this.deprecateHook(name, deprecatedHooks[name]);
	}
	addHooks(configHooks) {
		const hooks = flatHooks(configHooks);
		const removeFns = Object.keys(hooks).map((key$1) => this.hook(key$1, hooks[key$1]));
		return () => {
			for (const unreg of removeFns.splice(0, removeFns.length)) unreg();
		};
	}
	removeHooks(configHooks) {
		const hooks = flatHooks(configHooks);
		for (const key$1 in hooks) this.removeHook(key$1, hooks[key$1]);
	}
	removeAllHooks() {
		for (const key$1 in this._hooks) delete this._hooks[key$1];
	}
	callHook(name, ...arguments_) {
		arguments_.unshift(name);
		return this.callHookWith(serialTaskCaller, name, ...arguments_);
	}
	callHookParallel(name, ...arguments_) {
		arguments_.unshift(name);
		return this.callHookWith(parallelTaskCaller, name, ...arguments_);
	}
	callHookWith(caller, name, ...arguments_) {
		const event = this._before || this._after ? {
			name,
			args: arguments_,
			context: {}
		} : void 0;
		if (this._before) callEachWith(this._before, event);
		const result = caller(name in this._hooks ? [...this._hooks[name]] : [], arguments_);
		if (result instanceof Promise) return result.finally(() => {
			if (this._after && event) callEachWith(this._after, event);
		});
		if (this._after && event) callEachWith(this._after, event);
		return result;
	}
	beforeEach(function_) {
		this._before = this._before || [];
		this._before.push(function_);
		return () => {
			if (this._before !== void 0) {
				const index = this._before.indexOf(function_);
				if (index !== -1) this._before.splice(index, 1);
			}
		};
	}
	afterEach(function_) {
		this._after = this._after || [];
		this._after.push(function_);
		return () => {
			if (this._after !== void 0) {
				const index = this._after.indexOf(function_);
				if (index !== -1) this._after.splice(index, 1);
			}
		};
	}
};
function createHooks() {
	return new Hookable();
}
var prod_default = defineNitroErrorHandler(function defaultNitroErrorHandler(error, event) {
	const res = defaultHandler(error, event);
	return new NodeResponse(JSON.stringify(res.body, null, 2), res);
});
function defaultHandler(error, event, opts) {
	const isSensitive = error.unhandled;
	const status = error.status || 500;
	const url = getRequestURL(event, {
		xForwardedHost: true,
		xForwardedProto: true
	});
	if (status === 404) {
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			statusText: "Found",
			headers: { location: `${baseURL}${url.pathname.slice(1)}${url.search}` },
			body: `Redirecting...`
		};
	}
	if (isSensitive && !opts?.silent) {
		const tags = [error.unhandled && "[unhandled]"].filter(Boolean).join(" ");
		console.error(`[request error] ${tags} [${event.req.method}] ${url}
`, error);
	}
	const headers$1 = {
		"content-type": "application/json",
		"x-content-type-options": "nosniff",
		"x-frame-options": "DENY",
		"referrer-policy": "no-referrer",
		"content-security-policy": "script-src 'none'; frame-ancestors 'none';"
	};
	if (status === 404 || !event.res.headers.has("cache-control")) headers$1["cache-control"] = "no-cache";
	const body = {
		error: true,
		url: url.href,
		status,
		statusText: error.statusText,
		message: isSensitive ? "Server Error" : error.message,
		data: isSensitive ? void 0 : error.data
	};
	return {
		status,
		statusText: error.statusText,
		headers: headers$1,
		body
	};
}
var errorHandlers = [prod_default];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error$1) {
		console.error(error$1);
	}
}
const plugins = [];
String.fromCharCode;
var ENC_SLASH_RE = /%2f/gi;
function decode(text = "") {
	try {
		return decodeURIComponent("" + text);
	} catch {
		return "" + text;
	}
}
function decodePath(text) {
	return decode(text.replace(ENC_SLASH_RE, "%252F"));
}
var TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
var JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasTrailingSlash(input = "", respectQueryAndFragment) {
	if (!respectQueryAndFragment) return input.endsWith("/");
	return TRAILING_SLASH_RE.test(input);
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
	if (!respectQueryAndFragment) return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
	if (!hasTrailingSlash(input, true)) return input || "/";
	let path$1 = input;
	let fragment = "";
	const fragmentIndex = input.indexOf("#");
	if (fragmentIndex !== -1) {
		path$1 = input.slice(0, fragmentIndex);
		fragment = input.slice(fragmentIndex);
	}
	const [s0, ...s] = path$1.split("?");
	return ((s0.endsWith("/") ? s0.slice(0, -1) : s0) || "/") + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
	if (!respectQueryAndFragment) return input.endsWith("/") ? input : input + "/";
	if (hasTrailingSlash(input, true)) return input || "/";
	let path$1 = input;
	let fragment = "";
	const fragmentIndex = input.indexOf("#");
	if (fragmentIndex !== -1) {
		path$1 = input.slice(0, fragmentIndex);
		fragment = input.slice(fragmentIndex);
		if (!path$1) return fragment;
	}
	const [s0, ...s] = path$1.split("?");
	return s0 + "/" + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function hasLeadingSlash(input = "") {
	return input.startsWith("/");
}
function withLeadingSlash(input = "") {
	return hasLeadingSlash(input) ? input : "/" + input;
}
function isNonEmptyURL(url) {
	return url && url !== "/";
}
function joinURL(base, ...input) {
	let url = base || "";
	for (const segment of input.filter((url2) => isNonEmptyURL(url2))) if (url) {
		const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
		url = withTrailingSlash(url) + _segment;
	} else url = segment;
	return url;
}
const headers = ((m) => function headersRouteRule(event) {
	for (const [key$1, value] of Object.entries(m.options || {})) event.res.headers.set(key$1, value);
});
var public_assets_data_default = {
	"/vite.svg": {
		"type": "image/svg+xml",
		"etag": "\"5d9-9/Odcje3kalF1Spc16j7Nl8xM2Y\"",
		"mtime": "2025-10-14T07:09:44.239Z",
		"size": 1497,
		"path": "../public/vite.svg"
	},
	"/assets/index-DOaUdf3I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2f479-nnVtuXm1z9GaDfEbsLlzPcj9b8w\"",
		"mtime": "2025-10-14T07:09:44.364Z",
		"size": 193657,
		"path": "../public/assets/index-DOaUdf3I.js"
	},
	"/assets/index-_yd0EqOq.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"7d4e-XhTvcqO+H43srh8odyQVxASPV78\"",
		"mtime": "2025-10-14T07:09:44.365Z",
		"size": 32078,
		"path": "../public/assets/index-_yd0EqOq.css"
	}
};
function readAsset(id) {
	const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
	return promises.readFile(resolve(serverDir, public_assets_data_default[id].path));
}
const publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
function getAsset(id) {
	return public_assets_data_default[id];
}
var METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
var EncodingMap = {
	gzip: ".gz",
	br: ".br"
};
var static_default = defineHandler((event) => {
	if (event.req.method && !METHODS.has(event.req.method)) return;
	let id = decodePath(withLeadingSlash(withoutTrailingSlash(event.url.pathname)));
	let asset;
	const encodings = [...(event.req.headers.get("accept-encoding") || "").split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(), ""];
	if (encodings.length > 1) event.res.headers.append("Vary", "Accept-Encoding");
	for (const encoding of encodings) for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
		const _asset = getAsset(_id);
		if (_asset) {
			asset = _asset;
			id = _id;
			break;
		}
	}
	if (!asset) {
		if (isPublicAssetURL(id)) {
			event.res.headers.delete("Cache-Control");
			throw new HTTPError({ status: 404 });
		}
		return;
	}
	if (event.req.headers.get("if-none-match") === asset.etag) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	const ifModifiedSinceH = event.req.headers.get("if-modified-since");
	const mtimeDate = new Date(asset.mtime);
	if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	if (asset.type) event.res.headers.set("Content-Type", asset.type);
	if (asset.etag && !event.res.headers.has("ETag")) event.res.headers.set("ETag", asset.etag);
	if (asset.mtime && !event.res.headers.has("Last-Modified")) event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
	if (asset.encoding && !event.res.headers.has("Content-Encoding")) event.res.headers.set("Content-Encoding", asset.encoding);
	if (asset.size > 0 && !event.res.headers.has("Content-Length")) event.res.headers.set("Content-Length", asset.size.toString());
	return readAsset(id);
});
const findRouteRules = (m, p) => {
	let r$1 = [];
	if (p[p.length - 1] === "/") p = p.slice(0, -1) || "/";
	let s = p.split("/");
	s.length - 1;
	if (s[1] === "assets") r$1.unshift({
		data: [{
			name: "headers",
			route: "/assets/**",
			handler: headers,
			options: { "cache-control": "public, max-age=31536000, immutable" }
		}],
		params: { "_": s.slice(2).join("/") }
	});
	return r$1;
};
var _lazy_5OZM1F = defineLazyEventHandler(() => import("../routes/api/hello/_name_.mjs"));
var _lazy_aZhNC1 = defineLazyEventHandler(() => import("../routes/download.mjs"));
var _lazy_COpGsu = defineLazyEventHandler(() => import("../_/renderer-template.mjs"));
const findRoute = (m, p) => {
	if (p[p.length - 1] === "/") p = p.slice(0, -1) || "/";
	if (p === "/download") return { data: {
		route: "/download",
		handler: _lazy_aZhNC1
	} };
	let s = p.split("/"), l = s.length - 1;
	if (s[1] === "api") {
		if (s[2] === "hello") {
			if (l === 3 || l === 2) {
				if (l >= 3) return {
					data: {
						route: "/api/hello/:name",
						handler: _lazy_5OZM1F
					},
					params: { "name": s[3] }
				};
			}
		}
	}
	return {
		data: {
			route: "/**",
			handler: _lazy_COpGsu
		},
		params: { "_": s.slice(1).join("/") }
	};
};
const findRoutedMiddleware = (m, p) => {
	return [];
};
const globalMiddleware = [toEventHandler(static_default)];
function useNitroApp() {
	return useNitroApp.__instance__ ??= initNitroApp();
}
function initNitroApp() {
	const nitroApp$1 = createNitroApp();
	for (const plugin of plugins) try {
		plugin(nitroApp$1);
	} catch (error) {
		nitroApp$1.captureError(error, { tags: ["plugin"] });
		throw error;
	}
	return nitroApp$1;
}
function createNitroApp() {
	const hooks = createHooks();
	const captureError = (error, errorCtx) => {
		const promise = hooks.callHookParallel("error", error, errorCtx).catch((hookError) => {
			console.error("Error while capturing another error", hookError);
		});
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
			if (typeof errorCtx.event.req.waitUntil === "function") errorCtx.event.req.waitUntil(promise);
		}
	};
	const h3App = createH3App(captureError);
	let fetchHandler = async (req) => {
		req.context ??= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		const event = { req };
		const nitroApp$1 = useNitroApp();
		await nitroApp$1.hooks.callHook("request", event).catch((error) => {
			captureError(error, {
				event,
				tags: ["request"]
			});
		});
		const response = await h3App.request(req, void 0, req.context);
		await nitroApp$1.hooks.callHook("response", response, event).catch((error) => {
			captureError(error, {
				event,
				tags: ["request", "response"]
			});
		});
		return response;
	};
	const requestHandler = (input, init, context) => {
		const req = toRequest(input, init);
		req.context = {
			...req.context,
			...context
		};
		return Promise.resolve(fetchHandler(req));
	};
	const originalFetch = globalThis.fetch;
	const nitroFetch = (input, init) => {
		if (typeof input === "string" && input.startsWith("/")) return requestHandler(input, init);
		if (input instanceof Request && "_request" in input) input = input._request;
		return originalFetch(input, init);
	};
	globalThis.fetch = nitroFetch;
	return {
		_h3: h3App,
		hooks,
		fetch: requestHandler,
		captureError
	};
}
function createH3App(captureError) {
	const DEBUG_MODE = [
		"1",
		"true",
		"TRUE"
	].includes("false");
	const h3App = new H3Core({
		debug: DEBUG_MODE,
		onError: (error, event) => {
			captureError(error, {
				event,
				tags: ["request"]
			});
			return error_handler_default(error, event);
		}
	});
	h3App._findRoute = (event) => findRoute(event.req.method, event.url.pathname);
	h3App._getMiddleware = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const { routeRules, routeRuleMiddleware } = getRouteRules(method, pathname);
		event.context.routeRules = routeRules;
		return [
			...routeRuleMiddleware,
			...globalMiddleware,
			...findRoutedMiddleware(method, pathname).map((r$1) => r$1.data),
			...route?.data?.middleware || []
		].filter(Boolean);
	};
	return h3App;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	for (const rule of Object.values(routeRules)) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
function _captureError(error, type) {
	console.error(`[${type}]`, error);
	useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
	process.on("unhandledRejection", (error) => _captureError(error, "unhandledRejection"));
	process.on("uncaughtException", (error) => _captureError(error, "uncaughtException"));
}
var debug = (...args) => {};
function GracefulShutdown(server$1, opts) {
	opts = opts || {};
	const options = Object.assign({
		signals: "SIGINT SIGTERM",
		timeout: 3e4,
		development: false,
		forceExit: true,
		onShutdown: (signal) => Promise.resolve(signal),
		preShutdown: (signal) => Promise.resolve(signal)
	}, opts);
	let isShuttingDown = false;
	const connections = {};
	let connectionCounter = 0;
	const secureConnections = {};
	let secureConnectionCounter = 0;
	let failed = false;
	let finalRun = false;
	function onceFactory() {
		let called = false;
		return (emitter, events, callback) => {
			function call() {
				if (!called) {
					called = true;
					return Reflect.apply(callback, this, arguments);
				}
			}
			for (const e of events) emitter.on(e, call);
		};
	}
	const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
	onceFactory()(process, signals, (signal) => {
		debug("received shut down signal", signal);
		shutdown(signal).then(() => {
			if (options.forceExit) process.exit(failed ? 1 : 0);
		}).catch((error) => {
			debug("server shut down error occurred", error);
			process.exit(1);
		});
	});
	function isFunction(functionToCheck) {
		const getType = Object.prototype.toString.call(functionToCheck);
		return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
	}
	function destroy(socket, force = false) {
		if (socket._isIdle && isShuttingDown || force) {
			socket.destroy();
			if (socket.server instanceof http.Server) delete connections[socket._connectionId];
			else delete secureConnections[socket._connectionId];
		}
	}
	function destroyAllConnections(force = false) {
		debug("Destroy Connections : " + (force ? "forced close" : "close"));
		let counter = 0;
		let secureCounter = 0;
		for (const key$1 of Object.keys(connections)) {
			const socket = connections[key$1];
			const serverResponse = socket._httpMessage;
			if (serverResponse && !force) {
				if (!serverResponse.headersSent) serverResponse.setHeader("connection", "close");
			} else {
				counter++;
				destroy(socket);
			}
		}
		debug("Connections destroyed : " + counter);
		debug("Connection Counter    : " + connectionCounter);
		for (const key$1 of Object.keys(secureConnections)) {
			const socket = secureConnections[key$1];
			const serverResponse = socket._httpMessage;
			if (serverResponse && !force) {
				if (!serverResponse.headersSent) serverResponse.setHeader("connection", "close");
			} else {
				secureCounter++;
				destroy(socket);
			}
		}
		debug("Secure Connections destroyed : " + secureCounter);
		debug("Secure Connection Counter    : " + secureConnectionCounter);
	}
	server$1.on("request", (req, res) => {
		req.socket._isIdle = false;
		if (isShuttingDown && !res.headersSent) res.setHeader("connection", "close");
		res.on("finish", () => {
			req.socket._isIdle = true;
			destroy(req.socket);
		});
	});
	server$1.on("connection", (socket) => {
		if (isShuttingDown) socket.destroy();
		else {
			const id = connectionCounter++;
			socket._isIdle = true;
			socket._connectionId = id;
			connections[id] = socket;
			socket.once("close", () => {
				delete connections[socket._connectionId];
			});
		}
	});
	server$1.on("secureConnection", (socket) => {
		if (isShuttingDown) socket.destroy();
		else {
			const id = secureConnectionCounter++;
			socket._isIdle = true;
			socket._connectionId = id;
			secureConnections[id] = socket;
			socket.once("close", () => {
				delete secureConnections[socket._connectionId];
			});
		}
	});
	process.on("close", () => {
		debug("closed");
	});
	function shutdown(sig) {
		function cleanupHttp() {
			destroyAllConnections();
			debug("Close http server");
			return new Promise((resolve$1, reject) => {
				server$1.close((err) => {
					if (err) return reject(err);
					return resolve$1(true);
				});
			});
		}
		debug("shutdown signal - " + sig);
		if (options.development) {
			debug("DEV-Mode - immediate forceful shutdown");
			return process.exit(0);
		}
		function finalHandler() {
			if (!finalRun) {
				finalRun = true;
				if (options.finally && isFunction(options.finally)) {
					debug("executing finally()");
					options.finally();
				}
			}
			return Promise.resolve();
		}
		function waitForReadyToShutDown(totalNumInterval) {
			debug(`waitForReadyToShutDown... ${totalNumInterval}`);
			if (totalNumInterval === 0) {
				debug(`Could not close connections in time (${options.timeout}ms), will forcefully shut down`);
				return Promise.resolve(true);
			}
			if (Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0) {
				debug("All connections closed. Continue to shutting down");
				return Promise.resolve(false);
			}
			debug("Schedule the next waitForReadyToShutdown");
			return new Promise((resolve$1) => {
				setTimeout(() => {
					resolve$1(waitForReadyToShutDown(totalNumInterval - 1));
				}, 250);
			});
		}
		if (isShuttingDown) return Promise.resolve();
		debug("shutting down");
		return options.preShutdown(sig).then(() => {
			isShuttingDown = true;
			cleanupHttp();
		}).then(() => {
			const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
			return waitForReadyToShutDown(pollIterations);
		}).then((force) => {
			debug("Do onShutdown now");
			if (force) destroyAllConnections(force);
			return options.onShutdown(sig);
		}).then(finalHandler).catch((error) => {
			const errString = typeof error === "string" ? error : JSON.stringify(error);
			debug(errString);
			failed = true;
			throw errString;
		});
	}
	function shutdownManual() {
		return shutdown("manual");
	}
	return shutdownManual;
}
var http_graceful_shutdown_default = GracefulShutdown;
function getGracefulShutdownConfig() {
	return {
		disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
		signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
		timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
		forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
	};
}
function setupGracefulShutdown(listener$1, nitroApp$1) {
	const shutdownConfig = getGracefulShutdownConfig();
	if (shutdownConfig.disabled) return;
	http_graceful_shutdown_default(listener$1, {
		signals: shutdownConfig.signals.join(" "),
		timeout: shutdownConfig.timeout,
		forceExit: shutdownConfig.forceExit,
		onShutdown: async () => {
			await new Promise((resolve$1) => {
				const timeout = setTimeout(() => {
					console.warn("Graceful shutdown timeout, force exiting...");
					resolve$1();
				}, shutdownConfig.timeout);
				nitroApp$1.hooks.callHook("close").catch((error) => {
					console.error(error);
				}).finally(() => {
					clearTimeout(timeout);
					resolve$1();
				});
			});
		}
	});
}
var cert = process.env.NITRO_SSL_CERT;
var key = process.env.NITRO_SSL_KEY;
var nitroApp = useNitroApp();
var server = cert && key ? new Server$1({
	key,
	cert
}, toNodeHandler(nitroApp.fetch)) : new Server(toNodeHandler(nitroApp.fetch));
var port = destr(process.env.NITRO_PORT || process.env.PORT) || 3e3;
var host = process.env.NITRO_HOST || process.env.HOST;
var path = process.env.NITRO_UNIX_SOCKET;
var listener = server.listen(path ? { path } : {
	port,
	host
}, (err) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	const protocol = cert && key ? "https" : "http";
	const addressInfo = listener.address();
	if (typeof addressInfo === "string") {
		console.log(`Listening on unix socket ${addressInfo}`);
		return;
	}
	const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
	const url = `${protocol}://${addressInfo.family === "IPv6" ? `[${addressInfo.address}]` : addressInfo.address}:${addressInfo.port}${baseURL}`;
	console.log(`Listening on ${url}`);
});
trapUnhandledNodeErrors();
setupGracefulShutdown(listener, nitroApp);
var node_server_default = {};
const rendererTemplate = () => new HTTPResponse("<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <link rel=\"icon\" type=\"image/svg+xml\" href=\"/vite.svg\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>yt-downloader</title>\n    <script type=\"module\" crossorigin src=\"/assets/index-DOaUdf3I.js\"><\/script>\n    <link rel=\"stylesheet\" crossorigin href=\"/assets/index-_yd0EqOq.css\">\n  </head>\n  <body>\n    <div id=\"root\"></div>\n  </body>\n</html>\n", { headers: { "content-type": "text/html; charset=utf-8" } });
function renderIndexHTML(event) {
	return rendererTemplate(event.req);
}
export { node_server_default as n, renderIndexHTML as t };
