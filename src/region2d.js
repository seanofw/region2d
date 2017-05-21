import Region1D from './region1d';

/**
 * Region2D objects are semi-opaque data structures that represent a 2-dimensional
 * set in the plane, described using axis-aligned rectangles of included points.
 * 
 * ------------------------------------------------------------------------------------------------
 * 
 * Region2D objects are capable of performing most major set-theoretic operations, including:
 * 
 *   result = a.union(b);           // Return a new set that is the logical union of the two sets.
 *   result = a.intersect(b);       // Return a new set that is the logical intersection of the two sets.
 *   result = a.subtract(b);        // Return the logical subtraction of the two sets, i.e., the
 *                                  //   equivalent of a.union(b.not()), but computed more efficiently.
 *   result = a.xor(b);             // Return the exclusive-or of the two sets, i.e., those ranges
 *                                  //   which exist in one set or the other but not both.
 *   result = a.not();              // Return the logical complement of the set (which may include infinity).
 *   result = a.isEmpty();          // Return true/false if the set is empty.
 *   result = a.isFinite();         // Return true/false if the set is finite (doesn't stretch to infinity).
 *   result = a.isInfinite();       // Return true/false if the set stretches to infinity in any direction.
 *   result = a.isRectangular();    // Return true/false if the set can be described by a single rectangle.
 *   result = a.isPointIn(x, y);    // Return true if the given point is contained within the set.
 *   result = a.doesIntersect(b);   // Return true if the logical intersection of the two sets is nonempty.  This is
 *                                  //   more efficient than performing "!a.intersect(b).isEmpty()".
 *   result = a.equals(b);          // Return true if the sets are identical.
 *   result = a.getCount();         // Return the number of nonoverlapping rectangles that would describe this Region2D.
 *   result = a.getRects();			// Return an array of nonoverlapping rectangles describing the Region2D.
 *   result = a.getBounds(b);       // Return a boundary rectangle containing all of the points of the Region2D.
 *
 * All Region2D operations are carefully written to be bounded in both time and
 * space, and all will run in no worse than O(n) or O(n+m) time.
 *
 * ------------------------------------------------------------------------------------------------
 * 
 * Under the hood, this is partially implemented using Region1D.  Each Region2D consists of an
 * array of Region1D "rows" or "bands," which represent sets of rectangles with identical
 * minY/maxY coordinates.  Each of the rows must be nonempty and must be unique (i.e., a successive
 * row's spans must not equal a previous row spans, if the maxY of the previous row equals the minY
 * of the successive row).
 * 
 * Representing regions like this is how X Windows does it, and while this design may not always
 * result in the most optimized set of rectangles, the operations to work with these kinds of
 * regions are provably efficient:  This design trades space for time.
 * 
 * As a rather nice side-effect of the design, calls to getRects() will always result in a set
 * of rectangles that go from top-to-bottom, left-to-right on the screen, which can be beneficial
 * in some rendering scenarios.
 * 
 * This implementation also has performance optimizations to avoid combining regions when the
 * operations are meaningless or would result in the empty set, and there are various kinds of
 * boundary checks to early-out operations wherever possible.
 */
const Region2D = (function() {

	let infinite, empty;

	const

	//---------------------------------------------------------------------------------------------
	// Global constants.
	
	// Precache positive/negative infinity locally.
	pInf = Number.POSITIVE_INFINITY,
	nInf = Number.NEGATIVE_INFINITY,

	//---------------------------------------------------------------------------------------------
	// Helper functions.

	/**
	 * Construct a wrapper around the given private data that makes it opaque except for 
	 * those with access to the 'expectedKey'.
	 */
	makeProtectedData = function(protectedData, expectedKey) {
		return function(actualKey) {
			if (actualKey === expectedKey) return protectedData;
			else throw "Illegal access";
		};
	},

	/**
	 * Determine if the given object is an array. This is provided in newer JavaScript environs,
	 * but is notably lacking in older ones.  We avoid a dependency on a huge package like CoreJS
	 * by just defining the shim here.
	 */
	isArray = function(o) {
		return Array.isArray ? Array.isArray(o) : o instanceof Array;
	},

	//---------------------------------------------------------------------------------------------
	// Region internals.

	/**
	 * Make a 'generator' function that, upon each invocation, will return the next
	 * pair of rows that need to be combined, as the form { row1:, row2:, minY:, maxY: },
	 * where row1 and row2 are the original Region1D objects, and minY and maxY should
	 * be the Y coordinates of the resulting combined row.  This is actually a lot simpler
	 * than it looks, but many separate cases need to be handled.
	 * 
	 * On each separate invocation, the generator will return a new pair object until it
	 * runs out of source rows, and then it will return null.
	 */
	makeRowPairGenerator = function(rows1, rows2) {
		let rowIndex1 = 0;
		let rowIndex2 = 0;
		let lastY = nInf;
		let empty = Region1D.empty;

		return function() {

			//-------------------------------------------------------------------------------------
			// Step 1.  First, see if we've run out of data in either set.

			if (rowIndex1 >= rows1.length) {
				// No more left in rows1, so just take whatever's left of rows2.
				if (rowIndex2 >= rows2.length)
					return null;
				else {
					const result = {
						row1: empty, row2: rows2[rowIndex2].region,
						minY: Math.max(rows2[rowIndex2].minY, lastY), maxY: (lastY = rows2[rowIndex2].maxY)
					};
					rowIndex2++;
					return result;
				}
			}
			else if (rowIndex2 >= rows2.length) {
				// No more left in rows2, so just take whatever's left of rows1.
				const result = {
					row1: rows1[rowIndex1].region, row2: empty,
					minY: Math.max(rows1[rowIndex1].minY, lastY), maxY: (lastY = rows1[rowIndex1].maxY)
				};
				rowIndex1++;
				return result;
			}
			else {
				// We have remaining rows in both rows1 and rows2, so now we need
				// to do the general case.
			}

			//-------------------------------------------------------------------------------------
			// Step 2. Extract out the next row pair.  This is a somewhat-straightforward
			//   decision-tree approach, and is very fast, but since there are many possible
			//   cases, there are a lot of conditionals below to test for all of them.

			const row1 = rows1[rowIndex1];
			const row2 = rows2[rowIndex2];
			const nextY1 = Math.max(row1.minY, lastY);
			const nextY2 = Math.max(row2.minY, lastY);

			let da, db, minY, maxY;

			if (nextY1 === nextY2) {
				// The A-side and B-side rows having a matching top edge.
				minY = nextY1;

				// These match the first half of the conditionals described below.
				da = row1.region, db = row2.region;
				if (row2.maxY < row1.maxY) {
					lastY = maxY = row2.maxY;
					rowIndex2++;
				}
				else if (row2.maxY === row1.maxY) {
					lastY = maxY = row1.maxY;
					rowIndex1++, rowIndex2++;
				}
				else {
					lastY = maxY = row1.maxY;
					rowIndex1++;
				}
			}
			else if (nextY1 < nextY2) {
				// The A-side row is strictly above the B-side row.
				minY = nextY1;

				// These match the second half of the conditionals described below.
				da = row1.region, db = empty;
				if (nextY2 >= row1.maxY) {
					lastY = maxY = row1.maxY;
					rowIndex1++;
				}
				else {
					lastY = maxY = nextY2;
				}
			}
			else {
				// The B-side row is strictly above the A-side row.
				minY = nextY2;

				// These match the second half of the conditionals described below, inverted.
				da = empty, db = row2.region;
				if (nextY1 >= row2.maxY) {
					lastY = maxY = row2.maxY;
					rowIndex2++;
				}
				else {
					lastY = maxY = nextY1;
				}
			}

			//-------------------------------------------------------------------------------------
			// Step 3. Emit the result for this row pair.

			const result = {
				row1: da, row2: db,
				minY: minY, maxY: maxY
			};
			return result;

			/*
				//-------------------------------------------------------------------------------------
				// Step 2, in detail.  Both sides follow the same basic algorithm, as
				// explained below:
				//
				// Find the maxY, and iterate whichever side is the next one that requires
				// iteration (possibly both).

				if (ay === by) {
					// Top edges are equal, so we're consuming part or all of both rows.
					//
					// Case 1.  +-------+   +-------+   <--- top equal
					//          |   a   |   |   b   |

					// Three possibilities:  rb.maxY is above, equal to, or below ra.maxY.
					if (rb.maxY < ra.maxY) {
						// Case 1a.  +-------+   +-------+   <--- top equal
						//           |   a   |   |   b   |
						//           |       |   +-------+   <--- bottom above
						//           +-------+
						// Consume all of rb, but only the top part of ra.
						lastY = maxY = rb.maxY;
						da = ra.region;
						db = rb.region;
						ib++;
					}
					else if (rb.maxY === ra.maxY) {
						// Case 1b.  +-------+   +-------+   <--- top equal
						//           |   a   |   |   b   |
						//           +-------+   +-------+   <--- bottom equal
						// Consume both ra and rb.
						lastY = maxY = ra.maxY;
						da = ra.region;
						db = rb.region;
						ia++;
						ib++;
					}
					else {
						// Case 1c.  +-------+   +-------+   <--- top equal
						//           |   a   |   |   b   |
						//           +-------+   |       |
						//                       +-------+   <--- bottom below
						// Consume all of ra, but only the top part of rb.
						lastY = maxY = ra.maxY;
						da = ra.region;
						db = rb.region;
						ia++;
					}
				}
				else if (by >= ra.maxY) {
					// Degenerate case:  by is past ra.maxY, so there
					// is no overlap at all.
					//
					// Case 2.  +-------+   
					//          |   a   |
					//          +-------+
					//                      +-------+   <--- top entirely below a
					//                      |   b   |
					//                      +-------+
					// Consume all of ra, and none of rb.
					lastY = maxY = ra.maxY;
					da = ra.region;
					db = empty;
					ia++;
				}
				else {
					// Top edge of rb is below the top edge of ra, but there's definitely
					// overlap.  So we now need to decide how much overlap.
					//
					// Case 3.  +-------+   
					//          |   a   |   +-------+   <--- top below
					//          |       |   |   b   |
					//
					// Consume the next part of ra through by, but none of rb.
					lastY = maxY = by;
					da = ra.region;
					db = empty;
				}
			*/
		};
	},

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
	 *   - We compute the overall region hash as we go.
	 *   - We only compute the boundary min/max Y coordinates after all rows are added.
	 *
	 * Neither input region may be empty.
	 *
	 * The result is always a valid region if the two input regions are valid regions.
	 */
	combineData = function(array1, array2, rowTransform) {

		// Make the generator that spits out pairs of rows to combine.
		const pairGenerator = makeRowPairGenerator(array1, array2);

		// Spin over all the pairs of input rows, and combine them together to produce
		// the output region.
		let lastResult = null;
		const result = [];
		let minX = pInf, maxX = nInf;
		let hash = 0;
		let count = 0;
		for (let pair; pair = pairGenerator(); ) {

			// Perform the 1-dimensional version of the transform.
			const resultRow = rowTransform(pair.row1, pair.row2);

			// If the result is empty, we don't add it.
			if (resultRow.isEmpty())
				continue;

			// If the result is the same as the previous row's result, and they're immediately
			// adjacent, then just expand the previous row: Don't add a new one.
			if (lastResult && resultRow.equals(lastResult.region) && lastResult.maxY == pair.minY) {
				lastResult.maxY = pair.maxY;
				continue;
			}

			// New result row, and it's valid content, so add it to the result.
			result.push(lastResult = {
				region: resultRow,
				minY: pair.minY,
				maxY: pair.maxY,
			});

			// Update the rectangle count.
			count += resultRow.getCount();

			// Update the minima and maxima for this 2-D region based on the new row.
			const rowBounds = resultRow.getBounds();
			if (rowBounds.min < minX) minX = rowBounds.min;
			if (rowBounds.max > maxX) maxX = rowBounds.max;

			// Update the hash (checksum) for the 2-D region based on the 1-D row hash.
			hash *= 23;
			hash += resultRow.getHashCode() | 0;
			hash &= ~0;
		}

		// Finally, generate the 2-D region data itself.
		const newRegionData = {
			array: result,
			count: count,
			minX: minX,
			minY: result.length ? result[0].minY : pInf,
			maxX: maxX,
			maxY: result.length ? result[result.length-1].maxY : nInf,
			hash: hash
		};
		return newRegionData;
	},
	
	/**
	 * Calculate the union of the given arrays of 2-D region data.
	 * Returns a new array that contains the 2-D union.
	 */
	unionData = (array1, array2) => combineData(array1, array2, (r1, r2) => r1.union(r2)),

	/**
	 * Calculate the intersection of the given arrays of 2-D region data.
	 * Returns a new array that contains the 2-D intersection.
	 */
	intersectData = (array1, array2) => combineData(array1, array2, (r1, r2) => r1.intersect(r2)),

	/**
	 * Calculate the exclusive-or of the given arrays of 2-D region data.
	 * Returns a new array that contains the 2-D exclusive-or.
	 */
	xorData = (array1, array2) => combineData(array1, array2, (r1, r2) => r1.xor(r2)),

	/**
	 * Calculate the difference of the given arrays of 2-D region data.
	 * Returns a new array that contains the 2-D difference.
	 */
	subtractData = (array1, array2) => combineData(array1, array2, (r1, r2) => r1.subtract(r2)),
	
	/**
	 * Determine if the bounding rectangles of each region actually overlap.  If they
	 * don't overlap, we can often treat region operations as special degenerate cases.
	 * This runs in O(1) time.
	 */
	doBoundsOverlap = function(data1, data2) {
		return !(data1.minX > data2.maxX
			|| data1.maxX < data2.minX
			|| data1.minY > data2.maxY
			|| data1.maxY < data2.minY);
	},
	
	/**
	 * Make region data from a single rectangle, in one of the three major rectangle forms:
	 *     - An object with { x:, y:, width:, height: } properties.
	 *     - An object with { left:, top:, right:, bottom: } properties.
	 *     - An array with [x, y, width, height] values.
	 * 
	 * This is fairly straightforward, and runs in O(1) time.
	 */
	makeRegionDataFromOneRect = function(rect) {

		// Calculate the actual rectangle coordinates from whatever object was passed in.
		let minX, maxX, minY, maxY;
		if (isArray(rect)) {
			if (rect.length !== 4) {
				console.error("Cannot construct a Region2D; invalid rectangle data.");
				throw "Data error";
			}
			minX = Number(rect[0]), minY = Number(rect[1]);
			maxX = Number(rect[2]), maxY = Number(rect[3]);
		}
		else if ("left" in rect) {
			minX = Number(rect.left), minY = Number(rect.top);
			maxX = Number(rect.right), maxY = Number(rect.bottom);
		}
		else {
			minX = Number(rect.x), minY = Number(rect.y);
			maxX = minX + Number(rect.width), maxY = minY + Number(rect.height);
		}

		// Validate the rectangle data.
		if (maxX <= minX || maxY <= minY) {
			console.error("Cannot construct a Region2D from a rectangle of zero or negative size.");
			throw "Data error";
		}

		// Construct the new row containing that rectangle.
		const region1D = new Region1D([minX, maxX]);

		// Now make the actual region data for this single-rect region.
		const data = {
			array: [ {
				region: region1D,
				minY: minY,
				maxY: maxY
			} ],
			count: 1,
			minX: minX,
			minY: minY,
			maxX: maxX,
			maxY: maxY,
			hash: region1D.getHashCode()
		};

		return data;
	},

	/**
	 * Construct an empty region consisting of no rectangles at all.
	 */
	makeEmptyRegionData = function() {
		return {
			array: [ ],
			count: 0,
			minX: pInf,
			minY: pInf,
			maxX: nInf,
			maxY: nInf,
			hash: 0
		};
	},

	/**
	 * Create a simple rectangle from the given region's internal bounding rect.
	 */
	getBoundsFromData = function(data) {
		return {
			x: data.minX,
			y: data.minY,
			width: data.maxX - data.minX,
			height: data.maxY - data.minY,
			left: data.minX,
			top: data.minY,
			right: data.maxX,
			bottom: data.maxY
		};
	},

	/**
	 * Get all of the rectangle data for this entire region.
	 */
	makeRects = function(array) {
		const result = [];
		for (let i = 0, l = array.length; i < l; i++) {
			const row = array[i];
			row.region.getAsRects(row.minY, row.maxY, result);
		}
		return result;
	},

	/**
	 * Determine whether this region stretches to infinity in any direction.
	 */
	isInfinite = function(data) {
		return data.minX === nInf || data.minY === nInf
			|| data.maxX === pInf || data.maxY === pInf;
	},
	
	/**
	 * Compare the Region1D data found in each array instance to each other for equality.
	 */
	arrayEquals = function(array1, array2) {
		if (array1.length != array2.length) return false;
		for (let i = 0, l = array1.length; i < l; i++) {
			if (!array1[i].equals(array2[i])) return false;
		}
		return true;
	},

	/**
	 * Determine if the data of region1 intersects the data of region2, and do so more efficiently
	 * than simply performing "!a.intersect(b).isEmpty()".
	 */
	doesIntersectData = function(data1, data2) {
		// TODO: Implement this better than the quick-and-dirty solution below.  Ideally,
		//    this should just test the data and early-out on the first hit, rather than
		//    actually *doing* all the work and then discarding the result.
		return !!intersectData(data1.array, data2.array).array.length;
	},

	/**
	 * Determine if the given point lies within the given region data.  This first performs
	 * some easy boundary checks, then efficiently finds the matching row (if any), and then
	 * invokes Region1D.isPointIn() to efficiently answer the question for real.  This runs in
	 * O(lg n) time, where 'n' is the number of rectangles in the region.
	 */
	isPointInData = function(data, x, y) {
		const array = data.array;

		// It can't be in the empty set.
		if (!array.length) return false;
		
		// If it's outside the bounds, it's definitely not in.
		if (y < data.minY || y > data.maxY
			|| x < data.minX || x > data.maxX) return false;
		
		if (array.length <= 5) {
			// Spin over all the rows in a simple linear search.
			for (let i = 0, l = array.length; i < l; i += 2) {
				if (y >= array[i].minY && y < array[i].maxY) {
					// Found the row.
					return array[i].region.isPointIn(x);
				}
			}
			return false;
		}
		else {
			// Binary search to find the row that y is within.
			let start = 0, end = array.length;
			while (start < end) {
				const midpt = ((start + end) / 2) & ~0;
				const row = array[midpt];
				if (y >= row.minY && y < row.maxY) {
					// Found the row, so see if 'x' lies within its spans.
					return row.region.isPointIn(x);
				}
				else if (y < row.minY) {
					end = midpt;
				}
				else {
					start = midpt + 1;
				}
			}
			return false;
		}
	},

	/**
	 * Check to ensure that the given object is actually a Region2D, and abort if it is not.
	 */
	verifyRegion2DType = function(obj) {
		if (!(obj instanceof Region2D)) {
			console.error("Object must be a Region2D instance.");
			throw "Type error";
		}
	},

	//---------------------------------------------------------------------------------------------
	// Public construction interface.
	
	/**
	 * A special private object used to flag internal constructions in such a way that
	 * external callers' data must be validated, but internal data can skip those checks.
	 */
	privateKey = {},

	/**
	 * Access the internal data, if this is an allowed thing to do.
	 */
	getData = function(region) {
		return region._opaque(privateKey);
	},

	/**
	 * Construct a 2-D region either from either nothing or from the given rectangle.
	 * 
	 * Usage:
	 *     var empty = new Region2d();
	 *     var rectRegion = new Region2d(rect);
	 * 
	 * The rectangle may be expressed as any of the following three forms:
	 *     - An object with { x:, y:, width:, height: } properties.
	 *     - An object with { left:, top:, right:, bottom: } properties.
	 *     - An array with [x, y, width, height] values.
	 * 
	 * Alternative internal invocation:
	 *     var region = new Region2d(regionData, privateKey);
	 */
	Region2D = function(rect, key) {
		const data = (key === privateKey) ? rect
			: (typeof rect !== 'undefined') ? makeRegionDataFromOneRect(rect)
			: makeEmptyRegionData();

		this._opaque = makeProtectedData(data, privateKey);
	};

	/**
	 * The region's prototype contains helpers that simply invoke the private operations
	 * to do all the hard work.
	 */
	Region2D.prototype = {
		union: function(other) {
			verifyRegion2DType(other);
			const data = getData(this), otherData = getData(other);
			return new Region2D(unionData(data.array, otherData.array), privateKey);
		},
		intersect: function(other) {
			verifyRegion2DType(other);
			const data = getData(this), otherData = getData(other);
			if (!doBoundsOverlap(data, otherData))
				return empty;
			return new Region2D(intersectData(data.array, otherData.array), privateKey);
		},
		subtract: function(other) {
			verifyRegion2DType(other);
			const data = getData(this), otherData = getData(other);
			if (!doBoundsOverlap(data, otherData))
				return this;
			return new Region2D(subtractData(data.array, otherData.array), privateKey);
		},
		xor: function(other) {
			verifyRegion2DType(other);
			const data = getData(this), otherData = getData(other);
			return new Region2D(xorData(data.array, otherData.array), privateKey);
		},
		not: function() {
			// Lazy implementation of 'not': Simply 'xor' with an infinite region.
			// A better implementation would take advantage of the efficient Region1d#not() method.
			const data = getData(this);
			return new Region2D(xorData(data.array, infinite.array), privateKey);
		},
		isEmpty: function() {
			return !getData(this).array.length;
		},
		isInfinite: function() {
			return isInfinite(getData(this));
		},
		isFinite: function() {
			return !isInfinite(getData(this));
		},
		isRectangular: function() {
			return getData(this).count === 1;
		},
		doesIntersect: function(other) {
			verifyRegion2DType(other);
			return doesIntersectData(getData(this));
		},
		isPointIn: function(x, y) {
			return isPointInData(getData(this), Number(x), Number(y));
		},
		equals: function(other) {
			verifyRegion2DType(other);
			const data = getData(this), otherData = getData(other);
			if (data.hash != otherData.hash
				|| data.count !== otherData.count) return false;
			return arrayEquals(data.array, otherData.array);
		},
		getCount: function() {
			return getData(this).count;
		},
		getRects: function() {
			return makeRects(getData(this).array);
		},
		getBounds: function() {
			return getBoundsFromData(getData(this));
		},
		getHashCode: function() {
			return getData(this).hash;
		}
	};

	/**
	 * A reusable infinite instance.
	 */
	Region2D.infinite = infinite = new Region2D([nInf, nInf, pInf, pInf]);

	/**
	 * A reusable empty instance.
	 */
	Region2D.empty = empty = new Region2D();
	
	return Region2D;
})();

export default Region2D;
export { Region1D, Region2D };
