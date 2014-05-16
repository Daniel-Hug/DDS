/*global Obj */
(function () {
	'use strict';

	function pad(n, width, z) {
		z = z || '0';
		n = n + '';
		return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
	}

	function uid() {
		return (+(Math.random() + '00').slice(2)).toString(36);
	}

	function chronUID() {
		return pad(Date.now().toString(36), 9) + '_' + uid();
	}

	function appendAtIndex(parent, newChild, index) {
		var nextSibling = parent.children[index];
		parent.insertBefore(newChild, nextSibling);
	}

	// Bind an array of Data objects to the DOM:
	window.DDS = function(objects) {
		this.objects = {};
		this.subscribers = {
			add: [],
			remove: [],
			edit: [],
			change: []
		};

		var array = objects || [];
		if (Obj.type(objects) === 'object') {
			array = this.select.call({objects: objects}, {});
		}
		array.forEach(this.add, this);
	};

	window.DDS.prototype = {
		add: function(obj) {
			obj._id = obj._id || chronUID();
			if (this.objects[obj._id]) return;
			if (obj._ts === undefined) obj._ts = Date.now();
			this.objects[obj._id] = obj;

			// Notify subscribers:
			if (!obj._isDeleted) {
				this.trigger('add', obj);
			}
		},

		edit: function(obj, changes, DDSRendererNotToUpdate) {
			var oldObj = Obj.extend(obj);
			obj._lastEdit = Date.now();
			Obj.set(obj, changes);

			// Notify subscribers:
			var operation = obj._isDeleted ? 'remove' : (oldObj._isDeleted ? 'add' : 'edit');
			this.trigger(operation, obj, oldObj, DDSRendererNotToUpdate);
		},

		remove: function(obj) {
			this.edit(obj, {_isDeleted: true});
		},

		select: function(queryObj) {
			var array = [];
			loop:
			for (var _id in this.objects) {
				var dataObj = this.objects[_id];
				for (var key in queryObj) {
					if (queryObj[key] !== dataObj[key]) continue loop;
				}
				array.push(dataObj);
			}
			return array;
		},

		// subscribe to changes:
		on: function(event, fn) {
			this.subscribers[event].push(fn);
		},

		trigger: function(event, newObj, oldObj, DDSRendererNotToUpdate) {
			this.subscribers[event].concat(this.subscribers.change).forEach(function(fn) {
				fn(newObj, oldObj, event, DDSRendererNotToUpdate);
			});
		},

		// Keep DOM updated with latest data, return renderer
		render: function(options) {
			options.dds = this;
			var DOMRenderer = new window.DDS.DOMRenderer(options);
			DOMRenderer.refresh();

			// keep views updated:
			this.on('change', DOMRenderer.render.bind(DOMRenderer));

			return DOMRenderer;
		}
	};


	window.DDS.DOMRenderer = function(options) {
		this.renderer = options.renderer;
		this.parent = options.parent;
		this.dds = options.dds;
		this.requiredKeys = options.requiredKeys;
		this.elements = {};
		this.sorter = options.sort || function(array) {
			return array.reverse();
		};
		this.filterer = options.filter || function() {
			return true;
		};
	};

	window.DDS.DOMRenderer.prototype = {
		elFromObject: function(object) {
			return (this.elements[object._id] = this.renderer(object));
		},

		add: function(object, elIndex) {
			appendAtIndex(this.parent, this.elFromObject(object), elIndex);
		},

		remove: function(_id) {
			var el = this.elements[_id];
			if (!el) return;
			this.parent.removeChild(el);
			delete this.elements[_id];
		},

		emptyParent: function() {
			for (var _id in this.elements) {
				this.parent.removeChild(this.elements[_id]);
			}
			Obj.reset(this.elements);
		},

		render: function(newObj, oldObj, action, DDSRendererNotToUpdate) {
			if (this === DDSRendererNotToUpdate) return;

			// On edit, only update view if a required key changed:
			w:
			while (action === 'edit' && this.requiredKeys && this.requiredKeys.length) {
				for (var i = 0, l = this.requiredKeys.length; i < l; i++) {
					var key = this.requiredKeys[i];
					if (newObj[key] !== oldObj[key]) break w;
				}
				return;
			}

			if (action !== 'add') { // if edit / remove action:
				// remove old element:
				this.remove(newObj._id);
			}
			if (action !== 'remove') { // if edit / add action:
				// render element from newObj and append at proper index:
				if (!this.filterer(newObj)) return;
				this.add(newObj, this.getArray().indexOf(newObj));
			}
		},

		renderMultiple: function(array) {
			var renderedEls = array.map(this.elFromObject, this);
			var docFrag = document.createDocumentFragment();
			var numEls = renderedEls.length;
			for (var i = 0; i < numEls; i++) docFrag.appendChild(renderedEls[i]);
			this.parent.appendChild(docFrag);
		},

		getArray: function() {
			var nonDeletedArr = this.dds.select({_isDeleted: undefined});
			return this.sorter(nonDeletedArr.filter(this.filterer));
		},

		refresh: function() {
			this.emptyParent();
			this.renderMultiple(this.getArray());
		},

		filter: function(fn) {
			this.filterer = fn;

			// refresh view:
			var nonDeletedArr = this.dds.select({_isDeleted: undefined});
			var displayArray = this.sorter(nonDeletedArr.filter(this.filterer));

			nonDeletedArr.forEach(function(object) {
				var elIndex = displayArray.indexOf(object);
				if (elIndex >= 0) {
					if (this.elements[object._id]) return;
					this.add(object, elIndex);
				} else {
					this.remove(object._id);
				}
			}, this);
		},

		sort: function(fn) {
			this.sorter = fn;

			// reorder elements, Fix: this may not be the most efficient method:
			this.getArray().forEach(function(object) {
				this.parent.appendChild(this.parent.removeChild(this.elements[object._id]));
			}, this);
		},

		edit: function(obj, changes) {
			this.dds.edit(obj, changes, this);
		}
	};
})();