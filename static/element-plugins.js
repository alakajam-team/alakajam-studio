var ElementPlugin = function (options) {
    // A mandatory name of the element type, to be referenced in the data.json file
    this.name = options.name

    // Called when an element of this type is being created
    // onElementCreate($element, elementData)
    this.onElementCreate = options.onElementCreate || function () { }

    // Called when an element of this type is being updated
    // onElementUpdate($element, elementState)
    this.onElementUpdate = options.onElementUpdate || function () { }

    // Plugin initialization
    // init()
    if (options.init) options.init()
}

// Image plugin (default)

Studio.registerElementPlugin(new ElementPlugin({
    name: 'image',

    onElementCreate: function ($element, elementData) {
        _getPictureSize(elementData.path, function (width, height) {
            $element.css({
                'background-image': 'url(' + elementData.path + ')',
                'min-width': (elementData.width || width) + 'px',
                'min-height': (elementData.height || height) + 'px'
            })
        })
    }
}))

function _getPictureSize(src, callback) {
    var img = new Image()
    img.onload = function () { callback(this.width, this.height) }
    img.src = src;
}

// Background plugin

Studio.registerElementPlugin(new ElementPlugin({
    name: 'background',

    onElementCreate: function ($element, elementData) {
        $element.css({
            'background-image': 'url(' + elementData.path + ')',
            'background-size': 'cover',
            'min-width': Studio.$scene.width() + 'px',
            'min-height': Studio.$scene.height() + 'px'
        })
    }
}))

// Sound plugin

Studio.registerElementPlugin(new ElementPlugin({
    name: 'sound'
}))

// iframe plugin

Studio.registerElementPlugin(new ElementPlugin({
    name: 'iframe',

    onElementCreate: function ($element, elementData) {
        var widthWithUnit = (elementData.width || 400) + 'px'
        var heightWithUnit = (elementData.height || 400) + 'px'

        $element.css({
            'min-width': widthWithUnit,
            'min-height': heightWithUnit
        })
        $element.append('<iframe src="' + elementData.path + '" \
            width="' + widthWithUnit + '" height="' + heightWithUnit + '" />')
    }
}))
