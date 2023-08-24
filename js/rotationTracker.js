class RotationTracker {
    constructor(chart, displayElementId, debounceTime = 250) {
        console.log("Received Chart:", chart);
        console.log("Chart's Events:", chart.events);
        
        this.chart = chart;
    
        console.log("Chart events:", this.chart.events); 
        this.displayElement = document.getElementById(displayElementId);
        this.debounceTime = debounceTime;

        this.debouncedUpdate = this.debounce(this.updateRotationInfo.bind(this), this.debounceTime);
        this.chart.events.on("propertychanged", this.handlePropertyChanged.bind(this));
    }

    updateRotationInfo() {
        const rotationX = this.chart.get("rotationX");
        const rotationY = this.chart.get("rotationY");
        this.displayElement.innerText = `Center: ${rotationX.toFixed(2)}, ${rotationY.toFixed(2)}`;
    }

    handlePropertyChanged(event) {
        console.log("Property changed:", event.property);
        if (event.property === "rotationX" || event.property === "rotationY") {
            this.debouncedUpdate();
        }
    }

    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
}

export default RotationTracker;
