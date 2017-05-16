# Graphics Region

Copyright (C) 2017 by Sean Werkema

A JavaScript implementation of the Region abstract data type, which GUIs use to perform constructive solid geometry with 2-D rectangles.

Licensed under the Apache 2.0 open-source license.

## Usage

In a browser:

  - Include `region.js` in your page as a script.  It will introduce two new global types, `Region1D` and `Region2D`.

In NodeJS or a CommonJS environment:

  - `import Region2D from "graphics-region";`
    or
  - `import { Region1D, Region2D } from "graphics-region";`

## Region1D usage

All Region1D operations run in O(n) time, except for the binary operations (which run in O(n+m) time),
and for a few operations that are O(1) or O(lg n), as noted below.

**Construction:**

`var myRegion = new Region1D([span1Min, span1Max, span2Min, span2Max, span3Min, span3Max, ...]);`

1-D regions are composed of spans of included content.  Span endpoints are of the form [min, max).
The minima and maxima of a span may include either positive or negative infinity.  Spans must not
overlap or adjoin, and must appear in strictly ascending order.  All 1-D regions are immutable once
constructed.

**Binary operations:**

```
var newRegion = myRegion.union(yourRegion);
var newRegion = myRegion.intersect(yourRegion);
var newRegion = myRegion.xor(yourRegion);
var newRegion = myRegion.subtract(yourRegion);
```

**Unary operations:**

```
var newRegion = myRegion.not();
var newRegion = myRegion.clone();
```

**Testing and miscellaneous:**

```
var bool = myRegion.isEmpty();                  // O(1)
var bool = myRegion.isPointIn(x);               // O(lg n)
var bool = myRegion.doesIntersect(yourRegion);  // O(n+m)
var bool = myRegion.equals(yourRegion);         // O(n)
```

**Data extraction:**

```
var arrayOfRects = myRegion.getAsRects(minY, maxY);
var arrayOfSpans = myRegion.getSpans();         // This returns a copy, not the original span data.
var minAndMax = myRegion.getBounds();           // O(1)
```

