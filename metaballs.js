var Ball = function Ball(l, v, m) {
    this.m = m || 1;
    this.l = l;
    this.v = v;
}

var Metaballs = function Metaballs(width, height, context, n, gridsize, bsize, threshold, centering) {
    this.n = n;
    this.width = width;
    this.height = height;
    this.threshold = threshold || 10;
    this.gridsize = gridsize || 4;
    this.context = context;
    this.bsize = bsize || 10;
    this.centering = centering || 0;
    this.sides = [[0, 0, 0, 0],
                  [1, 2, 0, 0],
                  [2, 3, 0, 0],
                  [1, 3, 0, 0],
                  [3, 4, 0, 0],
                  [1, 2, 3, 4],
                  [2, 4, 0, 0],
                  [1, 4, 0, 0],
                  [4, 1, 0, 0],
                  [4, 2, 0, 0],
                  [1, 2, 3, 4],
                  [3, 4, 0, 0],
                  [3, 1, 0, 0],
                  [3, 2, 0, 0],
                  [2, 1, 0, 0],
                  [0, 0, 0, 0]];

    this.balls = new Array();
    for(var i = 0; i < this.n; i++){
        this.balls.push(new Ball(
            [Math.random()*width/2+width/4, Math.random()*height/2+height/4],
            [0, 0],
            this.bsize));
    }

    this.samplemap = this.makeSamplemap();
    this.grid = this.makeGrid();
    return this;
}

Metaballs.prototype.falloff = function(x) {
    if(x !== 0) return 1/x;
    else return 666;
}

//calculate sum of "gravity" for ball a
Metaballs.prototype.accSum = function accSum(a) {
    var sum = [0, 0],
        b,
        dx, dy, dxdy, f;
    for(var i = 0; i < this.balls.length; i++){
        b = this.balls[i];
        if(a !== b && (a.l[0] !== b.l[0] || a.l[1] !== b.l[1])){
            dx = b.l[0] - a.l[0];
            dy = b.l[1] - a.l[1];
            dxdy = (Math.abs(dx)+Math.abs(dy));

            //prevent extreme accelerations resulting from balls being very close to one another
            if(dxdy < this.bsize/3){
                dxdy = this.bsize/3;
            }           
            f = b.m/(Math.pow(dx, 2)+Math.pow(dy, 2));
            sum[0] += f*dx/dxdy;
            sum[1] += f*dy/dxdy;
        }
        if(this.centering){
            //accelerate towards middle
            dx = this.width/2 - a.l[0];
            dy = this.height/2 - a.l[1];
            dxdy = (Math.abs(dx)+Math.abs(dy));
            sum[0] += this.centering*dx/dxdy;
            sum[1] += this.centering*dy/dxdy;
        }
    }
    return sum;
}

Metaballs.prototype.update = function update(that) {
    var b,
        acc,
        that;
    //calculate accelerations
    for(var i = 0; i < this.balls.length; i++){
        b = this.balls[i];
        acc = this.accSum(b);
        b.v[0] += acc[0];
        b.v[1] += acc[1];
    }
    //move balls
    for(var i = 0; i < this.balls.length; i++){
        b = this.balls[i];
        b.l[0] += b.v[0];
        b.l[1] += b.v[1];
    }
    //bounce from edges
    for(var i = 0; i < this.balls.length; i++){
        b = this.balls[i];
        if(b.l[0] > this.width || b.l[0] < 0){
            b.v[0] *= -.5;
            b.l[0] += b.v[0]*2;
        }
        if(b.l[1] > this.height || b.l[1] < 0){
            b.v[1] *= -.5;
            b.l[1] += b.v[1]*2;
        }
    }
    this.grid = this.makeGrid();
    this.draw();
    requestAnimFrame(function() { that.update(that);});
}   

//calculate sum of balls' influence at location
Metaballs.prototype.sample = function sample(loc) {
    var sum = 0;
    for(var i = 0; i < this.balls.length; i++){
        sum += this.samplemap[Math.floor(Math.abs(loc[0]-this.balls[i].l[0]))][Math.floor(Math.abs(loc[1]-this.balls[i].l[1]))]*this.balls[i].m;
    }
    return sum;
}

//precalculate a map for the falloff-function
Metaballs.prototype.makeSamplemap = function makeSamplemap() {
    var map = new Array();
    for(var i = 0; i < this.width; i++){
        map.push(new Array());
        for(var j = 0; j < this.height; j++){
            map[i].push(this.falloff(Math.sqrt(Math.pow(i, 2)+Math.pow(j, 2))));
        }
    }
    return map;
}

//returns grid[x][y][corners above threshold, [corner values]] for drawing
Metaballs.prototype.makeGrid = function makeGrid() {
    var aboveThreshold,
        values,
        x0,
        y0,
        grid = new Array(this.width/this.gridsize);

    for(var x = 0; x < this.width/this.gridsize; x++){
        x0 = x*this.gridsize;
        grid[x] = new Array(this.height/this.gridsize);
        for(var y = 0; y < this.height/this.gridsize; y++){
            y0 = y*this.gridsize;
            values = new Array(4);

            // positive direction [upper right, upper left, lower left, lower right]
            values[0] = this.sample([x0+this.gridsize,y0+this.gridsize]);
            values[3] = this.sample([x0+this.gridsize, y0]);

            //Avoid calculating grid twice. Good enough for now.
            //Could intelligently find and trace edges to improve performance greatly.
            if(x !== 0){ values[1] = grid[x-1][y][1][0]; }
            else { values[1] = this.sample([x0, y0+this.gridsize]); }
            if(x !== 0){ values[2] = grid[x-1][y][1][3]; }
            else { values[2] = this.sample([x0, y0]); }

            //Find corners above threshold for convenience
            aboveThreshold = 0;
            if(values[0] > this.threshold) aboveThreshold |= 1;
            if(values[1] > this.threshold) aboveThreshold |= 2;
            if(values[2] > this.threshold) aboveThreshold |= 4;
            if(values[3] > this.threshold) aboveThreshold |= 8;
            grid[x][y] = [aboveThreshold, values];
        }
    }
    return grid;
}

Metaballs.prototype.draw = function draw() {
    var x0, y0,
        points,
        side,
        v1, v2;
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.beginPath();

    for(var x = 0; x < this.width/this.gridsize; x++){
        x0 = this.gridsize*x;
        for(var y = 0; y < this.height/this.gridsize; y++){
            y0 = this.gridsize*y;

            //interpolate intersection points
            points = [];
            for(var i = 0; i < 4; i++){
                side = this.sides[this.grid[x][y][0]][i];
                if(side === 1){
                    v1 = this.grid[x][y][1][0];
                    v2 = this.grid[x][y][1][3];
                    points.push([x0+this.gridsize, y0+this.gridsize*(1-(this.threshold-v1)/(v2-v1))]);
                }
                if(side === 2){
                    v1 = this.grid[x][y][1][0];
                    v2 = this.grid[x][y][1][1];
                    points.push([x0+this.gridsize*(1-(this.threshold-v1)/(v2-v1)), y0+this.gridsize]);
                }
                if(side === 3){
                    v1 = this.grid[x][y][1][1];
                    v2 = this.grid[x][y][1][2];
                    points.push([x0, y0+this.gridsize*(1-(this.threshold-v1)/(v2-v1))]);
                }
                if(side === 4){
                    v1 = this.grid[x][y][1][2];
                    v2 = this.grid[x][y][1][3];
                    points.push([x0+this.gridsize*(this.threshold-v1)/(v2-v1), y0]);
                }
            }
            //draw the line(s)
            for(var i = 0; i < points.length; i += 2){
                this.context.moveTo(points[i][0], points[i][1]);
                this.context.lineTo(points[i+1][0], points[i+1][1]);
            }
        }
    }
    this.context.stroke();
}

window.requestAnimFrame = (function(){
    return window.requestAnimationFrame       || 
           window.webkitRequestAnimationFrame || 
           window.mozRequestAnimationFrame    || 
           window.oRequestAnimationFrame      ||
           window.msRequestAnimationFrame     || 
           function(callback){
               window.setTimeout(callback, 1000/60);
           };
})();

var init = function() {
    var canvas = document.createElement('canvas'),
        width = 800,
        height = 800,
        context,
        metaballs;
    canvas.width = width;
    canvas.height = height;
    canvas.id = "Meatballs";
    canvas.style['border'] = "1px solid black";
    document.body.appendChild(canvas);
    context = canvas.getContext("2d");
    context.lineWidth = 1;
    context.strokeStyle = '#000000';
    context.lineCap = 'round';
    document.body.style['text-align'] = "center";

    metaballs = new Metaballs(width, height, context, 10, 8, 600, 40, 0.000);
    metaballs.update(metaballs);
}

window.onload = init;

