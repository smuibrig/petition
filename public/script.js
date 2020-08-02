(function () {
    var canvas = document.getElementById("canvas");
    var context = canvas.getContext("2d");
    var signature = document.getElementById("signature");

    var active = false;
    var x = 0;
    var y = 0;

    canvas.addEventListener("mousedown", function (e) {
        x = e.offsetX;
        y = e.offsetY;
        active = true;
    });

    canvas.addEventListener("mouseup", function (e) {
        if (active === true) {
            sign(context, x, y, e.offsetX, e.offsetY);
            x = 0;
            y = 0;
            active = false;
        }
    });

    canvas.addEventListener("mousemove", function (e) {
        if (active === true) {
            sign(context, x, y, e.offsetX, e.offsetY);
            x = e.offsetX;
            y = e.offsetY;
        }
    });

    function sign(context, x1, y1, x2, y2) {
        context.beginPath();
        context.strokeStyle = "black";
        context.lineWidth = 2;
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        context.closePath();
        signature.value = canvas.toDataURL();
    }
})();
