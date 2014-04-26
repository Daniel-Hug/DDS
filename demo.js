/*global DDS, Parasite */
(function() {
	'use strict';

	// Pull in ToDo list data from localStorage:
	window.tasks = new DDS({storageID: 'ToDoList', fallback: [
		{done: false, title: 'Add tasks to your ToDo list.'},
		{done: false, title: 'Print them off.'},
		{done: false, title: "Mark em' off one by one."}
	]});

	// Helper functions:

	var $ = document.querySelector.bind(document);

	function on(target, type, callback) {
		target.addEventListener(type, callback, false);
	}


	// Grab elements:
	var newTaskForm = $('.left .new-task-form');
	var taskNameField = $('.left .task-name-field');
	var taskList = $('.left .task-list');


	function renderTask(taskObj, i) {
		// Create elements:
		var li = document.createElement('li');
		var checkbox = document.createElement('input');
		var label = document.createElement('label');
		var checkboxSpan = document.createElement('span');
		var titleBlock = document.createElement('span');
		var textSpan = document.createElement('span');
		checkbox.className = 'visuallyhidden';
		checkboxSpan.className = 'checkbox';
		titleBlock.className = 'title';

		// Add data:
		checkbox.type = 'checkbox';
		if (taskObj.done) checkbox.checked = true;
		textSpan.textContent = taskObj.title;

		// Append children to li:
		titleBlock.appendChild(textSpan);
		label.appendChild(checkbox);
		label.appendChild(checkboxSpan);
		label.appendChild(titleBlock);
		li.appendChild(label);

		// Allow changes to ToDo title:
		textSpan.contentEditable = true;
		on(textSpan, 'input', function() {
			taskListParasite.edit(window.tasks[i], {title: this.textContent});
		});
		on(titleBlock, 'click', function(event) {
			// Don't toggle checkbox when todo title is clicked:
			event.preventDefault();
			event.stopPropagation();
		});

		// Let ToDos be checked off:
		on(checkbox, 'change', function() {
			taskListParasite.edit(window.tasks[i], {done: this.checked});
		});

		return li;
	}


	var taskListParasite = new Parasite({
		renderer: renderTask,
		parent: taskList
	});

	window.tasks.attach(taskListParasite);


	// add task
	on(newTaskForm, 'submit', function(event) {
		window.tasks.push({done: false, title: taskNameField.value});
		event.preventDefault();
		taskNameField.value = '';
	});
})();








/*global DDS, Parasite */
(function() {
	'use strict';

	// Helper functions:

	var $ = document.querySelector.bind(document);

	function on(target, type, callback) {
		target.addEventListener(type, callback, false);
	}


	// Grab elements:
	var newTaskForm = $('.right .new-task-form');
	var taskNameField = $('.right .task-name-field');
	var taskList = $('.right .task-list');

	function renderTask(taskObj, i) {
		// Create elements:
		var li = document.createElement('li');
		var checkbox = document.createElement('input');
		var label = document.createElement('label');
		var checkboxSpan = document.createElement('span');
		var titleBlock = document.createElement('span');
		var textSpan = document.createElement('span');
		checkbox.className = 'visuallyhidden';
		checkboxSpan.className = 'checkbox';
		titleBlock.className = 'title';

		// Add data:
		checkbox.type = 'checkbox';
		if (taskObj.done) checkbox.checked = true;
		textSpan.textContent = taskObj.title;

		// Append children to li:
		titleBlock.appendChild(textSpan);
		label.appendChild(checkbox);
		label.appendChild(checkboxSpan);
		label.appendChild(titleBlock);
		li.appendChild(label);

		// Allow changes to ToDo title:
		textSpan.contentEditable = true;
		on(textSpan, 'input', function() {
			taskListParasite.edit(window.tasks[i], {title: this.textContent});
		});
		on(titleBlock, 'click', function(event) {
			// Don't toggle checkbox when todo title is clicked:
			event.preventDefault();
			event.stopPropagation();
		});

		// Let ToDos be checked off:
		on(checkbox, 'change', function() {
			taskListParasite.edit(window.tasks[i], {done: this.checked});
		});

		return li;
	}


	var taskListParasite = new Parasite({
		renderer: renderTask,
		parent: taskList
	});

	window.tasks.attach(taskListParasite);


	// add task
	on(newTaskForm, 'submit', function(event) {
		window.tasks.push({done: false, title: taskNameField.value});
		event.preventDefault();
		taskNameField.value = '';
	});
})();