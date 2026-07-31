# Physical ML deployment feasibility

## Assumption

The credible compatibility path is ONNX Runtime Web with WebAssembly as the required Safari and Capacitor iOS backend. WebGPU may accelerate supported browsers but cannot be required. Inference must remain offline; model and WASM files must be packaged as versioned static application assets.

## Constraints to verify in a future isolated spike

- Resolve model and WASM URLs correctly under the static export and Capacitor asset origin; keep runtime/model versions matched.
- Confirm the application content-security policy permits local worker and WASM loading without remote scripts.
- Measure cold load, warm inference, peak memory, and disposal on representative older and current iPhones.
- Prefer a worker where Capacitor WebView behavior permits it; retain a single-threaded fallback where cross-origin isolation is unavailable.
- Quantize only after measuring localization loss. Record runtime package, WASM, and model bytes separately.
- Preload or warm up outside interaction-critical UI, but do not delay normal app startup for an optional physical import.
- Keep preprocessing/postprocessing deterministic and compare coordinates through the same evaluator as the handcrafted baseline.

ONNX Runtime documents WASM support for Safari/iOS, while WebGPU is unavailable there and WebGL is in maintenance mode. ONNX Runtime Web also supports custom/minimal builds, but operator coverage and maintenance cost must be checked against the selected model. No dependency or model is added in this sprint because there is no Stage A dataset and therefore no concrete model whose operators, size, or accuracy can be measured.

## Candidate model envelope

Start with transfer learning for one `logical-stack` class at a bounded input resolution. A visible-top-card detector plus deterministic stack expansion is the fallback target if logical-stack reviewer agreement is poor. Do not train from scratch on four photos. Use synthetic images only as supplemental pretraining/augmentation and split real photos by deck/session.

## Go criteria for a runtime spike

Begin only after Stage A export is validated, five real annotation sessions establish practical throughput, reviewers show acceptable logical-stack agreement, and at least one compact architecture has a documented license and conversion path. The spike must report model size, WASM assets, cold/warm latency, memory, static export, worker behavior, Capacitor iOS execution, and held-out accuracy. Until then deployment is technically credible but empirically unproven.
