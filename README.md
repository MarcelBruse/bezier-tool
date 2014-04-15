bezier-tool
===========

A simple tool that lets you draw paths with the help of cubic Bézier curves.


=== Demo ===

http://jsfiddle.net/4XDJF/


=== Brower Support ===

This tool has been tested to be functional with the following list of browsers:

- Firefox: 28.0
- Chrome: 33


=== Usage ===

Move single points around by dragging them with the mouse. While moving, snap the points to the displayed grid dots by holding the shift key. Every point of the path has at least one handle that lets you define smooth curves. Initially, the handles are identical with their respective points. Simply hold the control key and drag the handles out of the path points. Select a point and hit the delete key in order to remove the point from the path.

You can integrate the tool into your own application as follows. Download or clone the tool. Define a HTML5 canvas element within your document. The header of your document should include a reference to jQuery, since the tool relies on it, and a reference to the bezier-tool.js file.

<html>
<head>
    <script src="jquery.js" type="text/javascript"></script>
    <script src="bezier-tool.js" type="text/javascript"></script>
    <script type="text/javascript">
        $(window).on("load", function(event) {
            BezierTool(document.getElementById("bezier-canvas"));
        });
    </script>
</head>
<body>
    <canvas id="bezier-canvas"></canvas>
</body>
</html>

The drawn path is implemented as a linked list. If you want to use the path for further processing, then you can access it like this:

var bezierTool = new BezierTool(document.getElementById("bezier-canvas"));
[...]
var point = bezierTool.bezierSpline.calculatePath().firstPosition;
while (point != null) {
    alert(point.x + ", " + point.y);
    point = point.next;
}

