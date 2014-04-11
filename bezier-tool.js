/* A simple Bézier tool. It requires a canvas to draw things.
 * By Marcel Bruse, 2014. MIT licence. */
function BezierTool(canvas) {

	/* Reference to the requestAnimationFrame function. */
	window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
		window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

	/* A reference to the 2d context of the canvas. */
	var context = canvas.getContext("2d");

	/* The global bezier spline object. */
	this.bezierSpline = new BezierSpline();

	/* The maximum number of points of the bezier spline. */
	var MAX_NUMBER_OF_POINTS = 12;

	/* The number of control points of a single bezier curve. */
	var NUMBER_OF_CONTROL_POINTS = 4;

	/* The resolution of a single bezier curve. */
	var BEZIER_CURVE_RESOLUTION = 0.025;

	/* Mouse state and position indicators. */
	var mouseDown = false;
	var mouseDownAtX = 0;
	var mouseDownAtY = 0;
	var downTime = 0;
	var upTime = 0;
	var relativeX = 0;
	var relativeY = 0;
	var MOUSE_UP_DELAY = 500;
	var MOUSE_POSITION_OFFSET = 2;

	/* The currently selected point and handle. */
	var selectedPoint = null;
	var selectedHandle = null;

	/* Grid specific constants. */
	var GRID_CELL_WIDTH = 20;

	/* Color settings and shape settings. */
	var GRID_COLOR = "#000000";
	var POINT_COLOR = "#aaaaaa";
	var HIGHLIGHTED_POINT_COLOR = "#2200ff";
	var HANDLE_COLOR = "#2200ff";
	var BEZIER_SPLINE_COLOR = "#444444";
	var PROFILE_COLOR = "#fbc4ff";
	var PROFILE_FILL_COLOR = "#fbeafc";
	var DASH_SPACING = [4];

	/* Key codes for keyboard events. */
	var DELETE_POINT_KEY_CODE = 46;
	
	/* Indicates if the canvas will be refreshed or not. */
	this.refreshActivated = true;
	
	/* The scope of this application. */
	var scope = this;

	/****************************************/
	/* Definition of the BezierSpline class */
	/****************************************/

	function BezierSpline() {
		this.firstPoint = null;
		this.lastPoint = null;
		this.size = 0;

		/* Adds a new point to the bezier spline. */
		this.addPoint = function(point) {
			if (this.size < MAX_NUMBER_OF_POINTS) {
				if (point != null) {
					if (this.lastPoint != null) {
						point.previous = this.lastPoint;
						this.lastPoint.next = point;
					}
					if (this.firstPoint == null) {
						this.firstPoint = point;
					}
					this.lastPoint = point;
					this.size++;
				}
			}
		}

		/* Removes a given point from the bezier spline. */
		this.removePoint = function(aPoint) {
			var point = this.firstPoint;
			while (point != null) {
				if (point.x == aPoint.x && point.y == aPoint.y) {
					if (point.previous != null & point.next != null) {
						point.previous.next = point.next;
						point.next.previous = point.previous;
					} else if (point.previous != null) {
						this.lastPoint = point.previous;
						point.previous.next = null;
					} else if (point.next != null) {
						this.firstPoint = point.next;
						this.firstPoint.leftHandle.x = this.firstPoint.x;
						this.firstPoint.leftHandle.y = this.firstPoint.y;
						point.next.previous = null;
					} else {
						this.firstPoint = null;
						this.lastPoint = null;
					}
					this.size--;
					break;
				}
				point = point.next;
			}
		}

		/* Calculates the resulting path from the bezier spline which is a polyline represented by a path object. */
		this.calculatePath = function() {
			var path = new Path();
			if (this.size > 1) {
				var point = this.firstPoint;
				while (point != this.lastPoint) {
					var position = new Position(point.x, point.y);
					position.mappedPointList.push(point);
					path.addPosition(position);
					var t = BEZIER_CURVE_RESOLUTION;
					while (t <= 1) {
						var m = 1 - t;
						var x = 0;
						var y = 0;
						for (var i = 0; i < NUMBER_OF_CONTROL_POINTS; i++) {
							var controlPoint;
							var binomial;
							if (i == 0) {
								controlPoint = point;
								binomial = 1;
							} else if (i == 1) {
								controlPoint = point.rightHandle;
								binomial = 3;
							} else if (i == 2) {
								controlPoint = point.next.leftHandle;
								binomial = 3;
							} else {
								controlPoint = point.next;
								binomial = 1;
							}
							var ni = NUMBER_OF_CONTROL_POINTS - i - 1;
							var factor = binomial * Math.pow(t, i) * Math.pow(m, ni);
							x = x + factor * controlPoint.x;
							y = y + factor * controlPoint.y;
						}
						path.addPositionXY(x, y);
						t = t + BEZIER_CURVE_RESOLUTION;
					}
					point = point.next;
				}
				path.addPositionXY(this.lastPoint.x, this.lastPoint.y);
			}
			return path;
		}

		/* Draws the bezier spline. */
		this.draw = function() {
			this.calculatePath().draw();
		}
	}

	/********************************/
	/* Definition of the Path class */
	/********************************/

	function Path() {
		this.firstPosition = null;
		this.lastPosition = null;
		this.size = 0;

		/* Adds a given position to the path. */
		this.addPosition = function(position) {
			if (this.firstPosition == null) {
				this.firstPosition = position;
				this.lastPosition = position;
			} else {
				this.lastPosition.next = position;
				this.lastPosition = position;
			}
			this.size++;
		}

		/* Adds a given position to the path by the positions coordinates. */
		this.addPositionXY = function(x, y) {
			var position = new Position(x, y);
			this.addPosition(position);
		}

		/* Draws the path as a polyline. */
		this.draw = function() {
			if (this.size > 1) {
				context.strokeStyle = BEZIER_SPLINE_COLOR;
				context.beginPath();
				context.moveTo(this.firstPosition, this.lastPosition);
				var position = this.firstPosition;
				while (position != null) {
					context.lineTo(position.x, position.y);
					position = position.next;
				}
				context.stroke();
			}
		}

		/* Calculates the length of the path. */
		this.length = function() {
			var length = 0;
			var position = this.firstPosition;
			while (position != null) {
				length = length + position.distance(position.next);
				position = position.next;
			}
			return length;
		}
	}

	/************************************/
	/* Definition of the Position class */
	/************************************/

	function Position(x, y) {
		this.x = x;
		this.y = y;
		this.next = null;
		this.mappedPointList = new Array();

		/* Calculates the euclidean distance between this position and a given position. */
		this.distance = function(position) {
			if (position != null) {
				return Math.sqrt(Math.pow(position.x - this.x, 2) + Math.pow(position.y - this.y, 2));
			} else {
				return 0;
			}
		}
	}

	/*********************************/
	/* Definition of the Point class */
	/*********************************/

	function Point(x, y) {
		this.x = x;
		this.y = y;
		this.previous = null;
		this.next = null;
		this.leftHandle = new Handle(this);
		this.rightHandle = new Handle(this);
		this.highlight = false;
		this.moved = false;

		/* The radius of the perimeter around a point. */
		Point.radius = 10;

		/* Draws this point. */
		this.draw = function() {
			if (this.highlight) {
				context.strokeStyle = HIGHLIGHTED_POINT_COLOR;
				context.fillStyle = HIGHLIGHTED_POINT_COLOR;
			} else {
				context.strokeStyle = POINT_COLOR;
				context.fillStyle = POINT_COLOR;
			}
			context.beginPath();
			context.fillRect(this.x - 1, this.y - 1, 2, 2);
			context.arc(this.x, this.y, Point.radius, 0, 2 * Math.PI);
			context.stroke();
		}

		/* Moves this point and its associated handles to the given coordinates. */
		this.moveTo = function(x, y) {
			var u = x - this.x;
			var v = y - this.y;
			this.x = x;
			this.y = y;
			this.leftHandle.x = this.leftHandle.x + u;
			this.leftHandle.y = this.leftHandle.y + v;
			this.rightHandle.x = this.rightHandle.x + u;
			this.rightHandle.y = this.rightHandle.y + v;
		}
	}

	/**********************************/
	/* Definition of the Handle class */
	/**********************************/

	function Handle(parent) {
		this.x = parent.x;
		this.y = parent.y;
		this.visible = true;
		this.parent = parent;

		/* The radius of the perimeter around a handle. */
		Handle.radius = 6;

		/* Draws this handle. */
		this.draw = function() {
			if (this.visible) {
				context.strokeStyle = HANDLE_COLOR;
				context.fillStyle = HANDLE_COLOR;
				context.fillRect(this.x - 1, this.y - 1, 2, 2);
				context.beginPath();
				context.arc(this.x, this.y, Handle.radius, 0, 2 * Math.PI);
				context.stroke();
				if (!context.setLineDash) {
					context.setLineDash = function() {};
				} else {
					context.setLineDash([DASH_SPACING]);
				}
				context.moveTo(this.x, this.y);
				context.lineTo(this.parent.x, this.parent.y);
				context.stroke();
				if (!context.setLineDash) {
					context.setLineDash = function() {};
				} else {
					context.setLineDash([]);
				}
			}
		}
	}
		
	/* Activates or deactivates refreshing of the canvas. */
	this.setRefreshActivated = function(refreshActivated) {
		this.refreshActivated = refreshActivated;
		if (refreshActivated) {
			requestAnimationFrame(refreshCanvas);
		}
	}

	/*********************/
	/* Gloabal Functions */
	/*********************/

	/* Draws a grid on the workbench. */
	function drawGrid() {
		context.fillStyle = GRID_COLOR;
		for (var i = GRID_CELL_WIDTH; i < canvas.width; i = i + GRID_CELL_WIDTH) {
			for (var j = GRID_CELL_WIDTH; j < canvas.height; j = j + GRID_CELL_WIDTH) {
				context.fillRect(i, j, 1, 1);
			}
		}
	}

	/* Clears the canvas and redraws the bezier spline. */
	function refreshCanvas() {
		if (scope.refreshActivated) {
			context.clearRect(0, 0, canvas.width, canvas.height);
			drawGrid();
			scope.bezierSpline.draw();
			if (selectedPoint != null) {
				selectedPoint.leftHandle.draw();
				selectedPoint.rightHandle.draw();
			}
			var point = scope.bezierSpline.firstPoint;
			while (point != null) {
				point.draw();
				point = point.next;
			}
			requestAnimationFrame(refreshCanvas);
		}
	}

	/* Searches for a point at the given coordinates. */
	function searchPointAt(x, y) {
		var result = null;
		var point = scope.bezierSpline.firstPoint;
		while (point != null) {
			if (x <= point.x + Point.radius
					&& x >= point.x - Point.radius
					&& y <= point.y + Point.radius
					&& y >= point.y - Point.radius) {
				result = point;
				break;
			}
			point = point.next;
		}
		return result;
	}

	/* Searches for a handle at the given coordiantes. */
	function searchHandleAt(x, y) {
		var result = null;
		var point = scope.bezierSpline.firstPoint;
		while (point != null) {
			if (x <= point.leftHandle.x + Handle.radius
					&& x >= point.leftHandle.x - Handle.radius
					&& y <= point.leftHandle.y + Handle.radius
					&& y >= point.leftHandle.y - Handle.radius) {
				result = point.leftHandle;
				break;
			} else if (x <= point.rightHandle.x + Handle.radius
					&& x >= point.rightHandle.x - Handle.radius
					&& y <= point.rightHandle.y + Handle.radius
					&& y >= point.rightHandle.y - Handle.radius) {
				result = point.rightHandle;
				break;
			}
			point = point.next;
		}
		return result;
	}

	/* Handles mouse down events. */
	function handleMouseDownEvent(event) {
		downTime = +new Date();
		mouseDown = true;
		if (selectedPoint != null) {
			selectedPoint.highlight = false;
			selectedPoint.moved = false;
			selectedPoint = null;
		}
		selectedHandle = searchHandleAt(relativeX, relativeY);
		var evt = event ? event:window.event;
		if (selectedHandle != null && evt.ctrlKey) {
			selectedPoint = selectedHandle.parent;
			if (selectedPoint == scope.bezierSpline.firstPoint) {
				selectedHandle = selectedPoint.rightHandle;
			}
			selectedPoint.highlight = true;
		} else {
			var point = searchPointAt(relativeX, relativeY);
			if (point != null) {
				selectedPoint = point;
				selectedPoint.highlight = true;
			}
		}
	}

	/* Handles mouse up events. */
	function handleMouseUpEvent(event) {
		upTime = +new Date();
		mouseDown = false;
		if (selectedPoint != null && selectedPoint.moved) {
			selectedPoint.moved = false;
		} else {
			var point = searchPointAt(relativeX, relativeY);
			if (point == null
					& upTime < downTime + MOUSE_UP_DELAY
					& mouseDownAtX == relativeX
					& mouseDownAtY == relativeY) {
				if (selectedPoint != null) {
					selectedPoint.highlight = false;
				}
				if (scope.bezierSpline.size < MAX_NUMBER_OF_POINTS) {
					var newPoint = new Point(relativeX, relativeY);
					scope.bezierSpline.addPoint(newPoint);
					selectedPoint = newPoint;
					selectedPoint.highlight = true;
				} else {
					selectedPoint = null;
				}
			}
		}
	}

	/* Handles mouse move events. */
	function handleMouseMoveEvent(event) {
		if (mouseDown && selectedPoint != null) {		
			var evt = event ? event:window.event;
			if (!selectedPoint.moved && evt.ctrlKey) {
				if (selectedHandle != null) {
					selectedHandle.x = relativeX;
					selectedHandle.y = relativeY;
					selectedPoint.highlight = true;
				}
			} else {
				if (evt.shiftKey) {
					relativeX = Math.floor(relativeX / GRID_CELL_WIDTH) * GRID_CELL_WIDTH;
					relativeY = Math.floor(relativeY / GRID_CELL_WIDTH) * GRID_CELL_WIDTH;
				}
				selectedPoint.moveTo(relativeX, relativeY);
				selectedPoint.moved = true;
			}
		}
	}

	/* Calculates and stores the current mouse position relative to DOM elements offset. */
	function storeRelativeMousePosition(event, offsetLeft, offsetTop) {
		relativeX = event.pageX - offsetLeft - MOUSE_POSITION_OFFSET;
	   	relativeY = event.pageY - offsetTop - MOUSE_POSITION_OFFSET;
	}
	
	/* Register the mouse down event. */
	$(canvas).mousedown(function(event) {
		storeRelativeMousePosition(event, this.offsetLeft, this.offsetTop);
   		mouseDownAtX = relativeX;
   		mouseDownAtY = relativeY;
		handleMouseDownEvent(event);
	});
	
	/* Register the mouse up event. */
	$(canvas).mouseup(function(event) {
		storeRelativeMousePosition(event, this.offsetLeft, this.offsetTop);
   		handleMouseUpEvent(event);
	});
	
	/* Register the mouse move event. */
	$(canvas).mousemove(function(event) {
		storeRelativeMousePosition(event, this.offsetLeft, this.offsetTop);
		handleMouseMoveEvent(event);
	});
	
	/* Registers keyboard events. */
	window.addEventListener("keyup", function(event) {
		if (event.which != null
				&& event.which == DELETE_POINT_KEY_CODE
				&& selectedPoint != null) {
			scope.bezierSpline.removePoint(selectedPoint);
			selectedPoint = null;
		}
	});
	
	/* Start rendering. */
	requestAnimationFrame(refreshCanvas);
}
