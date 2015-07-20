function DrawPoint(opts) {
    if (opts instanceof CanvasRenderingContext2D) {
        this.ctx = opts;
        opts = {};
    } else if (opts.ctx instanceof CanvasRenderingContext2D) {
        this.ctx = opts.ctx;
    } else {
        throw new Error("opts.ctx must be CanvasRenderingContext2D object");
    }
    this.radius = opts.radius || 0;
    this.maxRadius = opts.maxRadius || 80;
    this.color = opts.color || [0, 0, 0, 1];
    this.alpha = opts.alpha || 1;
    this.cycle = opts.cycle || 1000;
    this.progress = 0;
    this.isFirstRun = true;
}
DrawPoint.prototype.draw = function draw(x, y) {
    if (typeof x === "object") {
        this.x = x.x;
        this.y = x.y;
    } else {
        this.x = x;
        this.y = y;
    }
    this.isFirstRun = true;
    requestAnimationFrame(this.tick.bind(this));
}
DrawPoint.prototype.tick = function tick(timestamp) {
    var ctx = this.ctx;
    if (!ctx) return;

    if (this.isFirstRun) {
        this.isFirstRun = false;
        this.timestamp = timestamp;
        this.progress = 0;
        this.radius = 0;
        this.color[0] = Math.floor(Math.random() * 256);
        this.color[1] = Math.floor(Math.random() * 256);
        this.color[2] = Math.floor(Math.random() * 256);
        this.alpha = Math.random() * 2001 + 8000;
        this.color[3] = this.alpha / 10000;
    } else {
        if (this.progress === this.cycle) {
            this.timestamp = timestamp;
            this.progress = 0;
            this.radius = 0;
            this.color[3] = this.alpha;
        }
        this.progress = timestamp - this.timestamp;
        if (this.progress > this.cycle) {
            this.progress = this.cycle; // END
        }
        this.radius = this.progress * this.maxRadius / this.cycle;
        this.color[3] = (this.alpha - (this.progress * this.alpha / this.cycle)) / 10000;
    }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(" + this.color.join(", ") + ")";
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1, 0, Math.PI * 2);
    ctx.fillStyle = "hsla(0, 50%, 100%, " + this.color[3] + ")";
    ctx.fill();
    ctx.restore();
    requestAnimationFrame(this.tick.bind(this));
}
