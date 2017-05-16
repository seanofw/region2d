
var Region = (function() {

	var

	//---------------------------------------------------------------------------------------------
	// Global constants.
	
	// Precache positive/negative infinity locally.
	pInf = Number.POSITIVE_INFINITY,
	nInf = Number.NEGATIVE_INFINITY,

	//---------------------------------------------------------------------------------------------
	// Miscellaneous helper functions.

	/**
	 * Determine if the given object is an array. This is provided in newer JavaScript environs,
	 * but is notably lacking in older ones.  We avoid a dependency on a huge package like CoreJS
	 * by just defining the shim here.
	 */
	isArray = function(o) {
		return Array.isArray ? Array.isArray(o) : o instanceof Array;
	},

	//---------------------------------------------------------------------------------------------
	// Row splitting/joining.
	
	/**
	 * This spins over the provided set of rows, and where subsequent rows match
	 * horizontal coordinates and have adjacent min/max edges, it mashes them
	 * together into a combined single row.  This will not alter the input data.
	 */
	mergeRows = function(rows) {
		var newRows = [];
		if (rows.length <= 0) return newRows;
		
		// Copy the first row verbatim.
		var prevRow = rows[0].clone();
		newRows.push(prevRow);
		
		for (var i = 1, l = rows.length; i < l; i++) {
			if (prevRow.maxY == rows[i].minY && prevRow.matches(rows[i])) {
				// Identical to previous row, except for height; so expand the
				// previous row.
				prevRow.maxY = rows[i].maxY;
			}
			else {
				// Different rows, so just copy the next row to the output.
				prevRow = rows[i].clone();
				newRows.push(prevRow);
			}
		}

		return newRows;
	},
	
	//---------------------------------------------------------------------------------------------
	// Region internals.

	/**
	 * Combine two regions together, returning a new region that is the result of having
	 * combined them, using the provided rowTransform to mutate their individual rows.
	 *
	 * This spins over the rows of the regions in parallel, "peeling off" each successive
	 * unique pair of rows with identical Y coordinates, and then invokes the transform
	 * to perform the actual combination.  The transformed row is then added to the pile
	 * of output rows, with a few interesting caveats to maintain the region invariants:
	 *
	 *   - We don't add a row that is identical to the previous row; we expand the previous row.
	 *   - We don't add empty rows at all.
	 *   - We do track the boundary min/max X coordinates as we go.
	 *   - We compute the overall region checksum as we go.
	 *   - We only compute the boundary min/max Y coordinates after all rows are added.
	 *
	 * Neither input region may be empty.
	 *
	 * The result is always a valid region if the two input regions are valid regions.
	 */
	combineInternal = function(r1, r2, rowTransform) {
		var rows1 = r1._rows, rows2 = r2._rows;
		var rowIndex1 = 0, rowIndex2 = 0;
		var y = null;
		
		var getNextRowPair = function() {
			if (y === null) {
				// Degenerate case:  First output row.
				y = rows1[0].minY;
				if (rows2[0].minY < y) y = rows2[0].minY;
				return {
					minY: y,
					maxY: rows1[0].maxY < rows2[0].maxY ? rows1[0].maxY : rows2[0].maxY,
					row1: rows1[0],
					row2: rows2[0]
				};
			}
			else {
				// General case: Somewhere in the middle, and we need to move
				// to the next output row.
				
				// Step 1. Find the next minimum 'y' value.
				
				// Step 2. If it's the start of both rows, take them both as if it's the first output row again.
				//         If it's the start of only one row, and that row start lies inside the row next to it.
			}
		};
	},
	
	/**
	 * Union the two regions together, returning a new region that is the result of having
	 * combined them.
	 */
	unionInternal = function(r1, r2) {
		if (isEmpty(r1)) return r2;
		if (isEmpty(r2)) return r1;
		return combineInternal(r1, r2, function(row1, row2) { return row1.union(row2); });
	},

	/**
	 * Intersect the two regions together, returning a new region that is the result of having
	 * combined them.
	 */
	intersectInternal = function(r1, r2) {
		if (!doBoundsOverlap(r1, r2) || isEmpty(r1) || isEmpty(r2))
			return new region();
		return combineInternal(r1, r2, function(row1, row2) { return row1.intersect(row2); });
	},

	/**
	 * Subtract the second region from the first, returning a new region that is the result
	 * of having combined them.
	 */
	subtractInternal = function(r1, r2) {
		if (!doBoundsOverlap(r1, r2) || isEmpty(r1) || isEmpty(r2))
			return r1;
		return combineInternal(r1, r2, function(row1, row2) { return row1.subtract(row2); });
	},

	/**
	 * Exclusive-or the two regions together, returning a new region that is the result of
	 * having combined them.
	 */
	xorInternal = function(r1, r2) {
		if (isEmpty(r1)) return r2;
		if (isEmpty(r2)) return r1;
		return combineInternal(r1, r2, function(row1, row2) { return row1.xor(row2); });
	},
	
	/**
	 * Determine if the bounding rectangles of each region actually overlap.  If they
	 * don't overlap, we can often treat region operations as special degenerate cases.
	 * This runs in O(1) time.
	 */
	doBoundsOverlap = function(r1, r2) {
		return !(r1._bounds.minX > r2._bounds.maxX
			|| r1._bounds.maxX < r2._bounds.minX
			|| r1._bounds.minY > r2._bounds.maxY
			|| r1._bounds.maxY < r2._bounds.minY);
	},
	
	/**
	 * This helper method allows a row to be quickly found using a Y coordinate.
	 * It returns the index of the row that contains that Y coordinate, or -1 if the
	 * Y coordinate is not in any row.  This runs in O(lg n) time.
	 */
	findIndexOfRowContainingY = function(region, y) {
		// Quick bounds check.
		if (y < region._bounds.minY || y > region._bounds.maxY) return -1;
		
		var rows = region._rows;

		if (rows.length <= 5) {
			// For relatively few rows, linear search wins for performance.
			for (var i = 0, l = rows.length; i < l; i++) {
				var row = rows[i];
				if (row.minY <= y && y < row.maxY) return i;
			}
		}
		else {
			// For many rows, binary search wins for performance.
			var start = 0, end = rows.length;
			while (start < end) {
				var midpt = (start + end) >> 1;	// Divide by two, but round down, and quickly.
				var row = rows[midpt];
				if (y < row.minY) {
					// Before this row.
					end = midpt;
				}
				else if (y >= row.maxY) {
					// After this row.
					start = midpt + 1;
				}
				else {
					// It's inside this row.
					return midpt;
				}
			}
		}

		return -1;
	},
	
	/**
	 * Make a region from a single rectangle, in canonical form.  This is straightforward, and runs in O(1) time.
	 */
	makeRegionFromOneRect = function(region, rect) {
		var point = rect.point;
		var size = rect.size;
		region._rows = [ new regionRow([point.x, point.x+size.width], point.y, point.y+size.height) ];
		region._bounds = { minX: point.x, minY: point.y, maxX: point.x+size.width, maxY: point.y+size.height };
		region._checksum = region._rows[0].checksum;
	},

	/**
	 * Create a simple rectangle from the given region's internal bounding rect.
	 */
	getBoundsInternal = function(region) {
		var bounds = region._bounds;

		return {
			x: bounds.minX,
			y: bounds.minY,
			width: bounds.maxX - bounds.minX,
			height: bounds.maxY - bounds.minY
		};
	},

	//---------------------------------------------------------------------------------------------
	// Argument parsing, validation, and canonicalization.

	/**
	 * Cause the parse to fail, and raise an error message.
	 */
	parseFail = function() {
		throw "Region data parsing fail.";
		console.warn("Cannot process rectangle data; it is not provided in a known format.");
	},

	/**
	 * Parse an object as a size.  The object must either be a two-valued array, or an object
	 * with 'width' and 'height' properties.  Returns the size as the form { width:, height: }.
	 */
	parseSizeObj = function(obj) {
		if (isArray(obj)) {
			if (obj.length != 2) parseFail();
			return { width: obj[0], height: obj[1] };
		}
		else {
			if (!('width' in obj && 'height' in obj)) parseFail();
			if (typeof obj.width !== 'number' || typeof obj.height !== 'number') parseFail();
			return { width: obj.width, height: obj.height };
		}
	},

	/**
	 * Parse one canonical size object from the provided input stream, in all supported formats.
	 * Returns a new size of the form { width:, height: }.
	 */
	parseSize = function(args, indexContainer) {
		if (typeof args[indexContainer.index] === 'object')
			return parseSizeObj(args[indexContainer.index++]);
		}
		else {
			if (indexContainer.index > args.length-2)
				parseFail();
			var width = args[indexContainer.index++];
			var height = args[indexContainer.index++];
			return { width: width, height: height };
		}
	},

	/**
	 * Parse an object as a point.  The object must either be a two-valued array, or an object
	 * with 'x' and 'y' properties.  Returns the point as the form { x:, y: }.
	 */
	parsePointObj = function(obj) {
		if (isArray(obj)) {
			if (obj.length != 2) parseFail();
			return { x: obj[0], y: obj[1] };
		}
		else {
			if (!('x' in obj && 'y' in obj)) parseFail();
			if (typeof obj.x !== 'number' || typeof obj.y !== 'number') parseFail();
			return { x: obj.x, y: obj.y };
		}
	},
	
	/**
	 * Parse one canonical point object from the provided input stream, in all supported formats.
	 * Returns a new point of the form { x:, y: }.
	 */
	parsePoint = function(args, indexContainer) {
		if (typeof args[indexContainer.index] === 'object')
			return parsePointObj(args[indexContainer.index++]);
		}
		else {
			if (indexContainer.index > args.length-2)
				parseFail();
			var x = args[indexContainer.index++];
			var y = args[indexContainer.index++];
			return { x: x, y: y };
		}
	},
	
	/**
	 * Parse one canonical rectangle object from the provided input stream, in all supported formats.
	 * Returns a new rectangle of the form { point:, size: }.
	 */
	parseRect = function(args, indexContainer) {
		if (indexContainer.index > args.length-1)
			parseFail();
		else if (isArray(args[indexContainer.index])) {
			var array = args[indexContainer.index++];
			var arrayIndexContainer = { index: 0 };
			var point = parsePoint(array, arrayIndexContainer);
			var size = parseSize(array, arrayIndexContainer);
			if (arrayIndexContainer.index != array.length)
				parseFail();
			return { point: point, size: size };
		}
		else if (typeof args[indexContainer.index] === 'object') {
			var obj = args[indexContainer.index++];
			var point = 'point' in obj ? parsePointObj(obj.point)
				: 'x' in obj && typeof obj.x === 'number'
					&& 'y' in obj && typeof obj.y === 'number' ? { x: obj.x, y: obj.y }
				: parseFail();
			var size = 'size' in obj ? parseSizeObj(obj.size)
				: 'width' in obj && typeof obj.width === 'number'
					&& 'height' in obj && typeof obj.height === 'number' ? { size: obj.size, height: obj.height }
				: parseFail();
			return { point: point, size: size };
		}
		else {
			var point = parsePoint(args, indexContainer);
			var size = parseSize(args, indexContainer);
			return { point: point, size: size };
		}
	},

	/**
	 * Given an arbitrary pile of objects and numbers and arrays, attempt to parse
	 * it as a sequence of rectangle data in all of the various supported data forms.
	 *
	 * A rectangle is any one of:
	 *   - An array containing a point followed by a size.
	 *   - An object containing a 'point' (array or obj), or 'x'/'y' numbers;
	 *       and a 'size' (array or obj), or 'width'/'height' numbers.
	 *   - A point followed by a size.
	 *
	 * A point is any one of:
	 *   - An array containing two numbers.
	 *   - An object containing an 'x' and a 'y'.
	 *   - A number followed by a number.
	 *
	 * A size is any one of:
	 *   - An array containing two numbers.
	 *   - An object containing a 'width' and a 'height'.
	 *   - A number followed by a number.
	 *
	 * Because the definition allows almost any of the most common representations to
	 * be valid, we use a recursive-descent parser to transform the input into 
	 */
	parseRects = function(args) {

		var indexContainer = { index: 0 };
		var rects = [];
		while (indexContainer.index < args.length) {
			rects.push(parseRect(args, indexContainer));
		}
		
		return rects;
	},
	
	//---------------------------------------------------------------------------------------------
	// Public construction interface.
	
	/**
	 * Construct a 2-D region from the given rectangle(s).  This is a proper object,
	 * with methods for performing operations like union/intersect/subtract/xor.
	 */
	region = function(arguments) {

		// Parse and validate the provided set of rectangles, however many there may be.
		var rects = parseRects(arguments);
		
		if (rects.length == 0) {
			// Empty set.
			this._rows = new regionRow([], pInf, nInf);
			this._bounds = { minX: pInf, minY: pInf, maxX: nInf, maxY: nInf };
			this._checksum = 0;
		}

		// One or more rectangles.  There are a handful of cases where we could try to
		// discover that there's no overlap and create the row data directly, but it's
		// likely not worth the effort in the general case.  So to support the general
		// case efficiently, we simply make a bunch of regions and union them together.
		//
		// In the degenerate case of a single input rectangle, this runs in O(1) time.
		
		// Construct the first (only?) rectangle.
		makeRegionFromOneRect(this, rects[0]);
		
		// Union all of the other rectangles to the result (this).
		var result = this;
		for (var i = 1, l = rects.length; i < l; i++) {
			var fakeRegion = {};
			makeRegionFromOneRect(fakeRegion, rects[i]);
			result = unionInternal(result, fakeRegion);
		}
		
		// Because regions (and rows) are immutable, it's safe to simply overwrite the
		// content of this region with the immutable, unioned result.
		this._rows = result._rows;
		this._bounds = result._bounds;
		this._checksum = result._checksum;
	};

	/**
	 * Set up the prototype with all of the expected methods on this region, mostly
	 * just invoking the simple functions that know how to do the work for real.
	 */
	region.prototype = {
		union: function(other) { return unionInternal(this, other); },
		intersect: function(other) { return intersectInternal(this, other); },
		subtract: function(other) { return subtractInternal(this, other); },
		xor: function(other) { return xorInternal(this, other); },
		not: function() { return notInternal(this); },
		isEmpty: function() { return !this._rows.length; },
		isPointInRegion: function(x, y) { return isPointInRegionInternal(this, x, y); },
		doesIntersect: function(other) { return doesIntersectInternal(this, other); },
		equals: function(other) { return equalsInternal(this, other); },
		getBounds: function() { return getBoundsInternal(this); },
		getRects: function() { return getRectsInternal(this); }
	};
	
	return region;

})();
