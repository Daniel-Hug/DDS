/*global storage, Obj, each, resetFBData, appendAtIndex, renderMultiple*/

(function (arrProto) {
	'use strict';

	// Insert an object into a sorted array of similar objects.
	// Objects are sorted (least to greatest) by the property passed as the third argument.
	function sortedIndex(array, objToInsert, key) {
		var low = 0,
			high = array.length,
			value = objToInsert[key];

		while (low < high) {
			var mid = (low + high) >>> 1;
			if (value >= array[mid][key]) low = mid + 1;
			else high = mid;
		}
		return low;
	}

	// Generate random integer within range
	function randomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	// Generate a unique ID
	var uid = (function(chars) {
		return function(length) {
			for (var i = 0, id = ''; i < length; i++) id += chars[randomInt(0,61)];
			return id;
		};
	})('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

	function prepObj(obj) {
		if (obj.ts === undefined) obj.ts = Date.now();
		if (obj.id === undefined) obj.id = uid(16);
		return obj;
	}

	// Add a new element to each parasite:
	function parasitePush(arr, obj, indexInArr) {
		each(arr.parasites, function(parasite) {
			if (parasite.filter) {
				// Update cache of filtered array:
				parasite.filteredArr = [].filter.call(this, parasite.filter);

				// Don't add if the object gets filtered:
				if(!parasite.filter(obj)) return;
			}

			var indexInFilteredArr = parasite.filter ? (parasite.filteredArr || this).indexOf(obj) : indexInArr;
			var newElIndex = parasite.keepOrder ? indexInFilteredArr : (parasite.filteredArr || this).length - 1 - indexInFilteredArr;
			var newChild = parasite.renderer(obj, indexInArr);
			appendAtIndex(parasite.parent, newChild, newElIndex);
		}, arr);
	}

	// Remove an element from a parasite:
	function parasiteRemove(arr, obj, indexInArr) {
		each(arr.parasites, function(parasite) {
			var indexInFilteredArr = parasite.filter ?
				parasite.filteredArr.indexOf(obj) :
				indexInArr;

			if (indexInFilteredArr === -1) return;

			// remove object from filtered array cache:
			if (parasite.filteredArr) {
				parasite.filteredArr.splice(indexInFilteredArr, 1);
			}

			var oldElIndex = parasite.keepOrder ?
				indexInFilteredArr :
				(parasite.filteredArr || this).length - 1 - indexInFilteredArr;
			parasite.parent.removeChild(parasite.parent.children[oldElIndex]);
		}, arr);
	}

	// Bind an array of Data objects to the DOM:
	window.Arr = function(options) {
		var arr;
		if (options.storageID) {
			arr = storage.get(options.storageID) || options.fallback || [];
			this.storageID = options.storageID;
		}
		else arr = options.data;
		[].push.apply(this, arr);
		this.parasites = [];
		if (options.sortKey) this.sortKey = options.sortKey;
	};

	window.Arr.prototype = {
		length: 0,

		updateStorage: function() {
			if (this.storageID) storage.set(this.storageID, [].slice.call(this));
		},

		push: function(obj, arrIndex) {
			var arrLength = this.length;
			arrIndex = arrIndex !== undefined ? arrIndex :
				(this.sortKey ? sortedIndex(this, obj, this.sortKey) : arrLength);
			prepObj(obj);
			this.splice(arrIndex, 0, obj);
			this.updateStorage();
			resetFBData();

			// Add new element to each parasite:
			parasitePush(this, obj, arrIndex);
		},

		remove: function(obj) {
			Obj.unsubscribe(obj);

			// remove object from host array:
			var arrIndex = this.indexOf(obj);
			this.splice(arrIndex, 1);

			// update storage:
			this.updateStorage();
			resetFBData();

			// remove element from each parasite:
			parasiteRemove(this, obj, arrIndex);
		},

		edit: function(obj, keyOrNewObj, value) {
			Obj.set(obj, keyOrNewObj, value);
			this.updateStorage();
			resetFBData();

			var oldIndexInArr = this.indexOf(obj);
			var newIndexInArr = this.sortKey ? sortedIndex(this, obj, this.sortKey) : oldIndexInArr;

			// Remove old element from each parasite:
			parasiteRemove(this, obj, oldIndexInArr);

			// Change index of object in array
			if (newIndexInArr !== oldIndexInArr) {
				this.splice(newIndexInArr, 0, this.splice(oldIndexInArr, 1));
			}

			// Add new element back to each parasite:
			parasitePush(this, obj, newIndexInArr);
		},



		/*
			Render each object in the array as an element and
			stick in the parent in the order specified. Update when data changes.
		*/
		attach: function(parasite) {
			parasite.hostData = this;
			this.parasites.push(parasite);
			renderMultiple(this, parasite.renderer, parasite.parent, parasite.keepOrder);

			return parasite;
		},

		indexOf: arrProto.indexOf,
		splice: arrProto.splice
	};



	window.Parasite = function(parasite) {
		this.renderer = parasite.renderer;
		this.parent = parasite.parent;
		this.keepOrder = parasite.keepOrder;
	};

	/*
		Filter which elements are to be rendered:
		parasite.setFilter(function(person) {
			return person.age > 50;
		});
	*/
	window.Parasite.prototype.setFilter = function(fn) {
		this.filter = fn;
		if (!this.hostData) return;
		this.filteredArr = arrProto.filter.call(this.hostData, this.filter);
		renderMultiple(this.filteredArr, this.renderer, this.parent, this.keepOrder);
	};
})(Array.prototype);