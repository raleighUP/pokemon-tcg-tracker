# Physical region alignment

The pre-alignment detector accepted closed Sobel components with a near-card aspect ratio. On the benchmark photos, broken sleeve borders rarely formed closed components, while playmat lettering and internal artwork/text rectangles did. The result was zero logical-stack matches at IoU 0.30.

The aligned detector supplements connected components with multi-scale edge-density windows, suppresses nested proposals deterministically, preserves the unexpanded window as `topCardBounds`, and expands it conservatively into `logicalStackBounds`. Quantity and identity behavior are unchanged.

Diagnostics expose raw components, geometry-filtered components, card-like windows, and final logical regions. `npm run evaluate:physical-regions` writes ignored per-stage SVG overlays, nearest-ground-truth size/offset diagnostics, failure taxonomy, and progressive IoU counts at 0.05, 0.10, 0.20, 0.30, and 0.50.

The first aligned result matches 42 of 114 logical regions at the official IoU 0.30 threshold. Candidate precision remains low because dense proposals are deliberately recall-oriented; false-region suppression is the next focused task.
