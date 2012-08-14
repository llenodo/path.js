/*
Path notes:

relative points are relative to current point at the start of the command

moveto (M or m):
    -uppercase = absolute, lowercase = relative coords

    -like lifting the pen and moving to a new location
    
    (NOT SUPPORTED PER INSTRUCTIONS)
    -subsequent moveto commands represent start of a new subpath 

    -if followed by multiple pairs of coordinates, they are treated as implicit LINETO commands
        -relative if the moveto is relative, absolute if absolute

    -if a RELATIVE moveto (m) appears as first element in the path, it is treated as ABSOLUTE
        -subsequent pairs of coordiates are relative even though initial was absolute

closepath (Z or z):
    -z and Z are identical

    -ends current subpath and draws straight line from current point to initial point of subpath
    
    (NOT SUPPORTED PER INSTRUCTIONS)
    -if followed immediately by a moveto, then it is the start of a new subpath 

lineto (L/l, H/h, or V/v):
    -draw straight lines from current point to a new point
    
    L/l (x y)+
        -draw a line from current point to given (x,y) coordinates, becomes new current point
        -can accept multiple sets of coordinates
        -new current point it set to final set of coordinates
        
        ex: L 100 100 200 100 400 300 = L 100 100 L 200 100 L 400 300

    H/h (x)+
        -draws a horizontal line from current point (cpx,cpy) to (x, cpy)
        -can provide multiple values of x,  if desired (doesnt really make sense but whatever)

    V/v (y)+
        -draws a vertical line from current point (cpx, cpy) to (cpx, y)
        -can provide multiple values of y, if desired (doesnt really make sense but whatever)


Internally we will represent path as an array of point objects with an associated move command

example:  [ {cmd:'M', x:100, y:100 }, 
            {cmd:'L', x:300, y:100 }, 
            {cmd:'H', x:200 },
            {cmd:'z'} ]

*/
(function(){
    var root = this;

    root.Path = function (points){
        //call the appropriate method to parse the provided points
        if (points instanceof Array) {
            this.parseArray(points);
        }
        else if (typeof points === 'string') {
            this.parseString(points);
        }
        else {
            throw "points must be provided as an array of points or an SVG path string";
        }
    }

    //good enough for this coding challenge. Obviously not the ideal way of doing things,
    //see http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/
    Path.prototype = new Array();

    /*
    Converts an array of points (which are arrays of length 2) to the internal representation of a path

    Example:

    pointsArray = [ [100,100],[300,100],[200,300],[100,100] ]

    output = array of objects:  [  {cmd:'M', x:100, y:100 }, 
                                    {cmd:'L', x:300, y:100 }, 
                                    {cmd:'L', x:200, y:300 },
                                    {cmd:'z'} ]
    */
    Path.prototype.parseArray = function(pointsArray) {
        var currentPoint,
            pointObj;

        for (var i = 0; i < pointsArray.length; i++) {
            currentPoint = pointsArray[i];

            pointObj = {};
            pointObj.x = currentPoint[0];
            pointObj.y = currentPoint[1];

            //first point is a moveto, all others are lineto
            pointObj.cmd = (i === 0 ? 'M' : 'L');

            this.push(pointObj);
        }

        //unnecessary but maybe you would want to use this function in some other unseen way
        return this;
    };

    /*
    Converts a path string to the internal representation of a path

    Example:

    pointsStr = "M 100 100 L 300 100 L 200 300 z"

    output = array of objects:  [   {cmd:'M', x:100, y:100 }, 
                                    {cmd:'L', x:300, y:100 }, 
                                    {cmd:'L', x:200, y:300 },
                                    {cmd:'z'} ]
    Notes:
        -moveto must only appear at the beginning
        -closepath may OPTIONALLY appear only at the end
        -lineto must accept both absolute and relative integer coordinates
    */
    Path.prototype.parseString = function(pointsStr) {
        var pointsArray = pointsStr.trim().split(" "),
            pointObj,
            currentCommand,
            currentCommandUpperCase,
            i = 0,
            j;

        while (i < pointsArray.length) {
            currentCommand = pointsArray[i];
            currentCommandUpperCase = currentCommand.toUpperCase();
            
            if (i === 0 && currentCommandUpperCase !== 'M') {
                throw "The move command (M or m) must appear at the beginning of the string!";
            }

            if (currentCommandUpperCase === 'M') {
                if (i !== 0) {
                    throw "The move command (M or m) can only appear at the beginning of the string!";
                }

                this.push({
                    cmd: currentCommand,
                    x: pointsArray[i+1],
                    y: pointsArray[i+2]
                });

                i += 3;
            }
            else if (currentCommandUpperCase === 'L') {
                /*  lineto commands can appear as individual commands like: 'L 100 300 L 200 300',
                    or a chain points, like: 'L 100 300 200 300' (equivalent to above).
                    Need to account for both cases  */

                
                //set i to be the first x-coordinate following the current 'L' command and
                //set j to be the first y-coordinate number following the current 'L' command
                j = ++i + 1;

                //find the last y-coordinate after the current 'L command'
                //after this loop completes j will be the LAST number before the next command
                while (isValidInt(pointsArray[j+1]) && j < pointsArray.length-1) j++;

                //push all the coordinates following the current 'L' command onto the array
                while (i <= j) {
                    this.push({
                        cmd: currentCommand,
                        x: pointsArray[i],
                        y: pointsArray[i+1]
                    });

                    //skip to the next set of coordinates
                    i += 2;
                }
            }
            else if (currentCommandUpperCase === 'V' || currentCommandUpperCase === 'H') {
                /*  the vertical and horizontal lineto commands accept any number of coordinates 
                    following them, (although this doesnt really make any sense, but we must account for it anyway)

                    ex: "v 100 v 100 v 100" is equivalent to "v 100 100 100"    */

                //set both i and j to be the first coordinate following the current 'V' or 'H' command
                j = ++i;

                //find the last coordinate after the current 'V' or 'H' command
                //after this loop completes j will be the LAST number before the next command
                while (isValidInt(pointsArray[j+1]) && j < pointsArray.length-1) j++;

                //push all the current 'V' or 'H' commands on
                while (i <= j) {
                    pointObj = { cmd: currentCommand };

                    if (currentCommandUpperCase === 'V') {
                        pointObj.y = pointsArray[i];
                    }
                    else { //it's a H horizontal move
                        pointObj.x = pointsArray[i];
                    }

                    this.push(pointObj);
                    i++;
                }
            }
            else if (currentCommandUpperCase === 'Z') {
                if (i !== pointsArray.length - 1) {
                    throw "The closepath command (Z or z) must appear at the end of the string!"
                }

                this.push({
                    cmd: currentCommand
                });

                i++;
            }
            else {
                throw ('"' + currentCommand + '" is an invalid command! ');
            }
        }

        return this;
    };




    /*****************
    override array methods
    *****************/

    /*  The methods map, filter, and slice must return Path objects rather than pure arrays. 

        For the map, filter, and slice methods, setting the __proto__ property is
        not a perfect solution (fails in <= IE8), but good enough for this exercise.

        A possible alternate approach would be to implement your own methods - see comments below   */

    Path.prototype.map = function(callback, thisArg) {
        var mappedPath = Array.prototype.map.call(this, callback, thisArg);
        mappedPath.__proto__ = Path.prototype;
        return mappedPath;

        /*
        //alternate approach - implement your own map method

        var mappedPath = this.clone();

        for (var i=0;i<mappedPath.length;i++){
            mappedPath[i] = callback(mappedPath[i]);
        }

        return mappedPath;
        */
    };

    Path.prototype.filter = function(callback, thisArg) {
        var filteredPath = Array.prototype.filter.call(this, callback, thisArg);
        filteredPath.__proto__ = Path.prototype;
        return filteredPath;

        /*
        //alternative approach - implement your own filter method

        var filteredPath = this.clone();

        for (var i=0;i<mappedPath.length;i++){
            //if an item fails the callback, splice it out
            if (!callback(mappedPath[i])){
                filteredPath.splice(i,1);
            }
        }*/
    };

    Path.prototype.slice = function(start, end){
        var slicedPath = Array.prototype.slice.call(this, start, end);
        slicedPath.__proto__ = Path.prototype;
        return slicedPath;

        /*
        //alternative approach - implement your own slice method

        var slicedPath = new Path();

        start = start || 0;

        //negative start indicates offset from end. 
        //ex: slice(-2) returns the last 2 elements in the sequence
        if (start < 0) {
            start = this.length + start;
        }

        if (!end) {
            end = this.length;
        }
        else if (end < 0) {
            //negative end index indicates offset from end of sequence.
            //ex: slice(1,-1) returns the second through second-to-last elements in the sequence
            end = this.length + end;
        }

        //push the specified elements into the return path
        for (var i = start; i < end; i++) {
            slicedPath.push(this[i]);
        }

        return slicedPath;
        */
    }

    //returns a new Path with the same points
    Path.prototype.clone = function(){
        //shallow copy
        return cloneObj(this);

        /*
        //rudimentary implementation of 'deep copy' for the array of points

        var clone = cloneObj(this);
        for (var i=0; i < this.length; i++){
            clone[i] = JSON.parse(JSON.stringify(clone[i]));
        }*/
    };

    //returns an SVG path string representing the Path
    Path.prototype.toString = function(){
        var retArray = [],
            point,
            cmdUpperCase;

        for (var i = 0; i < this.length; i++) {
            point = this[i];
            cmdUpperCase = point.cmd.toUpperCase();

            //TODO account for other types of commands, like H, V, and z
            retArray.push(point.cmd);

            if (cmdUpperCase === 'L' || cmdUpperCase === 'M') {
                retArray.push(' ');
                retArray.push(point.x);
                retArray.push(' ');
                retArray.push(point.y);
            }
            //V (vertical) move command only takes a single y coordiante, like "V 100"
            else if (cmdUpperCase === 'V') {
                retArray.push(' ');
                retArray.push(point.y);
            }
            //H (horizontal) move command only takes a single x coordiante, like "H 200"
            else if (cmdUpperCase === 'H') {
                retArray.push(' ');
                retArray.push(point.x);
            }
            else if (cmdUpperCase === 'X') {
                //dont do anything, already pushed the command on
            }

            //add a space to the end of each 'point' except the last one
            if (i < this.length - 1) {
                retArray.push(' ');
            }
        }

        return retArray.join('');
    };

    //some default render settings... obviously in a real environment you'd provide a way to override these
    Path.prototype.renderSettings = {
        path: {
            stroke: 'blue',
            fill: 'none',
            'stroke-width': 2 
        },
        svg: {
            height: 200,
            width: 200,
        }
    };

    /* 
    constructs a simple svg element with a path inside it

    ex: 
    <svg height="200" width="200">
        <path d="M 50 50 L 150 50 L 100 150 z" stroke="blue" fill="none" stroke-width="2"></path>
    </svg>
    */
    Path.prototype.render = function(opts){
        var svgNS = 'http://www.w3.org/2000/svg',
            svgEl = document.createElementNS(svgNS, 'svg'),
            pathEl = document.createElementNS(svgNS, 'path');

        //set attributes on svg element
        for (attr in this.renderSettings.svg) {
            svgEl.setAttributeNS(null, attr, this.renderSettings.svg[attr]);
        }

        //if we initialize the d attribute to this value, we can cover this in the renderSettings
        pathEl.setAttributeNS(null, 'd', this.toString());

        for (attr in this.renderSettings.path) {
            pathEl.setAttributeNS(null, attr, this.renderSettings.path[attr]);
        }

        svgEl.appendChild(pathEl);

        return svgEl;
    };


    /*****************
    utility functions 
    *****************/

    //parsing an invalid integer string will return NaN, so as long as it's not NaN it's valid
    function isValidInt(str) {
        return !isNaN(parseInt(str));
    }

    function cloneObj(obj) {
        function F() { }
        F.prototype = obj;
        return new F();
    }

}).call(this);

