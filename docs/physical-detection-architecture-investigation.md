# Physical detection architecture investigation

## Outcome

The multi-source Proposal V2 proof of concept is rejected. It improved the current near-miss working-tree detector from 44 to 45 matched logical regions, but precision collapsed from 37.6% to 7.0%, false proposals grew from 65 to 578, and duplicates grew from 8 to 17. Perspective-first made no change because none of the four photos produced a sufficiently reliable global estimate. Recognition-guided refinement was not run: the current diagnostics do not expose an independent best/second-best identity margin for every proposal, so using recognition here could silently reward a wrong crop.

**Primary recommendation: E. Retain the existing detector pending more training data.**

## Problem and protected baselines

The committed `885bc3958767a3f1573e5202124b1819ed381bd9` detector is the official baseline: 43/114 matches, 37.7% recall, 36.8% precision, 67 false proposals, 7 duplicates, and 0.455 mean matched IoU. The pre-existing uncommitted near-miss refinement remains intact and independently measured at 44/114, 38.6% recall, 37.6% precision, 65 false proposals, 8 duplicates, and 0.451 mean IoU. It was not committed because its evaluator and `package.json` overlap substantial unrelated work; forcing an isolated commit during this investigation would create avoidable risk.

The new harness routes `baseline-v1`, `proposal-v2`, and `perspective-first` explicitly. In this working tree `baseline-v1` reports the current detector output (the 44-match near-miss); the committed 43-match figures above remain the official historical baseline. All strategies use the same four canonical annotation files, normalized dimensions, IoU 0.30 threshold, greedy descending-IoU one-to-one matching, and duplicate definition. Runtime localization receives only detector diagnostics and fixture dimensions; only the evaluator reads annotations.

## Fixture geometry findings

The 114 logical regions vary too much for one reliable logical-stack scale prior. Median logical width/image ranges from 0.102 to 0.181; median height/image ranges from 0.084 to 0.227. Within-photo logical-width coefficients of variation are 0.36–0.53, so no fixture met the preregistered 0.25 reliability rule. Three fixtures are portrait-dominant and `slop-box` is landscape-dominant. Logical stacks commonly widen beyond the annotated top card (median logical/top width ratio about 1.01–1.78), while height is often similar (median ratio about 1.00–1.02). Median nearest-center spacing ranges from 0.056 to 0.118 of the image diagonal coordinate space.

Axis-aligned annotations cannot measure actual edge angle, vanishing direction, or homography. Consequently skew and perspective were estimated only from annotation-free component agreement, never from ground truth. Generalizable priors are the physical card aspect ratio with bounded distortion, per-photo consensus from multiple independent candidates, and a logical envelope around a visible top card. Exact fixture medians, positions, counts, or a 60-card total are overfit and are not runtime inputs. Full offline results are generated in `debug-output/physical-architecture/fixture-geometry-report.{json,md}`.

## Prototype

Proposal V2 combines three independently tagged candidate sources: geometry-filtered connected components, dominant-scale/card-aspect windows, and expanded raw-component stack-edge envelopes. Each proposal records sources, raw and normalized bounds, component scores, parent IDs, and refinement steps. Consolidation is deterministic and requires both IoU and normalized-center agreement; it does not reuse production suppression unchanged.

Perspective-first estimates component consensus and applies a transform only above confidence 0.72. Observed confidence was 0.000, 0.439, 0.026, and 0.349, so safe fallback was used for every fixture. This is a negative result: axis-aligned component boxes do not carry enough oriented-edge evidence for a defensible photo transform.

### Measured per-fixture results

| Fixture | GT | Near-miss matches / proposals | Proposal V2 matches / proposals | V2 recall | V2 precision | V2 mean IoU |
|---|---:|---:|---:|---:|---:|---:|
| aob | 24 | 9 / 34 | 10 / 160 | 41.7% | 6.3% | 0.475 |
| neddy-dragapult | 28 | 13 / 31 | 14 / 160 | 50.0% | 8.8% | 0.448 |
| rahul-crustle | 30 | 9 / 24 | 9 / 160 | 30.0% | 5.6% | 0.518 |
| slop-box | 32 | 13 / 28 | 12 / 160 | 37.5% | 7.5% | 0.410 |
| **Aggregate** | **114** | **44 / 117** | **45 / 640** | **39.5%** | **7.0%** | **0.458** |

Proposal V2 runtime was 30.8 ms aggregate for proposal routing/evaluation versus 6.8 ms for baseline routing, excluding the shared image detector and recognition pipeline. Approximate Node heap was recorded per fixture; it is not a browser peak-memory measurement. Machine-readable reports and SVG overlays are generated under `debug-output/physical-architecture/<strategy>/`.

## Architecture comparison

| Approach | Evidence | Recall / precision potential | Runtime and bundle | Offline / iOS | Data and risk |
|---|---|---|---|---|---|
| Current detector | Measured | 38.6% / 37.6% in current tree | Existing | Yes | High heuristic ceiling |
| Proposal V2 | Prototype result | 39.5% / 7.0% | +24 ms routing; no bundle dependency | Yes | Severe false-proposal growth |
| Perspective-first | Prototype result | Identical to V2; fallback on 4/4 | Small classical stage | Yes | Oriented evidence missing |
| Recognition-guided | Not measured | Unknown | Potentially high matcher multiplication | Yes | Wrong-identity feedback risk; deferred |
| Lightweight ML | Estimated | Potentially higher after transfer learning | Model/runtime bundle and cold start | WASM is viable; WebGPU is not a Safari/iOS baseline | Four photos/114 regions are insufficient; major overfit risk |

ONNX Runtime Web supports offline WASM across Safari/iOS, while its WebGPU backend is not supported there; WebGL is available but in maintenance mode. TensorFlow.js offers WebGL and WASM, with explicit tensor-memory management and warm-up costs. MediaPipe has native iOS object-detection support, but adopting it would add a parallel native integration and still require a licensed trained model. No runtime spike or model download was justified before acquiring training data.

The realistic ML path is transfer learning on a small detector using synthetic card composites plus controlled physical photos, holding out entire photos, detecting visible cards first, then clustering offsets into logical stacks. The current four photos should remain an evaluation set rather than training data. Model license, bundle size, cold start, WASM latency, and Capacitor memory must be measured before adoption.

## Failure analysis and overfitting

Proposal V2's additional sources mostly reproduced partial edges and textured background: 578 false proposals included many small partial-card candidates. The one aggregate match gain fails the continued-investment gate of roughly 55 matches and the adoption target of 69. It also exceeds the duplicate ceiling. No leave-one-fixture-out tuning was performed because no parameters were selected from annotation results; the unchanged candidate was evaluated on all fixtures. A proper follow-up dataset should hold out entire photos.

## Exact next sprint

Collect and annotate at least 20–30 varied physical deck photos under the existing schema, preserving the original four as a locked test set. Define train/validation/test splits by photo; generate licensed synthetic composites; train one compact visible-card detector; benchmark ONNX Runtime Web WASM in the actual Capacitor iOS shell; and evaluate a deterministic visible-card-to-logical-stack clustering layer. Do not replace production localization until the stated 69-match, 40% precision, 0.45 IoU, and ≤10 duplicate gates are met with no digital regression.

In plain language: combining more kinds of edge boxes found almost nothing new and created a flood of bad guesses. The photos also differ too much for one global card-size rule. The next useful evidence is a larger, varied photo dataset—not another threshold pass.
