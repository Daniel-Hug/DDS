DDS
===

Data/DOM Sync with JS



## Build a web app with DDS

It's easy!


### Load model & keep db updated

```js
// create local model from array of objects in db
var tasks = new DDS(JSON.parse(localStorage.getItem('tasks')) || []);

// keep db updated when local model changes
tasks.on('any', function() {
	localStorage.setItem('tasks', JSON.stringify(tasks.objects));
});
```


### Render data to view

#### Create renderer function
To render each item in a DDS model as an element, first create a renderer function that accepts the data object for that item as the first argument and returns an element. Here's an example renderer function that uses [DOM-Builder](https://github.com/Daniel-Hug/DOM-Builder) to construct an `<li>`:

```js
function renderTask(taskObj) {
	return DOM.buildNode({ el: 'li', kid: {
		el: 'label',
		kids: [
			{ el: 'input', type: 'checkbox', _checked: taskObj.done }
			taskObj.title
		]
	} });
}
```

#### Create view and attach it to model
Create a new `DDS.DOMView` instance passing a config object. The object requires a `renderer` property that points to a renderer function, and a `parent` property that points to an element which will contain each rendered item element.

```js
var taskListView = tasks.render(new DDS.DOMView({
	renderer: renderTask,
	parent: taskList
}));
```

### Change the model
Views are automatically updated when the model changes.

#### Add a model entry with `.add(object)`
```js
window.tasks.add({done: false, title: 'take out trash'});
```

#### Edit a model entry with `.edit(object, {propToChange: 'new value'})`
```js
window.tasks.edit({done: true});
```
