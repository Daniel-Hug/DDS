/*global Obj*/

(function (arrProto) {
	'use strict';

	function each(arr, fn, scope) {
		for (var i = 0, l = arr.length; i < l; i++) {
			fn.call(scope, arr[i], i, arr);
		}
	}

	function map(arr, fn, scope) {
		var l = arr.length, newArr = [];
		for (var i = 0; i < l; i++) {
			newArr[i] = fn.call(scope, arr[i], i, arr);
		}
		return newArr;
	}

	function arrayMove(array, from, to) {
		return array.splice(to, 0, array.splice(from, 1)[0]);
	}

	// localStorage + JSON wrapper:
	var storage = {
		get: function(prop) {
			return JSON.parse(localStorage.getItem(prop));
		},
		set: function(prop, val) {
			localStorage.setItem(prop, JSON.stringify(val));
		}
	};

	// DOM rendering helpers:
	function removeChilds(parent) {
		var last;
		while ((last = parent.lastChild)) parent.removeChild(last);
	}

	function renderMultiple(arr, renderer, parent, keepOrder) {
		var renderedEls = map(arr, renderer),
			docFrag = document.createDocumentFragment(),
			l = renderedEls.length, i;
		if (keepOrder) for (i = 0; i < l; i++) docFrag.appendChild(renderedEls[i]);
		else while (l--) docFrag.appendChild(renderedEls[l]);
		removeChilds(parent);
		parent.appendChild(docFrag);
	}

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

	function appendAtIndex(parent, newChild, index) {
		var nextSibling = parent.children[index];
		parent.insertBefore(newChild, nextSibling);
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

	// Add a new element to each parasite:
	function parasitePush(arr, obj, indexInArr, parasiteNotToUpdate) {
		each(arr.parasites, function(parasite) {
			if (parasite === parasiteNotToUpdate) return;
			if (parasite.filter) {
				// Update cache of filtered array:
				parasite.filteredArr = arr.filter(parasite.filter);

				// Don't add if the object gets filtered:
				if (!parasite.filter(obj)) return;
			}

			var indexInFilteredArr = parasite.filter ? parasite.filteredArr.indexOf(obj) : indexInArr;
			var newElIndex = parasite.keepOrder ? indexInFilteredArr : (parasite.filteredArr || arr).length - 1 - indexInFilteredArr;
			var newChild = parasite.renderer(obj, indexInArr);
			appendAtIndex(parasite.parent, newChild, newElIndex);
		});
	}

	// Remove an element from a parasite:
	function parasiteRemove(arr, obj, indexInArr, parasiteNotToUpdate) {
		each(arr.parasites, function(parasite) {
			if (parasite === parasiteNotToUpdate) return;
			var indexInFilteredArr = parasite.filter ?
				parasite.filteredArr.indexOf(obj) :
				indexInArr;

			if (indexInFilteredArr === -1) return;

			var filteredArrLength = (parasite.filteredArr || this).length;

			// remove object from filtered array cache:
			if (parasite.filteredArr) {
				parasite.filteredArr.splice(indexInFilteredArr, 1);
			}

			var elIndex = parasite.keepOrder ?
				indexInFilteredArr :
				filteredArrLength - 1 - indexInFilteredArr;
			parasite.parent.removeChild(parasite.parent.children[elIndex]);
		}, arr);
	}

	var objSubscribeIsLoaded = typeof Obj === 'object';
	var hop = Object.prototype.hasOwnProperty;

	function has(obj, prop) {
		return hop.call(obj, prop);
	}


	// Bind an array of Data objects to the DOM:
	window.DDS = function(options) {
		var arr;
		if (options.storageID) {
			arr = storage.get(options.storageID) || (options.fallback ? map(options.fallback, window.DDS.prepObj) : []);
			this.storageID = options.storageID;
		}
		else arr = options.data;

		// Add each object in the array as an indexed item in the this object:
		arrProto.push.apply(this, arr);

		this.subscribers = [];
		this.parasites = [];
		if (options.sortKey) this.sortKey = options.sortKey;
	};

	window.DDS.prepObj = function(obj) {
		if (obj._ts === undefined) obj._ts = Date.now();
		if (obj._id === undefined) obj._id = uid(16);
		return obj;
	};

	window.DDS.prototype = {
		length: 0,

		subscribe: function(fn) {
			this.subscribers.push(fn);
		},

		notifySubscribers: function(obj) {
			this.updateStorage();
			each(this.subscribers, function(fn) {
				fn(obj);
			});
		},

		serialize: function() {
			return arrProto.slice.call(this);
		},

		updateStorage: function() {
			if (this.storageID) storage.set(this.storageID, this.serialize());
		},

		push: function(obj, indexInArr) {
			var arrLength = this.length;
			indexInArr = indexInArr !== undefined ? indexInArr :
				(this.sortKey ? sortedIndex(this, obj, this.sortKey) : arrLength);
			window.DDS.prepObj(obj);
			this.splice(indexInArr, 0, obj);
			this.notifySubscribers({
				object: obj
			});

			// Add new element to each parasite:
			parasitePush(this, obj, indexInArr);
		},

		// re-render any elements that should reflect the model of the object passed:
		edit: function(obj, whatToChange, parasiteNotToUpdate) {
			obj._lastEdit = Date.now();
			// Update model
			if (objSubscribeIsLoaded) {
				Obj.set(obj, whatToChange);
			} else {
				for (var key in whatToChange) if (has(whatToChange, key)) obj[key] = whatToChange[key];
			}

			// Update view(s):
			var curIndexInArr = this.indexOf(obj);
			var newIndexInArr = this.sortKey ? sortedIndex(this, obj, this.sortKey) : curIndexInArr;

			// Remove old element from each parasite:
			parasiteRemove(this, obj, curIndexInArr, parasiteNotToUpdate);

			if (obj._isDeleted) return;

			// Change index of object in array
			if (newIndexInArr !== curIndexInArr) {
				arrayMove(this, curIndexInArr, newIndexInArr);
			}

			// Add new element back to each parasite:
			parasitePush(this, obj, newIndexInArr, parasiteNotToUpdate);

			this.notifySubscribers({
				object: obj,
				whatChanged: whatToChange
			});
		},

		remove: function(obj) {
			this.edit(obj, {_isDeleted: true});
		},

		find: function(queryObj) {
			arrLoop:
			for (var i = 0, l = this.length; i < l; i++) {
				var dataObj = this[i];
				for (var key in queryObj) {
					if (queryObj[key] !== dataObj[key]) continue arrLoop;
				}
				return dataObj;
			}
		},


		/*
			Render each object in the array as an element, then stick the
			elements in the parasite's parent element in the order specified.
		*/
		attach: function(parasite) {
			parasite.hostData = this;
			this.parasites.push(parasite);
			renderMultiple(this.filter(function(obj) {
				return obj._isDeleted !== true;
			}), parasite.renderer, parasite.parent, parasite.keepOrder);

			return parasite;
		},

		indexOf: arrProto.indexOf,
		splice: arrProto.splice,
		filter: arrProto.filter
	};



	window.Parasite = function(parasite) {
		this.renderer = parasite.renderer;
		this.parent = parasite.parent;
		this.keepOrder = parasite.keepOrder;
		this.filteredArr = this.hostData;
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
		this.filteredArr = this.hostData.filter(this.filter);
		renderMultiple(this.filteredArr, this.renderer, this.parent, this.keepOrder);
	};

	window.Parasite.prototype.edit = function(obj, whatToChange) {
		if (!this.hostData) return;
		this.hostData.edit(obj, whatToChange, this);
	};
})(Array.prototype);