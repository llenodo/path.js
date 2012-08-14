/*****************
tests 
*****************/

(function(){
    
    function createTestContainer(opts){
        var container = document.createElement('div');

        container.setAttribute('class', 'test');

        //if a title was provided...
        if (opts.title) {
            appendElement('h3', opts.title, container);
        }

        //if a description was provided... 
        if (opts.desc) {
            appendElement('p', opts.desc, container)
        }

        return container;
    }

    function appendElement(elType, text, parent, isError) {
        var el = document.createElement(elType);
        el.appendChild(document.createTextNode(text));

        if (isError) {
            el.setAttribute('class', 'error')
        }

        parent.appendChild(el);
    }

    function testPathCreation(opts) {
        var pathStr = 'Path: ',
            container = createTestContainer(opts),
            path;

        //construct the path string - depends on if it was an array or a string to begin with
        if (opts.path instanceof Array) {
            pathStr += ('[ ' + opts.path.map(function(item){ 
                return '[' + item.toString() + ']' 
            }).join(', ') + ' ]');
        }
        else {
            pathStr += ('"' + opts.path + '"');
        }

        //show the path provided
        appendElement('p', pathStr, container)

        try {
            //initialize the path object
            path = new Path(opts.path);

            //show the computed svg path string
            appendElement('p', 'Computed SVG path string: "' + path.toString() + '"', container);

            //render the path and append it to the document
            container.appendChild(path.render());
        }
        catch (e) {
            appendElement('p', 'Error: ' + e, container, true)
        }
        
        document.body.appendChild(container);
    }

    function testInstanceOf(){
        var container = createTestContainer({title: "instanceof test"})

        var path = new Path([[50,50],[150,150]]);

        if (path instanceof Path) {
            appendElement('h5', "path instanceof Path = true", container)
        }

        if (path instanceof Array) {
            appendElement('h5', "path instanceof Array = true", container)
        }

        container.appendChild(path.render());
        document.body.appendChild(container);
    }

    function testArrayMethods(opts) {
        var container = createTestContainer(opts),
            testPath,
            modifiedPath;

        //create and render original path
        testPath = new Path(opts.path)
        appendElement('p', 'Original: ' + opts.path.toString(), container);
        container.appendChild(testPath.render());

        //run the provided function against it, then render that
        modifiedPath = testPath[opts.method].apply(testPath, opts.paramsArray);
        appendElement('p', "Modified with '" + opts.method + "': " + modifiedPath.toString(), container);
        appendElement('p', "modifiedPath instanceof Path = " + (modifiedPath instanceof Path), container);
        container.appendChild(modifiedPath.render());

        if (opts.callback) {
            opts.callback(modifiedPath);
            appendElement('p', opts.callbackMsg, container);
            container.appendChild(modifiedPath.render());
        }

        document.body.appendChild(container);
    }


    //test methods map, filter, and slice
    testArrayMethods({
        title: "Path.map test",
        desc: "Map the given path to a new path with the provided function - should add 50 to all x coordinates",
        path: "M 50 50 L 150 50 L 100 150 z",
        method: 'map',
        paramsArray: [function(pointObj, index, array){
            if (pointObj.x) {
                pointObj.x = parseInt(pointObj.x) + 50;
            }
            return pointObj;
        }]
    });

    testArrayMethods({
        title: "Path.filter test",
        desc: "Should remove any points that have a y value greater than 100, and draw a straight horizontal line",
        path: "M 50 50 L 150 50 L 100 150 z",
        method: 'filter',
        paramsArray: [function(pointObj, index, array){
            return pointObj.y <= 100
        }]
    });

    testArrayMethods({
        title: "Path.slice test",
        desc: "Should give you a slice with elements 1 and 2 in the array, which is an invalid path as it contains no 'M'",
        path: "M 50 50 L 150 50 L 100 150 z",
        method: 'slice',
        paramsArray: [1,3],
        callbackMsg: 'Since the above path is invalid, push a new moveto command (25,25) into the front to make it valid',
        callback: function(path) {
            path.unshift({cmd:'m', x:25, y:25})
        }

    });

    testArrayMethods({
        title: "Path.slice test with negative indices",
        desc: "This is the same as the above test, except we're slicing with [-3,-1] instead of [1,2].",
        path: "M 50 50 L 150 50 L 100 150 z",
        method: 'slice',
        paramsArray: [-3,-1],
        callbackMsg: 'Since the above path is invalid, push a new moveto command (25,25) into the front to make it valid',
        callback: function(path) {
            path.unshift({cmd:'m', x:25, y:25})
        }
    });


    //test that a path object is both an instance of Path and Array
    testInstanceOf();


    //test paths provided as an array of points
    testPathCreation({
        title: 'Diamond with array param',
        desc:'Should create a diamond in the top left',
        path: [ [0,50],[50,0],[100,50],[50,100],[0,50] ]
    });

    testPathCreation({
        title: 'Triangle with array param',
        desc: 'Should create a downward-facing triangle in the middle',
        path: [ [50,50],[150,50],[100,150],[50,50] ]
    });


    //standard lineto commands
    testPathCreation({
        title: 'Triangle with string param',
        desc:'Triangle should be same as the one above, except top left corner is closed via a closepath command',
        path: "M 50 50 L 150 50 L 100 150 z"
    });

    testPathCreation({
        title: 'Lineto command, relative points',
        desc:'Triangle should be same as the one above.',
        path: "M 50 50 l 100 0 l -50 100 z"
    });

    testPathCreation({
        title: 'Lineto command with multiple points',
        desc:'This should render a triangle identical to the one above',
        path: "M 50 50 L 150 50 100 150 z"
    });

    testPathCreation({
        title: 'Unclosed triangle with string param',
        desc:'Should render a triangle with the bottom left edge missing',
        path: "M 50 50 L 150 50 L 100 150"
    });


    //INVALID PATHS
    testPathCreation({
        title: 'Invalid Path - moveto in the middle',
        desc:'Moveto shouldnt appear in the middle of a path string',
        path: "M 50 50 m 150 v 100 h -100 z"
    });

    testPathCreation({
        title: 'Invalid Path - closepath in the middle',
        desc:'closepath shouldnt appear in the middle of a path string',
        path: "M 50 50 z 150 v 100 h -100"
    });

    testPathCreation({
        title: 'Invalid Path - unknown command',
        desc:'Cant have unknown commands in the path string',
        path: "M 50 50 Q 150 v 100 h -100"
    });

    testPathCreation({
        title: 'Invalid Path - too many spaces',
        desc:'cant have more than one space between items in a path string',
        path: "M 50 50 150 v     100 h -100"
    });

    testPathCreation({
        title: 'Invalid Path - no moveto',
        desc:'Path must contain a moveto at the beginning of the string',
        path: "50 50 150 v 100 h -100"
    });

    testPathCreation({
        title: 'Invalid Path - provided as an object',
        desc:'Params must be either an svg string or an array of points',
        path: {}
    });

    //horizontal lineto commands
    testPathCreation({
        title: 'Horizontal lineto, single point',
        desc:'This should render a triangle identical to the one above',
        path: "M 50 50 H 150 L 100 150 z"
    });

    testPathCreation({
        title: 'Horizontal lineto, multiple points',
        desc:'This should render a triangle identical to the one above',
        path: "M 50 50 H 100 125 150 L 100 150 z"
    });


    //vertical lineto commands
    testPathCreation({
        title: 'Vertical lineto, single point',
        desc:'This should render a square in the middle',
        path: "M 50 50 H 150 V 150 h -100 z"
    });

    testPathCreation({
        title: 'Vertical lineto, multiple point',
        desc:'This should render a square identical to the one above',
        path: "M 50 50 H 150 V 75 125 150 h -100 z"
    });

    testPathCreation({
        title: 'Vertical lineto, relative single point',
        desc:'This should render a square identical to the one above',
        path: "M 50 50 H 150 v 100 h -100 z"
    });
})();
