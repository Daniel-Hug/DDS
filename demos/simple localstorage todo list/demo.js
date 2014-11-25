/*global DDS, Firebase */
(function() {
	'use strict';



	/*
		Set up tasks data with localStorage
	*/

	var tasks = window.tasks = new DDS(storage.get('tasks') || []);

	tasks.on('any', function() {
		storage.set('tasks', tasks.objects);
	});

	// Add some default tasks if none exist:
	if (!tasks.objects.length) {
		[
			{done: false, title: 'Mark \'em off one by one.'},
			{done: false, title: 'Print them off.'},
			{done: false, title: 'Add tasks to your ToDo list.'}
		].forEach(tasks.add, tasks);
	}



	/*
		Create two different todo list views that use the same model
	*/

	var parent = qs('.app');
	var newTaskForm = qs(':scope .new-task-form', parent);
	var taskNameField = qs(':scope .task-name-field', parent);
	var taskList = qs(':scope .task-list', parent);

	function renderTask(taskObj) {
		// Create elements:
		var li = DOM.buildNode({ el: 'li', kid:
			{ el: 'label', kids: [
				{ el: 'input', type: 'checkbox', _className: 'visuallyhidden', _checked: taskObj.done, on_change: function() {
					tasks.edit(taskObj, {done: this.checked});
				} },
				{ _className: 'checkbox' },
				{ el: 'button', _className: 'icon-trash', on_click: [stopEvent, function() {
					tasks.remove(taskObj);
				}] },
				{ _className: 'title', on_click: stopEvent, kid:
					{ _contentEditable: true, kid: taskObj.title, on_input: function() {
						taskListView.edit(taskObj, {title: this.textContent});
					} }
				}
			] }
		});

		function stopEvent(event) {
			event.preventDefault();
			event.stopPropagation();
		}

		return li;
	}


	var taskListView = tasks.render(new DDS.DOMView({
		renderer: renderTask,
		parent: taskList,
		requiredKeys: ['done', 'title']
	}));


	// add task
	on(newTaskForm, 'submit', function(event) {
		event.preventDefault();
		tasks.add({done: false, title: taskNameField.value});
		taskNameField.value = '';
	});



	/*
		Filtering
	*/

	var filters = {
		all: function() {
			return true;
		},
		checked: function(task) {
			return task.done;
		},
		unchecked: function(task) {
			return !task.done;
		}
	};

	var filterBtns = qsa(':scope .filter-btns button', parent);
	[].forEach.call(filterBtns, function(btn) {
		on(btn, 'click', function() {
			[].forEach.call(filterBtns, function(btn) {
				btn.classList.remove('active');
			});
			taskListView.filter(filters[this.textContent]);
			this.classList.add('active');
		});
	});



	/*
		Sorting
	*/

	var sorters = {
		newFirst: function(array) {
			return array.sort(function(objectA, objectB) {
				return objectA._ts - objectB._ts;
			});
		},
		newLast: function(array) {
			return array.sort(function(objectA, objectB) {
				return objectB._ts - objectA._ts;
			});
		}
	};

	var sortBtns = qsa(':scope .sort-btns button', parent);
	[].forEach.call(sortBtns, function(btn) {
		on(btn, 'click', function() {
			[].forEach.call(sortBtns, function(btn) {
				btn.classList.remove('active');
			});
			taskListView.sort(sorters[this.className]);
			this.classList.add('active');
		});
	});

})();
