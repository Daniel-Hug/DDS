/*global define */
(function (root, factory) {
	'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['object-subscribe', 'subscribable.js'], factory);
    } else {
        // Browser globals
        root.DDS = factory(root.Obj, root.Subscribable);
    }
})(this, function(Obj, Subscribable) {
	'use strict';

	function uid() {
		return (+(Math.random() + '00').slice(2)).toString(36);
	}

	function appendAtIndex(parent, newChild, index) {
		var nextSibling = parent.children[index];
		parent.insertBefore(newChild, nextSibling);
	}

	// Bind an array of Data objects to the DOM:
	var DDS = function(objects) {
		this.subscribers = {};
		this.objects = [];

		(objects || []).forEach(this.add, this);
	};

	DDS.prototype = new Subscribable();
	Obj.extend({
		whenever: function(event, fn) {
			if (event === 'add' || event === 'any') {
				for (var _id in this.objects) fn(event, this.objects[_id]);
			}
			this.on(event, fn);
		},

		add: function(obj) {
			if (obj._id === undefined) {
				obj._id = uid();
			}
			else if ( this.find({_id: obj._id}) ) return;
			if (obj._ts === undefined) obj._ts = Date.now();
			this.objects.push(obj);

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

		findAll: function(queryObj) {
			var array = [];
			this.objects.forEach(function(dataObj) {
				for (var key in queryObj) {
					if (queryObj[key] !== dataObj[key]) return;
				}
				array.push(dataObj);
			});
			return array;
		},

		find: function(queryObj) {
			var numObjects = this.objects.length;
			search:
			for (var i = 0; i < numObjects; i++) {
				var dataObj = this.objects[i];
				for (var key in queryObj) {
					if (queryObj[key] !== dataObj[key]) continue search;
				}
				return dataObj;
			}
		},

		nonDeleted: function() {
			return this.findAll({_isDeleted: undefined});
		},

		// Keep DOM updated with latest data, return renderer
		render: function(renderer) {
			renderer.dds = this;
			renderer.refreshModel();
			renderer.refresh();

			// keep view updated:
			this.on('add edit remove', renderer.render.bind(renderer));

			return renderer;
		}
	}, DDS.prototype);






	DDS.Renderer = function(options) {
		options = options || {};
		this.objects = [];
		this.subscribers = {};
		this.requiredKeys = options.requiredKeys;
		this.sorter = options.sort || function(array) {
			return array.reverse();
		};
		this.filterer = options.filter || function() {
			return true;
		};
	};

	// These are the base methods of DDS.Renderer instances.
	// Usable DDS Renderers should extend the base DDS.Renderer with the following methods:
	// add(obj, index), remove(obj._id), refresh(), sort(fn)
	DDS.Renderer.prototype = new Subscribable();
	Obj.extend({
		refreshModel: function() {
			this.objects = this.sorter(this.dds.nonDeleted().filter(this.filterer));
		},

		render: function(action, newObj, oldObj, DDSRendererNotToUpdate) {
			this.refreshModel();
			if (this === DDSRendererNotToUpdate) return;
			var isEdit = action === 'edit';

			// On edit, only update view if a required key changed
			objDiff:
			if (isEdit && this.requiredKeys && this.requiredKeys.length) {
				for (var i = 0, l = this.requiredKeys.length; i < l; i++) {
					var key = this.requiredKeys[i];
					if (newObj[key] !== oldObj[key]) break objDiff;
				}
				return;
			}

			if (isEdit || action === 'remove') {
				this.remove(newObj._id);
			}
			if (isEdit || action === 'add') {
				if (!this.filterer(newObj)) return;
				this.add(newObj, this.objects.indexOf(newObj));
			}
			this.trigger(action);
		},

		filter: function(fn) {
			this.filterer = fn;

			// refresh view:
			var nonDeletedArr = this.dds.nonDeleted();
			var displayArray = this.sorter(nonDeletedArr.filter(this.filterer));

			nonDeletedArr.forEach(function(object) {
				var elIndex = displayArray.indexOf(object);
				if (elIndex >= 0) {
					this.add(object, elIndex);
				} else {
					this.remove(object._id);
				}
			}, this);
			this.trigger('filter');
		},

		edit: function(obj, changes) {
			this.dds.edit(obj, changes, this);
		}
	}, DDS.Renderer.prototype);





	DDS.DOMRenderer = function(options) {
		Obj.extend(new DDS.Renderer(options), this);
		this.renderer = options.renderer;
		this.parent = options.parent;
		this.elements = {};
	};

	DDS.DOMRenderer.prototype = new DDS.Renderer();
	Obj.extend({
		elFromObject: function(object) {
			return (this.elements[object._id] = this.renderer(object));
		},

		add: function(object, elIndex) {
			if (this.elements[object._id]) return;
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

		renderMultiple: function(array, renderer) {
			var renderedEls = array.map(renderer || this.elFromObject, this);
			var docFrag = document.createDocumentFragment();
			var numEls = renderedEls.length;
			for (var i = 0; i < numEls; i++) docFrag.appendChild(renderedEls[i]);
			this.parent.appendChild(docFrag);
		},

		refresh: function() {
			this.emptyParent();
			this.renderMultiple(this.objects);
		},

		sort: function(fn) {
			this.sorter = fn;
			this.objects = this.sorter(this.objects);
			this.renderMultiple(this.objects, function(object) {
				return this.parent.removeChild(this.elements[object._id]);
			});
			this.trigger('sort');
		}
	}, DDS.DOMRenderer.prototype);

	return DDS;
});