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

	function init(newTaskForm, taskNameField, taskList) {
		function renderTask(taskObj, i) {
			// Create elements:
			var li = document.createElement('li');
			var checkbox = document.createElement('input');
			var label = document.createElement('label');
			var checkboxDiv = document.createElement('div');
			var deleteBtn = document.createElement('button');
			var titleWrap = document.createElement('div');
			var title = document.createElement('div');
			checkbox.className = 'visuallyhidden';
			checkboxDiv.className = 'checkbox';
			deleteBtn.className = 'icon-trash';
			titleWrap.className = 'title';

			// Add data:
			checkbox.type = 'checkbox';
			if (taskObj.done) checkbox.checked = true;
			title.textContent = taskObj.title;

			// Append children to li:
			titleWrap.appendChild(title);
			label.appendChild(checkbox);
			label.appendChild(checkboxDiv);
			label.appendChild(deleteBtn);
			label.appendChild(titleWrap);
			li.appendChild(label);

			// Allow changes to ToDo title:
			title.contentEditable = true;
			on(title, 'input', function() {
				taskListParasite.edit(taskObj, {title: this.textContent});
			});

			// Don't toggle checkbox when todo title or delete button is clicked:
			[titleWrap, deleteBtn].forEach(function(el) {
				on(el, 'click', function(event) {
					event.preventDefault();
					event.stopPropagation();
				});
			});

			on(deleteBtn, 'click', function() {
				window.tasks.remove(taskObj);
			});

			// Let ToDos be checked off:
			on(checkbox, 'change', function() {
				taskListParasite.edit(taskObj, {done: this.checked});
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
			event.preventDefault();
			window.tasks.push({done: false, title: taskNameField.value});
			taskNameField.value = '';
		});
	}

	init($('.left  .new-task-form'), $('.left  .task-name-field'), $('.left  .task-list'));
	init($('.right .new-task-form'), $('.right .task-name-field'), $('.right .task-list'));

})();
