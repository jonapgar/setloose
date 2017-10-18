module.exports = function(options){
	options = options || {};
	var resolution = options.resolution || 10;
	var cleanInterval = options.cleanInterval || 5000;
	
	var intervals=[],masters={},hasCleared=0;
	function tick(){
		var intervals = this;
		for (var i=0;i<intervals.length;i++){
			var v = intervals[i]
			if (!v) {
				//do nothing
			} else if (v.skip){
				v.skip=false
			} else {
				
				v.f.apply(v.context,v.args)		
				if (v.limit){
					if (v.count>v.limit)
						clearLooseInterval(v)	
					else
						v.count++
				} 
			}
		}
		
	}

	function snap(n){
		return resolution * Math.round(n/resolution);
	}

	function setLooseInterval(f,t,limit,context,args){
		t = snap(t);
		var now = Date.now();
		if (typeof f !=='function') {
			
			throw new Error('must be func')
		}

		var master = masters[t]
		if (!master) {
			master = masters[t] = {intervals:[],t:t,count:1};
			master.intervalHandle = setInterval(tick.bind(master.intervals),t);
		} else {
			master.count++;
		}
		var v;
		master.intervals.push(v = {index:intervals.length, masterIndex: master.intervals.length, master: master, f: f, context: context || {}, args: args || [], limit: limit || 0, count: limit ? 0 : undefined, skip: (now - master.last) < t * 0.125 })
		intervals.push(v);
		
		return v;
	}

	function setLooseTimeout(f,t,context,args){
		return setLooseInterval(f,t,1,context,args)
	}

	function clearLooseInterval(v){
		if (!v || v.cleared)
			return;
		var i = v.index;
		intervals[i]=undefined;
		v.master.intervals[v.masterIndex]=undefined;
		v.master.count--;
		if (v.master.count<1) {
			masters[v.master.t]=undefined;
			clearInterval(v.master.intervalHandle)
		}
		hasCleared++;
		v.cleared=true;
	}

	setInterval(function(){

		if (hasCleared==0 || hasCleared/intervals.length < 0.5) {
			
			return;
		}
		//clean up empty entries in intervals
		//we do this every 
		var intervals2 = [],masters2={}
		
		for (var i in masters){
			var v = masters[i];
			if (v) {
				masters2[i]=v;
				var masterIntervals=v.intervals, masterIntervals2=[];
				for (var j=0;j<masterIntervals.length;j++){
					var v2 = masterIntervals[j];
					if (v2){
						v2.masterIndex = masterIntervals2.length;
						v2.index = intervals2.length;
						masterIntervals2.push(v2)
						intervals2.push(v2)
					}
				}
			}
		}
	
		
		
		intervals=intervals2;
		masters = masters2;
		
		hasCleared=0;
	},cleanInterval)

	return {
		setLooseTimeout:setLooseTimeout,
		setLooseInterval:setLooseInterval,
		clearLooseInterval:clearLooseInterval,
		clearLooseTimeout:clearLooseInterval,
	}
}
