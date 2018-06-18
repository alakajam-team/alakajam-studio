var ActionPlugin = function (options) {
  // A mandatory name for the plugin, to be referenced in the data.json file
  this.name = options.name

  // If true, update($element, dx, dy) will be called during dragging
  this.watchDragEvents = options.watchDragEvents || false

  // Called when an element interaction starts
  // start($element)
  this.start = options.start || function ($element) { this.run($element) }

  // Called once when there is an element interaction
  // run($element)
  this.run = options.run || function () { }

  // Called every frame during an element interaction
  // update($element[, dx, dy])
  this.update = options.update || function () { }

  // Called when there an element interaction ends
  // end($element)
  this.end = options.end || function () { }

  // Called when an element that uses this plugin is being created
  // onElementCreate($element, elementData)
  this.onElementCreate = options.onElementCreate || function () { }

  // Called when an element that uses this plugin is being remotely updated
  // onElementUpdate($element, elementState)
  this.onElementUpdate = options.onElementUpdate || function () { }

  // Plugin initialization
  // init()
  if (options.init) options.init.call(this)
}

// Toggle plugin

Studio.registerActionPlugin(new ActionPlugin({
  name: 'toggle',

  run: function ($element) {
    var hidden = $element.is(':visible')
    $element.toggle(200)
    Studio.emitElementUpdate($element, { 'hidden': hidden })
  },

  onElementUpdate: function ($element, elementState) {
    if (elementState.hidden !== undefined) {
      elementState.hidden ? $element.hide(200) : $element.show(200)
    }
  }
}))

// Talk animation plugin

Studio.registerActionPlugin(new ActionPlugin({
  name: 'talk',

  start: function ($element) {
    $element.attr('data-talk-start', new Date().getTime())
  },

  update: function ($element) {
    var time = new Date().getTime() - parseInt($element.attr('data-talk-start'))
    var offsetY = 20 * Math.sin(time / 50)
    var angle = 6 * Math.sin(time / 80) - 3
    var transform = 'translate(0px, ' + offsetY + 'px)  rotate(' + angle + 'deg)'
    $element.css({ 'transform': transform })
    Studio.emitElementUpdate($element, { 'transform': transform })
  },

  end: function ($element) {
    $element.css({ 'transform': 'none' })
    Studio.emitElementUpdate($element, { 'transform': 'none' })
  },

  onElementUpdate: function ($element, elementState) {
    if (elementState.transform !== undefined) {
      $element.css({ 'transform': elementState.transform })
    }
  }
}))

// Dragging plugin

Studio.registerActionPlugin(new ActionPlugin({
  name: 'drag',
  watchDragEvents: true,

  onElementCreate: function ($element) {
    $element.addClass('draggable')
  },

  update: function ($element, dx, dy) {
    var left = parseFloat($element.attr('data-left') || 0) + dx
    var top = parseFloat($element.attr('data-top') || 0) + dy
    $element.attr('data-left', left)
    $element.attr('data-top', top)
    $element.css({
      'left': left + 'px',
      'top': top + 'px'
    })
    Studio.emitElementUpdate($element, { x: left, y: top })
  },

  onElementUpdate: function ($element, elementState) {
    if (elementState.x !== undefined) {
      $element.attr('data-left', elementState.x)
      morpheus($element[0], {
        'left': elementState.x + 'px',
        'duration': 100
      })
    }
    if (elementState.y !== undefined) {
      $element.attr('data-top', elementState.y)
      morpheus($element[0], {
        'top': elementState.y + 'px',
        'duration': 100
      })
    }
  }
}))

// Play sound plugin

Studio.registerActionPlugin(new ActionPlugin({
  name: 'play',

  init: function () {
    this.soundbox = new SoundBox()
  },

  onElementCreate: function ($element, elementData) {
    this.soundbox.load(elementData.id, elementData.path)
    $element[0].soundbox = this.soundbox
  },

  run: function ($element) {
    $element[0].soundbox.play($element.attr('id'))
  }
}))
